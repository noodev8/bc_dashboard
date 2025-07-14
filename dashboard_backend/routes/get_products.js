/*
=======================================================================================================================================
API Route: get_products
=======================================================================================================================================
Method: POST
Purpose: Retrieves SHP channel products from the groupid_performance table ordered by annual_profit in descending order.
         This endpoint provides the main data for the products dashboard display, filtered to show only Shopify (SHP) products.
         Supports optional seasonal filtering to show only summer or winter products.
=======================================================================================================================================
Request Payload:
{
  "season_filter": "summer" | "winter"    // optional, filters products by season from skusummary table
}

Success Response:
{
  "return_code": "SUCCESS",
  "products": [
    {
      "groupid": "ABC123",                    // string, product group identifier
      "channel": "SHP",                       // string, sales channel (SHP, AMZ, etc.)
      "annual_profit": 1250.75,              // numeric, annual profit amount
      "sold_qty": 45,                        // integer, quantity sold
      "avg_profit_per_unit": 27.79,          // numeric, average profit per unit
      "segment": "Winner",                   // string, product segment classification
      "notes": "High performing product",    // string, additional notes
      "owner": "John Doe",                   // string, product owner/manager
      "brand": "Nike",                       // string, product brand
      "next_review_date": "2024-08-15",      // date, next review date
      "review_date": "2024-07-15",           // date, last review date
      "avg_gross_margin": 0.2500             // numeric, average gross margin percentage
    }
    // ... more products
  ],
  "total_count": 150                         // integer, total number of products returned
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

// POST /get_products
router.post('/', async (req, res) => {
    try {
        console.log('GET_PRODUCTS: Starting product retrieval...');

        // Get season filter from request body (optional)
        const seasonFilter = req.body.season_filter;
        console.log(`GET_PRODUCTS: Season filter: ${seasonFilter || 'none'}`);

        // Build SQL query with optional season filtering
        let query = `
            SELECT gp.*
            FROM groupid_performance gp
        `;

        // Add join with skusummary if season filter is provided
        if (seasonFilter) {
            query += `
            LEFT JOIN skusummary ss ON gp.groupid = ss.groupid
            `;
        }

        query += `
            WHERE gp.channel = 'SHP'
        `;

        // Add season filter condition if provided
        if (seasonFilter) {
            query += ` AND ss.season = $1`;
        }

        query += `
            ORDER BY gp.annual_profit DESC NULLS LAST
        `;

        console.log('GET_PRODUCTS: Executing database query...');

        // Execute the query with or without season parameter
        const result = seasonFilter ?
            await db.query(query, [seasonFilter]) :
            await db.query(query);
        
        console.log(`GET_PRODUCTS: Query successful. Retrieved ${result.rows.length} products`);
        
        // Format the response data
        const products = result.rows.map(row => ({
            groupid: row.groupid,
            channel: row.channel,
            annual_profit: row.annual_profit ? parseFloat(row.annual_profit) : 0,
            sold_qty: row.sold_qty || 0,
            avg_profit_per_unit: row.avg_profit_per_unit ? parseFloat(row.avg_profit_per_unit) : 0,
            segment: row.segment || '',
            notes: row.notes || '',
            owner: row.owner || '',
            brand: row.brand || '',
            next_review_date: row.next_review_date,
            review_date: row.review_date,
            avg_gross_margin: row.avg_gross_margin ? parseFloat(row.avg_gross_margin) : 0
        }));
        
        // Return successful response
        res.json({
            return_code: "SUCCESS",
            products: products,
            total_count: products.length
        });
        
        console.log('GET_PRODUCTS: Response sent successfully');
        
    } catch (error) {
        console.error('GET_PRODUCTS: Database error:', error);
        
        // Return error response
        res.status(500).json({
            return_code: "DATABASE_ERROR",
            message: "Failed to retrieve products from database",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
