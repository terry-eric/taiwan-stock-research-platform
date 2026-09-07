import { pathToFileURL } from 'node:url';
import { isSupportedSecurityCode } from '../src/security-codes.js';
const WORKER_BASE_URL = String(process.env.WORKER_BASE_URL || "https://claw.terry878.org").replace(/\/$/, "");
const TPEX_SYNC_TOKEN = String(process.env.TPEX_SYNC_TOKEN || "");

const SOURCES = {
  dailyPrice: "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes",
  emergingPrice: "https://www.tpex.org.tw/openapi/v1/tpex_esb_latest_statistics",
  valuation: "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_peratio_analysis",
  institutional: "https://www.tpex.org.tw/openapi/v1/tpex_3insti_daily_trading",
};

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
  return isSupportedSecurityCode(String(value || "").trim()) ? String(value).trim() : null;
}

export async function officialJson(url, {fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), log = console.log} = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      log(JSON.stringify({event:'tpex_source_start',source:url,attempt}));
      const response = await fetchImpl(url, {signal:controller.signal, headers:{
        accept:'application/json', 'accept-encoding':'identity',
        'accept-language':'zh-TW,zh;q=0.9,en;q=0.7', referer:'https://www.tpex.org.tw/openapi/',
        'user-agent':'Mozilla/5.0 (compatible; TaiwanStockResearchPlatform/1.0; official-data-sync)',
      }});
      if (!response.ok) {
        await response.body?.cancel();
        throw Object.assign(new Error('HTTP ' + response.status), { permanent: response.status >= 400 && response.status < 500 && ![408,429].includes(response.status) });
      }
      // Retry covers the entire response body, including UND_ERR_SOCKET while
      // reading JSON, not just receipt of HTTP headers. Bound memory usage.
      const reader = response.body.getReader();
      const chunks = []; let size = 0;
      try {
        while (true) {
          const {done,value} = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 8 * 1024 * 1024) { await reader.cancel(); throw Object.assign(new Error('response exceeds 8 MiB'),{permanent:true}); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!Array.isArray(data) || !data.length) throw Object.assign(new Error('empty or invalid official data'),{permanent:true});
      log(JSON.stringify({event:'tpex_source_ready',source:url,attempt,rows:data.length}));
      return data;
    } catch(error) {
      const reason = error.cause?.code || error.code || error.name;
      log(JSON.stringify({event:'tpex_source_error',source:url,attempt,reason}));
      if (error.permanent || attempt === 3) throw new Error('Official source failed: ' + url + ' (' + reason + ')');
    } finally { clearTimeout(timer); }
    await sleep(attempt * 2000);
  }
}

async function post(path, payload) {
  const response = await fetch(`${WORKER_BASE_URL}${path}`, {
    signal: AbortSignal.timeout(60000),
    method: "POST",
    headers: { authorization: `Bearer ${TPEX_SYNC_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} failed ${response.status}: ${body.error || "unknown error"}`);
  if (!body.data || typeof body.data !== 'object') throw new Error(`${path} returned an invalid import result`);
  return body.data;
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

export async function runSync({load = officialJson, send = post, log = console.log} = {}) {
  const jobs = [
    ['dailyPrice','daily-price',normalizeOtcPrice], ['emergingPrice','daily-price',normalizeEmergingPrice],
    ['valuation','stock-valuation',normalizeValuation], ['institutional','institutional-flow',normalizeInstitutional],
  ];
  const results = {}, errors = [];
  let changed = false, uncertainWrite = false;
  // Run sources independently. One unavailable report must not discard others.
  for (const [name, endpoint, normalize] of jobs) {
    let posting = false;
    try {
      const sourceRows = await load(SOURCES[name]);
      const rows = sourceRows.map(normalize).filter(Boolean);
      if (!rows.length) throw new Error('No supported rows: ' + name);
      posting = true;
      const result = await send('/api/tpex-sync/' + endpoint, {rows,latest_data_date:latestDate(rows)});
      results[name] = result;
      changed ||= Number(result.changed || 0) > 0;
      log(JSON.stringify({event:'tpex_import',source:name,source_rows:sourceRows.length,accepted_rows:rows.length,result}));
    } catch(error) {
      // Never blindly repeat a POST: a disconnected response may have committed.
      // Recompute once when uncertain, rather than silently leaving stale scores.
      uncertainWrite ||= posting;
      errors.push(name);
      log(JSON.stringify({event:'tpex_job_failed',source:name,phase:posting?'import':'download',reason:error.name}));
    }
  }
  if (changed || uncertainWrite) results.scores = await send('/api/tpex-sync/complete', {});
  log(JSON.stringify({event:'tpex_external_sync',changed,uncertainWrite,errors,results}));
  if (errors.length) throw new Error('Failed sources: ' + errors.join(', '));
  return {changed,results};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!TPEX_SYNC_TOKEN) throw new Error('TPEX_SYNC_TOKEN is required');
  await runSync();
}
