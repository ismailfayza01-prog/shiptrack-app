/**
 * ShipTrack MVP - Google Apps Script Backend
 * Complete RESTful API with authentication, role-based authorization, and business logic
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'),
  DRIVE_FOLDER_ID: PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID'),
  SESSION_EXPIRY_HOURS: 24,
  PICKUP_DEADLINE_HOURS: 48,
  MINIMUM_WEIGHT_KG: 20,
  MIN_RATE_PER_KG: 15,
  HOME_DELIVERY_FEE: 5,
  HOME_DELIVERY_COST: 5
};

// Tab names (must match Google Sheets)
  const TABS = {
    USERS: 'users',
    SESSIONS: 'sessions',
    SHIPMENTS: 'shipments',
    CUSTOMERS: 'customers',
    EVENTS: 'events',
    DEPARTURES: 'departures',
    LOYALTY_TOKENS: 'loyalty_tokens',
  SETTINGS: 'settings',
  AUDIT: 'audit'
};

// Expected header order for each tab (Row 1)
const EXPECTED_HEADERS = {
  users: [
    'user_id',
    'full_name',
    'phone',
    'pin_hash',
    'role',
    'is_active',
    'created_at',
    'last_login_at',
    'notes',
    'address'
  ],
  sessions: [
    'session_id',
    'user_id',
    'token',
    'created_at',
    'expires_at',
    'ip_address',
    'user_agent'
  ],
    shipments: [
      'shipment_id',
      'tracking_number',
      'pickup_code6',
    'created_at',
    'created_by_user_id',
    'customer_name',
    'customer_phone',
    'destination_zone',
    'destination_city',
    'weight_kg',
    'pricing_tier',
    'has_home_delivery',
    'amount_due',
    'amount_paid',
    'payment_validated_at',
    'payment_validated_by_user_id',
    'loyalty_token_id_used',
    'status',
    'assigned_driver_user_id',
    'driver_assigned_at',
    'pickup_deadline_at',
    'qr_scanned_at',
    'id_photo_url',
    'package_photo_url',
    'loaded_at',
    'picked_up_at',
    'in_transit_at',
    'at_relay_at',
    'relay_bin',
    'delivered_at',
    'notes',
    'sender_address',
    'sender_id_number',
    'receiver_country',
    'receiver_zip',
    'receiver_phone',
    'receiver_id_number',
    'receiver_id_photo_url',
      'current_handler_user_id',
      'current_handler_role',
      'current_handler_location',
      'current_handler_at',
      'payment_terms',
      'customer_id'
    ],
    customers: [
      'customer_id',
      'id_number',
      'full_name',
      'phone',
      'id_photo_url',
      'created_at',
      'last_activity_at',
      'notes'
    ],
    events: [
      'event_id',
      'shipment_id',
    'event_type',
    'event_timestamp',
    'actor_user_id',
    'old_value',
    'new_value',
    'metadata',
    'notes'
  ],
  departures: [
    'departure_id',
    'zone',
    'day_of_week',
    'departure_time',
    'is_active',
    'created_at',
    'notes'
  ],
  loyalty_tokens: [
    'token_id',
    'customer_phone',
    'generated_at',
    'generated_after_shipment_id',
    'is_used',
    'used_at',
    'used_for_shipment_id',
    'notes'
  ],
  settings: [
    'setting_key',
    'setting_value',
    'setting_type',
    'last_updated_at',
    'last_updated_by_user_id',
    'description'
  ],
  audit: [
    'audit_id',
    'audit_timestamp',
    'actor_user_id',
    'action_type',
    'entity_type',
    'entity_id',
    'before_state',
    'after_state',
    'reason',
    'ip_address'
  ]
};

// Status values
const STATUS = {
  CREATED: 'CREATED',
  PAID: 'PAID',
  PENDING: 'PENDING',
  DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
  LOADED: 'LOADED',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  AT_RELAY_AVAILABLE: 'AT_RELAY_AVAILABLE',
  DELIVERED: 'DELIVERED',
  RELEASED: 'RELEASED',
  VOIDED: 'VOIDED'
};

// Roles
const ROLES = {
  STAFF: 'STAFF',
  DRIVER: 'DRIVER',
  RELAY: 'RELAY',
  ADMIN: 'ADMIN'
};

function normalizeId(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function idsEqual(a, b) {
  return normalizeId(a) === normalizeId(b);
}

function normalizeIdCard(value) {
  return normalizeId(value);
}

function parseDateSafe(value) {
  if (!value) {
    return null;
  }
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return isNaN(value.getTime()) ? null : value;
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function getLatestActivityAt(values) {
  let latest = null;
  (values || []).forEach((value) => {
    const date = parseDateSafe(value);
    if (date && (!latest || date > latest)) {
      latest = date;
    }
  });
  return latest ? latest.toISOString() : '';
}

function upsertCustomerSummary(map, idNumber, data) {
  const id = normalizeIdCard(idNumber);
  if (!id) {
    return;
  }

  const entry = map[id] || {
    id_number: id,
    name: '',
    phone: '',
    sent_count: 0,
    received_count: 0,
    last_activity_at: ''
  };

  if (!entry.name && data.name) {
    entry.name = data.name;
  }
  if (!entry.phone && data.phone) {
    entry.phone = data.phone;
  }

  if (data.role === 'sender') {
    entry.sent_count += 1;
  } else if (data.role === 'receiver') {
    entry.received_count += 1;
  }

  entry.last_activity_at = getLatestActivityAt([entry.last_activity_at, data.activity_at]);
  map[id] = entry;
}

function upsertCustomerRecord(ss, data) {
  if (!data || !data.id_number) {
    return '';
  }

  const customersSheet = ss.getSheetByName(TABS.CUSTOMERS);
  if (!customersSheet) {
    return '';
  }

  const idNumber = normalizeIdCard(data.id_number);
  if (!idNumber) {
    return '';
  }

  const customersData = customersSheet.getDataRange().getValues();
  let rowIndex = -1;
  let row = null;

  for (let i = 1; i < customersData.length; i++) {
    if (normalizeIdCard(customersData[i][1]) === idNumber) {
      rowIndex = i + 1;
      row = customersData[i];
      break;
    }
  }

  const activityAt = data.activity_at || new Date().toISOString();

  if (rowIndex === -1) {
    const customerId = generateId();
    customersSheet.appendRow([
      customerId,
      idNumber,
      data.full_name || '',
      data.phone || '',
      data.id_photo_url || '',
      new Date().toISOString(),
      activityAt,
      data.notes || ''
    ]);
    return customerId;
  }

  let existingId = row[0] || '';
  const existingName = row[2] || '';
  const existingPhone = row[3] || '';
  const existingPhoto = row[4] || '';
  const existingLast = row[6] || '';

  const newName = existingName || data.full_name || '';
  const newPhone = existingPhone || data.phone || '';
  const newPhoto = data.id_photo_url || existingPhoto;
  const newLast = getLatestActivityAt([existingLast, activityAt]);

  if (!existingId) {
    existingId = generateId();
    customersSheet.getRange(rowIndex, 1).setValue(existingId);
  }
  if (newName !== existingName) {
    customersSheet.getRange(rowIndex, 3).setValue(newName);
  }
  if (newPhone !== existingPhone) {
    customersSheet.getRange(rowIndex, 4).setValue(newPhone);
  }
  if (newPhoto !== existingPhoto) {
    customersSheet.getRange(rowIndex, 5).setValue(newPhoto);
  }
  if (newLast !== existingLast) {
    customersSheet.getRange(rowIndex, 7).setValue(newLast);
  }
  return existingId;
}

function getFirstUserIdByRole(ss, role) {
  const usersSheet = ss.getSheetByName(TABS.USERS);
  if (!usersSheet) {
    return '';
  }
  const usersData = usersSheet.getDataRange().getValues();
  for (let i = 1; i < usersData.length; i++) {
    const isActive = usersData[i][5];
    if (usersData[i][4] === role && isActive !== false) {
      return usersData[i][0];
    }
  }
  if (usersData.length > 1) {
    return usersData[1][0];
  }
  return '';
}

function appendShipmentWithHeaders(sheet, shipment) {
  const headers = EXPECTED_HEADERS.shipments;
  const row = headers.map((header) =>
    Object.prototype.hasOwnProperty.call(shipment, header) ? shipment[header] : ''
  );
  sheet.appendRow(row);
}

function calculateAmountForDemo(settings, weightKg, tier, hasHomeDelivery) {
  const billingWeight = Math.max(weightKg, CONFIG.MINIMUM_WEIGHT_KG);
  let rate = CONFIG.MIN_RATE_PER_KG;
  if (settings) {
    if (tier === 'B2C' && settings.b2c_rate_per_kg) {
      rate = settings.b2c_rate_per_kg;
    } else if (tier === 'B2B_TIER_1' && settings.b2b_tier1_rate_per_kg) {
      rate = settings.b2b_tier1_rate_per_kg;
    } else if (tier === 'B2B_TIER_2' && settings.b2b_tier2_rate_per_kg) {
      rate = settings.b2b_tier2_rate_per_kg;
    } else if (tier === 'B2B_TIER_3' && settings.b2b_tier3_rate_per_kg) {
      rate = settings.b2b_tier3_rate_per_kg;
    }
  }
  const homeFee = hasHomeDelivery ? (settings && settings.home_delivery_fee ? settings.home_delivery_fee : CONFIG.HOME_DELIVERY_FEE) : 0;
  const amount = billingWeight * rate + homeFee;
  return { billing_weight: billingWeight, rate_per_kg: rate, amount_due: amount };
}

function backfillCustomersFromShipments(ss) {
  if (!ss) {
    if (!CONFIG.SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_ID script property is not set');
    }
    ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  const customersSheet = ss.getSheetByName(TABS.CUSTOMERS);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  if (!customersSheet || !shipmentsSheet) {
    return 0;
  }

  const customersData = customersSheet.getDataRange().getValues();
  const existingIds = {};
  for (let i = 1; i < customersData.length; i++) {
    const id = normalizeIdCard(customersData[i][1]);
    if (id) {
      existingIds[id] = true;
    }
  }

  const shipmentsData = shipmentsSheet.getDataRange().getValues();
  const newEntries = {};

  for (let i = 1; i < shipmentsData.length; i++) {
    const row = shipmentsData[i];
    const activityAt = getLatestActivityAt([row[3], row[29], row[41]]);

    const senderId = normalizeIdCard(row[32]);
    if (senderId && !existingIds[senderId]) {
      const entry = newEntries[senderId] || {
        id_number: senderId,
        full_name: row[5] || '',
        phone: row[6] || '',
        id_photo_url: row[22] || '',
        last_activity_at: ''
      };
      if (!entry.full_name && row[5]) {
        entry.full_name = row[5];
      }
      if (!entry.phone && row[6]) {
        entry.phone = row[6];
      }
      if (!entry.id_photo_url && row[22]) {
        entry.id_photo_url = row[22];
      }
      entry.last_activity_at = getLatestActivityAt([entry.last_activity_at, activityAt]);
      newEntries[senderId] = entry;
    }

    const receiverId = normalizeIdCard(row[36]);
    if (receiverId && !existingIds[receiverId]) {
      const entry = newEntries[receiverId] || {
        id_number: receiverId,
        full_name: '',
        phone: row[35] || '',
        id_photo_url: row[37] || '',
        last_activity_at: ''
      };
      if (!entry.phone && row[35]) {
        entry.phone = row[35];
      }
      if (!entry.id_photo_url && row[37]) {
        entry.id_photo_url = row[37];
      }
      entry.last_activity_at = getLatestActivityAt([entry.last_activity_at, activityAt]);
      newEntries[receiverId] = entry;
    }
  }

  const rowsToAdd = [];
  Object.keys(newEntries).forEach((id) => {
    const entry = newEntries[id];
    rowsToAdd.push([
      generateId(),
      entry.id_number,
      entry.full_name || '',
      entry.phone || '',
      entry.id_photo_url || '',
      new Date().toISOString(),
      entry.last_activity_at || new Date().toISOString(),
      ''
    ]);
  });

  if (rowsToAdd.length > 0) {
    customersSheet.getRange(customersSheet.getLastRow() + 1, 1, rowsToAdd.length, rowsToAdd[0].length)
      .setValues(rowsToAdd);
  }

  return rowsToAdd.length;
}

function backfillShipmentCustomerIds(ss) {
  if (!ss) {
    if (!CONFIG.SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_ID script property is not set');
    }
    ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  const customersSheet = ss.getSheetByName(TABS.CUSTOMERS);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  if (!customersSheet || !shipmentsSheet) {
    return 0;
  }

  const customersData = customersSheet.getDataRange().getValues();
  const customerMap = {};
  for (let i = 1; i < customersData.length; i++) {
    const idNumber = normalizeIdCard(customersData[i][1]);
    const customerId = customersData[i][0];
    if (idNumber && customerId) {
      customerMap[idNumber] = customerId;
    }
  }

  const shipmentsData = shipmentsSheet.getDataRange().getValues();
  const customerIdColumnIndex = EXPECTED_HEADERS.shipments.length;
  let updated = 0;

  for (let i = 1; i < shipmentsData.length; i++) {
    const row = shipmentsData[i];
    const currentCustomerId = row[customerIdColumnIndex - 1];
    if (currentCustomerId) {
      continue;
    }
    const senderId = normalizeIdCard(row[32]);
    if (!senderId) {
      continue;
    }
    const customerId = customerMap[senderId];
    if (customerId) {
      shipmentsSheet.getRange(i + 1, customerIdColumnIndex).setValue(customerId);
      updated += 1;
    }
  }

  return updated;
}

function seedDemoShipments() {
  ensureTabsAndHeaders();

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const settingsSheet = ss.getSheetByName(TABS.SETTINGS);
  const settings = settingsSheet ? getSettings(settingsSheet) : null;

  const existingRows = shipmentsSheet.getDataRange().getValues();
  const existingDemoCount = existingRows.filter((row) => row[30] === 'Demo shipment').length;
  const remaining = Math.max(0, 6 - existingDemoCount);
  if (remaining === 0) {
    return { created: 0, skipped: 'Demo shipments already exist' };
  }

  const staffUserId = getFirstUserIdByRole(ss, ROLES.STAFF) || getFirstUserIdByRole(ss, ROLES.ADMIN);
  const driverUserId = getFirstUserIdByRole(ss, ROLES.DRIVER);
  const relayUserId = getFirstUserIdByRole(ss, ROLES.RELAY);

  const staffLocation = staffUserId ? getUserAddress(ss, staffUserId) : '';
  const driverLocation = driverUserId ? getUserAddress(ss, driverUserId) : '';
  const relayLocation = relayUserId ? getUserAddress(ss, relayUserId) : '';

  const now = new Date();
  const placeholderIdPhoto = 'https://via.placeholder.com/800x600?text=ID+Photo';
  const placeholderPackagePhoto = 'https://via.placeholder.com/800x600?text=Parcel+Photo';

  const demoData = [
    {
      customer_name: 'Amina El Idrissi',
      customer_phone: '+212600000001',
      sender_address: 'Casablanca, Maarif',
      sender_id_number: 'AE123456',
      destination_zone: 'France',
      destination_city: 'Paris',
      receiver_country: 'France',
      receiver_zip: '75001',
      receiver_phone: '+33100000001',
      weight_kg: 12,
      pricing_tier: 'B2C',
      has_home_delivery: true,
      payment_terms: 'PAY_NOW',
      status: STATUS.PAID,
      handler_id: staffUserId,
      handler_role: ROLES.STAFF,
      handler_location: staffLocation
    },
    {
      customer_name: 'Youssef Benali',
      customer_phone: '+212600000002',
      sender_address: 'Rabat, Agdal',
      sender_id_number: 'YB234567',
      destination_zone: 'Spain',
      destination_city: 'Madrid',
      receiver_country: 'Spain',
      receiver_zip: '28001',
      receiver_phone: '+34100000002',
      weight_kg: 25,
      pricing_tier: 'B2B_TIER_1',
      has_home_delivery: false,
      payment_terms: 'PAY_ON_PICKUP',
      status: STATUS.CREATED,
      handler_id: staffUserId,
      handler_role: ROLES.STAFF,
      handler_location: staffLocation
    },
    {
      customer_name: 'Sara El Fassi',
      customer_phone: '+212600000003',
      sender_address: 'Marrakech, Gueliz',
      sender_id_number: 'SE345678',
      destination_zone: 'Italy',
      destination_city: 'Milan',
      receiver_country: 'Italy',
      receiver_zip: '20100',
      receiver_phone: '+39100000003',
      weight_kg: 18,
      pricing_tier: 'B2C',
      has_home_delivery: true,
      payment_terms: 'PAY_NOW',
      status: STATUS.PENDING,
      handler_id: staffUserId,
      handler_role: ROLES.STAFF,
      handler_location: staffLocation
    },
    {
      customer_name: 'Omar Zahra',
      customer_phone: '+212600000004',
      sender_address: 'Tangier, Medina',
      sender_id_number: 'OZ456789',
      destination_zone: 'Germany',
      destination_city: 'Berlin',
      receiver_country: 'Germany',
      receiver_zip: '10115',
      receiver_phone: '+49100000004',
      weight_kg: 35,
      pricing_tier: 'B2B_TIER_2',
      has_home_delivery: false,
      payment_terms: 'POD',
      status: STATUS.LOADED,
      handler_id: driverUserId || staffUserId,
      handler_role: driverUserId ? ROLES.DRIVER : ROLES.STAFF,
      handler_location: driverUserId ? driverLocation : staffLocation
    },
    {
      customer_name: 'Nadia Choukri',
      customer_phone: '+212600000005',
      sender_address: 'Agadir, Marina',
      sender_id_number: 'NC567890',
      destination_zone: 'Belgium',
      destination_city: 'Brussels',
      receiver_country: 'Belgium',
      receiver_zip: '1000',
      receiver_phone: '+32100000005',
      weight_kg: 28,
      pricing_tier: 'B2B_TIER_3',
      has_home_delivery: false,
      payment_terms: 'PAY_ON_PICKUP',
      status: STATUS.IN_TRANSIT,
      handler_id: driverUserId || staffUserId,
      handler_role: driverUserId ? ROLES.DRIVER : ROLES.STAFF,
      handler_location: driverUserId ? driverLocation : staffLocation
    },
    {
      customer_name: 'Hassan Rami',
      customer_phone: '+212600000006',
      sender_address: 'Fes, Ville Nouvelle',
      sender_id_number: 'HR678901',
      destination_zone: 'Portugal',
      destination_city: 'Lisbon',
      receiver_country: 'Portugal',
      receiver_zip: '1100-001',
      receiver_phone: '+35110000006',
      weight_kg: 22,
      pricing_tier: 'B2C',
      has_home_delivery: true,
      payment_terms: 'PAY_NOW',
      status: STATUS.AT_RELAY_AVAILABLE,
      handler_id: relayUserId || staffUserId,
      handler_role: relayUserId ? ROLES.RELAY : ROLES.STAFF,
      handler_location: relayUserId ? relayLocation : staffLocation,
      receiver_id_number: 'HRR901234',
      receiver_id_photo_url: placeholderIdPhoto
    }
  ];

  let created = 0;
  for (let i = 0; i < demoData.length && created < remaining; i++) {
    const demo = demoData[i];
    const trackingNumber = generateTrackingNumber();
    const pickupCode = generatePickupCode();
    const createdAt = new Date(now.getTime() - (created + 1) * 4 * 60 * 60 * 1000);
    const pickupDeadline = new Date(createdAt.getTime() + CONFIG.PICKUP_DEADLINE_HOURS * 60 * 60 * 1000);
    const paymentCalc = calculateAmountForDemo(settings, demo.weight_kg, demo.pricing_tier, demo.has_home_delivery);

    const paymentValidatedAt = demo.payment_terms === 'PAY_NOW' ? createdAt.toISOString() : '';
    const amountPaid = demo.payment_terms === 'PAY_NOW' ? paymentCalc.amount_due : 0;

    const customerId = upsertCustomerRecord(ss, {
      id_number: demo.sender_id_number,
      full_name: demo.customer_name,
      phone: demo.customer_phone,
      id_photo_url: placeholderIdPhoto,
      activity_at: createdAt.toISOString()
    });

    const statusTimestamps = {
      loaded_at: '',
      picked_up_at: '',
      in_transit_at: '',
      at_relay_at: '',
      delivered_at: ''
    };
    if ([STATUS.LOADED, STATUS.PICKED_UP, STATUS.IN_TRANSIT, STATUS.AT_RELAY_AVAILABLE, STATUS.DELIVERED, STATUS.RELEASED].includes(demo.status)) {
      statusTimestamps.loaded_at = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000).toISOString();
    }
    if ([STATUS.PICKED_UP, STATUS.IN_TRANSIT, STATUS.AT_RELAY_AVAILABLE, STATUS.DELIVERED, STATUS.RELEASED].includes(demo.status)) {
      statusTimestamps.picked_up_at = new Date(createdAt.getTime() + 3 * 60 * 60 * 1000).toISOString();
    }
    if ([STATUS.IN_TRANSIT, STATUS.AT_RELAY_AVAILABLE, STATUS.DELIVERED, STATUS.RELEASED].includes(demo.status)) {
      statusTimestamps.in_transit_at = new Date(createdAt.getTime() + 5 * 60 * 60 * 1000).toISOString();
    }
    if ([STATUS.AT_RELAY_AVAILABLE, STATUS.DELIVERED, STATUS.RELEASED].includes(demo.status)) {
      statusTimestamps.at_relay_at = new Date(createdAt.getTime() + 8 * 60 * 60 * 1000).toISOString();
    }
    if ([STATUS.DELIVERED, STATUS.RELEASED].includes(demo.status)) {
      statusTimestamps.delivered_at = new Date(createdAt.getTime() + 12 * 60 * 60 * 1000).toISOString();
    }

    appendShipmentWithHeaders(shipmentsSheet, {
      shipment_id: generateId(),
      tracking_number: trackingNumber,
      pickup_code6: pickupCode,
      created_at: createdAt.toISOString(),
      created_by_user_id: staffUserId,
      customer_name: demo.customer_name,
      customer_phone: demo.customer_phone,
      destination_zone: demo.destination_zone,
      destination_city: demo.destination_city,
      weight_kg: demo.weight_kg,
      pricing_tier: demo.pricing_tier,
      has_home_delivery: demo.has_home_delivery,
      amount_due: paymentCalc.amount_due,
      amount_paid: amountPaid,
      payment_validated_at: paymentValidatedAt,
      payment_validated_by_user_id: paymentValidatedAt ? staffUserId : '',
      loyalty_token_id_used: '',
      status: demo.status,
      assigned_driver_user_id: [STATUS.DRIVER_ASSIGNED, STATUS.LOADED, STATUS.PICKED_UP, STATUS.IN_TRANSIT, STATUS.AT_RELAY_AVAILABLE, STATUS.DELIVERED, STATUS.RELEASED].includes(demo.status) ? (driverUserId || '') : '',
      driver_assigned_at: driverUserId ? createdAt.toISOString() : '',
      pickup_deadline_at: pickupDeadline.toISOString(),
      qr_scanned_at: demo.status === STATUS.LOADED ? statusTimestamps.loaded_at : '',
      id_photo_url: placeholderIdPhoto,
      package_photo_url: placeholderPackagePhoto,
      loaded_at: statusTimestamps.loaded_at,
      picked_up_at: statusTimestamps.picked_up_at,
      in_transit_at: statusTimestamps.in_transit_at,
      at_relay_at: statusTimestamps.at_relay_at,
      relay_bin: demo.status === STATUS.AT_RELAY_AVAILABLE ? 'A-12' : '',
      delivered_at: statusTimestamps.delivered_at,
      notes: 'Demo shipment',
      sender_address: demo.sender_address,
      sender_id_number: demo.sender_id_number,
      receiver_country: demo.receiver_country,
      receiver_zip: demo.receiver_zip,
      receiver_phone: demo.receiver_phone,
      receiver_id_number: demo.receiver_id_number || '',
      receiver_id_photo_url: demo.receiver_id_photo_url || '',
      current_handler_user_id: demo.handler_id || '',
      current_handler_role: demo.handler_role || '',
      current_handler_location: demo.handler_location || '',
      current_handler_at: createdAt.toISOString(),
      payment_terms: demo.payment_terms,
      customer_id: customerId
    });

    created += 1;
  }

  return { created: created };
}

function buildUserMap(ss) {
  const usersSheet = ss.getSheetByName(TABS.USERS);
  if (!usersSheet) {
    return {};
  }
  const usersData = usersSheet.getDataRange().getValues();
  const userMap = {};
  for (let i = 1; i < usersData.length; i++) {
    userMap[normalizeId(usersData[i][0])] = usersData[i][1];
  }
  return userMap;
}

function getUserAddress(ss, userId) {
  const usersSheet = ss.getSheetByName(TABS.USERS);
  if (!usersSheet) {
    return '';
  }
  const usersData = usersSheet.getDataRange().getValues();
  for (let i = 1; i < usersData.length; i++) {
    if (idsEqual(usersData[i][0], userId)) {
      return usersData[i][9] || '';
    }
  }
  return '';
}

function updateCurrentHandler(ss, shipmentsSheet, rowIndex, auth) {
  const now = new Date();
  const location = getUserAddress(ss, auth.user_id);
  shipmentsSheet.getRange(rowIndex, 39).setValue(auth.user_id);
  shipmentsSheet.getRange(rowIndex, 40).setValue(auth.role);
  shipmentsSheet.getRange(rowIndex, 41).setValue(location || '');
  shipmentsSheet.getRange(rowIndex, 42).setValue(now.toISOString());
  logEvent(ss, shipmentsSheet.getRange(rowIndex, 1).getValue(), 'HANDLER_UPDATED', auth.user_id, null, null,
           { role: auth.role, location: location || '' }, 'Handler updated from scan');
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Handle HTTP GET requests
 */
