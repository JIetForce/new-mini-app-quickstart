alter table public.wallet_auth_nonces
  add column if not exists state_hash text;

create or replace function public.consume_wallet_auth_nonce(
  p_nonce text,
  p_state_hash text
)
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
    and state_hash = p_state_hash
    and consumed_at is null
    and expires_at > now();

  get diagnostics v_rows = row_count;

  return v_rows = 1;
end;
$$;

revoke all on function public.consume_wallet_auth_nonce(text, text) from public, anon, authenticated;
grant execute on function public.consume_wallet_auth_nonce(text, text) to service_role;
