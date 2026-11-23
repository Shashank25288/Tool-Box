# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Product Integrity**: Only verified Admins (`shashankhs057@gmail.com` or `/admins/{uid}`) may create, delete, or edit product prices and catalog descriptions. Verified customers may only decrement `stockCount` on purchase (never negative, never increasing, and strictly preserving all other fields).
2. **PII Isolation**: User profiles (`/users/{userId}`) contain PII (`email`, `phone`, `address`) and loyalty balances. Only the document owner (`request.auth.uid == userId`) or an Admin may read or list them.
3. **Order Ownership & State Machine**: Customers may only create orders where `userId == request.auth.uid` and initial `status == 'confirmed'`. Customers may only transition their own `'confirmed'` order to `'cancelled'`. Only Admins may advance orders through `'baking'`, `'finishing'`, `'ready'`, and `'completed'`.
4. **Notification Privacy**: Notifications (`/notifications/{notifId}`) are readable/listable only by the target `userId` or an Admin.
5. **Staff-Only Operations**: `/ingredients`, `/purchaseOrders`, and `/backups` are strictly restricted to verified Admins.
6. **Temporal & Structural Integrity**: All `createdAt`/`updatedAt` timestamps must match `request.time`, all IDs match `^[a-zA-Z0-9_-]+$` (`<= 128` chars), and all strings/lists enforce explicit upper bounds.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Shadow Field Injection on User Create**: `POST /users/uid1` with `{ ..., isAdmin: true }` -> Blocked by `keys().hasOnly(...)`.
2. **Unverified Email Spoof as Admin**: `request.auth.token.email == 'shashankhs057@gmail.com'` with `email_verified == false` -> Blocked by `email_verified == true`.
3. **PII Blanket Read on Users**: `GET /users/uid2` signed in as `uid1` -> Blocked by `isOwner(userId) || isAdmin()`.
4. **Query Scraping on Orders**: `LIST /orders` without `where('userId', '==', uid1)` as non-admin -> Blocked by `resource.data.userId == request.auth.uid`.
5. **Price Tampering on Product Update**: `UPDATE /products/sourdough` as customer setting `price: 0.01` -> Blocked by `affectedKeys().hasOnly(['stockCount', 'updatedAt'])`.
6. **Negative Stock Manipulation**: `UPDATE /products/sourdough` as customer setting `stockCount: -5` -> Blocked by `stockCount >= 0`.
7. **Stock Inflation**: `UPDATE /products/sourdough` as customer increasing `stockCount` from 10 to 999 -> Blocked by `incoming().stockCount <= existing().stockCount`.
8. **Order Status Shortcutting**: `CREATE /orders/ord1` as customer with `status: 'completed'` -> Blocked by `incoming().status == 'confirmed'`.
9. **Terminal State Mutation**: `UPDATE /orders/ord1` as customer changing `status: 'completed'` to `'confirmed'` -> Blocked by `existing().status == 'confirmed'`.
10. **Identity Spoofing on Order**: `CREATE /orders/ord1` as `uid1` with `userId: 'uid2'` -> Blocked by `incoming().userId == request.auth.uid`.
11. **Timestamp Forgery**: `CREATE /orders/ord1` with backdated `createdAt` (`!= request.time`) -> Blocked by `incoming().createdAt == request.time`.
12. **Resource Exhaustion / ID Poisoning**: `CREATE /orders/<1500-char-id>` or `kitchenNotes` > 500 chars -> Blocked by `isValidId()` and `.size() <= 500`.
