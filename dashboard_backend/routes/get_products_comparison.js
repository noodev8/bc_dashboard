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
  "comparison_period": "week" | "month",           // Optional, defaults to "week"
  "season_filter": "Summer" | "Winter",            // Optional, includes only products with this season
  "season_filter_exclude": "Summer" | "Winter",   // Optional, excludes products with this season
  "brand_filter": "Birkenstock" | "UKD" | etc.    // Optional, filters by specific brand
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
      "recommended_price": 29.99,
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

        // Get comparison period from request body (defaults to "week")
        const comparisonPeriod = req.body.comparison_period || 'week';
        console.log(`GET_PRODUCTS_COMPARISON: Comparison period: ${comparisonPeriod}`);

        // Get filters from request body (optional)
        const seasonFilter = req.body.season_filter;
        const seasonFilterExclude = req.body.season_filter_exclude;
        const brandFilter = req.body.brand_filter;
        console.log(`GET_PRODUCTS_COMPARISON: Season filter: ${seasonFilter || 'none'}`);
        console.log(`GET_PRODUCTS_COMPARISON: Season filter exclude: ${seasonFilterExclude || 'none'}`);
        console.log(`GET_PRODUCTS_COMPARISON: Brand filter: ${brandFilter || 'none'}`);

        // First, find the actual current week from the database (highest week number)
        const currentWeekQuery = `
            SELECT year_week
            FROM groupid_performance_week
            WHERE channel = 'SHP'
            ORDER BY year_week DESC
            LIMIT 1
        `;

        const currentWeekResult = await db.query(currentWeekQuery);
        const actualCurrentWeek = currentWeekResult.rows.length > 0 ? currentWeekResult.rows[0].year_week : null;

        if (!actualCurrentWeek) {
            throw new Error('No week data found in groupid_performance_week table');
        }

        console.log(`GET_PRODUCTS_COMPARISON: Database current week: ${actualCurrentWeek}`);

        // Parse the actual current week to get year and week number
        const [actualYear, actualWeekStr] = actualCurrentWeek.split('-W');
        const actualWeekNum = parseInt(actualWeekStr);

        // Calculate comparison week based on actual data
        let comparisonWeek;
        let comparisonLabel;

        if (comparisonPeriod === 'month') {
            // For month comparison, use the earliest available week to maximize time difference
            console.log(`GET_PRODUCTS_COMPARISON: Finding earliest available week for month comparison`);

            // Get the earliest available week
            const earliestWeekQuery = `
                SELECT year_week
                FROM groupid_performance_week
                WHERE channel = 'SHP'
                ORDER BY year_week ASC
                LIMIT 1
            `;

            const earliestResult = await db.query(earliestWeekQuery, []);

            if (earliestResult.rows.length > 0) {
                const earliestWeek = earliestResult.rows[0].year_week;

                // Only use the earliest week if it's different from the current week
                if (earliestWeek !== actualCurrentWeek) {
                    comparisonWeek = earliestWeek;

                    // Calculate how many weeks back this actually is
                    const [oldYear, oldWeekStr] = earliestWeek.split('-W');
                    const oldWeekNum = parseInt(oldWeekStr);
                    const weeksBack = actualWeekNum - oldWeekNum;

                    comparisonLabel = weeksBack === 1 ? 'Last Week' : `${weeksBack} weeks ago`;
                    console.log(`GET_PRODUCTS_COMPARISON: Using earliest week ${comparisonWeek} (${comparisonLabel}) for month comparison`);
                } else {
                    console.log(`GET_PRODUCTS_COMPARISON: Only one week of data available, cannot perform comparison`);
                    comparisonWeek = null;
                    comparisonLabel = 'No comparison data available';
                }
            } else {
                console.log(`GET_PRODUCTS_COMPARISON: No historical data available for comparison`);
                comparisonWeek = null;
                comparisonLabel = 'No comparison data available';
            }
        } else {
            // Compare against previous week from actual current week
            let prevWeekNum = actualWeekNum - 1;
            let prevYear = parseInt(actualYear);
            if (prevWeekNum < 1) {
                prevYear = prevYear - 1;
                prevWeekNum = 52;
            }
            comparisonWeek = `${prevYear}-W${prevWeekNum.toString().padStart(2, '0')}`;
            comparisonLabel = 'Previous Week';
        }

        // For week comparison, check if the calculated comparison week has data
        if (comparisonPeriod === 'week' && comparisonWeek) {
            const checkWeekQuery = `
                SELECT COUNT(*) as count
                FROM groupid_performance_week
                WHERE channel = 'SHP' AND year_week = $1
            `;

            const checkResult = await db.query(checkWeekQuery, [comparisonWeek]);
            const hasData = parseInt(checkResult.rows[0].count) > 0;

            if (!hasData) {
                console.log(`GET_PRODUCTS_COMPARISON: No data for week comparison ${comparisonWeek}`);
                comparisonWeek = null;
                comparisonLabel = 'No comparison data available';
            }
        }

        console.log(`GET_PRODUCTS_COMPARISON: Final comparison: ${actualCurrentWeek} vs ${comparisonWeek || 'none'} (${comparisonLabel})`);

        // If no comparison week is available, return current data without comparison
        if (!comparisonWeek) {
            console.log(`GET_PRODUCTS_COMPARISON: No comparison data available, returning current data only`);

            // Return current products without comparison data
            let seasonJoinCondition = '';
            let seasonWhereCondition = '';
            let brandWhereCondition = '';
            let queryParams = [];

            if (seasonFilter || seasonFilterExclude) {
                seasonJoinCondition = 'LEFT JOIN skusummary ss ON gp.groupid = ss.groupid';

                if (seasonFilter) {
                    queryParams.push(seasonFilter);
                    seasonWhereCondition = `AND ss.season = $${queryParams.length}`;
                } else if (seasonFilterExclude) {
                    queryParams.push(seasonFilterExclude);
                    seasonWhereCondition = `AND (ss.season IS NULL OR ss.season != $${queryParams.length})`;
                }
            }

            // Add brand filter condition if provided
            if (brandFilter) {
                if (brandFilter === 'UKD') {
                    // UKD represents all brands except the specific ones
                    brandWhereCondition = ` AND (gp.brand IS NULL OR gp.brand = '' OR gp.brand NOT IN ('Birkenstock', 'Rieker', 'Lunar', 'Crocs', 'Hotter', 'Skechers'))`;
                } else {
                    // Filter for specific brand
                    queryParams.push(brandFilter);
                    brandWhereCondition = ` AND gp.brand = $${queryParams.length}`;
                }
            }

            const currentOnlyQuery = `
                SELECT
                    gp.groupid,
                    gp.channel,
                    gp.annual_profit,
                    gp.sold_qty,
                    gp.avg_profit_per_unit,
                    gp.segment,
                    gp.notes,
                    gp.owner,
                    gp.brand,
                    gp.next_review_date,
                    gp.review_date,
                    gp.avg_gross_margin,
                    gp.recommended_price,
                    gp.stock
                FROM groupid_performance gp
                ${seasonJoinCondition}
                WHERE gp.channel = 'SHP'
                ${seasonWhereCondition}
                ${brandWhereCondition}
                ORDER BY gp.annual_profit DESC NULLS LAST
            `;

            const currentResult = await db.query(currentOnlyQuery, queryParams);

            const products = currentResult.rows.map(row => ({
                groupid: row.groupid,
                channel: row.channel,
                annual_profit: parseFloat(row.annual_profit) || 0,
                sold_qty: row.sold_qty || 0,
                avg_profit_per_unit: parseFloat(row.avg_profit_per_unit) || 0,
                segment: row.segment,
                notes: row.notes,
                owner: row.owner,
                brand: row.brand,
                next_review_date: row.next_review_date,
                review_date: row.review_date,
                avg_gross_margin: parseFloat(row.avg_gross_margin) || 0,
                recommended_price: row.recommended_price ? parseFloat(row.recommended_price) : 0,
                stock: row.stock || 0,
                previous_week: null,
                changes: null
            }));

            // Calculate overall statistics without comparison
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
                changes: null
            };

            return res.json({
                return_code: "SUCCESS",
                products: products,
                comparison_info: {
                    current_week: actualCurrentWeek,
                    comparison_week: null,
                    comparison_period: comparisonPeriod,
                    comparison_label: comparisonLabel,
                    products_with_comparison: 0,
                    products_without_comparison: products.length,
                    total_products: products.length
                },
                overall_stats: overallStats
            });
        }

        // SQL query to get current products with comparison data
        let queryParams = [comparisonWeek];
        let seasonJoinCondition = '';
        let seasonWhereCondition = '';
        let brandWhereCondition = '';

        if (seasonFilter || seasonFilterExclude) {
            seasonJoinCondition = 'LEFT JOIN skusummary ss ON gp.groupid = ss.groupid';

            if (seasonFilter) {
                queryParams.push(seasonFilter);
                seasonWhereCondition = `AND ss.season = $${queryParams.length}`;
            } else if (seasonFilterExclude) {
                queryParams.push(seasonFilterExclude);
                seasonWhereCondition = `AND (ss.season IS NULL OR ss.season != $${queryParams.length})`;
            }
        }

        // Add brand filter condition if provided
        if (brandFilter) {
            if (brandFilter === 'UKD') {
                // UKD represents all brands except the specific ones
                brandWhereCondition = ` AND (gp.brand IS NULL OR gp.brand = '' OR gp.brand NOT IN ('Birkenstock', 'Rieker', 'Lunar', 'Crocs', 'Hotter', 'Skechers'))`;
            } else {
                // Filter for specific brand
                queryParams.push(brandFilter);
                brandWhereCondition = ` AND gp.brand = $${queryParams.length}`;
            }
        }

        const query = `
            WITH current_products AS (
                SELECT
                    gp.groupid,
                    gp.channel,
                    gp.annual_profit,
                    gp.sold_qty,
                    gp.avg_profit_per_unit,
                    gp.segment,
                    gp.notes,
                    gp.owner,
                    gp.brand,
                    gp.next_review_date,
                    gp.review_date,
                    gp.avg_gross_margin,
                    gp.recommended_price,
                    gp.stock
                FROM groupid_performance gp
                ${seasonJoinCondition}
                WHERE gp.channel = 'SHP'
                ${seasonWhereCondition}
                ${brandWhereCondition}
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

        // Execute the query with dynamic parameters
        const result = await db.query(query, queryParams);
        
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
            recommended_price: row.recommended_price ? parseFloat(row.recommended_price) : 0,
            stock: row.stock || 0,
            
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
                current_week: actualCurrentWeek,
                comparison_week: comparisonWeek,
                comparison_period: comparisonPeriod,
                comparison_label: comparisonLabel,
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
