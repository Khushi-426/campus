import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          Campus<span>Trade</span>
        </Link>
        <div className="nav-links">
          <Link to="/">Browse</Link>
          {user && <Link to="/my-listings">My Listings</Link>}
          {user && <Link to="/chat">Messages</Link>}
          {user ? (
            <>
              <Link to="/sell" className="btn-primary" style={{ padding: '6px 12px', borderRadius: 4 }}>
                + Sell an item
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register" className="btn-primary" style={{ padding: '6px 12px', borderRadius: 4 }}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
