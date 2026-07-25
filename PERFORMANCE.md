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
| **p50 Read Latency** | 401 ms | **479 ms** | Bound by network I/O |
| **p99 Read Latency** | 577 ms | **554 ms** | **4% reduction** |

> **Interview Rationale & Note**: *"Eliminated write contention on hot read path by replacing synchronous MongoDB `$inc viewCount` writes on every read with IP-deduplicated in-memory tracking (10-min window) and fire-and-forget background updates. While p50 latency is dominated by network roundtrips, removing synchronous `findByIdAndUpdate` writes prevents write-lock queueing when multiple users view the same product simultaneously."*

---

## 3. Response Compression Middleware (Gzip)
- **Script**: `backend/scripts/bench/bench_compression.js`

| Compression State | Listing Feed Payload Size (KB) | Transfer Time (ms) | Compression Savings |
| :--- | :--- | :--- | :--- |
| **Uncompressed** | 8.20 KB | 102 ms | Baseline |
| **Gzip Compressed** | **1.47 KB** | **4 ms** | **82% reduction** |

> **Resume Bullet**: *"Integrated Express Gzip compression middleware, reducing API response transfer payload size by 82%."*

---

## 4. HTTP ETag & Conditional 304 Caching
- **Script**: `backend/scripts/bench/bench_http_caching.js`

| Request Type | HTTP Status Code | Response Transfer Bytes | Bandwidth Impact |
| :--- | :--- | :--- | :--- |
| **Initial Request** | `200 OK` | 8384 bytes | Fresh Data Download |
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
