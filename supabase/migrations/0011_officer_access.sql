alter table public.chapter_locations
  alter column officer_id set default auth.uid();

create index if not exists chapter_locations_officer_id_idx on public.chapter_locations (officer_id);
create index if not exists meeting_digests_location_id_idx on public.meeting_digests (location_id);

create policy "Officers manage their own chapters"
  on public.chapter_locations
  for all
  to authenticated
  using (officer_id = (select auth.uid()))
  with check (officer_id = (select auth.uid()));

create policy "Officers manage meeting digests for their chapters"
  on public.meeting_digests
  for all
  to authenticated
  using (exists (select 1 from public.chapter_locations c where c.id = meeting_digests.location_id and c.officer_id = (select auth.uid())))
  with check (exists (select 1 from public.chapter_locations c where c.id = meeting_digests.location_id and c.officer_id = (select auth.uid())));

create policy "Authenticated full access"
  on public.people
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Officers manage memberships for their chapters"
  on public.person_chapter_locations
  for all
  to authenticated
  using (exists (select 1 from public.chapter_locations c where c.id = person_chapter_locations.location_id and c.officer_id = (select auth.uid())))
  with check (exists (select 1 from public.chapter_locations c where c.id = person_chapter_locations.location_id and c.officer_id = (select auth.uid())));