function doGet(e) {
  try {
    const path = e.parameter.path || 'health';
    
    // Public endpoints (no auth required)
    if (path === 'health') {
      return jsonResponse({ status: 'ok', version: '1.0.0' });
    }
    
    if (path === 'track') {
      return handleTrack(e.parameter.tracking_number);
    }
    
    if (path === 'departures') {
      return handleGetDepartures(e.parameter.zone);
    }
    
    // Protected endpoints (require auth)
    const auth = validateToken(e.parameter.token);
    if (!auth.valid) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    
    if (path === 'me') {
      return handleGetMe(auth);
    }
    
    if (path === 'my-shipments') {
      return handleGetMyShipments(auth);
    }
    
  if (path === 'my-assignments') {
    return handleGetMyAssignments(auth);
  }

  if (path === 'relay-shipments' && auth.role === ROLES.RELAY) {
    return handleGetRelayShipments(auth);
  }
    
    if (path === 'shipment') {
      return handleGetShipment(e.parameter.shipment_id, auth);
    }
    
    if (path === 'overdue-pickups' && auth.role === ROLES.ADMIN) {
      return handleGetOverduePickups();
    }

    if (path === 'settings' && auth.role === ROLES.ADMIN) {
      return handleGetSettings(e.parameter.keys);
    }

  if (path === 'users' && auth.role === ROLES.ADMIN) {
    return handleGetUsers();
  }

  if (path === 'customers' && auth.role === ROLES.ADMIN) {
    return handleGetCustomers(e.parameter.q || e.parameter.id_number || '');
  }

  if (path === 'customer' && auth.role === ROLES.ADMIN) {
    return handleGetCustomerDetail(e.parameter.id_number);
  }
  
  return jsonResponse({ error: 'Not found' }, 404);
    
  } catch (error) {
    Logger.log('Error in doGet: ' + error);
    return jsonResponse({ error: error.toString() }, 500);
  }
}

