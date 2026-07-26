import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview'); // overview, users, listings, reports, audit
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [searchUser, setSearchUser] = useState('');
  const [searchListing, setSearchListing] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // Modal / Prompt State for mandatory reason on listing removal
  const [removeModal, setRemoveModal] = useState({ open: false, listingId: null, reason: '' });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    loadDashboardData();
  }, [user, activeTab]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    setActionMsg('');
    try {
      if (activeTab === 'overview') {
        const { data } = await api.get('/admin/dashboard');
        setStats(data);
      } else if (activeTab === 'users') {
        const { data } = await api.get(`/admin/users?search=${encodeURIComponent(searchUser)}`);
        setUsers(data.users);
      } else if (activeTab === 'listings') {
        const { data } = await api.get(`/admin/listings?search=${encodeURIComponent(searchListing)}`);
        setListings(data.items);
      } else if (activeTab === 'reports') {
        const { data } = await api.get('/admin/reports');
        setReports(data.reports);
      } else if (activeTab === 'audit') {
        const { data } = await api.get('/admin/audit');
        setAuditLogs(data.actions);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSuspend = async (userId) => {
    try {
      const { data } = await api.put(`/admin/users/${userId}/suspend`, { reason: 'Admin moderation toggle' });
      setActionMsg(data.message);
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to PERMANENTLY delete this user and all their listings?')) return;
    try {
      const { data } = await api.delete(`/admin/users/${userId}`);
      setActionMsg(data.message);
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleOpenRemoveListingModal = (listingId) => {
    setRemoveModal({ open: true, listingId, reason: '' });
  };

  const handleConfirmRemoveListing = async (e) => {
    e.preventDefault();
    if (!removeModal.reason.trim()) {
      alert('A valid reason is required for removing a listing');
      return;
    }
    try {
      const { data } = await api.delete(`/admin/listings/${removeModal.listingId}`, {
        data: { reason: removeModal.reason.trim() },
      });
      setActionMsg(data.message);
      setRemoveModal({ open: false, listingId: null, reason: '' });
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove listing');
    }
  };

  const handleUpdateReport = async (reportId, status) => {
    try {
      const { data } = await api.put(`/admin/reports/${reportId}`, { status });
      setActionMsg(data.message);
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update report');
    }
  };

  return (
    <div className="container" style={{ padding: '32px 20px 64px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>🛡️</span>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, color: 'var(--text-main)', margin: 0 }}>
              Campus Marketplace Admin Console
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            System overview, user moderation, policy enforcement, and audit logs.
          </p>
        </div>

        <span style={{ background: '#e0e7ff', color: 'var(--primary)', padding: '6px 14px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: 13 }}>
          Logged in as Administrator ({user?.email})
        </span>
      </div>

      {actionMsg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 20, fontWeight: 600 }}>
          ✓ {actionMsg}
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      {/* Admin Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-light)', marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { id: 'overview', label: '📊 System Dashboard' },
          { id: 'users', label: '👥 User Accounts' },
          { id: 'listings', label: '📦 Listings Moderation' },
          { id: 'reports', label: '🚩 Policy Reports' },
          { id: 'audit', label: '📜 Admin Audit Log' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : 'var(--text-muted)',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading analytics...</p>
          ) : stats ? (
            <div>
              {/* Stat Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Users</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>{stats.users.total}</div>
                  <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>{stats.users.active} Active • {stats.users.suspended} Suspended</div>
                </div>

                <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Listings</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>{stats.listings.total}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{stats.listings.createdLast7Days} added in last 7 days</div>
                </div>

                <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pending Reports</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 800, color: stats.reports.pending > 0 ? 'var(--danger)' : 'var(--success)', marginTop: 4 }}>
                    {stats.reports.pending}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Requires moderator review</div>
                </div>
              </div>

              {/* Breakdown Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16 }}>Listings Status Distribution</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Available</span>
                      <strong style={{ color: 'var(--success)' }}>{stats.listings.byStatus.available || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Reserved</span>
                      <strong style={{ color: 'var(--warning)' }}>{stats.listings.byStatus.reserved || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Sold</span>
                      <strong style={{ color: 'var(--text-muted)' }}>{stats.listings.byStatus.sold || 0}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16 }}>Most-Favorited Items</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                    {stats.mostFavoritedItems?.map((item) => (
                      <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
                        <span>{item.title}</span>
                        <strong style={{ color: 'var(--primary)' }}>❤️ {item.favCount} saves</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Search user by name or email..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
            />
            <button className="btn-purple-solid" onClick={loadDashboardData}>Search</button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-muted)' }}>
                <th style={{ padding: 10 }}>User</th>
                <th style={{ padding: 10 }}>Email</th>
                <th style={{ padding: 10 }}>Role</th>
                <th style={{ padding: 10 }}>Status</th>
                <th style={{ padding: 10, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: 10, fontWeight: 700 }}>{u.name}</td>
                  <td style={{ padding: 10, color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ padding: 10 }}><span className={`badge badge-${u.role || 'user'}`}>{(u.role || 'user').toUpperCase()}</span></td>
                  <td style={{ padding: 10 }}>
                    {u.isSuspended ? (
                      <span style={{ color: 'var(--danger)', fontWeight: 700 }}>⛔ Suspended</span>
                    ) : (
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>Active</span>
                    )}
                  </td>
                  <td style={{ padding: 10, textAlign: 'right' }}>
                    {(u.role || 'user') !== 'admin' && (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          className={u.isSuspended ? 'btn-success' : 'btn-secondary'}
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => handleToggleSuspend(u._id)}
                        >
                          {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                        <button
                          className="btn-danger"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => handleDeleteUser(u._id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: LISTING MODERATION */}
      {activeTab === 'listings' && (
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Search listings by title or description..."
              value={searchListing}
              onChange={(e) => setSearchListing(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
            />
            <button className="btn-purple-solid" onClick={loadDashboardData}>Search</button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-muted)' }}>
                <th style={{ padding: 10 }}>Title</th>
                <th style={{ padding: 10 }}>Seller</th>
                <th style={{ padding: 10 }}>Category</th>
                <th style={{ padding: 10 }}>Price</th>
                <th style={{ padding: 10, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: 10, fontWeight: 700 }}>{l.title}</td>
                  <td style={{ padding: 10, color: 'var(--text-muted)' }}>{l.seller?.email || 'Seller'}</td>
                  <td style={{ padding: 10, textTransform: 'capitalize' }}>{l.category}</td>
                  <td style={{ padding: 10, fontWeight: 700 }}>₹{l.price}</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>
                    <button
                      className="btn-danger"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => handleOpenRemoveListingModal(l._id)}
                    >
                      Unpublish / Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: REPORTS */}
      {activeTab === 'reports' && (
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16 }}>Policy Violation Reports</h3>

          {reports.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No reports requiring review.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reports.map((r) => (
                <div key={r._id} style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Reported {(r.targetType || 'item').toUpperCase()} (ID: {r.targetId})</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Reason: "{r.reason}"</div>
                    <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 4 }}>Filed by: {r.reporter?.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-success" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleUpdateReport(r._id, 'resolved')}>
                      Resolve
                    </button>
                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleUpdateReport(r._id, 'dismissed')}>
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AUDIT TRAIL LOG */}
      {activeTab === 'audit' && (
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16 }}>Administrative Action Audit Log</h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-muted)' }}>
                <th style={{ padding: 10 }}>Time</th>
                <th style={{ padding: 10 }}>Admin</th>
                <th style={{ padding: 10 }}>Action</th>
                <th style={{ padding: 10 }}>Target ID</th>
                <th style={{ padding: 10 }}>Reason Logged</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: 10, color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleString()}</td>
                  <td style={{ padding: 10, fontWeight: 600 }}>{log.admin?.name || log.admin?.email || 'Admin'}</td>
                  <td style={{ padding: 10 }}><span className="badge">{log.action}</span></td>
                  <td style={{ padding: 10, fontFamily: 'monospace' }}>{log.targetId}</td>
                  <td style={{ padding: 10, color: 'var(--text-muted)' }}>{log.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Mandatory Listing Removal Reason */}
      {removeModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleConfirmRemoveListing} style={{ background: '#ffffff', padding: 24, borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 460 }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 8px' }}>Unpublish Listing</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              A valid policy violation reason is required for administrative audit logging.
            </p>

            <textarea
              required
              placeholder="e.g. Counterfeit item, prohibited item on campus, spam listing..."
              value={removeModal.reason}
              onChange={(e) => setRemoveModal({ ...removeModal, reason: e.target.value })}
              style={{ width: '100%', height: 90, padding: 10, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 13, marginBottom: 16 }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn-secondary" onClick={() => setRemoveModal({ open: false, listingId: null, reason: '' })}>
                Cancel
              </button>
              <button type="submit" className="btn-danger">
                Confirm Removal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
