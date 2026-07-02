drop table if exists data_update_status;
drop table if exists watchlist_items;
drop table if exists watchlist_sessions;
drop table if exists watchlist_users;
drop table if exists stock_dividends;
drop table if exists market_index_prices;
drop table if exists stock_scores;
drop table if exists theme_scores;
drop table if exists institutional_flows;
drop table if exists financial_reports;
drop table if exists monthly_revenue;
drop table if exists daily_prices;
drop table if exists supply_chain_roles;
drop table if exists stock_themes;
drop table if exists themes;
drop table if exists stocks;
drop table if exists industries;
drop table if exists crawler_logs;

create table industries (
  id integer primary key autoincrement,
  industry_code text,
  industry_name text not null,
  parent_industry_id integer,
  description text,
  source text not null,
  source_url text,
  last_updated_at text not null
);

create table stocks (
  id integer primary key autoincrement,
  stock_code text not null,
  stock_name text not null,
  market_type text not null,
  industry_code text,
  industry_name text,
  industry_id integer,
  company_type text,
  listing_date text,
  established_date text,
  capital real,
  chairman text,
  general_manager text,
  spokesperson text,
  company_address text,
  company_url text,
  source text not null,
  source_url text,
  last_updated_at text not null,
  unique (stock_code, market_type)
);

create table themes (
  id integer primary key autoincrement,
  theme_name text not null unique,
  theme_category text,
  description text,
  keywords text,
  source text not null,
  source_url text,
  last_updated_at text not null
);

create table stock_themes (
  id integer primary key autoincrement,
  stock_id integer not null,
  theme_id integer not null,
  relation_strength text not null,
  reason text,
  source text not null,
  source_url text,
  updated_at text not null,
  unique (stock_id, theme_id)
);

create table supply_chain_roles (
  id integer primary key autoincrement,
  stock_id integer not null,
  theme_id integer,
  role_type text not null,
  role_description text,
  major_products text,
  major_customers text,
  confidence_score real,
  source text not null,
  source_url text,
  updated_at text not null
);

create table daily_prices (
  id integer primary key autoincrement,
  stock_id integer not null,
  trade_date text not null,
  open_price real,
  high_price real,
  low_price real,
  close_price real,
  change_price real,
  change_percent real,
  volume real,
  turnover_value real,
  transaction_count real,
  market_type text not null,
  source text not null,
  source_url text,
  created_at text not null,
  unique (stock_id, trade_date)
);

create table monthly_revenue (
  id integer primary key autoincrement,
  stock_id integer not null,
  revenue_year integer not null,
  revenue_month integer not null,
  report_date text,
  monthly_revenue real,
  last_month_revenue real,
  last_year_revenue real,
  mom_growth_percent real,
  yoy_growth_percent real,
  cumulative_revenue real,
  cumulative_yoy_growth_percent real,
  note text,
  source text not null,
  source_url text,
  created_at text not null,
  unique (stock_id, revenue_year, revenue_month)
);

create table financial_reports (
  id integer primary key autoincrement,
  stock_id integer not null,
  fiscal_year integer not null,
  quarter integer not null,
  report_date text,
  revenue real,
  gross_profit real,
  gross_margin real,
  operating_income real,
  operating_margin real,
  net_income real,
  eps real,
  inventory real,
  accounts_receivable real,
  operating_cash_flow real,
  free_cash_flow real,
  source text not null,
  source_url text,
  created_at text not null,
  unique (stock_id, fiscal_year, quarter)
);

create table institutional_flows (
  id integer primary key autoincrement,
  stock_id integer not null,
  trade_date text not null,
  foreign_investor_net_buy real,
  investment_trust_net_buy real,
  dealer_net_buy real,
  total_institutional_net_buy real,
  foreign_investor_holding_shares real,
  foreign_investor_holding_percent real,
  issued_shares real,
  source text not null,
  source_url text,
  created_at text not null,
  unique (stock_id, trade_date)
);

