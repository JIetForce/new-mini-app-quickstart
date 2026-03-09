alter table public.payment_links
  add column if not exists payer_address text null;
