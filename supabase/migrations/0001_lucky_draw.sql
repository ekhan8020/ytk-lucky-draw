-- ============================================================================
-- YTK Lucky Draw — schema, RLS and the draw RPC.
--
-- Tables are prefixed draw_ because this database may be shared with other
-- YTK systems (test: ytk.tech; PROD: the Quotation project).
--
--   draw_settings  one row: texts, colours, sound switches, thresholds
--   draw_prizes    prize pool (stock NULL = unlimited, weight = relative odds)
--   draw_results   every draw (unique draw_token => idempotent retries)
--   draw_admins    who may use /admin (Supabase Auth user ids)
--
-- The kiosk never reads these tables directly: it goes through server routes
-- that use the service-role key. Admins read/write through RLS.
--
-- How to run: Supabase Dashboard -> SQL Editor -> paste this whole file -> Run.
-- Safe to re-run.
-- ============================================================================

create table if not exists public.draw_settings (
  id int primary key default 1 check (id = 1),
  title_line1 text not null default 'YTK',
  title_line2 text not null default 'LUCKY DRAW',
  title_line1_color text not null default '#E14B4B',
  title_line2_color text not null default '#F5C242',
  description text not null default 'Spend RM100 or more in one bill to draw once',
  button_text text not null default 'TAP TO OPEN',
  popup_hint text not null default 'Show this screen to the cashier',
  sold_out_message text not null default 'All prizes have been given out. Thank you for your support!',
  bg_color_1 text not null default '#141A26',
  bg_color_2 text not null default '#1E2430',
  bg_color_3 text,
  bg_angle int not null default 180 check (bg_angle between 0 and 360),
  box_color text not null default '#F5C242',
  ribbon_color text not null default '#E14B4B',
  sound_enabled boolean not null default true,
  choir_enabled boolean not null default true,
  choir_audio_url text,
  low_stock_threshold int not null default 5 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now()
);
insert into public.draw_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.draw_prizes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tier_label text not null default '',
  tier_color text not null default '#E4E6EC',
  -- NULL = unlimited (consolation prize)
  stock int check (stock is null or stock >= 0),
  weight int not null default 1 check (weight >= 0),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.draw_results (
  id uuid primary key default gen_random_uuid(),
  draw_token uuid not null unique,
  prize_id uuid references public.draw_prizes (id) on delete set null,
  -- snapshots: renaming/deleting a prize later must not change history
  prize_name text not null,
  tier_label text not null default '',
  tier_color text not null default '#E4E6EC',
  kiosk_id text,
  created_at timestamptz not null default now()
);
create index if not exists draw_results_created_idx on public.draw_results (created_at desc);
create index if not exists draw_results_prize_idx on public.draw_results (prize_id);

create table if not exists public.draw_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- RLS
create or replace function public.draw_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.draw_admins where user_id = auth.uid());
$$;
revoke all on function public.draw_is_admin() from public;
grant execute on function public.draw_is_admin() to authenticated;

alter table public.draw_settings enable row level security;
alter table public.draw_prizes enable row level security;
alter table public.draw_results enable row level security;
alter table public.draw_admins enable row level security;

drop policy if exists draw_settings_admin on public.draw_settings;
create policy draw_settings_admin on public.draw_settings
  for all using (public.draw_is_admin()) with check (public.draw_is_admin());

drop policy if exists draw_prizes_admin on public.draw_prizes;
create policy draw_prizes_admin on public.draw_prizes
  for all using (public.draw_is_admin()) with check (public.draw_is_admin());

-- results are only ever inserted by the draw RPC (service role); admins read.
drop policy if exists draw_results_admin_read on public.draw_results;
create policy draw_results_admin_read on public.draw_results
  for select using (public.draw_is_admin());

drop policy if exists draw_admins_self_read on public.draw_admins;
create policy draw_admins_self_read on public.draw_admins
  for select using (public.draw_is_admin());

-- ---------------------------------------------------------------- the draw
-- One transaction: pick by weight among active prizes with stock, take one
-- unit of stock atomically, record the result. The same token always returns
-- the same result and never takes stock twice.
create or replace function public.draw_pick_prize(p_token uuid, p_kiosk text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_existing public.draw_results%rowtype;
  v_total bigint;
  v_roll numeric;
  v_acc numeric;
  v_prize public.draw_prizes%rowtype;
  v_attempt int := 0;
begin
  -- serialise requests carrying the same token
  perform pg_advisory_xact_lock(hashtext(p_token::text));

  select * into v_existing from public.draw_results where draw_token = p_token;
  if found then
    return jsonb_build_object('status', 'ok', 'replay', true,
      'name', v_existing.prize_name, 'tier', v_existing.tier_label, 'color', v_existing.tier_color);
  end if;

  while v_attempt < 5 loop
    v_attempt := v_attempt + 1;

    select coalesce(sum(weight), 0) into v_total
    from public.draw_prizes
    where active and weight > 0 and (stock is null or stock > 0);

    if v_total = 0 then
      return jsonb_build_object('status', 'sold_out');
    end if;

    v_roll := random() * v_total;
    v_acc := 0;
    v_prize := null;
    for v_prize in
      select * from public.draw_prizes
      where active and weight > 0 and (stock is null or stock > 0)
      order by sort_order, created_at, id
    loop
      v_acc := v_acc + v_prize.weight;
      exit when v_roll < v_acc;
    end loop;

    if v_prize.id is null then
      continue;
    end if;

    if v_prize.stock is not null then
      -- conditional update: two kiosks racing for the last unit => only one wins
      update public.draw_prizes set stock = stock - 1 where id = v_prize.id and stock > 0;
      if not found then
        continue; -- lost the race, pick again
      end if;
    end if;

    insert into public.draw_results (draw_token, prize_id, prize_name, tier_label, tier_color, kiosk_id)
    values (p_token, v_prize.id, v_prize.name, v_prize.tier_label, v_prize.tier_color, p_kiosk);

    return jsonb_build_object('status', 'ok', 'replay', false,
      'name', v_prize.name, 'tier', v_prize.tier_label, 'color', v_prize.tier_color);
  end loop;

  return jsonb_build_object('status', 'busy');
end;
$$;
revoke all on function public.draw_pick_prize(uuid, text) from public, anon, authenticated;
grant execute on function public.draw_pick_prize(uuid, text) to service_role;

-- True when at least one prize can still be won (no prize details leak).
create or replace function public.draw_has_prize() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.draw_prizes where active and weight > 0 and (stock is null or stock > 0));
$$;
revoke all on function public.draw_has_prize() from public, anon, authenticated;
grant execute on function public.draw_has_prize() to service_role;

notify pgrst, 'reload schema';

-- ============================================================================
-- AFTER RUNNING: make yourself an admin.
-- 1. Dashboard -> Authentication -> Users -> Add user (email + password).
-- 2. Then run (replace the email):
--    insert into public.draw_admins (user_id)
--    select id from auth.users where email = 'you@example.com'
--    on conflict do nothing;
-- ============================================================================
