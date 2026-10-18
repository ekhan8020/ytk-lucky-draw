# ytk-lucky-draw

YTK in-store lucky draw. Customer screen `/` (iPad kiosk) and admin `/admin` (settings, prizes, results). **Live** — production https://draw.ytkholding.com, test https://draw-test.ytkholding.com.

- Next.js + Supabase (same stack as ytk-quotation). Tables are prefixed `draw_` so the database can be shared.
- The prize is decided on the server (`draw_pick_prize` RPC, one transaction). The kiosk never receives prizes, weights, stock or odds.
- Customers enter an order number (`CS-` + 6 digits) and a bill amount (≥ the minimum, default RM800); one draw per order number; both are recorded with the result.
- Look and feel comes from the `draw_settings` row, so the admin can change it without redeploying.

## Docs (read these first)
- [`docs/STATUS.md`](docs/STATUS.md) — what is built, differences from the spec, migrations and where they are applied, lessons learned
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — test/production environments, deploy workflow, env file, operations SQL, troubleshooting
- [`docs/YTK_LuckyDraw_Spec.md`](docs/YTK_LuckyDraw_Spec.md) — original brief; [`docs/YTK_LuckyDraw_Prototype.html`](docs/YTK_LuckyDraw_Prototype.html) — approved prototype

## Local setup
1. Run the migrations in `supabase/migrations` in order in the Supabase SQL Editor (0002 example prizes on TEST only).
2. Copy `.env.local.example` to `.env.local` and fill it in.
3. `npm ci && npm run dev`

## Not done
Verifying the order number against the real invoice (AutoCount / Quotation), staff unlock per draw, customer data collection.
