/**
 * ShipTrack MVP - Core Application JavaScript
 * API client wrapper and utility functions
 */

// Load configuration
let CONFIG = {}
let configPromise = null

// Import showToast function or declare it
function showToast(message, type) {
  // Implementation of showToast function
  console.log(`Toast: ${message} (${type})`)
}

async function loadConfig() {
  const paths = ["./config.json", "../config.json"]
  let lastError = null

  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: "no-store" })
      if (!response.ok) {
        lastError = new Error(`Config not found at ${path} (status ${response.status})`)
        continue
      }

      const config = normalizeConfig(await response.json())
      if (!config.API_URL) {
        lastError = new Error(`API_URL missing in config at ${path}`)
        continue
      }
      console.log(`Loaded config from ${path}`)
      return config
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error("Config not found")
}

function normalizeConfig(config) {
  if (!config || typeof config !== "object") {
    return {}
  }

  const normalized = { ...config }
  if (!normalized.API_URL) {
    const bomKey = Object.keys(normalized).find(
      (key) => key.replace(/^\uFEFF/, "") === "API_URL"
    )
    if (bomKey) {
      normalized.API_URL = normalized[bomKey]
      delete normalized[bomKey]
    }
  }

  return normalized
}

async function ensureConfigLoaded() {
  if (CONFIG && CONFIG.API_URL) {
    return CONFIG
  }

  if (!configPromise) {
    configPromise = loadConfig()
      .then((config) => {
        CONFIG = config
        console.log("App initialized with config:", CONFIG)
        return CONFIG
      })
      .catch((error) => {
        console.error("Failed to load config:", error)
        showToast("Configuration error. Please check setup.", "danger")
        throw error
      })
  }

  return configPromise
}

// Initialize app
async function initApp() {
  try {
    await ensureConfigLoaded()
  } catch (error) {
    // Error already logged and surfaced via toast.
  }
}

// Initialize on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp)
} else {
  initApp()
}

// ============================================================================
// AUTHENTICATION & SESSION MANAGEMENT
// ============================================================================

/**
 * Login user with phone and PIN
 */
