create table if not exists notification_email_allowlist (
  email text primary key,
  enabled integer not null default 1 check (enabled in (0, 1)),
  added_by text not null,
  created_at text not null,
  updated_at text not null
);

insert into notification_email_allowlist (email, enabled, added_by, created_at, updated_at)
values
  ('admin@example.invalid', 1, 'system-seed', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z'),
  ('member@example.invalid', 1, 'system-seed', '2026-07-03T00:00:00Z', '2026-07-03T00:00:00Z')
on conflict(email) do update set
  enabled = 1,
  updated_at = excluded.updated_at;

create index if not exists idx_notification_allowlist_enabled
  on notification_email_allowlist(enabled, email);
