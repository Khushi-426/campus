# CampusTrade Admin System & Security Documentation

This document describes the role-based access control (RBAC), administrative endpoints, setup instructions, and privacy rules for the CampusTrade platform.

---

## 1. Role Model & Schema

User accounts support two roles defined in `backend/models/User.js`:

```javascript
role: { type: String, enum: ['user', 'admin'], default: 'user' },
isSuspended: { type: Boolean, default: false }
```

- **`user`**: Default role for campus students. Standard permissions to browse, search, post gear, chat, and save watchlist items.
- **`admin`**: System administrator role. Has access to system stats, user account suspension/deletion, listing unpublishing, policy report resolution, and audit logs.

---

## 2. Initial Admin Creation (`createAdmin.js`)

Do not hardcode administrator credentials in source code. To generate/promote the first admin account:

1. Configure environment variables in `backend/.env` (optional):
   ```env
   ADMIN_EMAIL=admin@campus.edu
   ADMIN_PASSWORD=YourSecurePasswordHere
   ```
2. Run the secure setup script:
   ```bash
   cd backend
   node scripts/createAdmin.js
   ```
3. If `ADMIN_PASSWORD` is omitted, the script automatically generates a 16-character cryptographically strong one-time password and prints it once to the terminal console.

---

## 3. Server Authorization & Middleware Enforcements

Administrative endpoints are secured server-side in `backend/middleware/auth.js`:

1. **`protect` Middleware**: Decodes JWT headers and checks `isSuspended`. Unauthenticated requests or requests with invalid/expired tokens return **`401 Unauthorized`**. Suspended accounts return **`403 Forbidden`**.
2. **`adminOnly` Middleware**: Verifies `req.user.role === 'admin'`. Requests from non-admin users return a distinct **`403 Forbidden`** response code.

---

## 4. Administrative Endpoints Reference

All `/api/admin` routes are protected by `protect` + `adminOnly`:

| Endpoint | Method | Description | Audit Logged? |
| :--- | :--- | :--- | :--- |
| `/api/admin/dashboard` | `GET` | Aggregated system metrics (users, velocity, category counts, top favorited items) | No |
| `/api/admin/users` | `GET` | Search and filter all registered user accounts | No |
| `/api/admin/users/:id/suspend` | `PUT` | Suspend or reinstate user account | **Yes** (`suspend_user`/`unsuspend_user`) |
| `/api/admin/users/:id` | `DELETE` | Delete user account with listing cascade cleanup | **Yes** (`delete_user`) |
| `/api/admin/listings` | `GET` | Search and filter all listings across sellers | No |
| `/api/admin/listings/:id` | `DELETE` | Unpublish listing with mandatory policy violation reason | **Yes** (`remove_listing`) |
| `/api/admin/reports` | `GET` | View user/item policy violation reports | No |
| `/api/admin/reports/:id` | `PUT` | Update report status (`resolved` or `dismissed`) | **Yes** (`resolve_report`/`dismiss_report`) |
| `/api/admin/audit` | `GET` | Fetch timeline of administrative moderation actions | No |
| `/api/admin/reports` | `POST` | User-facing endpoint to report policy violations | No |

---

## 5. Privacy Policy Rule: Direct Messaging Content Protection

### 🔒 Chat Privacy Rule
Admins are **explicitly restricted** from reading private chat message contents by default:
- The Admin Panel lists conversation threads and metadata (participants, product subject, timestamp) for moderation context.
- **Message bodies remain private between the buyer and seller**. Message bodies are NOT exposed in general moderation dashboards or listing feeds.
- Message inspection is treated as a sensitive operation requiring a specific formal user report trigger or legal compliance escalation.

---

## 6. Audit Trail Logging (`AdminAction`)

Every administrative action that alters system state (suspending a user, removing a listing, deleting an account, or resolving a report) creates an immutable `AdminAction` audit entry storing:
- `admin`: User ID of the administrator performing the action.
- `action`: Specific operation type (`remove_listing`, `suspend_user`, etc.).
- `targetType` & `targetId`: Target resource affected.
- `reason`: Mandatory human-readable justification log.
- `createdAt`: Timestamp.
