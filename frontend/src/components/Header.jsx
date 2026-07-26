import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Header() {
  const [query, setQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    api.get('/notifications')
      .then(({ data }) => {
        if (!isMounted) return;
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/?search=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/');
    }
  };

  const handleToggleNotif = async () => {
    setShowNotifDropdown((prev) => !prev);
    if (unreadCount > 0 && user) {
      try {
        await api.put('/notifications/read');
        setUnreadCount(0);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <header className="app-top-header">
      {/* Search Input Box */}
      <form className="top-search-form" onSubmit={handleSearchSubmit}>
        <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Search for books, calculators, lab coats..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      {/* Header Actions (Notification bell + Avatar) */}
      <div className="top-header-actions" style={{ position: 'relative' }}>
        {user && (
          <button className="icon-circle-btn" title="Notifications" onClick={handleToggleNotif}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
            {unreadCount > 0 && <span className="notif-red-dot" />}
          </button>
        )}

        {/* Notifications Dropdown Container */}
        {showNotifDropdown && (
          <div
            style={{
              position: 'absolute',
              top: 48,
              right: 50,
              width: 320,
              background: '#ffffff',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 200,
              padding: 16,
            }}
          >
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 14, marginBottom: 12, display: 'flex', justifyContent: 'space-between', color: 'var(--text-main)' }}>
              <span>In-App Notifications</span>
              <button onClick={() => setShowNotifDropdown(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {notifications.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>No notifications yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto' }}>
                {notifications.map((n) => (
                  <div
                    key={n._id}
                    style={{
                      padding: 10,
                      borderRadius: 'var(--radius-sm)',
                      background: n.read ? '#f8fafc' : 'var(--primary-subtle)',
                      borderLeft: `3px solid ${n.type === 'price_drop' ? '#10b981' : n.type === 'item_sold' ? '#ef4444' : 'var(--primary)'}`,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 2 }}>{n.message}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-subtle)' }}>{new Date(n.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {user && user.role === 'admin' && (
          <button
            className="btn-purple-solid"
            onClick={() => navigate('/admin')}
            style={{ padding: '6px 14px', fontSize: 13, gap: 6 }}
          >
            🛡️ Admin Console
          </button>
        )}

        {user ? (
          <div className="top-user-avatar-chip" title={`${user.name} (${(user.role || 'user').toUpperCase()})`} style={{ border: user?.role === 'admin' ? '2px solid #6366f1' : 'none' }}>
            {user.name?.[0] || 'U'}
          </div>
        ) : (
          <button className="btn-header-login" onClick={() => navigate('/login')}>
            Log In
          </button>
        )}
      </div>
    </header>
  );
}
