import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  TAXONOMY_VERSION,
  detectInstrumentType,
  isPublicClassification,
  normalizeOfficialIndustry,
  normalizeTpexInstitutionalCells,
  officialIndustryName,
  officialSectorName,
} from "../src/taxonomy.js";

test("official industry codes include new-economy categories", () => {
  assert.equal(officialIndustryName("35"), "綠能環保");
  assert.equal(officialIndustryName("36"), "數位雲端");
  assert.equal(officialIndustryName("37"), "運動休閒");
  assert.equal(officialIndustryName("38"), "居家生活");
  assert.equal(officialIndustryName("80"), "管理股票");
  assert.equal(officialIndustryName("91"), "臺灣存託憑證");
  assert.equal(officialSectorName("24"), "電子科技");
  assert.equal(officialSectorName("35"), "新經濟與生活");
  assert.match(TAXONOMY_VERSION, /^2026\./);
});

test("instrument types do not leak ETF and TDR into common-stock industries", () => {
  assert.equal(detectInstrumentType({ stock_code: "0050", stock_name: "元大台灣50" }), "etf");
  assert.equal(detectInstrumentType({ stock_code: "9103", stock_name: "美德醫療-DR", industry_code: "91" }), "tdr");
  assert.equal(detectInstrumentType({ stock_code: "7777", stock_name: "測試公司", market_type: "興櫃" }), "emerging");
  assert.deepEqual(
    normalizeOfficialIndustry({ stock_code: "2330", industry_code: "24" }),
    { industry_code: "24", industry_name: "半導體業", instrument_type: "stock" },
  );
});

test("only reviewed or high-confidence theme links are public", () => {
  assert.equal(isPublicClassification({ review_status: "approved", confidence_score: 10 }), true);
  assert.equal(isPublicClassification({ review_status: "pending", confidence_score: 80 }), true);
  assert.equal(isPublicClassification({ review_status: "pending", confidence_score: 79 }), false);
});

test("TPEx institutional rows use positional grouped columns", () => {
  const fixture = JSON.parse(readFileSync(
    new URL("./fixtures/tpex-institutional-2026-06-30.json", import.meta.url),
    "utf8",
  ));
  assert.equal(fixture.fields.length, 24);
  assert.equal(fixture.row.length, 24);
  const normalized = normalizeTpexInstitutionalCells(fixture.row, {
    tradeDate: fixture.trade_date,
    sourceUrl: fixture.source_url,
  });
  assert.equal(normalized.stock_code, fixture.expected.stock_code);
  assert.equal(normalized.foreign_investor_net_buy, fixture.expected.foreign_lots);
  assert.equal(normalized.investment_trust_net_buy, fixture.expected.trust_lots);
  assert.equal(normalized.dealer_net_buy, fixture.expected.dealer_lots);
  assert.equal(normalized.total_institutional_net_buy, fixture.expected.total_lots);
});
