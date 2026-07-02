alter table watchlist_transactions
  add column transaction_mode text not null default 'cash';

create index if not exists idx_watchlist_transactions_user_mode
  on watchlist_transactions(user_id, stock_code, transaction_mode, trade_date, id);
