# VPS Deployment Guide for BC Dashboard Application

## Overview
This guide will help you deploy your BC dashboard application on your VPS server at `217.154.35.5` so you can access it from any browser.

## Prerequisites
- VPS server with Node.js installed
- PostgreSQL database accessible
- SSH access to your VPS
- Git installed on VPS (for code deployment)

## Configuration Changes Made

### Backend Changes
1. **Updated server.js** to bind to all interfaces (0.0.0.0)
2. **Added CORS configuration** to allow frontend requests
3. **Created production environment file** (`.env.production`)

### Frontend Changes
1. **Created production environment file** (`.env.production`)
2. **Removed proxy configuration** from package.json
3. **API calls already configured** to use environment variables

## Deployment Steps

### 1. Upload Code to VPS
```bash
# Option A: Using Git (recommended)
git clone <your-repository-url>
cd bc_dashboard

# Option B: Upload files via SCP/SFTP
# Upload the entire bc_dashboard folder to your VPS
```

### 2. Install Dependencies

#### Backend Setup
```bash
cd dashboard_backend
npm install
```

#### Frontend Setup
```bash
cd ../dashboard_frontend
npm install
```

### 3. Environment Configuration

⚠️ **SECURITY NOTE**: Environment files with credentials are not included in the repository for security reasons.

#### Backend Production Environment
1. **Copy the template file:**
   ```bash
   cp dashboard_backend/.env.production.template dashboard_backend/.env.production
   ```

2. **Edit `.env.production`** with your actual values:
   - Server binds to 0.0.0.0:5000
   - CORS allows requests from your frontend URL
   - Database credentials (use secure passwords)
   - JWT secret (generate a secure random string)

#### Frontend Production Environment
1. **Copy the template file:**
   ```bash
   cp dashboard_frontend/.env.production.template dashboard_frontend/.env.production
   ```

2. **Edit `.env.production`** with your actual values:
   - Run on port 3001
   - Bind to all interfaces (0.0.0.0)
   - API calls point to your backend server

### 4. Start the Applications

#### Start Backend (Production Mode)
```bash
cd dashboard_backend
NODE_ENV=production node server.js
```

#### Start Frontend (Production Mode)
```bash
cd dashboard_frontend
NODE_ENV=production npm start
```

### 5. Access Your Dashboard
Once both services are running:
- **Frontend**: http://217.154.35.5:3001
- **Backend API**: http://217.154.35.5:5000

## Firewall Configuration
Make sure your VPS firewall allows traffic on ports 3001 and 5000:

```bash
# Ubuntu/Debian with ufw
sudo ufw allow 3001
sudo ufw allow 5000

# CentOS/RHEL with firewalld
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload
```

## Process Management (Optional)
For production, consider using PM2 to manage your processes:

```bash
# Install PM2 globally
npm install -g pm2

# Start backend with PM2
cd dashboard_backend
pm2 start server.js --name "bc-dashboard-backend" --env production

# Start frontend with PM2
cd ../dashboard_frontend
pm2 start npm --name "bc-dashboard-frontend" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

## Troubleshooting

### Common Issues
1. **Connection refused**: Check if services are running and ports are open
2. **CORS errors**: Verify CORS_ORIGIN in backend .env.production
3. **API errors**: Check if backend is accessible from frontend

### Logs
- Backend logs: Check console output or PM2 logs
- Frontend logs: Check browser developer console

### Testing
Test the backend API directly:
```bash
curl -X POST http://217.154.35.5:5000/health
```

## Security Notes
- Consider using HTTPS in production
- Update JWT_SECRET in production environment
- Restrict database access to necessary IPs only
- Consider using a reverse proxy (nginx) for better security