async function login(phone, pin) {
  try {
    const response = await apiPost("login", { phone, pin })

    if (response.success) {
      // Store session data
      localStorage.setItem("auth_token", response.token)
      localStorage.setItem("user_data", JSON.stringify(response.user))
      localStorage.setItem("token_expires_at", response.expires_at)

      return { success: true, user: response.user }
    } else {
      return { success: false, error: response.error || "Login failed" }
    }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Logout user
 */
function logout() {
  localStorage.removeItem("auth_token")
  localStorage.removeItem("user_data")
  localStorage.removeItem("token_expires_at")
  window.location.href = "index.html"
}

/**
 * Get current auth token
 */
function getAuthToken() {
  return localStorage.getItem("auth_token")
}

/**
 * Get current user data
 */
function getCurrentUser() {
  const userData = localStorage.getItem("user_data")
  return userData ? JSON.parse(userData) : null
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
  const token = getAuthToken()
  const expiresAt = localStorage.getItem("token_expires_at")

  if (!token || !expiresAt) {
    return false
  }

  // Check if token is expired
  const now = new Date()
  const expiry = new Date(expiresAt)

  if (now > expiry) {
    logout()
    return false
  }

  return true
}

/**
 * Require authentication - redirect to login if not authenticated
 */
function requireAuth(allowedRoles = []) {
  if (!isAuthenticated()) {
    showToast("Please login to continue", "warning")
    setTimeout(() => {
      window.location.href = "index.html"
    }, 1500)
    return false
  }

  // Check role if specified
  if (allowedRoles.length > 0) {
    const user = getCurrentUser()
    if (!user || !allowedRoles.includes(user.role)) {
      showToast("Access denied", "danger")
      setTimeout(() => {
        window.location.href = "index.html"
      }, 1500)
      return false
    }
  }

  return true
}

// ============================================================================
// API CLIENT FUNCTIONS
// ============================================================================

/**
 * Make GET request to API
 */
async function apiGet(path, params = {}) {
  await ensureConfigLoaded()
  const token = getAuthToken()
  const queryParams = new URLSearchParams(params)

  if (token) {
    queryParams.append("token", token)
  }

  queryParams.append("path", path)

  const url = `${CONFIG.API_URL}?${queryParams.toString()}`

  const response = await fetch(url, { method: "GET" })

  const data = await response.json()

  if (response.status === 401) {
    logout()
    throw new Error("Unauthorized")
  }

  return data
}

/**
 * Make POST request to API
 */
async function apiPost(path, body = {}) {
  await ensureConfigLoaded()
  const token = getAuthToken()

  const payload = {
    path,
    ...body,
  }

  if (token) {
    payload.token = token
  }

  const response = await fetch(CONFIG.API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (response.status === 401) {
    logout()
    throw new Error("Unauthorized")
  }

  return data
}

// ============================================================================
// SHIPMENT MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Create new shipment
 */
async function createShipment(shipmentData) {
  try {
    return await apiPost("create-shipment", shipmentData)
  } catch (error) {
    console.error("Create shipment error:", error)
    throw error
  }
}

/**
 * Get user's shipments
 */
async function getMyShipments() {
  try {
    return await apiGet("my-shipments")
  } catch (error) {
    console.error("Get shipments error:", error)
    throw error
  }
}

/**
 * Get driver's assignments
 */
  async function getMyAssignments() {
    try {
      return await apiGet("my-assignments")
    } catch (error) {
      console.error("Get assignments error:", error)
      throw error
    }
  }

  /**
   * Get relay shipments (relay)
   */
  async function getRelayShipments() {
    try {
      return await apiGet("relay-shipments")
    } catch (error) {
      console.error("Get relay shipments error:", error)
      throw error
    }
  }

/**
 * Get shipment details
 */
async function getShipment(shipmentId) {
  try {
    return await apiGet("shipment", { shipment_id: shipmentId })
  } catch (error) {
    console.error("Get shipment error:", error)
    throw error
  }
}

/**
 * Track shipment (public)
 */
async function trackShipment(trackingNumber) {
  try {
    return await apiGet("track", { tracking_number: trackingNumber })
  } catch (error) {
    console.error("Track shipment error:", error)
    throw error
  }
}

/**
 * Assign driver to shipment
 */
async function assignDriver(shipmentId, driverUserId) {
  try {
    return await apiPost("assign-driver", {
      shipment_id: shipmentId,
      driver_user_id: driverUserId,
    })
  } catch (error) {
    console.error("Assign driver error:", error)
    throw error
  }
}

/**
 * Verify pickup QR code
 */
async function verifyPickupQR(qrCode) {
  try {
    const payload =
      qrCode && typeof qrCode === "object" ? qrCode : { qr_code: qrCode }
    return await apiPost("pickup-verify", payload)
  } catch (error) {
    console.error("Verify QR error:", error)
    throw error
  }
}

/**
 * Upload photo
 */
async function uploadPhoto(shipmentId, photoType, photoBase64) {
  try {
    return await apiPost("upload-photo", {
      shipment_id: shipmentId,
      photo_type: photoType,
      photo_base64: photoBase64,
    })
  } catch (error) {
    console.error("Upload photo error:", error)
    throw error
  }
}

/**
 * Validate payment
 */
async function validatePayment(shipmentId, amountPaid) {
  try {
    return await apiPost("validate-payment", {
      shipment_id: shipmentId,
      amount_paid: Number.parseFloat(amountPaid),
    })
  } catch (error) {
    console.error("Validate payment error:", error)
    throw error
  }
}

/**
 * Set shipment status
 */
async function setShipmentStatus(shipmentId, newStatus) {
  try {
    return await apiPost("set-status", {
      shipment_id: shipmentId,
      new_status: newStatus,
    })
  } catch (error) {
    console.error("Set status error:", error)
    throw error
  }
}

/**
 * Mark package inbound at relay
 */
async function relayInbound(trackingNumber, binAssignment) {
  try {
    return await apiPost("relay-inbound", {
      tracking_number: trackingNumber,
      bin_assignment: binAssignment,
    })
  } catch (error) {
    console.error("Relay inbound error:", error)
    throw error
  }
}

/**
 * Release package from relay
 */
async function relayRelease(trackingNumber, releaseType, receiverIdNumber) {
  try {
    return await apiPost("relay-release", {
      tracking_number: trackingNumber,
      release_type: releaseType,
      receiver_id_number: receiverIdNumber,
    })
  } catch (error) {
    console.error("Relay release error:", error)
    throw error
  }
}

/**
 * Upload photo by tracking number (relay)
 */
async function uploadPhotoByTracking(trackingNumber, photoType, photoBase64) {
  try {
    return await apiPost("upload-photo", {
      tracking_number: trackingNumber,
      photo_type: photoType,
      photo_base64: photoBase64,
    })
  } catch (error) {
    console.error("Upload photo by tracking error:", error)
    throw error
  }
}

/**
 * Get departures schedule
 */
async function getDepartures(zone = null) {
  try {
    const params = zone ? { zone } : {}
    return await apiGet("departures", params)
  } catch (error) {
    console.error("Get departures error:", error)
    throw error
  }
}

/**
 * Get overdue pickups (admin)
 */
async function getOverduePickups() {
  try {
    return await apiGet("overdue-pickups")
  } catch (error) {
    console.error("Get overdue pickups error:", error)
    throw error
  }
}

/**
 * Create departure schedule (admin)
 */
async function createDeparture(departureData) {
  try {
    return await apiPost("create-departure", departureData)
  } catch (error) {
    console.error("Create departure error:", error)
    throw error
  }
}

/**
 * Update departure schedule (admin)
 */
async function updateDeparture(departureId, isActive) {
  try {
    return await apiPost("update-departure", {
      departure_id: departureId,
      is_active: isActive,
    })
  } catch (error) {
    console.error("Update departure error:", error)
    throw error
  }
}

/**
 * Change user role (admin)
 */
async function changeUserRole(userId, newRole, reason) {
  try {
    return await apiPost("change-user-role", {
      user_id: userId,
      new_role: newRole,
      reason: reason,
    })
  } catch (error) {
    console.error("Change user role error:", error)
    throw error
  }
}

/**
 * Update settings (admin)
 */
async function updateSettings(settingKey, settingValue) {
  try {
    return await apiPost("update-settings", {
      setting_key: settingKey,
      setting_value: settingValue,
    })
  } catch (error) {
    console.error("Update settings error:", error)
    throw error
  }
}

/**
 * Get settings (admin)
 */
async function getSettings(keys = []) {
  try {
    const params = {}
    if (keys.length > 0) {
      params.keys = keys.join(",")
    }
    return await apiGet("settings", params)
  } catch (error) {
    console.error("Get settings error:", error)
    throw error
  }
}

/**
 * Update shipment notes (admin)
 */
async function updateShipmentNotes(shipmentId, notes) {
  try {
    return await apiPost("update-shipment-notes", {
      shipment_id: shipmentId,
      notes: notes,
    })
  } catch (error) {
    console.error("Update shipment notes error:", error)
    throw error
  }
}

/**
 * Record payment (admin/staff)
 */
async function recordPayment(shipmentId, amountPaid = "") {
  try {
    return await apiPost("record-payment", {
      shipment_id: shipmentId,
      amount_paid: amountPaid,
    })
  } catch (error) {
    console.error("Record payment error:", error)
    throw error
  }
}

/**
 * Claim shipment by tracking number (driver)
 */
async function claimShipmentByTracking(trackingNumber, photoBase64, shipmentId = "") {
  try {
    if (trackingNumber && typeof trackingNumber === "object") {
      return await apiPost("driver-claim", trackingNumber)
    }

    return await apiPost("driver-claim", {
      tracking_number: trackingNumber,
      shipment_id: shipmentId,
      photo_base64: photoBase64,
    })
  } catch (error) {
    console.error("Claim shipment error:", error)
    throw error
  }
}

/**
 * Get users list (admin)
 */
async function getUsers() {
  try {
    return await apiGet("users")
  } catch (error) {
    console.error("Get users error:", error)
    throw error
  }
}

  /**
   * Create user (admin)
   */
  async function createUser(userData) {
    try {
      return await apiPost("create-user", userData)
    } catch (error) {
      console.error("Create user error:", error)
      throw error
    }
  }

  /**
   * Get customers list (admin)
   */
  async function getCustomers(query = "") {
    try {
      const params = query ? { q: query } : {}
      return await apiGet("customers", params)
    } catch (error) {
      console.error("Get customers error:", error)
      throw error
    }
  }

  /**
   * Get customer detail (admin)
   */
  async function getCustomerDetail(idNumber) {
    try {
      return await apiGet("customer", { id_number: idNumber })
    } catch (error) {
      console.error("Get customer detail error:", error)
      throw error
    }
  }

// ============================================================================
// PHOTO CAPTURE HELPERS
// ============================================================================

/**
 * Capture photo from camera or file
 */
async function capturePhoto() {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.capture = "environment" // Use rear camera on mobile

    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) {
        reject(new Error("No file selected"))
        return
      }

      try {
        const base64 = await fileToBase64(file)
        resolve(base64)
      } catch (error) {
        reject(error)
      }
    }

    input.click()
  })
}