/**
 * Handle HTTP POST requests
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const path = data.path || e.parameter.path;
    
    // Authentication endpoint
    if (path === 'login') {
      return handleLogin(data);
    }
    
    // All other endpoints require authentication
    const auth = validateToken(data.token || e.parameter.token);
    if (!auth.valid) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    
    // Route to appropriate handler
    switch (path) {
      case 'create-shipment':
        return handleCreateShipment(data, auth);
      
      case 'assign-driver':
        return handleAssignDriver(data, auth);
      
      case 'pickup-verify':
        return handlePickupVerify(data, auth);
      
      case 'upload-photo':
        return handleUploadPhoto(data, auth);
      
      case 'validate-payment':
        return handleValidatePayment(data, auth);
      
      case 'set-status':
        return handleSetStatus(data, auth);
      
      case 'relay-inbound':
        return handleRelayInbound(data, auth);
      
      case 'relay-release':
        return handleRelayRelease(data, auth);
      
      case 'create-departure':
        return handleCreateDeparture(data, auth);
      
      case 'update-departure':
        return handleUpdateDeparture(data, auth);
      
      case 'change-user-role':
        return handleChangeUserRole(data, auth);
      
      case 'update-settings':
        return handleUpdateSettings(data, auth);

      case 'update-shipment-notes':
        return handleUpdateShipmentNotes(data, auth);

      case 'record-payment':
        return handleRecordPayment(data, auth);

      case 'create-user':
        return handleCreateUser(data, auth);

      case 'driver-claim':
        return handleDriverClaim(data, auth);
      
      default:
        return jsonResponse({ error: 'Unknown endpoint' }, 404);
    }
    
  } catch (error) {
    Logger.log('Error in doPost: ' + error);
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ============================================================================
// AUTHENTICATION & AUTHORIZATION
// ============================================================================

/**
 * Handle user login
 */
function handleLogin(data) {
  const { phone, pin } = data;
  
  if (!phone || !pin) {
    return jsonResponse({ error: 'Phone and PIN required' }, 400);
  }
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const usersSheet = ss.getSheetByName(TABS.USERS);
  const usersData = usersSheet.getDataRange().getValues();
  
  // Find user by phone
  const pinHash = hashPin(pin);
  let user = null;
  
  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][2] === phone && usersData[i][3] === pinHash && usersData[i][5] === true) {
      user = {
        user_id: usersData[i][0],
        full_name: usersData[i][1],
        phone: usersData[i][2],
        role: usersData[i][4]
      };
      break;
    }
  }
  
  if (!user) {
    return jsonResponse({ error: 'Invalid credentials' }, 401);
  }
  
  // Create session
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CONFIG.SESSION_EXPIRY_HOURS * 60 * 60 * 1000);
  
  const sessionsSheet = ss.getSheetByName(TABS.SESSIONS);
  sessionsSheet.appendRow([
    generateId(),
    user.user_id,
    token,
    now.toISOString(),
    expiresAt.toISOString(),
    '', // ip_address
    '' // user_agent
  ]);
  
  // Update last login
  const userRowIndex = usersData.findIndex(row => row[0] === user.user_id);
  if (userRowIndex > 0) {
    usersSheet.getRange(userRowIndex + 1, 8).setValue(now.toISOString());
  }
  
  return jsonResponse({
    success: true,
    token: token,
    user: user,
    expires_at: expiresAt.toISOString()
  });
}

/**
 * Validate session token
 */
function validateToken(token) {
  if (!token) {
    return { valid: false };
  }
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sessionsSheet = ss.getSheetByName(TABS.SESSIONS);
  const sessionsData = sessionsSheet.getDataRange().getValues();
  
  for (let i = 1; i < sessionsData.length; i++) {
    if (sessionsData[i][2] === token) {
      const expiresAt = new Date(sessionsData[i][4]);
      const now = new Date();
      
      if (expiresAt > now) {
        // Valid session, get user details
        const usersSheet = ss.getSheetByName(TABS.USERS);
        const usersData = usersSheet.getDataRange().getValues();
        
        for (let j = 1; j < usersData.length; j++) {
          if (idsEqual(usersData[j][0], sessionsData[i][1])) {
            return {
              valid: true,
              user_id: usersData[j][0],
              full_name: usersData[j][1],
              phone: usersData[j][2],
              role: usersData[j][4]
            };
          }
        }
      }
    }
  }
  
  return { valid: false };
}

/**
 * Check if user has required role
 */
function checkRole(auth, allowedRoles) {
  return allowedRoles.includes(auth.role);
}

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

/**
 * Track shipment (public)
 */
function handleTrack(tracking_number) {
  if (!tracking_number) {
    return jsonResponse({ error: 'Tracking number required' }, 400);
  }
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();
  const usersSheet = ss.getSheetByName(TABS.USERS);
  const usersData = usersSheet.getDataRange().getValues();
  const userMap = {};
  for (let i = 1; i < usersData.length; i++) {
    userMap[normalizeId(usersData[i][0])] = usersData[i][1];
  }
  
  let shipment = null;
  for (let i = 1; i < shipmentsData.length; i++) {
    if (shipmentsData[i][1] === tracking_number) {
      shipment = {
        tracking_number: shipmentsData[i][1],
        status: shipmentsData[i][17],
        destination_zone: shipmentsData[i][7],
        destination_city: shipmentsData[i][8],
        created_at: shipmentsData[i][3],
        current_handler_role: shipmentsData[i][39],
        current_handler_location: shipmentsData[i][40],
        current_handler_at: shipmentsData[i][41],
          payment_terms: shipmentsData[i][42],
          customer_id: shipmentsData[i][43],
        // Hide sensitive data for public endpoint
      };
      break;
    }
  }
  
  if (!shipment) {
    return jsonResponse({ error: 'Shipment not found' }, 404);
  }
  
  // Get events for this shipment
  const eventsSheet = ss.getSheetByName(TABS.EVENTS);
  const eventsData = eventsSheet.getDataRange().getValues();
  const events = [];
  
  for (let i = 1; i < eventsData.length; i++) {
    if (eventsData[i][1] === shipment.tracking_number) {
      events.push({
        event_type: eventsData[i][2],
        event_timestamp: eventsData[i][3],
        notes: eventsData[i][8]
      });
    }
  }
  
  return jsonResponse({
    success: true,
    shipment: shipment,
    events: events
  });
}

/**
 * Get departure schedules (public)
 */
function handleGetDepartures(zone) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const departuresSheet = ss.getSheetByName(TABS.DEPARTURES);
  const departuresData = departuresSheet.getDataRange().getValues();
  
  const departures = [];
  
  for (let i = 1; i < departuresData.length; i++) {
    if (departuresData[i][4] === true) { // is_active
      if (!zone || departuresData[i][1] === zone) {
        departures.push({
          departure_id: departuresData[i][0],
          zone: departuresData[i][1],
          day_of_week: departuresData[i][2],
          departure_time: departuresData[i][3],
          notes: departuresData[i][6]
        });
      }
    }
  }
  
  return jsonResponse({
    success: true,
    departures: departures
  });
}

// ============================================================================
// USER ENDPOINTS
// ============================================================================

/**
 * Get current user info
 */
function handleGetMe(auth) {
  return jsonResponse({
    success: true,
    user: {
      user_id: auth.user_id,
      full_name: auth.full_name,
      phone: auth.phone,
      role: auth.role
    }
  });
}

// ============================================================================
// SHIPMENT ENDPOINTS
// ============================================================================

/**
 * Create new shipment (STAFF role)
 */
