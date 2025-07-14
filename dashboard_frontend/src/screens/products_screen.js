/*
Products Dashboard Screen
Displays all products from the groupid_performance table in a sortable table format
Shows key performance metrics including annual profit, quantity sold, and profit per unit
Provides filtering and sorting capabilities for better data analysis
*/

import React, { useState, useEffect, useMemo } from 'react';
import { getProducts } from '../api/get_products_api';
import { getOwners } from '../api/get_owners_api';
import { getProductsComparison } from '../api/get_products_comparison_api';
import OverallStats from '../components/OverallStats';
import './products_screen.css';

const ProductsScreen = () => {
  // State management
  const [products, setProducts] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: 'annual_profit',
    direction: 'desc'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('');
  const [showTasksOnly, setShowTasksOnly] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonPeriod, setComparisonPeriod] = useState('week');
  const [comparisonInfo, setComparisonInfo] = useState(null);
  const [overallStats, setOverallStats] = useState(null);
  const [seasonFilter, setSeasonFilter] = useState('');

  // Load products and owners data on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Reload products when comparison mode, period, or season filter changes
  useEffect(() => {
    if (products.length > 0) { // Only reload if we already have products loaded
      loadProducts();
    }
  }, [comparisonMode, comparisonPeriod, seasonFilter]);

  /**
   * Loads both products and owners data
   */
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([
        loadProducts(),
        loadOwners()
      ]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches products data from the API (regular or comparison mode)
   */
  const loadProducts = async () => {
    try {
      console.log(`PRODUCTS_SCREEN: Loading products (comparison mode: ${comparisonMode})...`);

      // Prepare request payload with optional season filter
      const requestPayload = {};
      if (seasonFilter) {
        requestPayload.season_filter = seasonFilter;
      }

      let result;
      if (comparisonMode) {
        result = await getProductsComparison({
          comparison_period: comparisonPeriod,
          ...requestPayload
        });
        if (result.success) {
          setComparisonInfo(result.comparisonInfo);
          setOverallStats(result.overallStats);
        }
      } else {
        result = await getProducts(requestPayload);
        setComparisonInfo(null);
        // Calculate basic overall stats for non-comparison mode
        if (result.success && result.products) {
          const basicStats = {
            current: {
              total_annual_profit: result.products.reduce((sum, p) => sum + (p.annual_profit || 0), 0),
              total_sold_qty: result.products.reduce((sum, p) => sum + (p.sold_qty || 0), 0),
              avg_profit_per_unit: result.products.length > 0 ?
                result.products.reduce((sum, p) => sum + (p.avg_profit_per_unit || 0), 0) / result.products.length : 0,
              avg_gross_margin: result.products.length > 0 ?
                result.products.reduce((sum, p) => sum + (p.avg_gross_margin || 0), 0) / result.products.length : 0,
              total_products: result.products.length
            },
            previous: null,
            changes: null
          };
          setOverallStats(basicStats);
        } else {
          setOverallStats(null);
        }
      }

      if (result.success) {
        setProducts(result.products);
        console.log(`PRODUCTS_SCREEN: Loaded ${result.products.length} products`);
      } else {
        setError(result.error);
        console.error('PRODUCTS_SCREEN: Failed to load products:', result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred while loading products');
      console.error('PRODUCTS_SCREEN: Unexpected error:', err);
    }
  };

  /**
   * Fetches owners data from the API
   */
  const loadOwners = async () => {
    try {
      console.log('PRODUCTS_SCREEN: Loading owners...');

      const result = await getOwners();

      if (result.success) {
        setOwners(result.owners);
        console.log(`PRODUCTS_SCREEN: Loaded ${result.owners.length} owners`);
      } else {
        console.error('PRODUCTS_SCREEN: Failed to load owners:', result.error);
        // Don't set error for owners failure, just log it
      }
    } catch (err) {
      console.error('PRODUCTS_SCREEN: Unexpected error loading owners:', err);
      // Don't set error for owners failure, just log it
    }
  };

  /**
   * Handles table column sorting
   */
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  /**
   * Sorts products based on current sort configuration
   */
  const sortedProducts = React.useMemo(() => {
    let sortableProducts = [...products];
    
    if (sortConfig.key) {
      sortableProducts.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        // Numeric sorting
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        // String sorting
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return sortableProducts;
  }, [products, sortConfig]);

  /**
   * Filters products based on search term, selected owner, and tasks filter
   */
  const filteredProducts = React.useMemo(() => {
    let filtered = sortedProducts;

    // Filter by owner if selected
    if (selectedOwner) {
      filtered = filtered.filter(product => product.owner === selectedOwner);
    }

    // Filter for tasks if toggle is on (show products that need attention)
    if (showTasksOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

      filtered = filtered.filter(product => {
        // No next review date set
        if (!product.next_review_date || product.next_review_date === null) {
          return true;
        }

        // Review date has passed (overdue)
        const reviewDate = new Date(product.next_review_date);
        reviewDate.setHours(0, 0, 0, 0);
        return reviewDate <= today;
      });
    }

    // Filter by search term if provided
    if (searchTerm) {
      filtered = filtered.filter(product =>
        Object.values(product).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    return filtered;
  }, [sortedProducts, searchTerm, selectedOwner, showTasksOnly]);

  /**
   * Calculate overall stats based on filtered products
   */
  const calculateFilteredStats = useMemo(() => {
    if (!filteredProducts.length) return null;

    const currentStats = {
      total_annual_profit: filteredProducts.reduce((sum, p) => sum + (p.annual_profit || 0), 0),
      total_sold_qty: filteredProducts.reduce((sum, p) => sum + (p.sold_qty || 0), 0),
      avg_profit_per_unit: filteredProducts.length > 0 ?
        filteredProducts.reduce((sum, p) => sum + (p.avg_profit_per_unit || 0), 0) / filteredProducts.length : 0,
      avg_gross_margin: filteredProducts.length > 0 ?
        filteredProducts.reduce((sum, p) => sum + (p.avg_gross_margin || 0), 0) / filteredProducts.length : 0,
      total_products: filteredProducts.length
    };

    if (!comparisonMode) {
      return {
        current: currentStats,
        previous: null,
        changes: null
      };
    }

    // Calculate previous week stats from filtered products with comparison data
    const filteredProductsWithPrevious = filteredProducts.filter(p => p.previous_week);
    if (filteredProductsWithPrevious.length === 0) {
      return {
        current: currentStats,
        previous: null,
        changes: null
      };
    }

    const previousStats = {
      total_annual_profit: filteredProductsWithPrevious.reduce((sum, p) => sum + (p.previous_week.annual_profit || 0), 0),
      total_sold_qty: filteredProductsWithPrevious.reduce((sum, p) => sum + (p.previous_week.sold_qty || 0), 0),
      avg_profit_per_unit: filteredProductsWithPrevious.reduce((sum, p) => sum + (p.previous_week.avg_profit_per_unit || 0), 0) / filteredProductsWithPrevious.length,
      total_products: filteredProductsWithPrevious.length
    };

    // Calculate changes
    const changes = {
      total_annual_profit_change: currentStats.total_annual_profit - previousStats.total_annual_profit,
      total_annual_profit_change_percent: previousStats.total_annual_profit !== 0 ?
        ((currentStats.total_annual_profit - previousStats.total_annual_profit) / previousStats.total_annual_profit * 100) : 0,
      total_sold_qty_change: currentStats.total_sold_qty - previousStats.total_sold_qty,
      total_sold_qty_change_percent: previousStats.total_sold_qty !== 0 ?
        ((currentStats.total_sold_qty - previousStats.total_sold_qty) / previousStats.total_sold_qty * 100) : 0,
      avg_profit_per_unit_change: currentStats.avg_profit_per_unit - previousStats.avg_profit_per_unit,
      avg_profit_per_unit_change_percent: previousStats.avg_profit_per_unit !== 0 ?
        ((currentStats.avg_profit_per_unit - previousStats.avg_profit_per_unit) / previousStats.avg_profit_per_unit * 100) : 0,
      avg_gross_margin_change: currentStats.avg_gross_margin - previousStats.avg_gross_margin,
      avg_gross_margin_change_percent: previousStats.avg_gross_margin !== 0 ?
        ((currentStats.avg_gross_margin - previousStats.avg_gross_margin) / previousStats.avg_gross_margin * 100) : 0,
      total_products_change: currentStats.total_products - previousStats.total_products
    };

    return {
      current: currentStats,
      previous: previousStats,
      changes: changes
    };
  }, [filteredProducts, comparisonMode]);

  /**
   * Formats currency values for display
   */
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(value);
  };

  /**
   * Formats percentage values for display
   */
  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '-';
    return `${(value * 100).toFixed(2)}%`;
  };

  /**
   * Formats date values for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  /**
   * Gets CSS class for sort indicator
   */
  const getSortClass = (columnKey) => {
    if (sortConfig.key === columnKey) {
      return sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc';
    }
    return 'sort-none';
  };

  /**
   * Formats comparison change with color and arrow indicators
   */
  const formatComparison = (current, change, changePercent) => {
    if (!comparisonMode || change === null || change === undefined) {
      return formatCurrency(current);
    }

    const isPositive = change > 0;
    const isNegative = change < 0;
    const arrow = isPositive ? '↗' : isNegative ? '↘' : '→';
    const colorClass = isPositive ? 'positive-change' : isNegative ? 'negative-change' : 'no-change';

    return (
      <div className="comparison-cell">
        <div className="current-value">{formatCurrency(current)}</div>
        <div className={`change-indicator ${colorClass}`}>
          {arrow} {formatCurrency(Math.abs(change))} ({changePercent > 0 ? '+' : ''}{changePercent}%)
        </div>
      </div>
    );
  };

  /**
   * Formats quantity comparison with color and arrow indicators
   */
  const formatQtyComparison = (current, change, changePercent) => {
    if (!comparisonMode || change === null || change === undefined) {
      return current || 0;
    }

    const isPositive = change > 0;
    const isNegative = change < 0;
    const arrow = isPositive ? '↗' : isNegative ? '↘' : '→';
    const colorClass = isPositive ? 'positive-change' : isNegative ? 'negative-change' : 'no-change';

    return (
      <div className="comparison-cell">
        <div className="current-value">{current || 0}</div>
        <div className={`change-indicator ${colorClass}`}>
          {arrow} {Math.abs(change)} ({changePercent > 0 ? '+' : ''}{changePercent}%)
        </div>
      </div>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <div className="screen-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="screen-container">
        <div className="error">
          <h3>Error Loading Products</h3>
          <p>{error}</p>
          <button onClick={loadProducts} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-container">
      <div className="screen-header">
        <h1 className="screen-title">Products Dashboard</h1>
        <p className="screen-description">
           </p>
      </div>

      <div className="products-controls">
        <div className="filters-container">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="owner-filter-container">
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="owner-filter-select"
            >
              <option value="">All Owners</option>
              {owners.map(owner => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          </div>

          <div className="review-filter-container">
            <button
              onClick={() => setShowTasksOnly(!showTasksOnly)}
              className={`review-filter-toggle ${showTasksOnly ? 'active' : ''}`}
              title={showTasksOnly ? 'Showing products that need review (no date or overdue)' : 'Showing all products'}
            >
              {showTasksOnly ? '📋 Tasks' : '📅 All Products'}
            </button>
          </div>

          <div className="season-filter-container">
            <button
              onClick={() => setSeasonFilter(seasonFilter === 'Summer' ? '' : 'Summer')}
              className={`season-filter-toggle ${seasonFilter === 'Summer' ? 'active' : ''}`}
              title={seasonFilter === 'Summer' ? 'Showing summer products only' : 'Show summer products only'}
            >
              ☀️ Summer
            </button>
            <button
              onClick={() => setSeasonFilter(seasonFilter === 'Winter' ? '' : 'Winter')}
              className={`season-filter-toggle ${seasonFilter === 'Winter' ? 'active' : ''}`}
              title={seasonFilter === 'Winter' ? 'Showing winter products only' : 'Show winter products only'}
            >
              ❄️ Winter
            </button>
          </div>

          <div className="comparison-filter-container">
            <button
              onClick={() => setComparisonMode(!comparisonMode)}
              className={`comparison-filter-toggle ${comparisonMode ? 'active' : ''}`}
              title={comparisonMode ? 'Showing comparison data' : 'Showing current data only'}
            >
              {comparisonMode ? '📊 Comparison' : '📈 Current'}
            </button>

            {comparisonMode && (
              <select
                value={comparisonPeriod}
                onChange={(e) => setComparisonPeriod(e.target.value)}
                className="comparison-period-select"
                title="Select comparison period"
              >
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            )}
          </div>
        </div>

        <div className="products-summary">
          <span>Showing {filteredProducts.length} of {products.length} products</span>
        </div>
      </div>



      {/* Overall Statistics Component - Show stats for filtered products */}
      {calculateFilteredStats && (
        <OverallStats
          overallStats={calculateFilteredStats}
          comparisonMode={comparisonMode}
        />
      )}

      <div className="table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th
                onClick={() => handleSort('groupid')}
                className={`sortable ${getSortClass('groupid')}`}
              >
                Group ID
              </th>
              <th
                onClick={() => handleSort('annual_profit')}
                className={`sortable ${getSortClass('annual_profit')}`}
              >
                Annual Profit
              </th>
              <th
                onClick={() => handleSort('sold_qty')}
                className={`sortable ${getSortClass('sold_qty')}`}
              >
                Sold Qty
              </th>
              <th
                onClick={() => handleSort('avg_profit_per_unit')}
                className={`sortable ${getSortClass('avg_profit_per_unit')}`}
              >
                Avg Profit/Unit
              </th>
              <th 
                onClick={() => handleSort('segment')}
                className={`sortable ${getSortClass('segment')}`}
              >
                Segment
              </th>
              <th 
                onClick={() => handleSort('brand')}
                className={`sortable ${getSortClass('brand')}`}
              >
                Brand
              </th>
              <th 
                onClick={() => handleSort('owner')}
                className={`sortable ${getSortClass('owner')}`}
              >
                Owner
              </th>
              <th 
                onClick={() => handleSort('avg_gross_margin')}
                className={`sortable ${getSortClass('avg_gross_margin')}`}
              >
                Gross Margin
              </th>
              <th 
                onClick={() => handleSort('review_date')}
                className={`sortable ${getSortClass('review_date')}`}
              >
                Last Review
              </th>
              <th 
                onClick={() => handleSort('next_review_date')}
                className={`sortable ${getSortClass('next_review_date')}`}
              >
                Next Review
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product, index) => (
              <tr key={`${product.groupid}-${index}`}>
                <td className="groupid-cell">{product.groupid || '-'}</td>
                <td className="profit-cell">
                  {formatComparison(
                    product.annual_profit,
                    product.changes?.annual_profit_change,
                    product.changes?.annual_profit_change_percent
                  )}
                </td>
                <td className="qty-cell">
                  {formatQtyComparison(
                    product.sold_qty,
                    product.changes?.sold_qty_change,
                    product.changes?.sold_qty_change_percent
                  )}
                </td>
                <td className="profit-unit-cell">
                  {formatComparison(
                    product.avg_profit_per_unit,
                    product.changes?.avg_profit_per_unit_change,
                    product.changes?.avg_profit_per_unit_change_percent
                  )}
                </td>
                <td className={`segment-cell segment-${(product.segment || '').toLowerCase()}`}>
                  {product.segment || '-'}
                </td>
                <td className="brand-cell">{product.brand || '-'}</td>
                <td className="owner-cell">{product.owner || '-'}</td>
                <td className="margin-cell">{formatPercentage(product.avg_gross_margin)}</td>
                <td className="date-cell">{formatDate(product.review_date)}</td>
                <td className="date-cell">{formatDate(product.next_review_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredProducts.length === 0 && !loading && (
        <div className="no-results">
          <p>No products found matching your search criteria.</p>
        </div>
      )}
    </div>
  );
};

export default ProductsScreen;