create table market_index_prices (
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

create table stock_dividends (
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

create table watchlist_users (
  id integer primary key autoincrement,
  google_sub text not null unique,
  email text not null,
  name text,
  picture text,
  created_at text not null,
  last_login_at text not null
);

create table watchlist_sessions (
  id integer primary key autoincrement,
  user_id integer not null,
  token text not null unique,
  created_at text not null,
  expires_at text not null,
  user_agent text
);

create table watchlist_items (
  id integer primary key autoincrement,
  user_id integer not null,
  stock_id integer,
  stock_code text not null,
  note text,
  quantity_shares integer not null default 1000,
  buy_price real,
  sell_price real,
  fee_amount real not null default 0,
  tax_amount real not null default 0,
  created_at text not null,
  updated_at text,
  unique (user_id, stock_code)
);

create table theme_scores (
  id integer primary key autoincrement,
  theme_id integer not null,
  score_date text not null,
  turnover_score real,
  institutional_score real,
  momentum_score real,
  fundamental_score real,
  news_score real,
  total_theme_score real,
  rank integer,
  status text not null,
  reason text,
  created_at text not null,
  unique (theme_id, score_date)
);

create table stock_scores (
  id integer primary key autoincrement,
  stock_id integer not null,
  score_date text not null,
  price_momentum_score real,
  volume_score real,
  institutional_score real,
  revenue_score real,
  financial_score real,
  theme_score real,
  risk_score real,
  total_score real,
  status text not null,
  reason text,
  created_at text not null,
  unique (stock_id, score_date)
);

create table data_update_status (
  id integer primary key autoincrement,
  data_type text not null unique,
  latest_data_date text,
  latest_update_time text,
  source text not null,
  status text not null,
  note text,
  created_at text not null,
  last_updated_at text not null
);

create table crawler_logs (
  id integer primary key autoincrement,
  crawler_name text not null,
  source_name text not null,
  target_url text,
  started_at text not null,
  finished_at text,
  status text not null,
  records_inserted integer default 0,
  records_updated integer default 0,
  error_message text,
  created_at text not null
);

create index if not exists idx_market_index_prices_code_date on market_index_prices(index_code, trade_date desc);
create index if not exists idx_stock_dividends_stock_date on stock_dividends(stock_id, ex_dividend_date desc);
create index if not exists idx_watchlist_sessions_token on watchlist_sessions(token);
create index if not exists idx_watchlist_items_user on watchlist_items(user_id, created_at desc);

insert into industries (industry_code, industry_name, description, source, source_url, last_updated_at) values
('24', '半導體', '晶圓代工、IC 設計、封測、半導體設備與材料。', 'd1-seed', 'manual', '2026-06-25T18:00:00+08:00'),
('25', '電腦及週邊', 'AI 伺服器、ODM、資料中心系統與周邊設備。', 'd1-seed', 'manual', '2026-06-25T18:00:00+08:00'),
('28', '電子零組件', 'PCB、ABF、散熱、電源、連接器與機構件。', 'd1-seed', 'manual', '2026-06-25T18:00:00+08:00'),
('15', '電機機械', '機器人、自動化、傳動、重電與工業設備。', 'd1-seed', 'manual', '2026-06-25T18:00:00+08:00'),
('17', '金融', '銀行、金控、壽險與證券。', 'd1-seed', 'manual', '2026-06-25T18:00:00+08:00');

insert into themes (theme_name, theme_category, description, keywords, source, source_url, last_updated_at) values
('AI Server', 'AI', '雲端資本支出與 AI 伺服器出貨主軸。', 'AI,AI Server,GPU,ASIC', 'manual', 'manual', '2026-06-25T18:00:00+08:00'),
('CoWoS', '半導體', '先進封裝與 AI 晶片產能瓶頸。', 'CoWoS,先進封裝,HBM', 'manual', 'manual', '2026-06-25T18:00:00+08:00'),
('散熱', 'AI 硬體', '高功耗 AI 機櫃推動風冷、液冷與熱管理。', '散熱,液冷,冷板', 'manual', 'manual', '2026-06-25T18:00:00+08:00'),
('CPO / 矽光子', '高速傳輸', '資料中心高速傳輸與光通訊升級。', 'CPO,矽光子,光通訊', 'manual', 'manual', '2026-06-25T18:00:00+08:00'),
('機器人', '實體 AI', '傳動、機器視覺、自動化與人形機器人。', '機器人,自動化,傳動', 'manual', 'manual', '2026-06-25T18:00:00+08:00'),
('重電 / 綠能', '電力', '電網強韌、資料中心用電、儲能與電力設備。', '重電,綠能,儲能', 'manual', 'manual', '2026-06-25T18:00:00+08:00'),
('金融', '價值防禦', '金融、金控、銀行、壽險與股息題材。', '金融,金控,股息', 'manual', 'manual', '2026-06-25T18:00:00+08:00');

insert into stocks (stock_code, stock_name, market_type, industry_code, industry_name, industry_id, company_type, listing_date, capital, chairman, general_manager, spokesperson, company_address, company_url, source, source_url, last_updated_at)
select '2330','台積電','上市','24','半導體',id,'上市公司','1994-09-05',259303804580,'劉德音','魏哲家','黃仁昭','新竹科學園區力行六路8號','https://www.tsmc.com','d1-seed','manual','2026-06-25T18:00:00+08:00' from industries where industry_name='半導體';
insert into stocks (stock_code, stock_name, market_type, industry_code, industry_name, industry_id, company_type, listing_date, capital, chairman, general_manager, spokesperson, company_address, company_url, source, source_url, last_updated_at)
select '2382','廣達','上市','25','電腦及週邊',id,'上市公司','1999-01-08',38626274320,'林百里','梁次震','楊俊烈','桃園市龜山區文化二路188號','https://www.quantatw.com','d1-seed','manual','2026-06-25T18:00:00+08:00' from industries where industry_name='電腦及週邊';
insert into stocks (stock_code, stock_name, market_type, industry_code, industry_name, industry_id, company_type, listing_date, capital, chairman, general_manager, spokesperson, company_address, company_url, source, source_url, last_updated_at)
select '2308','台達電','上市','28','電子零組件',id,'上市公司','1988-12-19',25975433070,'海英俊','鄭平','周志宏','台北市內湖區瑞光路186號','https://www.deltaww.com','d1-seed','manual','2026-06-25T18:00:00+08:00' from industries where industry_name='電子零組件';
insert into stocks (stock_code, stock_name, market_type, industry_code, industry_name, industry_id, company_type, listing_date, capital, chairman, general_manager, spokesperson, company_address, company_url, source, source_url, last_updated_at)
select '3017','奇鋐','上市','28','電子零組件',id,'上市公司','2002-09-27',3860000000,'沈慶行','沈慶行','林正敏','新北市新莊區五權二路24號','https://www.avc.co','d1-seed','manual','2026-06-25T18:00:00+08:00' from industries where industry_name='電子零組件';
insert into stocks (stock_code, stock_name, market_type, industry_code, industry_name, industry_id, company_type, listing_date, capital, chairman, general_manager, spokesperson, company_address, company_url, source, source_url, last_updated_at)
select '2049','上銀','上市','15','電機機械',id,'上市公司','2009-06-26',3030000000,'卓永財','蔡惠卿','陳弘毅','台中市南屯區精科路7號','https://www.hiwin.tw','d1-seed','manual','2026-06-25T18:00:00+08:00' from industries where industry_name='電機機械';
insert into stocks (stock_code, stock_name, market_type, industry_code, industry_name, industry_id, company_type, listing_date, capital, chairman, general_manager, spokesperson, company_address, company_url, source, source_url, last_updated_at)
select '2882','國泰金','上市','17','金融',id,'上市公司','2001-12-31',163000000000,'蔡宏圖','李長庚','李偉正','台北市仁愛路四段296號','https://www.cathayholdings.com','d1-seed','manual','2026-06-25T18:00:00+08:00' from industries where industry_name='金融';

insert into stock_themes (stock_id, theme_id, relation_strength, reason, source, source_url, updated_at)
select s.id,t.id,'強','AI 晶片先進製程與 CoWoS 產能核心。','manual','manual','2026-06-25T18:00:00+08:00' from stocks s,themes t where s.stock_code='2330' and t.theme_name='CoWoS';
insert into stock_themes (stock_id, theme_id, relation_strength, reason, source, source_url, updated_at)
select s.id,t.id,'強','AI 伺服器 ODM 與資料中心整機出貨。','manual','manual','2026-06-25T18:00:00+08:00' from stocks s,themes t where s.stock_code='2382' and t.theme_name='AI Server';
insert into stock_themes (stock_id, theme_id, relation_strength, reason, source, source_url, updated_at)
select s.id,t.id,'強','高功率電源、液冷與資料中心能源管理。','manual','manual','2026-06-25T18:00:00+08:00' from stocks s,themes t where s.stock_code='2308' and t.theme_name='散熱';
insert into stock_themes (stock_id, theme_id, relation_strength, reason, source, source_url, updated_at)
select s.id,t.id,'強','AI 伺服器熱管理與液冷模組。','manual','manual','2026-06-25T18:00:00+08:00' from stocks s,themes t where s.stock_code='3017' and t.theme_name='散熱';
insert into stock_themes (stock_id, theme_id, relation_strength, reason, source, source_url, updated_at)
select s.id,t.id,'中','傳動元件與工業自動化受惠機器人需求。','manual','manual','2026-06-25T18:00:00+08:00' from stocks s,themes t where s.stock_code='2049' and t.theme_name='機器人';
insert into stock_themes (stock_id, theme_id, relation_strength, reason, source, source_url, updated_at)
select s.id,t.id,'中','金融防禦與股息題材。','manual','manual','2026-06-25T18:00:00+08:00' from stocks s,themes t where s.stock_code='2882' and t.theme_name='金融';

insert into supply_chain_roles (stock_id, theme_id, role_type, role_description, major_products, major_customers, confidence_score, source, source_url, updated_at)
select s.id,t.id,'上游','AI 晶片先進製程與先進封裝產能提供者。','晶圓代工、CoWoS','AI 晶片設計公司、CSP',95,'manual','manual','2026-06-25T18:00:00+08:00' from stocks s,themes t where s.stock_code='2330' and t.theme_name='CoWoS';
insert into supply_chain_roles (stock_id, theme_id, role_type, role_description, major_products, major_customers, confidence_score, source, source_url, updated_at)
select s.id,t.id,'下游','AI 伺服器 ODM，負責整機與機櫃系統出貨。','AI Server、整櫃系統','雲端服務供應商',92,'manual','manual','2026-06-25T18:00:00+08:00' from stocks s,themes t where s.stock_code='2382' and t.theme_name='AI Server';
insert into supply_chain_roles (stock_id, theme_id, role_type, role_description, major_products, major_customers, confidence_score, source, source_url, updated_at)
select s.id,t.id,'中游','資料中心電源與散熱解決方案供應商。','電源供應、液冷、風扇','伺服器與資料中心客戶',90,'manual','manual','2026-06-25T18:00:00+08:00' from stocks s,themes t where s.stock_code='2308' and t.theme_name='散熱';
insert into supply_chain_roles (stock_id, theme_id, role_type, role_description, major_products, major_customers, confidence_score, source, source_url, updated_at)
select s.id,t.id,'零組件','AI 伺服器散熱模組與液冷零組件。','散熱模組、冷板、液冷零件','伺服器 ODM',88,'manual','manual','2026-06-25T18:00:00+08:00' from stocks s,themes t where s.stock_code='3017' and t.theme_name='散熱';
insert into supply_chain_roles (stock_id, theme_id, role_type, role_description, major_products, major_customers, confidence_score, source, source_url, updated_at)
select s.id,t.id,'上游','自動化與機器人傳動元件。','線性滑軌、滾珠螺桿','工業自動化與機器人廠',82,'manual','manual','2026-06-25T18:00:00+08:00' from stocks s,themes t where s.stock_code='2049' and t.theme_name='機器人';

insert into daily_prices (stock_id, trade_date, open_price, high_price, low_price, close_price, change_price, change_percent, volume, turnover_value, transaction_count, market_type, source, source_url, created_at)
select id,'2026-06-25',1070,1095,1065,1085,25,2.36,41230,44600000000,58120,market_type,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2330';
insert into daily_prices (stock_id, trade_date, open_price, high_price, low_price, close_price, change_price, change_percent, volume, turnover_value, transaction_count, market_type, source, source_url, created_at)
select id,'2026-06-25',302,316,300,312,10,3.31,68200,21200000000,35110,market_type,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2382';
insert into daily_prices (stock_id, trade_date, open_price, high_price, low_price, close_price, change_price, change_percent, volume, turnover_value, transaction_count, market_type, source, source_url, created_at)
select id,'2026-06-25',420,432,418,428,8,1.90,28100,12000000000,24560,market_type,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2308';
insert into daily_prices (stock_id, trade_date, open_price, high_price, low_price, close_price, change_price, change_percent, volume, turnover_value, transaction_count, market_type, source, source_url, created_at)
select id,'2026-06-25',790,846,785,835,45,5.70,19800,16500000000,22100,market_type,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='3017';
insert into daily_prices (stock_id, trade_date, open_price, high_price, low_price, close_price, change_price, change_percent, volume, turnover_value, transaction_count, market_type, source, source_url, created_at)
select id,'2026-06-25',250,260,249,256,6,2.40,8400,2150000000,7800,market_type,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2049';
insert into daily_prices (stock_id, trade_date, open_price, high_price, low_price, close_price, change_price, change_percent, volume, turnover_value, transaction_count, market_type, source, source_url, created_at)
select id,'2026-06-25',61,62.5,60.8,62,0.7,1.14,35600,2200000000,15300,market_type,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2882';

insert into monthly_revenue (stock_id, revenue_year, revenue_month, report_date, monthly_revenue, last_month_revenue, last_year_revenue, mom_growth_percent, yoy_growth_percent, cumulative_revenue, cumulative_yoy_growth_percent, note, source, source_url, created_at)
select id,2026,5,'2026-06-10',296830,282900,225700,4.9,31.5,1392000,28.2,'示範資料','d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2330';
insert into monthly_revenue (stock_id, revenue_year, revenue_month, report_date, monthly_revenue, last_month_revenue, last_year_revenue, mom_growth_percent, yoy_growth_percent, cumulative_revenue, cumulative_yoy_growth_percent, note, source, source_url, created_at)
select id,2026,5,'2026-06-09',126450,116760,88540,8.3,42.7,578200,36.1,'示範資料','d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2382';
insert into monthly_revenue (stock_id, revenue_year, revenue_month, report_date, monthly_revenue, last_month_revenue, last_year_revenue, mom_growth_percent, yoy_growth_percent, cumulative_revenue, cumulative_yoy_growth_percent, note, source, source_url, created_at)
select id,2026,5,'2026-06-10',48920,47180,39170,3.7,24.9,229000,20.4,'示範資料','d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2308';
insert into monthly_revenue (stock_id, revenue_year, revenue_month, report_date, monthly_revenue, last_month_revenue, last_year_revenue, mom_growth_percent, yoy_growth_percent, cumulative_revenue, cumulative_yoy_growth_percent, note, source, source_url, created_at)
select id,2026,5,'2026-06-10',14820,13220,8800,12.1,68.4,62900,52.3,'示範資料','d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='3017';
insert into monthly_revenue (stock_id, revenue_year, revenue_month, report_date, monthly_revenue, last_month_revenue, last_year_revenue, mom_growth_percent, yoy_growth_percent, cumulative_revenue, cumulative_yoy_growth_percent, note, source, source_url, created_at)
select id,2026,5,'2026-06-10',2630,2543,2220,3.4,18.5,12600,12.8,'示範資料','d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2049';
insert into monthly_revenue (stock_id, revenue_year, revenue_month, report_date, monthly_revenue, last_month_revenue, last_year_revenue, mom_growth_percent, yoy_growth_percent, cumulative_revenue, cumulative_yoy_growth_percent, note, source, source_url, created_at)
select id,2026,5,'2026-06-10',84210,85230,76960,-1.2,9.4,402300,7.9,'示範資料','d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2882';

insert into financial_reports (stock_id, fiscal_year, quarter, report_date, revenue, gross_profit, gross_margin, operating_income, operating_margin, net_income, eps, inventory, accounts_receivable, operating_cash_flow, free_cash_flow, source, source_url, created_at)
select id,2026,1,'2026-05-14',839250,479000,57.1,392800,46.8,341800,13.2,228000,196500,410000,250000,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2330';
insert into financial_reports (stock_id, fiscal_year, quarter, report_date, revenue, gross_profit, gross_margin, operating_income, operating_margin, net_income, eps, inventory, accounts_receivable, operating_cash_flow, free_cash_flow, source, source_url, created_at)
select id,2026,1,'2026-05-14',358600,29400,8.2,17570,4.9,15800,4.1,168000,141000,22000,9000,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2382';
insert into financial_reports (stock_id, fiscal_year, quarter, report_date, revenue, gross_profit, gross_margin, operating_income, operating_margin, net_income, eps, inventory, accounts_receivable, operating_cash_flow, free_cash_flow, source, source_url, created_at)
select id,2026,1,'2026-05-14',139900,43640,31.2,19450,13.9,12420,4.8,43000,37500,19800,11800,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2308';
insert into financial_reports (stock_id, fiscal_year, quarter, report_date, revenue, gross_profit, gross_margin, operating_income, operating_margin, net_income, eps, inventory, accounts_receivable, operating_cash_flow, free_cash_flow, source, source_url, created_at)
select id,2026,1,'2026-05-14',38100,9370,24.6,5860,15.4,2380,6.2,12600,11200,3100,1800,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='3017';
insert into financial_reports (stock_id, fiscal_year, quarter, report_date, revenue, gross_profit, gross_margin, operating_income, operating_margin, net_income, eps, inventory, accounts_receivable, operating_cash_flow, free_cash_flow, source, source_url, created_at)
select id,2026,1,'2026-05-14',7420,2530,34.1,831,11.2,920,2.6,5100,3300,1460,880,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2049';
insert into financial_reports (stock_id, fiscal_year, quarter, report_date, revenue, gross_profit, gross_margin, operating_income, operating_margin, net_income, eps, inventory, accounts_receivable, operating_cash_flow, free_cash_flow, source, source_url, created_at)
select id,2026,1,'2026-05-14',251000,null,null,null,null,28100,1.9,null,null,33000,25000,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2882';

insert into institutional_flows (stock_id, trade_date, foreign_investor_net_buy, investment_trust_net_buy, dealer_net_buy, total_institutional_net_buy, source, source_url, created_at)
select id,'2026-06-25',1680,520,-80,2120,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2330';
insert into institutional_flows (stock_id, trade_date, foreign_investor_net_buy, investment_trust_net_buy, dealer_net_buy, total_institutional_net_buy, source, source_url, created_at)
select id,'2026-06-25',920,860,120,1900,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2382';
insert into institutional_flows (stock_id, trade_date, foreign_investor_net_buy, investment_trust_net_buy, dealer_net_buy, total_institutional_net_buy, source, source_url, created_at)
select id,'2026-06-25',760,640,90,1490,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2308';
insert into institutional_flows (stock_id, trade_date, foreign_investor_net_buy, investment_trust_net_buy, dealer_net_buy, total_institutional_net_buy, source, source_url, created_at)
select id,'2026-06-25',410,720,60,1190,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='3017';
insert into institutional_flows (stock_id, trade_date, foreign_investor_net_buy, investment_trust_net_buy, dealer_net_buy, total_institutional_net_buy, source, source_url, created_at)
select id,'2026-06-25',80,210,10,300,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2049';
insert into institutional_flows (stock_id, trade_date, foreign_investor_net_buy, investment_trust_net_buy, dealer_net_buy, total_institutional_net_buy, source, source_url, created_at)
select id,'2026-06-25',520,30,-20,530,'d1-seed','manual','2026-06-25T18:00:00+08:00' from stocks where stock_code='2882';

insert into theme_scores (theme_id, score_date, turnover_score, institutional_score, momentum_score, fundamental_score, news_score, total_theme_score, rank, status, reason, created_at)
select id,'2026-06-25',92,88,91,82,83,88.7,1,'主流','成交值、法人、AI 伺服器出貨與基本面同步支撐。','2026-06-25T18:00:00+08:00' from themes where theme_name='AI Server';
insert into theme_scores (theme_id, score_date, turnover_score, institutional_score, momentum_score, fundamental_score, news_score, total_theme_score, rank, status, reason, created_at)
select id,'2026-06-25',88,84,86,90,80,86.0,2,'主流','先進封裝產能與 AI 晶片需求支撐。','2026-06-25T18:00:00+08:00' from themes where theme_name='CoWoS';
insert into theme_scores (theme_id, score_date, turnover_score, institutional_score, momentum_score, fundamental_score, news_score, total_theme_score, rank, status, reason, created_at)
select id,'2026-06-25',95,82,94,86,76,87.5,3,'過熱','成交與股價快速升溫，需追蹤財報支撐。','2026-06-25T18:00:00+08:00' from themes where theme_name='散熱';
insert into theme_scores (theme_id, score_date, turnover_score, institutional_score, momentum_score, fundamental_score, news_score, total_theme_score, rank, status, reason, created_at)
select id,'2026-06-25',74,68,77,61,72,70.5,4,'轉強','高速傳輸題材升溫但量產時程仍需確認。','2026-06-25T18:00:00+08:00' from themes where theme_name='CPO / 矽光子';
insert into theme_scores (theme_id, score_date, turnover_score, institutional_score, momentum_score, fundamental_score, news_score, total_theme_score, rank, status, reason, created_at)
select id,'2026-06-25',66,62,69,58,75,66.0,5,'觀察','實體 AI 題材熱，但基本面仍在驗證。','2026-06-25T18:00:00+08:00' from themes where theme_name='機器人';
insert into theme_scores (theme_id, score_date, turnover_score, institutional_score, momentum_score, fundamental_score, news_score, total_theme_score, rank, status, reason, created_at)
select id,'2026-06-25',70,71,68,74,62,69.7,6,'轉強','電網與資料中心用電需求帶動。','2026-06-25T18:00:00+08:00' from themes where theme_name='重電 / 綠能';

insert into stock_scores (stock_id, score_date, price_momentum_score, volume_score, institutional_score, revenue_score, financial_score, theme_score, risk_score, total_score, status, reason, created_at)
select id,'2026-06-25',82,78,86,88,92,86,8,87,'強勢','AI 晶片、先進封裝、法人與基本面同步。','2026-06-25T18:00:00+08:00' from stocks where stock_code='2330';
insert into stock_scores (stock_id, score_date, price_momentum_score, volume_score, institutional_score, revenue_score, financial_score, theme_score, risk_score, total_score, status, reason, created_at)
select id,'2026-06-25',88,90,84,91,80,89,12,86,'強勢','AI 伺服器出貨與資金動能強。','2026-06-25T18:00:00+08:00' from stocks where stock_code='2382';
insert into stock_scores (stock_id, score_date, price_momentum_score, volume_score, institutional_score, revenue_score, financial_score, theme_score, risk_score, total_score, status, reason, created_at)
select id,'2026-06-25',78,81,82,79,83,84,7,82,'轉強','電源散熱與資料中心能源管理受惠。','2026-06-25T18:00:00+08:00' from stocks where stock_code='2308';
insert into stock_scores (stock_id, score_date, price_momentum_score, volume_score, institutional_score, revenue_score, financial_score, theme_score, risk_score, total_score, status, reason, created_at)
select id,'2026-06-25',96,95,78,94,88,87,24,81,'過熱','散熱題材強，但短線漲幅偏高。','2026-06-25T18:00:00+08:00' from stocks where stock_code='3017';
insert into stock_scores (stock_id, score_date, price_momentum_score, volume_score, institutional_score, revenue_score, financial_score, theme_score, risk_score, total_score, status, reason, created_at)
select id,'2026-06-25',68,61,62,70,72,66,5,67,'轉強','機器人與自動化需求低基期改善。','2026-06-25T18:00:00+08:00' from stocks where stock_code='2049';
insert into stock_scores (stock_id, score_date, price_momentum_score, volume_score, institutional_score, revenue_score, financial_score, theme_score, risk_score, total_score, status, reason, created_at)
select id,'2026-06-25',48,45,55,51,57,40,3,53,'中性','金融防禦屬性，資金溫和。','2026-06-25T18:00:00+08:00' from stocks where stock_code='2882';

insert into data_update_status (data_type, latest_data_date, latest_update_time, source, status, note, created_at, last_updated_at) values
('stock_basic','2026-06-25','2026-06-25T18:00:00+08:00','d1-seed','success','D1 示範資料，正式版接 TWSE/TPEx/MOPS','2026-06-25T18:00:00+08:00','2026-06-25T18:00:00+08:00'),
('daily_price','2026-06-25','2026-06-25T18:00:00+08:00','d1-seed','success','盤後示範行情','2026-06-25T18:00:00+08:00','2026-06-25T18:00:00+08:00'),
('intraday_quote',null,'2026-06-25T18:00:00+08:00','none','partial','尚未接授權即時行情；不得宣稱即時報價','2026-06-25T18:00:00+08:00','2026-06-25T18:00:00+08:00'),
('monthly_revenue','2026-05-01','2026-06-25T18:00:00+08:00','d1-seed','success','示範月營收','2026-06-25T18:00:00+08:00','2026-06-25T18:00:00+08:00'),
('financial_report','2026-03-31','2026-06-25T18:00:00+08:00','d1-seed','success','示範 2026 Q1 財報','2026-06-25T18:00:00+08:00','2026-06-25T18:00:00+08:00'),
('institutional_flow','2026-06-25','2026-06-25T18:00:00+08:00','d1-seed','success','示範法人買賣超','2026-06-25T18:00:00+08:00','2026-06-25T18:00:00+08:00'),
('theme_score','2026-06-25','2026-06-25T18:00:00+08:00','score-engine','success','示範主題分數','2026-06-25T18:00:00+08:00','2026-06-25T18:00:00+08:00'),
('stock_score','2026-06-25','2026-06-25T18:00:00+08:00','score-engine','success','示範個股分數','2026-06-25T18:00:00+08:00','2026-06-25T18:00:00+08:00');
