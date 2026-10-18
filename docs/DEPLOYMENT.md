# ytk-lucky-draw — environments, deployment and operations

No secrets are stored in this repository. Keys live only in each server's `.env.local` and in Supabase.

## 1. Environments

| | TEST | PRODUCTION |
|---|---|---|
| URL | https://draw-test.ytkholding.com | https://draw.ytkholding.com |
| Supabase project | shared test project, ref `qeghgtpqguajlkhmikqf` (HR, Quotation test and lucky draw share it) | Quotation PRODUCTION project, ref `ytvsptselvlfqnfriphu` (`draw_` tables only) |
| VPS | 187.53.136.173, user `deploy` | same VPS |
| Folder | `/home/deploy/ytk-lucky-draw` | `/home/deploy/ytk-lucky-draw-prod` (owned by `deploy`) |
| pm2 name / port | `ytk-lucky-draw` / 3010 | `ytk-lucky-draw-prod` / 3011 |
| nginx file | `/etc/nginx/sites-enabled/draw-test.ytkholding.com` | `/etc/nginx/sites-enabled/draw.ytkholding.com` (proxy to 127.0.0.1:3011, certbot HTTPS) |
| Deploys | automatic on every push to `master` (`.github/workflows/deploy-test.yml`) | **manual only**: GitHub → Actions → "Deploy ytk-lucky-draw (production)" → Run workflow (`deploy-prod.yml`) |
| Other ports on that VPS | 3001 quotation test, 3002 quotation prod, 3003 HR test, 3200 other | |

Workflow: change → push to `master` (deploys to test) → check on draw-test → run the production workflow by hand. The kiosk in the shop should only ever see a version that passed on test.
GitHub repository secrets used by both workflows: `YTK_DRAW_VPS_HOST`, `_PORT`, `_USER`, `_DEPLOY_PATH` (`/home/deploy/ytk-lucky-draw`, production appends `-prod`), `_SSH_KEY`.

## 2. `.env.local` (per server, never committed)

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Publishable key, sb_publishable_...>
SUPABASE_SERVICE_ROLE_KEY=<Secret key, sb_secret_...>      # server only
```
Created with `read -rsp` so the secret is never echoed. `chmod 600`, owner `deploy`. After any change, run the deploy workflow again (`NEXT_PUBLIC_*` is compiled in).

## 3. Setting up production from scratch (what was done)

1. Supabase (production project): run 0001, then 0003–0010 (see `STATUS.md`). Do **not** run 0002 (example prizes).
2. Add admins (see §4). Production Settings → "Test tools" must stay OFF.
3. VPS: create `/home/deploy/ytk-lucky-draw-prod/.env.local` (§2).
4. DNS (Spaceship): A record `draw` → 187.53.136.173. Check with `nslookup draw.ytkholding.com`.
5. nginx server block for `draw.ytkholding.com` → `proxy_pass http://127.0.0.1:3011` (Host / X-Real-IP / X-Forwarded-For / X-Forwarded-Proto headers), `nginx -t && systemctl reload nginx`, then `certbot --nginx -d draw.ytkholding.com` (auto-renew).
6. Run the production workflow; check `pm2 list` (`ytk-lucky-draw-prod` online) and `curl https://draw.ytkholding.com/api/config` → 200.
7. In `/admin`: Prizes → Delete all (removes the example prizes) → Import from file (172 real prizes, original stock); fill Settings; do one real test draw; clear it with Test tools ON → "Reset test draws" → Test tools OFF.

## 4. Operations (run in the Supabase SQL Editor of the right project)

Admins use their Quotation login: email = `<quotation username>@ytk-internal.local`.

```sql
-- add an admin
insert into public.draw_admins (user_id) select id from auth.users where email = 'name@ytk-internal.local' on conflict do nothing;
-- list admins
select u.email from public.draw_admins a join auth.users u on u.id = a.user_id order by u.email;
-- remove an admin
delete from public.draw_admins where user_id in (select id from auth.users where email = 'name@ytk-internal.local');
-- set a known password (this also changes that person's Quotation password in the same project!)
update auth.users set encrypted_password = crypt('NEW_PASSWORD', gen_salt('bf')), updated_at = now() where email = 'name@ytk-internal.local';
```
Password reset e-mails do not work for these accounts (`@ytk-internal.local` is not a real mailbox).

Other routine tasks: restock / undo a win / import prizes → Prizes page; export results → Results page; change minimum amount or texts → Settings.

## 5. Troubleshooting

| Symptom | Check |
|---|---|
| Admin login says "Wrong email or password." | Right project's password? Test vs production passwords differ. Then call `https://<ref>.supabase.co/auth/v1/token?grant_type=password` with the key to see the real error (`Invalid API key`, `invalid_credentials`, `Email not confirmed`) |
| "This account is not allowed to use the Lucky Draw admin." | Password is right but the user is not in `draw_admins` of that project |
| Deploy "Set up SSH" step fails | Transient — re-run |
| Site shows 502 | pm2 process down: `sudo -u deploy pm2 list`, check the port and `.env.local` |
| Kiosk shows the old texts | Settings refresh at page load, every 5 minutes and when the screen returns to standby |
| Draw returns "invalid" / "duplicate" | order number must be `CS-` + 6 digits, amount ≥ minimum, number not already used (unless that win was voided) |
| Deadlock when running SQL on the shared test project | Re-run (the script is one transaction), or split into smaller parts |
