alter table stocks add column instrument_type text not null default 'stock';

alter table stock_themes add column confidence_score real not null default 0;
alter table stock_themes add column evidence_type text;
alter table stock_themes add column evidence_url text;
alter table stock_themes add column rule_version text;
alter table stock_themes add column review_status text not null default 'pending';

create table if not exists data_quality_status (
  id integer primary key autoincrement,
  data_type text not null,
  market_scope text not null default 'all',
  source text not null,
  latest_data_date text,
  status text not null,
  record_count integer not null default 0,
  covered_stocks integer not null default 0,
  expected_stocks integer not null default 0,
  is_demo integer not null default 0,
  note text,
  updated_at text not null,
  unique (data_type, market_scope, source)
);

create table if not exists classification_reviews (
  id integer primary key autoincrement,
  stock_id integer not null,
  theme_id integer not null,
  decision text not null,
  confidence_score real,
  evidence_type text,
  evidence_url text,
  note text,
  reviewed_by text,
  reviewed_at text not null,
  unique (stock_id, theme_id)
);

update stocks
set instrument_type = case
  when industry_code = '91' or stock_code glob '91[0-9][0-9]' or stock_name like '%-DR' then 'tdr'
  when stock_code glob '00[0-9][0-9]*' or stock_name like '%ETF%' then 'etf'
  when market_type = '興櫃' then 'emerging'
  else 'stock'
end;

update stocks
set industry_code = case
  when instrument_type = 'etf' then 'ETF'
  when instrument_type = 'tdr' then '91'
  when industry_code is null or trim(industry_code) = '' then 'UNKNOWN'
  when length(trim(industry_code)) = 1 then '0' || trim(industry_code)
  else trim(industry_code)
end;

update stocks
set industry_name = case industry_code
  when '01' then '水泥工業'
  when '02' then '食品工業'
  when '03' then '塑膠工業'
  when '04' then '紡織纖維'
  when '05' then '電機機械'
  when '06' then '電器電纜'
  when '08' then '玻璃陶瓷'
  when '09' then '造紙工業'
  when '10' then '鋼鐵工業'
  when '11' then '橡膠工業'
  when '12' then '汽車工業'
  when '14' then '建材營造'
  when '15' then '航運業'
  when '16' then '觀光餐旅'
  when '17' then '金融保險'
  when '18' then '貿易百貨'
  when '19' then '綜合'
  when '20' then '其他'
  when '21' then '化學工業'
  when '22' then '生技醫療業'
  when '23' then '油電燃氣業'
  when '24' then '半導體業'
  when '25' then '電腦及週邊設備業'
  when '26' then '光電業'
  when '27' then '通信網路業'
  when '28' then '電子零組件業'
  when '29' then '電子通路業'
  when '30' then '資訊服務業'
  when '31' then '其他電子業'
  when '32' then '文化創意業'
  when '33' then '農業科技業'
  when '34' then '電子商務'
  when '35' then '綠能環保'
  when '36' then '數位雲端'
  when '37' then '運動休閒'
  when '38' then '居家生活'
  when '80' then '管理股票'
  when '91' then '臺灣存託憑證'
  when 'ETF' then 'ETF / 指數型基金'
  else '未分類'
end;

update industries
set industry_name = case industry_code
  when '01' then '水泥工業'
  when '02' then '食品工業'
  when '03' then '塑膠工業'
  when '04' then '紡織纖維'
  when '05' then '電機機械'
  when '06' then '電器電纜'
  when '08' then '玻璃陶瓷'
  when '09' then '造紙工業'
  when '10' then '鋼鐵工業'
  when '11' then '橡膠工業'
  when '12' then '汽車工業'
  when '14' then '建材營造'
  when '15' then '航運業'
  when '16' then '觀光餐旅'
  when '17' then '金融保險'
  when '18' then '貿易百貨'
  when '19' then '綜合'
  when '20' then '其他'
  when '21' then '化學工業'
  when '22' then '生技醫療業'
  when '23' then '油電燃氣業'
  when '24' then '半導體業'
  when '25' then '電腦及週邊設備業'
  when '26' then '光電業'
  when '27' then '通信網路業'
  when '28' then '電子零組件業'
  when '29' then '電子通路業'
  when '30' then '資訊服務業'
  when '31' then '其他電子業'
  when '32' then '文化創意業'
  when '33' then '農業科技業'
  when '34' then '電子商務'
  when '35' then '綠能環保'
  when '36' then '數位雲端'
  when '37' then '運動休閒'
  when '38' then '居家生活'
  when '80' then '管理股票'
  when '91' then '臺灣存託憑證'
  when 'ETF' then 'ETF / 指數型基金'
  else '未分類'
end,
description = 'TWSE / TPEx official industry classification';

