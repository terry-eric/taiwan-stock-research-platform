const WORKER_BASE_URL = String(process.env.WORKER_BASE_URL || "https://claw.terry878.org").replace(/\/$/, "");
const TPEX_SYNC_TOKEN = String(process.env.TPEX_SYNC_TOKEN || "");

const SOURCES = {
  dailyPrice: "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes",
  emergingPrice: "https://www.tpex.org.tw/openapi/v1/tpex_esb_latest_statistics",
  valuation: "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_peratio_analysis",
  institutional: "https://www.tpex.org.tw/openapi/v1/tpex_3insti_daily_trading",
};

if (!TPEX_SYNC_TOKEN) throw new Error("TPEX_SYNC_TOKEN is required");

function value(row, keys, fallback = null) {
  for (const key of keys) {
    if (Object.hasOwn(row, key) && row[key] !== "") return row[key];
  }
  return fallback;
}

function number(value) {
  if (value === null || value === undefined || value === "" || value === "--") return null;
  const parsed = Number(String(value).replaceAll(",", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function rocDateToIso(input) {
  const digits = String(input || "").replace(/\D/g, "");
  if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  if (digits.length === 7) return `${Number(digits.slice(0, 3)) + 1911}-${digits.slice(3, 5)}-${digits.slice(5, 7)}`;
  return null;
}

function commonStockCode(value) {
  return /^\d{4}$/.test(String(value || "").trim()) ? String(value).trim() : null;
}

async function officialJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "accept-language": "zh-TW,zh;q=0.9,en;q=0.7",
      referer: "https://www.tpex.org.tw/openapi/",
      "user-agent": "Mozilla/5.0 (compatible; TaiwanStockResearchPlatform/1.0; official-data-sync)",
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error(`Official TPEx source did not return an array: ${url}`);
  return data;
}

async function post(path, payload) {
  const response = await fetch(`${WORKER_BASE_URL}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${TPEX_SYNC_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} failed ${response.status}: ${body.error || "unknown error"}`);
  return body.data || {};
}

function normalizeOtcPrice(row) {
  const stockCode = commonStockCode(value(row, ["SecuritiesCompanyCode", "股票代號"]));
  const close = number(value(row, ["Close", "收盤"]));
  const change = number(value(row, ["Change", "漲跌"]));
  if (!stockCode || !rocDateToIso(value(row, ["Date", "日期"]))) return null;
  const previousClose = close !== null && change !== null ? close - change : null;
  return {
    stock_code: stockCode, stock_name: value(row, ["CompanyName", "證券名稱"], stockCode), market_type: "上櫃",
    trade_date: rocDateToIso(value(row, ["Date", "日期"])), open_price: number(value(row, ["Open", "開盤"])),
    high_price: number(value(row, ["High", "最高"])), low_price: number(value(row, ["Low", "最低"])), close_price: close,
    change_price: change, change_percent: previousClose ? (change / previousClose) * 100 : null,
    volume: number(value(row, ["TradingShares", "成交股數"])), turnover_value: number(value(row, ["TransactionAmount", "成交金額"])),
    transaction_count: number(value(row, ["TransactionNumber", "成交筆數"])), source: "TPEx OpenAPI external sync", source_url: SOURCES.dailyPrice,
  };
}

function normalizeEmergingPrice(row) {
  const stockCode = commonStockCode(value(row, ["SecuritiesCompanyCode", "股票代號"]));
  if (!stockCode || !rocDateToIso(value(row, ["Date", "日期"]))) return null;
  return {
    stock_code: stockCode, stock_name: value(row, ["CompanyName", "證券名稱"], stockCode), market_type: "興櫃",
    trade_date: rocDateToIso(value(row, ["Date", "日期"])), open_price: null,
    high_price: number(value(row, ["Highest", "最高"])), low_price: number(value(row, ["Lowest", "最低"])),
    close_price: number(value(row, ["LatestPrice", "Average", "最新成交價", "均價"])), change_price: null, change_percent: null,
    volume: number(value(row, ["TradingVolume", "成交量"])), turnover_value: number(value(row, ["TransactionAmount", "成交金額"])),
    transaction_count: null, source: "TPEx OpenAPI external sync", source_url: SOURCES.emergingPrice,
  };
}

function normalizeValuation(row) {
  const stockCode = commonStockCode(value(row, ["SecuritiesCompanyCode", "股票代號"]));
  if (!stockCode || !rocDateToIso(value(row, ["Date", "日期"]))) return null;
  return {
    stock_code: stockCode, stock_name: value(row, ["CompanyName", "公司名稱"], stockCode), market_type: "上櫃",
    trade_date: rocDateToIso(value(row, ["Date", "日期"])), pe_ratio: number(value(row, ["PriceEarningRatio", "本益比"])),
    dividend_yield: number(value(row, ["YieldRatio", "殖利率(%)"])), pb_ratio: number(value(row, ["PriceBookRatio", "股價淨值比"])),
    fiscal_period: null, source: "TPEx OpenAPI external sync", source_url: SOURCES.valuation,
  };
}

function normalizeInstitutional(row) {
  const stockCode = commonStockCode(value(row, ["SecuritiesCompanyCode", "股票代號"]));
  const sharesToLots = (input) => { const amount = number(input); return amount === null ? null : amount / 1000; };
  if (!stockCode || !rocDateToIso(value(row, ["Date", "日期"]))) return null;
  const foreign = sharesToLots(value(row, ["ForeignInvestorsIncludeMainlandAreaInvestors-Difference", "ForeignInvestorsInclude MainlandAreaInvestors-Difference"]));
  const trust = sharesToLots(value(row, ["SecuritiesInvestmentTrustCompanies-Difference"]));
  const dealer = sharesToLots(value(row, ["Dealers-Difference"]));
  return {
    stock_code: stockCode, stock_name: value(row, ["CompanyName", "公司名稱"], stockCode), market_type: "上櫃",
    trade_date: rocDateToIso(value(row, ["Date", "日期"])), foreign_investor_net_buy: foreign,
    investment_trust_net_buy: trust, dealer_net_buy: dealer,
    total_institutional_net_buy: sharesToLots(value(row, ["TotalDifference"])) ?? [foreign, trust, dealer].reduce((sum, item) => sum + Number(item || 0), 0),
    source: "TPEx OpenAPI external sync", source_url: SOURCES.institutional,
  };
}

function latestDate(rows) {
  return rows.reduce((latest, row) => !latest || row.trade_date > latest ? row.trade_date : latest, null);
}

const [otc, emerging, valuation, institutional] = await Promise.all([
  officialJson(SOURCES.dailyPrice), officialJson(SOURCES.emergingPrice), officialJson(SOURCES.valuation), officialJson(SOURCES.institutional),
]);
const priceRows = [...otc.map(normalizeOtcPrice), ...emerging.map(normalizeEmergingPrice)].filter(Boolean);
const valuationRows = valuation.map(normalizeValuation).filter(Boolean);
const institutionalRows = institutional.map(normalizeInstitutional).filter(Boolean);

const results = {};
results.daily_price = await post("/api/tpex-sync/daily-price", { rows: priceRows, latest_data_date: latestDate(priceRows) });
results.stock_valuation = await post("/api/tpex-sync/stock-valuation", { rows: valuationRows });
results.institutional_flow = await post("/api/tpex-sync/institutional-flow", { rows: institutionalRows, latest_data_date: latestDate(institutionalRows) });

const changed = Object.values(results).some((result) => Number(result.changed || 0) > 0);
if (changed) results.scores = await post("/api/tpex-sync/complete", {});
console.log(JSON.stringify({ event: "tpex_external_sync", rows: { daily_price: priceRows.length, stock_valuation: valuationRows.length, institutional_flow: institutionalRows.length }, changed, results }));
