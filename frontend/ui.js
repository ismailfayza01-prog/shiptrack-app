/**
 * ShipTrack MVP - UI Utilities
 * Toast notifications, loading indicators, modals, etc.
 */

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

/**
 * Show toast notification
 */
function showToast(message, type = "info", duration = 3000) {
  // Create toast container if it doesn't exist
  let container = document.getElementById("toast-container")
  if (!container) {
    container = document.createElement("div")
    container.id = "toast-container"
    container.className = "toast-container"
    document.body.appendChild(container)
  }

  // Create toast element
  const toast = document.createElement("div")
  toast.className = `toast alert-${type}`
  toast.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: inherit; margin-left: 1rem;">&times;</button>
    </div>
  `

  container.appendChild(toast)

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      toast.style.opacity = "0"
      setTimeout(() => toast.remove(), 300)
    }, duration)
  }
}

/**
 * Show success message
 */
function showSuccess(message, duration = 3000) {
  showToast(message, "success", duration)
}

/**
 * Show error message
 */
function showError(message, duration = 5000) {
  showToast(message, "danger", duration)
}

/**
 * Show warning message
 */
function showWarning(message, duration = 4000) {
  showToast(message, "warning", duration)
}

/**
 * Show info message
 */
function showInfo(message, duration = 3000) {
  showToast(message, "info", duration)
}

// ============================================================================
// LOADING INDICATORS
// ============================================================================

/**
 * Show loading overlay
 */
function showLoading(message = "Loading...") {
  // Remove existing overlay if present
  hideLoading()

  const overlay = document.createElement("div")
  overlay.id = "loading-overlay"
  overlay.className = "loading-overlay"
  overlay.innerHTML = `
    <div style="text-align: center;">
      <div class="loading-spinner"></div>
      <p style="margin-top: 1rem; color: var(--gray-700);">${message}</p>
    </div>
  `

  document.body.appendChild(overlay)
}

/**
 * Hide loading overlay
 */
function hideLoading() {
  const overlay = document.getElementById("loading-overlay")
  if (overlay) {
    overlay.remove()
  }
}

/**
 * Show inline loading spinner
 */
function showInlineLoading(elementId) {
  const element = document.getElementById(elementId)
  if (!element) return

  const spinner = document.createElement("div")
  spinner.className = "loading-spinner"
  spinner.style.display = "inline-block"
  spinner.style.width = "1.5rem"
  spinner.style.height = "1.5rem"
  spinner.style.marginLeft = "0.5rem"

  element.appendChild(spinner)
}

/**
 * Hide inline loading spinner
 */
function hideInlineLoading(elementId) {
  const element = document.getElementById(elementId)
  if (!element) return

  const spinner = element.querySelector(".loading-spinner")
  if (spinner) {
    spinner.remove()
  }
}

// ============================================================================
// MODAL DIALOGS
// ============================================================================

/**
 * Show modal dialog
 */
function showModal(title, content, buttons = []) {
  // Remove existing modal if present
  hideModal()

  const overlay = document.createElement("div")
  overlay.id = "modal-overlay"
  overlay.className = "modal-overlay"

  const modal = document.createElement("div")
  modal.className = "modal"

  // Build modal HTML
  let modalHTML = `
    <div class="modal-header">
      <h3 class="modal-title">${title}</h3>
      <button class="modal-close" onclick="hideModal()">&times;</button>
    </div>
    <div class="modal-body">
      ${content}
    </div>
  `

  if (buttons.length > 0) {
    modalHTML += '<div class="modal-footer">'
    buttons.forEach((btn) => {
      const btnClass = btn.class || "btn-secondary"
      const btnClick = btn.onclick || "hideModal()"
      modalHTML += `<button class="btn ${btnClass}" onclick="${btnClick}">${btn.label}</button>`
    })
    modalHTML += "</div>"
  }

  modal.innerHTML = modalHTML
  overlay.appendChild(modal)
  document.body.appendChild(overlay)

  // Close on overlay click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      hideModal()
    }
  })
}

/**
 * Hide modal dialog
 */
function hideModal() {
  const overlay = document.getElementById("modal-overlay")
  if (overlay) {
    overlay.remove()
  }
}

/**
 * Show confirmation dialog
 */
function showConfirm(title, message, onConfirm, onCancel = null) {
  const content = `<p>${message}</p>`
  const buttons = [
    {
      label: "Cancel",
      class: "btn-secondary",
      onclick: onCancel ? `(${onCancel})(); hideModal();` : "hideModal()",
    },
    {
      label: "Confirm",
      class: "btn-primary",
      onclick: `(${onConfirm})(); hideModal();`,
    },
  ]

  showModal(title, content, buttons)
}

/**
 * Show alert dialog
 */
function showAlert(title, message, onClose = null) {
  const content = `<p>${message}</p>`
  const buttons = [
    {
      label: "OK",
      class: "btn-primary",
      onclick: onClose ? `(${onClose})(); hideModal();` : "hideModal()",
    },
  ]

  showModal(title, content, buttons)
}

// ============================================================================
// FORM UTILITIES
// ============================================================================

/**
 * Disable form
 */
function disableForm(formId) {
  const form = document.getElementById(formId)
  if (!form) return

  const inputs = form.querySelectorAll("input, select, textarea, button")
  inputs.forEach((input) => {
    input.disabled = true
  })
}

/**
 * Enable form
 */
function enableForm(formId) {
  const form = document.getElementById(formId)
  if (!form) return

  const inputs = form.querySelectorAll("input, select, textarea, button")
  inputs.forEach((input) => {
    input.disabled = false
  })
}

/**
 * Reset form
 */
function resetForm(formId) {
  const form = document.getElementById(formId)
  if (!form) return

  form.reset()

  // Clear validation errors
  if (window.clearFormErrors) {
    window.clearFormErrors(formId)
  }
}

/**
 * Get form data as object
 */
function getFormData(formId) {
  const form = document.getElementById(formId)
  if (!form) return {}

  const formData = new FormData(form)
  const data = {}

  for (const [key, value] of formData.entries()) {
    // Handle checkboxes
    const field = form.elements[key]
    if (field && field.type === "checkbox") {
      data[key] = field.checked
    } else {
      data[key] = value
    }
  }

  return data
}

/**
 * Set form data from object
 */
function setFormData(formId, data) {
  const form = document.getElementById(formId)
  if (!form) return

  Object.keys(data).forEach((key) => {
    const field = form.elements[key]
    if (field) {
      if (field.type === "checkbox") {
        field.checked = data[key]
      } else {
        field.value = data[key]
      }
    }
  })
}

// ============================================================================
// TABLE UTILITIES
// ============================================================================

/**
 * Create table from data
 */
function createTable(columns, rows, tableClass = "table") {
  let html = `<table class="${tableClass}">`

  // Header
  html += "<thead><tr>"
  columns.forEach((col) => {
    html += `<th>${col.label}</th>`
  })
  html += "</tr></thead>"

  // Body
  html += "<tbody>"
  if (rows.length === 0) {
    html += `<tr><td colspan="${columns.length}" style="text-align: center; color: var(--gray-600);">No data available</td></tr>`
  } else {
    rows.forEach((row) => {
      html += "<tr>"
      columns.forEach((col) => {
        let value = row[col.field]

        // Apply formatter if provided
        if (col.formatter) {
          value = col.formatter(value, row)
        }

        html += `<td>${value !== undefined && value !== null ? value : "-"}</td>`
      })
      html += "</tr>"
    })
  }
  html += "</tbody>"

  html += "</table>"
  return html
}

/**
 * Populate table element with data
 */
function populateTable(tableId, columns, rows) {
  const container = document.getElementById(tableId)
  if (!container) return

  container.innerHTML = createTable(columns, rows)
}

// ============================================================================
// COUNTDOWN TIMER
// ============================================================================

/**
 * Start countdown timer
 */
function startCountdown(elementId, targetDate, onExpire = null) {
  const element = document.getElementById(elementId)
  if (!element) return null

  const getTimeRemainingFn =
    (window.ShipTrack && window.ShipTrack.getTimeRemaining) || window.getTimeRemaining
  const formatTimeRemainingFn =
    (window.ShipTrack && window.ShipTrack.formatTimeRemaining) || window.formatTimeRemaining

  if (!getTimeRemainingFn || !formatTimeRemainingFn) {
    element.textContent = "N/A"
    return null
  }

  const updateTimer = () => {
    const remaining = getTimeRemainingFn(targetDate)

    if (remaining.expired) {
      element.textContent = "EXPIRED"
      element.style.color = "var(--danger)"

      if (onExpire) {
        onExpire()
      }

      return true // Stop interval
    }

    const formatted = formatTimeRemainingFn(targetDate)
    element.textContent = formatted

    // Color based on urgency
    if (remaining.hours < 2) {
      element.style.color = "var(--danger)"
    } else if (remaining.hours < 6) {
      element.style.color = "var(--warning)"
    } else {
      element.style.color = "var(--success)"
    }

    return false
  }

  // Initial update
  if (updateTimer()) {
    return null
  }

  // Update every minute
  const intervalId = setInterval(() => {
    if (updateTimer()) {
      clearInterval(intervalId)
    }
  }, 60000)

  return intervalId
}

/**
 * Stop countdown timer
 */
function stopCountdown(intervalId) {
  if (intervalId) {
    clearInterval(intervalId)
  }
}

// ============================================================================
// COPY TO CLIPBOARD
// ============================================================================

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    showSuccess("Copied to clipboard")
    return true
  } catch (error) {
    console.error("Copy to clipboard error:", error)
    showError("Failed to copy")
    return false
  }
}

// ============================================================================
// SKELETON LOADING
// ============================================================================

/**
 * Show skeleton loading in element
 */
function showSkeleton(elementId, lines = 3) {
  const element = document.getElementById(elementId)
  if (!element) return

  let html = ""
  for (let i = 0; i < lines; i++) {
    const width = 60 + Math.random() * 40 // Random width between 60-100%
    html += `<div class="skeleton" style="height: 1rem; width: ${width}%; margin-bottom: 0.5rem;"></div>`
  }

  element.innerHTML = html
}

/**
 * Hide skeleton loading
 */
function hideSkeleton(elementId) {
  const element = document.getElementById(elementId)
  if (!element) return

  const skeletons = element.querySelectorAll(".skeleton")
  skeletons.forEach((sk) => sk.remove())
}

// ============================================================================
// USER DISPLAY
// ============================================================================

/**
 * Display current user info in navbar
 */
function displayUserInfo(containerId = "user-info") {
  const container = document.getElementById(containerId)
  if (!container) return

  const getCurrentUserFn =
    (window.ShipTrack && window.ShipTrack.getCurrentUser) || window.getCurrentUser
  const user = getCurrentUserFn ? getCurrentUserFn() : null
  if (!user) {
    container.innerHTML = '<a href="index.html" class="btn btn-primary">Login</a>'
    return
  }

  container.innerHTML = `
    <div style="display: flex; align-items: center; gap: 1rem;">
      <div style="text-align: right;">
        <div style="font-weight: 500;">${user.full_name}</div>
        <div style="font-size: 0.875rem; color: var(--gray-600);">${user.role}</div>
      </div>
      <button onclick="logout()" class="btn btn-sm btn-outline">Logout</button>
    </div>
  `
}

// ============================================================================
// EXPORT FOR USE IN OTHER FILES
// ============================================================================

// Make functions available globally
window.showToast = showToast
window.showSuccess = showSuccess
window.showError = showError
window.showWarning = showWarning
window.showInfo = showInfo
window.showLoading = showLoading
window.hideLoading = hideLoading
window.showInlineLoading = showInlineLoading
window.hideInlineLoading = hideInlineLoading
window.showModal = showModal
window.hideModal = hideModal
window.showConfirm = showConfirm
window.showAlert = showAlert
window.disableForm = disableForm
window.enableForm = enableForm
window.resetForm = resetForm
window.getFormData = getFormData
window.setFormData = setFormData
window.createTable = createTable
window.populateTable = populateTable
window.startCountdown = startCountdown
window.stopCountdown = stopCountdown
window.copyToClipboard = copyToClipboard
window.showSkeleton = showSkeleton
window.hideSkeleton = hideSkeleton
window.displayUserInfo = displayUserInfo

if (!window.clearFormErrors && window.ShipTrack && window.ShipTrack.clearFormErrors) {
  window.clearFormErrors = window.ShipTrack.clearFormErrors
}

if (!window.getTimeRemaining && window.ShipTrack && window.ShipTrack.getTimeRemaining) {
  window.getTimeRemaining = window.ShipTrack.getTimeRemaining
}

if (!window.formatTimeRemaining && window.ShipTrack && window.ShipTrack.formatTimeRemaining) {
  window.formatTimeRemaining = window.ShipTrack.formatTimeRemaining
}

if (!window.getCurrentUser && window.ShipTrack && window.ShipTrack.getCurrentUser) {
  window.getCurrentUser = window.ShipTrack.getCurrentUser
}
