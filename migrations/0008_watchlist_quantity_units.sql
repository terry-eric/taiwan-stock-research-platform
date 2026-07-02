alter table watchlist_transactions
  add column quantity_unit text not null default 'shares';
