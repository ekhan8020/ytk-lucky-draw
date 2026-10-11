-- ============================================================================
-- Undo a win (customer refused / drew by mistake): the latest win of a prize is
-- marked voided (kept in the history, greyed out) and one unit of stock goes back.
-- Stats ignore voided wins. Safe to re-run.
-- ============================================================================

alter table public.draw_results add column if not exists voided_at timestamptz;

create or replace function public.draw_prize_stats()
returns table (prize_id uuid, total bigint, today bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.draw_is_admin() then
    raise exception 'not allowed';
  end if;
  return query
    select r.prize_id,
           count(*)::bigint,
           count(*) filter (where (r.created_at at time zone 'Asia/Kuala_Lumpur')::date = (now() at time zone 'Asia/Kuala_Lumpur')::date)::bigint
    from public.draw_results r
    where r.prize_id is not null and r.voided_at is null
    group by r.prize_id;
end;
$$;
revoke all on function public.draw_prize_stats() from public, anon;
grant execute on function public.draw_prize_stats() to authenticated;

create or replace function public.draw_undo_win(p_prize_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_stock int;
begin
  if not public.draw_is_admin() then
    raise exception 'not allowed';
  end if;
  select id into v_id from public.draw_results
  where prize_id = p_prize_id and voided_at is null
  order by created_at desc limit 1 for update;
  if v_id is null then
    raise exception 'This prize has no win to undo';
  end if;
  update public.draw_results set voided_at = now() where id = v_id;
  update public.draw_prizes set stock = stock + 1 where id = p_prize_id and stock is not null returning stock into v_stock;
  return jsonb_build_object('voided', v_id, 'stock', v_stock);
end;
$$;
revoke all on function public.draw_undo_win(uuid) from public, anon;
grant execute on function public.draw_undo_win(uuid) to authenticated;

-- the test reset must not hand stock back twice for wins that were already undone
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

  update public.draw_prizes p
  set stock = p.stock + r.n
  from (select prize_id, count(*)::int as n from public.draw_results where prize_id is not null and voided_at is null group by prize_id) r
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
