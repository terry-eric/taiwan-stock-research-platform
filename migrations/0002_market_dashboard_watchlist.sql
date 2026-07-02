create table if not exists market_index_prices (
  id integer primary key autoincrement,
  index_code text not null,
  index_name text,
  trade_date text not null,
  open_index real,
  high_index real,
  low_index real,
  close_index real,
  source text not null,
  source_url text,
  created_at text not null,
  unique (index_code, trade_date)
);

create table if not exists stock_dividends (
  id integer primary key autoincrement,
  stock_id integer not null,
  stock_code text not null,
  stock_name text,
  market_type text,
  ex_dividend_date text not null,
  before_close real,
  reference_price real,
  dividend_value real,
  dividend_type text not null,
  source text not null,
  source_url text,
  created_at text not null,
  unique (stock_id, ex_dividend_date, dividend_type)
);

create table if not exists watchlist_users (
  id integer primary key autoincrement,
  google_sub text not null unique,
  email text not null,
  name text,
  picture text,
  created_at text not null,
  last_login_at text not null
);

create table if not exists watchlist_sessions (
  id integer primary key autoincrement,
  user_id integer not null,
  token text not null unique,
  created_at text not null,
  expires_at text not null,
  user_agent text
);

create table if not exists watchlist_items (
  id integer primary key autoincrement,
  user_id integer not null,
  stock_id integer,
  stock_code text not null,
  note text,
  created_at text not null,
  unique (user_id, stock_code)
);

create index if not exists idx_market_index_prices_code_date on market_index_prices(index_code, trade_date desc);
create index if not exists idx_stock_dividends_stock_date on stock_dividends(stock_id, ex_dividend_date desc);
create index if not exists idx_watchlist_sessions_token on watchlist_sessions(token);
create index if not exists idx_watchlist_items_user on watchlist_items(user_id, created_at desc);