/**
 * Convert file to base64
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      resolve(reader.result)
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    reader.readAsDataURL(file)
  })
}

// ============================================================================
// PRICING CALCULATOR
// ============================================================================

/**
 * Calculate shipment price
 */
function calculatePrice(weightKg, pricingTier, hasHomeDelivery = false, overrideRatePerKg = null) {
  // Minimum billing weight
  const billingWeight = Math.max(weightKg, CONFIG.MINIMUM_WEIGHT_KG || 20)
  const minRate = CONFIG.MIN_RATE_PER_KG || 15

  // Rates (these should match backend settings)
    const rates = {
      B2C: 20.0,
      B2B_TIER_1: 15.0,
      B2B_TIER_2: 17.0,
      B2B_TIER_3: 18.5,
    }

  let ratePerKg = rates[pricingTier] || rates["B2C"]
  if (overrideRatePerKg !== null && overrideRatePerKg !== undefined && overrideRatePerKg !== "") {
    const overrideRate = Number(overrideRatePerKg)
    if (Number.isFinite(overrideRate)) {
      ratePerKg = Math.max(overrideRate, minRate)
    }
  }
  let total = billingWeight * ratePerKg

  if (hasHomeDelivery) {
    total += CONFIG.HOME_DELIVERY_FEE || 5
  }

  return {
    billing_weight: billingWeight,
    rate_per_kg: ratePerKg,
    base_cost: billingWeight * ratePerKg,
    home_delivery_fee: hasHomeDelivery ? CONFIG.HOME_DELIVERY_FEE || 5 : 0,
    total: total,
  }
}

