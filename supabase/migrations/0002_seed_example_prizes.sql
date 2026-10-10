-- OPTIONAL, TEST DATABASE ONLY: example prizes copied from the prototype so the
-- draw can be tried straight away. Edit or delete them in /admin afterwards.
insert into public.draw_prizes (name, tier_label, tier_color, stock, weight, sort_order)
select * from (values
  ('RM100 Purchase Voucher', 'GRAND PRIZE', '#F5C242', 2, 2, 1),
  ('RM50 Purchase Voucher',  '1ST PRIZE',   '#E14B4B', 5, 5, 2),
  ('RM20 Purchase Voucher',  '2ND PRIZE',   '#BCD6FF', 10, 13, 3),
  ('RM10 Purchase Voucher',  '3RD PRIZE',   '#B5ECC9', 20, 25, 4),
  ('Work Gloves (1 pair)',   'LUCKY GIFT',  '#E4E6EC', 50, 25, 5),
  ('Tape Measure 5m',        'LUCKY GIFT',  '#E4E6EC', null::int, 30, 6)
) as v(name, tier_label, tier_color, stock, weight, sort_order)
where not exists (select 1 from public.draw_prizes);
