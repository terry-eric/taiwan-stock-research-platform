create table if not exists stock_valuations (
  id integer primary key autoincrement,
  stock_id integer not null,
  trade_date text not null,
  pe_ratio real,
  ttm_eps real,
  dividend_yield real,
  pb_ratio real,
  fiscal_period text,
  market_type text not null,
  source text not null,
  source_url text,
  created_at text not null,
  unique (stock_id, trade_date)
);

create index if not exists idx_stock_valuations_stock_date
  on stock_valuations(stock_id, trade_date desc);

create index if not exists idx_stock_valuations_date_market
  on stock_valuations(trade_date desc, market_type);
