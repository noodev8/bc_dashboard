/**
 * GET_BRANDS API Route
 * 
 * This endpoint retrieves unique brands from the products database.
 * It groups specific brands individually and combines others under "UKD".
 * 
 * Route: POST /get_brands
 * 
 * Request Payload: {} (empty object)
 * 
 * Success Response:
 * {
 *   "return_code": "SUCCESS",
 *   "brands": [
 *     "All",
 *     "Birkenstock",
 *     "Rieker", 
 *     "Lunar",
 *     "Crocs",
 *     "Hotter",
 *     "Skechers",
 *     "UKD"
 *   ],
 *   "total_count": 8
 * }
 * 
 * Error Response:
 * {
 *   "return_code": "ERROR",
 *   "message": "Error description"
 * }
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /get_brands
router.post('/', async (req, res) => {
    try {
        console.log('GET_BRANDS: Starting brands retrieval...');
        
        // SQL query to get unique brands from SHP channel products
        const query = `
            SELECT DISTINCT brand
            FROM groupid_performance 
            WHERE channel = 'SHP' 
              AND brand IS NOT NULL 
              AND brand != ''
            ORDER BY brand ASC
        `;
        
        console.log('GET_BRANDS: Executing database query...');
        
        // Execute the query
        const result = await db.query(query);
        
        console.log(`GET_BRANDS: Query successful. Retrieved ${result.rows.length} unique brands`);
        
        // Extract brand names from the result
        const allBrands = result.rows.map(row => row.brand);
        
        // Define the specific brands that should be shown individually
        const specificBrands = ['Birkenstock', 'Rieker', 'Lunar', 'Crocs', 'Hotter', 'Skechers'];
        
        // Filter brands that exist in the database and are in our specific list
        const availableSpecificBrands = specificBrands.filter(brand => 
            allBrands.some(dbBrand => dbBrand.toLowerCase() === brand.toLowerCase())
        );
        
        // Check if there are any brands that would fall under UKD
        const hasUKDBrands = allBrands.some(brand => 
            !specificBrands.some(specificBrand => 
                specificBrand.toLowerCase() === brand.toLowerCase()
            )
        );
        
        // Build the final brands list
        const brands = ['All', ...availableSpecificBrands];
        if (hasUKDBrands) {
            brands.push('UKD');
        }
        
        console.log(`GET_BRANDS: Returning ${brands.length} brand options:`, brands);
        
        // Return successful response
        res.json({
            return_code: "SUCCESS",
            brands: brands,
            total_count: brands.length
        });
        
    } catch (error) {
        console.error('GET_BRANDS: Database error:', error);
        res.status(500).json({
            return_code: "ERROR",
            message: "Failed to retrieve brands from database"
        });
    }
});

module.exports = router;
