/*
=======================================================================================================================================
API Route: get_products_comparison
=======================================================================================================================================
Method: POST
Purpose: Retrieves current SHP products with comparison to previous week's performance data.
         Shows week-over-week changes in annual profit, sold quantity, and profit per unit.
=======================================================================================================================================
Request Payload:
{
  // No specific payload required - endpoint returns current vs previous week comparison
}

Success Response:
{
  "return_code": "SUCCESS",
  "products": [
    {
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
      "previous_week": {
        "annual_profit": 1180.50,
        "sold_qty": 42,
        "avg_profit_per_unit": 28.10,
        "year_week": "2025-W26"
      },
      "changes": {
        "annual_profit_change": 70.25,
        "annual_profit_change_percent": 5.95,
        "sold_qty_change": 3,
        "sold_qty_change_percent": 7.14,
        "avg_profit_per_unit_change": -0.31,
        "avg_profit_per_unit_change_percent": -1.10
      }
    }
    // ... more products
  ],
  "comparison_info": {
    "current_week": "2025-W27",
    "previous_week": "2025-W26",
    "products_with_comparison": 150,
    "products_without_comparison": 25
  },
  "overall_stats": {
    "current": {
      "total_annual_profit": 125000.50,
      "total_sold_qty": 4500,
      "avg_profit_per_unit": 27.78,
      "avg_gross_margin": 0.2450,
      "total_products": 175
    },
    "previous": {
      "total_annual_profit": 118000.25,
      "total_sold_qty": 4200,
      "avg_profit_per_unit": 28.10,
      "avg_gross_margin": 0.2400,
      "total_products": 150
    },
    "changes": {
      "total_annual_profit_change": 7000.25,
      "total_annual_profit_change_percent": 5.93,
      "total_sold_qty_change": 300,
      "total_sold_qty_change_percent": 7.14,
      "avg_profit_per_unit_change": -0.32,
      "avg_profit_per_unit_change_percent": -1.14,
      "total_products_change": 25
    }
  }
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

// POST /get_products_comparison
router.post('/', async (req, res) => {
    try {
        console.log('GET_PRODUCTS_COMPARISON: Starting products comparison retrieval...');
        
        // Get current week in YYYY-WW format
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        
        // Calculate week number (ISO week)
        const startOfYear = new Date(currentYear, 0, 1);
        const pastDaysOfYear = (currentDate - startOfYear) / 86400000;
        const currentWeekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
        const currentWeek = `${currentYear}-W${currentWeekNum.toString().padStart(2, '0')}`;
        
        // Calculate previous week
        let prevWeekNum = currentWeekNum - 1;
        let prevYear = currentYear;
        if (prevWeekNum < 1) {
            prevYear = currentYear - 1;
            prevWeekNum = 52; // Approximate last week of previous year
        }
        const previousWeek = `${prevYear}-W${prevWeekNum.toString().padStart(2, '0')}`;
        
        console.log(`GET_PRODUCTS_COMPARISON: Comparing ${currentWeek} vs ${previousWeek}`);
        
        // SQL query to get current products with previous week comparison
        const query = `
            WITH current_products AS (
                SELECT 
                    groupid,
                    channel,
                    annual_profit,
                    sold_qty,
                    avg_profit_per_unit,
                    segment,
                    notes,
                    owner,
                    brand,
                    next_review_date,
                    review_date,
                    avg_gross_margin
                FROM groupid_performance 
                WHERE channel = 'SHP'
            ),
            previous_week_data AS (
                SELECT 
                    groupid,
                    channel,
                    annual_profit as prev_annual_profit,
                    sold_qty as prev_sold_qty,
                    avg_profit_per_unit as prev_avg_profit_per_unit,
                    year_week
                FROM groupid_performance_week 
                WHERE channel = 'SHP' 
                  AND year_week = $1
            )
            SELECT 
                cp.*,
                pwd.prev_annual_profit,
                pwd.prev_sold_qty,
                pwd.prev_avg_profit_per_unit,
                pwd.year_week as previous_week,
                
                -- Calculate changes
                CASE 
                    WHEN pwd.prev_annual_profit IS NOT NULL THEN 
                        cp.annual_profit - pwd.prev_annual_profit 
                    ELSE NULL 
                END as annual_profit_change,
                
                CASE 
                    WHEN pwd.prev_annual_profit IS NOT NULL AND pwd.prev_annual_profit != 0 THEN 
                        ROUND(((cp.annual_profit - pwd.prev_annual_profit) / pwd.prev_annual_profit * 100), 2)
                    ELSE NULL 
                END as annual_profit_change_percent,
                
                CASE 
                    WHEN pwd.prev_sold_qty IS NOT NULL THEN 
                        cp.sold_qty - pwd.prev_sold_qty 
                    ELSE NULL 
                END as sold_qty_change,
                
                CASE 
                    WHEN pwd.prev_sold_qty IS NOT NULL AND pwd.prev_sold_qty != 0 THEN 
                        ROUND(((cp.sold_qty - pwd.prev_sold_qty)::NUMERIC / pwd.prev_sold_qty * 100), 2)
                    ELSE NULL 
                END as sold_qty_change_percent,
                
                CASE 
                    WHEN pwd.prev_avg_profit_per_unit IS NOT NULL THEN 
                        cp.avg_profit_per_unit - pwd.prev_avg_profit_per_unit 
                    ELSE NULL 
                END as avg_profit_per_unit_change,
                
                CASE 
                    WHEN pwd.prev_avg_profit_per_unit IS NOT NULL AND pwd.prev_avg_profit_per_unit != 0 THEN 
                        ROUND(((cp.avg_profit_per_unit - pwd.prev_avg_profit_per_unit) / pwd.prev_avg_profit_per_unit * 100), 2)
                    ELSE NULL 
                END as avg_profit_per_unit_change_percent
                
            FROM current_products cp
            LEFT JOIN previous_week_data pwd ON cp.groupid = pwd.groupid AND cp.channel = pwd.channel
            ORDER BY cp.annual_profit DESC NULLS LAST
        `;
        
        console.log('GET_PRODUCTS_COMPARISON: Executing database query...');
        
        // Execute the query
        const result = await db.query(query, [previousWeek]);
        
        console.log(`GET_PRODUCTS_COMPARISON: Query successful. Retrieved ${result.rows.length} products`);
        
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
            avg_gross_margin: row.avg_gross_margin ? parseFloat(row.avg_gross_margin) : 0,
            
            // Previous week data
            previous_week: row.prev_annual_profit !== null ? {
                annual_profit: parseFloat(row.prev_annual_profit) || 0,
                sold_qty: row.prev_sold_qty || 0,
                avg_profit_per_unit: parseFloat(row.prev_avg_profit_per_unit) || 0,
                year_week: row.previous_week
            } : null,
            
            // Changes
            changes: row.annual_profit_change !== null ? {
                annual_profit_change: parseFloat(row.annual_profit_change) || 0,
                annual_profit_change_percent: parseFloat(row.annual_profit_change_percent) || 0,
                sold_qty_change: row.sold_qty_change || 0,
                sold_qty_change_percent: parseFloat(row.sold_qty_change_percent) || 0,
                avg_profit_per_unit_change: parseFloat(row.avg_profit_per_unit_change) || 0,
                avg_profit_per_unit_change_percent: parseFloat(row.avg_profit_per_unit_change_percent) || 0
            } : null
        }));
        
        // Calculate comparison statistics
        const productsWithComparison = products.filter(p => p.previous_week !== null).length;
        const productsWithoutComparison = products.length - productsWithComparison;

        // Calculate overall statistics
        const overallStats = {
            current: {
                total_annual_profit: products.reduce((sum, p) => sum + p.annual_profit, 0),
                total_sold_qty: products.reduce((sum, p) => sum + p.sold_qty, 0),
                avg_profit_per_unit: products.length > 0 ?
                    products.reduce((sum, p) => sum + p.avg_profit_per_unit, 0) / products.length : 0,
                avg_gross_margin: products.length > 0 ?
                    products.reduce((sum, p) => sum + p.avg_gross_margin, 0) / products.length : 0,
                total_products: products.length
            },
            previous: {
                total_annual_profit: 0,
                total_sold_qty: 0,
                avg_profit_per_unit: 0,
                avg_gross_margin: 0,
                total_products: 0
            },
            changes: {
                total_annual_profit_change: 0,
                total_annual_profit_change_percent: 0,
                total_sold_qty_change: 0,
                total_sold_qty_change_percent: 0,
                avg_profit_per_unit_change: 0,
                avg_profit_per_unit_change_percent: 0,
                avg_gross_margin_change: 0,
                avg_gross_margin_change_percent: 0,
                total_products_change: 0
            }
        };

        // Calculate previous week totals from products with comparison data
        const productsWithPreviousData = products.filter(p => p.previous_week);
        if (productsWithPreviousData.length > 0) {
            overallStats.previous.total_annual_profit = productsWithPreviousData.reduce((sum, p) => sum + p.previous_week.annual_profit, 0);
            overallStats.previous.total_sold_qty = productsWithPreviousData.reduce((sum, p) => sum + p.previous_week.sold_qty, 0);
            overallStats.previous.avg_profit_per_unit = productsWithPreviousData.reduce((sum, p) => sum + p.previous_week.avg_profit_per_unit, 0) / productsWithPreviousData.length;
            overallStats.previous.total_products = productsWithPreviousData.length;

            // Calculate changes
            overallStats.changes.total_annual_profit_change = overallStats.current.total_annual_profit - overallStats.previous.total_annual_profit;
            overallStats.changes.total_annual_profit_change_percent = overallStats.previous.total_annual_profit !== 0 ?
                ((overallStats.current.total_annual_profit - overallStats.previous.total_annual_profit) / overallStats.previous.total_annual_profit * 100) : 0;

            overallStats.changes.total_sold_qty_change = overallStats.current.total_sold_qty - overallStats.previous.total_sold_qty;
            overallStats.changes.total_sold_qty_change_percent = overallStats.previous.total_sold_qty !== 0 ?
                ((overallStats.current.total_sold_qty - overallStats.previous.total_sold_qty) / overallStats.previous.total_sold_qty * 100) : 0;

            overallStats.changes.avg_profit_per_unit_change = overallStats.current.avg_profit_per_unit - overallStats.previous.avg_profit_per_unit;
            overallStats.changes.avg_profit_per_unit_change_percent = overallStats.previous.avg_profit_per_unit !== 0 ?
                ((overallStats.current.avg_profit_per_unit - overallStats.previous.avg_profit_per_unit) / overallStats.previous.avg_profit_per_unit * 100) : 0;

            overallStats.changes.total_products_change = overallStats.current.total_products - overallStats.previous.total_products;
        }

        // Return successful response with products, comparison info, and overall stats
        res.json({
            return_code: "SUCCESS",
            products: products,
            comparison_info: {
                current_week: currentWeek,
                previous_week: previousWeek,
                products_with_comparison: productsWithComparison,
                products_without_comparison: productsWithoutComparison,
                total_products: products.length
            },
            overall_stats: overallStats
        });
        
        console.log('GET_PRODUCTS_COMPARISON: Response sent successfully');
        console.log(`GET_PRODUCTS_COMPARISON: ${productsWithComparison} products have comparison data`);
        
    } catch (error) {
        console.error('GET_PRODUCTS_COMPARISON: Database error:', error);
        
        // Return error response
        res.status(500).json({
            return_code: "DATABASE_ERROR",
            message: "Failed to retrieve products comparison from database",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