function handleCreateShipment(data, auth) {
  if (!checkRole(auth, [ROLES.STAFF, ROLES.ADMIN])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }
  
  const {
    customer_name,
    customer_phone,
    destination_zone,
    destination_city,
    weight_kg,
    pricing_tier,
    has_home_delivery,
    loyalty_token_id,
    negotiated_rate_per_kg,
    sender_address,
    sender_id_number,
    receiver_country,
    receiver_zip,
    receiver_phone,
    payment_terms,
    amount_paid
  } = data;
  
  // Validation
    if (!customer_name || !customer_phone || !sender_address || !sender_id_number ||
        !destination_zone || !destination_city || !receiver_country || !receiver_zip || !receiver_phone ||
        !weight_kg || !pricing_tier) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const settingsSheet = ss.getSheetByName(TABS.SETTINGS);
  
  // Get settings
  const settings = getSettings(settingsSheet);
  
  // Calculate billing weight (minimum 20kg)
  const billing_weight = Math.max(weight_kg, CONFIG.MINIMUM_WEIGHT_KG);
  
  // Calculate amount due
  let rate_per_kg = 0;
  switch (pricing_tier) {
    case 'B2C':
      rate_per_kg = settings.b2c_rate_per_kg;
      break;
    case 'B2B_TIER_1':
      rate_per_kg = settings.b2b_tier1_rate_per_kg;
      break;
    case 'B2B_TIER_2':
      rate_per_kg = settings.b2b_tier2_rate_per_kg;
      break;
    case 'B2B_TIER_3':
      rate_per_kg = settings.b2b_tier3_rate_per_kg;
      break;
    default:
      return jsonResponse({ error: 'Invalid pricing tier' }, 400);
  }

  if (negotiated_rate_per_kg !== undefined && negotiated_rate_per_kg !== null && negotiated_rate_per_kg !== '') {
    const negotiatedRate = Number(negotiated_rate_per_kg);
    if (!isFinite(negotiatedRate)) {
      return jsonResponse({ error: 'Invalid negotiated rate' }, 400);
    }
    if (negotiatedRate < CONFIG.MIN_RATE_PER_KG) {
      return jsonResponse({ error: 'Negotiated rate must be at least ' + CONFIG.MIN_RATE_PER_KG }, 400);
    }
    rate_per_kg = negotiatedRate;
  }
  
  let amount_due = billing_weight * rate_per_kg;
  
  // Add home delivery fee if requested
  if (has_home_delivery === true) {
    amount_due += CONFIG.HOME_DELIVERY_FEE;
  }

  const resolvedPaymentTerms = payment_terms || (data.payment_received ? 'PAY_NOW' : 'PAY_ON_PICKUP');
  if (!['PAY_NOW', 'PAY_ON_PICKUP', 'POD'].includes(resolvedPaymentTerms)) {
    return jsonResponse({ error: 'Invalid payment terms' }, 400);
  }
  const payment_received = resolvedPaymentTerms === 'PAY_NOW';
  
  // Apply loyalty token if provided
  let token_applied = false;
  if (loyalty_token_id) {
    const tokensSheet = ss.getSheetByName(TABS.LOYALTY_TOKENS);
    const tokensData = tokensSheet.getDataRange().getValues();
    
    for (let i = 1; i < tokensData.length; i++) {
      if (tokensData[i][0] === loyalty_token_id && tokensData[i][1] === customer_phone && tokensData[i][3] === false) {
        // Valid unused token, make shipment free (minus home delivery)
        amount_due = has_home_delivery ? CONFIG.HOME_DELIVERY_FEE : 0;
        token_applied = true;
        
        // Mark token as used
        tokensSheet.getRange(i + 1, 4).setValue(true); // is_used
        tokensSheet.getRange(i + 1, 5).setValue(new Date().toISOString()); // used_at
        break;
      }
    }
  }
  
  // Generate tracking number and pickup code
  const tracking_number = generateTrackingNumber();
  const pickup_code = generatePickupCode();
  
  const now = new Date();
  const pickup_deadline = new Date(now.getTime() + CONFIG.PICKUP_DEADLINE_HOURS * 60 * 60 * 1000);

  const shipment_id = generateId();
  const payment_validated_at = payment_received ? now.toISOString() : '';
  const payment_validated_by_user_id = payment_received ? auth.user_id : '';
  let resolvedAmountPaid = 0;
  if (payment_received) {
    if (amount_paid !== undefined && amount_paid !== null && amount_paid !== '') {
      const paidValue = Number(amount_paid);
      if (!isFinite(paidValue)) {
        return jsonResponse({ error: 'Invalid payment amount' }, 400);
      }
      const min_amount = billing_weight * CONFIG.MIN_RATE_PER_KG;
      if (paidValue < min_amount) {
        return jsonResponse({ error: 'Payment amount must be at least ' + min_amount.toFixed(2) }, 400);
      }
      resolvedAmountPaid = paidValue;
      if (Math.abs(resolvedAmountPaid - amount_due) > 0.01) {
        logEvent(ss, shipment_id, 'PRICE_ADJUSTED', auth.user_id, amount_due, resolvedAmountPaid,
                 { reason: 'Adjusted by staff at creation' }, 'Price adjusted during creation');
        amount_due = resolvedAmountPaid;
      }
    } else {
      resolvedAmountPaid = amount_due;
    }
  }
    const initial_status = payment_received ? STATUS.PENDING : STATUS.CREATED;
    const handlerLocation = getUserAddress(ss, auth.user_id);
    const customer_id = upsertCustomerRecord(ss, {
      id_number: sender_id_number,
      full_name: customer_name,
      phone: customer_phone,
      activity_at: now.toISOString()
    });
    
    // Create shipment
    shipmentsSheet.appendRow([
    shipment_id,
    tracking_number,
    pickup_code,
    now.toISOString(), // created_at
    auth.user_id, // created_by_user_id
    customer_name,
    customer_phone,
    destination_zone,
    destination_city,
    weight_kg,
    pricing_tier,
    has_home_delivery || false,
    amount_due,
    resolvedAmountPaid,
    payment_validated_at,
    payment_validated_by_user_id,
    token_applied ? loyalty_token_id : '',
    initial_status,
    '', // assigned_driver_user_id
    '', // driver_assigned_at
    pickup_deadline.toISOString(),
    '', // qr_scanned_at
    '', // id_photo_url
    '', // package_photo_url
    '', // loaded_at
    '', // picked_up_at
    '', // in_transit_at
    '', // at_relay_at
    '', // relay_bin
    '', // delivered_at
    '', // notes
    sender_address,
    sender_id_number || '',
    receiver_country,
    receiver_zip,
    receiver_phone,
    '',
    '',
    auth.user_id,
      auth.role,
      handlerLocation || '',
      now.toISOString(),
      resolvedPaymentTerms,
      customer_id
    ]);
  
    // Log event
    logEvent(ss, shipment_id, 'SHIPMENT_CREATED', auth.user_id, null, STATUS.CREATED, {
      tracking_number: tracking_number,
      customer_phone: customer_phone
    }, 'Shipment created by ' + auth.full_name);

  if (payment_received) {
    logEvent(ss, shipment_id, 'PAYMENT_VALIDATED', auth.user_id, null, null,
             { amount: resolvedAmountPaid }, 'Payment recorded at creation');
    checkAndGenerateLoyaltyToken(ss, customer_phone, shipment_id);
  }
  
  if (token_applied) {
    logEvent(ss, shipment_id, 'LOYALTY_TOKEN_USED', auth.user_id, null, null, {
      token_id: loyalty_token_id
    }, 'Loyalty token applied');
  }
  
  return jsonResponse({
    success: true,
      shipment: {
        shipment_id: shipment_id,
        customer_id: customer_id,
        tracking_number: tracking_number,
        pickup_code: pickup_code,
        amount_due: amount_due,
      pickup_deadline_at: pickup_deadline.toISOString()
    }
  });
}

/**
 * Get shipment details
 */
function handleGetShipment(shipment_id, auth) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const userMap = buildUserMap(ss);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();
  
  let shipment = null;
  let rowIndex = -1;
  
  for (let i = 1; i < shipmentsData.length; i++) {
    if (shipmentsData[i][0] == shipment_id) {
      shipment = {
        shipment_id: shipmentsData[i][0],
        tracking_number: shipmentsData[i][1],
        pickup_code6: shipmentsData[i][2],
        created_at: shipmentsData[i][3],
        created_by_user_id: shipmentsData[i][4],
        created_by_user_name: userMap[normalizeId(shipmentsData[i][4])] || '',
        customer_name: shipmentsData[i][5],
        customer_phone: shipmentsData[i][6],
        destination_zone: shipmentsData[i][7],
        destination_city: shipmentsData[i][8],
        weight_kg: shipmentsData[i][9],
        pricing_tier: shipmentsData[i][10],
        has_home_delivery: shipmentsData[i][11],
        amount_due: shipmentsData[i][12],
        amount_paid: shipmentsData[i][13],
        status: shipmentsData[i][17],
        assigned_driver_user_id: shipmentsData[i][18],
        pickup_deadline_at: shipmentsData[i][20],
        id_photo_url: shipmentsData[i][22],
        package_photo_url: shipmentsData[i][23],
        sender_address: shipmentsData[i][31],
        sender_id_number: shipmentsData[i][32],
        receiver_country: shipmentsData[i][33],
        receiver_zip: shipmentsData[i][34],
        receiver_phone: shipmentsData[i][35],
        receiver_id_number: shipmentsData[i][36],
        receiver_id_photo_url: shipmentsData[i][37],
        current_handler_user_id: shipmentsData[i][38],
        current_handler_role: shipmentsData[i][39],
        current_handler_location: shipmentsData[i][40],
        current_handler_at: shipmentsData[i][41],
          payment_terms: shipmentsData[i][42],
          customer_id: shipmentsData[i][43]
      };
      rowIndex = i;
      break;
    }
  }
  
  if (!shipment) {
    return jsonResponse({ error: 'Shipment not found' }, 404);
  }
  
  return jsonResponse({
    success: true,
    shipment: shipment
  });
}

/**
 * Get user's own shipments (STAFF)
 */