// ============================================================================
// DATE & TIME UTILITIES
// ============================================================================

/**
 * Format date to readable string
 */
function formatDate(dateString) {
  if (!dateString) return "N/A"

  const date = new Date(dateString)
  return date.toLocaleDateString() + " " + date.toLocaleTimeString()
}

/**
 * Format date to short string
 */
function formatDateShort(dateString) {
  if (!dateString) return "N/A"

  const date = new Date(dateString)
  return date.toLocaleDateString()
}

/**
 * Calculate time remaining
 */
function getTimeRemaining(targetDate) {
  const now = new Date()
  const target = new Date(targetDate)
  const diff = target - now

  if (diff < 0) {
    return { expired: true, hours: 0, minutes: 0 }
  }

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return { expired: false, hours, minutes }
}

/**
 * Format time remaining
 */
function formatTimeRemaining(targetDate) {
  const remaining = getTimeRemaining(targetDate)

  if (remaining.expired) {
    return "OVERDUE"
  }

  return `${remaining.hours}h ${remaining.minutes}m`
}

// ============================================================================
// FORM VALIDATION UTILITIES
// ============================================================================

/**
 * Validate phone number
 */
function validatePhone(phone) {
  // Simple validation - adjust regex as needed
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  return phoneRegex.test(phone)
}

/**
 * Validate PIN
 */
function validatePIN(pin) {
  // PIN should be 4-6 digits
  const pinRegex = /^\d{4,6}$/
  return pinRegex.test(pin)
}

/**
 * Validate weight
 */
function validateWeight(weight) {
  const w = Number.parseFloat(weight)
  return !isNaN(w) && w > 0
}

/**
 * Validate amount
 */
