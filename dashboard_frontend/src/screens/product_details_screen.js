/*
Product Details Screen
Displays detailed information for a specific product including current performance data,
historical weekly performance trends, and SKU details
*/

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getProductDetails, getMorePriceChanges } from '../api/get_product_details_api';
import './product_details_screen.css';

const ProductDetailsScreen = () => {
  const { groupid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [pricePagination, setPricePagination] = useState(null);
  const [loadingMorePrices, setLoadingMorePrices] = useState(false);
  const [salesDisplayCount, setSalesDisplayCount] = useState(5);

  // Load product details on component mount
  useEffect(() => {
    loadProductDetails();
  }, [groupid]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Handles navigation back to products list with preserved filter state
   */
  const handleBackToProducts = () => {
    // Use the current URL search parameters to preserve filter state
    const returnUrl = location.search ? `/products${location.search}` : '/products';
    navigate(returnUrl);
  };

  /**
   * Fetches product details from the API
   */
  const loadProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`PRODUCT_DETAILS: Loading details for groupid: ${groupid}`);
      
      const result = await getProductDetails(groupid);
      
      if (result.success) {
        setProduct(result.product);
        setPriceHistory(result.product.price_history || []);
        setPricePagination(result.product.price_history_pagination || null);
        console.log('PRODUCT_DETAILS: Product details loaded successfully');
        console.log('PRODUCT_DETAILS: Sales data:', result.product.sales_data);
        console.log('PRODUCT_DETAILS: SKU details:', result.product.sku_details);
      } else {
        setError(result.message || 'Failed to load product details');
        console.error('PRODUCT_DETAILS: Failed to load product details:', result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred while loading product details');
      console.error('PRODUCT_DETAILS: Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Formats currency values for display
   */
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Gets CSS class for segment styling
   */
  const getSegmentClass = (segment) => {
    if (!segment) return '';
    return `segment-${segment.toLowerCase()}`;
  };

  /**
   * Loads more price changes for pagination
   */
  const loadMorePriceChanges = async () => {
    if (!pricePagination || !pricePagination.has_more || loadingMorePrices) {
      return;
    }

    try {
      setLoadingMorePrices(true);

      const nextOffset = pricePagination.offset + pricePagination.limit;
      console.log(`PRODUCT_DETAILS: Loading more price changes, offset: ${nextOffset}`);

      const result = await getMorePriceChanges(groupid, 10, nextOffset);

      if (result.success) {
        // Append new price changes to existing ones
        setPriceHistory(prevHistory => [...prevHistory, ...result.price_history]);
        setPricePagination(result.pagination);
        console.log('PRODUCT_DETAILS: More price changes loaded successfully');
      } else {
        console.error('PRODUCT_DETAILS: Failed to load more price changes:', result.error);
      }
    } catch (err) {
      console.error('PRODUCT_DETAILS: Unexpected error loading more price changes:', err);
    } finally {
      setLoadingMorePrices(false);
    }
  };

  if (loading) {
    return (
      <div className="product-details-screen">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-details-screen">
        <div className="error-container">
          <h2>Error Loading Product Details</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={loadProductDetails} className="retry-button">
              Try Again
            </button>
            <button onClick={handleBackToProducts} className="back-button">
              Back to Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-details-screen">
        <div className="not-found-container">
          <h2>Product Not Found</h2>
          <p>The product with ID "{groupid}" could not be found.</p>
          <button onClick={handleBackToProducts} className="back-button">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-details-screen">
      {/* Header */}
      <div className="product-header">
        <div className="header-content">
          <button onClick={handleBackToProducts} className="back-button">
            ← Back to Products
          </button>
          <h1>Product Details: {product.groupid}</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="product-content">
        {/* Product Image and Basic Information */}
        <div className="product-overview">
          {/* Product Image */}
          {product.sku_details?.imagename ? (
            <div className="product-image-container">
              <img
                src={`https://images.brookfieldcomfort.com/${product.sku_details.imagename}`}
                alt={`Product ${product.groupid}`}
                className="product-image"
                onError={(e) => {
                  console.error('Image failed to load');
                  console.error('URL:', `https://images.brookfieldcomfort.com/${product.sku_details.imagename}`);
                  console.error('Error event:', e);

                  // Try loading as background image instead
                  const imageUrl = `https://images.brookfieldcomfort.com/${product.sku_details.imagename}`;
                  const testDiv = document.createElement('div');
                  testDiv.style.backgroundImage = `url(${imageUrl})`;
                  testDiv.style.width = '100%';
                  testDiv.style.height = '100%';
                  testDiv.style.backgroundSize = 'cover';
                  testDiv.style.backgroundPosition = 'center';

                  // Replace the img with background div
                  const container = e.target.parentNode;
                  container.removeChild(e.target);
                  container.removeChild(e.target.nextSibling);
                  container.appendChild(testDiv);

                  console.log('Trying background image approach');
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', `https://images.brookfieldcomfort.com/${product.sku_details.imagename}`);
                }}
              />
              <div className="image-placeholder" style={{ display: 'none' }}>
                <span>Image not available</span>
                <div style={{ fontSize: '11px', marginTop: '8px', color: '#666', wordBreak: 'break-all', lineHeight: '1.3' }}>
                  Attempted URL:<br/>
                  https://images.brookfieldcomfort.com/{product.sku_details.imagename}
                </div>
              </div>
            </div>
          ) : (
            <div className="product-image-container">
              <div className="image-placeholder">
                <span>No image name in database</span>
              </div>
            </div>
          )}

          {/* Basic Information Card */}
          <div className="info-card">
            <h2>Basic Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Product Title:</label>
                <span>{product.shopify_title || product.groupid}</span>
              </div>
              <div className="info-item">
                <label>Product Supplier:</label>
                <span>{product.brand || '-'}</span>
              </div>
              <div className="info-item">
                <label>Group ID:</label>
                <span>{product.groupid}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics Card */}
        <div className="info-card">
          <h2>Performance Metrics</h2>
          <div className="metrics-grid">
            <div className="metric-item">
              <label>Annual Profit</label>
              <span className="metric-value profit">
                {formatCurrency(product.annual_profit)}
              </span>
            </div>
            <div className="metric-item">
              <label>Sold Quantity</label>
              <span className="metric-value quantity">
                {product.sold_qty.toLocaleString()}
              </span>
            </div>
            <div className="metric-item">
              <label>Avg Profit/Unit</label>
              <span className="metric-value profit-unit">
                {formatCurrency(product.avg_profit_per_unit)}
              </span>
            </div>
            <div className="metric-item">
              <label>Current Price</label>
              <span className="metric-value current-price">
                {formatCurrency(product.current_price)}
              </span>
            </div>
            <div className="metric-item">
              <label>Recommended Price</label>
              <span className="metric-value recommended-price">
                {formatCurrency(product.recommended_price)}
              </span>
            </div>
          </div>
        </div>

        {/* Review Information Card */}
        <div className="info-card">
          <h2>Review Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Last Review:</label>
              <span>{formatDate(product.review_date)}</span>
            </div>
            <div className="info-item">
              <label>Next Review:</label>
              <span>{formatDate(product.next_review_date)}</span>
            </div>
          </div>
          {product.notes && (
            <div className="notes-section">
              <label>Notes:</label>
              <p className="notes-text">{product.notes}</p>
            </div>
          )}
        </div>

        {/* Price Change History and Sales Data - Side by Side */}
        <div className="side-by-side-container">
          {/* Price Change History */}
          {priceHistory && priceHistory.length > 0 && (
            <div className="info-card compact-card">
              <h2>Price Change History</h2>
              <div className="price-table-container">
                <table className="price-table compact-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Old Price</th>
                      <th>New Price</th>
                      <th>Change</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistory.slice(0, 10).map((change, index) => (
                      <tr key={index}>
                        <td>{formatDate(change.date)}</td>
                        <td>{change.old_price ? formatCurrency(change.old_price) : '-'}</td>
                        <td>{change.new_price ? formatCurrency(change.new_price) : '-'}</td>
                        <td>
                          {change.change_amount !== null && change.change_percent !== null ? (
                            <div className="price-change">
                              <span className={`change-amount ${change.change_amount >= 0 ? 'positive' : 'negative'}`}>
                                {change.change_amount >= 0 ? '+' : ''}{formatCurrency(change.change_amount)}
                              </span>
                              <span className={`change-percent ${change.change_percent >= 0 ? 'positive' : 'negative'}`}>
                                ({change.change_percent >= 0 ? '+' : ''}{change.change_percent.toFixed(2)}%)
                              </span>
                            </div>
                          ) : '-'}
                        </td>
                        <td>{change.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Compact Summary */}
              {pricePagination && (
                <div className="compact-summary">
                  Showing {Math.min(10, priceHistory.length)} of {pricePagination.total_count} price changes
                  {pricePagination.has_more && priceHistory.length >= 10 && (
                    <button
                      onClick={loadMorePriceChanges}
                      disabled={loadingMorePrices}
                      className="compact-show-more"
                    >
                      {loadingMorePrices ? 'Loading...' : 'Show More'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sales Data */}
          <div className="info-card compact-card">
            <h2>Sales History</h2>
            {product.sales_data && product.sales_data.length > 0 ? (
              <>
                <div className="sales-table-container">
                  <table className="sales-table compact-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Price</th>
                        <th>Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.sales_data.slice(0, Math.min(salesDisplayCount, 10)).map((sale, index) => (
                        <tr key={index}>
                          <td>{formatDate(sale.date || sale.solddate)}</td>
                          <td>{sale.soldprice ? formatCurrency(sale.soldprice) : '-'}</td>
                          <td>{sale.code || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Compact Summary */}
                <div className="compact-summary">
                  Showing {Math.min(salesDisplayCount, 10, product.sales_data.length)} of {product.sales_data.length} sales records
                  {product.sales_data.length > Math.min(salesDisplayCount, 10) && (
                    <button
                      onClick={() => setSalesDisplayCount(prev => Math.min(prev + 5, product.sales_data.length))}
                      className="compact-show-more"
                    >
                      Show More
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="no-sales-data compact-no-data">
                <p>No sales data available for this product.</p>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Performance History */}
        {product.weekly_performance && product.weekly_performance.length > 0 && (
          <div className="info-card">
            <h2>Weekly Performance History</h2>
            <div className="weekly-table-container">
              <table className="weekly-table">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Annual Profit</th>
                    <th>Sold Qty</th>
                    <th>Avg Profit/Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {product.weekly_performance.map((week, index) => (
                    <tr key={week.year_week}>
                      <td>{week.year_week}</td>
                      <td>{formatCurrency(week.annual_profit)}</td>
                      <td>{week.sold_qty.toLocaleString()}</td>
                      <td>{formatCurrency(week.avg_profit_per_unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default ProductDetailsScreen;
