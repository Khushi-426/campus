# CampusTrade — MERN Marketplace for Passing Down Textbooks & Gear

A resale platform for students to sell used books, calculators, lab equipment,
etc. to juniors instead of letting them collect dust. Buyers can chat with
sellers in real time before buying. Pure MERN + Socket.io — **no ML**.

## Stack

- **MongoDB** (Mongoose) — data + indexes
- **Express** — REST API
- **React** — frontend (react-router, context API, no Redux needed at this scale)
- **Node.js**
- **Socket.io** — real-time chat (WebSocket, falls back to polling automatically)
- **JWT** — auth
- **express-rate-limit** — abuse protection

## Project structure

```
campus-marketplace/
  backend/
    config/db.js            # Mongo connection w/ pooling
    models/                 # User, Product, Conversation, Message
    middleware/              # auth.js (JWT), rateLimit.js
    controllers/             # business logic
    routes/                  # REST endpoints
    socket/index.js          # Socket.io auth + chat events
    utils/cache.js           # in-memory TTL cache (Redis-shaped interface)
    server.js
  frontend/
    src/
      api/axios.js           # HTTP client w/ auth interceptor
      socket.js               # Socket.io client singleton
      context/AuthContext.js
      components/             # Navbar, ProductCard, ChatWindow, ConversationList
      pages/                   # Home, Login, Register, SellItem, ProductDetail,
                                # MyListings, Chat
```

## Running locally

### 1. Backend

```bash
cd backend
cp .env.example .env      # fill in MONGO_URI and JWT_SECRET
npm install
npm run dev                # nodemon, or `npm start`
```

Requires a MongoDB instance — either local (`mongod`) or a free
MongoDB Atlas cluster (recommended for demoing/deploying).

For local development, run `docker compose up -d` to start MongoDB 7 at
`mongodb://127.0.0.1:27017` (and Mongo Express at `http://localhost:8081`),
then run `cd backend && npm run seed`. Moving to Atlas or another managed
provider changes only `MONGO_URI`; configure that provider's network/IP
allowlist for your development machine or deployment host. The application code
and data models do not change.

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Runs on `http://localhost:3000`, talks to the API at `http://localhost:5000/api`
by default (override with `REACT_APP_API_URL` / `REACT_APP_SOCKET_URL` in a
`.env` file inside `frontend/`).

## Feature checklist

- Email/password auth (JWT, bcrypt-hashed passwords)
- Create / edit / delete / mark-sold listings
- Browse with search, category filter, price filter, pagination
- Product detail page with view counter
- **Real-time chat** between buyer and seller (Socket.io), with:
  - Persisted message history (REST, cursor-paginated)
  - Live delivery over WebSocket
  - Typing indicator
  - One conversation thread per (product, buyer) pair

## System design concepts you can talk about in an interview

This is the part worth putting on a resume — each choice below was made
deliberately, not just "because MERN tutorials do it this way":

1. **Indexing.** `Product` has a compound index on `{status, category, createdAt}`
   matching the actual query shape of the listings page, plus a `$text`
   index for search — so filtering/searching doesn't degrade into a
   collection scan as the catalog grows. `Conversation` has a unique
   compound index on `{product, buyer}` to both enforce "one thread per
   buyer per listing" *and* make lookups O(log n).

2. **Pagination strategy, chosen per access pattern.** The product feed uses
   offset pagination (`page`/`limit` + `skip`) because users jump between
   pages and a total count is useful. Chat history uses **cursor-based**
   pagination (`before: timestamp`) because message lists are append-heavy
   and offset pagination gets slower (and can skip/duplicate rows) the
   deeper you scroll.

3. **Caching to cut read latency.** The product-listing endpoint is the
   hottest read path and doesn't need to be real-time-fresh, so responses
   are cached per unique query for a short TTL (`utils/cache.js`). Writes
   invalidate the cache by prefix. The cache module is intentionally
   Redis-shaped (`get/set/del`) so swapping the in-memory `Map` for a real
   Redis client later is a small, contained change — worth mentioning as
   a scaling roadmap item even if you don't deploy Redis for the demo.

4. **Why WebSockets instead of polling for chat.** Polling the REST API on
   an interval means constant wasted requests and latency bounded by the
   poll interval. Socket.io keeps a persistent connection so a message is
   pushed the instant it's written — latency is bounded by DB write time,
   not a timer. `socket/index.js` documents how you'd scale this past a
   single server instance (`@socket.io/redis-adapter` for cross-instance
   pub/sub, since Socket.io rooms are in-memory per process by default).

5. **Connection pooling.** `config/db.js` sets `maxPoolSize`/`minPoolSize`
   explicitly rather than relying on Mongoose defaults — a concrete,
   explainable choice about how many concurrent DB connections one server
   process holds open, instead of opening a new one per request.

6. **Rate limiting.** Auth endpoints get a strict limiter (brute-force
   protection); all API routes get a looser global limiter (basic DoS /
   fair-use protection) — a cheap, real mitigation worth mentioning.

7. **Authorization vs authentication, done correctly.** JWT verifies *who*
   you are (`protect` middleware); ownership checks in the controllers
   (`String(product.seller) !== String(req.user._id)`) verify *what
   you're allowed to do* — two separate concerns, which is worth being
   able to articulate.

## Natural "next steps" to mention if asked how you'd scale this further

- Move image storage off base64-in-Mongo to S3/Cloudinary + a CDN.
- Move the in-memory cache to Redis; add `@socket.io/redis-adapter` for
  multi-instance chat.
- Add a message queue (e.g. for "notify seller" emails) so the request
  path doesn't block on a slow email provider.
- Put Nginx/a load balancer in front of multiple Node instances behind
  MongoDB Atlas, with sticky sessions or the Redis adapter for Socket.io.
