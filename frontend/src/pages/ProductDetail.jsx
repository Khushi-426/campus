import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [similarItems, setSimilarItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingChat, setStartingChat] = useState(false);

  // Review Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewMsg, setReviewMsg] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.get(`/products/${id}`)
      .then(({ data }) => {
        if (!isMounted) return;
        setProduct(data.product);
        setActiveImgIdx(0);

        // Fetch seller reviews
        if (data.product?.seller?._id) {
          api.get(`/reviews/seller/${data.product.seller._id}`)
            .then(({ data: revData }) => {
              if (isMounted) {
                setReviews(revData.reviews);
                setAvgRating(revData.avgRating);
              }
            })
            .catch(() => {});
        }

        // Fetch similar items in category
        if (data.product?.category) {
          api.get(`/products?category=${data.product.category}&limit=4`)
            .then(({ data: simData }) => {
              if (isMounted) {
                setSimilarItems(simData.items.filter((item) => item._id !== id));
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        if (isMounted) setError('Listing not found or failed to load.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleToggleFavorite = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/favorites/${id}`);
      setIsSaved(data.favorited);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChatWithSeller = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setStartingChat(true);
    try {
      const { data } = await api.post('/chat/start', { productId: id });
      navigate('/chat', { state: { conversationId: data.conversation._id } });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start conversation');
    } finally {
      setStartingChat(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewMsg('');
    try {
      await api.post('/reviews', { productId: id, rating, comment });
      setReviewMsg('Thank you! Your verified review has been published.');
      setComment('');
      // Reload seller reviews
      if (product?.seller?._id) {
        const { data: revData } = await api.get(`/reviews/seller/${product.seller._id}`);
        setReviews(revData.reviews);
        setAvgRating(revData.avgRating);
      }
    } catch (err) {
      setReviewMsg(err.response?.data?.message || 'Failed to post review.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32 }}>
        <div className="skeleton-pulse" style={{ width: '100%', aspectRatio: '4/3', borderRadius: 'var(--radius-xl)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="skeleton-pulse" style={{ width: '30%', height: 16 }} />
          <div className="skeleton-pulse" style={{ width: '80%', height: 32 }} />
          <div className="skeleton-pulse" style={{ width: '40%', height: 28 }} />
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div>
        <div className="error-banner">{error}</div>
        <Link to="/" className="btn-purple-solid">← Back to Home</Link>
      </div>
    );
  }

  if (!product) return null;

  const isOwnListing = user && String(product.seller?._id) === String(user.id);
  const images = product.images && product.images.length > 0 ? product.images : [];
  const activeImg = images[activeImgIdx];
  const price = product.price || 0;

  return (
    <div>
      {/* Breadcrumb Trail */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Link to="/" style={{ color: 'var(--text-muted)' }}>Home</Link>
          <span>›</span>
          <span style={{ textTransform: 'capitalize' }}>{product.category}</span>
          <span>›</span>
          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{product.title}</span>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="icon-circle-btn"
            style={{ color: isSaved ? '#ef4444' : 'var(--text-muted)' }}
            onClick={handleToggleFavorite}
            title={isSaved ? 'Remove from Watchlist' : 'Save to Watchlist'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill={isSaved ? '#ef4444' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          <button
            className="icon-circle-btn"
            style={{ color: 'var(--text-muted)' }}
            title="Report Policy Violation to Admin"
            onClick={async () => {
              if (!user) {
                navigate('/login');
                return;
              }
              const reason = window.prompt('Please describe the policy violation or reason for reporting this listing:');
              if (reason && reason.trim()) {
                try {
                  await api.post('/admin/reports', {
                    targetType: 'product',
                    targetId: id,
                    reason: reason.trim(),
                  });
                  alert('Thank you. Your report has been submitted to Campus Admins.');
                } catch (err) {
                  alert(err.response?.data?.message || 'Failed to submit report.');
                }
              }
            }}
          >
            🚩
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 32, alignItems: 'start' }}>
        {/* Left Column: Gallery */}
        <div style={{ display: 'flex', gap: 16 }}>
          {images.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImgIdx(idx)}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 'var(--radius-md)',
                    border: activeImgIdx === idx ? '2px solid var(--primary)' : '1px solid var(--border)',
                    overflow: 'hidden',
                    background: '#fff',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}

          <div style={{ flex: 1, aspectRatio: '4/3', background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
            {activeImg ? (
              <img src={activeImg} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ color: 'var(--text-subtle)', textAlign: 'center', padding: 40 }}>
                <span style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>📦</span>
                <span>No product image uploaded</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.3 }}>
              {product.title}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>
                {price === 0 ? 'FREE' : `₹${price.toLocaleString('en-IN')}`}
              </span>
              <span className="negotiable-tag" style={{ fontSize: 12, padding: '4px 10px' }}>Negotiable</span>
            </div>
          </div>

          {/* Seller Card */}
          <div style={{ background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="user-avatar-wrap">
              <div className="avatar-img" style={{ width: 44, height: 44 }}>
                {product.seller?.name?.[0] || 'S'}
              </div>
              <span className="online-dot" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>
                {product.seller?.name || 'Rahul Sharma'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {product.seller?.branch || '3rd Year, E&TC'} • ★ {avgRating > 0 ? avgRating : '4.8'} ({reviews.length} reviews)
              </div>
            </div>
          </div>

          {/* Product Info List */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Condition: </span>
              <strong style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>{product.condition || 'Excellent'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Category: </span>
              <strong style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>{product.category}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Location: </span>
              <strong style={{ color: 'var(--text-main)' }}>Hostel 1, Room 203</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Status: </span>
              <strong style={{ color: product.status === 'available' ? 'var(--success)' : 'var(--danger)', textTransform: 'uppercase' }}>
                {product.status}
              </strong>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Description</h4>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{product.description}</p>
          </div>

          {/* Action CTAs */}
          {isOwnListing ? (
            <div className="sidebar-promo-card">
              <div className="promo-title">Your Listing</div>
              <div className="promo-text">You are the seller of this item.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
              <button
                className="btn-purple-solid"
                style={{ width: '100%', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={handleChatWithSeller}
                disabled={startingChat}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
                {startingChat ? 'Connecting...' : 'Chat with Seller'}
              </button>

              <button className="btn-purple-ghost" style={{ width: '100%', padding: 12 }}>
                Make an Offer
              </button>
            </div>
          )}

          {/* Leave Verified Buyer Review Form */}
          {user && !isOwnListing && (
            <div style={{ background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 16, marginTop: 8 }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                Leave a Verified Buyer Review
              </h4>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                (Allowed if you started a chat thread with the seller for this item)
              </p>

              {reviewMsg && <div className="error-banner" style={{ fontSize: 12, padding: 8 }}>{reviewMsg}</div>}

              <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Rating:</label>
                  <select value={rating} onChange={(e) => setRating(Number(e.target.value))} style={{ padding: '4px 8px', borderRadius: 4 }}>
                    <option value="5">5 ★★★★★ (Excellent)</option>
                    <option value="4">4 ★★★★☆ (Good)</option>
                    <option value="3">3 ★★★☆☆ (Average)</option>
                    <option value="2">2 ★★☆☆☆ (Poor)</option>
                    <option value="1">1 ★☆☆☆☆ (Terrible)</option>
                  </select>
                </div>
                <textarea
                  required
                  placeholder="Write a brief review of your transaction..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{ width: '100%', height: 60, padding: 8, borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }}
                />
                <button className="btn-purple-solid" style={{ width: 'fit-content', padding: '6px 14px', fontSize: 12 }}>
                  Submit Review
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Similar Items Carousel Grid */}
      {similarItems.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 800 }}>Similar Items</h3>
            <Link to="/" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>View all</Link>
          </div>

          <div className="products-grid-saas">
            {similarItems.map((item) => (
              <ProductCard key={item._id} product={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
