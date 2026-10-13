-- ============================================================================
-- One draw per order number. A second attempt with the same CX-###### is refused
-- ('duplicate'); if the first win is later voided (Undo), the number can be used
-- again. Re-sending the SAME draw (same token) still returns the same result.
-- Run in the SQL Editor (paste the whole file). Safe to re-run.
-- ============================================================================

create index if not exists draw_results_order_no_idx on public.draw_results (order_no);

create or replace function public.draw_pick_prize(p_token uuid, p_kiosk text, p_order_no text, p_amount numeric)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_existing public.draw_results%rowtype;
  v_min numeric;
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

  select coalesce(min_amount, 800) into v_min from public.draw_settings where id = 1;
  if p_order_no is null or p_order_no !~ '^CX-[0-9]{6}$' or p_amount is null or p_amount <= v_min then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- one draw per order number (a voided win frees its number again). The lock makes two
  -- kiosks that submit the same number at the same moment take turns.
  perform pg_advisory_xact_lock(hashtext(p_order_no));
  if exists (select 1 from public.draw_results where order_no = p_order_no and voided_at is null) then
    return jsonb_build_object('status', 'duplicate');
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

    insert into public.draw_results (draw_token, prize_id, prize_name, tier_label, tier_color, kiosk_id, order_no, amount)
    values (p_token, v_prize.id, v_prize.name, v_prize.tier_label, v_prize.tier_color, p_kiosk, p_order_no, p_amount);

    return jsonb_build_object('status', 'ok', 'replay', false,
      'name', v_prize.name, 'tier', v_prize.tier_label, 'color', v_prize.tier_color);
  end loop;

  return jsonb_build_object('status', 'busy');
end;
$$;
revoke all on function public.draw_pick_prize(uuid, text, text, numeric) from public, anon, authenticated;
grant execute on function public.draw_pick_prize(uuid, text, text, numeric) to service_role;

notify pgrst, 'reload schema';
