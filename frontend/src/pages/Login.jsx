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
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page">
      <div className="form-card">
        <h1 className="page-title" style={{ fontSize: 24, textAlign: 'center' }}>Log in</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>College email</label>
            <input name="email" type="email" required value={form.email} onChange={handleChange} />
          </div>
          <div className="field">
            <label>Password</label>
            <input name="password" type="password" required value={form.password} onChange={handleChange} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-navy btn-block" disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="helper-text">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
