import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import ProductCard from '../components/ProductCard';

const CATEGORIES = ['book', 'calculator', 'lab-equipment', 'stationery', 'electronics', 'other'];

export default function Home() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 12 };
      if (search) params.search = search;
      if (category) params.category = category;
      if (maxPrice) params.maxPrice = maxPrice;

      const { data } = await api.get('/products', { params });
      setItems(data.items);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError('Could not load listings. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [page, search, category, maxPrice]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  return (
    <div className="container page">
      <h1 className="page-title">Second-hand textbooks & gear</h1>
      <p className="page-sub">Bought by a senior, priced for a junior. No middlemen.</p>

      <form className="filters" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Search 'Data Structures', 'FX 991', ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Max price"
          value={maxPrice}
          onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
          style={{ width: 110 }}
        />
        <button type="submit" className="btn btn-navy">Search</button>
      </form>

      {loading && <p>Loading listings…</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && items.length === 0 && <p>No listings match your filters yet.</p>}

      <div className="grid">
        {items.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 28 }}>
          <button
            className="btn btn-outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span style={{ alignSelf: 'center', fontSize: 14 }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
