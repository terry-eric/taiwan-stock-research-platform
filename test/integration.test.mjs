import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker, { normalizeTwseMiIndexDailyRow, notificationEmailContent } from "../src/index.js";

class D1Statement {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values) {
    return new D1Statement(this.database, this.sql, values);
  }

  async all() {
    const results = this.database.prepare(this.sql).all(...this.values);
    return { success: true, results };
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.values) || null;
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return {
      success: true,
      meta: {
        changes: Number(result.changes || 0),
        last_row_id: Number(result.lastInsertRowid || 0),
      },
    };
  }
}

class D1TestDatabase {
  constructor() {
    this.database = new DatabaseSync(":memory:");
    const migrationDirectory = new URL("../migrations/", import.meta.url);
    for (const file of readdirSync(migrationDirectory).filter((name) => name.endsWith(".sql")).sort()) {
      this.database.exec(readFileSync(new URL(file, migrationDirectory), "utf8"));
    }
  }

  prepare(sql) {
    return new D1Statement(this.database, sql);
  }

  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }

  exec(sql) {
    this.database.exec(sql);
  }
}

function request(path, init) {
  return new Request(`https://example.test${path}`, init);
}

test("expanded stock filters and classification quality execute against the migrated schema", async () => {
  const DB = new D1TestDatabase();
  const env = { DB, ADMIN_SYNC_TOKEN: "test-secret" };
  DB.exec(`
    insert into stocks (
      stock_code, stock_name, market_type, industry_code, industry_name,
      company_type, source, source_url, last_updated_at, instrument_type
    ) values (
      '0050', '元大台灣50', '上市', 'ETF', 'ETF',
      '上市ETF', 'test', 'test', '2026-07-03T00:00:00Z', 'etf'
    )
  `);

  const stocksResponse = await worker.fetch(request(
    "/api/stocks?industry=24&instrument_type=stock&institutional_window=5&flow_party=foreign&sort=institutional&limit=5",
  ), env, {});
  assert.equal(stocksResponse.status, 200);
  const stocksPayload = await stocksResponse.json();
  assert.ok(Array.isArray(stocksPayload.data));
  assert.equal(stocksPayload.meta.institutional_window, 5);

  const partialThemeResponse = await worker.fetch(request("/api/stocks?theme=CoWo&limit=20"), env, {});
  assert.equal(partialThemeResponse.status, 200);
  const partialThemePayload = await partialThemeResponse.json();
  assert.ok(partialThemePayload.data.length > 0, "partial theme text must return matching stocks");

  const themeSuggestionResponse = await worker.fetch(request("/api/themes/suggest?q=CoWo&limit=8"), env, {});
  assert.equal(themeSuggestionResponse.status, 200);
  const themeSuggestionPayload = await themeSuggestionResponse.json();
  assert.ok(themeSuggestionPayload.data.some((row) => row.theme_name === "CoWoS"));

  const stockSuggestionResponse = await worker.fetch(request("/api/stocks/suggest?q=元大台&limit=15"), env, {});
  assert.equal(stockSuggestionResponse.status, 200);
  const stockSuggestionPayload = await stockSuggestionResponse.json();
  assert.equal(stockSuggestionPayload.data[0].stock_code, "0050");
  assert.equal(stockSuggestionPayload.data[0].instrument_label, "ETF");

  const keywordResponse = await worker.fetch(request("/api/stocks?keyword=0050&limit=5"), env, {});
  assert.equal(keywordResponse.status, 200);
  const keywordPayload = await keywordResponse.json();
  assert.equal(keywordPayload.data[0].stock_code, "0050", "keyword searches must not silently exclude non-common-stock instruments");

  const treeResponse = await worker.fetch(request("/api/stocks/tree?rows=5000&page=2"), env, {});
  assert.equal(treeResponse.status, 200);
  const treePayload = await treeResponse.json();
  assert.equal(treePayload.meta.page, 2);
  assert.equal(treePayload.meta.page_size, 1000);

  const qualityResponse = await worker.fetch(request("/api/classifications/quality"), env, {});
  assert.equal(qualityResponse.status, 200);
  const qualityPayload = await qualityResponse.json();
  assert.equal(qualityPayload.meta.taxonomy_version, "2026.06.30-v2");
  assert.equal(qualityPayload.data.stocks.invalid_industry_names, 0);
  assert.ok(Array.isArray(qualityPayload.data.datasets));

  const dashboardResponse = await worker.fetch(request("/api/market/dashboard"), env, {});
  assert.equal(dashboardResponse.status, 200);
  const dashboardPayload = await dashboardResponse.json();
  assert.ok(Array.isArray(dashboardPayload.data.institutional_leaders.foreign.buy));
  assert.ok(Array.isArray(dashboardPayload.data.industry_concentration));
  const industry = dashboardPayload.data.industry_concentration[0];
  if (industry) {
    const detailResponse = await worker.fetch(request(
      `/api/market/industry-concentration?industry_code=${encodeURIComponent(industry.industry_code)}&page=1&page_size=5`,
    ), env, {});
    assert.equal(detailResponse.status, 200);
    const detailPayload = await detailResponse.json();
    assert.equal(detailPayload.data.industry_code, industry.industry_code);
    assert.equal(detailPayload.data.page, 1);
    assert.ok(Array.isArray(detailPayload.data.rows));
    assert.ok(detailPayload.data.rows.every((row) => typeof row.detail_label === "string"));
  }
  const foreignLeader = dashboardPayload.data.institutional_leaders.foreign.buy[0];
  if (foreignLeader) {
    assert.equal(typeof foreignLeader.consecutive_days, "number");
    assert.equal(typeof foreignLeader.cumulative_net_buy_5d, "number");
  }
});

