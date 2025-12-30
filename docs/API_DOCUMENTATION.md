# ShipTrack MVP - API Documentation

## Base URL
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

## Authentication
Most endpoints require authentication via session token. Include token in request body or query parameter.

### Headers
```
Content-Type: application/json
```

---

## Public Endpoints

### Health Check
Check API status.

**Endpoint:** `GET /?path=health`

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

---

### Track Shipment
Track shipment by tracking number (public).

**Endpoint:** `GET /?path=track&tracking_number={number}`

**Parameters:**
- `tracking_number` (string, required): Tracking number

**Response:**
```json
{
  "success": true,
  "shipment": {
    "tracking_number": "ST-2024-123456",
    "tracking_code": "ST-2024-123456",
    "status": "RECEIVED",
    "destination_zone": "Zone 1",
    "destination_city": "New York",
    "created_at": "2024-01-01T00:00:00.000Z",
    "received_at": "2024-01-01T10:00:00.000Z",
    "service_level": "STANDARD",
    "expected_delivery_at": "2024-01-08T10:00:00.000Z",
    "worst_case_delivery_at": "2024-01-10T10:00:00.000Z",
    "final_price": 170.0
  },
  "events": [
    {
      "event_type": "SHIPMENT_CREATED",
      "event_timestamp": "2024-01-01T00:00:00.000Z",
      "notes": "Shipment created"
    }
  ]
}
```

---

## Authentication Endpoints

### Login
Authenticate user with phone and PIN.

**Endpoint:** `POST /`

**Request Body:**
```json
{
  "path": "login",
  "phone": "+1234567890",
  "pin": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "token": "base64_encoded_token",
  "user": {
    "user_id": 1,
    "full_name": "Admin User",
    "phone": "+1234567890",
    "role": "ADMIN"
  },
  "expires_at": "2024-01-02T00:00:00.000Z"
}
```

---

## User Endpoints

### Get Current User
Get authenticated user information.

**Endpoint:** `GET /?path=me&token={token}`

**Response:**
```json
{
  "success": true,
  "user": {
    "user_id": 1,
    "full_name": "Admin User",
    "phone": "+1234567890",
    "role": "ADMIN"
  }
}
```

---

## Shipment Endpoints

### Create Shipment
Create new shipment (STAFF, ADMIN).

**Endpoint:** `POST /`

**Request Body:**
```json
{
  "path": "create-shipment",
  "token": "auth_token",
  "customer_name": "John Doe",
  "customer_phone": "+1234567899",
  "destination_zone": "Zone 1",
  "destination_city": "New York",
  "weight_kg": 25.5,
  "pricing_tier": "B2C",
  "service_level": "STANDARD",
  "has_home_delivery": false,
  "loyalty_token_id": null
}
```

**Response:**
```json
{
  "success": true,
  "shipment": {
    "shipment_id": 12345,
    "tracking_number": "ST-2024-123456",
    "tracking_code": "ST-2024-123456",
    "pickup_code": "123456",
    "amount_due": 51.0,
    "base_price": 51.0,
    "final_price": 51.0,
    "service_level": "STANDARD",
    "pickup_deadline_at": "2024-01-03T00:00:00.000Z"
  }
}
```

---

### Get My Shipments
Get user's own shipments (STAFF, ADMIN).

**Endpoint:** `GET /?path=my-shipments&token={token}`

**Response:**
```json
{
  "success": true,
  "shipments": [
    {
      "shipment_id": 12345,
      "tracking_number": "ST-2024-123456",
      "customer_name": "John Doe",
      "destination_zone": "Zone 1",
      "destination_city": "New York",
      "status": "CREATED",
      "created_at": "2024-01-01T00:00:00.000Z",
      "amount_due": 51.0
    }
  ]
}
```

---

### Get Shipment Details
Get detailed shipment information.

**Endpoint:** `GET /?path=shipment&shipment_id={id}&token={token}`

**Response:**
```json
{
  "success": true,
  "shipment": {
    "shipment_id": 12345,
    "tracking_number": "ST-2024-123456",
    "pickup_code6": "123456",
    "customer_name": "John Doe",
    "customer_phone": "+1234567899",
    "destination_zone": "Zone 1",
    "destination_city": "New York",
    "weight_kg": 25.5,
    "amount_due": 51.0,
    "status": "RECEIVED"
  }
}
```

---

## Driver Endpoints

### Get My Assignments
Get driver's assigned shipments (DRIVER).

**Endpoint:** `GET /?path=my-assignments&token={token}`

**Response:**
```json
{
  "success": true,
  "shipments": [
    {
      "shipment_id": 12345,
      "tracking_number": "ST-2024-123456",
      "pickup_code6": "123456",
      "customer_name": "John Doe",
      "customer_phone": "+1234567899",
      "status": "RECEIVED",
      "amount_due": 51.0,
      "pickup_deadline_at": "2024-01-03T00:00:00.000Z",
      "sla_remaining_ms": 172800000,
      "is_overdue": false
    }
  ]
}
```

---

### Verify Pickup QR Code
Verify QR code and validate driver assignment (DRIVER).

**Endpoint:** `POST /`

**Request Body:**
```json
{
  "path": "pickup-verify",
  "token": "auth_token",
  "qr_code": "AP|12345|123456"
}
```

