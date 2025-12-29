# Google Sheets Database Setup Guide

## Overview
This document describes the complete structure for the ShipTrack MVP Google Sheets database. The spreadsheet serves as the primary data store for all application data.

## Spreadsheet Structure

### Required Tabs (9 tabs total)

1. **users**
2. **customers**
3. **sessions**
4. **shipments**
5. **events**
5. **departures**
6. **loyalty_tokens**
7. **settings**
8. **audit**

---

## Tab 1: users

### Purpose
Stores all user accounts including staff, drivers, relay personnel, and admins.

### Column Headers (Row 1)
```
user_id | full_name | phone | pin_hash | role | is_active | created_at | last_login_at | notes | address
```

### Column Definitions
- **user_id**: Unique identifier (numeric, auto-increment recommended)
- **full_name**: User's full name (text)
- **phone**: Phone number, can be used as username (text)
- **pin_hash**: Hashed PIN for authentication (text) - Store as SHA256 hash
- **role**: One of: STAFF, DRIVER, RELAY, ADMIN (text)
- **is_active**: TRUE or FALSE (boolean)
- **created_at**: Timestamp (ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ)
- **last_login_at**: Timestamp of last successful login (ISO 8601)
- **notes**: Optional notes about the user (text)
- **address**: User address/location for handler tracking (text)

### Seed Data Examples
```
1 | Admin User | +1234567890 | [SHA256_OF_PIN_1234] | ADMIN | TRUE | 2024-01-01T00:00:00.000Z | | Initial admin account
2 | John Staff | +1234567891 | [SHA256_OF_PIN_5678] | STAFF | TRUE | 2024-01-01T00:00:00.000Z | | Staff member
3 | Jane Driver | +1234567892 | [SHA256_OF_PIN_9012] | DRIVER | TRUE | 2024-01-01T00:00:00.000Z | | Driver #1
4 | Bob Relay | +1234567893 | [SHA256_OF_PIN_3456] | RELAY | TRUE | 2024-01-01T00:00:00.000Z | | Relay point operator
```

**Admin Credentials for Testing:**
- Phone: +1234567890
- PIN: 1234

---

## Tab 2: customers

### Purpose
Stores unique customers by ID card number for admin lookup and history.
Customers are auto-populated from shipments using sender/receiver ID numbers.

### Column Headers
customer_id | id_number | full_name | phone | id_photo_url | created_at | last_activity_at | notes

### Example Row
1 | AB123456 | Jane Doe | +212600000000 | https://drive.google.com/... | 2024-01-01T00:00:00.000Z | 2024-01-15T12:00:00.000Z | Imported from shipments

---

## Tab 3: sessions

### Purpose
Manages active authentication sessions with tokens and expiration.

### Column Headers
```
session_id | user_id | token | created_at | expires_at | ip_address | user_agent
```

### Column Definitions
- **session_id**: Unique session identifier (numeric or UUID)
- **user_id**: Foreign key to users.user_id (numeric)
- **token**: Session token (random string, 32+ chars)
- **created_at**: Timestamp when session created (ISO 8601)
- **expires_at**: Timestamp when session expires (ISO 8601)
- **ip_address**: Optional IP address of client (text)
- **user_agent**: Optional browser user agent (text)

### Notes
- Sessions expire after 24 hours (configurable in config.json)
- Token should be cryptographically random
- Clean up expired sessions periodically

---

## Tab 4: shipments

### Purpose
Core shipment records with all tracking and billing information.

### Column Headers
```
shipment_id | tracking_number | pickup_code6 | created_at | created_by_user_id | customer_name | customer_phone | destination_zone | destination_city | weight_kg | pricing_tier | has_home_delivery | amount_due | amount_paid | payment_validated_at | payment_validated_by_user_id | loyalty_token_id_used | status | assigned_driver_user_id | driver_assigned_at | pickup_deadline_at | qr_scanned_at | id_photo_url | package_photo_url | loaded_at | picked_up_at | in_transit_at | at_relay_at | relay_bin | delivered_at | notes | sender_address | sender_id_number | receiver_country | receiver_zip | receiver_phone | receiver_id_number | receiver_id_photo_url | current_handler_user_id | current_handler_role | current_handler_location | current_handler_at | payment_terms | customer_id
```

