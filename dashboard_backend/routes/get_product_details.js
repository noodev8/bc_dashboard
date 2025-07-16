/*
=======================================================================================================================================
API Route: get_product_details
=======================================================================================================================================
Method: POST
Purpose: Retrieves detailed information for a specific product by groupid, including current performance data,
         historical weekly performance data, and SKU summary information.
=======================================================================================================================================
Request Payload:
{
  "groupid": "ABC123"                              // Required: Product group identifier
}

Success Response:
{
  "return_code": "SUCCESS",
  "product": {
    "groupid": "ABC123",
    "channel": "SHP",
    "annual_profit": 1250.75,
    "sold_qty": 45,
    "avg_profit_per_unit": 27.79,
    "segment": "Winner",
    "notes": "High performing product",
    "owner": "John Doe",
    "brand": "Nike",
    "next_review_date": "2024-08-15",
    "review_date": "2024-07-15",
    "avg_gross_margin": 0.2500,
    "sku_details": {
      "season": "Summer",
      "additional_info": "..."
    },
    "weekly_performance": [
      {
        "year_week": "2025-W27",
        "annual_profit": 1250.75,
        "sold_qty": 45,
        "avg_profit_per_unit": 27.79
      },
      {
        "year_week": "2025-W26",
        "annual_profit": 1180.50,
        "sold_qty": 42,
        "avg_profit_per_unit": 28.10
      }
      // ... more weekly data
    ]
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"PRODUCT_NOT_FOUND"
"MISSING_GROUPID"
"SERVER_ERROR"
"DATABASE_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /get_product_details
router.post('/', async (req, res) => {
    try {
        console.log('GET_PRODUCT_DETAILS: Starting product details retrieval...');

        // Validate required groupid parameter
        const { groupid } = req.body;
        if (!groupid) {
            console.log('GET_PRODUCT_DETAILS: Missing groupid parameter');
            return res.status(400).json({
                return_code: "MISSING_GROUPID",
                message: "groupid parameter is required"
            });
        }

        console.log(`GET_PRODUCT_DETAILS: Fetching details for groupid: ${groupid}`);

        // Get main product details from groupid_performance table
        const productQuery = `
            SELECT gp.*
            FROM groupid_performance gp
            WHERE gp.groupid = $1 AND gp.channel = 'SHP'
        `;

        const productResult = await db.query(productQuery, [groupid]);

        if (productResult.rows.length === 0) {
            console.log(`GET_PRODUCT_DETAILS: Product not found for groupid: ${groupid}`);
            return res.status(404).json({
                return_code: "PRODUCT_NOT_FOUND",
                message: `Product with groupid ${groupid} not found`
            });
        }

        const productData = productResult.rows[0];
        console.log(`GET_PRODUCT_DETAILS: Found product data for ${groupid}`);

        // Get SKU summary details if available
        const skuQuery = `
            SELECT *
            FROM skusummary
            WHERE groupid = $1
        `;

        const skuResult = await db.query(skuQuery, [groupid]);
        const skuDetails = skuResult.rows.length > 0 ? skuResult.rows[0] : null;

        if (skuDetails) {
            console.log(`GET_PRODUCT_DETAILS: Found SKU details for ${groupid}`);
        }

        // Get historical weekly performance data
        const weeklyQuery = `
            SELECT year_week, annual_profit, sold_qty, avg_profit_per_unit
            FROM groupid_performance_week
            WHERE groupid = $1 AND channel = 'SHP'
            ORDER BY year_week DESC
            LIMIT 12
        `;

        const weeklyResult = await db.query(weeklyQuery, [groupid]);
        console.log(`GET_PRODUCT_DETAILS: Found ${weeklyResult.rows.length} weeks of historical data for ${groupid}`);

        // Format the response data
        const product = {
            groupid: productData.groupid,
            channel: productData.channel,
            annual_profit: productData.annual_profit ? parseFloat(productData.annual_profit) : 0,
            sold_qty: productData.sold_qty || 0,
            avg_profit_per_unit: productData.avg_profit_per_unit ? parseFloat(productData.avg_profit_per_unit) : 0,
            segment: productData.segment || '',
            notes: productData.notes || '',
            owner: productData.owner || '',
            brand: productData.brand || '',
            next_review_date: productData.next_review_date,
            review_date: productData.review_date,
            avg_gross_margin: productData.avg_gross_margin ? parseFloat(productData.avg_gross_margin) : 0,
            sku_details: skuDetails ? {
                season: skuDetails.season || '',
                // Add other SKU fields as needed
                ...skuDetails
            } : null,
            weekly_performance: weeklyResult.rows.map(row => ({
                year_week: row.year_week,
                annual_profit: row.annual_profit ? parseFloat(row.annual_profit) : 0,
                sold_qty: row.sold_qty || 0,
                avg_profit_per_unit: row.avg_profit_per_unit ? parseFloat(row.avg_profit_per_unit) : 0
            }))
        };

        console.log(`GET_PRODUCT_DETAILS: Successfully retrieved details for ${groupid}`);

        // Return successful response
        res.json({
            return_code: "SUCCESS",
            product: product
        });

    } catch (error) {
        console.error('GET_PRODUCT_DETAILS: Database error:', error);
        res.status(500).json({
            return_code: "DATABASE_ERROR",
            message: "Failed to retrieve product details"
        });
    }
});

module.exports = router;
