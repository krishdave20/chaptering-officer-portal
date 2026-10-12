create table if not exists public.research_docs (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.chapter_locations(id) on delete cascade,
  officer_id uuid references auth.users(id) on delete set null,
  file_name text not null default '',
  title text not null default '',
  overview text not null default '',
  key_takeaways text[] not null default '{}',
  next_steps jsonb not null default '[]',
  members text[] not null default '{}',
  raw_text text not null check (char_length(trim(raw_text)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.research_centers (
  id uuid primary key default gen_random_uuid(),
  research_doc_id uuid not null references public.research_docs(id) on delete cascade,
  location_id uuid not null references public.chapter_locations(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  center_type text not null default 'other'
    check (center_type in ('school', 'library', 'daycare', 'ymca', 'district', 'other')),
  assigned_to text not null default '',
  contact_name text not null default '',
  contact_role text not null default '',
  phone text not null default '',
  email text not null default '',
  status text not null default 'not_contacted'
    check (status in ('lesson_scheduled', 'meeting_scheduled', 'in_talks', 'awaiting_response', 'not_contacted', 'not_interested')),
  last_contacted text not null default '',
  latest_update text not null default '',
  next_step text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists research_docs_location_id_idx on public.research_docs (location_id);
create index if not exists research_centers_location_id_idx on public.research_centers (location_id);
create index if not exists research_centers_research_doc_id_idx on public.research_centers (research_doc_id);

alter table public.research_docs enable row level security;
alter table public.research_centers enable row level security;

create policy "Officers manage research docs for their chapters"
  on public.research_docs
  for all
  to authenticated
  using (exists (select 1 from public.chapter_locations c where c.id = research_docs.location_id and c.officer_id = (select auth.uid())))
  with check (exists (select 1 from public.chapter_locations c where c.id = research_docs.location_id and c.officer_id = (select auth.uid())));

create policy "Officers manage research centers for their chapters"
  on public.research_centers
  for all
  to authenticated
  using (exists (select 1 from public.chapter_locations c where c.id = research_centers.location_id and c.officer_id = (select auth.uid())))
  with check (exists (select 1 from public.chapter_locations c where c.id = research_centers.location_id and c.officer_id = (select auth.uid())));
