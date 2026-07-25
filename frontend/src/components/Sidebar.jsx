import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { getSocket } from '../socket';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const isActive = (path) => location.pathname === path;

  // Fetch unread / active chat count
  useEffect(() => {
    if (!user) {
      setUnreadChatCount(0);
      return;
    }

    let isMounted = true;
    api.get('/chat')
      .then(({ data }) => {
        if (!isMounted) return;
        setUnreadChatCount(data.items?.length || 0);
      })
      .catch(() => {});

    // Listen for live socket chat notifications
    const socket = getSocket();
    const handleChatNotif = () => {
      if (isMounted) setUnreadChatCount((prev) => prev + 1);
    };

    socket.on('chat_notification', handleChatNotif);

    return () => {
      isMounted = false;
      socket.off('chat_notification', handleChatNotif);
    };
  }, [user]);

  return (
    <aside className="app-sidebar">
      {/* Brand Logo Header */}
      <Link to="/" className="sidebar-logo">
        <div className="logo-icon-purple">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="#ffffff">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4l7 3.82 7-3.82v-4L12 17l-7-3.82z" />
          </svg>
        </div>
        <span className="logo-text">Campus<span>Cycle</span></span>
      </Link>

      {/* User Profile Mini Badge */}
      {user ? (
        <div className="sidebar-user-card">
          <div className="user-avatar-wrap">
            <div className="avatar-img">
              {user.avatarInitial || user.name?.[0] || 'U'}
            </div>
            <span className="online-dot" />
          </div>
          <div className="user-info-meta">
            <div className="user-name">Hi, {user.name?.split(' ')[0] || 'Student'} 👋</div>
            <div className="user-email">{user.email || 'student@college.edu'}</div>
            <div className="verified-pill">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="#4f46e5">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <span>Verified Student</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="sidebar-user-card guest-card">
          <div className="user-name">Welcome Guest 👋</div>
          <div className="user-email" style={{ marginBottom: 8 }}>Sign in to message sellers</div>
          <Link to="/login" className="btn-sidebar-login">Log In / Register</Link>
        </div>
      )}

      {/* Main Navigation Items */}
      <nav className="sidebar-nav">
        <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span>Home</span>
        </Link>

        <Link to="/?category=" className={`nav-item ${isActive('/browse') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <span>Browse</span>
        </Link>

        {user && (
          <Link to="/my-listings" className={`nav-item ${isActive('/my-listings') ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
            <span>My Listings</span>
          </Link>
        )}

        {user && (
          <Link to="/saved" className={`nav-item ${isActive('/saved') ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span>Saved</span>
          </Link>
        )}

        {user && (
          <Link to="/chat" className={`nav-item ${isActive('/chat') ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
            <span>Chats</span>
            {unreadChatCount > 0 && <span className="nav-badge-pill">{unreadChatCount}</span>}
          </Link>
        )}

        {user && (
          <button
            className="nav-item logout-btn"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
            <span>Logout</span>
          </button>
        )}
      </nav>

      {/* Post an Item CTA Button */}
      <Link to={user ? "/sell" : "/login"} className="btn-sidebar-post">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        <span>Post an Item</span>
      </Link>

      {/* Promo Box at Bottom of Sidebar */}
      <div className="sidebar-promo-card">
        <div className="promo-title">Donate. Share. Inspire.</div>
        <div className="promo-text">Give your old textbooks & lab gear a new purpose.</div>
        <Link to="/" className="promo-link">Explore Now →</Link>
      </div>
    </aside>
  );
}
