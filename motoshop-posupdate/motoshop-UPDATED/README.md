# TeamMotor — Inventory & POS Prototype

A frontend-only prototype for a motorcycle parts &amp; accessories shop, built with
plain HTML, CSS, and vanilla JavaScript — no build step, no framework, no backend.
Open any `.html` file in a browser, or deploy the whole folder to Netlify
(drag-and-drop the folder, or connect it to a repo).

## Recent updates
- **Warranty Management** (`warranty.html` — Active/Expiring Soon/Expired/Claimed,
  with claim history). The shop's catalog includes 3 complete motorcycle
  units (Honda Click 125i, Yamaha NMAX, Suzuki Raider R150) since warranties
  are tied to a motorcycle purchase.
- **Dashboard:** summary cards (including New Customers and Upcoming
  Warranties) and an Attention tab for warranties nearing expiration.
- **Notifications:** include warranty-expiring alerts, and every
  notification is clickable — it opens the relevant page (Inventory or
  Warranty).
- **Inventory:** the View Product modal is a tabbed Overview / Inventory /
  Sales / Supplier / Activity view, and shows motorcycle-specific fields
  (engine type, displacement, color) when the product is a complete motorcycle.
- Brand renamed from "MotoShop" to "TeamMotor" throughout.
- **Removed:** customer storefront (`ecommerce.html` and related pages) and
  the admin Customers page (`customers.html`). Customer records remain in
  the data model for warranty and dashboard use.

## Quick start

