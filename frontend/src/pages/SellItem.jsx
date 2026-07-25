import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const CATEGORIES = ['book', 'calculator', 'lab-equipment', 'stationery', 'electronics', 'other'];
const CONDITIONS = ['new', 'like-new', 'good', 'fair', 'worn'];

export default function SellItem() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'book',
    price: '',
    condition: 'good',
  });
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, price: Number(form.price) };
      if (imagePreview) payload.images = [imagePreview];
      const { data } = await api.post('/products', payload);
      navigate(`/product/${data.product._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page">
      <div className="form-card" style={{ maxWidth: 560 }}>
        <h1 className="page-title" style={{ fontSize: 24 }}>List something for sale</h1>
        <p className="page-sub">Pass it on to a junior instead of letting it sit in a drawer.</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Title</label>
            <input name="title" required placeholder="e.g. Casio FX-991ES Plus" value={form.title} onChange={handleChange} />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea name="description" required placeholder="Condition details, edition, any notes inside, etc." value={form.description} onChange={handleChange} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Category</label>
              <select name="category" value={form.category} onChange={handleChange}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Condition</label>
              <select name="condition" value={form.condition} onChange={handleChange}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Price (₹, use 0 for free)</label>
            <input name="price" type="number" min="0" required value={form.price} onChange={handleChange} />
          </div>
          <div className="field">
            <label>Photo (optional)</label>
            <input type="file" accept="image/*" onChange={handleImage} />
            {imagePreview && (
              <img src={imagePreview} alt="preview" style={{ marginTop: 8, height: 120, objectFit: 'cover', borderRadius: 4 }} />
            )}
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-mustard btn-block" disabled={loading}>
            {loading ? 'Publishing…' : 'Publish listing'}
          </button>
        </form>
      </div>
    </div>
  );
}