### Column Definitions
- **shipment_id**: Unique identifier (numeric)
- **tracking_number**: Public tracking number (text, e.g., "ST-2024-000001")
- **pickup_code6**: 6-digit numeric code for driver verification (text, e.g., "123456")
- **created_at**: Timestamp (ISO 8601)
- **created_by_user_id**: Foreign key to users (numeric)
- **customer_name**: Customer full name (text)
- **customer_phone**: Customer phone number (text)
- **destination_zone**: Zone 1-5 (text)
- **destination_city**: Destination city name (text)
- **weight_kg**: Weight in kilograms (numeric, decimal)
- **pricing_tier**: B2C, B2B_TIER_1, B2B_TIER_2, B2B_TIER_3 (text)
- **has_home_delivery**: TRUE or FALSE (boolean)
- **amount_due**: Calculated amount due (numeric, decimal)
- **amount_paid**: Amount actually paid (numeric, decimal)
- **payment_validated_at**: Timestamp when payment confirmed (ISO 8601)
- **payment_validated_by_user_id**: User who validated payment (numeric)
- **loyalty_token_id_used**: Foreign key to loyalty_tokens if used (numeric or empty)
- **status**: Current status (see Status Values below)
- **assigned_driver_user_id**: Driver assigned (numeric or empty)
- **driver_assigned_at**: Timestamp of assignment (ISO 8601 or empty)
- **pickup_deadline_at**: 48 hours after created_at (ISO 8601)
- **qr_scanned_at**: Timestamp when driver scanned QR (ISO 8601 or empty)
- **id_photo_url**: Google Drive URL to ID photo (text or empty)
- **package_photo_url**: Google Drive URL to package photo (text or empty)
- **loaded_at**: Timestamp marked LOADED (ISO 8601 or empty)
- **picked_up_at**: Timestamp marked PICKED_UP (ISO 8601 or empty)
- **in_transit_at**: Timestamp marked IN_TRANSIT (ISO 8601 or empty)
- **at_relay_at**: Timestamp marked AT_RELAY_AVAILABLE (ISO 8601 or empty)
- **relay_bin**: Warehouse bin assignment (text or empty)
- **delivered_at**: Timestamp marked DELIVERED or RELEASED (ISO 8601 or empty)
- **notes**: Optional notes (text)
- **sender_address**: Sender address (text)
- **sender_id_number**: Sender ID number (text, optional)
- **receiver_country**: Receiver country (text)
- **receiver_zip**: Receiver postal/ZIP code (text)
- **receiver_phone**: Receiver phone number (text)
- **receiver_id_number**: Receiver ID number captured at relay release (text)
- **receiver_id_photo_url**: Receiver ID photo URL captured at relay release (text)
- **current_handler_user_id**: User ID of current handler (numeric or empty)
- **current_handler_role**: Role of current handler (text)
- **current_handler_location**: Handler address/location (text)
- **current_handler_at**: Timestamp when handler was updated (ISO 8601)
- **payment_terms**: PAY_NOW, PAY_ON_PICKUP, or POD (text)

### Status Values (Enum)
1. CREATED - Initial creation
2. PAID - Payment received and validated by driver
3. PENDING - Payment received by staff, awaiting pickup
4. DRIVER_ASSIGNED - Driver assigned to pickup
5. LOADED - Driver marked as loaded in vehicle
6. PICKED_UP - Driver completed pickup with photos and payment
7. IN_TRANSIT - Package in transit to destination
8. AT_RELAY_AVAILABLE - Package at relay point, ready for customer pickup
9. DELIVERED - Home delivery completed
9. RELEASED - Released from relay point to customer

### Pricing Tier Values
- B2C: Standard consumer pricing
- B2B_TIER_1: Business tier 1 (highest volume)
- B2B_TIER_2: Business tier 2 (medium volume)
- B2B_TIER_3: Business tier 3 (lower volume)

### Business Rules
- Minimum billing weight: 20kg (if actual weight < 20, bill at 20kg)
- Pickup deadline: created_at + 48 hours
- First order detection: Check if customer_phone appears in any PAID shipment before this one
- Loyalty token generation: After 10th PAID shipment (excluding token-used orders)