function handleGetMyShipments(auth) {
  if (!checkRole(auth, [ROLES.STAFF, ROLES.ADMIN])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const userMap = buildUserMap(ss);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();
  
  const shipments = [];
  
  for (let i = 1; i < shipmentsData.length; i++) {
    if (auth.role === ROLES.ADMIN || idsEqual(shipmentsData[i][4], auth.user_id)) {
      shipments.push({
        shipment_id: shipmentsData[i][0],
        tracking_number: shipmentsData[i][1],
        created_by_user_id: shipmentsData[i][4],
        created_by_user_name: userMap[normalizeId(shipmentsData[i][4])] || '',
        customer_name: shipmentsData[i][5],
        customer_phone: shipmentsData[i][6],
        destination_zone: shipmentsData[i][7],
        destination_city: shipmentsData[i][8],
        weight_kg: shipmentsData[i][9],
        pricing_tier: shipmentsData[i][10],
        has_home_delivery: shipmentsData[i][11],
        status: shipmentsData[i][17],
        created_at: shipmentsData[i][3],
        amount_due: shipmentsData[i][12],
        amount_paid: shipmentsData[i][13],
        assigned_driver_user_id: shipmentsData[i][18],
        pickup_deadline_at: shipmentsData[i][20],
        id_photo_url: shipmentsData[i][22],
        notes: shipmentsData[i][30],
        sender_address: shipmentsData[i][31],
        sender_id_number: shipmentsData[i][32],
        receiver_country: shipmentsData[i][33],
        receiver_zip: shipmentsData[i][34],
        receiver_phone: shipmentsData[i][35],
        receiver_id_number: shipmentsData[i][36],
        receiver_id_photo_url: shipmentsData[i][37],
        current_handler_user_id: shipmentsData[i][38],
        current_handler_role: shipmentsData[i][39],
        current_handler_location: shipmentsData[i][40],
        current_handler_at: shipmentsData[i][41],
          payment_terms: shipmentsData[i][42],
          customer_id: shipmentsData[i][43]
      });
    }
  }
  
  return jsonResponse({
    success: true,
    shipments: shipments
  });
}

/**
 * Get driver's assigned shipments (DRIVER)
 */
function handleGetMyAssignments(auth) {
  if (!checkRole(auth, [ROLES.DRIVER])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();
  
  const shipments = [];
  const now = new Date();
  
  for (let i = 1; i < shipmentsData.length; i++) {
    if (idsEqual(shipmentsData[i][18], auth.user_id)) {
      const pickup_deadline = new Date(shipmentsData[i][20]);
      const sla_remaining_ms = pickup_deadline - now;
      
      shipments.push({
        shipment_id: shipmentsData[i][0],
        tracking_number: shipmentsData[i][1],
        pickup_code6: shipmentsData[i][2],
        customer_name: shipmentsData[i][5],
        customer_phone: shipmentsData[i][6],
        destination_zone: shipmentsData[i][7],
        status: shipmentsData[i][17],
        amount_due: shipmentsData[i][12],
        pickup_deadline_at: shipmentsData[i][20],
          payment_terms: shipmentsData[i][42],
          customer_id: shipmentsData[i][43],
        sla_remaining_ms: Math.max(0, sla_remaining_ms),
        is_overdue: sla_remaining_ms < 0
      });
    }
  }
  
  return jsonResponse({
    success: true,
    shipments: shipments
  });
}

/**
 * Get relay shipments in possession (RELAY)
 */
function handleGetRelayShipments(auth) {
  if (!checkRole(auth, [ROLES.RELAY])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();
  const relayLocation = getUserAddress(ss, auth.user_id);

  const shipments = [];

  for (let i = 1; i < shipmentsData.length; i++) {
    const status = shipmentsData[i][17];
    if (status !== STATUS.AT_RELAY_AVAILABLE) {
      continue;
    }

    const handlerUserId = shipmentsData[i][38];
    const handlerRole = shipmentsData[i][39];
    const handlerLocation = shipmentsData[i][40];
    const matchesRelay = idsEqual(handlerUserId, auth.user_id) ||
      (handlerRole === ROLES.RELAY && relayLocation && handlerLocation === relayLocation);

    if (!matchesRelay) {
      continue;
    }

    shipments.push({
      shipment_id: shipmentsData[i][0],
      tracking_number: shipmentsData[i][1],
      customer_name: shipmentsData[i][5],
      customer_phone: shipmentsData[i][6],
      destination_zone: shipmentsData[i][7],
      destination_city: shipmentsData[i][8],
      relay_bin: shipmentsData[i][28],
      at_relay_at: shipmentsData[i][27],
      status: status,
      customer_id: shipmentsData[i][43]
    });
  }

  return jsonResponse({
    success: true,
    shipments: shipments
  });
}

/**
 * Assign driver to shipment (ADMIN)
 */
function handleAssignDriver(data, auth) {
  if (!checkRole(auth, [ROLES.ADMIN])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }
  
  const { shipment_id, driver_user_id } = data;
  
  if (!shipment_id || !driver_user_id) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();
  
  let rowIndex = -1;
  let oldDriver = null;
  
  for (let i = 1; i < shipmentsData.length; i++) {
    if (shipmentsData[i][0] == shipment_id) {
      rowIndex = i + 1;
      oldDriver = shipmentsData[i][18];
      break;
    }
  }
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Shipment not found' }, 404);
  }
  
  // Update assignment
  const now = new Date();
  shipmentsSheet.getRange(rowIndex, 19).setValue(driver_user_id); // assigned_driver_user_id
  shipmentsSheet.getRange(rowIndex, 20).setValue(now.toISOString()); // driver_assigned_at
  shipmentsSheet.getRange(rowIndex, 18).setValue(STATUS.DRIVER_ASSIGNED); // status
  
  // Log event
  const eventType = oldDriver ? 'DRIVER_REASSIGNED' : 'DRIVER_ASSIGNED';
  logEvent(ss, shipment_id, eventType, auth.user_id, oldDriver, driver_user_id, null, 
           'Driver ' + (oldDriver ? 're' : '') + 'assigned by ' + auth.full_name);
  
  return jsonResponse({
    success: true,
    message: 'Driver assigned successfully'
  });
}

/**
 * Verify QR code pickup (DRIVER)
 */
function handlePickupVerify(data, auth) {
  if (!checkRole(auth, [ROLES.DRIVER])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }
  
  const { qr_code, tracking_number, pickup_code, shipment_id: shipmentIdInput } = data;

  let shipment_id = shipmentIdInput || '';
  let trackingNumber = '';
  let pickupCode = pickup_code;

  if (qr_code) {
    const parts = qr_code.split('|');
    if (parts.length !== 3 || !['AP', 'AT'].includes(parts[0])) {
      return jsonResponse({ error: 'Invalid QR code format' }, 400);
    }

    if (parts[0] === 'AP') {
      shipment_id = parts[1];
    } else {
      trackingNumber = parts[1];
    }
    pickupCode = parts[2];
  } else {
    trackingNumber = tracking_number || '';
  }

  if (!pickupCode || (!shipment_id && !trackingNumber)) {
    return jsonResponse({ error: 'Tracking number and pickup code required' }, 400);
  }
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();
  
  let rowIndex = -1;
  let shipment = null;
  let current_status = '';
  let oldDriver = '';
  
  for (let i = 1; i < shipmentsData.length; i++) {
    const idMatch = shipment_id && shipmentsData[i][0] == shipment_id && shipmentsData[i][2] === pickupCode;
    const trackingMatch = trackingNumber && shipmentsData[i][1] === trackingNumber && shipmentsData[i][2] === pickupCode;
    if (idMatch || trackingMatch) {
      rowIndex = i + 1;
      current_status = shipmentsData[i][17];
      oldDriver = shipmentsData[i][18];
      shipment = {
        shipment_id: shipmentsData[i][0],
        tracking_number: shipmentsData[i][1],
        customer_name: shipmentsData[i][5],
        pickup_code6: shipmentsData[i][2],
        amount_due: shipmentsData[i][12]
      };
      break;
    }
  }
  
  if (!shipment) {
    return jsonResponse({ error: 'Invalid shipment or pickup code' }, 404);
  }
  
  // Mark QR scanned
  const now = new Date();
  shipmentsSheet.getRange(rowIndex, 22).setValue(now.toISOString()); // qr_scanned_at

  if (!idsEqual(oldDriver, auth.user_id)) {
    shipmentsSheet.getRange(rowIndex, 19).setValue(auth.user_id); // assigned_driver_user_id
    shipmentsSheet.getRange(rowIndex, 20).setValue(now.toISOString()); // driver_assigned_at
    const eventType = oldDriver ? 'DRIVER_REASSIGNED' : 'DRIVER_ASSIGNED';
    logEvent(ss, shipment.shipment_id, eventType, auth.user_id, oldDriver, auth.user_id, null,
             'Driver assigned by scan');
  }

  updateCurrentHandler(ss, shipmentsSheet, rowIndex, auth);

  if ([STATUS.CREATED, STATUS.PAID, STATUS.PENDING, STATUS.DRIVER_ASSIGNED].includes(current_status)) {
    shipmentsSheet.getRange(rowIndex, 18).setValue(STATUS.LOADED); // status
    shipmentsSheet.getRange(rowIndex, 25).setValue(now.toISOString()); // loaded_at
    logEvent(ss, shipment.shipment_id, 'STATUS_CHANGE', auth.user_id, current_status, STATUS.LOADED,
             null, 'Status updated on first scan by driver');
  }
  
  // Log event
  logEvent(ss, shipment_id, 'QR_SCANNED', auth.user_id, null, null, null, 'QR code verified by driver');
  
  return jsonResponse({
    success: true,
    shipment: shipment
  });
}

/**
 * Upload photo (ID can be uploaded by STAFF/ADMIN, package by DRIVER)
 */
function handleUploadPhoto(data, auth) {
  if (!checkRole(auth, [ROLES.DRIVER, ROLES.STAFF, ROLES.ADMIN, ROLES.RELAY])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }
  
  const { shipment_id, tracking_number, photo_type, photo_base64 } = data;
  
  if ((!shipment_id && !tracking_number) || !photo_type || !photo_base64) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }
  
  if (!['id', 'package', 'receiver_id'].includes(photo_type)) {
    return jsonResponse({ error: 'Invalid photo type' }, 400);
  }

  if (photo_type === 'package' && !checkRole(auth, [ROLES.DRIVER, ROLES.STAFF, ROLES.ADMIN])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  if (photo_type === 'receiver_id' && !checkRole(auth, [ROLES.RELAY, ROLES.ADMIN])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();
  
    let rowIndex = -1;
    let shipmentRow = null;
    let shipmentIdValue = '';
    let trackingNumberValue = '';
    
    for (let i = 1; i < shipmentsData.length; i++) {
      if ((shipment_id && shipmentsData[i][0] == shipment_id) ||
          (tracking_number && shipmentsData[i][1] === tracking_number)) {
      if (auth.role === ROLES.DRIVER) {
        // Verify this driver is assigned
        if (!idsEqual(shipmentsData[i][18], auth.user_id)) {
          return jsonResponse({ error: 'You are not assigned to this shipment' }, 403);
        }
      } else if (auth.role === ROLES.STAFF) {
        // Verify staff created the shipment
        if (!idsEqual(shipmentsData[i][4], auth.user_id)) {
          return jsonResponse({ error: 'You are not allowed to update this shipment' }, 403);
        }
      }
        rowIndex = i + 1;
        shipmentRow = shipmentsData[i];
        shipmentIdValue = shipmentsData[i][0];
        trackingNumberValue = shipmentsData[i][1];
        break;
      }
    }
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Shipment not found' }, 404);
  }
  
  try {
    const filePrefix = trackingNumberValue || shipmentIdValue;
    const fileName = filePrefix + '_' + photo_type + '_' + new Date().getTime() + '.jpg';

    // Upload to Google Drive
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(photo_base64.split(',')[1] || photo_base64),
      'image/jpeg',
      fileName
    );
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const photo_url = file.getUrl();
    
    // Update shipment
    let columnIndex = 23;
    if (photo_type === 'package') {
      columnIndex = 24;
    } else if (photo_type === 'receiver_id') {
      columnIndex = 38;
    }
      shipmentsSheet.getRange(rowIndex, columnIndex).setValue(photo_url);

      if (shipmentRow) {
        if (photo_type === 'id') {
          upsertCustomerRecord(ss, {
            id_number: shipmentRow[32],
            full_name: shipmentRow[5],
            phone: shipmentRow[6],
            id_photo_url: photo_url,
            activity_at: new Date().toISOString()
          });
        } else if (photo_type === 'receiver_id') {
          upsertCustomerRecord(ss, {
            id_number: shipmentRow[36],
            full_name: '',
            phone: shipmentRow[35],
            id_photo_url: photo_url,
            activity_at: new Date().toISOString()
          });
        }
      }
    
    // Log event
    logEvent(ss, shipmentIdValue, 'PHOTO_UPLOADED', auth.user_id, null, null, 
             { photo_type: photo_type }, 'Photo uploaded: ' + photo_type);
    
    return jsonResponse({
      success: true,
      photo_url: photo_url
    });
    
  } catch (error) {
    Logger.log('Photo upload error: ' + error);
    return jsonResponse({ error: 'Failed to upload photo' }, 500);
  }
}

/**
 * Validate payment (DRIVER)
 */
function handleValidatePayment(data, auth) {
  if (!checkRole(auth, [ROLES.DRIVER])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }
  
  const { shipment_id, amount_paid } = data;
  
  if (!shipment_id || amount_paid === undefined) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();
  
  let rowIndex = -1;
  let amount_due = 0;
  let weight_kg = 0;
  let customer_phone = '';
  
  for (let i = 1; i < shipmentsData.length; i++) {
    if (shipmentsData[i][0] == shipment_id) {
      // Verify this driver is assigned
      if (!idsEqual(shipmentsData[i][18], auth.user_id)) {
        return jsonResponse({ error: 'You are not assigned to this shipment' }, 403);
      }
      
      rowIndex = i + 1;
      amount_due = shipmentsData[i][12];
      weight_kg = shipmentsData[i][9];
      customer_phone = shipmentsData[i][6];
      break;
    }
  }
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Shipment not found' }, 404);
  }
  
  const billing_weight = Math.max(weight_kg || 0, CONFIG.MINIMUM_WEIGHT_KG);
  const min_amount = billing_weight * CONFIG.MIN_RATE_PER_KG;
  
  if (amount_paid < min_amount) {
    logEvent(ss, shipment_id, 'PAYMENT_REJECTED', auth.user_id, null, null,
             { amount_due: amount_due, amount_paid: amount_paid, min_amount: min_amount },
             'Payment rejected: below minimum rate');
    
    return jsonResponse({
      success: false,
      error: 'Payment amount must be at least ' + min_amount.toFixed(2),
      amount_due: amount_due,
      amount_paid: amount_paid
    }, 400);
  }
  
  // Payment validated
  const now = new Date();
  shipmentsSheet.getRange(rowIndex, 14).setValue(amount_paid); // amount_paid
  shipmentsSheet.getRange(rowIndex, 15).setValue(now.toISOString()); // payment_validated_at
  shipmentsSheet.getRange(rowIndex, 16).setValue(auth.user_id); // payment_validated_by_user_id
  shipmentsSheet.getRange(rowIndex, 18).setValue(STATUS.PENDING); // status

  if (Math.abs(amount_paid - amount_due) > 0.01) {
    shipmentsSheet.getRange(rowIndex, 13).setValue(amount_paid); // amount_due
    logEvent(ss, shipment_id, 'PRICE_ADJUSTED', auth.user_id, amount_due, amount_paid,
             { reason: 'Negotiated at pickup' }, 'Price adjusted at pickup');
  }
  
  // Log event
  logEvent(ss, shipment_id, 'PAYMENT_VALIDATED', auth.user_id, null, null,
           { amount: amount_paid }, 'Payment validated by driver');
  
  // Check if this triggers loyalty token generation
  checkAndGenerateLoyaltyToken(ss, customer_phone, shipment_id);
  
  return jsonResponse({
    success: true,
    message: 'Payment validated successfully'
  });
}

