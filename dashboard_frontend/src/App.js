/*
Main Application Component
Sets up routing and global layout for the BC dashboard application
Provides navigation between different screens and manages global state
*/

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProductsScreen from './screens/products_screen';
import ProductDetailsScreen from './screens/product_details_screen';
import './App.css';

function App() {
  return (
    <div className="App">
      <Router>
        <main className="app-main">
          <Routes>
            {/* Default route redirects to products */}
            <Route path="/" element={<Navigate to="/products" replace />} />
            
            {/* Products dashboard route */}
            <Route path="/products" element={<ProductsScreen />} />

            {/* Product details route */}
            <Route path="/products/:groupid" element={<ProductDetailsScreen />} />

            {/* Catch-all route for 404 */}
            <Route path="*" element={
              <div className="not-found">
                <h2>Page Not Found</h2>
                <p>The page you're looking for doesn't exist.</p>
                <a href="/products">Go to BC Products Dashboard</a>
              </div>
            } />
          </Routes>
        </main>
      </Router>
    </div>
  );
}

export default App;
