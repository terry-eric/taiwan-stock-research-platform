create table if not exists notification_email_allowlist (
  email text primary key,
  enabled integer not null default 1 check (enabled in (0, 1)),
  added_by text not null,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_notification_allowlist_enabled
  on notification_email_allowlist(enabled, email);
