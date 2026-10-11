-- Own colours for the button, the button text and the description text
-- (previously the button followed the gift box colour). Safe to re-run.
alter table public.draw_settings add column if not exists description_color text not null default '#D8DBE3';
alter table public.draw_settings add column if not exists button_color text not null default '#F5C242';
alter table public.draw_settings add column if not exists button_text_color text not null default '#1E2430';
notify pgrst, 'reload schema';
