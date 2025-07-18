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
  "groupid": "ABC123",                             // Required: Product group identifier
  "price_limit": 5,                                // Optional: Number of price changes to return (default: 5)
  "price_offset": 0                                // Optional: Offset for pagination (default: 0)
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
    "recommended_price": 29.99,
    "current_price": 27.50,
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
    ],
    "price_history": [
      {
        "date": "2024-07-20T10:30:00Z",
        "old_price": 25.99,
        "new_price": 27.99,
        "change_amount": 2.00,
        "change_percent": 7.70,
        "reason": "Market adjustment"
      },
      {
        "date": "2024-07-15T14:15:00Z",
        "old_price": 24.99,
        "new_price": 25.99,
        "change_amount": 1.00,
        "change_percent": 4.00,
        "reason": "Cost increase"
      }
      // ... more price changes
    ],
    "sales_data": [
      {
        "date": "2024-07-20T10:30:00Z",
        "amount": 125.50,
        "quantity": 5,
        "price": 25.10,
        "total": 125.50,
        // ... other sales fields from the sales table
      }
      // ... more sales records
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

        // Validate required groupid parameter and get optional pagination params
        const { groupid, price_limit = 5, price_offset = 0 } = req.body;
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
            console.log(`GET_PRODUCT_DETAILS: SKU details fields:`, Object.keys(skuDetails));
            if (skuDetails.shopifyprice) {
                console.log(`GET_PRODUCT_DETAILS: Found shopifyprice: ${skuDetails.shopifyprice} for ${groupid}`);
            }
        }

        // Get Shopify title from title table
        const titleQuery = `
            SELECT shopifytitle
            FROM title
            WHERE groupid = $1
        `;

        let titleResult = { rows: [] };
        try {
            titleResult = await db.query(titleQuery, [groupid]);
            console.log(`GET_PRODUCT_DETAILS: Found title data for ${groupid}:`, titleResult.rows.length > 0 ? titleResult.rows[0] : 'none');
        } catch (titleError) {
            console.log(`GET_PRODUCT_DETAILS: Title query error: ${titleError.message}`);
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

        // Get sales data from sales table
        let salesResult = { rows: [] };
        try {
            console.log(`GET_PRODUCT_DETAILS: Querying sales table for groupid: ${groupid}`);

            const salesQuery = `
                SELECT *
                FROM sales
                WHERE groupid = $1
                ORDER BY solddate DESC
                LIMIT 50
            `;

            salesResult = await db.query(salesQuery, [groupid]);
            console.log(`GET_PRODUCT_DETAILS: Found ${salesResult.rows.length} sales records for ${groupid}`);

            if (salesResult.rows.length > 0) {
                console.log(`GET_PRODUCT_DETAILS: Sample sales record:`, salesResult.rows[0]);
            }
        } catch (salesError) {
            console.log(`GET_PRODUCT_DETAILS: Sales query error: ${salesError.message}`);

            // Try with different date field if solddate doesn't exist
            try {
                const salesQueryAlt = `
                    SELECT *
                    FROM sales
                    WHERE groupid = $1
                    ORDER BY id DESC
                    LIMIT 50
                `;

                salesResult = await db.query(salesQueryAlt, [groupid]);
                console.log(`GET_PRODUCT_DETAILS: Found ${salesResult.rows.length} sales records using id ordering`);
            } catch (altError) {
                console.log(`GET_PRODUCT_DETAILS: Alternative sales query also failed: ${altError.message}`);
            }
        }

        // Get price change history
        // First try to get the table structure to understand column names
        let priceResult = { rows: [] };
        try {
            // Try different possible column names for date/timestamp
            const priceQuery = `
                SELECT *
                FROM price_change_log
                WHERE groupid = $1
                ORDER BY
                    CASE
                        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_change_log' AND column_name = 'created_at') THEN created_at
                        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_change_log' AND column_name = 'date') THEN date
                        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_change_log' AND column_name = 'timestamp') THEN timestamp
                        ELSE (SELECT column_name FROM information_schema.columns WHERE table_name = 'price_change_log' AND data_type IN ('timestamp', 'timestamptz', 'date') LIMIT 1)
                    END DESC
                LIMIT 20
            `;

            // If the complex query fails, try a simpler approach
            try {
                priceResult = await db.query(priceQuery, [groupid]);
            } catch (complexError) {
                // Fallback: try common column names with pagination
                const fallbackQueries = [
                    `SELECT * FROM price_change_log WHERE groupid = $1 ORDER BY date DESC LIMIT $2 OFFSET $3`,
                    `SELECT * FROM price_change_log WHERE groupid = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3`,
                    `SELECT * FROM price_change_log WHERE groupid = $1 ORDER BY change_date DESC LIMIT $2 OFFSET $3`,
                    `SELECT * FROM price_change_log WHERE groupid = $1 LIMIT $2 OFFSET $3`
                ];

                for (const fallbackQuery of fallbackQueries) {
                    try {
                        priceResult = await db.query(fallbackQuery, [groupid, price_limit, price_offset]);
                        console.log(`GET_PRODUCT_DETAILS: Price query succeeded with fallback`);
                        break;
                    } catch (fallbackError) {
                        continue;
                    }
                }
            }

            console.log(`GET_PRODUCT_DETAILS: Found ${priceResult.rows.length} price changes for ${groupid}`);

            // Get total count of price changes for pagination
            let totalPriceChanges = 0;
            try {
                const countQuery = `SELECT COUNT(*) as total FROM price_change_log WHERE groupid = $1`;
                const countResult = await db.query(countQuery, [groupid]);
                totalPriceChanges = parseInt(countResult.rows[0].total) || 0;
                console.log(`GET_PRODUCT_DETAILS: Total price changes available: ${totalPriceChanges}`);
            } catch (countError) {
                console.log(`GET_PRODUCT_DETAILS: Could not get price change count: ${countError.message}`);
            }

            // Store total count for response
            priceResult.totalCount = totalPriceChanges;

            // Current price will be retrieved from skusummary.shopify_price instead of price log
            priceResult.currentPrice = null;
        } catch (priceError) {
            console.log(`GET_PRODUCT_DETAILS: Price change log not available or error: ${priceError.message}`);
            priceResult.totalCount = 0;
        }

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
            recommended_price: productData.recommended_price ? parseFloat(productData.recommended_price) : 0,
            current_price: skuDetails?.shopifyprice ? parseFloat(skuDetails.shopifyprice) : 0,
            shopify_title: titleResult.rows.length > 0 ? titleResult.rows[0].shopifytitle : null,
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
            })),
            price_history: priceResult.rows.map(row => {
                // Try to find the date column with different possible names
                const dateValue = row.created_at || row.date || row.timestamp || row.change_date || null;

                // Try to find price columns with different possible names
                const oldPrice = row.old_price || row.previous_price || row.price_before || null;
                const newPrice = row.new_price || row.current_price || row.price_after || row.price || null;

                return {
                    date: dateValue,
                    old_price: oldPrice ? parseFloat(oldPrice) : null,
                    new_price: newPrice ? parseFloat(newPrice) : null,
                    change_amount: oldPrice && newPrice ?
                        parseFloat(newPrice) - parseFloat(oldPrice) : null,
                    change_percent: oldPrice && newPrice && parseFloat(oldPrice) !== 0 ?
                        ((parseFloat(newPrice) - parseFloat(oldPrice)) / parseFloat(oldPrice) * 100) : null,
                    reason: row.reason || row.change_reason || row.notes || '',
                    // Include any other fields that might exist
                    ...row
                };
            }),
            price_history_pagination: {
                current_count: priceResult.rows.length,
                total_count: priceResult.totalCount || 0,
                has_more: (price_offset + priceResult.rows.length) < (priceResult.totalCount || 0),
                limit: price_limit,
                offset: price_offset
            },
            sales_data: salesResult.rows.map(row => ({
                // Include all sales fields, handling the actual field names from your database
                ...row,
                // Map the actual fields from your sales table
                quantity: row.qty || row.quantity || 1,
                price: row.soldprice ? parseFloat(row.soldprice) : null,
                amount: row.soldprice ? parseFloat(row.soldprice) : null,
                total: row.soldprice ? parseFloat(row.soldprice) : null,
                date: row.solddate || row.created_at || row.date || null,
                order_number: row.ordernum || null,
                channel: row.channel || null
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
