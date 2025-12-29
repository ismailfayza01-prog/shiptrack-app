# ShipTrack MVP - Deployment Guide

## Complete Deployment Instructions

### Prerequisites
- Google Account
- Modern web browser
- Text editor
- Web hosting (optional for frontend) or local file system

---

## Step 1: Google Sheets Database Setup

1. **Create Spreadsheet**
   - Go to https://sheets.google.com
   - Click "Blank" to create new spreadsheet
   - Name it: "ShipTrack MVP Database"
   - Copy Spreadsheet ID from URL: `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`

2. **Create Tabs**
   - Rename first tab to "users"
   - Create 7 more tabs (click + at bottom): sessions, shipments, events, departures, loyalty_tokens, settings, audit

3. **Add Headers and Seed Data**
   - Refer to `docs/GOOGLE_SHEETS_SETUP.md` for exact column headers
   - Copy headers to Row 1 of each tab
   - Add seed data (test users, departures, settings)
   - Format header rows: Bold, background color, freeze row

---

## Step 2: Google Drive Setup

1. **Create Photo Storage Folder**
   - Go to https://drive.google.com
   - Create new folder: "ShipTrack Photos"
   - Open folder and copy Folder ID from URL: `https://drive.google.com/drive/folders/[FOLDER_ID]`

2. **Set Sharing Permissions**
   - Right-click folder → Share
   - Change to "Anyone with the link" → Viewer
   - Copy link

---

## Step 3: Google Apps Script Deployment

1. **Open Script Editor**
   - From your spreadsheet: Extensions → Apps Script
   - Delete any default code

2. **Add Backend Code**
   - Copy entire contents of `backend/Code.gs`
   - Paste into script editor
   - Name project: "ShipTrack Backend"

3. **Set Script Properties**
   - Click Project Settings (gear icon)
   - Scroll to "Script Properties"
   - Add properties:
     - `SPREADSHEET_ID`: Your spreadsheet ID
     - `DRIVE_FOLDER_ID`: Your drive folder ID

4. **Deploy as Web App**
   - Click "Deploy" → "New deployment"
   - Click gear icon → Select "Web app"
   - Configuration:
     - Description: "ShipTrack API v1"
     - Execute as: **Me** (your email)
     - Who has access: **Anyone**
   - Click "Deploy"
   - Authorize access (review permissions carefully)
   - Copy Web App URL: `https://script.google.com/macros/s/[DEPLOYMENT_ID]/exec`

---

## Step 4: Frontend Configuration

1. **Update config.json**
   ```json
   {
     "API_URL": "https://script.google.com/macros/s/[YOUR_DEPLOYMENT_ID]/exec",
     "SPREADSHEET_ID": "[YOUR_SPREADSHEET_ID]",
     "DRIVE_FOLDER_ID": "[YOUR_DRIVE_FOLDER_ID]",
     ...
   }
   ```
   - Place `config.json` alongside the frontend HTML files (recommended: `frontend/config.json`).
   - For local repo testing, the app also falls back to `../config.json`.

2. **Test Configuration**
   - Open `frontend/index.html` in browser
   - Open browser console (F12)
   - Check for config load messages
   - Verify no errors

---

## Step 5: Test the System

### Test Admin Login
1. Open `frontend/admin.html`
2. Login with:
   - Phone: +1234567890
   - PIN: 1234
3. Verify dashboard loads
4. Check overdue pickups section

### Test Staff Portal
1. Open `frontend/staff.html`
2. Login with staff credentials
3. Create test shipment
4. Verify tracking number generated
5. Click "Print Label"

### Test Driver Portal
1. Open `frontend/driver.html`
2. Login with driver credentials
3. Admin: Assign driver to test shipment
4. Driver: Verify assignment appears
5. Test workflow (QR scan can use manual entry)

### Test Public Features
1. Open `frontend/track.html`
2. Enter test tracking number
3. Verify shipment displays
4. Check event timeline

---

## Step 6: Production Deployment

Ensure `config.json` is deployed in the same directory as `index.html` (site root).

### Option A: GitHub Pages (Free)
1. Create GitHub repository
2. Push all frontend files (include `config.json` alongside `index.html`)
3. Enable GitHub Pages in repo settings
4. Access via: `https://yourusername.github.io/shiptrack/`

### Option B: Vercel (Free)
1. Create Vercel account
2. Import repository
3. Deploy
4. Custom domain optional

### Option C: Traditional Web Hosting
1. Upload all `frontend/` files and `config.json` to the site root via FTP
2. Ensure `config.json` is updated
3. Test all pages

---

## Step 7: Security Hardening

### Change Default Credentials
1. Open spreadsheet → users tab
2. For each test user:
   - Change phone numbers
   - Generate new PIN hashes (use online SHA256 tool)
   - Update pin_hash column
3. Document new credentials securely

### Restrict Spreadsheet Access
1. Share spreadsheet only with authorized users
2. Set to "Restricted" (not "Anyone with link")
3. Give specific users Editor access

### Enable 2FA
1. Enable 2-Factor Authentication on Google Account
2. Use App Passwords if needed

---

## Step 8: Monitoring & Maintenance

### Daily Tasks
- Check overdue pickups (Admin Dashboard)
- Review error logs (Apps Script → Executions)
- Monitor Drive storage usage

### Weekly Tasks
- Review audit logs
- Clean expired sessions (>7 days)
- Backup spreadsheet (File → Download → Excel)

### Monthly Tasks
- Archive old shipments (>90 days) to separate sheet
- Review and update pricing in settings
- Check API quota usage

---

## Troubleshooting

### "API_URL not configured"
- Verify `config.json` has correct deployment URL
- Clear browser cache
- Check Apps Script deployment is active

### "Unauthorized" errors
- Check session token not expired
- Try logout and login again
- Verify Apps Script permissions

### Photos not uploading
- Check Drive folder permissions
- Verify `DRIVE_FOLDER_ID` is correct
- Test Drive folder access manually

### QR scanner not working
- Ensure HTTPS (camera requires secure context)
- Grant camera permissions
- Use manual code entry as fallback

---

## Performance Optimization

### Google Sheets
- Keep active data in first 1000 rows
- Archive old data regularly
- Use QUERY formulas sparingly

### Frontend
- Enable browser caching
- Compress images before upload
- Minimize API calls

---

## Backup Strategy

### Automated Backups
1. Install Google Sheets add-on: "Backup Automation"
2. Configure daily backups to Drive
3. Set retention: 30 days

### Manual Backups
1. Weekly: Download spreadsheet as Excel
2. Store in secure location
3. Test restore procedure quarterly

---

## Support & Documentation

### For Users
- Create user guide PDF from README
- Record video tutorials for each role
- Set up support email/form

### For Administrators
- Document custom configurations
- Maintain change log
- Keep deployment credentials secure

---

## Scaling Considerations

### When to Migrate
- \>5000 shipments: Consider real database
- \>100 concurrent users: Upgrade to server
- \>1GB photos: Upgrade Drive storage

### Migration Path
1. Export data from Sheets
2. Set up PostgreSQL/MySQL
3. Migrate to Node.js/Express backend
4. Update frontend API calls

---

## Legal & Compliance

### Data Privacy
- Document what data is collected
- Create privacy policy
- Ensure GDPR/local compliance

### Terms of Service
- Define user responsibilities
- Limit liability
- Service availability disclaimers

---

Your ShipTrack MVP is now fully deployed and operational!
