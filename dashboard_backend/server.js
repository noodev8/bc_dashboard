/*
=======================================================================================================================================
BC DASHBOARD BACKEND SERVER
=======================================================================================================================================
Main server file for the BC dashboard application
Sets up Express server with CORS, JWT authentication middleware, and route handlers
Connects to PostgreSQL database and provides API endpoints for the BC dashboard frontend
=======================================================================================================================================
*/

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

// Middleware setup
// CORS configuration - allow requests from frontend
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            return_code: "UNAUTHORIZED",
            message: "Access token required" 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                return_code: "FORBIDDEN",
                message: "Invalid or expired token" 
            });
        }
        req.user = user;
        next();
    });
};

// Import route handlers
const get_products = require("./routes/get_products");
const get_owners = require("./routes/get_owners");
const get_products_comparison = require("./routes/get_products_comparison");
const get_product_details = require("./routes/get_product_details");

// Route definitions
// All routes use POST method as per project requirements
app.use("/get_products", get_products);
app.use("/get_owners", get_owners);
app.use("/get_products_comparison", get_products_comparison);
app.use("/get_product_details", get_product_details);

// Health check endpoint
app.post('/health', (req, res) => {
    res.json({ 
        return_code: "SUCCESS",
        message: "Server is running",
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        return_code: "SERVER_ERROR",
        message: "Internal server error" 
    });
});

// Handle 404 for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({ 
        return_code: "NOT_FOUND",
        message: "Route not found" 
    });
});

// Start server
app.listen(PORT, HOST, () => {
    console.log(`BC Dashboard backend server running on ${HOST}:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Server accessible at: http://${HOST}:${PORT}`);
});

module.exports = app;
