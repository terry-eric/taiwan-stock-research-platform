create table if not exists watchlist_notification_preferences (
  user_id integer primary key,
  notify_0800 integer not null default 0 check (notify_0800 in (0, 1)),
  notify_1000 integer not null default 0 check (notify_1000 in (0, 1)),
  notify_1800 integer not null default 0 check (notify_1800 in (0, 1)),
  updated_at text not null
);

create table if not exists notification_delivery_logs (
  id integer primary key autoincrement,
  user_id integer not null,
  notification_date text not null,
  notification_slot text not null check (notification_slot in ('08:00', '10:00', '18:00')),
  recipient_email text not null,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  subject text not null,
  message_id text,
  error_message text,
  created_at text not null,
  unique (user_id, notification_date, notification_slot)
);

create index if not exists idx_notification_delivery_status
  on notification_delivery_logs(notification_date, notification_slot, status);

create table if not exists global_market_snapshots (
  symbol text primary key,
  kind text not null,
  label text not null,
  country text not null,
  market text,
  price real,
  change_value real,
  change_percent real,
  currency text,
  market_time text,
  data_date text,
  contract_month text,
  session text,
  volume real,
  source_status text not null,
  captured_at text not null
);
