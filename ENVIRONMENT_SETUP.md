# Environment Setup Guide

## Simple Environment Configuration

This project uses a **single `.env` file** approach for simplicity and security.

### Quick Setup

1. **Backend Environment:**
   ```bash
   cd dashboard_backend
   cp .env.template .env
   # Edit .env with your actual values
   ```

2. **Frontend Environment:**
   ```bash
   cd dashboard_frontend
   cp .env.template .env
   # Edit .env with your actual values
   ```

### Environment Variables Explained

#### Backend (.env)
- `NODE_ENV` - Set to `development` for local, `production` for server
- `PORT` - Backend server port (default: 5000)
- `HOST` - Server host (`localhost` for local, `0.0.0.0` for server)
- `DB_*` - Database connection details
- `JWT_SECRET` - Secure random string for JWT tokens
- `CORS_ORIGIN` - Frontend URL for CORS (e.g., `http://localhost:3001`)

#### Frontend (.env)
- `PORT` - Frontend dev server port (default: 3001)
- `HOST` - Dev server host (`localhost` for local, `0.0.0.0` for server)
- `BROWSER` - Browser behavior (`default` for local, `none` for server)
- `REACT_APP_API_URL` - Backend API URL (e.g., `http://localhost:5000`)

### Security Notes

- ✅ `.env` files are ignored by Git (never committed)
- ✅ Template files provide safe examples
- ✅ Single file approach prevents confusion
- ⚠️ Always use strong passwords and secrets
- ⚠️ Change default credentials immediately

### Local Development Example

**Backend .env:**
```
NODE_ENV=development
PORT=5000
HOST=localhost
DB_HOST=localhost
DB_NAME=bc_dashboard
DB_USER=your_user
DB_PASSWORD=your_password
JWT_SECRET=your_long_secure_random_string_here
CORS_ORIGIN=http://localhost:3001
```

**Frontend .env:**
```
PORT=3001
HOST=localhost
BROWSER=default
REACT_APP_API_URL=http://localhost:5000
```

### Production Deployment Example

**Backend .env:**
```
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DB_HOST=your_server_ip
DB_NAME=your_prod_db
DB_USER=your_prod_user
DB_PASSWORD=your_secure_prod_password
JWT_SECRET=your_very_long_secure_random_string_here
CORS_ORIGIN=http://your_server_ip:3001
```

**Frontend .env:**
```
PORT=3001
HOST=0.0.0.0
BROWSER=none
REACT_APP_API_URL=http://your_server_ip:5000
```