test("dashboard focus cards use the correct institution, direction, and stock", async () => {
  const DB = new D1TestDatabase();
  DB.exec(`
    delete from institutional_flows;
    insert into institutional_flows (
      stock_id, trade_date, foreign_investor_net_buy, investment_trust_net_buy,
      dealer_net_buy, total_institutional_net_buy, source, source_url, created_at
    )
    select id, '2099-01-01',
      case stock_code when '2330' then 1000 when '2382' then -900 else 0 end,
      case stock_code when '2308' then 800 when '3017' then -700 else 0 end,
      case stock_code when '2049' then 600 when '2882' then -500 else 0 end,
      case stock_code
        when '2330' then 1000 when '2382' then -900
        when '2308' then 800 when '3017' then -700
        when '2049' then 600 when '2882' then -500
      end,
      'integration-test', 'manual', '2099-01-01T18:00:00+08:00'
    from stocks
    where stock_code in ('2330', '2382', '2308', '3017', '2049', '2882');
  `);

  const response = await worker.fetch(request("/api/market/dashboard"), { DB }, {});
  assert.equal(response.status, 200);
  const payload = await response.json();
  const flow = payload.data.flow;

  assert.deepEqual(
    [
      flow.foreign_buy.stock_code,
      flow.foreign_sell.stock_code,
      flow.trust_buy.stock_code,
      flow.trust_sell.stock_code,
      flow.dealer_buy.stock_code,
      flow.dealer_sell.stock_code,
    ],
    ["2330", "2382", "2308", "3017", "2049", "2882"],
  );
  assert.ok(flow.foreign_buy.foreign_investor_net_buy > 0);
  assert.ok(flow.foreign_sell.foreign_investor_net_buy < 0);
  assert.ok(flow.trust_buy.investment_trust_net_buy > 0);
  assert.ok(flow.trust_sell.investment_trust_net_buy < 0);
  assert.ok(flow.dealer_buy.dealer_net_buy > 0);
  assert.ok(flow.dealer_sell.dealer_net_buy < 0);
});

