create table if not exists public.wallet_auth_nonces (
  nonce text primary key,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now()
);

alter table public.wallet_auth_nonces enable row level security;
alter table public.payment_links enable row level security;
alter table public.payment_attempts enable row level security;

create unique index if not exists payment_attempts_link_payment_id_idx
  on public.payment_attempts (payment_link_id, payment_id);

create unique index if not exists payment_attempts_completed_link_idx
  on public.payment_attempts (payment_link_id)
  where status = 'completed';

create unique index if not exists payment_attempts_completed_payment_id_idx
  on public.payment_attempts (payment_id)
  where status = 'completed';

create unique index if not exists payment_links_payment_id_idx
  on public.payment_links (payment_id)
  where payment_id is not null;

create or replace function public.consume_wallet_auth_nonce(p_nonce text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  update public.wallet_auth_nonces
  set consumed_at = now()
  where nonce = p_nonce
    and consumed_at is null
    and expires_at > now();

  get diagnostics v_rows = row_count;

  return v_rows = 1;
end;
$$;

create or replace function public.finalize_payment_link_success(
  p_slug text,
  p_payment_id text,
  p_payer_address text,
  p_paid_at timestamptz default now()
)
returns setof public.payment_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.payment_links%rowtype;
  v_now timestamptz := coalesce(p_paid_at, now());
begin
  select *
  into v_link
  from public.payment_links
  where slug = p_slug
  limit 1
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Payment link not found.';
  end if;

  insert into public.payment_attempts (
    payment_link_id,
    payment_id,
    status,
    created_at,
    updated_at
  )
  values (
    v_link.id,
    p_payment_id,
    'completed',
    v_now,
    v_now
  )
  on conflict (payment_link_id, payment_id)
  do update
    set status = 'completed',
        updated_at = excluded.updated_at;

  if v_link.status = 'paid' and v_link.payment_id is not null then
    if v_link.payment_id = p_payment_id then
      return query
      select *
      from public.payment_links
      where id = v_link.id;
      return;
    end if;

    raise exception using errcode = '23505', message = 'This payment link has already been paid.';
  end if;

  update public.payment_links
  set status = 'paid',
      payment_id = p_payment_id,
      payer_address = p_payer_address,
      paid_at = coalesce(public.payment_links.paid_at, v_now)
  where id = v_link.id
  returning *
  into v_link;

  return next v_link;
end;
$$;

revoke all on public.wallet_auth_nonces from anon, authenticated;
revoke all on public.payment_links from anon, authenticated;
revoke all on public.payment_attempts from anon, authenticated;

revoke all on function public.consume_wallet_auth_nonce(text) from public, anon, authenticated;
grant execute on function public.consume_wallet_auth_nonce(text) to service_role;

revoke all on function public.finalize_payment_link_success(text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.finalize_payment_link_success(text, text, text, timestamptz) to service_role;
