# ytk-lucky-draw — status, what was built, and how it differs from the spec

Original brief: [`YTK_LuckyDraw_Spec.md`](YTK_LuckyDraw_Spec.md) (kept unchanged). Approved front-end prototype: [`YTK_LuckyDraw_Prototype.html`](YTK_LuckyDraw_Prototype.html).
Deployment and operations: [`DEPLOYMENT.md`](DEPLOYMENT.md).

**Status (Oct 2026): LIVE.** Test site https://draw-test.ytkholding.com, production https://draw.ytkholding.com (handed to YTK after the 172 real prizes were imported).

## 1. What is built

| Area | What it does |
|---|---|
| Kiosk `/` | iPad full-screen gift box (isometric SVG cube, configurable colours), shake / lid / glow / flash / popup animation, synthesized "Y-T-K" choir, wake lock, no scrolling or zoom. Never receives prizes, weights, stock or odds |
| Draw rules | Customer must enter an **order number `CS-` + 6 digits** and a **bill amount ≥ the minimum (default RM800)** before the box (button or the box itself) can be opened; **one draw per order number** (a voided win frees the number); checked on the iPad before the animation and again in the database |
| Server draw | `draw_pick_prize` RPC: one transaction, weighted pick among active prizes with stock, conditional stock decrement (two kiosks racing for the last unit → only one wins), idempotent per `draw_token`; `/api/draw` rate-limited per IP; `/api/draw/check` tells the kiosk if an order number is already used |
| Admin `/admin` | Login (Supabase Auth, only users in `draw_admins`), Settings, Prizes, Results |
| Settings | Texts (description may contain `{amount}`), colours (title lines, description, button, button text, background gradient 2–3 stops + angle, box, box side/lid, ribbon, ribbon accent), sound / choir switches, sold-out message, low-stock threshold, **minimum amount**, live preview + test mode (no stock, no records), reset to defaults, "Test tools" switch (keep OFF in production) |
| Prizes | Add/edit/disable, stock (blank = unlimited), weight, tier label/colour, live odds %, "Won / total stock", restock (+N), undo 1 win (voids the latest win, stock +1), import from CSV/Excel-style file, delete all, reset test draws (only when Test tools is ON) |
| Results | Filter by date and prize, order number + amount + prize + time, voided wins greyed, today / total counts, CSV export |

## 2. Where it differs from the spec (decisions made)

| Spec | What happened |
|---|---|
| Domains `draw.ytkholding.com` / `draw.aido.works` | Production `draw.ytkholding.com`, test `draw-test.ytkholding.com` (YTK's own DNS at Spaceship) |
| Production Supabase "to be decided" | **Shares the Quotation PRODUCTION project** (`draw_` tables, no clash); test uses the shared test project |
| Table names `prizes`, `draws`, `admin_users` | `draw_prizes`, `draw_results`, `draw_admins`, `draw_settings` (prefix so the project can be shared) |
| Eligibility **not in v1** ("anyone tapping the iPad can draw") | Partly closed on request: order number `CS-xxxxxx` + amount ≥ minimum + one draw per order. **Still not verified against the real invoice** (no AutoCount / Quotation lookup): a customer or staff member can type any unused number |
| Description default "RM100" | YTK uses RM800; text now supports `{amount}` so it follows the setting |
| Extras added beyond the spec | CSV import, undo win, reset test draws, delete all, minimum-amount setting, order number/amount recording, separate button/description colours, box detail colours |

Not done / out of scope: AutoCount integration, customer phone/personal data, staff unlock per draw, real recorded choir audio (`choir_audio_url` field exists), verifying the order number against Quotation/AutoCount.

## 3. Spec acceptance checklist (section 8)

| Item | Status |
|---|---|
| Admin changes texts, iPad shows them after refresh | ✓ done and tested |
| Background gradient + box colours, auto-derived shades | ✓ done and tested |
| Add/edit/disable prizes, stock and weight | ✓ |
| Win → stock −1; at 0 never drawn, odds redistribute | ✓ (live odds shown in admin) |
| Blank stock = unlimited, never decremented | ✓ |
| Two iPads race for the last unit | ✓ by design (conditional update); not load-tested |
| Same `draw_token` → same result, stock once | ✓ by design |
| All prizes gone → friendly message | ✓ |
| No prize list / weights / odds in the browser | ✓ kiosk only calls `/api/config` and `/api/draw` |
| Admin test mode does not touch stock/records | ✓ |

## 4. Database migrations (`supabase/migrations`)

| # | What | TEST | PROD |
|---|---|---|---|
| 0001 | tables, RLS, `draw_pick_prize` (first version), `draw_has_prize` | ✓ | ✓ (run early) |
| 0002 | 6 example prizes — **never run on production** | ✓ | (the 6 example prizes came with the early 0001 run; deleted before go-live) |
| 0003 | admin helpers: `draw_prize_stats`, `draw_restock` | ✓ | ✓ |
| 0004 | button / description / button-text colours | ✓ | ✓ |
| 0005 | box side / lid / ribbon accent colours | ✓ | ✓ |
| 0006 | test reset (`allow_test_reset`, `draw_reset_test`) | ✓ | ✓ (switch kept OFF) |
| 0007 | undo win (`voided_at`, `draw_undo_win`), stats ignore voided | ✓ | ✓ |
| 0008 | `min_amount`, `order_no`, `amount`, new 4-argument `draw_pick_prize` | ✓ | ✓ (as part of the combined run) |
| 0009 | one draw per order number + index | ✓ | ✓ (folded into 0010 function + index) |
| 0010 | `CS-` prefix, amount ≥ minimum (final function) | ✓ | ✓ |

On production, 0003–0010 were run as one combined script (same final result as running them in order).

## 5. Lessons / pitfalls from the rollout

- Test and production are **different Supabase projects with separate accounts and passwords**: a password that works on test Quotation does not work on production.
- The admin login page shows "Wrong email or password." for *every* auth failure (including an invalid API key). To see the real reason call `/auth/v1/token` directly.
- Newer Supabase projects may disable the legacy `anon` / `service_role` JWT keys: use the **Publishable** (`sb_publishable_…`) and **Secret** (`sb_secret_…`) keys.
- `NEXT_PUBLIC_*` values are baked in at build time: after changing the env file, **redeploy**.
- The production folder must be `/home/deploy/ytk-lucky-draw-prod` (owned by `deploy`), not `/root/...`.
- Never paste the service-role / secret key in chat or commit it.
