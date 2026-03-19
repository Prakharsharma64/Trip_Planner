# Trip Planner: Gallery, Visited Marking & Splitwise-Style Expense Splitting

**Deepened on:** 2026-03-19  
**Scope:** Three features — (1) per-place image galleries, (2) user “visited” marking and visibility, (3) full Splitwise-like trip expense splitting.

---

## Enhancement Summary

- **Sections enhanced:** 3 main feature areas + architecture + UI/UX.
- **Research sources:** Splitwise feature set, expense-splitting data models (groups, expenses, balances, settlements), React Image Gallery (xiaolin), existing codebase (Destination.images, BucketItem.visited).
- **Key improvements:** Concrete data models for expenses, API shape, gallery component choice, and “visited” UX surfaced across the app.
- **New considerations:** Debt simplification (minimize transactions), group isolation, currency handling, and gallery performance (lazy load, thumbnails).

---

## 1. Gallery for Each Place (Multiple Images)

### Overview

Each destination should support multiple images (gallery) in addition to the existing cover image. Users can browse a gallery on the destination detail page and optionally from cards.

### Current State

- **Model:** `Destination` already has `images: { cover: String, gallery: [String] }` (`models/Destination.js`).
- **API:** `toDestination(d)` passes through `...rest`, so `images` are returned if present.
- **Data:** `scripts/fetchCoverImages.js` only sets `images.cover`; there is a separate `fetchAndStoreImages.js` that populates both cover and gallery (Wikipedia/Commons).
- **UI:** Detail page and cards use only `images.cover`; no gallery/lightbox yet.

### Proposed Solution

1. **Backend**
   - Ensure GET destination(s) always return `images.cover` and `images.gallery` (array of URLs).
   - Extend or run the existing gallery-fetch script so destinations get `images.gallery` populated (e.g. from Commons search or pageimages + related).
2. **Frontend**
   - On **destination detail page:** add a gallery section (e.g. below hero or in sidebar) with thumbnails + main image; click opens a lightbox/carousel for full-screen browsing.
   - On **destination cards (optional):** keep single cover; “View gallery” or tap cover could link to detail page with gallery focused (e.g. hash `#gallery`).
   - Use a dedicated gallery component for accessibility (keyboard, focus trap, ARIA) and touch (swipe).

### Research Insights

**Component choice (React):**

- **react-image-gallery** (`xiaolin/react-image-gallery`): thumbnails, fullscreen, mobile swipe, customizable controls. Fits “gallery + lightbox” in one.
- Items shape: `{ original: url, thumbnail: url }`; can derive thumbnail from original (e.g. same URL or resize param if your image API supports it).

**Implementation details:**

```javascript
// Example: build items from destination.images
const galleryItems = [
  ...(dest.images?.cover ? [{ original: dest.images.cover, thumbnail: dest.images.cover }] : []),
  ...(dest.images?.gallery || []).map((url) => ({ original: url, thumbnail: url })),
].filter((item) => item.original);
// Then: <ImageGallery items={galleryItems} lazyLoad showFullscreenButton />
```

**Performance:**

- Lazy-load images in the gallery (component supports it).
- Prefer thumbnail URLs for strip/carousel (smaller bytes); use originals only in lightbox/fullscreen.
- If you add user-uploaded images later, generate thumbnails server-side or via CDN.

**Edge cases:**

- No images: hide gallery section or show a single placeholder (e.g. first letter + gradient, consistent with current placeholders).
- One image: gallery still usable (single slide); or show only cover and no “gallery” strip.
- Very long galleries (e.g. 50+): consider pagination or “load more” for thumbnails to keep initial DOM/requests light.

**References:**

