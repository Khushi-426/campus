# CampusTrade Feature Specifications & Mongoose Schema Rationale

This document details the architectural decisions, index strategies, REST endpoints, and UI implementations for the 5 student marketplace features.

---

## 1. Favorites / Watchlist System

### Schema Design & Rationale
- **Model**: `Favorite` (`user`, `product`, `createdAt`)
- **Design Choice**: Implemented as a separate join collection instead of an embedded array on the `User` model.
- **Justification**:
  - Embedding product IDs in a `user.favorites` array causes `User` document growth over time, requires re-writing the entire user document on every star/unstar, and creates write lock contention when users browse and save multiple items simultaneously.
  - A separate `Favorite` collection keeps user documents lightweight and enables O(1) indexed lookups.

### Index Strategy
```js
// Compound unique index prevents duplicate stars and powers O(1) watchlist checks
favoriteSchema.index({ user: 1, product: 1 }, { unique: true });

// Compound timestamp index powers user's saved list feed sorted newest-first
favoriteSchema.index({ user: 1, createdAt: -1 });
```

### Endpoints & UI
- `POST /api/favorites/:productId`: Toggle star / unstar listing.
- `GET /api/favorites`: Returns populated saved listings for the `/saved` watchlist page.

---

## 2. Verified Buyer Seller Ratings & Reviews

### Schema Design & Rationale
- **Model**: `Review` (`product`, `seller`, `buyer`, `rating`, `comment`, `createdAt`)
- **Anti-Spam Restriction**: A review is permitted **ONLY IF** a `Conversation` thread exists between that `(product, buyer)` pair.
- **Justification**: Prevents fake review spam from users who never interacted with or inquired about the seller's listing.

### Index Strategy
```js
// Compound unique index ensures a buyer can only leave 1 review per transaction
reviewSchema.index({ product: 1, buyer: 1 }, { unique: true });

// Compound index for querying a seller's rating feed sorted newest first
reviewSchema.index({ seller: 1, createdAt: -1 });
```

### Endpoints & UI
- `POST /api/reviews`: Validates chat thread existence before creating review.
- `GET /api/reviews/seller/:sellerId`: Computes aggregate rating and lists reviews on the product detail page.

---

## 3. "Mark as Sold" Flow & Active Buyer Notifications

### Behavior & Rationale
- When a seller changes item status to `sold`:
  1. The item is filtered out of default `GET /api/products` feeds (`status: 'available'`).
  2. Queries all `Conversation` threads for that `productId`.
  3. Creates an in-app `Notification` for each buyer who had an active chat thread: *"The item [Title] you were inquiring about has been marked as SOLD."*

---

## 4. Price-Drop & Back-in-Stock Alerts

### Behavior & Rationale
- When a seller updates listing price to a lower amount (`newPrice < oldPrice`):
  1. Queries all `Favorite` records for that `productId`.
  2. Creates an in-app `Notification` for each buyer who favorited the item: *"Price Drop Alert! [Title] is now available for ₹[newPrice] (was ₹[oldPrice])."*
- When status changes back from `sold`/`reserved` to `available`:
  1. Triggers a `item_back_in_stock` notification to favoriting buyers.

---

## 5. Infinite Scroll / "Load More" Feed

### Design Rationale
- Replaced rigid numbered pagination on the main browse feed with a smooth "Load More Listings ↓" button that appends items into state.
- **API Preservation**: Retains the existing offset-pagination contract (`page`, `limit`) on the backend while upgrading the frontend consumption model.

---

## Deliberately Out-Of-Scope

- **Email Delivery Infra**: In-app notifications fulfill instant buyer notification needs without introducing external SMTP dependencies.
- **Full Cloudinary/S3 Bucket Production Build**: Static disk upload serving via `multer` fulfills image offloading within repository boundaries.
