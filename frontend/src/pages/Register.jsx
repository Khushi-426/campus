import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BRANCHES = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical', 'Chemical', 'Other'];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', year: '1', branch: 'Computer Science', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ ...form, year: Number(form.year) });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check form details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="form-card" style={{ width: '100%', maxWidth: 520 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 800, textAlign: 'center', color: 'var(--text-main)', marginBottom: 6 }}>
          Join CampusTrade
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
          Connect with campus seniors and juniors for textbook & gear resale.
        </p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Full Name</label>
            <input
              name="name"
              required
              placeholder="e.g. Aarav Sharma"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div className="field">
            <label>College Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="aarav@college.edu"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="field">
            <label>Password (Min. 6 characters)</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field">
              <label>Year of Study</label>
              <select name="year" value={form.year} onChange={handleChange}>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
                <option value="5">5th Year / M.Tech</option>
              </select>
            </div>

            <div className="field">
              <label>Branch / Department</label>
              <select name="branch" value={form.branch} onChange={handleChange}>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Phone Number (Optional)</label>
            <input
              name="phone"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <button className="btn-primary" style={{ marginTop: 8 }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="helper-text">
          Already have an account? <Link to="/login" style={{ fontWeight: 700, color: 'var(--primary)' }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
