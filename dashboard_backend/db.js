/*
=======================================================================================================================================
DATABASE CONNECTION MODULE
=======================================================================================================================================
PostgreSQL database connection configuration and utilities
Provides connection pool and query execution functions for the dashboard application
Uses environment variables for database credentials and connection settings
=======================================================================================================================================
*/

const { Pool } = require('pg');
require('dotenv').config();

// Database connection configuration
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    
    // Connection pool settings
    max: 20,                    // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,   // How long a client is allowed to remain idle
    connectionTimeoutMillis: 2000, // How long to wait for a connection
});

// Test database connection on startup
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to PostgreSQL database:', err.stack);
        process.exit(1);
    } else {
        console.log('Successfully connected to PostgreSQL database');
        console.log(`Database: ${process.env.DB_NAME}`);
        console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT || 5432}`);
        release();
    }
});

// Query execution function with error handling
const query = async (text, params) => {
    const start = Date.now();
    
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        
        // Log query execution time for performance monitoring
        console.log(`Query executed in ${duration}ms`);
        console.log(`Rows returned: ${result.rows.length}`);
        
        return result;
    } catch (error) {
        console.error('Database query error:', error);
        console.error('Query:', text);
        console.error('Parameters:', params);
        throw error;
    }
};

// Get a client from the pool for transactions
const getClient = async () => {
    try {
        const client = await pool.connect();
        return client;
    } catch (error) {
        console.error('Error getting database client:', error);
        throw error;
    }
};

// Graceful shutdown function
const closePool = async () => {
    try {
        await pool.end();
        console.log('Database connection pool closed');
    } catch (error) {
        console.error('Error closing database pool:', error);
    }
};

// Handle process termination
process.on('SIGINT', async () => {
    console.log('Received SIGINT, closing database connections...');
    await closePool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, closing database connections...');
    await closePool();
    process.exit(0);
});

module.exports = {
    query,
    getClient,
    pool,
    closePool
};
