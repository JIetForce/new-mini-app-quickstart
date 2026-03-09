alter table public.payment_links
  add column if not exists creator_fid bigint null,
  add column if not exists creator_username text null,
  add column if not exists creator_display_name text null,
  add column if not exists creator_pfp_url text null;
