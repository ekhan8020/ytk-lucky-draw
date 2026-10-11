-- Extra gift-box colours (NULL = worked out automatically from the main
-- box / ribbon colours). Safe to re-run.
alter table public.draw_settings add column if not exists box_side_color text;
alter table public.draw_settings add column if not exists lid_color text;
alter table public.draw_settings add column if not exists ribbon_accent_color text;
notify pgrst, 'reload schema';
