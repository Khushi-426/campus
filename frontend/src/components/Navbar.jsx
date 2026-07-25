import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['All', 'book', 'calculator', 'lab-equipment', 'stationery', 'electronics', 'other'];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (selectedCat && selectedCat !== 'All') params.set('category', selectedCat);
    navigate(`/?${params.toString()}`);
  };

  return (
    <>
      {/* Top Banner (Amazon Style Location & Guarantee Header) */}
      <div className="header-top-bar">
        <div className="container header-top-inner">
          <div className="location-badge">
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <span>Campus Pickup: Library, Canteen & Hostel Block A</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <span>🤝 Verified Student-to-Student Resale</span>
            <span>⚡ 0% Brokerage Fee</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="brand-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--mustard-500)">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4l7 3.82 7-3.82v-4L12 17l-7-3.82z" />
            </svg>
            Campus<span>Trade</span>
          </Link>

          {/* Search Bar (Amazon / Flipkart Style) */}
          <form className="header-search-bar" onSubmit={handleSearchSubmit}>
            <select
              className="search-category-select"
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Items' : cat}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="search-input"
              placeholder="Search textbooks, Casio calculators, lab coats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-btn" title="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </form>

          {/* Action Icons & CTAs */}
          <div className="nav-actions">
            <Link to="/" className={`nav-action-btn ${location.pathname === '/' ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              <span>Explore</span>
            </Link>

            {user && (
              <Link to="/my-listings" className={`nav-action-btn ${location.pathname === '/my-listings' ? 'active' : ''}`}>
                <svg viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                </svg>
                <span>My Listings</span>
              </Link>
            )}

            {user && (
              <Link to="/chat" className={`nav-action-btn ${location.pathname === '/chat' ? 'active' : ''}`}>
                <svg viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
                </svg>
                <span>Messages</span>
              </Link>
            )}

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Link to="/sell" className="btn-sell-now">
                  <span>+ Sell Gear</span>
                </Link>

                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="nav-action-btn"
                  title="Logout"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link to="/login" className="nav-action-btn">
                  <span>Login</span>
                </Link>
                <Link to="/register" className="btn-sell-now">
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