/**
 * Record payment (STAFF, ADMIN)
 */
function handleRecordPayment(data, auth) {
  if (!checkRole(auth, [ROLES.STAFF, ROLES.ADMIN])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const { shipment_id, amount_paid } = data;

  if (!shipment_id) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();

  let rowIndex = -1;
  let amount_due = 0;
  let weight_kg = 0;
  let customer_phone = '';
  let current_status = '';

  for (let i = 1; i < shipmentsData.length; i++) {
    if (shipmentsData[i][0] == shipment_id) {
      rowIndex = i + 1;
      amount_due = shipmentsData[i][12];
      weight_kg = shipmentsData[i][9];
      customer_phone = shipmentsData[i][6];
      current_status = shipmentsData[i][17];
      break;
    }
  }

  if (rowIndex === -1) {
    return jsonResponse({ error: 'Shipment not found' }, 404);
  }

  if (current_status === STATUS.VOIDED) {
    return jsonResponse({ error: 'Shipment is voided' }, 400);
  }

  const paid = amount_paid === undefined || amount_paid === null || amount_paid === ''
    ? Number(amount_due)
    : Number(amount_paid);

  if (!isFinite(paid)) {
    return jsonResponse({ error: 'Invalid payment amount' }, 400);
  }

  const billing_weight = Math.max(weight_kg || 0, CONFIG.MINIMUM_WEIGHT_KG);
  const min_amount = billing_weight * CONFIG.MIN_RATE_PER_KG;
  if (paid < min_amount) {
    logEvent(ss, shipment_id, 'PAYMENT_REJECTED', auth.user_id, null, null,
             { amount_due: amount_due, amount_paid: paid, min_amount: min_amount },
             'Payment rejected: below minimum rate');
  return jsonResponse({
    success: false,
    error: 'Payment amount must be at least ' + min_amount.toFixed(2),
    amount_due: amount_due,
    amount_paid: paid
  }, 400);
  }

  const now = new Date();
  shipmentsSheet.getRange(rowIndex, 14).setValue(paid); // amount_paid
  shipmentsSheet.getRange(rowIndex, 15).setValue(now.toISOString()); // payment_validated_at
  shipmentsSheet.getRange(rowIndex, 16).setValue(auth.user_id); // payment_validated_by_user_id
  shipmentsSheet.getRange(rowIndex, 18).setValue(STATUS.PAID); // status

  if (Math.abs(paid - amount_due) > 0.01) {
    shipmentsSheet.getRange(rowIndex, 13).setValue(paid); // amount_due
    logEvent(ss, shipment_id, 'PRICE_ADJUSTED', auth.user_id, amount_due, paid,
             { reason: 'Negotiated by staff/admin' }, 'Price adjusted during payment');
  }

  logEvent(ss, shipment_id, 'PAYMENT_VALIDATED', auth.user_id, current_status, STATUS.PENDING,
           { amount: paid }, 'Payment recorded by ' + auth.full_name);

  checkAndGenerateLoyaltyToken(ss, customer_phone, shipment_id);

  return jsonResponse({
    success: true,
    message: 'Payment recorded successfully'
  });
}

/**
 * Set shipment status (DRIVER, RELAY, ADMIN)
 */
function handleSetStatus(data, auth) {
  const { shipment_id, new_status } = data;
  
  if (!shipment_id || !new_status) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }
  
  // Validate status value
  if (!Object.values(STATUS).includes(new_status)) {
    return jsonResponse({ error: 'Invalid status value' }, 400);
  }

  if (new_status === STATUS.VOIDED && auth.role !== ROLES.ADMIN) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();
  
  let rowIndex = -1;
  let current_status = '';
  
  for (let i = 1; i < shipmentsData.length; i++) {
    if (shipmentsData[i][0] == shipment_id) {
      // Role-based verification
      if (auth.role === ROLES.DRIVER && !idsEqual(shipmentsData[i][18], auth.user_id)) {
        return jsonResponse({ error: 'You are not assigned to this shipment' }, 403);
      }
      
      rowIndex = i + 1;
      current_status = shipmentsData[i][17];
      break;
    }
  }
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Shipment not found' }, 404);
  }
  
  // Update status
  const now = new Date();
  shipmentsSheet.getRange(rowIndex, 18).setValue(new_status);
  
  // Update timestamp based on status
  if (new_status === STATUS.LOADED) {
    shipmentsSheet.getRange(rowIndex, 25).setValue(now.toISOString()); // loaded_at
  } else if (new_status === STATUS.PICKED_UP) {
    shipmentsSheet.getRange(rowIndex, 26).setValue(now.toISOString()); // picked_up_at
  } else if (new_status === STATUS.IN_TRANSIT) {
    shipmentsSheet.getRange(rowIndex, 27).setValue(now.toISOString()); // in_transit_at
  } else if (new_status === STATUS.AT_RELAY_AVAILABLE) {
    shipmentsSheet.getRange(rowIndex, 28).setValue(now.toISOString()); // at_relay_at
  } else if (new_status === STATUS.DELIVERED || new_status === STATUS.RELEASED) {
    shipmentsSheet.getRange(rowIndex, 30).setValue(now.toISOString()); // delivered_at
  }
  
  // Log event
  logEvent(ss, shipment_id, 'STATUS_CHANGE', auth.user_id, current_status, new_status,
           null, 'Status changed from ' + current_status + ' to ' + new_status);
  
  return jsonResponse({
    success: true,
    message: 'Status updated successfully'
  });
}

// ============================================================================
// RELAY ENDPOINTS
// ============================================================================

/**
 * Mark package received at relay (RELAY)
 */
function handleRelayInbound(data, auth) {
  if (!checkRole(auth, [ROLES.RELAY, ROLES.ADMIN])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }
  
  const { tracking_number, bin_assignment } = data;
  
  if (!tracking_number) {
    return jsonResponse({ error: 'Tracking number required' }, 400);
  }
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();
  
    let rowIndex = -1;
    let shipment_id = null;
    let shipmentRow = null;
    
    for (let i = 1; i < shipmentsData.length; i++) {
      if (shipmentsData[i][1] === tracking_number) {
        rowIndex = i + 1;
        shipment_id = shipmentsData[i][0];
        shipmentRow = shipmentsData[i];
        break;
      }
    }
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Shipment not found' }, 404);
  }
  
  const now = new Date();
  shipmentsSheet.getRange(rowIndex, 18).setValue(STATUS.AT_RELAY_AVAILABLE);
  shipmentsSheet.getRange(rowIndex, 28).setValue(now.toISOString()); // at_relay_at
  updateCurrentHandler(ss, shipmentsSheet, rowIndex, auth);
  
  if (bin_assignment) {
    shipmentsSheet.getRange(rowIndex, 29).setValue(bin_assignment); // relay_bin
  }
  
  logEvent(ss, shipment_id, 'RELAY_INBOUND', auth.user_id, null, null,
           { bin: bin_assignment }, 'Package received at relay point');
  
  return jsonResponse({
    success: true,
    message: 'Package marked as available at relay'
  });
}

/**
 * Release package from relay (RELAY)
 */
function handleRelayRelease(data, auth) {
  if (!checkRole(auth, [ROLES.RELAY, ROLES.ADMIN])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }
  
  const { tracking_number, release_type, receiver_id_number } = data;
  
  if (!tracking_number || !release_type || !receiver_id_number) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }
  
  if (!['DELIVERED', 'RELEASED'].includes(release_type)) {
    return jsonResponse({ error: 'Invalid release type' }, 400);
  }
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();
  
  let rowIndex = -1;
  let shipment_id = null;
  
  for (let i = 1; i < shipmentsData.length; i++) {
    if (shipmentsData[i][1] === tracking_number) {
      rowIndex = i + 1;
      shipment_id = shipmentsData[i][0];
      break;
    }
  }
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Shipment not found' }, 404);
  }
  
    const now = new Date();
    shipmentsSheet.getRange(rowIndex, 18).setValue(release_type);
    shipmentsSheet.getRange(rowIndex, 30).setValue(now.toISOString()); // delivered_at
    shipmentsSheet.getRange(rowIndex, 37).setValue(receiver_id_number); // receiver_id_number
    updateCurrentHandler(ss, shipmentsSheet, rowIndex, auth);

    if (shipmentRow) {
      upsertCustomerRecord(ss, {
        id_number: receiver_id_number,
        full_name: '',
        phone: shipmentRow[35],
        activity_at: now.toISOString()
      });
    }
    
    logEvent(ss, shipment_id, 'RELAY_RELEASED', auth.user_id, null, null,
           { release_type: release_type, receiver_id_number: receiver_id_number }, 'Package released to customer');
  
  return jsonResponse({
    success: true,
    message: 'Package released successfully'
  });
}

/**
 * Driver claim shipment by tracking number with package photo (DRIVER)
 */
function handleDriverClaim(data, auth) {
  if (!checkRole(auth, [ROLES.DRIVER])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const { tracking_number, photo_base64, shipment_id } = data;

  if ((!tracking_number && !shipment_id) || !photo_base64) {
    return jsonResponse({ error: 'Tracking number or shipment ID and package photo required' }, 400);
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();

  let rowIndex = -1;
  let shipment = null;
  let current_status = '';
  let oldDriver = '';

  for (let i = 1; i < shipmentsData.length; i++) {
    if ((tracking_number && shipmentsData[i][1] === tracking_number) ||
        (shipment_id && shipmentsData[i][0] == shipment_id)) {
      rowIndex = i + 1;
      current_status = shipmentsData[i][17];
      oldDriver = shipmentsData[i][18];
      shipment = {
        shipment_id: shipmentsData[i][0],
        tracking_number: shipmentsData[i][1],
        pickup_code6: shipmentsData[i][2],
        customer_name: shipmentsData[i][5],
        amount_due: shipmentsData[i][12]
      };
      break;
    }
  }

  if (rowIndex === -1 || !shipment) {
    return jsonResponse({ error: 'Shipment not found' }, 404);
  }

  if ([STATUS.VOIDED, STATUS.DELIVERED, STATUS.RELEASED].includes(current_status)) {
    return jsonResponse({ error: 'Shipment is not available for pickup' }, 400);
  }

  const now = new Date();

  if (!idsEqual(oldDriver, auth.user_id)) {
    shipmentsSheet.getRange(rowIndex, 19).setValue(auth.user_id); // assigned_driver_user_id
    shipmentsSheet.getRange(rowIndex, 20).setValue(now.toISOString()); // driver_assigned_at
    const eventType = oldDriver ? 'DRIVER_REASSIGNED' : 'DRIVER_ASSIGNED';
    logEvent(ss, shipment.shipment_id, eventType, auth.user_id, oldDriver, auth.user_id, null,
             'Driver assigned by tracking claim');
  }

  // Upload package photo
  try {
    const filePrefix = shipment.tracking_number || shipment.shipment_id;
    const fileName = filePrefix + '_package_' + new Date().getTime() + '.jpg';
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(photo_base64.split(',')[1] || photo_base64),
      'image/jpeg',
      fileName
    );
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const photo_url = file.getUrl();
    shipmentsSheet.getRange(rowIndex, 24).setValue(photo_url); // package_photo_url
    logEvent(ss, shipment.shipment_id, 'PHOTO_UPLOADED', auth.user_id, null, null,
             { photo_type: 'package' }, 'Package photo uploaded by driver');
  } catch (error) {
    Logger.log('Photo upload error: ' + error);
    return jsonResponse({ error: 'Failed to upload package photo' }, 500);
  }

  shipmentsSheet.getRange(rowIndex, 22).setValue(now.toISOString()); // qr_scanned_at
  updateCurrentHandler(ss, shipmentsSheet, rowIndex, auth);

  return jsonResponse({
    success: true,
    shipment: shipment
  });
}

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * Get overdue pickups (ADMIN)
 */
function handleGetOverduePickups() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();
  
  const now = new Date();
  const overdueShipments = [];
  
  for (let i = 1; i < shipmentsData.length; i++) {
    const status = shipmentsData[i][17];
    const pickup_deadline = new Date(shipmentsData[i][20]);
    
    if ([STATUS.DRIVER_ASSIGNED, STATUS.LOADED].includes(status) && pickup_deadline < now) {
      overdueShipments.push({
        shipment_id: shipmentsData[i][0],
        tracking_number: shipmentsData[i][1],
        customer_name: shipmentsData[i][5],
        assigned_driver_user_id: shipmentsData[i][18],
        status: status,
        pickup_deadline_at: shipmentsData[i][20],
        hours_overdue: (now - pickup_deadline) / (1000 * 60 * 60)
      });
    }
  }
  
  return jsonResponse({
    success: true,
    overdue_shipments: overdueShipments,
    count: overdueShipments.length
  });
}

