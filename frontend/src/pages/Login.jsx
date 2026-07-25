import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page">
      <div className="form-card">
        <h1 className="page-title" style={{ fontSize: 28, textAlign: 'center' }}>Welcome Back</h1>
        <p className="page-sub" style={{ textAlign: 'center' }}>Log in to chat with sellers and manage your campus listings.</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>College Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="name@college.edu"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <button className="btn btn-navy btn-block" style={{ marginTop: 12, fontSize: 16 }} disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="helper-text">
          Don't have an account yet? <Link to="/register" style={{ fontWeight: 600, color: 'var(--navy)' }}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}
