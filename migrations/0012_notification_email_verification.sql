alter table notification_email_allowlist
  add column verification_status text not null default 'pending'
  check (verification_status in ('pending', 'verified', 'error'));

alter table notification_email_allowlist
  add column activation_requested integer not null default 1
  check (activation_requested in (0, 1));

alter table notification_email_allowlist add column provider_address_id text;
alter table notification_email_allowlist add column verification_requested_at text;
alter table notification_email_allowlist add column verified_at text;
alter table notification_email_allowlist add column verification_error text;

update notification_email_allowlist
set
  verification_status = 'pending',
  enabled = 0,
  activation_requested = 1,
  verified_at = null;

create index if not exists idx_notification_allowlist_verification
  on notification_email_allowlist(verification_status, activation_requested, enabled);