/**
 * Get settings (ADMIN)
 */
function handleGetSettings(keysParam) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const settingsSheet = ss.getSheetByName(TABS.SETTINGS);
  const settings = getSettings(settingsSheet);

  if (keysParam) {
    const keys = keysParam.split(',').map((key) => key.trim()).filter(Boolean);
    const filtered = {};
    keys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(settings, key)) {
        filtered[key] = settings[key];
      }
    });

    return jsonResponse({
      success: true,
      settings: filtered
    });
  }

  return jsonResponse({
    success: true,
    settings: settings
  });
}

/**
 * Get users list (ADMIN)
 */
function handleGetUsers() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const usersSheet = ss.getSheetByName(TABS.USERS);
  const usersData = usersSheet.getDataRange().getValues();
  const users = [];

  for (let i = 1; i < usersData.length; i++) {
    const row = usersData[i];
    users.push({
      user_id: row[0],
      full_name: row[1],
      phone: row[2],
      role: row[4],
      is_active: row[5],
      created_at: row[6],
      last_login_at: row[7],
      notes: row[8],
      address: row[9]
    });
  }

  return jsonResponse({
    success: true,
    users: users
  });
}

/**
 * Get customer list (ADMIN)
 */
function handleGetCustomers(query) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const customersSheet = ss.getSheetByName(TABS.CUSTOMERS);
  if (!customersSheet) {
    return jsonResponse({ error: 'Missing customers tab. Run ensureTabsAndHeaders() first.' }, 500);
  }

  let customersData = customersSheet.getDataRange().getValues();
  if (customersData.length <= 1) {
    backfillCustomersFromShipments(ss);
    customersData = customersSheet.getDataRange().getValues();
  }
  backfillShipmentCustomerIds(ss);

  const customerMap = {};
  for (let i = 1; i < customersData.length; i++) {
    const row = customersData[i];
    const idNumber = normalizeIdCard(row[1]);
    if (!idNumber) {
      continue;
    }
    customerMap[idNumber] = {
      customer_id: row[0] || '',
      id_number: idNumber,
      name: row[2] || '',
      phone: row[3] || '',
      id_photo_url: row[4] || '',
      sent_count: 0,
      received_count: 0,
      last_activity_at: row[6] || ''
    };
  }

  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();
  const missingCustomers = {};

  for (let i = 1; i < shipmentsData.length; i++) {
    const row = shipmentsData[i];
    const activityAt = getLatestActivityAt([row[3], row[29], row[41]]);

    const senderId = normalizeIdCard(row[32]);
    if (senderId) {
      let entry = customerMap[senderId];
      if (!entry) {
        entry = missingCustomers[senderId] || {
          customer_id: '',
          id_number: senderId,
          name: row[5] || '',
          phone: row[6] || '',
          id_photo_url: row[22] || '',
          sent_count: 0,
          received_count: 0,
          last_activity_at: ''
        };
        missingCustomers[senderId] = entry;
      }
      entry.sent_count += 1;
      entry.last_activity_at = getLatestActivityAt([entry.last_activity_at, activityAt]);
      if (!entry.name && row[5]) {
        entry.name = row[5];
      }
      if (!entry.phone && row[6]) {
        entry.phone = row[6];
      }
      if (!entry.id_photo_url && row[22]) {
        entry.id_photo_url = row[22];
      }
    }

    const receiverId = normalizeIdCard(row[36]);
    if (receiverId) {
      let entry = customerMap[receiverId];
      if (!entry) {
        entry = missingCustomers[receiverId] || {
          customer_id: '',
          id_number: receiverId,
          name: '',
          phone: row[35] || '',
          id_photo_url: row[37] || '',
          sent_count: 0,
          received_count: 0,
          last_activity_at: ''
        };
        missingCustomers[receiverId] = entry;
      }
      entry.received_count += 1;
      entry.last_activity_at = getLatestActivityAt([entry.last_activity_at, activityAt]);
      if (!entry.phone && row[35]) {
        entry.phone = row[35];
      }
      if (!entry.id_photo_url && row[37]) {
        entry.id_photo_url = row[37];
      }
    }
  }

  const rowsToAdd = [];
  Object.keys(missingCustomers).forEach((id) => {
    const entry = missingCustomers[id];
    const newId = generateId();
    entry.customer_id = newId;
    customerMap[id] = entry;
    rowsToAdd.push([
      newId,
      entry.id_number,
      entry.name || '',
      entry.phone || '',
      entry.id_photo_url || '',
      new Date().toISOString(),
      entry.last_activity_at || new Date().toISOString(),
      ''
    ]);
  });

  if (rowsToAdd.length > 0) {
    customersSheet.getRange(customersSheet.getLastRow() + 1, 1, rowsToAdd.length, rowsToAdd[0].length)
      .setValues(rowsToAdd);
  }

  let customers = Object.keys(customerMap).map((key) => customerMap[key]);
  const normalizedQuery = (query || '').toString().trim().toLowerCase();

  if (normalizedQuery) {
    customers = customers.filter((customer) => {
      return [
        customer.id_number,
        customer.name,
        customer.phone
      ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
    });
  }

  customers.sort((a, b) => {
    const dateA = new Date(a.last_activity_at || 0);
    const dateB = new Date(b.last_activity_at || 0);
    return dateB - dateA;
  });

  return jsonResponse({
    success: true,
    customers: customers
  });
}

/**
 * Get customer detail + history (ADMIN)
 */
function handleGetCustomerDetail(idNumber) {
  const normalizedId = normalizeIdCard(idNumber);
  if (!normalizedId) {
    return jsonResponse({ error: 'Customer ID number is required' }, 400);
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();

  const customersSheet = ss.getSheetByName(TABS.CUSTOMERS);
  let customerId = '';
  let customerName = '';
  let customerPhone = '';
  let customerPhoto = '';
  if (customersSheet) {
    const customersData = customersSheet.getDataRange().getValues();
    for (let i = 1; i < customersData.length; i++) {
      if (normalizeIdCard(customersData[i][1]) === normalizedId) {
        customerId = customersData[i][0] || '';
        customerName = customersData[i][2] || '';
        customerPhone = customersData[i][3] || '';
        customerPhoto = customersData[i][4] || '';
        break;
      }
    }
  }

  const shipmentsSent = [];
  const shipmentsReceived = [];

  let lastActivityAt = '';

  for (let i = 1; i < shipmentsData.length; i++) {
    const row = shipmentsData[i];
    const senderId = normalizeIdCard(row[32]);
    const receiverId = normalizeIdCard(row[36]);

    if (senderId !== normalizedId && receiverId !== normalizedId) {
      continue;
    }

    const shipment = {
      shipment_id: row[0],
      tracking_number: row[1],
      created_at: row[3],
      status: row[17],
      destination_zone: row[7],
      destination_city: row[8],
      amount_due: row[12],
      delivered_at: row[29],
      id_photo_url: row[22],
      package_photo_url: row[23],
      receiver_id_photo_url: row[37],
      sender_id_number: row[32],
      receiver_id_number: row[36]
    };

    const activityAt = getLatestActivityAt([shipment.created_at, shipment.delivered_at, row[41]]);
    lastActivityAt = getLatestActivityAt([lastActivityAt, activityAt]);

    if (senderId === normalizedId) {
      shipmentsSent.push(shipment);
      if (!customerName && row[5]) {
        customerName = row[5];
      }
      if (!customerPhone && row[6]) {
        customerPhone = row[6];
      }
    }

    if (receiverId === normalizedId) {
      shipmentsReceived.push(shipment);
      if (!customerPhone && row[35]) {
        customerPhone = row[35];
      }
    }
  }

  const customer = {
    customer_id: customerId,
    id_number: normalizedId,
    name: customerName,
    phone: customerPhone,
    id_photo_url: customerPhoto,
    sent_count: shipmentsSent.length,
    received_count: shipmentsReceived.length,
    last_activity_at: lastActivityAt
  };

  const sortByDateDesc = (a, b) => {
    const dateA = new Date(a.created_at || 0);
    const dateB = new Date(b.created_at || 0);
    return dateB - dateA;
  };

  shipmentsSent.sort(sortByDateDesc);
  shipmentsReceived.sort(sortByDateDesc);

  return jsonResponse({
    success: true,
    customer: customer,
    shipments_sent: shipmentsSent,
    shipments_received: shipmentsReceived
  });
}

/**
 * Create user (ADMIN)
 */
function handleCreateUser(data, auth) {
  if (!checkRole(auth, [ROLES.ADMIN])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const { full_name, phone, pin, role, is_active, notes, address } = data;
  const fullName = String(full_name || '').trim();
  const phoneNumber = String(phone || '').trim();
  const pinValue = String(pin || '').trim();

  if (!fullName || !phoneNumber || !pinValue || !role) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }

  if (!Object.values(ROLES).includes(role)) {
    return jsonResponse({ error: 'Invalid role' }, 400);
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const usersSheet = ss.getSheetByName(TABS.USERS);
  const usersData = usersSheet.getDataRange().getValues();

  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][2] === phoneNumber) {
      return jsonResponse({ error: 'Phone already exists' }, 400);
    }
  }

  const now = new Date();
  const userId = generateId();
  const active = is_active === false || is_active === 'false' ? false : true;

  usersSheet.appendRow([
    userId,
    fullName,
    phoneNumber,
    hashPin(pinValue),
    role,
    active,
    now.toISOString(),
    '',
    notes || '',
    address || ''
  ]);

  const auditSheet = ss.getSheetByName(TABS.AUDIT);
  auditSheet.appendRow([
    generateId(),
    now.toISOString(),
    auth.user_id,
    'CREATE',
    'USER',
    userId,
    '',
    JSON.stringify({ full_name: fullName, phone: phoneNumber, role: role, is_active: active, address: address || '' }),
    'Created user via admin panel',
    ''
  ]);

  return jsonResponse({
    success: true,
    user: {
      user_id: userId,
      full_name: fullName,
      phone: phoneNumber,
      role: role,
      is_active: active,
      address: address || ''
    }
  });
}

/**
 * Create departure schedule (ADMIN)
 */
function handleCreateDeparture(data, auth) {
  if (!checkRole(auth, [ROLES.ADMIN])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }
  
  const { zone, day_of_week, departure_time, notes } = data;
  
  if (!zone || !day_of_week || !departure_time) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const departuresSheet = ss.getSheetByName(TABS.DEPARTURES);
  
  const departure_id = generateId();
  const now = new Date();
  
  departuresSheet.appendRow([
    departure_id,
    zone,
    day_of_week,
    departure_time,
    true, // is_active
    now.toISOString(),
    notes || ''
  ]);
  
  return jsonResponse({
    success: true,
    departure_id: departure_id
  });
}

/**
 * Update departure schedule (ADMIN)
 */
function handleUpdateDeparture(data, auth) {
  if (!checkRole(auth, [ROLES.ADMIN])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }
  
  const { departure_id, is_active } = data;
  
  if (!departure_id || is_active === undefined) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const departuresSheet = ss.getSheetByName(TABS.DEPARTURES);
  const departuresData = departuresSheet.getDataRange().getValues();
  
  for (let i = 1; i < departuresData.length; i++) {
    if (departuresData[i][0] == departure_id) {
      departuresSheet.getRange(i + 1, 5).setValue(is_active);
      
      return jsonResponse({
        success: true,
        message: 'Departure schedule updated'
      });
    }
  }
  
  return jsonResponse({ error: 'Departure not found' }, 404);
}

/**
 * Change user role (ADMIN)
 */