- [react-image-gallery README](https://github.com/xiaolin/react-image-gallery) — usage, props, CSS/SCSS.
- Context7 library ID: `/xiaolin/react-image-gallery`.

---

## 2. Mark Places as Visited & Visibility

### Overview

Users can mark destinations as “visited” and optionally set a date. This state should be visible wherever the user sees that destination (cards, detail page, bucket list).

### Current State

- **Model:** `BucketItem` has `status: 'want-to-visit' | 'visited'` and `visitedAt: Date` (`models/BucketItem.js`).
- **API:** PATCH `/api/bucket/:id` accepts `status`, `visitedAt` (and `notes`).
- **UI:** Bucket page has “Want to visit” and “Visited” sections; “Mark Visited” button and “Visited &lt;date&gt;” display. Destination cards and detail page do not show “You visited this” or “Visited on …”.

### Proposed Solution

1. **Backend**
   - When returning destinations (list or single), optionally include the current user’s bucket status for that destination if they are logged in (e.g. `bucketStatus: { status, visitedAt }` or `inBucket: true, visited: true, visitedAt }`). This requires:
     - Either a separate endpoint like GET `/api/bucket/status?destinationIds=id1,id2` (batch),
     - Or embedding bucket status in destination response when `?includeBucket=true` and user is authenticated.
   - Keep PATCH `/api/bucket/:id` as-is for updating status and visitedAt.
2. **Frontend**
   - **Destination cards (Browse / Suggestions):** If the destination is in the user’s bucket and status is `visited`, show a “Visited” badge (e.g. checkmark + “Visited” or “Visited Mar 2026”). If in bucket and want-to-visit, keep “Add to Bucket” or show “In bucket”.
   - **Destination detail page:** If user has visited, show a clear callout (e.g. “You visited this place on &lt;date&gt;”) and optionally allow editing visitedAt; keep “Add to Bucket” for not-in-bucket, or “Mark as visited” when already in bucket with want-to-visit.
   - **Bucket page:** Already shows visited; consider adding filters (e.g. “Only visited”) and better empty states.

### Research Insights

**UX best practices:**

- “Visited” is a strong positive signal; use a consistent, visible badge (icon + short label) so users see progress at a glance.
- Optional “visitedAt” improves recall and possible future features (e.g. “Places I visited in 2025”). Prefer a date picker or at least month/year.

**Edge cases:**

- User not logged in: no bucket or visited state; cards/detail show only “Add to Bucket” (or login CTA).
- Clock/Timezone: store `visitedAt` as ISO date or date-only to avoid timezone confusion; display in user’s locale.

---

## 3. Splitwise-Like Trip Expense Splitting (Full Functionality)

### Overview

Provide end-to-end trip expense splitting: create groups (e.g. “Rajasthan Trip March 2026”), add expenses (who paid, amount, category, split type), track who owes whom, and record settlements. Align with Splitwise-style expectations: equal/unequal splits, multiple payers, debt simplification, and group isolation.

### Core Features (Splitwise Parity)

| Feature | Description |
|--------|-------------|
| **Groups** | Create a group (name, optional trip dates/destination link). Add members (existing users by email or invite). One user can be in many groups. |
| **Expenses** | Add expense: amount, currency, description, category (e.g. Food, Transport, Stay). Who paid (one or multiple payers with amounts). How to split: equal, by percentage, by custom shares, or by exact amounts. |
| **Balances** | Per group: “A owes B ₹500”, “C owes A ₹200”. Derived from expenses and settlements. Single-query or precomputed per group. |
| **Settlements** | Record a payment (e.g. “B paid A ₹500”). Reduces or clears that debt. Optional: payment method, note. |
| **Debt simplification** | Given a set of balances, compute a minimal set of transactions so everyone is settled (e.g. “C pays A ₹200” instead of “C pays B ₹200, B pays A ₹200”). |
| **Currency** | Support one currency per group (or per expense) and display consistently; optional multi-currency with conversion later. |
| **History** | List expenses and settlements in reverse chronological order; filter by category or member. |

### Data Model (Research-Backed)

**Users:** Existing `User` model (id, name, email, etc.).

**Group**

- `_id`, `name`, `createdBy` (ref User), `members` (array of ref User), `currency` (default INR), `createdAt`, `updatedAt`.
- Optional: `tripDestination` (ref Destination), `tripStartDate`, `tripEndDate`.

**Expense**

- `_id`, `group` (ref Group), `amount` (Number), `currency` (String), `description` (String), `category` (String, e.g. Food, Transport), `paidBy` (ref User), `createdBy` (ref User), `createdAt`, `updatedAt`.
- **Split representation:** Either:
  - **Option A:** `splits: [{ user: ref User, amount: Number }]` (exact amounts), or
  - **Option B:** `splitType: 'equal' | 'percentage' | 'custom'`, `shares: [{ user: ref User, share: Number }]` (share = percentage or weight). Option B is more flexible (equal = 1/1/1, percentage = 50/30/20, custom = 2/1/1).
- For “multiple payers”: either one expense per payer (simpler) or `payments: [{ user, amount }]` and total expense = sum(payments). Single payer is the common case; multi-payer can be Phase 2.

**Balance (derived or stored)**

- **Stored approach:** `Balance` document per (group, owedBy, owedTo): `amount` (positive = owedBy owes owedTo). Updated on every expense add/update/delete and on settlement. Enables O(1) “how much does A owe B?”.
- **Derived approach:** No Balance collection; compute from Expense + Settlement history. Simpler schema but heavier reads; use if group size and expense count are small.

**Settlement (payment)**

- `_id`, `group` (ref Group), `from` (ref User), `to` (ref User), `amount` (Number), `currency`, `note` (String), `createdAt`. Optional: `paymentMethod`.

**Debt simplification (algorithm)**

- Input: per (from, to) net amounts (e.g. A owes B 100, B owes C 50, C owes A 30).
- Output: minimal list of (from, to, amount) so all balances become zero. Standard approach: compute net position per user (sum in – sum out), then match debtors with creditors (greedy or with a simple graph). References: “minimum transactions to settle debt” algorithms.

### API Outline

- **Groups:** `POST /api/groups`, `GET /api/groups`, `GET /api/groups/:id`, `PATCH /api/groups/:id` (name, add/remove members), `DELETE /api/groups/:id`.
- **Expenses:** `POST /api/groups/:groupId/expenses`, `GET /api/groups/:groupId/expenses`, `PATCH /api/groups/:groupId/expenses/:id`, `DELETE /api/groups/:groupId/expenses/:id`.
- **Balances:** `GET /api/groups/:groupId/balances` — returns simplified “who owes whom” (or net positions). Can be derived on the fly or from Balance collection.
- **Settlements:** `POST /api/groups/:groupId/settlements`, `GET /api/groups/:groupId/settlements` (optional, for history).
- **Debt simplification:** `GET /api/groups/:groupId/balances/simplified` — returns minimal list of (from, to, amount) to settle the group.

Auth: all group/expense/settlement endpoints require auth; restrict to group members only.

### Implementation Phases

- **Phase 1 (MVP):** Groups (create, list, add members), expenses (single payer, equal split only), balances (computed from expenses), simple “who owes whom” list. No settlements yet; no debt simplification.
- **Phase 2:** Settlements (record payments), update balances; optional debt simplification endpoint.
- **Phase 3:** Unequal splits (percentage/custom shares), multiple payers, categories, filters, optional link to Destination (trip destination).

### Research Insights

**Best practices:**

- Keep group membership explicit (members array); avoid “invite by link” in MVP to avoid token/signing complexity.
- Store amounts in smallest unit (e.g. paise) or as decimals with fixed precision to avoid float errors; display in rupees with 2 decimal places.
- Idempotency: if the client retries POST expense, use idempotency key or unique constraint (e.g. group + description + amount + createdBy + createdAt rounded to second) to avoid duplicate expenses.

**Security:**

- Validate that `paidBy` and all users in `splits` are members of the group.
- Ensure PATCH/DELETE expense and POST settlement are restricted to group members; only creator or admin can delete group.

**References:**

- [Designing Splitwise - Data Modelling](https://www.linkedin.com/pulse/designing-splitwise-data-modelling-expense-sharing-shrey-batra)
- [Database schema design of Splitwise](https://dev.to/fightclub07/database-schema-design-of-splitwise-application-2ef0)
- Splitwise core features (expense splitting, groups, settlements, debt simplification).

---

## 4. UI/UX (Frontend-Design Alignment)

### Gallery

- **Typography:** Keep existing editorial font stack (Cormorant Garamond + Outfit); gallery captions and “View gallery” in body font.
- **Motion:** Lightbox open/close with a short animation (e.g. fade + scale); thumbnail strip can have a subtle hover state. Avoid heavy animation on every image change.
- **Spatial:** Gallery section on detail page: full-width or constrained to content width; thumbnails below or beside main image; lightbox full-screen with clear close control.
- **Accessibility:** Focus trap in lightbox, Escape to close, ARIA labels for “previous/next image”, “close gallery”.

### Visited

- **Differentiation:** “Visited” badge should feel like an achievement (e.g. checkmark + date); use accent color (e.g. saffron/sage) so it stands out from “Add to Bucket”.
- **Consistency:** Same badge pattern on cards and detail page; Bucket page remains the source of truth for “Mark visited” and “Visited on &lt;date&gt;”.

### Expense Splitting (Splitwise)

- **Tone:** Clear, utilitarian (forms, tables, numbers); avoid decorative clutter. Match existing app (cream/paper, saffron accents) for headers and primary actions.
- **Key screens:** (1) Group list → (2) Group detail (members, expenses list, balances, “Add expense”, “Settle up”) → (3) Add/Edit expense (amount, description, paid by, split type and shares) → (4) Record settlement (from, to, amount). Optional: “Simplified settlement” view showing minimal transfers.
- **Mobile:** Forms and lists should stack; large tap targets for “Add expense” and “Settle up”.

---

## 5. Technical Architecture Summary

| Area | Stack / Choice |
|------|----------------|
| Gallery data | `Destination.images.gallery` (existing); populate via script or API. |
| Gallery UI | react-image-gallery (lightbox + thumbnails); lazy load. |
| Visited | `BucketItem.status` + `visitedAt`; API to expose per-destination bucket status to frontend; badges on cards and detail. |
| Groups/Expenses | New models: Group, Expense, (Balance optional), Settlement. REST as above. |
| Auth | Existing JWT; group endpoints require member check. |
| Currency | Store as number (e.g. INR); one currency per group in MVP. |

---

## 6. Acceptance Criteria (Summary)

- **Gallery:** Each destination can have multiple images; detail page shows a gallery with thumbnails and lightbox; performance is acceptable (lazy load, limited initial load).
- **Visited:** User can mark a bucket item as visited (with optional date); “Visited” appears on that destination on cards and detail when the user is logged in; Bucket page continues to show and edit visited state.
- **Splitwise:** User can create a group, add members, add expenses (at least equal split, single payer), see “who owes whom” in the group, and record settlements; optional debt-simplification view; data isolated per group and per user.

---

## Next Steps

1. **Implement gallery:** Extend or run gallery fetch script → ensure API returns `images.gallery` → add gallery block + react-image-gallery on destination detail page.
2. **Implement visited visibility:** Add bucket-status in destination API or batch endpoint → add “Visited” badge on cards and detail; keep Bucket page as-is.
3. **Implement Splitwise MVP:** Add Group and Expense models and APIs (Phase 1) → group list and detail UI → add expense (equal split) → balances view; then Phase 2 settlements and optional simplification.

You can proceed with implementation in this order or tackle gallery and visited first for a smaller initial release.