- **See it live:** open `login.html` and use the **Owner/Admin** or **Staff** demo
  buttons (any typed username/password also works — there's no real backend yet).
- Data lives in the browser's `localStorage`, seeded from `js/mock-data.js` the
  first time each page loads. Sales, stock changes, and new products you add
  during a demo persist across pages/reloads in that browser. Use **Reset demo
  data** in the account menu (top right) to wipe back to the original sample data.

## Pages

| File | What it's for |
|---|---|
| `login.html` | Entry point. Demo-only auth: any credentials work, or use the role buttons. |
| `index.html` | Admin/Owner dashboard — stats, 7-day sales trend, recent orders, low-stock alerts, fast/slow movers. |
| `inventory.html` | Product catalog (search/filter, add/edit, auto-generated IDs), Stock In/Out, category manager, and inventory history — all in one page via tabs/modals. |
| `pos.html` | Point of sale — browse/search products, build a cart, take payment, complete a sale. Decrements stock live and logs the sale. |
| `sales.html` | Sales overview, trend + top/slow sellers and a fast/slow **Product Movement** table. |
| `warranty.html` | Warranty management — Active / Expiring Soon / Expired / Claimed, with claim history. |
| `suppliers.html` | Supplier directory with the products each one supplies (computed from the product list). Admin only. |
| `users.html` | Staff/Admin account list and what each role can access. Admin only. |

## How the pieces connect

- `js/mock-data.js` — all sample data (15 products, 3 suppliers, ~5 users, ~40
  seeded sales, inventory history, notifications, product view counts, customers)
  plus small shared helpers (`Utils`).
- `js/store.js` — thin wrapper around `localStorage` (falls back to in-memory if
  storage is blocked) so this is the **only** place that would need to change to
  talk to a real backend later.
- `js/analytics.js` — pure functions that turn raw sales/products into dashboard
  numbers (today/week/month totals, top sellers, payment splits, trend buckets).
- `js/app.js` — shared shell: icon set, session/role handling, sidebar + topbar,
  mobile drawer, toasts. Loaded everywhere; no-ops safely on pages without a sidebar.
- `js/notifications.js` — the bell dropdown; recomputes low-stock/restock/out-of-stock
  alerts from current stock every time it renders.
- One JS file per page for page-specific logic (`inventory.js`, `pos.js`, `sales.js`,
  `warranty.js`, etc.).

**Connected, not siloed:** completing a POS sale decrements the product's stock,
appends a `Sale`-type row to Inventory History, and updates the dashboard/sales
numbers immediately. Stock In/Out on the Inventory page do the same via manual
entries. Low-stock notifications recompute from live stock, not a fixed list.

## What's mock / frontend-only right now

- Login accepts anything — there's no real authentication or password check.
- Product photos aren't real uploads; a category icon stands in until a real
  image pipeline exists (the Add Product form's image picker previews a chosen
  file for the session but doesn't persist the bytes).
- "Export Inventory / Export Sales / Backup Records" style actions aren't wired
  up yet — not built in this pass.
- All data resets to the sample set on **Reset demo data**, and wipes if the
  browser's storage for this file/origin is cleared.

## What a real backend would need

Tables mirroring `js/mock-data.js`'s shape almost directly: `products`,
`categories`, `suppliers`, `users`, `sales` (+ `sale_items`),
`inventory_transactions`, `notifications`, `product_views`, `customers`,
and `warranties`. `js/store.js` is the seam — swap its `get`/`set` bodies for
real API calls (or a sync layer) and the rest of the app shouldn't need to change.

## Redesign notes (matches "TeamMotor Admin & Staff (Mockup)" PDF)

- Styling lives in `css/style.css` (tokens at the top) and `css/responsive.css`; fonts are Space Mono, Montserrat and Inter. Images are in `img/`.
- `signup.html` is **visual only** — it has no `<form>`, script or storage, so nothing is submitted. The Google and "Forgot password" controls are also inert.
- `pos.html` has two views in one page: the sale screen and the payment screen (`#payment`, shown with the CSS `:target` rule — no script). `js/pos.js` is unchanged and still drives the cart, totals, payment method, tender and Complete Sale. Placeholders for later wiring: denomination buttons, "Pay Amount", the amount box on the payment card, the VAT row, the receipt preview (a static image) and the GCash QR (a sample image).
- Sidebar: the round grey arrow (`initSidebarToggle` in `js/app.js`) minimizes/maximizes the sidebar and remembers the choice in `localStorage` (`motoshop:sidebarCollapsed`).

## Responsive scaling and warranty option

- **Fluid scale:** all sizes in `css/style.css` / `css/responsive.css` are in `rem`, and the root font size follows the viewport (16px at ~1440px wide and up, shrinking smoothly to 12.5px by ~1050px). The whole UI therefore scales together on older/lower-resolution monitors or when Windows display scaling is 125–150%. Tablet (≤860px) and phone (≤720px) layouts use fixed root sizes of 15px and 16px. A new rule that sizes something in `px` will not scale — use `rem` (1px–3px hairlines are the exception).
- **Optional product warranty:** Add/Edit Product has a "Warranty (Optional)" section. Saved on the product as `warrantyDuration`, `warrantyUnit` (`days`/`months`/`years`) and `warrantyType` (coverage text), all `null` when there is no warranty; `warrantyDays` is kept in step (months = 30 days, years = 365) for the older tire records. It is shown in the product's details view. Warranty records are not yet created from it when a product is sold.

## POS redesign (latest mockup) and receipt printing

- **Screens:** `pos.html` has the sale screen (products + cart) and the payment screen (`#payment`, shown with the CSS `:target` rule — no script). The payment screen has Total Amount Due, payment-method tiles, amount tendered with quick denominations, Change / Total Paid, Order Summary, and a Receipt Preview.
- **`js/pos.js` is unchanged.** It still owns the cart, totals, stock checks and *recording the sale*: completing a payment writes the sale to `sales` and lowers each product's stock (with an inventory transaction), which is what the Sales and Inventory pages read.
- **`js/pos-receipt.js` (new, additive)** mirrors the cart into the new payment screen, wires the quick-denomination / clear / order-summary quantity buttons (by pressing the controls `pos.js` already has), and prints receipts.
- **Print Receipt — NOTE:** the button (and the one in the "Sale Completed" dialog) currently calls `window.print()`, so it opens the browser's print dialog and prints only the receipt, laid out for an 80 mm roll (`@media print` in `css/style.css`). It is expected to be connected to an actual receipt printer in the future, but that is **not done yet**. `printReceipt()` in `js/pos-receipt.js` is the one place to swap that in (for example by sending the same receipt data to a PHP script that drives the printer).
- **Placeholders to replace:** the shop name/address/VAT number on the receipt (`RECEIPT_SHOP` at the top of `js/pos-receipt.js`) are the mockup's sample values.
- **Not applied yet:** VAT (shown as "—"; the sale total is still items minus discount) and the Credit/Debit Card payment method (shown disabled). Product photos are not used (category icons stay until the image-upload feature is built).
- **Stack note:** the data still lives in the browser's `localStorage` through `js/store.js`. The planned PHP + MySQL backend is not started; `Store` is the seam where it will plug in.

## Motorcycles removed from the catalog, discount hidden, deletable categories

- **No motorcycle listings.** The "Motorcycles" category and the three unit listings (Honda Click 125i, Yamaha NMAX, Suzuki Raider R150) are gone from Inventory and POS (they share the same `categories` / `products` in the Store). This supersedes the older note above about the catalog including 3 motorcycle units.
- **Existing browsers are cleaned up once** by `removeMotorcycleListings()` in `js/app.js` (tracked under `migrations` in the Store), so data already saved in a browser matches the new seed.
- **History is kept, not deleted:** past sales (including the seeded `SALE-MOT-…` ones) and stock movements keep their own product names, and each warranty record now stores `productName` so the Warranty page, Dashboard and notifications still show the motorcycle after its listing is gone. The seeded motorcycle sales read their names/prices from `RETIRED_MOTORCYCLE_UNITS` in `js/mock-data.js` (these are not products). Parts that *fit* those bikes still list them under Compatibility.
- **Discount is hidden in POS for now** (cart row, Order Summary row and receipt line). It is hidden, not removed: `js/pos.js` still reads `#payDiscount`, which stays at 0, so bringing it back later means removing the hiding (`style="display:none;"` in `pos.html`, and the `.rcpt-sums > div:nth-child(2)` rule in `css/style.css`).
- **Manage Categories can delete categories.** A category can be deleted only when no product uses it (archived products count). To empty one, move its products to another category with Edit product. The app has no delete-product button, only archive.