---

## Tab 5: events

### Purpose
Audit trail of all significant actions and status changes.

### Column Headers
```
event_id | shipment_id | event_type | event_timestamp | actor_user_id | old_value | new_value | metadata | notes
```

### Column Definitions
- **event_id**: Unique identifier (numeric)
- **shipment_id**: Foreign key to shipments (numeric or empty for system events)
- **event_type**: Type of event (text, see Event Types below)
- **event_timestamp**: When event occurred (ISO 8601)
- **actor_user_id**: User who performed action (numeric or empty for system)
- **old_value**: Previous value if applicable (text or empty)
- **new_value**: New value if applicable (text or empty)
- **metadata**: Additional JSON data (text or empty)
- **notes**: Human-readable description (text)

### Event Types
- STATUS_CHANGE: Status transition
- DRIVER_ASSIGNED: Driver assignment
- DRIVER_REASSIGNED: Driver changed
- PHOTO_UPLOADED: ID or package photo uploaded
- PAYMENT_VALIDATED: Payment confirmed
- PAYMENT_REJECTED: Payment amount mismatch
- QR_SCANNED: QR code scanned by driver
- RELAY_INBOUND: Package received at relay
- RELAY_RELEASED: Package released to customer
- SHIPMENT_CREATED: New shipment created
- LOYALTY_TOKEN_GENERATED: Token generated for customer
- LOYALTY_TOKEN_USED: Token redeemed

---

## Tab 6: departures

### Purpose
Scheduled departure times for each zone.

### Column Headers
```
departure_id | zone | day_of_week | departure_time | is_active | created_at | notes
```

### Column Definitions
- **departure_id**: Unique identifier (numeric)
- **zone**: Zone 1-5 (text)
- **day_of_week**: Monday-Sunday (text)
- **departure_time**: Time in HH:mm format (text, e.g., "14:30")
- **is_active**: TRUE or FALSE (boolean)
- **created_at**: Timestamp (ISO 8601)
- **notes**: Optional notes (text)

### Seed Data Examples
```
1 | Zone 1 | Monday | 09:00 | TRUE | 2024-01-01T00:00:00.000Z | Daily service
2 | Zone 1 | Tuesday | 09:00 | TRUE | 2024-01-01T00:00:00.000Z | Daily service
3 | Zone 1 | Wednesday | 09:00 | TRUE | 2024-01-01T00:00:00.000Z | Daily service
4 | Zone 1 | Thursday | 09:00 | TRUE | 2024-01-01T00:00:00.000Z | Daily service
5 | Zone 1 | Friday | 09:00 | TRUE | 2024-01-01T00:00:00.000Z | Daily service
6 | Zone 2 | Monday | 10:00 | TRUE | 2024-01-01T00:00:00.000Z | 3x weekly
7 | Zone 2 | Wednesday | 10:00 | TRUE | 2024-01-01T00:00:00.000Z | 3x weekly
8 | Zone 2 | Friday | 10:00 | TRUE | 2024-01-01T00:00:00.000Z | 3x weekly
9 | Zone 3 | Tuesday | 11:00 | TRUE | 2024-01-01T00:00:00.000Z | 2x weekly
10 | Zone 3 | Friday | 11:00 | TRUE | 2024-01-01T00:00:00.000Z | 2x weekly
11 | Zone 4 | Wednesday | 12:00 | TRUE | 2024-01-01T00:00:00.000Z | Weekly
12 | Zone 5 | Thursday | 13:00 | TRUE | 2024-01-01T00:00:00.000Z | Weekly
```

---

## Tab 7: loyalty_tokens

### Purpose
Tracks loyalty tokens earned by customers.

### Column Headers
```
token_id | customer_phone | generated_at | generated_after_shipment_id | is_used | used_at | used_for_shipment_id | notes
```

