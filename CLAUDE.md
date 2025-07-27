# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BC Dashboard is a full-stack web application for managing and analyzing BC product data. The application consists of:

- **Backend**: Express.js API server with PostgreSQL database (`dashboard_backend/`)
- **Frontend**: React application with routing and API integration (`dashboard_frontend/`)
- **Database**: PostgreSQL schema and migrations (`dashboard_library/`)

## Development Commands

### Backend (dashboard_backend/)
```bash
npm install          # Install dependencies
npm start            # Production server (node server.js)
npm run dev          # Development server with nodemon
```

### Frontend (dashboard_frontend/)
```bash
npm install          # Install dependencies
npm start            # Development server (port 3001)
npm run build        # Production build
npm test             # Run tests
```

## Architecture

### Backend Structure
- `server.js`: Main Express server with CORS, JWT middleware, and route setup
- `routes/`: API endpoint handlers for products, brands, owners, comparisons, and details
- `db.js`: Database connection and query utilities
- All API endpoints use POST method and return standardized JSON responses with `return_code` field

### Frontend Structure
- `src/App.js`: Main router component with React Router setup
- `src/screens/`: Page components (products_screen, product_details_screen)
- `src/components/`: Reusable UI components (OverallStats)
- `src/api/`: API service modules for backend communication
- Uses React 18 with functional components and hooks

### API Communication
- Backend serves on port 5000, frontend on port 3001
- All API calls use POST method with JSON payloads
- API responses follow consistent format with `return_code` field
- CORS configured to allow cross-origin requests between frontend and backend

## Environment Configuration

The project uses `.env` files for configuration:

### Backend Environment Variables
- `NODE_ENV`: development/production
- `PORT`: Server port (default: 5000)
- `HOST`: Server host (localhost for dev, 0.0.0.0 for production)
- `DB_*`: PostgreSQL connection details
- `JWT_SECRET`: JWT token signing secret
- `CORS_ORIGIN`: Frontend URL for CORS

### Frontend Environment Variables
- `PORT`: Dev server port (default: 3001)
- `HOST`: Dev server host
- `BROWSER`: Browser behavior (default/none)
- `REACT_APP_API_URL`: Backend API base URL

## Database

- PostgreSQL database with schema defined in `dashboard_library/schema.sql`
- Large schema file (7MB+) containing product, brand, and owner data structures
- Database connection handled through `pg` library in backend

## Deployment

- VPS deployment guide available in `VPS_DEPLOYMENT_GUIDE.md`
- Environment setup instructions in `ENVIRONMENT_SETUP.md`
- Supports both local development and production deployment configurations
- Uses PM2 for process management in production

## Development Notes

- No test framework currently configured in backend (test script returns error)
- Frontend uses Create React App with standard testing setup
- All routes in backend use POST method by design
- JWT authentication middleware available but routes may not all require it
- Postman collection available for API testing (`postman_collection.json`)