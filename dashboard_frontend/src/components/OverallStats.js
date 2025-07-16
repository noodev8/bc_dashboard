/*
Overall Statistics Component
Displays key performance metrics with trend indicators showing whether values are improving or declining
Shows total profits, sales quantities, average margins, and product counts with week-over-week changes
*/

import React from 'react';
import './OverallStats.css';

const OverallStats = ({ overallStats, comparisonMode }) => {
  // Helper function to format currency
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '£0.00';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Helper function to format numbers
  const formatNumber = (value) => {
    if (value === null || value === undefined) return '0';
    return new Intl.NumberFormat('en-GB').format(value);
  };

  // Helper function to format percentages
  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '0.00%';
    return `${value.toFixed(2)}%`;
  };

  // Helper function to get trend indicator
  const getTrendIndicator = (changeValue, changePercent) => {
    if (!comparisonMode || changeValue === 0) {
      return { icon: '➖', className: 'neutral', text: 'No change' };
    }
    
    if (changeValue > 0) {
      return { 
        icon: '📈', 
        className: 'positive', 
        text: `+${formatPercentage(Math.abs(changePercent))}` 
      };
    } else {
      return { 
        icon: '📉', 
        className: 'negative', 
        text: `-${formatPercentage(Math.abs(changePercent))}` 
      };
    }
  };

  // Helper function to get change display
  const getChangeDisplay = (changeValue, changePercent, isPositiveGood = true) => {
    if (!comparisonMode || changeValue === null || changeValue === undefined) return null;

    const trend = getTrendIndicator(changeValue, changePercent);
    const isGoodChange = isPositiveGood ? changeValue >= 0 : changeValue <= 0;

    return (
      <div className={`change-indicator ${trend.className} ${isGoodChange ? 'good' : 'bad'}`}>
        <span className="trend-icon">{trend.icon}</span>
        <span className="change-text">{trend.text}</span>
      </div>
    );
  };

  if (!overallStats) {
    return (
      <div className="overall-stats-container">
        <div className="stats-loading">Loading overall statistics...</div>
      </div>
    );
  }

  const { current, changes } = overallStats;

  // Safe access to changes with fallback to empty object
  const safeChanges = changes || {};

  return (
    <div className="stats-grid">
      {/* Total Annual Profit */}
      <div className="stat-card profit-card">
        <div className="stat-header">
          <span className="stat-icon">💰</span>
          <span className="stat-title">Total Annual Profit</span>
        </div>
        <div className="stat-value">
          {formatCurrency(current.total_annual_profit)}
        </div>
        {getChangeDisplay(
          safeChanges.total_annual_profit_change,
          safeChanges.total_annual_profit_change_percent,
          true
        )}
      </div>

      {/* Total Sold Quantity */}
      <div className="stat-card sales-card">
        <div className="stat-header">
          <span className="stat-icon">📦</span>
          <span className="stat-title">Total Units Sold</span>
        </div>
        <div className="stat-value">
          {formatNumber(current.total_sold_qty)}
        </div>
        {getChangeDisplay(
          safeChanges.total_sold_qty_change,
          safeChanges.total_sold_qty_change_percent,
          true
        )}
      </div>
    </div>
  );
};

export default OverallStats;
