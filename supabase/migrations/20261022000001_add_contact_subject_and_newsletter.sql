alter table public.contact_messages
  add column if not exists subject text not null default 'other'
    check (subject in ('artist', 'media', 'partnership', 'other'));

create table if not exists public.newsletter_subscribers (
  email text primary key
    check (
      char_length(email) between 3 and 254
      and email = lower(email)
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    ),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

revoke all on table public.newsletter_subscribers from public, anon, authenticated;
grant insert on table public.newsletter_subscribers to service_role;