update stock_themes
set confidence_score = coalesce((
    select max(scr.confidence_score)
    from supply_chain_roles scr
    where scr.stock_id = stock_themes.stock_id and scr.theme_id = stock_themes.theme_id
  ), case relation_strength when '強' then 88 when '中' then 68 else 55 end),
  evidence_type = case when source = 'manual' then 'manual' else 'rule' end,
  evidence_url = source_url,
  rule_version = case when source = 'manual' then 'manual-v1' else 'auto-theme-rule-v1' end,
  review_status = case
    when source = 'manual' then 'approved'
    when coalesce((
      select max(scr.confidence_score)
      from supply_chain_roles scr
      where scr.stock_id = stock_themes.stock_id and scr.theme_id = stock_themes.theme_id
    ), 0) >= 80 then 'approved'
    else 'pending'
  end;

delete from supply_chain_roles
where source = 'auto-theme-rule-v1'
  and exists (
    select 1 from stock_themes st
    where st.stock_id = supply_chain_roles.stock_id
      and st.theme_id = supply_chain_roles.theme_id
      and st.source = 'auto-theme-rule-v1'
      and st.reason = '依官方產業分類與代表股規則自動標註'
  );

delete from stock_themes
where source = 'auto-theme-rule-v1'
  and reason = '依官方產業分類與代表股規則自動標註';

update stocks
set industry_id = (
  select min(i.id)
  from industries i
  where i.industry_code = stocks.industry_code
)
where exists (
  select 1
  from industries i
  where i.industry_code = stocks.industry_code
);

delete from industries
where id not in (
  select min(id)
  from industries
  group by industry_code
);

create unique index if not exists idx_industries_code on industries(industry_code);
create index if not exists idx_stocks_market_industry on stocks(market_type, industry_code, instrument_type);
create index if not exists idx_stock_themes_public on stock_themes(theme_id, review_status, confidence_score);
create index if not exists idx_daily_prices_date_stock on daily_prices(trade_date desc, stock_id);
create index if not exists idx_institutional_flows_date_stock on institutional_flows(trade_date desc, stock_id);
create index if not exists idx_monthly_revenue_period_stock on monthly_revenue(revenue_year desc, revenue_month desc, stock_id);
create index if not exists idx_theme_scores_date_rank on theme_scores(score_date desc, rank);

update data_update_status
set status = 'demo', note = '示範資料；覆蓋率不足，不得作為全市場推薦依據。', last_updated_at = datetime('now')
where data_type in ('financial_report', 'stock_score');

update data_update_status
set status = case
  when latest_data_date = (select max(trade_date) from daily_prices) then status
  else 'stale'
end,
note = case
  when latest_data_date = (select max(trade_date) from daily_prices) then note
  else '題材分數已過期；重新計算前不公開排行。'
end,
last_updated_at = datetime('now')
where data_type = 'theme_score';

insert into data_quality_status (
  data_type, market_scope, source, latest_data_date, status,
  record_count, covered_stocks, expected_stocks, is_demo, note, updated_at
)
select
  'financial_report', 'all', 'd1-seed', max(fiscal_year || '-' || printf('%02d', quarter)),
  'demo', count(*), count(distinct stock_id), (select count(*) from stocks where instrument_type = 'stock'),
  1, '示範資料；覆蓋率未達公開評分門檻。', datetime('now')
from financial_reports
where true
on conflict(data_type, market_scope, source) do update set
  latest_data_date = excluded.latest_data_date,
  status = excluded.status,
  record_count = excluded.record_count,
  covered_stocks = excluded.covered_stocks,
  expected_stocks = excluded.expected_stocks,
  is_demo = excluded.is_demo,
  note = excluded.note,
  updated_at = excluded.updated_at;

insert into data_quality_status (
  data_type, market_scope, source, latest_data_date, status,
  record_count, covered_stocks, expected_stocks, is_demo, note, updated_at
)
select
  'stock_score', 'all', 'score-engine', max(score_date),
  'demo', count(*), count(distinct stock_id), (select count(*) from stocks where instrument_type = 'stock'),
  1, '示範資料；不得作為全市場推薦依據。', datetime('now')
from stock_scores
where true
on conflict(data_type, market_scope, source) do update set
  latest_data_date = excluded.latest_data_date,
  status = excluded.status,
  record_count = excluded.record_count,
  covered_stocks = excluded.covered_stocks,
  expected_stocks = excluded.expected_stocks,
  is_demo = excluded.is_demo,
  note = excluded.note,
  updated_at = excluded.updated_at;

insert into data_quality_status (
  data_type, market_scope, source, latest_data_date, status,
  record_count, covered_stocks, expected_stocks, is_demo, note, updated_at
)
select
  'theme_score', 'all', 'score-engine', max(score_date),
  case when max(score_date) = (select max(trade_date) from daily_prices) then 'success' else 'stale' end,
  count(*), count(distinct theme_id), (select count(*) from themes),
  0, '題材分數必須與最新收盤交易日一致才公開。', datetime('now')
from theme_scores
where true
on conflict(data_type, market_scope, source) do update set
  latest_data_date = excluded.latest_data_date,
  status = excluded.status,
  record_count = excluded.record_count,
  covered_stocks = excluded.covered_stocks,
  expected_stocks = excluded.expected_stocks,
  is_demo = excluded.is_demo,
  note = excluded.note,
  updated_at = excluded.updated_at;
