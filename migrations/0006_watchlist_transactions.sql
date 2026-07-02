create table if not exists watchlist_transactions (
  id integer primary key autoincrement,
  user_id integer not null,
  stock_id integer,
  stock_code text not null,
  side text not null check (side in ('buy', 'sell')),
  trade_date text not null,
  quantity_shares integer not null,
  price real not null,
  gross_amount real not null,
  fee_preset text not null,
  fee_rate_percent real,
  minimum_fee real not null default 0,
  fee_amount real not null default 0,
  tax_preset text not null,
  tax_rate_percent real not null default 0,
  tax_amount real not null default 0,
  note text,
  created_at text not null
);

create index if not exists idx_watchlist_transactions_user_date
  on watchlist_transactions(user_id, trade_date desc, id desc);

create index if not exists idx_watchlist_transactions_user_stock
  on watchlist_transactions(user_id, stock_code, trade_date, id);

insert into watchlist_transactions (
  user_id, stock_id, stock_code, side, trade_date, quantity_shares, price,
  gross_amount, fee_preset, fee_rate_percent, minimum_fee, fee_amount,
  tax_preset, tax_rate_percent, tax_amount, note, created_at
)
select
  user_id, stock_id, stock_code, 'buy', substr(created_at, 1, 10),
  coalesce(quantity_shares, 1000), buy_price,
  coalesce(quantity_shares, 1000) * buy_price,
  'legacy-manual', null, 0,
  case when sell_price is not null then coalesce(fee_amount, 0) / 2.0 else coalesce(fee_amount, 0) end,
  'none', 0, 0, note, created_at
from watchlist_items
where buy_price is not null and buy_price > 0;

insert into watchlist_transactions (
  user_id, stock_id, stock_code, side, trade_date, quantity_shares, price,
  gross_amount, fee_preset, fee_rate_percent, minimum_fee, fee_amount,
  tax_preset, tax_rate_percent, tax_amount, note, created_at
)
select
  user_id, stock_id, stock_code, 'sell', substr(coalesce(updated_at, created_at), 1, 10),
  coalesce(quantity_shares, 1000), sell_price,
  coalesce(quantity_shares, 1000) * sell_price,
  'legacy-manual', null, 0, coalesce(fee_amount, 0) / 2.0,
  'legacy-manual', 0, coalesce(tax_amount, 0), note, coalesce(updated_at, created_at)
from watchlist_items
where sell_price is not null and sell_price > 0;
