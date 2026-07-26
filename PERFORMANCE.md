# CampusTrade Empirical Performance Benchmark Report

This document records empirical before/after measurements for all performance optimizations implemented in CampusTrade. Every benchmark script is committed under `backend/scripts/bench/` and can be executed via:

```bash
cd backend
node scripts/bench/run_performance_suite.js
```

---

## 1. Image Payload Offloading (Mongo Base64 vs Disk Static URLs)
- **Script**: `backend/scripts/bench/bench_image_offload.js`

| Metric | Before (Base64 in Document) | After (Static File URLs) | Impact / Reduction |
| :--- | :--- | :--- | :--- |
| **Average Listing Document Size** | ~250.5 KB | **~0.5 KB** | **99.8% smaller** |
| **12-Item Listing Feed Payload** | ~3,006 KB (~3.0 MB) | **~6 KB** | **99.8% bandwidth reduction** |

> **Resume Bullet**: *"Slashed listing endpoint response payload size from 3.0MB to 6KB (**99.8% reduction**) by offloading Base64 product images out of MongoDB documents to disk-served static file URLs."*

---

## 2. Product View Count Write Optimization
- **Script**: `backend/scripts/bench/bench_view_count.js`
- **Fix**: Replaced synchronous `findByIdAndUpdate({ $inc: { viewCount: 1 } })` on every read with in-memory IP/session deduplication (10-min TTL) and fire-and-forget background updates.

| Metric (50 Concurrent Requests) | Synchronous DB Write on Read | Deduplicated Fire-and-Forget Read | Latency Impact |
| :--- | :--- | :--- | :--- |
| **p50 Read Latency** | 462 ms | **193 ms** | Bound by network I/O |
| **p99 Read Latency** | 696 ms | **467 ms** | **33% reduction** |

> **Resume Bullet**: *"Eliminated write contention on hot read path by replacing synchronous MongoDB `$inc viewCount` writes with IP-deduplicated in-memory tracking and fire-and-forget background updates, preventing write-lock queueing under concurrent user loads."*

---

## 3. Response Compression Middleware (Gzip)
- **Script**: `backend/scripts/bench/bench_compression.js`

| Compression State | Listing Feed Payload Size (KB) | Transfer Time (ms) | Compression Savings |
| :--- | :--- | :--- | :--- |
| **Uncompressed** | 7.88 KB | 134 ms | Baseline |
| **Gzip Compressed** | **1.51 KB** | **8 ms** | **81% reduction** |

> **Resume Bullet**: *"Integrated Express Gzip compression middleware, reducing API response transfer payload size by 81%."*

---

## 4. HTTP ETag & Conditional 304 Caching
- **Script**: `backend/scripts/bench/bench_http_caching.js`

| Request Type | HTTP Status Code | Response Transfer Bytes | Bandwidth Impact |
| :--- | :--- | :--- | :--- |
| **Initial Request** | `200 OK` | 8063 bytes | Fresh Data Download |
| **Repeat Conditional Request** | **`304 Not Modified`** | **0 bytes** | **100% bandwidth saved** |

> **Resume Bullet**: *"Configured strong ETag and Cache-Control headers on API routes, eliminating payload transfer for repeat visitors via HTTP 304 Not Modified responses."*

---

## 5. Cache Key Normalization & Hit-Rate
- **Script**: `backend/scripts/bench/bench_cache_key.js`

| Metric | Measured Value |
| :--- | :--- |
| **Simulated Browsing Session Requests** | 7 requests |
| **Cache Hit Rate** | **57%** |
| **Filter Order Permutation Normalization** | **PASS** (`cat=book&min=100` matches `min=100&cat=book`) |

> **Resume Bullet**: *"Ensured cache key uniqueness across arbitrary filter permutations by implementing deterministic key parameter sorting, achieving a 57% hit rate over simulated browsing sessions."*

---

## 6. Frontend Performance (Search Debouncing & Image Lazy-Loading)
- **Script**: `backend/scripts/bench/bench_frontend_perf.js`

| Interaction | Unoptimized Request Count | Optimized Request Count | Efficiency Gain |
| :--- | :--- | :--- | :--- |
| **Typing 10-Char Search Term** | 10 HTTP requests | **1 HTTP request** | **90% fewer API calls** |
| **Product Grid Images** | Immediate download | `loading="lazy"` | Offscreen image deferral |

> **Resume Bullet**: *"Optimized frontend network traffic by debouncing search input keystrokes by 300ms (reducing query requests by 90%) and implementing native image lazy loading."*

---

## 7. MongoDB Connection Pooling (`maxPoolSize` / `minPoolSize`)
- **Script**: `backend/scripts/bench/benchmark_pooling.js`

| Pool Configuration | Concurrency | Total Duration (ms) | Requests / Sec | p50 Latency | p99 Latency |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Pool Size = 10** | 50 | 73 ms | 685 req/s | 63 ms | 67 ms |
| **Pool Size = 1** | 50 | 180 ms | 278 req/s | 71 ms | 169 ms |

> **Resume Bullet**: *"Configured explicit Mongoose connection pooling (`maxPoolSize: 10`, `minPoolSize: 2`), preventing connection starvation under high concurrent HTTP request bursts."*

---

## 8. Compound Index Execution Analysis (`.explain("executionStats")`)
- **Script**: `backend/scripts/bench/benchmark_indexing.js`

| Query Strategy | Winning Stage | Docs Examined | Execution Time |
| :--- | :--- | :--- | :--- |
| **With Compound Index `{ status: 1, category: 1, createdAt: -1 }`** | **LIMIT** | **12** | **0 ms** |
| **Without Index (Natural Scan)** | COLLSCAN ($natural hint) | 10001 | 7 ms |

> **Resume Bullet**: *"Optimized feed query performance by creating compound indexes on `{ status: 1, category: 1, createdAt: -1 }`, eliminating full collection scans (`COLLSCAN`) in MongoDB."*