### Column Definitions
- **token_id**: Unique identifier (numeric)
- **customer_phone**: Phone number of customer (text)
- **generated_at**: Timestamp when generated (ISO 8601)
- **generated_after_shipment_id**: The 10th shipment that triggered generation (numeric)
- **is_used**: TRUE or FALSE (boolean)
- **used_at**: Timestamp when redeemed (ISO 8601 or empty)
- **used_for_shipment_id**: Shipment where token was used (numeric or empty)
- **notes**: Optional notes (text)

### Business Rules
- Generated automatically after 10th PAID shipment
- One token per 10 qualifying orders
- Token provides free basic shipment (excludes home delivery fee)

---

## Tab 8: settings

### Purpose
Application-wide configuration and pricing formulas.

### Column Headers
```
setting_key | setting_value | setting_type | last_updated_at | last_updated_by_user_id | description
```

### Column Definitions
- **setting_key**: Unique key identifier (text)
- **setting_value**: Value (text, can be JSON for complex values)
- **setting_type**: STRING, NUMBER, BOOLEAN, JSON (text)
- **last_updated_at**: Timestamp (ISO 8601)
- **last_updated_by_user_id**: User who updated (numeric or empty)
- **description**: Human-readable description (text)

### Required Settings (Seed Data)
```
fx_rate_usd_local | 1.0 | NUMBER | 2024-01-01T00:00:00.000Z | 1 | Exchange rate USD to local currency
transport_cost_per_kg_zone1 | 0.50 | NUMBER | 2024-01-01T00:00:00.000Z | 1 | Internal cost per kg Zone 1
transport_cost_per_kg_zone2 | 0.60 | NUMBER | 2024-01-01T00:00:00.000Z | 1 | Internal cost per kg Zone 2
transport_cost_per_kg_zone3 | 0.70 | NUMBER | 2024-01-01T00:00:00.000Z | 1 | Internal cost per kg Zone 3
transport_cost_per_kg_zone4 | 0.80 | NUMBER | 2024-01-01T00:00:00.000Z | 1 | Internal cost per kg Zone 4
transport_cost_per_kg_zone5 | 0.90 | NUMBER | 2024-01-01T00:00:00.000Z | 1 | Internal cost per kg Zone 5
b2c_rate_per_kg | 20.00 | NUMBER | 2024-01-01T00:00:00.000Z | 1 | B2C rate per kg
b2b_tier1_rate_per_kg | 15.00 | NUMBER | 2024-01-01T00:00:00.000Z | 1 | B2B Tier 1 rate (highest volume)
b2b_tier2_rate_per_kg | 17.00 | NUMBER | 2024-01-01T00:00:00.000Z | 1 | B2B Tier 2 rate
b2b_tier3_rate_per_kg | 18.50 | NUMBER | 2024-01-01T00:00:00.000Z | 1 | B2B Tier 3 rate
home_delivery_fee | 5.00 | NUMBER | 2024-01-01T00:00:00.000Z | 1 | Home delivery fee (revenue)
home_delivery_cost | 5.00 | NUMBER | 2024-01-01T00:00:00.000Z | 1 | Home delivery cost (margin=0)
minimum_billing_weight_kg | 20 | NUMBER | 2024-01-01T00:00:00.000Z | 1 | Minimum billable weight
pickup_deadline_hours | 48 | NUMBER | 2024-01-01T00:00:00.000Z | 1 | Hours until pickup deadline
session_expiry_hours | 24 | NUMBER | 2024-01-01T00:00:00.000Z | 1 | Session token expiry
```

### Relay Points Configuration (as JSON setting)
```
relay_points | [{"id": 1, "name": "Downtown Relay", "address": "123 Main St", "phone": "+1234567894"}, {"id": 2, "name": "Airport Relay", "address": "Airport Terminal 2", "phone": "+1234567895"}, {"id": 3, "name": "North Side Relay", "address": "456 North Ave", "phone": "+1234567896"}, {"id": 4, "name": "South Hub", "address": "789 South Blvd", "phone": "+1234567897"}, {"id": 5, "name": "East Point", "address": "321 East St", "phone": "+1234567898"}] | JSON | 2024-01-01T00:00:00.000Z | 1 | Relay point locations
```

---

## Tab 9: audit

### Purpose
Records sensitive operations for compliance and security.