**Response:**
```json
{
  "success": true,
  "shipment": {
    "shipment_id": 12345,
    "tracking_number": "ST-2024-123456",
    "customer_name": "John Doe",
    "amount_due": 51.0
  }
}
```

---

### Upload Photo
Upload ID or package photo (DRIVER).

**Endpoint:** `POST /`

**Request Body:**
```json
{
  "path": "upload-photo",
  "token": "auth_token",
  "shipment_id": 12345,
  "photo_type": "id",
  "photo_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Parameters:**
- `photo_type`: Either "id" or "package"
- `photo_base64`: Base64 encoded image data

**Response:**
```json
{
  "success": true,
  "photo_url": "https://drive.google.com/file/d/..."
}
```

---

### Validate Payment
Validate payment amount (DRIVER).

**Endpoint:** `POST /`

**Request Body:**
```json
{
  "path": "validate-payment",
  "token": "auth_token",
  "shipment_id": 12345,
  "amount_paid": 51.0
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Payment validated successfully"
}
```

**Response (Mismatch):**
```json
{
  "success": false,
  "error": "Payment amount must match exactly",
  "amount_due": 51.0,
  "amount_paid": 50.0
}
```

---

### Set Status
Update shipment status (DRIVER, RELAY, ADMIN).

**Endpoint:** `POST /`

**Request Body:**
```json
{
  "path": "set-status",
  "token": "auth_token",
  "shipment_id": 12345,
  "new_status": "RECEIVED"
}
```

**Valid Status Values:**
- CREATED
- RECEIVED
- DELIVERED
- CANCELLED

**Response:**
```json
{
  "success": true,
  "message": "Status updated successfully"
}
```

---

## Relay Endpoints

### Mark Inbound
Mark package received at relay (RELAY, ADMIN).

**Endpoint:** `POST /`

**Request Body:**
```json
{
  "path": "relay-inbound",
  "token": "auth_token",
  "tracking_number": "ST-2024-123456",
  "bin_assignment": "A-12"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Package marked as available at relay"
}
```

---

### Release Package
Release package to customer (RELAY, ADMIN).

**Endpoint:** `POST /`

**Request Body:**
```json
{
  "path": "relay-release",
  "token": "auth_token",
  "tracking_number": "ST-2024-123456",
  "release_type": "DELIVERED"
}
```

**Parameters:**
- `release_type`: Either "DELIVERED" or "RELEASED" (both are stored as DELIVERED)

**Response:**
```json
{
  "success": true,
  "message": "Package released successfully"
}
```

---

## Admin Endpoints

### Get Overdue Pickups
Get list of overdue pickups (ADMIN).

**Endpoint:** `GET /?path=overdue-pickups&token={token}`

**Response:**
```json
{
  "success": true,
  "overdue_shipments": [
    {
      "shipment_id": 12345,
      "tracking_number": "ST-2024-123456",
      "customer_name": "John Doe",
      "assigned_driver_user_id": 3,
      "status": "RECEIVED",
      "pickup_deadline_at": "2024-01-03T00:00:00.000Z",
      "hours_overdue": 12.5
    }
  ],
  "count": 1
}
```

---

### Assign Driver
Assign or reassign driver to shipment (ADMIN).

**Endpoint:** `POST /`

**Request Body:**
```json
{
  "path": "assign-driver",
  "token": "auth_token",
  "shipment_id": 12345,
  "driver_user_id": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Driver assigned successfully"
}
```

---

### Update Service Level
Update shipment service level and recompute ETA/pricing (ADMIN).

**Endpoint:** `POST /`

**Request Body:**
```json
{
  "path": "update-service-level",
  "token": "auth_token",
  "shipment_id": 12345,
  "service_level": "EXPRESS"
}
```

**Response:**
```json
{
  "success": true,
  "service_level": "EXPRESS",
  "final_price": 170.0,
  "expected_delivery_at": "2024-01-07T00:00:00.000Z",
  "worst_case_delivery_at": ""
}
```

---

### Change User Role
Change user role with audit trail (ADMIN).

**Endpoint:** `POST /`

**Request Body:**
```json
{
  "path": "change-user-role",
  "token": "auth_token",
  "user_id": 5,
  "new_role": "DRIVER",
  "reason": "Promotion to driver position"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User role updated successfully"
}
```

---

### Update Settings
Update application settings (ADMIN).

**Endpoint:** `POST /`

**Request Body:**
```json
{
  "path": "update-settings",
  "token": "auth_token",
  "setting_key": "b2c_rate_per_kg",
  "setting_value": "2.50"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Setting updated successfully"
}
```

---

## Error Responses

All errors return appropriate HTTP status codes with error messages:

### 400 Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "error": "Shipment not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error message"
}
```

---

## Rate Limits

Google Apps Script has the following quotas:
- URL Fetch calls per day: 20,000 (consumer), 100,000 (Google Workspace)
- Script runtime: 6 minutes per execution

## Best Practices

1. **Token Management**: Store token securely in localStorage
2. **Error Handling**: Always handle error responses
3. **Timeouts**: Set reasonable timeouts for requests
4. **Retries**: Implement retry logic for transient failures
5. **Validation**: Validate data client-side before sending

## Security Notes

1. Tokens expire after 24 hours
2. All sensitive endpoints require authentication
3. Role-based authorization enforced server-side
4. PIN never transmitted or stored in plain text
5. Last ADMIN protection prevents system lockout
