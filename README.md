# ytk-lucky-draw

YTK in-store lucky draw. Customer screen `/` (iPad kiosk) and admin `/admin` (settings, prizes, results — in progress).

- Next.js + Supabase (same stack as ytk-quotation). Tables are prefixed `draw_` so the database can be shared.
- The prize is decided on the server (`draw_pick_prize` RPC, one transaction). The kiosk never receives prizes, weights, stock or odds.
- Look and feel comes from the `draw_settings` row, so the admin can change it without redeploying.

## Setup
1. Run `supabase/migrations/0001_lucky_draw.sql` in the Supabase SQL Editor (optionally `0002_seed_example_prizes.sql` on TEST only).
2. Copy `.env.local.example` to `.env.local` and fill it in.
3. `npm ci && npm run dev`

## Not in v1
Customer eligibility check (anyone tapping the iPad can draw), AutoCount integration, customer data collection.
