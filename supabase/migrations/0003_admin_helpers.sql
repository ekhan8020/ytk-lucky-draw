-- ============================================================================
-- Admin helpers: per-prize win counts and an atomic restock. Both refuse
-- anyone who is not in draw_admins.
-- Run in the SQL Editor (paste the whole file). Safe to re-run.
-- ============================================================================

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
    where r.prize_id is not null
    group by r.prize_id;
end;
$$;
revoke all on function public.draw_prize_stats() from public, anon;
grant execute on function public.draw_prize_stats() to authenticated;

create or replace function public.draw_restock(p_id uuid, p_amount int)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_stock int;
begin
  if not public.draw_is_admin() then
    raise exception 'not allowed';
  end if;
  update public.draw_prizes set stock = stock + p_amount
  where id = p_id and stock is not null and stock + p_amount >= 0
  returning stock into v_stock;
  if not found then
    raise exception 'cannot change stock (unlimited prize, or it would go below 0)';
  end if;
  return v_stock;
end;
$$;
revoke all on function public.draw_restock(uuid, int) from public, anon;
grant execute on function public.draw_restock(uuid, int) to authenticated;

notify pgrst, 'reload schema';