test("classification review survives through the protected admin API", async () => {
  const DB = new D1TestDatabase();
  DB.exec(`
    update stock_themes
    set review_status = 'pending', confidence_score = 70
    where id = (select min(id) from stock_themes);
  `);
  const env = { DB, ADMIN_SYNC_TOKEN: "test-secret" };
  const headers = { authorization: "Bearer test-secret", "content-type": "application/json" };

  const pendingResponse = await worker.fetch(request("/api/admin/classifications/pending", { headers }), env, {});
  assert.equal(pendingResponse.status, 200);
  const pendingPayload = await pendingResponse.json();
  assert.equal(pendingPayload.data.length, 1);

  const row = pendingPayload.data[0];
  const reviewResponse = await worker.fetch(request(
    `/api/admin/classifications/${row.stock_code}/themes/${row.theme_id}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        decision: "approved",
        evidence_url: "https://example.test/evidence",
        reviewed_by: "integration-test",
      }),
    },
  ), env, {});
  assert.equal(reviewResponse.status, 200);
  const updated = DB.database.prepare(`
    select review_status, confidence_score, source
    from stock_themes
    where stock_id = (select id from stocks where stock_code = ? limit 1) and theme_id = ?
  `).get(row.stock_code, row.theme_id);
  assert.equal(updated.review_status, "approved");
  assert.equal(updated.confidence_score, 100);
  assert.equal(updated.source, "manual-review");
});

test("stock basic bulk import normalizes industries without per-row queries", async () => {
  const DB = new D1TestDatabase();
  const env = { DB, ADMIN_SYNC_TOKEN: "test-secret" };
  const rows = Array.from({ length: 6 }, (_, index) => ({
    stock_code: String(7001 + index),
    stock_name: `測試公司${index + 1}`,
    market_type: "上市",
    industry_code: "25",
    industry_name: "25",
    source: "integration-test",
  }));
  const response = await worker.fetch(request("/api/admin/import/twse-stock-basic", {
    method: "POST",
    headers: { authorization: "Bearer test-secret", "content-type": "application/json" },
    body: JSON.stringify({ rows, source: "integration-test" }),
  }), env, {});
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.data.inserted, 6);
  const imported = DB.database.prepare(`
    select count(*) as count
    from stocks
    where stock_code between '7001' and '7006'
      and industry_name = '電腦及週邊設備業'
      and instrument_type = 'stock'
  `).get();
  assert.equal(imported.count, 6);
});

test("a newly observed emerging quote is not misclassified as a common stock", async () => {
  const DB = new D1TestDatabase();
  const response = await worker.fetch(request("/api/admin/import/twse-daily-price", {
    method: "POST",
    headers: { authorization: "Bearer test-secret", "content-type": "application/json" },
    body: JSON.stringify({
      source: "TPEx OpenAPI",
      latest_data_date: "2099-01-01",
      rows: [{
        stock_code: "7999",
        stock_name: "測試興櫃",
        market_type: "興櫃",
        trade_date: "2099-01-01",
        close_price: 10,
      }],
    }),
  }), { DB, ADMIN_SYNC_TOKEN: "test-secret" }, {});
  assert.equal(response.status, 200);
  const stock = DB.database.prepare(`
    select instrument_type
    from stocks
    where stock_code = '7999' and market_type = '興櫃'
  `).get();
  assert.equal(stock.instrument_type, "emerging");
});

test("available-data stock scores are reproducible and unlock recommendations without demo financials", async () => {
  const DB = new D1TestDatabase();
  const response = await worker.fetch(request("/api/admin/scores/recompute", {
    method: "POST",
    headers: { authorization: "Bearer test-secret" },
  }), { DB, ADMIN_SYNC_TOKEN: "test-secret" }, {});
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(["success", "partial"].includes(payload.data.theme_score.status));
  assert.equal(
    payload.data.theme_score.score_date,
    DB.database.prepare("select max(trade_date) as trade_date from daily_prices").get().trade_date,
  );
  assert.equal(payload.data.stock_score.status, "success");
  assert.equal(payload.data.stock_score.stocks, 6);

  const score = DB.database.prepare(`
    select *
    from stock_scores
    where score_date = (select max(score_date) from stock_scores)
    order by stock_id
    limit 1
  `).get();
  const expected = Math.round(
    score.price_momentum_score * 0.25
    + score.volume_score * 0.20
    + score.institutional_score * 0.25
    + score.revenue_score * 0.20
    + score.theme_score * 0.10,
  );
  assert.equal(score.total_score, expected);
  assert.equal(score.financial_score, null);
  assert.match(score.reason, /可用資料公式 v1/);

  const qualityResponse = await worker.fetch(request("/api/classifications/quality"), { DB }, {});
  const quality = await qualityResponse.json();
  assert.equal(quality.data.recommendations_ready, true);
  assert.equal(quality.data.score_formula.version, "available-data-score-v1");
});

test("hot API responses become cache hits on the second request", async () => {
  const DB = new D1TestDatabase();
  const stored = new Map();
  const originalCaches = globalThis.caches;
  globalThis.caches = {
    default: {
      async match(cacheKey) {
        return stored.get(cacheKey.url)?.clone() || null;
      },
      async put(cacheKey, response) {
        stored.set(cacheKey.url, response.clone());
      },
    },
  };
  const pending = [];
  const ctx = { waitUntil(promise) { pending.push(promise); } };
  try {
    const first = await worker.fetch(request("/api/market/dashboard"), { DB }, ctx);
    assert.equal(first.status, 200);
    assert.equal(first.headers.get("x-cache"), "MISS");
    await Promise.all(pending);

    const second = await worker.fetch(request("/api/market/dashboard"), { DB }, ctx);
    assert.equal(second.status, 200);
    assert.equal(second.headers.get("x-cache"), "HIT");
    assert.match(second.headers.get("server-timing") || "", /desc="HIT"/);
  } finally {
    if (originalCaches === undefined) delete globalThis.caches;
    else globalThis.caches = originalCaches;
  }
});

test("homepage renders from the migrated schema within the initial HTML budget", async () => {
  const DB = new D1TestDatabase();
  const response = await worker.fetch(request("/"), { DB, ADMIN_SYNC_TOKEN: "test-secret" }, {});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-cache"), "BYPASS");
  assert.match(response.headers.get("server-timing") || "", /db;dur=/);
  const html = await response.text();
  const htmlBytes = new TextEncoder().encode(html).byteLength;
  assert.ok(htmlBytes < 100_000, `initial HTML is ${htmlBytes} bytes`);
  assert.match(html, /href="\/research"/);
  assert.match(html, /href="\/taxonomy"/);
  assert.match(html, /href="\/data"/);
  assert.match(html, /href="\/guide"/);
  assert.match(html, /href="\/watchlist#login">Google 登入/);
  assert.match(html, /href="\/watchlist">自選股／交易帳本/);
  assert.match(html, /href="\/disclaimer"/);
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /data-install-app/);
  assert.match(html, /\/assets\/pwa\.js/);
  assert.match(html, /data-global-market/);
  assert.match(html, /美國 · 道瓊工業/);
  assert.match(html, /熱度/);
  assert.doesNotMatch(html, /id="data-quality"/);
  assert.doesNotMatch(html, /id="stock-screener"/);
  assert.doesNotMatch(html, /data-flow-application-index=/);

  const qualityPage = await worker.fetch(request("/data"), { DB }, {});
  const qualityHtml = await qualityPage.text();
  assert.match(qualityHtml, /id="data-quality"/);
  assert.match(qualityHtml, /id="sources"/);
  assert.doesNotMatch(qualityHtml, /id="stock-compare"/);

  const recommendationPage = await worker.fetch(request("/market"), { DB }, {});
  const recommendationHtml = await recommendationPage.text();
  assert.match(recommendationHtml, /評分公式 v1/);
  assert.match(recommendationHtml, /id="market-dashboard"/);
  assert.match(recommendationHtml, /data-global-market/);
  assert.match(recommendationHtml, /Global & Night Session/);
  assert.match(recommendationHtml, /id="capital-concentration"/);
  assert.match(recommendationHtml, /市場資金集中量圖/);
  assert.match(recommendationHtml, /id="institutional-flow"/);
  assert.doesNotMatch(recommendationHtml, /id="data-quality"/);

  const researchPage = await worker.fetch(request("/research"), { DB }, {});
  const researchHtml = await researchPage.text();
  assert.match(researchHtml, /id="stock-screener"/);
  assert.match(researchHtml, /id="stock-compare"/);
  assert.match(researchHtml, /data-stock-lookup-input/);
  assert.match(researchHtml, /進階條件選股/);
  assert.match(researchHtml, /data-screener-theme-suggestions/);
  assert.match(researchHtml, /aria-live="polite"/);
  assert.doesNotMatch(researchHtml, /id="market-dashboard"/);

  const disclaimerPage = await worker.fetch(request("/disclaimer"), { DB }, {});
  const disclaimerHtml = await disclaimerPage.text();
  assert.equal(disclaimerPage.status, 200);
  assert.match(disclaimerHtml, /投資決策與盈虧由使用者自行承擔/);
  assert.match(disclaimerHtml, /不構成任何買進、賣出、持有或其他投資建議/);
  assert.match(disclaimerHtml, /依法不得排除或限制的責任/);

  const guidePage = await worker.fetch(request("/guide"), { DB }, {});
  const guideHtml = await guidePage.text();
  assert.equal(guidePage.status, 200);
  assert.match(guideHtml, /平台特色/);
  assert.match(guideHtml, /08:00/);
  assert.match(guideHtml, /Email 更新提醒/);
  assert.match(guideHtml, /交易帳本/);

  const industryPage = await worker.fetch(request("/taxonomy"), { DB }, {});
  const industryHtml = await industryPage.text();
  assert.match(industryHtml, /data-mode="stock"/);
  assert.match(industryHtml, /data-mode="theme"/);
  assert.match(industryHtml, /id="leader-roster"/);
  assert.match(industryHtml, /data-add-leader/);
  assert.match(industryHtml, /data-delete-leader/);
  assert.match(industryHtml, /負責區塊／備註/);

  const legacyPage = await worker.fetch(request("/compare"), { DB }, {});
  assert.equal(legacyPage.status, 302);
  assert.match(legacyPage.headers.get("location") || "", /\/research#stock-compare$/);

  const cssResponse = await worker.fetch(request("/assets/performance.css"), { DB }, {});
  assert.equal(cssResponse.status, 200);
  assert.match(cssResponse.headers.get("cache-control") || "", /immutable/);
  const appCssResponse = await worker.fetch(request("/assets/app.css"), { DB }, {});
  assert.equal(appCssResponse.status, 200);
  assert.match(appCssResponse.headers.get("cache-control") || "", /immutable/);
  const jsResponse = await worker.fetch(request("/assets/lazy-trees.js"), { DB }, {});
  assert.equal(jsResponse.status, 200);
  assert.match(jsResponse.headers.get("cache-control") || "", /immutable/);
  const appJsResponse = await worker.fetch(request("/assets/app.js"), { DB }, {});
  assert.equal(appJsResponse.status, 200);
  assert.match(appJsResponse.headers.get("cache-control") || "", /immutable/);
  const appJs = await appJsResponse.text();
  assert.doesNotThrow(() => new Function(appJs), "generated app.js must be valid JavaScript");
  assert.ok(appJs.includes("/api/stocks/suggest?q="), "all stock search inputs must use the complete stock-master suggestion endpoint");
  assert.ok(appJs.includes("選取後直接開啟個股資訊"), "stock lookup must explain its direct-open behavior");
  assert.ok(appJs.includes("/api/themes/suggest"), "screener theme input must provide partial-text suggestions");
  assert.ok(appJs.includes("data-screener-theme-example"), "screener must expose quick examples");
  assert.ok(appJs.includes("已清除進階條件"), "advanced screener must provide a clear reset state");
  assert.ok(appJs.includes("查看完整個股抽屜"), "compare cards must keep the stock drawer entry point");
  assert.ok(appJs.includes("data-compare-suggestion"), "compare input must expose clickable stock suggestions");
  assert.ok(appJs.includes("compare-chip"), "selected compare stocks must render as removable chips");
  assert.ok(appJs.includes("個股評分"), "stock drawer must show the published score breakdown");
  assert.ok(appJs.includes("/history?months=24"), "stock drawer must request cached historical OHLC");
  assert.ok(appJs.includes("移動平均線"), "stock drawer must expose the moving-average toggle");
  assert.ok(appJs.includes("布林通道"), "stock drawer must expose the Bollinger toggle");
  assert.ok(appJs.includes("MA10 "), "moving-average legend must show the latest MA value");
  assert.ok(appJs.includes("price-grid"), "moving averages must be overlaid on the K-line price grid");
  assert.ok(appJs.includes("/news"), "stock drawer must load trusted news on demand");
  assert.ok(appJs.includes("本益比"), "stock drawer and compare cards must expose P/E");
  assert.ok(appJs.includes("latestRevenueAnnouncement"), "stock drawer must show actual revenue announcement dates");
  assert.ok(appJs.includes("/api/market/industry-concentration"), "capital chart must support industry drilldown");
  assert.ok(appJs.includes("/api/market/global"), "global and night-session quotes must load after the main page");
  const appCss = await appCssResponse.text();
  assert.match(appCss, /\.update small\{[^}]*white-space:nowrap/);
});

test("PWA shell exposes install metadata, registration, and required app icons", async () => {
  const manifest = JSON.parse(readFileSync(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.lang, "zh-Hant");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose.includes("maskable")));
  for (const size of [192, 512]) {
    const icon = readFileSync(new URL(`../public/icons/app-icon-${size}.png`, import.meta.url));
    assert.equal(icon.toString("ascii", 1, 4), "PNG");
    assert.equal(icon.readUInt32BE(16), size);
    assert.equal(icon.readUInt32BE(20), size);
  }
  const pwaResponse = await worker.fetch(request("/assets/pwa.js"), {}, {});
  assert.equal(pwaResponse.status, 200);
  const script = await pwaResponse.text();
  assert.match(script, /beforeinstallprompt/);
  assert.match(script, /serviceWorker\.register\("\/sw\.js"/);
});

test("stock valuation uses trailing EPS and trusted news keeps an official fallback", async () => {
  const DB = new D1TestDatabase();
  DB.exec(`
    insert into financial_reports (
      stock_id, fiscal_year, quarter, report_date, eps, source, source_url, created_at
    )
    select id, 2025, 1, '2025-05-14', 10, 'test', 'test', '2025-05-14T00:00:00Z'
    from stocks where stock_code = '2330';
    insert into financial_reports (
      stock_id, fiscal_year, quarter, report_date, eps, source, source_url, created_at
    )
    select id, 2025, 4, '2026-03-31', 45, 'test', 'test', '2026-03-31T00:00:00Z'
    from stocks where stock_code = '2330';
  `);
  const stockResponse = await worker.fetch(request("/api/stocks/2330"), { DB }, {});
  assert.equal(stockResponse.status, 200);
  const stockPayload = await stockResponse.json();
  assert.equal(stockPayload.data.valuation.ttm_eps, 48.2);
  assert.ok(stockPayload.data.valuation.pe_ratio > 0);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("offline test"); };
  try {
    const newsResponse = await worker.fetch(request("/api/stocks/2330/news"), { DB }, {});
    assert.equal(newsResponse.status, 200);
    const newsPayload = await newsResponse.json();
    assert.equal(newsPayload.data[0].confidence, "official");
    assert.match(newsPayload.data[0].url, /^https:\/\//);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("trusted stock news still requires a matching code, company name, or ticker", async () => {
  const DB = new D1TestDatabase();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    news: [
      {
        title: "Japan government panel member calls for moderate BOJ rate hikes",
        publisher: "Reuters",
        link: "https://example.com/unrelated",
        relatedTickers: ["^N225"],
      },
      {
        title: "台積電先進製程需求持續成長",
        publisher: "中央社",
        link: "https://example.com/relevant-name",
      },
      {
        title: "AI demand lifts chip foundry outlook",
        publisher: "Reuters",
        link: "https://example.com/relevant-ticker",
        relatedTickers: ["2330.TW"],
      },
    ],
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  try {
    const response = await worker.fetch(request("/api/stocks/2330/news"), { DB }, {});
    assert.equal(response.status, 200);
    const payload = await response.json();
    const titles = payload.data.map((row) => row.title);
    assert.equal(titles.length, 3, "official fallback plus two relevant trusted articles");
    assert.ok(titles.some((title) => title.includes("台積電")));
    assert.ok(titles.some((title) => title.includes("chip foundry")));
    assert.ok(!titles.some((title) => title.includes("Japan government")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("official daily P/E takes priority and derives TTM EPS without demo financial coverage", async () => {
  const DB = new D1TestDatabase();
  DB.exec(`
    insert into stock_valuations (
      stock_id, trade_date, pe_ratio, dividend_yield, pb_ratio, fiscal_period,
      market_type, source, source_url, created_at
    )
    select id, '2026-07-01', 20, 2.5, 5.1, '115Q1',
      market_type, 'TWSE BWIBBU_ALL', 'https://openapi.twse.com.tw/', '2026-07-01T10:00:00Z'
    from stocks where stock_code = '2330';
  `);
  const response = await worker.fetch(request("/api/stocks/2330"), { DB }, {});
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.data.valuation.pe_ratio, 20);
  assert.equal(payload.data.valuation.source, "TWSE BWIBBU_ALL");
  assert.equal(payload.data.valuation.status, "available");
  assert.ok(payload.data.valuation.ttm_eps > 0);
  assert.match(payload.data.valuation.formula, /官方每日公布本益比/);
});

test("global market endpoint combines five indices with the nearest TAIFEX night contract", async () => {
  const DB = new D1TestDatabase();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("query1.finance.yahoo.com/v8/finance/chart")) {
      return new Response(JSON.stringify({
        chart: {
          result: [{
            meta: {
              regularMarketPrice: 21000,
              chartPreviousClose: 20800,
              regularMarketTime: 1782921600,
              currency: "USD",
            },
            indicators: { quote: [{ close: [20800, 21000] }] },
          }],
          error: null,
        },
      }), { headers: { "content-type": "application/json" } });
    }
    if (url.includes("openapi.taifex.com.tw/v1/DailyMarketReportFut")) {
      return new Response(JSON.stringify([
        { Date: "20260701", Contract: "TX", "ContractMonth(Week)": "202608", Last: "47635", Change: "640", "%": "1.36%", Volume: "328", TradingSession: "盤後" },
        { Date: "20260701", Contract: "TX", "ContractMonth(Week)": "202607", Last: "47428", Change: "649", "%": "1.39%", Volume: "39982", TradingSession: "盤後" },
      ]), { headers: { "content-type": "application/json" } });
    }
    throw new Error(`unexpected external URL: ${url}`);
  };
  try {
    const response = await worker.fetch(request("/api/market/global"), { DB }, {});
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") || "", /s-maxage=300/);
    const payload = await response.json();
    assert.equal(payload.data.length, 6);
    assert.equal(payload.data[0].label, "道瓊工業");
    assert.equal(payload.data[0].country, "美國");
    assert.equal(payload.data[5].label, "台指期夜盤");
    assert.equal(payload.data[5].country, "台灣");
    assert.equal(payload.data[5].contract_month, "202607");
    assert.equal(payload.data[5].price, 47428);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("08:00 scheduler stores global market snapshots without blocking on email", async () => {
  const DB = new D1TestDatabase();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("query1.finance.yahoo.com/v8/finance/chart")) {
      return new Response(JSON.stringify({
        chart: {
          result: [{
            meta: { regularMarketPrice: 21000, chartPreviousClose: 20800, regularMarketTime: 1782921600, currency: "USD" },
            indicators: { quote: [{ close: [20800, 21000] }] },
          }],
          error: null,
        },
      }), { headers: { "content-type": "application/json" } });
    }
    if (url.includes("openapi.taifex.com.tw/v1/DailyMarketReportFut")) {
      return new Response(JSON.stringify([
        { Date: "20260703", Contract: "TX", "ContractMonth(Week)": "202607", Last: "48000", Change: "120", "%": "0.25%", Volume: "12000", TradingSession: "盤後" },
      ]), { headers: { "content-type": "application/json" } });
    }
    throw new Error(`unexpected external URL: ${url}`);
  };
  try {
    let scheduledPromise;
    await worker.scheduled({
      scheduledTime: Date.parse("2026-07-03T00:00:00Z"),
      cron: "0 0,2,10 * * *",
    }, { DB }, {
      waitUntil(promise) { scheduledPromise = promise; },
    });
    const result = await scheduledPromise;
    assert.equal(result.slot, "08:00");
    assert.equal(result.report.rows.length, 6);
    const snapshotCount = await DB.prepare("select count(*) as count from global_market_snapshots").first();
    assert.equal(snapshotCount.count, 6);
    const quality = await DB.prepare("select * from data_quality_status where data_type = 'global_market'").first();
    assert.equal(quality.status, "success");
    assert.equal(result.notifications.selected, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("stock history endpoint returns stored OHLC when external history is unavailable", async () => {
  const DB = new D1TestDatabase();
  DB.exec("update stocks set market_type = '上櫃' where stock_code = '2330'");
  const response = await worker.fetch(request("/api/stocks/2330/history?months=24"), { DB }, {});
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.data));
  assert.ok(payload.data.length >= 1);
  assert.equal(payload.meta.history.market_type, "上櫃");
  assert.match(payload.meta.history.source, /D1/);
});

test("watchlist transaction ledger calculates fees, sell tax, inventory, and realized profit", async () => {
  const DB = new D1TestDatabase();
  DB.exec(`
    insert into watchlist_users (google_sub, email, name, picture, created_at, last_login_at)
    values ('ledger-user', 'ledger@example.test', 'Ledger User', '', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
    insert into watchlist_sessions (user_id, token, created_at, expires_at, user_agent)
    select id, 'ledger-token', '2026-01-01T00:00:00Z', '2099-01-01T00:00:00Z', 'test'
    from watchlist_users where google_sub = 'ledger-user';
  `);
  const authenticated = (path, body) => request(path, {
    method: body ? "POST" : "GET",
    headers: {
      cookie: "twstock_watchlist=ledger-token",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const buyResponse = await worker.fetch(authenticated("/api/watchlist/transactions", {
    stock_code: "2330",
    side: "buy",
    trade_date: "2026-06-29",
    quantity_shares: 1000,
    price: 100,
    fee_preset: "standard",
    minimum_fee: 20,
    tax_preset: "auto",
  }), { DB }, {});
  assert.equal(buyResponse.status, 200);
  const buyPayload = await buyResponse.json();
  assert.equal(buyPayload.data.transactions[0].fee_amount, 143);
  assert.equal(buyPayload.data.transactions[0].tax_amount, 0);
  assert.equal(buyPayload.data.positions[0].position_quantity_shares, 1000);
  assert.equal(buyPayload.data.positions[0].remaining_cost, 100143);
  const migratedSession = DB.database.prepare("select token from watchlist_sessions limit 1").get();
  assert.match(migratedSession.token, /^[a-f0-9]{64}$/);
  assert.notEqual(migratedSession.token, "ledger-token");

  const sellResponse = await worker.fetch(authenticated("/api/watchlist/transactions", {
    stock_code: "2330",
    side: "sell",
    trade_date: "2026-06-30",
    quantity_shares: 500,
    price: 110,
    fee_preset: "standard",
    minimum_fee: 20,
    tax_preset: "stock",
  }), { DB }, {});
  assert.equal(sellResponse.status, 200);
  const sellPayload = await sellResponse.json();
  assert.equal(sellPayload.data.transactions[0].fee_amount, 78);
  assert.equal(sellPayload.data.transactions[0].tax_amount, 165);
  assert.equal(sellPayload.data.positions[0].position_quantity_shares, 500);
  assert.equal(sellPayload.data.positions[0].realized_profit_amount, 4686);
  assert.equal(sellPayload.data.summary.total_fee_amount, 221);

  const missingManualTaxResponse = await worker.fetch(authenticated("/api/watchlist/transactions", {
    stock_code: "2330",
    side: "sell",
    trade_date: "2026-06-30",
    quantity_shares: 1,
    price: 110,
    fee_preset: "standard",
    minimum_fee: 20,
    tax_preset: "manual_amount",
  }), { DB }, {});
  assert.equal(missingManualTaxResponse.status, 400);

  const manualTaxResponse = await worker.fetch(authenticated("/api/watchlist/transactions", {
    stock_code: "2330",
    side: "sell",
    trade_date: "2026-06-30",
    quantity_shares: 1,
    price: 110,
    fee_preset: "standard",
    minimum_fee: 20,
    tax_preset: "manual_amount",
    manual_tax_amount: 7,
  }), { DB }, {});
  assert.equal(manualTaxResponse.status, 200);
  const manualTaxPayload = await manualTaxResponse.json();
  assert.equal(manualTaxPayload.data.transactions[0].tax_preset, "manual_amount");
  assert.equal(manualTaxPayload.data.transactions[0].tax_amount, 7);

  const oversellResponse = await worker.fetch(authenticated("/api/watchlist/transactions", {
    stock_code: "2330",
    side: "sell",
    trade_date: "2026-06-30",
    quantity_shares: 501,
    price: 110,
    fee_preset: "standard",
    minimum_fee: 20,
    tax_preset: "stock",
  }), { DB }, {});
  assert.equal(oversellResponse.status, 400);

  const missingManualFeeResponse = await worker.fetch(authenticated("/api/watchlist/transactions", {
    stock_code: "2330",
    side: "buy",
    trade_date: "2026-06-30",
    quantity_shares: 1,
    price: 110,
    fee_preset: "manual_amount",
    tax_preset: "auto",
  }), { DB }, {});
  assert.equal(missingManualFeeResponse.status, 400);

  const manualFeeResponse = await worker.fetch(authenticated("/api/watchlist/transactions", {
    stock_code: "2330",
    side: "buy",
    trade_date: "2026-06-30",
    quantity_shares: 1,
    price: 110,
    fee_preset: "manual_amount",
    manual_fee_amount: 5,
    tax_preset: "auto",
  }), { DB }, {});
  assert.equal(manualFeeResponse.status, 200);
  const manualFeePayload = await manualFeeResponse.json();
  assert.equal(manualFeePayload.data.transactions[0].fee_preset, "manual_amount");
  assert.equal(manualFeePayload.data.transactions[0].fee_amount, 5);

  const invalidShortCoverResponse = await worker.fetch(authenticated("/api/watchlist/transactions", {
    stock_code: "2330",
    side: "buy",
    transaction_mode: "day_short",
    trade_date: "2026-07-01",
    quantity_shares: 1,
    price: 100,
    fee_preset: "standard",
    minimum_fee: 20,
    tax_preset: "auto",
  }), { DB }, {});
  assert.equal(invalidShortCoverResponse.status, 400);

  const shortOpenResponse = await worker.fetch(authenticated("/api/watchlist/transactions", {
    stock_code: "2330",
    side: "sell",
    transaction_mode: "day_short",
    trade_date: "2026-07-01",
    quantity_shares: 10,
    price: 120,
    fee_preset: "standard",
    minimum_fee: 20,
    tax_preset: "auto",
  }), { DB }, {});
  assert.equal(shortOpenResponse.status, 200);
  const shortOpenPayload = await shortOpenResponse.json();
  assert.equal(shortOpenPayload.data.transactions[0].transaction_mode, "day_short");
  assert.equal(shortOpenPayload.data.transactions[0].tax_rate_percent, 0.15);
  assert.equal(shortOpenPayload.data.positions[0].short_quantity_shares, 10);
  const realizedBeforeCover = shortOpenPayload.data.positions[0].realized_profit_amount;

  const shortCoverResponse = await worker.fetch(authenticated("/api/watchlist/transactions", {
    stock_code: "2330",
    side: "buy",
    transaction_mode: "day_short",
    trade_date: "2026-07-01",
    quantity_shares: 10,
    price: 100,
    fee_preset: "standard",
    minimum_fee: 20,
    tax_preset: "auto",
  }), { DB }, {});
  assert.equal(shortCoverResponse.status, 200);
  const shortCoverPayload = await shortCoverResponse.json();
  assert.equal(shortCoverPayload.data.positions[0].short_quantity_shares, 0);
  assert.equal(shortCoverPayload.data.positions[0].realized_profit_amount - realizedBeforeCover, 158);

  const lotBuyResponse = await worker.fetch(authenticated("/api/watchlist/transactions", {
    stock_code: "2330",
    side: "buy",
    transaction_mode: "cash",
    trade_date: "2026-07-01",
    quantity_value: 2,
    quantity_unit: "lots",
    price: 100,
    fee_preset: "standard",
    minimum_fee: 20,
    tax_preset: "auto",
  }), { DB }, {});
  assert.equal(lotBuyResponse.status, 200);
  const lotBuyPayload = await lotBuyResponse.json();
  assert.equal(lotBuyPayload.data.transactions[0].quantity_shares, 2000);
  assert.equal(lotBuyPayload.data.transactions[0].quantity_unit, "lots");

  const temporaryPositionResponse = await worker.fetch(authenticated("/api/watchlist/transactions", {
    stock_code: "2382",
    side: "buy",
    transaction_mode: "cash",
    trade_date: "2026-07-01",
    quantity_shares: 1,
    price: 100,
    fee_preset: "standard",
    minimum_fee: 20,
    tax_preset: "auto",
  }), { DB }, {});
  assert.equal(temporaryPositionResponse.status, 200);
  const temporaryPositionPayload = await temporaryPositionResponse.json();
  const temporaryTransaction = temporaryPositionPayload.data.transactions.find((row) => row.stock_code === "2382");
  assert.ok(temporaryTransaction?.id);
  const deleteLastTransactionResponse = await worker.fetch(request(`/api/watchlist/transactions/${temporaryTransaction.id}`, {
    method: "DELETE",
    headers: { cookie: "twstock_watchlist=ledger-token" },
  }), { DB }, {});
  assert.equal(deleteLastTransactionResponse.status, 200);
  const afterDeletePayload = await deleteLastTransactionResponse.json();
  assert.equal(afterDeletePayload.data.positions.some((row) => row.stock_code === "2382"), false);
  const orphanedItem = await DB.prepare("select count(*) as count from watchlist_items where stock_code = '2382'").first();
  assert.equal(orphanedItem.count, 0);
});

test("watchlist update email preferences support multiple selected times", async () => {
  const DB = new D1TestDatabase();
  DB.exec(`
    insert into watchlist_users (google_sub, email, name, picture, created_at, last_login_at)
    values ('notify-user', 'admin@example.invalid', 'Notify Admin', '', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
    insert into watchlist_sessions (user_id, token, created_at, expires_at, user_agent)
    select id, 'notify-token', '2026-01-01T00:00:00Z', '2099-01-01T00:00:00Z', 'test'
    from watchlist_users where google_sub = 'notify-user';
    insert into watchlist_users (google_sub, email, name, picture, created_at, last_login_at)
    values ('outsider-user', 'outsider@example.test', 'Outsider', '', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
    insert into watchlist_sessions (user_id, token, created_at, expires_at, user_agent)
    select id, 'outsider-token', '2026-01-01T00:00:00Z', '2099-01-01T00:00:00Z', 'test'
    from watchlist_users where google_sub = 'outsider-user';
  `);
  const env = {
    DB,
    EMAIL: { send: async () => ({ messageId: "test-message" }) },
    NOTIFICATION_FROM_EMAIL: "updates@example.test",
    NOTIFICATION_ADMIN_EMAIL: "admin@example.invalid",
  };
  const headers = { cookie: "twstock_watchlist=notify-token", "content-type": "application/json" };
  const saveResponse = await worker.fetch(request("/api/watchlist/notifications", {
    method: "PUT",
    headers,
    body: JSON.stringify({ notify_0800: true, notify_1000: false, notify_1800: true }),
  }), env, {});
  assert.equal(saveResponse.status, 200);
  const saved = await saveResponse.json();
  assert.equal(saved.data.notify_0800, true);
  assert.equal(saved.data.notify_1000, false);
  assert.equal(saved.data.notify_1800, true);
  assert.equal(saved.data.delivery_available, true);
  assert.equal(saved.data.email, "admin@example.invalid");
  assert.equal(saved.data.can_configure_notifications, true);
  assert.equal(saved.data.is_notification_admin, true);

  const readResponse = await worker.fetch(request("/api/watchlist/notifications", {
    headers: { cookie: "twstock_watchlist=notify-token" },
  }), env, {});
  assert.equal(readResponse.status, 200);
  const read = await readResponse.json();
  assert.deepEqual(
    [read.data.notify_0800, read.data.notify_1000, read.data.notify_1800],
    [true, false, true],
  );

  const unauthorized = await worker.fetch(request("/api/watchlist/notifications"), env, {});
  assert.equal(unauthorized.status, 401);

  const outsiderHeaders = { cookie: "twstock_watchlist=outsider-token", "content-type": "application/json" };
  const outsiderRead = await worker.fetch(request("/api/watchlist/notifications", {
    headers: { cookie: "twstock_watchlist=outsider-token" },
  }), env, {});
  assert.equal(outsiderRead.status, 200);
  const outsiderReadPayload = await outsiderRead.json();
  assert.equal(outsiderReadPayload.data.can_configure_notifications, false);
  const outsiderSave = await worker.fetch(request("/api/watchlist/notifications", {
    method: "PUT",
    headers: outsiderHeaders,
    body: JSON.stringify({ notify_0800: true }),
  }), env, {});
  assert.equal(outsiderSave.status, 403);

  const recipientsBefore = await worker.fetch(request("/api/watchlist/notification-recipients", {
    headers: { cookie: "twstock_watchlist=notify-token" },
  }), env, {});
  assert.equal(recipientsBefore.status, 200);
  const recipientsBeforePayload = await recipientsBefore.json();
  assert.deepEqual(
    recipientsBeforePayload.data.map((row) => row.email).sort(),
    ["member@example.invalid", "admin@example.invalid"],
  );

  const allowOutsider = await worker.fetch(request("/api/watchlist/notification-recipients", {
    method: "POST",
    headers,
    body: JSON.stringify({ email: "outsider@example.test", enabled: true, notify_0800: true, notify_1800: true }),
  }), env, {});
  assert.equal(allowOutsider.status, 200);
  const allowOutsiderPayload = await allowOutsider.json();
  const outsiderRecipient = allowOutsiderPayload.data.find((row) => row.email === "outsider@example.test");
  assert.equal(outsiderRecipient.registered, true);
  assert.equal(outsiderRecipient.notify_0800, true);
  assert.equal(outsiderRecipient.notify_1800, true);

  const outsiderReadAfter = await worker.fetch(request("/api/watchlist/notifications", {
    headers: { cookie: "twstock_watchlist=outsider-token" },
  }), env, {});
  const outsiderReadAfterPayload = await outsiderReadAfter.json();
  assert.equal(outsiderReadAfterPayload.data.can_configure_notifications, true);

  const outsiderAdminList = await worker.fetch(request("/api/watchlist/notification-recipients", {
    headers: { cookie: "twstock_watchlist=outsider-token" },
  }), env, {});
  assert.equal(outsiderAdminList.status, 403);
});

test("scheduled update email describes updated content, changes, and failures", () => {
  const email = notificationEmailContent("08:00", {
    status: "partial",
    rows: [
      {
        country: "美國",
        label: "S&P 500",
        price: 6200,
        change: 25,
        change_percent: 0.4,
        change_since_previous_sync: 18,
        status: "ok",
      },
      {
        country: "台灣",
        label: "台指期夜盤",
        price: null,
        change: null,
        change_percent: null,
        change_since_previous_sync: null,
        status: "unavailable",
      },
    ],
  }, "測試使用者");
  assert.match(email.subject, /08:00/);
  assert.match(email.text, /本次更新內容/);
  assert.match(email.text, /主要變動/);
  assert.match(email.text, /失敗／未取得來源/);
  assert.match(email.text, /S&P 500/);
  assert.match(email.html, /查看交易帳本或調整提醒/);
  const wrangler = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
  assert.match(wrangler, /crons = \["0 0,2,10 \* \* \*"\]/);
  assert.match(wrangler, /\[\[send_email\]\]\s+name = "EMAIL"/);
});

test("watchlist page exposes buy sell tabs and valid ledger JavaScript", async () => {
  const DB = new D1TestDatabase();
  const response = await worker.fetch(request("/watchlist"), { DB }, {});
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /data-side="buy"/);
  assert.match(html, /data-side="sell"/);
  assert.match(html, /option value="day_short"/);
  assert.match(html, /option value="margin_long"/);
  assert.match(html, /option value="short_sell"/);
  assert.match(html, /option value="shares">股/);
  assert.match(html, /option value="lots">張/);
  assert.match(html, /option value="manual_amount"/);
  assert.match(html, /data-manual-fee hidden/);
  assert.match(html, /data-manual-tax hidden/);
  assert.match(html, /\[hidden\]\{display:none!important\}/);
  assert.match(html, /manual_fee_amount\.required = usesManualFee/);
  assert.match(html, /form\.elements\.manual_tax_amount\.required = usesManualTax/);
  assert.match(html, /class="stock-ledger"/);
  assert.match(html, /averageBuyCost/);
  assert.match(html, /Number\(b\.latestBuy\.id/);
  assert.match(html, /data-stock-drawer/);
  assert.match(html, /data-stock-code=/);
  assert.match(html, /\/assets\/app\.js/);
  assert.match(html, /watchlist-ledger \.hero h1/);
  assert.match(html, /form\.reset\(\)/);
  assert.match(html, /form\.elements\.quantity_value\.value = ""/);
  assert.match(html, /quantity_unit\.value === "lots" \? 1000 : 1/);
  assert.doesNotMatch(html, /data-delete-stock/);
  assert.match(html, /data-delete-transaction/);
  assert.match(html, /買賣歷史/);
  assert.match(html, /更新 Email 提醒/);
  assert.match(html, /data-notify-slot="notify_0800"/);
  assert.match(html, /data-notify-slot="notify_1000"/);
  assert.match(html, /data-notify-slot="notify_1800"/);
  assert.match(html, /\/api\/watchlist\/notifications/);
  assert.match(html, /特定收件人管理/);
  assert.match(html, /data-notification-admin/);
  assert.match(html, /can_configure_notifications/);
  assert.match(html, /notification-locked/);
  assert.match(html, /\/api\/watchlist\/notification-recipients/);
  assert.match(html, /手動輸入手續費/);
  assert.match(html, /合格現股當沖 0\.15%/);
  const inlineScript = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1] || "";
  assert.ok(inlineScript.length > 1000);
  assert.doesNotThrow(() => new Function(inlineScript));
});

test("TWSE MI_INDEX daily row normalizer preserves signed close data", () => {
  const row = normalizeTwseMiIndexDailyRow(
    ["2330", "台積電", "1,000", "20", "1,000,000", "100", "105", "99", "104", "-", "2"],
    "2026-06-30",
    "https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX",
  );
  assert.equal(row.stock_code, "2330");
  assert.equal(row.trade_date, "2026-06-30");
  assert.equal(row.close_price, 104);
  assert.equal(row.change_price, -2);
  assert.ok(row.change_percent < 0);
  assert.equal(row.source, "TWSE MI_INDEX");
});
