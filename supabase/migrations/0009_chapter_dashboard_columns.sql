alter table public.chapter_locations
  add column if not exists location text not null default '',
  add column if not exists progress text not null default 'Needs Training',
  add column if not exists progress_notes text not null default '',
  add column if not exists officer_id uuid references auth.users(id) on delete set null;

alter table public.meeting_digests
  add column if not exists location_id uuid references public.chapter_locations(id) on delete cascade;
