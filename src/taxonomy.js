export const TAXONOMY_VERSION = "2026.06.30-v2";
export const PUBLIC_CLASSIFICATION_CONFIDENCE = 80;

export const OFFICIAL_INDUSTRY_NAMES = Object.freeze({
  "01": "水泥工業",
  "02": "食品工業",
  "03": "塑膠工業",
  "04": "紡織纖維",
  "05": "電機機械",
  "06": "電器電纜",
  "08": "玻璃陶瓷",
  "09": "造紙工業",
  "10": "鋼鐵工業",
  "11": "橡膠工業",
  "12": "汽車工業",
  "14": "建材營造",
  "15": "航運業",
  "16": "觀光餐旅",
  "17": "金融保險",
  "18": "貿易百貨",
  "19": "綜合",
  "20": "其他",
  "21": "化學工業",
  "22": "生技醫療業",
  "23": "油電燃氣業",
  "24": "半導體業",
  "25": "電腦及週邊設備業",
  "26": "光電業",
  "27": "通信網路業",
  "28": "電子零組件業",
  "29": "電子通路業",
  "30": "資訊服務業",
  "31": "其他電子業",
  "32": "文化創意業",
  "33": "農業科技業",
  "34": "電子商務",
  "35": "綠能環保",
  "36": "數位雲端",
  "37": "運動休閒",
  "38": "居家生活",
  "80": "管理股票",
  "91": "臺灣存託憑證",
  UNKNOWN: "未分類",
});

export function normalizeIndustryCode(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw || raw === "未分類") return "UNKNOWN";
  if (/^\d$/.test(raw)) return raw.padStart(2, "0");
  return raw;
}

export function officialIndustryName(code, fallback = "未分類") {
  return OFFICIAL_INDUSTRY_NAMES[normalizeIndustryCode(code)] || fallback;
}

export function officialSectorName(code) {
  const normalized = normalizeIndustryCode(code);
  if (normalized === "ETF" || ["80", "91", "UNKNOWN"].includes(normalized)) return "特殊商品與未分類";
  if (["24", "25", "26", "27", "28", "29", "30", "31"].includes(normalized)) return "電子科技";
  if (["32", "33", "34", "35", "36", "37", "38"].includes(normalized)) return "新經濟與生活";
  if (["15", "16", "17", "18", "20"].includes(normalized)) return "金融與服務";
  return "傳統產業與民生";
}

export function detectInstrumentType(row = {}) {
  const stockCode = String(row.stock_code || row.code || "").trim();
  const stockName = String(row.stock_name || row.name || "").trim();
  const marketType = String(row.market_type || row.market || "").trim();
  const companyType = String(row.company_type || "").trim();
  const industryCode = normalizeIndustryCode(row.industry_code);
  if (industryCode === "91" || /^91\d{2}$/.test(stockCode) || /(?:-|－)DR$/i.test(stockName)) return "tdr";
  if (/^00\d{2,4}[A-Z]?$/.test(stockCode) || /\bETF\b/i.test(stockName)) return "etf";
  if (marketType === "興櫃" || companyType.includes("興櫃")) return "emerging";
  return "stock";
}

export function normalizeOfficialIndustry(row = {}) {
  const instrumentType = detectInstrumentType(row);
  if (instrumentType === "etf") {
    return { industry_code: "ETF", industry_name: "ETF / 指數型基金", instrument_type: instrumentType };
  }
  if (instrumentType === "tdr") {
    return { industry_code: "91", industry_name: "臺灣存託憑證", instrument_type: instrumentType };
  }
  const industryCode = normalizeIndustryCode(row.industry_code || row.industry_name);
  return {
    industry_code: industryCode,
    industry_name: officialIndustryName(industryCode),
    instrument_type: instrumentType,
  };
}

export function isPublicClassification(row = {}) {
  return String(row.review_status || "").toLowerCase() === "approved"
    || Number(row.confidence_score || 0) >= PUBLIC_CLASSIFICATION_CONFIDENCE;
}

export function normalizeTpexInstitutionalCells(cells = [], options = {}) {
  const number = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    const parsed = Number(String(value).replaceAll(",", "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const sharesToLots = (value) => number(value) / 1000;
  const stockCode = String(cells[0] || "").trim();
  if (!/^\d{4}$/.test(stockCode)) return null;
  return {
    stock_code: stockCode,
    stock_name: String(cells[1] || stockCode).trim(),
    market_type: "上櫃",
    trade_date: options.tradeDate || null,
    foreign_investor_net_buy: sharesToLots(cells[4]),
    investment_trust_net_buy: sharesToLots(cells[13]),
    dealer_net_buy: sharesToLots(cells[22]),
    total_institutional_net_buy: sharesToLots(cells[23]),
    foreign_investor_holding_shares: null,
    foreign_investor_holding_percent: null,
    source: options.source || "TPEx institutional dailyTrade",
    source_url: options.sourceUrl || "",
  };
}
