-- Public pages frequently retrieve the latest row for one stock. The existing
-- date-first indexes help date-wide imports, but cannot efficiently serve
-- `where stock_id = ? order by date desc limit 1`.
create index if not exists idx_daily_prices_stock_date
  on daily_prices(stock_id, trade_date desc);

create index if not exists idx_institutional_flows_stock_date
  on institutional_flows(stock_id, trade_date desc);

create index if not exists idx_monthly_revenue_stock_period
  on monthly_revenue(stock_id, revenue_year desc, revenue_month desc);

create index if not exists idx_financial_reports_stock_period
  on financial_reports(stock_id, fiscal_year desc, quarter desc);

create index if not exists idx_data_quality_status_latest
  on data_quality_status(data_type, market_scope, updated_at desc, id desc);
