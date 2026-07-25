import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          <svg className="brand-icon" viewBox="0 0 24 24">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4l7 3.82 7-3.82v-4L12 17l-7-3.82z" />
          </svg>
          Campus<span>Trade</span>
        </Link>
        <div className="nav-links">
          <Link to="/" className={isActive('/') ? 'active-link' : ''}>
            Browse
          </Link>
          {user && (
            <Link to="/my-listings" className={isActive('/my-listings') ? 'active-link' : ''}>
              My Listings
            </Link>
          )}
          {user && (
            <Link to="/chat" className={isActive('/chat') ? 'active-link' : ''}>
              Messages
            </Link>
          )}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link to="/sell" className="btn-primary" style={{ padding: '8px 14px', borderRadius: 4 }}>
                + Sell Item
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="seller-avatar" style={{ width: 32, height: 32, fontSize: 14 }}>
                  {user.name?.[0] || 'U'}
                </span>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  style={{ opacity: 0.85 }}
                >
                  Log out
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link to="/login" className={isActive('/login') ? 'active-link' : ''}>
                Log in
              </Link>
              <Link to="/register" className="btn-primary" style={{ padding: '8px 14px', borderRadius: 4 }}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
