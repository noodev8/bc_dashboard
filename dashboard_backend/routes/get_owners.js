/*
=======================================================================================================================================
API Route: get_owners
=======================================================================================================================================
Method: POST
Purpose: Retrieves a list of unique product owners from the groupid_performance table (SHP channel only).
         This endpoint provides data for the owner filter dropdown in the products dashboard.
=======================================================================================================================================
Request Payload:
{
  // No specific payload required - endpoint returns all unique owners
}

Success Response:
{
  "return_code": "SUCCESS",
  "owners": [
    "Andreas",
    "Summer", 
    "John Doe",
    // ... more owners
  ],
  "total_count": 5                         // integer, total number of unique owners
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"SERVER_ERROR"
"DATABASE_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /get_owners
router.post('/', async (req, res) => {
    try {
        console.log('GET_OWNERS: Starting owners retrieval...');
        
        // SQL query to get unique owners from SHP channel products
        const query = `
            SELECT DISTINCT owner
            FROM groupid_performance 
            WHERE channel = 'SHP' 
              AND owner IS NOT NULL 
              AND owner != ''
            ORDER BY owner ASC
        `;
        
        console.log('GET_OWNERS: Executing database query...');
        
        // Execute the query
        const result = await db.query(query);
        
        console.log(`GET_OWNERS: Query successful. Retrieved ${result.rows.length} unique owners`);
        
        // Extract owner names from the result
        const owners = result.rows.map(row => row.owner);
        
        // Return successful response
        res.json({
            return_code: "SUCCESS",
            owners: owners,
            total_count: owners.length
        });
        
        console.log('GET_OWNERS: Response sent successfully');
        
    } catch (error) {
        console.error('GET_OWNERS: Database error:', error);
        
        // Return error response
        res.status(500).json({
            return_code: "DATABASE_ERROR",
            message: "Failed to retrieve owners from database",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
