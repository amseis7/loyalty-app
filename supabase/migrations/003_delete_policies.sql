create policy "Authenticated staff can delete customers"
  on customers for delete to authenticated using (true);

create policy "Authenticated staff can delete stamps"
  on stamps for delete to authenticated using (true);

create policy "Authenticated staff can delete redemptions"
  on redemptions for delete to authenticated using (true);
