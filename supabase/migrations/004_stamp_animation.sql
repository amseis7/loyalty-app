-- Allow authenticated staff to update customers (needed for stamp_animation_pending)
create policy "Authenticated staff can update customers"
  on customers for update to authenticated
  using (true) with check (true);

-- SECURITY DEFINER function so anon card page can clear the animation flag
-- without needing a broad UPDATE policy
create or replace function clear_stamp_animation(p_token text)
returns void
language sql
security definer
as $$
  update customers set stamp_animation_pending = false where card_token = p_token;
$$;

grant execute on function clear_stamp_animation to anon;
