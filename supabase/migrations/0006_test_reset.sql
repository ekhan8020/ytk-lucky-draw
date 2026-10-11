-- ============================================================================
-- Test tools: put the prize stock back and clear the draw records.
--
-- Guarded twice: an admin must be signed in AND draw_settings.allow_test_reset
-- must be switched on (Settings -> Test tools). It is OFF by default, so the
-- live site cannot wipe real draw history by accident. Leave it OFF in PROD.
-- Safe to re-run.
-- ============================================================================

alter table public.draw_settings add column if not exists allow_test_reset boolean not null default false;

create or replace function public.draw_reset_test()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_allowed boolean;
  v_restored int;
  v_deleted int;
begin
  if not public.draw_is_admin() then
    raise exception 'not allowed';
  end if;
  select allow_test_reset into v_allowed from public.draw_settings where id = 1;
  if not coalesce(v_allowed, false) then
    raise exception 'Test tools are switched off (Settings -> Test tools)';
  end if;

  -- give back one unit of stock for every recorded win (unlimited prizes have no stock to restore)
  update public.draw_prizes p
  set stock = p.stock + r.n
  from (select prize_id, count(*)::int as n from public.draw_results where prize_id is not null group by prize_id) r
  where p.id = r.prize_id and p.stock is not null;
  get diagnostics v_restored = row_count;

  delete from public.draw_results where true;
  get diagnostics v_deleted = row_count;

  return jsonb_build_object('prizes_restored', v_restored, 'records_deleted', v_deleted);
end;
$$;
revoke all on function public.draw_reset_test() from public, anon;
grant execute on function public.draw_reset_test() to authenticated;

notify pgrst, 'reload schema';