### Column Headers
```
audit_id | audit_timestamp | actor_user_id | action_type | entity_type | entity_id | before_state | after_state | reason | ip_address
```

### Column Definitions
- **audit_id**: Unique identifier (numeric)
- **audit_timestamp**: When action occurred (ISO 8601)
- **actor_user_id**: User who performed action (numeric)
- **action_type**: CREATE, UPDATE, DELETE, ROLE_CHANGE (text)
- **entity_type**: USER, SHIPMENT, SETTING, DEPARTURE (text)
- **entity_id**: ID of affected entity (numeric)
- **before_state**: State before action as JSON (text or empty)
- **after_state**: State after action as JSON (text)
- **reason**: Mandatory reason for sensitive actions (text)
- **ip_address**: Optional IP address (text)

### Use Cases
- Role changes (especially to/from ADMIN)
- Settings modifications
- User account changes
- Critical shipment modifications

---

## Setup Instructions

1. **Create New Google Spreadsheet**
   - Go to Google Sheets
   - Create new spreadsheet named "ShipTrack MVP Database"
   - Note the Spreadsheet ID from the URL

2. **Create Tabs**
   - Rename first tab to "users"
   - Add 8 more tabs: customers, sessions, shipments, events, departures, loyalty_tokens, settings, audit

3. **Add Headers**
   - Copy column headers for each tab from above
   - Paste into Row 1 of each respective tab
   - Format header row: Bold, background color, freeze row

4. **Add Seed Data**
   - Add the example rows provided above
   - For PIN hashes, use online SHA256 hash generator or implement in Apps Script
   - Adjust dates to current date/time as needed

5. **Set Up Google Apps Script**
   - From spreadsheet: Extensions → Apps Script
   - Copy backend code (see backend/Code.gs)
   - Set Script Properties using values from `backend/script-properties.json`:
     - `SPREADSHEET_ID`
     - `DRIVE_FOLDER_ID`
   - Run `validateSheetHeaders()` from the Apps Script editor to confirm headers match
   - Deploy as Web App
   - Copy deployment URL to config.json

6. **Create Google Drive Folder**
   - Create folder for photo uploads: "ShipTrack Photos"
   - Note the folder ID from URL
   - Add to config.json

7. **Configure Frontend**
   - Update config.json with all IDs and URLs
   - Test connection from frontend

---

## Data Validation Rules

### Required Validations
- **user_id**: Unique, auto-increment
- **tracking_number**: Unique, format "ST-YYYY-NNNNNN"
- **pickup_code6**: Unique, 6 digits
- **phone**: Valid phone format
- **role**: Must be one of: STAFF, DRIVER, RELAY, ADMIN
- **status**: Must be valid status value
- **pricing_tier**: Must be valid tier
- **weight_kg**: Positive number
- **amount_due/amount_paid**: Non-negative numbers

### Business Logic Validations
- Pickup deadline must be created_at + 48 hours
- Status transitions must follow valid workflow
- Payment validation requires exact match
- Only assigned driver can perform pickup
- Cannot remove last ADMIN user

---

## Performance Considerations

### Indexing Strategy
Google Sheets doesn't have traditional indexes, but:
- Keep active data in first ~1000 rows for faster access
- Archive old shipments to separate sheet after 90 days
- Use filters and QUERY formulas for frequent lookups

### Data Cleanup
- Regularly clean expired sessions (> 7 days old)
- Archive completed shipments older than 90 days
- Maintain audit log for compliance period (e.g., 2 years)

---

## Security Notes

1. **PIN Storage**: Always hash PINs with SHA256 before storing
2. **Access Control**: Use Google Sheets permissions to restrict access
3. **API Security**: Web App should validate tokens for all protected endpoints
4. **Photo URLs**: Drive URLs should have appropriate sharing permissions
5. **PII Protection**: Customer data should be handled per privacy regulations

---

## Backup Strategy

1. **Automatic Backups**: Enable Google Sheets version history
2. **Manual Backups**: Export to Excel weekly
3. **Critical Data**: Export users and shipments to separate backup sheet daily
4. **Recovery**: Document restore procedures

---

This completes the Google Sheets database structure specification. All frontend and backend code will reference these exact column names and data structures.