function handleChangeUserRole(data, auth) {
  if (!checkRole(auth, [ROLES.ADMIN])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }
  
  const { user_id, new_role, reason } = data;
  
  if (!user_id || !new_role || !reason) {
    return jsonResponse({ error: 'Missing required fields (user_id, new_role, reason)' }, 400);
  }
  
  if (!Object.values(ROLES).includes(new_role)) {
    return jsonResponse({ error: 'Invalid role' }, 400);
  }
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const usersSheet = ss.getSheetByName(TABS.USERS);
  const usersData = usersSheet.getDataRange().getValues();
  
  let rowIndex = -1;
  let old_role = '';
  
  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][0] === user_id) {
      rowIndex = i + 1;
      old_role = usersData[i][4];
      break;
    }
  }
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'User not found' }, 404);
  }
  
  // Check if removing last ADMIN
  if (old_role === ROLES.ADMIN && new_role !== ROLES.ADMIN) {
    let adminCount = 0;
    for (let i = 1; i < usersData.length; i++) {
      if (usersData[i][4] === ROLES.ADMIN && usersData[i][5] === true) {
        adminCount++;
      }
    }
    
    if (adminCount <= 1) {
      return jsonResponse({ error: 'Cannot remove last active ADMIN user' }, 400);
    }
  }
  
  // Update role
  usersSheet.getRange(rowIndex, 5).setValue(new_role);
  
  // Log to audit trail
  const auditSheet = ss.getSheetByName(TABS.AUDIT);
  auditSheet.appendRow([
    generateId(),
    new Date().toISOString(),
    auth.user_id,
    'ROLE_CHANGE',
    'USER',
    user_id,
    JSON.stringify({ role: old_role }),
    JSON.stringify({ role: new_role }),
    reason,
    ''
  ]);
  
  return jsonResponse({
    success: true,
    message: 'User role updated successfully'
  });
}

/**
 * Update settings (ADMIN)
 */
function handleUpdateSettings(data, auth) {
  if (!checkRole(auth, [ROLES.ADMIN])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }
  
  const { setting_key, setting_value } = data;
  
  if (!setting_key || setting_value === undefined) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const settingsSheet = ss.getSheetByName(TABS.SETTINGS);
  const settingsData = settingsSheet.getDataRange().getValues();
  
  let rowIndex = -1;
  let old_value = '';
  
  for (let i = 1; i < settingsData.length; i++) {
    if (settingsData[i][0] === setting_key) {
      rowIndex = i + 1;
      old_value = settingsData[i][1];
      break;
    }
  }
  
  if (rowIndex === -1) {
    return jsonResponse({ error: 'Setting not found' }, 404);
  }
  
  // Update setting
  const now = new Date();
  settingsSheet.getRange(rowIndex, 2).setValue(setting_value);
  settingsSheet.getRange(rowIndex, 4).setValue(now.toISOString());
  settingsSheet.getRange(rowIndex, 5).setValue(auth.user_id);
  
  // Log to audit trail
  const auditSheet = ss.getSheetByName(TABS.AUDIT);
  auditSheet.appendRow([
    generateId(),
    now.toISOString(),
    auth.user_id,
    'UPDATE',
    'SETTING',
    setting_key,
    old_value,
    setting_value,
    'Setting updated',
    ''
  ]);
  
  return jsonResponse({
    success: true,
    message: 'Setting updated successfully'
  });
}

/**
 * Update shipment notes (ADMIN)
 */
function handleUpdateShipmentNotes(data, auth) {
  if (!checkRole(auth, [ROLES.ADMIN])) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const { shipment_id, notes } = data;

  if (!shipment_id) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();

  let rowIndex = -1;
  let oldNotes = '';

  for (let i = 1; i < shipmentsData.length; i++) {
    if (shipmentsData[i][0] == shipment_id) {
      rowIndex = i + 1;
      oldNotes = shipmentsData[i][30];
      break;
    }
  }

  if (rowIndex === -1) {
    return jsonResponse({ error: 'Shipment not found' }, 404);
  }

  shipmentsSheet.getRange(rowIndex, 31).setValue(notes || '');

  logEvent(ss, shipment_id, 'NOTES_UPDATED', auth.user_id, oldNotes, notes || '',
           null, 'Shipment notes updated');

  return jsonResponse({
    success: true,
    message: 'Notes updated successfully'
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique ID
 */
function generateId() {
  return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
}

/**
 * Generate tracking number
 */
function generateTrackingNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return 'ST-' + year + '-' + random;
}

/**
 * Generate 6-digit pickup code
 */
function generatePickupCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate session token
 */
function generateToken() {
  return Utilities.base64Encode(Utilities.getUuid() + Date.now());
}

/**
 * Hash PIN with SHA256
 */
function hashPin(pin) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pin)
    .map(function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    })
    .join('');
}

/**
 * Get settings as object
 */
function getSettings(settingsSheet) {
  const settingsData = settingsSheet.getDataRange().getValues();
  const settings = {};
  
  for (let i = 1; i < settingsData.length; i++) {
    const key = settingsData[i][0];
    const value = settingsData[i][1];
    const type = settingsData[i][2];
    
    if (type === 'NUMBER') {
      settings[key] = parseFloat(value);
    } else if (type === 'BOOLEAN') {
      settings[key] = value === 'TRUE' || value === true;
    } else if (type === 'JSON') {
      settings[key] = JSON.parse(value);
    } else {
      settings[key] = value;
    }
  }
  
  return settings;
}

/**
 * Seed demo users into the users tab.
 * Only adds users if the phone number does not already exist.
 */
function seedDemoUsers() {
  ensureTabsAndHeaders();

  const demoUsers = [
    {
      full_name: 'Master Admin',
      phone: '+10000000000',
      pin: '1234',
      role: ROLES.ADMIN,
      notes: 'Master admin (change PIN after first login)'
    },
    {
      full_name: 'Staff One',
      phone: '+10000000001',
      pin: '1111',
      role: ROLES.STAFF,
      notes: 'Demo staff user'
    },
    {
      full_name: 'Staff Two',
      phone: '+10000000002',
      pin: '1111',
      role: ROLES.STAFF,
      notes: 'Demo staff user'
    },
    {
      full_name: 'Driver One',
      phone: '+10000000003',
      pin: '2222',
      role: ROLES.DRIVER,
      notes: 'Demo driver user'
    },
    {
      full_name: 'Driver Two',
      phone: '+10000000004',
      pin: '2222',
      role: ROLES.DRIVER,
      notes: 'Demo driver user'
    },
    {
      full_name: 'Relay One',
      phone: '+10000000005',
      pin: '3333',
      role: ROLES.RELAY,
      notes: 'Demo relay user'
    }
  ];

  return addUsersIfMissing(demoUsers);
}

/**
 * Create missing tabs and initialize headers if empty.
 * Does not overwrite existing non-empty headers.
 */
function ensureTabsAndHeaders() {
  if (!CONFIG.SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID script property is not set');
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const result = {
    created_tabs: [],
    headers_initialized: [],
    header_mismatches: []
  };

  Object.keys(EXPECTED_HEADERS).forEach((tabName) => {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      result.created_tabs.push(tabName);
    }

    const expected = EXPECTED_HEADERS[tabName];
    const headerRange = sheet.getRange(1, 1, 1, expected.length);
    const actual = headerRange.getValues()[0].map((value) =>
      value === null || value === undefined ? '' : value.toString().trim()
    );

    const isEmpty = actual.every((value) => value === '');
    if (isEmpty) {
      headerRange.setValues([expected]);
      result.headers_initialized.push(tabName);
      return;
    }

    const mismatches = [];
    for (let i = 0; i < expected.length; i++) {
      if (actual[i] === '' && expected[i]) {
        sheet.getRange(1, i + 1).setValue(expected[i]);
        result.headers_initialized.push(tabName + ':' + expected[i]);
      } else if (actual[i] !== expected[i]) {
        mismatches.push({
          column: i + 1,
          expected: expected[i],
          actual: actual[i] || ''
        });
      }
    }

    if (mismatches.length > 0) {
      result.header_mismatches.push({ tab: tabName, mismatches: mismatches });
    }
  });

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Add users if their phone number does not already exist.
 */
function addUsersIfMissing(users) {
  if (!CONFIG.SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID script property is not set');
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const usersSheet = ss.getSheetByName(TABS.USERS);
  if (!usersSheet) {
    throw new Error('Missing "users" tab. Run ensureTabsAndHeaders() first.');
  }
  const usersData = usersSheet.getDataRange().getValues();

  const existingPhones = new Set();
  let maxUserId = 0;

  for (let i = 1; i < usersData.length; i++) {
    const row = usersData[i];
    const phone = row[2];
    if (phone) {
      existingPhones.add(phone);
    }
    const id = parseInt(row[0], 10);
    if (!isNaN(id) && id > maxUserId) {
      maxUserId = id;
    }
  }

  const now = new Date().toISOString();
  const rowsToAdd = [];
  const created = [];
  const skipped = [];

  users.forEach((user) => {
    if (existingPhones.has(user.phone)) {
      skipped.push(user.phone);
      return;
    }

    maxUserId += 1;
    rowsToAdd.push([
      maxUserId,
      user.full_name,
      user.phone,
      hashPin(String(user.pin)),
      user.role,
      true,
      now,
      '',
      user.notes || '',
      user.address || ''
    ]);
    created.push(user.phone);
  });

  if (rowsToAdd.length > 0) {
    usersSheet.getRange(usersSheet.getLastRow() + 1, 1, rowsToAdd.length, rowsToAdd[0].length)
      .setValues(rowsToAdd);
  }

  const result = {
    created_count: created.length,
    skipped_count: skipped.length,
    created_phones: created,
    skipped_phones: skipped
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Validate spreadsheet tab headers match expected schema.
 * Run manually from Apps Script editor to verify setup.
 */
function validateSheetHeaders() {
  if (!CONFIG.SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID script property is not set');
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const result = {
    ok: true,
    missing_tabs: [],
    header_mismatches: []
  };

  Object.keys(EXPECTED_HEADERS).forEach((tabName) => {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      result.ok = false;
      result.missing_tabs.push(tabName);
      return;
    }

    const expected = EXPECTED_HEADERS[tabName];
    const actual = sheet.getRange(1, 1, 1, expected.length).getValues()[0]
      .map((value) => (value === null || value === undefined ? '' : value.toString().trim()));

    const mismatches = [];
    for (let i = 0; i < expected.length; i++) {
      if (actual[i] !== expected[i]) {
        mismatches.push({
          column: i + 1,
          expected: expected[i],
          actual: actual[i] || ''
        });
      }
    }

    if (mismatches.length > 0) {
      result.ok = false;
      result.header_mismatches.push({
        tab: tabName,
        mismatches: mismatches
      });
    }
  });

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Log event to events tab
 */
function logEvent(ss, shipment_id, event_type, actor_user_id, old_value, new_value, metadata, notes) {
  const eventsSheet = ss.getSheetByName(TABS.EVENTS);
  
  eventsSheet.appendRow([
    generateId(),
    shipment_id,
    event_type,
    new Date().toISOString(),
    actor_user_id || '',
    old_value || '',
    new_value || '',
    metadata ? JSON.stringify(metadata) : '',
    notes || ''
  ]);
}

/**
 * Check and generate loyalty token after 10th paid order
 */
function checkAndGenerateLoyaltyToken(ss, customer_phone, current_shipment_id) {
  const shipmentsSheet = ss.getSheetByName(TABS.SHIPMENTS);
  const shipmentsData = shipmentsSheet.getDataRange().getValues();
  
  // Count paid orders for this customer (excluding loyalty token orders)
  let paidCount = 0;
  
  for (let i = 1; i < shipmentsData.length; i++) {
    if (shipmentsData[i][6] === customer_phone && 
        shipmentsData[i][17] === STATUS.PAID &&
        !shipmentsData[i][16]) { // no loyalty token used
      paidCount++;
    }
  }
  
  // Generate token after every 10th paid order
  if (paidCount > 0 && paidCount % 10 === 0) {
    const tokensSheet = ss.getSheetByName(TABS.LOYALTY_TOKENS);
    const token_id = generateId();
    const now = new Date();
    
    tokensSheet.appendRow([
      token_id,
      customer_phone,
      now.toISOString(),
      current_shipment_id,
      false, // is_used
      '',
      '',
      'Auto-generated after ' + paidCount + ' paid orders'
    ]);
    
    logEvent(ss, current_shipment_id, 'LOYALTY_TOKEN_GENERATED', null, null, null,
             { token_id: token_id, customer_phone: customer_phone },
             'Loyalty token generated for customer');
  }
}

/**
 * Return JSON response
 */
function jsonResponse(data, statusCode = 200) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
