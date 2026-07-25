import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['book', 'calculator', 'lab-equipment', 'stationery', 'electronics', 'other'];
const CONDITIONS = ['new', 'like-new', 'good', 'fair', 'worn'];

export default function SellItem() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'book',
    price: '',
    condition: 'good',
  });
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        images,
      };
      const { data } = await api.post('/products', payload);
      navigate(`/product/${data.product._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create listing. Please check form details.');
    } finally {
      setLoading(false);
    }
  };

  // Preview object for real-time card rendering
  const mockProductForPreview = {
    _id: 'preview',
    title: form.title || 'Your Product Title Will Appear Here',
    description: form.description || 'Condition details and seller notes...',
    category: form.category,
    price: Number(form.price) || 0,
    condition: form.condition,
    images: images,
    seller: {
      name: user?.name || 'You (Seller)',
      branch: user?.branch || 'Senior Student',
    },
    viewCount: 1,
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="container" style={{ padding: '32px 20px 64px' }}>
      <div className="sell-split-layout">
        {/* Form Container */}
        <div className="form-card" style={{ maxWidth: '100%', margin: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, color: 'var(--navy-900)', margin: '0 0 6px' }}>
            List Gear for Campus Resale
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
            Pass down your textbooks, calculators, and lab gear to junior students.
          </p>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Item Title</label>
              <input
                name="title"
                required
                placeholder="e.g. Casio FX-991CW ClassWiz Scientific Calculator"
                value={form.title}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Description & Notes</label>
              <textarea
                name="description"
                required
                placeholder="Describe condition, edition year, any highlights inside, included accessories, library pickup time..."
                value={form.description}
                onChange={handleChange}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="field">
                <label>Category</label>
                <select name="category" value={form.category} onChange={handleChange}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Item Condition</label>
                <select name="condition" value={form.condition} onChange={handleChange}>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Selling Price (₹, enter 0 for Free)</label>
              <input
                name="price"
                type="number"
                min="0"
                required
                placeholder="e.g. 450"
                value={form.price}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Upload Photos (1 or more)</label>
              <label className="upload-area">
                <svg viewBox="0 0 24 24" width="36" height="36" fill="var(--navy-800)" style={{ marginBottom: 6 }}>
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                </svg>
                <div style={{ fontWeight: 700, color: 'var(--navy-900)', fontSize: 14 }}>Click to choose photos</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Select JPG, PNG or WEBP images</div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                />
              </label>

              {images.length > 0 && (
                <div className="thumb-preview-grid">
                  {images.map((img, idx) => (
                    <div key={idx} className="thumb-preview-item">
                      <img src={img} alt={`Preview ${idx + 1}`} />
                      <button
                        type="button"
                        className="btn-remove-thumb"
                        onClick={() => removeImage(idx)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="action-chat-btn" style={{ marginTop: 12 }} disabled={loading}>
              {loading ? 'Publishing Listing...' : 'Publish Listing Now'}
            </button>
          </form>
        </div>

        {/* Live Real-Time Product Card Preview */}
        <div className="preview-sticky-box">
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 12 }}>
            👁️ Live Marketplace Preview
          </div>
          <ProductCard product={mockProductForPreview} />
        </div>
      </div>
    </div>
  );
}