function validateAmount(amount) {
  const a = Number.parseFloat(amount)
  return !isNaN(a) && a >= 0
}

/**
 * Validate required field
 */
function validateRequired(value) {
  return value && value.toString().trim().length > 0
}

/**
 * Show validation error on field
 */
function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId)
  if (!field) return

  field.classList.add("error")

  // Remove existing error message
  const existingError = field.parentElement.querySelector(".form-error")
  if (existingError) {
    existingError.remove()
  }

  // Add error message
  const errorEl = document.createElement("span")
  errorEl.className = "form-error"
  errorEl.textContent = message
  field.parentElement.appendChild(errorEl)
}

/**
 * Clear validation error on field
 */
function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId)
  if (!field) return

  field.classList.remove("error")

  const errorEl = field.parentElement.querySelector(".form-error")
  if (errorEl) {
    errorEl.remove()
  }
}

/**
 * Clear all validation errors in form
 */
function clearFormErrors(formId) {
  const form = document.getElementById(formId)
  if (!form) return

  const errorFields = form.querySelectorAll(".error")
  errorFields.forEach((field) => field.classList.remove("error"))

  const errorMessages = form.querySelectorAll(".form-error")
  errorMessages.forEach((msg) => msg.remove())
}

// ============================================================================
// STATUS BADGE HELPERS
// ============================================================================

/**
 * Get badge class for status
 */
function getStatusBadgeClass(status) {
  const statusMap = {
    CREATED: "badge-secondary",
    PAID: "badge-success",
    PENDING: "badge-warning",
    DRIVER_ASSIGNED: "badge-info",
    LOADED: "badge-info",
    PICKED_UP: "badge-primary",
    IN_TRANSIT: "badge-primary",
    AT_RELAY_AVAILABLE: "badge-warning",
    DELIVERED: "badge-success",
    RELEASED: "badge-success",
    VOIDED: "badge-danger",
  }

  return statusMap[status] || "badge-secondary"
}

/**
 * Create status badge HTML
 */
function createStatusBadge(status) {
  const badgeClass = getStatusBadgeClass(status)
  return `<span class="badge ${badgeClass}">${status.replace(/_/g, " ")}</span>`
}

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

/**
 * Save data to local storage
 */
function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (error) {
    console.error("LocalStorage save error:", error)
    return false
  }
}

/**
 * Load data from local storage
 */
function loadFromLocalStorage(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : defaultValue
  } catch (error) {
    console.error("LocalStorage load error:", error)
    return defaultValue
  }
}

/**
 * Remove data from local storage
 */
function removeFromLocalStorage(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error("LocalStorage remove error:", error)
    return false
  }
}

// ============================================================================
// EXPORT FOR USE IN OTHER FILES
// ============================================================================

// Make functions available globally
window.ShipTrack = {
  // Auth
  login,
  logout,
  getAuthToken,
  getCurrentUser,
  isAuthenticated,
  requireAuth,

  // API
  apiGet,
  apiPost,

  // Shipments
  createShipment,
    getMyShipments,
    getMyAssignments,
    getRelayShipments,
  getShipment,
  trackShipment,
  assignDriver,
  verifyPickupQR,
  uploadPhoto,
  validatePayment,
  setShipmentStatus,

  // Relay
  relayInbound,
  relayRelease,
  uploadPhotoByTracking,

  // Departures
  getDepartures,
  createDeparture,
  updateDeparture,

  // Admin
  getOverduePickups,
  changeUserRole,
  updateSettings,
  getSettings,
  updateShipmentNotes,
    recordPayment,
    claimShipmentByTracking,
    getUsers,
    createUser,
    getCustomers,
    getCustomerDetail,

  // Photos
  capturePhoto,
  fileToBase64,

  // Pricing
  calculatePrice,

  // Utilities
  formatDate,
  formatDateShort,
  getTimeRemaining,
  formatTimeRemaining,
  validatePhone,
  validatePIN,
  validateWeight,
  validateAmount,
  validateRequired,
  showFieldError,
  clearFieldError,
  clearFormErrors,
  getStatusBadgeClass,
  createStatusBadge,
  saveToLocalStorage,
  loadFromLocalStorage,
  removeFromLocalStorage,
}
