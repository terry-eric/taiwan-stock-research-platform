import {
  PUBLIC_CLASSIFICATION_CONFIDENCE,
  TAXONOMY_VERSION,
  detectInstrumentType,
  normalizeIndustryCode,
  normalizeOfficialIndustry,
  normalizeTpexInstitutionalCells,
  officialIndustryName,
  officialSectorName,
} from "./taxonomy.js";

const APP_UPDATED_AT = "2026-06-30T14:00:00+08:00";

const SOURCE_TWSE_STOCK_BASIC = "https://openapi.twse.com.tw/v1/opendata/t187ap03_L";
const SOURCE_TWSE_DAILY_PRICE = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL";
const SOURCE_TWSE_DAILY_VALUATION = "https://openapi.twse.com.tw/v1/exchangeReport/BWIBBU_ALL";
const SOURCE_TWSE_MI_INDEX = "https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX";
const SOURCE_TWSE_STOCK_DAY_HISTORY = "https://www.twse.com.tw/exchangeReport/STOCK_DAY";
const SOURCE_TPEX_OTC_STOCK_BASIC = "https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O";
const SOURCE_TPEX_EMERGING_STOCK_BASIC = "https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_R";
const SOURCE_TPEX_OTC_DAILY_PRICE = "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes";
const SOURCE_TPEX_EMERGING_DAILY_PRICE = "https://www.tpex.org.tw/openapi/v1/tpex_esb_latest_statistics";
const SOURCE_TPEX_OTC_AFTER_TRADING = "https://www.tpex.org.tw/www/zh-tw/afterTrading/otc";
const SOURCE_TPEX_OTC_DAILY_VALUATION = "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_peratio_analysis";
const SOURCE_TWSE_MONTHLY_REVENUE = "https://openapi.twse.com.tw/v1/opendata/t187ap05_L";
const SOURCE_TPEX_OTC_MONTHLY_REVENUE = "https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap05_O";
const SOURCE_TPEX_EMERGING_MONTHLY_REVENUE = "https://www.tpex.org.tw/openapi/v1/t187ap05_R";
const SOURCE_TWSE_INSTITUTIONAL_T86 = "https://www.twse.com.tw/rwd/zh/fund/T86";
const SOURCE_TWSE_FOREIGN_HOLDING = "https://www.twse.com.tw/rwd/zh/fund/MI_QFIIS";
const SOURCE_TPEX_INSTITUTIONAL_DAILY = "https://www.tpex.org.tw/www/zh-tw/insti/dailyTrade";
const SOURCE_TWSE_TAIEX_HISTORY = "https://www.twse.com.tw/rwd/zh/TAIEX/MI_5MINS_HIST";
const SOURCE_TWSE_EX_DIVIDEND = "https://www.twse.com.tw/rwd/zh/exRight/TWT49U";
const SOURCE_TWSE_DISPOSITION = "https://www.twse.com.tw/rwd/zh/announcement/punish?response=json";
const SOURCE_TPEX_ATTENTION = "https://www.tpex.org.tw/www/zh-tw/bulletin/attention?response=json";
const SOURCE_MOPS_HOME = "https://mopsov.twse.com.tw/mops/web/index";
const SOURCE_YAHOO_FINANCE_SEARCH = "https://query1.finance.yahoo.com/v1/finance/search";
const SOURCE_YAHOO_FINANCE_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const SOURCE_TAIFEX_DAILY_FUTURES = "https://openapi.taifex.com.tw/v1/DailyMarketReportFut";
const GLOBAL_INDEX_DEFINITIONS = [
  { symbol: "^DJI", label: "道瓊工業", country: "美國", market: "美國市場" },
  { symbol: "^GSPC", label: "S&P 500", country: "美國", market: "美國市場" },
  { symbol: "^IXIC", label: "NASDAQ", country: "美國", market: "美國市場" },
  { symbol: "^N225", label: "日經 225", country: "日本", market: "東京市場" },
  { symbol: "^KS11", label: "KOSPI", country: "韓國", market: "韓國市場" },
];
const PERFORMANCE_ASSET_VERSION = "20260703-20";
const PWA_HEAD = `
  <meta name="theme-color" content="#0d2f58">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="台股研究">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="apple-touch-icon" href="/icons/app-icon-192.png">
`;

const PWA_JS = String.raw`
(() => {
  const buttons = [...document.querySelectorAll("[data-install-app]")];
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let installPrompt = null;

  const hideButtons = () => buttons.forEach((button) => { button.hidden = true; });
  const showButtons = () => buttons.forEach((button) => { button.hidden = false; });

  if (!standalone && isIos) showButtons();
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    showButtons();
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    hideButtons();
  });

  buttons.forEach((button) => button.addEventListener("click", async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      hideButtons();
      return;
    }
    if (isIos) {
      window.alert("請點 Safari 的分享按鈕，再選擇「加入主畫面」。");
    }
  }));

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    });
  }
})();
`;

const HOME_CSS = String.raw`
    :root{--bg:#f6f7f2;--panel:#fff;--ink:#1d252b;--muted:#64727a;--line:#dce2dc;--red:#d94a3a;--green:#1f7a5a;--gold:#a8791a;--blue:#286da8;--shadow:0 18px 45px rgba(29,37,43,.08)}
    *{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;background:var(--bg);color:var(--ink);font-family:"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif}main{width:min(1260px,calc(100% - 32px));margin:0 auto;padding-bottom:40px}
    .nav{display:flex;gap:8px;overflow:auto;padding:12px 0}.nav a,.nav button{border:1px solid var(--line);border-radius:6px;padding:9px 12px;background:#fff;text-decoration:none;color:inherit;font:inherit;font-weight:800;white-space:nowrap;cursor:pointer}.nav button{color:#fff;background:var(--green)}.nav button:disabled{cursor:wait;opacity:.65}.nav-account{display:flex;gap:8px;margin-left:auto}.nav-account a:first-child{border-color:rgba(40,109,168,.3);color:var(--blue)}.nav-account a:last-child{border-color:var(--green);color:#fff;background:var(--green)}
    .hero{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:18px;align-items:end;padding:30px 0 18px}.eyebrow{margin:0 0 7px;color:var(--green);font-size:.78rem;font-weight:900;text-transform:uppercase;letter-spacing:0}h1{max-width:880px;margin:0 0 12px;font-size:clamp(2rem,4.5vw,4.8rem);line-height:1.04}p{color:var(--muted);line-height:1.75}
    .panel,.metric,.table-panel,.update{border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.93);box-shadow:var(--shadow)}.update{display:grid;gap:8px;overflow-x:auto;padding:16px}.update small{font-size:.76rem;white-space:nowrap}.grid{display:grid;gap:14px}.grid-2{grid-template-columns:1fr 1fr}.grid-4{grid-template-columns:repeat(4,minmax(0,1fr))}.panel{padding:18px}.panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.panel-head h2{margin-top:0}.info-dot{position:relative;display:inline-grid;place-items:center;flex:0 0 auto;width:26px;height:26px;border:1px solid var(--line);border-radius:50%;background:#fff;color:var(--green);font-weight:900;cursor:help}.info-dot:hover::after,.info-dot:focus::after{content:attr(data-tip);position:absolute;right:0;top:32px;z-index:20;width:min(320px,80vw);border:1px solid var(--line);border-radius:6px;padding:10px;background:#fff;color:var(--ink);box-shadow:var(--shadow);font-size:.82rem;line-height:1.55;text-align:left}.metric{min-height:128px;padding:16px}.metric span,.metric small,.muted{color:var(--muted)}.metric strong{display:block;margin:9px 0;font-size:1.3rem}.market-snapshot{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:14px;margin:0 0 16px}.snapshot-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.snapshot-card{display:grid;gap:5px;min-width:0;border:1px solid var(--line);border-radius:8px;padding:12px;background:#fff;text-decoration:none;color:inherit}.snapshot-card span,.snapshot-card small{color:var(--muted)}.snapshot-card strong{font-size:1.04rem;overflow-wrap:anywhere}.global-market{margin:0 0 16px}.global-market-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;margin-top:12px}.global-market-card{display:grid;gap:5px;min-width:0;border:1px solid var(--line);border-radius:8px;padding:12px;background:#fff}.global-market-card span,.global-market-card small{color:var(--muted)}.global-market-card strong{font-size:1.08rem;overflow-wrap:anywhere}.global-market-card em{font-style:normal;font-size:.82rem;font-weight:900}.global-market-source{margin:10px 0 0;color:var(--muted);font-size:.76rem}.flow-buy-text{color:var(--red);font-weight:900}.flow-sell-text{color:var(--green);font-weight:900}.taiex-card strong{font-size:1.45rem}.server-k-chart{border:1px solid var(--line);border-radius:8px;background:#fff;padding:12px}.server-k-chart:focus-visible{outline:2px solid rgba(40,109,168,.35);outline-offset:2px}.chart-value-strip{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;color:var(--muted);font-size:.82rem}.chart-value-strip strong{color:var(--ink)}.chart-zoom-controls{display:flex;align-items:center;justify-content:flex-end;gap:6px;margin:0 0 8px}.chart-zoom-controls span{margin-right:auto;color:var(--muted);font-size:.76rem;font-weight:800}.chart-zoom-controls button{display:grid;place-items:center;width:30px;height:30px;border:1px solid var(--line);border-radius:6px;padding:0;background:#fff;color:var(--ink);font:inherit;font-size:1rem;font-weight:900;cursor:pointer}.chart-zoom-controls button:hover{border-color:var(--blue);color:var(--blue)}.chart-zoom-controls button:disabled{opacity:.35;cursor:not-allowed}.chart-plot,.market-volume-plot{display:grid;grid-template-columns:minmax(0,1fr) 72px;gap:8px;align-items:stretch}.chart-price-scale{display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end;min-width:72px;padding:4px 0 22px;pointer-events:none}.chart-price-scale span,.market-volume-scale span{border:1px solid rgba(29,37,43,.1);border-radius:999px;padding:2px 6px;background:rgba(255,255,255,.92);color:var(--ink);font-size:.72rem;font-weight:900;white-space:nowrap}.chart-plot>svg{display:block;width:100%;height:160px;background:#fff;border:1px solid rgba(220,226,220,.8);border-bottom-color:var(--line)}.market-volume-header{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;margin:8px 80px 4px 0;color:var(--muted);font-size:.75rem}.market-volume-header strong{color:var(--ink)}.market-volume-plot>svg{display:block;width:100%;height:62px;border-bottom:1px solid var(--line);background:rgba(220,226,220,.12)}.market-volume-scale{display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end;min-width:72px;padding:0 0 4px;pointer-events:none}.market-volume-plot rect.market-volume.up{fill:rgba(217,74,58,.48);stroke:rgba(217,74,58,.58)}.market-volume-plot rect.market-volume.down{fill:rgba(31,122,90,.48);stroke:rgba(31,122,90,.58)}.server-k-chart line.up,.server-k-chart rect.up{stroke:var(--red);fill:var(--red)}.server-k-chart line.down,.server-k-chart rect.down{stroke:var(--green);fill:var(--green)}
    .tree,.branch{border:1px solid var(--line);border-radius:8px;background:#fff;margin-bottom:10px;overflow:hidden}.tree summary,.branch summary{cursor:pointer;display:flex;justify-content:space-between;gap:12px;align-items:center;padding:13px 14px;font-weight:900}.tree summary small,.branch summary small{color:var(--muted);font-weight:700;text-align:right}.tree-body{padding:10px}.branch{box-shadow:none}.tagline{padding:0 14px 10px}.peer-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:0 10px 10px}.peer{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;border:1px solid var(--line);border-radius:6px;padding:10px;text-decoration:none}.peer small{display:block;color:var(--muted);line-height:1.45}.peer b{color:var(--red);text-align:right}.pager{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px 8px 12px}.pager button{border:1px solid var(--line);border-radius:6px;padding:7px 9px;background:#fff;font:inherit;font-weight:900;cursor:pointer;white-space:nowrap}.pager button:disabled{cursor:not-allowed;opacity:.45}.pager span{min-width:0;color:var(--muted);font-size:.82rem;font-weight:900;text-align:center}.theme-industries{display:grid;gap:8px;padding:0 10px 10px}.theme-industry{border:1px solid var(--line);border-radius:6px;background:#fff;overflow:hidden}.theme-industry summary{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:9px 10px;cursor:pointer;list-style:none}.theme-industry summary::-webkit-details-marker{display:none}.theme-industry small{color:var(--muted);text-align:right}
    .recommend-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.recommend-card{display:grid;align-content:start;gap:8px;min-height:170px;border:1px solid var(--line);border-radius:8px;padding:14px;background:#fff;text-decoration:none}.recommend-card strong{font-size:1.08rem}.recommend-card p{margin-bottom:0}.label-chip{display:inline-flex;min-height:23px;margin:2px 4px 2px 0;border:1px solid rgba(31,122,90,.24);border-radius:999px;padding:2px 8px;color:var(--green);font-size:.76rem;font-weight:900;background:rgba(31,122,90,.08)}.roster-stock-link{cursor:pointer;text-decoration:none}.roster-stock-link:hover{border-color:var(--green);background:rgba(31,122,90,.16)}
    .quality-warning{grid-column:1/-1;border:1px solid rgba(168,121,26,.28);border-radius:8px;padding:14px;background:#fffaf0}.quality-warning p{margin:6px 0 0}.quality-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.quality-row{min-width:0;border:1px solid var(--line);border-radius:7px;padding:10px;background:#fff}.quality-row span,.quality-row strong,.quality-row small{display:block}.quality-row span{color:var(--muted);font-size:.76rem;font-weight:900}.quality-row strong{margin-top:5px}.quality-row small{margin-top:4px;color:var(--muted)}.quality-summary{display:flex;flex-wrap:wrap;gap:8px}.quality-summary b{border:1px solid var(--line);border-radius:999px;padding:5px 9px;background:#fff;font-size:.78rem}
    .stock-lookup{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:start;margin-top:12px}.stock-lookup-search{position:relative;min-width:0}.stock-lookup input,.stock-lookup>button{width:100%;min-height:46px;border:1px solid var(--line);border-radius:7px;padding:10px 12px;background:#fff;color:var(--ink);font:inherit}.stock-lookup>button{width:auto;border-color:var(--green);background:var(--green);color:#fff;font-weight:900;cursor:pointer}.stock-lookup-suggestions{position:absolute;top:calc(100% + 5px);left:0;right:0;z-index:36;display:grid;max-height:340px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:5px;background:#fff;box-shadow:var(--shadow)}.stock-lookup-option{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 10px;width:100%;border:0;border-radius:6px;padding:10px;background:#fff;color:var(--ink);font:inherit;text-align:left;cursor:pointer}.stock-lookup-option:hover,.stock-lookup-option:focus,.stock-lookup-option.active{background:#f1f6f2;outline:none}.stock-lookup-option strong{min-width:0}.stock-lookup-option small{grid-row:1/3;grid-column:2;color:var(--muted);font-size:.74rem;text-align:right}.stock-lookup-option span{color:var(--muted);font-size:.78rem}.advanced-screener{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}.advanced-screener>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;color:var(--green);font-weight:900}.advanced-screener>summary small{color:var(--muted);font-weight:700}.advanced-screener>summary::marker{color:var(--green)}.screener-form{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:12px}.screener-form label{display:grid;gap:4px;min-width:0;color:var(--muted);font-size:.76rem;font-weight:900}.screener-form input,.screener-form select,.screener-form button{width:100%;min-width:0;border:1px solid var(--line);border-radius:6px;padding:9px;background:#fff;color:var(--ink);font:inherit}.screener-form button{align-self:end;border-color:var(--green);background:var(--green);color:#fff;font-weight:900;cursor:pointer}.screener-theme-search{position:relative;display:block}.screener-theme-search input{padding-right:28px}.screener-theme-suggestions{position:absolute;top:calc(100% + 5px);left:0;right:0;z-index:34;display:grid;max-height:280px;overflow:auto;border:1px solid var(--line);border-radius:7px;padding:5px;background:#fff;box-shadow:var(--shadow)}.screener-theme-option{display:flex;justify-content:space-between;gap:8px;width:100%;border:0!important;border-radius:5px!important;padding:9px 10px!important;background:#fff!important;color:var(--ink)!important;text-align:left;cursor:pointer}.screener-theme-option:hover,.screener-theme-option:focus{background:#f1f6f2!important;outline:none}.screener-theme-option small{color:var(--muted);font-size:.72rem}.screener-presets{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:7px}.screener-presets span{color:var(--muted);font-size:.78rem;font-weight:900}.screener-presets button{width:auto;border-color:var(--line);padding:7px 10px;background:#fff;color:var(--green)}.screener-actions{display:flex;align-self:end;gap:7px}.screener-actions button{min-height:42px}.screener-actions .screener-reset{border-color:var(--line);background:#fff;color:var(--ink)}.screener-results{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.screener-result{display:grid;gap:5px;min-width:0;border:1px solid var(--line);border-radius:7px;padding:11px;background:#fff;color:inherit;text-decoration:none}.screener-result small{color:var(--muted);line-height:1.45}.screener-status{margin:10px 0 0;color:var(--muted);font-size:.82rem;font-weight:800}
    .compare-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end;margin-top:12px}.compare-builder{display:grid;gap:8px;min-width:0}.compare-selected{display:flex;flex-wrap:wrap;gap:7px;min-height:30px}.compare-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(40,109,168,.28);border-radius:7px;padding:6px 8px;background:rgba(40,109,168,.07);color:var(--ink);font:inherit;font-size:.8rem;font-weight:900}.compare-chip button{border:0;padding:0;background:transparent;color:var(--muted);font-size:1rem;line-height:1;cursor:pointer}.compare-search{position:relative}.compare-form input,.compare-form>button{width:100%;border:1px solid var(--line);border-radius:6px;padding:10px;font:inherit}.compare-form>button{width:auto;border-color:var(--blue);background:var(--blue);color:#fff;font-weight:900;cursor:pointer}.compare-suggestions{position:absolute;top:calc(100% + 5px);left:0;right:0;z-index:30;display:grid;max-height:290px;overflow:auto;border:1px solid var(--line);border-radius:7px;padding:5px;background:#fff;box-shadow:var(--shadow)}.compare-suggestion{display:flex;justify-content:space-between;gap:10px;width:100%;border:0;border-radius:5px;padding:9px 10px;background:#fff;color:var(--ink);font:inherit;text-align:left;cursor:pointer}.compare-suggestion:hover,.compare-suggestion:focus{background:#f1f6f2;outline:none}.compare-suggestion small{color:var(--muted)}.compare-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.compare-card{display:block;min-width:0;border:1px solid var(--line);border-radius:8px;padding:12px;background:#fff;color:inherit;text-decoration:none}.compare-card:hover{border-color:var(--blue);box-shadow:0 10px 24px rgba(40,109,168,.1)}.compare-card h3{margin:0 0 8px}.compare-card dl{display:grid;gap:6px;margin:0}.compare-card dl div{display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--line);padding-top:6px}.compare-card dt{color:var(--muted);font-size:.76rem}.compare-card dd{margin:0;font-weight:900;text-align:right}.compare-open{display:block;margin-top:10px;color:var(--blue);font-size:.78rem;font-weight:900;text-align:right}
    .leader-create,.leader-tabs,.roster-tools{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}.leader-create{border:1px dashed rgba(31,122,90,.34);border-radius:8px;padding:10px;background:rgba(31,122,90,.04)}.leader-create input,.roster-tools input{min-width:180px;flex:1 1 180px;border:1px solid var(--line);border-radius:6px;padding:10px 11px;font:inherit}.leader-create button,.leader-tabs button,.roster-tools button{border:1px solid var(--line);border-radius:6px;padding:9px 12px;color:var(--ink);font-weight:900;background:#fff;cursor:pointer}.leader-create button,.leader-tabs button.active,.roster-tools button{border-color:var(--green);color:#fff;background:var(--green)}.leader-tab-wrap{display:inline-flex;align-items:stretch}.leader-tab-wrap>[data-leader]{border-radius:6px}.leader-tab-wrap:has(.leader-remove)>[data-leader]{border-radius:6px 0 0 6px}.leader-tab-wrap .leader-remove{border-left:0;border-radius:0 6px 6px 0;padding-inline:9px;color:var(--red);background:#fff}.roster-list{display:grid;gap:10px}.roster-item{display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid var(--line);border-radius:8px;padding:12px;background:#fff}.drag-handle{color:var(--muted);font-size:.78rem;font-weight:900}.roster-item p{margin-bottom:6px}.roster-item button{border:1px solid rgba(217,74,58,.28);border-radius:6px;padding:8px 10px;color:var(--red);font-weight:900;background:rgba(217,74,58,.08);cursor:pointer}.roster-note-editor{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;align-items:center;margin-top:8px;color:var(--muted);font-size:.78rem;font-weight:900}.roster-note-editor input{min-width:0;width:100%;border:1px solid var(--line);border-radius:6px;padding:7px 9px;color:var(--ink);background:#fff;font:inherit}.roster-note-editor input:focus{outline:2px solid rgba(31,122,90,.2);border-color:var(--green)}
    .flow-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.flow-panel{min-width:0;overflow:hidden;border:1px solid var(--line);border-radius:8px;background:#fff;padding:14px}.flow-panel-title{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px}.flow-panel-title h3{margin:0}.flow-panel-title .info-dot{width:22px;height:22px;font-size:.78rem}.flow-context{margin:0 0 6px;border-bottom:1px solid var(--line);padding:0 0 8px;color:var(--blue);font-size:.8rem;font-weight:900;line-height:1.4}.flow-empty{margin:8px 0;border:1px dashed var(--line);border-radius:7px;padding:14px;color:var(--muted);font-size:.85rem;line-height:1.5}.flow-row{display:block;width:100%;padding:10px 0;border:0;border-bottom:1px solid var(--line);background:transparent;text-align:left;font:inherit}.flow-row>span,.flow-row>.flow-track,.flow-row>b{display:block;width:100%;max-width:100%;min-width:0}.flow-row>.flow-track,.flow-row>b{margin-top:7px}.flow-link{color:inherit;text-decoration:none}.flow-choice{cursor:pointer;outline:none}.flow-choice:focus-visible{outline:2px solid rgba(31,122,90,.36);outline-offset:2px}.flow-choice.active{border-radius:6px;background:#f4f7f2;box-shadow:inset 3px 0 0 var(--green);padding-left:8px;padding-right:8px}.flow-row:last-child{border-bottom:0}.flow-row strong,.flow-row small,.flow-row b{overflow-wrap:anywhere;word-break:break-word}.flow-row small{display:block;color:var(--muted);line-height:1.45}.flow-row b{text-align:left;color:var(--ink);font-size:.88rem;line-height:1.35;white-space:normal}.flow-track{height:12px;border-radius:999px;background:#e7ece8;overflow:hidden}.flow-track i{display:block;height:100%;border-radius:inherit}.flow-track .buy{background:var(--red)}.flow-track .sell{background:var(--green)}.flow-group{border-bottom:1px solid var(--line)}.flow-group:last-child{border-bottom:0}.flow-group summary{list-style:none;cursor:pointer}.flow-group summary::-webkit-details-marker{display:none}.flow-group summary strong::before{content:"+";display:inline-grid;place-items:center;width:18px;height:18px;margin-right:6px;border-radius:50%;background:#edf3ee;color:var(--green);font-size:.78rem}.flow-group[open] summary strong::before{content:"-"}.flow-group-body{padding:0 0 8px 14px}.flow-group-body .flow-row{padding-left:8px}
    .flow-trend{display:block;margin-top:5px;font-style:normal;font-size:.75rem;font-weight:900;line-height:1.35}.trend-growth{color:var(--red)!important}.trend-decline{color:var(--green)!important}.trend-flat{color:var(--muted)!important}
    .institution-leaders{margin:14px 0 16px;border:1px solid var(--line);border-radius:8px;padding:14px;background:#fbfcf9;overflow:hidden}.institution-leader-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:12px}.institution-leader-card{min-width:0;border:1px solid var(--line);border-radius:8px;background:#fff;padding:12px;overflow:hidden}.institution-leader-card h4{margin:0 0 10px;font-size:1.02rem}.institution-leader-lists{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}.institution-leader-lists>div{min-width:0}.leader-side{display:block;margin:0 0 6px;font-size:.82rem}.leader-buy{color:var(--red)}.leader-sell{color:var(--green)}.institution-leader-list{display:grid;gap:6px;max-height:360px;overflow-y:auto;overflow-x:hidden;padding-right:3px}.institution-leader-row{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:8px;align-items:start;min-width:0;border:1px solid var(--line);border-radius:7px;padding:8px;background:#fff;color:inherit;text-decoration:none;overflow:hidden}.institution-leader-row>b{color:var(--muted);font-size:.78rem;text-align:center}.institution-leader-row>span{min-width:0}.institution-leader-row strong,.institution-leader-row small{display:block;min-width:0;overflow-wrap:normal;word-break:keep-all}.institution-leader-row strong{line-height:1.35}.institution-leader-row small{color:var(--muted);font-size:.74rem;line-height:1.35}.institution-leader-row em{min-width:0;font-style:normal;font-size:.75rem;font-weight:900;line-height:1.35;text-align:right;white-space:nowrap}.leader-empty{margin:8px 0;border:1px dashed var(--line);border-radius:7px;padding:10px;text-align:center}
    .stock-backdrop{position:fixed;inset:0;z-index:40;background:rgba(29,37,43,.28);opacity:0;pointer-events:none;transition:.18s ease}.stock-backdrop.open{opacity:1;pointer-events:auto;transition:.18s ease}.stock-drawer{position:fixed;top:0;right:0;z-index:41;width:min(520px,100vw);height:100vh;overflow:auto;border-left:1px solid var(--line);background:#fff;box-shadow:-20px 0 55px rgba(29,37,43,.18);transform:translateX(104%);transition:.22s ease}.stock-drawer.open{transform:translateX(0)}.drawer-head{position:sticky;top:0;display:flex;justify-content:space-between;gap:12px;padding:18px;border-bottom:1px solid var(--line);background:#fff}.stock-drawer.tone-hot .drawer-head{background:#fff3ef}.stock-drawer.tone-cool .drawer-head{background:#eff8f3}.drawer-head h2{margin:0}.drawer-head button{width:38px;height:38px;border:1px solid var(--line);border-radius:6px;background:#fff;font-size:1.35rem;cursor:pointer}.drawer-body{display:grid;gap:14px;padding:16px}.drawer-product{border:1px solid rgba(40,109,168,.22);border-radius:8px;padding:12px;background:rgba(40,109,168,.06)}.drawer-product>span{display:block;color:var(--blue);font-size:.78rem;font-weight:900}.drawer-product p{margin:5px 0 7px;color:var(--ink);line-height:1.55}.drawer-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.drawer-metric{border:1px solid var(--line);border-radius:8px;padding:12px;background:#f8faf7}.stock-drawer.tone-hot .drawer-head{background:#fff3ef}.stock-drawer.tone-hot .drawer-metric:first-child,.stock-drawer.tone-hot .drawer-metric:nth-child(3){border-color:rgba(217,74,58,.28);background:#fff7f4}.stock-drawer.tone-cool .drawer-metric:first-child,.stock-drawer.tone-cool .drawer-metric:nth-child(3){border-color:rgba(31,122,90,.28);background:#f3fbf6}.drawer-metric span{display:block;color:var(--muted);font-size:.8rem;font-weight:900}.drawer-metric strong{display:block;margin-top:5px;font-size:1.15rem}.drawer-metric small{display:block;margin-top:5px;color:var(--muted);font-size:.76rem;line-height:1.5}.drawer-section{border:1px solid var(--line);border-radius:8px;padding:12px}.drawer-section h3{margin-top:0}.chart-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.chart-tabs,.chart-indicators{display:flex;flex-wrap:wrap;gap:6px}.chart-tabs button{border:1px solid var(--line);border-radius:6px;padding:7px 10px;background:#fff;color:var(--ink);font:inherit;font-size:.86rem;font-weight:900;cursor:pointer}.chart-tabs button.active{border-color:var(--green);background:var(--green);color:#fff}.indicator-toggle{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:999px;padding:6px 10px;background:#fff;color:var(--ink);font-size:.8rem;font-weight:900;cursor:pointer}.indicator-toggle input{width:16px;height:16px;margin:0;accent-color:var(--green)}.chart-panel[hidden],.flow-panel-body[hidden]{display:none}.k-chart{min-height:210px;touch-action:none}.k-chart svg{display:block;width:100%;height:166px;border-bottom:1px solid var(--line);background:#fff}.k-chart line.up,.k-chart rect.up:not(.volume){stroke:var(--red);fill:var(--red)}.k-chart line.down,.k-chart rect.down:not(.volume){stroke:var(--green);fill:var(--green)}.k-chart .volume.up{fill:rgba(217,74,58,.34);stroke:rgba(217,74,58,.34)}.k-chart .volume.down{fill:rgba(31,122,90,.34);stroke:rgba(31,122,90,.34)}.k-chart line{stroke-width:.65;vector-effect:non-scaling-stroke}.k-chart rect{vector-effect:non-scaling-stroke}.k-chart .price-grid{stroke:#dce2dc;stroke-width:.45;stroke-dasharray:1.5 1.5}.k-chart .ma,.k-chart .amount-line,.k-chart .boll-line{fill:none;stroke-width:1.4;vector-effect:non-scaling-stroke}.k-chart .ma5{stroke:#286da8;color:#286da8}.k-chart .ma10{stroke:#b78318;color:#b78318}.k-chart .ma20{stroke:#8752a8;color:#8752a8}.k-chart .amount-line{stroke:#0f8f8f;stroke-width:1.25}.k-chart .boll-band{fill:rgba(176,74,197,.035);stroke:none}.k-chart .boll-upper{stroke:#b04ac5}.k-chart .boll-mid{stroke:#b78318;stroke-dasharray:2 1.5}.k-chart .boll-lower{stroke:#334455}.ma-legend{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-start;margin:-2px 0 6px;font-size:.72rem}.ma-legend b{font-weight:900}.boll-label{color:#8752a8}.volume-label{margin-left:auto;color:var(--muted)}.amount-label{color:#0f8f8f}.history-status{margin:0 0 9px;font-size:.78rem}.revenue-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.revenue-list article{min-width:0;border:1px solid var(--line);border-radius:6px;padding:9px;background:#f8faf7}.revenue-list strong,.revenue-list span,.revenue-list small{display:block}.revenue-list span{margin-top:4px;font-weight:900}.revenue-list small{margin-top:3px;color:var(--muted);font-size:.76rem;line-height:1.5}.revenue-all{margin-top:10px}.revenue-all summary{cursor:pointer;color:var(--green);font-weight:900}.mini-chart{width:100%;height:120px}.mini-chart polyline{fill:none;stroke:var(--red);stroke-width:2.5;vector-effect:non-scaling-stroke}.chart-axis{display:flex;justify-content:space-between;color:var(--muted);font-size:.75rem}
    .tag{display:inline-flex;margin:2px 4px 2px 0;border-radius:999px;padding:2px 8px;background:var(--red);color:#fff;font-size:.76rem}.code{color:var(--blue)}.manual-update{display:flex;flex-wrap:wrap;gap:10px;align-items:center;border:1px solid var(--line);border-radius:8px;margin:0 0 10px;padding:10px 12px;background:#fff}.manual-update button{border:1px solid var(--green);border-radius:6px;padding:9px 12px;color:#fff;background:var(--green);font:inherit;font-weight:900;cursor:pointer}.manual-update button:disabled{cursor:wait;opacity:.65}.manual-update small{color:var(--muted);font-weight:800}.source-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.source-link{display:grid;gap:5px;min-width:0;border:1px solid var(--line);border-radius:6px;padding:10px;background:#fff;text-decoration:none;color:inherit}.source-link span{color:var(--green);font-size:.72rem;font-weight:900;text-transform:uppercase}.source-link small{color:var(--muted);line-height:1.45}.drawer-sources{grid-template-columns:1fr;margin-top:10px}.notice-card{display:grid;gap:6px;border:1px solid rgba(217,74,58,.28);border-radius:6px;margin-bottom:8px;padding:10px;background:#fff7f4}.notice-card a{color:var(--red);font-weight:900}
    .news-list{display:grid;gap:8px}.news-item{display:grid;gap:4px;border:1px solid var(--line);border-radius:7px;padding:10px;background:#fff;color:inherit;text-decoration:none}.news-item:hover{border-color:var(--blue);background:rgba(40,109,168,.04)}.news-item strong{line-height:1.45}.news-item small{color:var(--muted);font-size:.76rem}.news-confidence{color:var(--green);font-weight:900}
    .disclaimer-panel{max-width:900px;margin:0 auto}.disclaimer-callout{border:1px solid rgba(168,121,26,.3);border-radius:8px;padding:16px;background:#fffaf0;color:var(--ink);font-size:1.02rem;font-weight:900;line-height:1.75}.disclaimer-list{display:grid;gap:10px;padding-left:22px;color:var(--muted);line-height:1.75}.disclaimer-panel time{color:var(--muted);font-size:.8rem}
    .guide-page{display:grid;gap:14px}.guide-intro{border:1px solid rgba(31,122,90,.25);border-radius:8px;padding:16px;background:rgba(31,122,90,.06);line-height:1.7}.guide-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.guide-card{border:1px solid var(--line);border-radius:8px;padding:15px;background:#fff}.guide-card h2{font-size:1.08rem}.guide-card ol,.guide-card ul{display:grid;gap:7px;margin:8px 0 0;padding-left:22px;color:var(--muted);line-height:1.55}.guide-schedule{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.guide-schedule article{border:1px solid var(--line);border-radius:7px;padding:12px;background:#f8faf7}.guide-schedule strong,.guide-schedule small{display:block}.guide-schedule small{margin-top:4px;color:var(--muted);line-height:1.5}
    @media(max-width:1100px){.global-market-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.institution-leader-grid{grid-template-columns:1fr}.institution-leader-lists{grid-template-columns:repeat(2,minmax(0,1fr))}.institution-leader-list{max-height:520px}.screener-form{grid-template-columns:repeat(3,minmax(0,1fr))}.compare-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:900px){.hero,.grid-2,.grid-4,.peer-grid,.flow-grid,.source-list,.market-snapshot{grid-template-columns:1fr}.recommend-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.quality-grid,.screener-results{grid-template-columns:repeat(2,minmax(0,1fr))}.tree summary,.branch summary{display:block}.tree summary small,.branch summary small{display:block;text-align:left;margin-top:4px}}@media(max-width:760px){.flow-row{grid-template-columns:1fr;align-items:start}.flow-row b{text-align:left}.flow-track{width:100%;min-width:0}.snapshot-grid,.institution-leader-lists,.quality-grid,.screener-results,.compare-grid{grid-template-columns:1fr}.institution-leader-list{max-height:420px}.capital-bar-row{grid-template-columns:minmax(0,1fr) auto}.capital-bar-track{grid-column:1/-1;grid-row:2}.capital-bar-value{grid-column:2;grid-row:1}}@media(max-width:600px){.global-market-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.recommend-grid{grid-template-columns:1fr}.screener-form{grid-template-columns:1fr 1fr}.compare-form{grid-template-columns:1fr}.roster-item{grid-template-columns:1fr}.roster-note-editor{grid-template-columns:1fr}.stock-drawer{width:100vw;max-width:100vw;min-width:0;overflow-x:hidden}.drawer-body,.drawer-section,.chart-toolbar,.chart-panel,.k-chart{min-width:0;max-width:100%}.chart-plot{grid-template-columns:minmax(0,1fr) 62px}.chart-price-scale{min-width:62px}.drawer-grid,.revenue-list{grid-template-columns:1fr}.institution-leader-row{grid-template-columns:22px minmax(0,1fr) auto}.institution-leader-row em{text-align:right}}

    html{scroll-behavior:smooth}
    section[id],article[id]{scroll-margin-top:16px}
    .ux-guide{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:0 0 16px}
    .ux-step{display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-areas:"num title" "num text";gap:2px 9px;min-width:0;border:1px solid var(--line);border-radius:8px;padding:12px;background:#fff;color:inherit;text-decoration:none;box-shadow:var(--shadow)}
    .ux-step b{grid-area:num;display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--green);color:#fff;font-size:.82rem}
    .ux-step strong{grid-area:title;line-height:1.25}.ux-step small{grid-area:text;color:var(--muted);line-height:1.45}
    .ux-note{margin:-4px 0 12px}
    .industry-capital-panel{margin:0 0 16px;overflow:hidden}
    .capital-concentration{margin:0 0 16px}.capital-bars{display:grid;gap:9px;margin-top:12px}.capital-bar-row{display:grid;grid-template-columns:minmax(120px,180px) minmax(120px,1fr) minmax(110px,auto);gap:10px;align-items:center;width:100%;min-width:0;border:0;border-radius:7px;padding:7px;background:transparent;color:inherit;font:inherit;text-align:left;text-decoration:none}.capital-bar-row[data-capital-industry]{cursor:pointer}.capital-bar-row[data-capital-industry]:hover,.capital-bar-row[data-stock-code]:hover{background:#f4f7f2;box-shadow:inset 3px 0 0 var(--green)}.capital-bar-label{min-width:0}.capital-bar-label strong,.capital-bar-label small{display:block;overflow-wrap:anywhere}.capital-bar-label small{margin-top:2px;color:var(--muted);font-size:.74rem}.capital-bar-track{height:16px;overflow:hidden;border-radius:999px;background:#e7ece8}.capital-bar-track i{display:block;height:100%;min-width:2px;border-radius:inherit;background:linear-gradient(90deg,var(--green),#46a17e)}.capital-bar-value{text-align:right;white-space:nowrap}.capital-bar-value strong,.capital-bar-value small{display:block}.capital-bar-value small{color:var(--muted);font-size:.74rem}.capital-concentration-summary{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.capital-concentration-summary b{border:1px solid var(--line);border-radius:999px;padding:5px 9px;background:#fff;font-size:.78rem}.capital-drill-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-top:10px}.capital-drill-head strong{font-size:.9rem}.capital-back{border:1px solid var(--line);border-radius:6px;padding:7px 10px;background:#fff;color:var(--green);font:inherit;font-weight:900;cursor:pointer}.capital-pager{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:12px}.capital-pager button{border:1px solid var(--line);border-radius:6px;padding:7px 11px;background:#fff;color:var(--ink);font:inherit;font-weight:900;cursor:pointer}.capital-pager button:disabled{opacity:.42;cursor:not-allowed}.capital-pager span{min-width:90px;color:var(--muted);font-size:.8rem;font-weight:900;text-align:center}
    .relation-definition{display:flex;gap:8px;align-items:flex-start;border:1px solid rgba(40,109,168,.18);border-radius:8px;margin:0 0 12px;padding:10px 12px;background:rgba(40,109,168,.06);color:var(--muted);line-height:1.55}
    .relation-definition strong{flex:0 0 auto;color:var(--blue)}
    .scenario-legend{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}.scenario-legend span{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:5px 9px;background:#fff;color:var(--muted);font-size:.78rem;font-weight:850}.scenario-legend i{display:inline-block;width:24px;height:7px;border-radius:999px}.scenario-legend .bar-in{background:var(--red)}.scenario-legend .bar-out{background:var(--green)}.scenario-legend .bar-size{background:linear-gradient(90deg,#e7ece8 0 26%,var(--green) 26% 100%)}
    .scenario-map-grid{display:grid;grid-template-columns:260px minmax(0,1fr);gap:14px;align-items:start}
    .scenario-menu{position:sticky;top:10px;display:grid;gap:8px;max-height:calc(100vh - 20px);overflow:auto;border:1px solid var(--line);border-radius:8px;padding:10px;background:#fff}
    .scenario-menu button{display:grid;gap:4px;width:100%;border:1px solid transparent;border-radius:7px;padding:11px 12px;background:#f8faf7;color:var(--ink);font:inherit;text-align:left;cursor:pointer}
    .scenario-menu button strong{font-size:.92rem;line-height:1.3}.scenario-menu button small{color:var(--muted);font-size:.76rem;line-height:1.4}
    .scenario-menu button.active{border-color:rgba(31,122,90,.34);background:rgba(31,122,90,.1);box-shadow:inset 4px 0 0 var(--green)}
    .scenario-content{min-width:0}.scenario-card[hidden]{display:none!important}
    .scenario-card{min-width:0;overflow:hidden;border:1px solid var(--line);border-radius:8px;background:#fff}
    .scenario-summary{display:block;padding:14px}
    .scenario-summary-title{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:start}.scenario-summary-title>strong{min-width:0;font-size:1.02rem;line-height:1.25}.scenario-summary-title>small{min-width:0;max-width:220px;color:var(--muted);font-size:.78rem;font-weight:800;line-height:1.45;text-align:right;overflow-wrap:anywhere}
    .scenario-summary-bars{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.scenario-summary-bars>div{display:grid;gap:5px;min-width:0}.scenario-summary-bars span{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--muted);font-size:.76rem}.scenario-summary-bars span b{font-weight:900}.scenario-summary-bars span strong{color:var(--ink);font-size:.8rem}.scenario-summary-bars .flow-track{height:10px}
    .scenario-card-body{border-top:1px solid var(--line);padding:14px;background:#fbfcf9}.scenario-chain{margin:0 0 10px;color:var(--muted);font-size:.78rem;line-height:1.5}
    .scenario-list{display:grid;gap:6px;margin:0;padding:0;list-style:none}
    .scenario-list li{overflow:hidden;border:1px solid var(--line);border-radius:7px;background:#fff}
    .scenario-list li a{display:grid;grid-template-columns:28px minmax(0,1fr) minmax(118px,auto);grid-template-areas:"rank name amount" "rank bar amount";gap:6px 10px;align-items:center;min-height:58px;padding:8px 10px;color:inherit;text-decoration:none}
    .scenario-list li .scenario-rank{grid-area:rank;display:block;color:var(--muted);font-size:.78rem;font-weight:900;text-align:center}
    .scenario-list li .flow-track{grid-area:bar;width:100%;min-width:0}
    .scenario-list li strong{grid-area:name;min-width:0;font-size:.9rem;line-height:1.3;overflow-wrap:anywhere}
    .scenario-list li small{grid-area:amount;min-width:0;max-width:150px;color:#334455;font-size:.78rem;font-weight:900;line-height:1.35;text-align:right;white-space:normal;overflow-wrap:anywhere}
    .pager{border-top:1px solid rgba(220,226,220,.76);margin-top:4px;background:linear-gradient(to bottom,rgba(246,247,242,.7),rgba(246,247,242,0))}
    .pager button{min-width:58px}.pager .pager-meta{display:grid;gap:2px;min-width:0;text-align:center;line-height:1.25}.pager .pager-meta strong,.pager .pager-meta small{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pager .pager-meta strong{color:var(--ink);font-size:.82rem}.pager .pager-meta small{color:var(--muted);font-size:.74rem}
    .nav a[href^="#"]{background:#f8faf7}
    .info-layout{display:grid;grid-template-columns:280px minmax(0,1fr);gap:14px;align-items:start}
    .info-menu{position:sticky;top:10px;display:grid;gap:8px;max-height:calc(100vh - 20px);overflow:auto;border:1px solid var(--line);border-radius:8px;padding:10px;background:#fff;box-shadow:var(--shadow)}
    .info-menu button{display:grid;gap:4px;width:100%;border:1px solid transparent;border-radius:7px;padding:11px 12px;background:#f8faf7;color:var(--ink);font:inherit;text-align:left;cursor:pointer}
    .info-menu button strong{font-size:.95rem;line-height:1.25}.info-menu button small{color:var(--muted);line-height:1.35}
    .info-menu button.active{border-color:rgba(31,122,90,.34);background:rgba(31,122,90,.1);box-shadow:inset 4px 0 0 var(--green)}
    .info-content{min-width:0}.info-section{min-width:0}.info-section[hidden]{display:none!important}
    @media(max-width:900px){.ux-guide{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:760px){.info-layout,.scenario-map-grid{grid-template-columns:1fr}.info-menu,.scenario-menu{position:relative;top:auto;grid-template-columns:repeat(2,minmax(0,1fr));max-height:none}.info-menu button,.scenario-menu button{min-height:74px}.scenario-summary-title{grid-template-columns:1fr}.scenario-summary-title>small{max-width:none;text-align:left}.capital-bar-row{grid-template-columns:minmax(0,1fr) auto}.capital-bar-track{display:block!important;grid-column:1/-1;grid-row:2;width:100%;min-width:0;height:18px;border:1px solid #d6dfd8;background:#e2e9e4}.capital-bar-track i{display:block!important;min-width:6px;background:linear-gradient(90deg,#087957,#43a57d)}.capital-bar-value{grid-column:2;grid-row:1}}
    @media(max-width:760px){.guide-grid,.guide-schedule{grid-template-columns:1fr}}
    @media(max-width:560px){.ux-guide{grid-template-columns:1fr}.pager{gap:6px;padding-left:4px;padding-right:4px}.pager button{min-width:48px;padding:7px 6px}.info-menu,.scenario-menu{grid-template-columns:1fr}.scenario-summary-bars{grid-template-columns:1fr}.scenario-list li a{grid-template-columns:24px minmax(0,1fr) minmax(104px,auto);gap:6px 8px}.scenario-list li small{max-width:124px}}
    .chart-plot{position:relative}
    .chart-hit{fill:transparent;stroke:transparent;pointer-events:all;cursor:crosshair}
    .mini-hit{fill:rgba(217,74,58,.16);stroke:var(--red);stroke-width:.45}
    .chart-tip{position:fixed;z-index:90;max-width:min(260px,calc(100vw - 24px));border:1px solid var(--line);border-radius:8px;padding:9px 10px;background:#fff;color:var(--ink);box-shadow:0 14px 34px rgba(29,37,43,.18);font-size:.82rem;font-weight:850;line-height:1.5;white-space:pre-line;pointer-events:none}
    .chart-tip[hidden]{display:none!important}
    .install-app{border-color:#0d2f58!important;background:#0d2f58!important;color:#fff!important}
    @media(display-mode:standalone){.install-app{display:none!important}}
    @media(max-width:600px){
      html,body{max-width:100%;overflow-x:hidden}
      body{font-size:15px}
      main{width:min(100% - 24px,1260px);padding-bottom:calc(72px + env(safe-area-inset-bottom))}
      .nav{position:sticky;top:0;z-index:35;margin-inline:-12px;padding:10px 12px;background:rgba(246,247,242,.96);box-shadow:0 1px 0 var(--line);scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}
      .nav-account{margin-left:0;flex:none}
      .nav a,.nav button{min-height:44px;display:inline-flex;align-items:center;scroll-snap-align:start}
      .manual-update{margin-top:8px}
      .hero{gap:12px;padding:18px 0 14px}
      .hero h1{font-size:clamp(1.9rem,11vw,3rem);line-height:1.08}
      .hero p{margin-bottom:0}
      .panel,.metric,.table-panel{min-width:0;padding:14px}
      .panel-head{align-items:flex-start}
      .global-market-grid,.snapshot-grid,.screener-form{grid-template-columns:1fr}
      .global-market-card,.snapshot-card,.quality-row,.compare-card,.screener-result{min-height:88px}
      .stock-lookup{grid-template-columns:1fr}.stock-lookup>button{width:100%}.advanced-screener>summary{align-items:flex-start;flex-direction:column}.screener-form input,.screener-form select,.screener-form button,.compare-form input,.compare-form>button{min-height:44px;font-size:16px}
      .table-panel{overflow-x:auto;-webkit-overflow-scrolling:touch}
      .chart-toolbar{align-items:flex-start}
      .chart-tabs,.chart-indicators{width:100%}
      .chart-tabs button,.indicator-toggle{min-height:42px}
      .chart-panel,.k-chart,.chart-plot,.market-volume-plot{width:100%;overflow:hidden}
      .stock-drawer{height:100dvh;padding-bottom:env(safe-area-inset-bottom)}
      .drawer-head{padding:calc(12px + env(safe-area-inset-top)) 14px 12px}
      .drawer-body{padding:12px}
      .drawer-section{padding:10px}
      .news-item{min-height:58px}
    }
    @media(max-width:380px){
      main{width:min(100% - 16px,1260px)}
      .global-market-grid{grid-template-columns:1fr}
      .quality-summary{gap:5px}
      .quality-summary b{font-size:.72rem}
      .chart-plot{grid-template-columns:minmax(0,1fr) 54px}
      .chart-price-scale{min-width:54px}
    }

`;

const PERFORMANCE_CSS = `
.lazy-tree-shell{min-height:124px;border:1px dashed var(--line);border-radius:8px;padding:14px;background:#fbfcf9}
.lazy-tree-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
.lazy-tree-toolbar p{margin:0}
.lazy-tree-load{border:1px solid var(--green);border-radius:6px;padding:9px 13px;background:var(--green);color:#fff;font:inherit;font-weight:900;cursor:pointer}
.lazy-tree-load:disabled{cursor:wait;opacity:.65}
.lazy-tree-content{margin-top:12px}
.lazy-tree-content:empty{display:none}
.lazy-tree-error{border:1px solid rgba(217,74,58,.28);border-radius:7px;padding:11px;background:#fff7f4;color:var(--red)}
.lazy-tree-meta{margin:0 0 10px;color:var(--muted);font-size:.8rem;font-weight:800}
.lazy-flow{font-weight:900}
@media(max-width:760px){.lazy-tree-toolbar{align-items:flex-start;flex-direction:column}.lazy-tree-load{width:100%}}
`;

const HOME_APP_JS = String.raw`

(() => {
  const form = document.querySelector("[data-screener-form]");
  const root = document.querySelector("[data-screener-results]");
  const status = document.querySelector("[data-screener-status]");
  const submit = form?.querySelector('button[type="submit"]');
  const themeInput = form?.querySelector("[data-screener-theme-input]");
  const themeSuggestions = form?.querySelector("[data-screener-theme-suggestions]");
  const stockInput = document.querySelector("[data-stock-lookup-input]");
  const stockSuggestions = document.querySelector("[data-stock-lookup-suggestions]");
  const stockLookupButton = document.querySelector("[data-stock-lookup-submit]");
  const stockLookupStatus = document.querySelector("[data-stock-lookup-status]");
  if (!form || !root || !status || !submit || !themeInput || !themeSuggestions || !stockInput || !stockSuggestions || !stockLookupButton || !stockLookupStatus) return;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const number = (value) => value === null || value === undefined ? "-" : Number(value).toLocaleString("zh-TW");
  let themeRows = [];
  let stockRows = [];
  let themeTimer = null;
  let stockTimer = null;
  let themeRequest = 0;
  let stockRequest = 0;
  const hideThemeSuggestions = () => {
    themeSuggestions.hidden = true;
    themeSuggestions.innerHTML = "";
    themeInput.setAttribute("aria-expanded", "false");
    themeRows = [];
  };
  const selectTheme = (name) => {
    themeInput.value = String(name || "");
    hideThemeSuggestions();
    themeInput.focus();
  };
  const renderThemeSuggestions = (rows) => {
    themeRows = rows.slice(0, 8);
    themeSuggestions.innerHTML = themeRows.length
      ? themeRows.map((row) => '<button class="screener-theme-option" type="button" role="option" data-screener-theme-value="' + esc(row.theme_name) + '"><strong>' + esc(row.theme_name) + '</strong><small>' + esc((row.theme_category || "已驗證題材") + " / " + number(row.stock_count) + " 檔") + '</small></button>').join("")
      : '<span class="screener-theme-option"><small>沒有完全相符的題材，仍可直接用部分文字篩選。</small></span>';
    themeSuggestions.hidden = false;
    themeInput.setAttribute("aria-expanded", "true");
  };
  const searchThemes = async () => {
    const query = themeInput.value.trim();
    if (!query) return hideThemeSuggestions();
    const requestId = ++themeRequest;
    try {
      const response = await fetch("/api/themes/suggest?q=" + encodeURIComponent(query) + "&limit=8");
      const parsed = await response.json();
      if (!response.ok) throw new Error(parsed.error || "題材搜尋失敗");
      if (requestId !== themeRequest) return;
      renderThemeSuggestions(parsed.data || []);
    } catch (error) {
      status.textContent = error.message;
      hideThemeSuggestions();
    }
  };
  const searchStocks = async () => {
    const keyword = stockInput.value.trim();
    if (!keyword) {
      stockRows = [];
      stockSuggestions.innerHTML = "";
      stockSuggestions.hidden = true;
      stockInput.setAttribute("aria-expanded", "false");
      stockLookupStatus.textContent = "可搜尋上市、上櫃、興櫃、ETF 與 TDR。";
      return;
    }
    const requestId = ++stockRequest;
    stockLookupStatus.textContent = "正在搜尋「" + keyword + "」...";
    try {
      const response = await fetch("/api/stocks/suggest?q=" + encodeURIComponent(keyword) + "&limit=15");
      const parsed = await response.json();
      if (!response.ok) throw new Error(parsed.error || "股票搜尋失敗");
      if (requestId !== stockRequest) return;
      stockRows = parsed.data || [];
      stockSuggestions.innerHTML = stockRows.length
        ? stockRows.map((stock, index) => '<button class="stock-lookup-option' + (index === 0 ? " active" : "") + '" type="button" role="option" data-stock-code="' + esc(stock.stock_code) + '" data-stock-lookup-option><strong>' + esc(stock.stock_code + " " + stock.stock_name) + '</strong><span>' + esc(stock.industry_name || "未分類") + '</span><small>' + esc([stock.market_type, stock.instrument_label].filter(Boolean).join(" / ")) + '</small></button>').join("")
        : '<span class="stock-lookup-option"><strong>找不到相符股票</strong><span>請縮短名稱，或確認代號是否正確。</span></span>';
      stockSuggestions.hidden = false;
      stockInput.setAttribute("aria-expanded", "true");
      stockLookupStatus.textContent = stockRows.length
        ? "找到 " + stockRows.length + " 筆候選；選取後直接開啟個股資訊。"
        : "沒有找到「" + keyword + "」；目前股票總表可能尚未同步該標的。";
    } catch (error) {
      stockRows = [];
      stockSuggestions.hidden = true;
      stockLookupStatus.textContent = error.message;
    }
  };
  const conditionSummary = (params) => {
    const rows = [];
    if (params.get("keyword")) rows.push("股票 " + params.get("keyword"));
    if (params.get("theme")) rows.push("題材 " + params.get("theme"));
    if (params.get("market_type")) rows.push(params.get("market_type"));
    if (params.get("industry")) rows.push("產業 " + params.get("industry"));
    if (params.get("min_price")) rows.push("股價 ≥ " + params.get("min_price"));
    if (params.get("max_price")) rows.push("股價 ≤ " + params.get("max_price"));
    if (params.get("min_turnover")) rows.push("成交額 ≥ " + params.get("min_turnover"));
    if (params.get("min_revenue_yoy")) rows.push("營收 YoY ≥ " + params.get("min_revenue_yoy") + "%");
    if (params.get("flow_direction")) rows.push(params.get("flow_direction") === "buy" ? "法人買超" : "法人賣超");
    return rows;
  };
  const render = (rows, params) => {
    if (!rows.length) {
      const theme = params.get("theme");
      const keyword = params.get("keyword");
      const help = theme
        ? '找不到包含「' + esc(theme) + '」的已驗證題材股票；請從預選清單選擇、縮短文字，或清除其他條件。'
        : keyword
          ? '找不到代號或名稱包含「' + esc(keyword) + '」的股票；請縮短文字或清除其他條件。'
          : "請放寬股價、營收、成交額或法人方向條件。";
      root.innerHTML = '<article class="quality-warning"><strong>沒有符合條件的股票</strong><p>' + help + '</p></article>';
      return;
    }
    root.innerHTML = rows.map((stock) => '<a class="screener-result" href="#stock-' + esc(stock.stock_code) + '" data-stock-code="' + esc(stock.stock_code) + '"><strong>' + esc(stock.stock_code + " " + stock.stock_name) + '</strong><small>' + esc(stock.market_type + " / " + stock.industry_name) + '</small><small>收盤 ' + esc(number(stock.close_price)) + ' / 成交額 ' + esc(number(stock.turnover_value)) + '</small><small>營收 YoY ' + esc(stock.yoy_growth_percent == null ? "-" : Number(stock.yoy_growth_percent).toFixed(1) + "%") + ' / 法人 ' + esc(number(stock.total_institutional_net_buy)) + ' 張</small></a>').join("");
  };
  themeInput.addEventListener("input", () => {
    clearTimeout(themeTimer);
    themeTimer = setTimeout(searchThemes, 180);
  });
  themeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !themeSuggestions.hidden && themeRows.length) {
      event.preventDefault();
      selectTheme(themeRows[0].theme_name);
    } else if (event.key === "Escape") {
      hideThemeSuggestions();
    }
  });
  themeSuggestions.addEventListener("click", (event) => {
    const option = event.target.closest("[data-screener-theme-value]");
    if (option) selectTheme(option.dataset.screenerThemeValue);
  });
  stockInput.addEventListener("input", () => {
    clearTimeout(stockTimer);
    stockRows = [];
    stockSuggestions.innerHTML = "";
    stockSuggestions.hidden = true;
    stockInput.setAttribute("aria-expanded", "false");
    stockTimer = setTimeout(searchStocks, 180);
  });
  stockInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      clearTimeout(stockTimer);
      const first = stockSuggestions.querySelector("[data-stock-lookup-option]");
      if (first) first.click();
      else searchStocks();
    } else if (event.key === "Escape") {
      stockSuggestions.hidden = true;
      stockInput.setAttribute("aria-expanded", "false");
    }
  });
  stockLookupButton.addEventListener("click", async () => {
    clearTimeout(stockTimer);
    if (!stockRows.length) await searchStocks();
    const first = stockSuggestions.querySelector("[data-stock-lookup-option]");
    if (first) first.click();
  });
  stockSuggestions.addEventListener("click", (event) => {
    const option = event.target.closest("[data-stock-lookup-option]");
    if (!option) return;
    clearTimeout(stockTimer);
    stockRequest++;
    const selected = stockRows.find((row) => String(row.stock_code) === String(option.dataset.stockCode));
    if (selected) stockInput.value = selected.stock_code + " " + selected.stock_name;
    stockSuggestions.hidden = true;
    stockInput.setAttribute("aria-expanded", "false");
    stockLookupStatus.textContent = "已選擇 " + (selected ? selected.stock_code + " " + selected.stock_name : option.dataset.stockCode) + "。";
  });
  form.querySelectorAll("[data-screener-theme-example]").forEach((button) => button.addEventListener("click", () => {
    themeInput.value = button.dataset.screenerThemeExample;
    hideThemeSuggestions();
    form.requestSubmit(submit);
  }));
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".screener-theme-search")) hideThemeSuggestions();
    if (!event.target.closest(".stock-lookup-search")) {
      stockSuggestions.hidden = true;
      stockInput.setAttribute("aria-expanded", "false");
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideThemeSuggestions();
    submit.disabled = true;
    status.textContent = "正在套用條件...";
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form).entries()) {
      let clean = String(value).trim();
      if (key === "keyword") clean = clean.match(/^\d{4}/)?.[0] || clean;
      if (clean) params.set(key, clean);
    }
    params.set("limit", "18");
    try {
      const response = await fetch("/api/stocks?" + params.toString());
      const parsed = await response.json();
      if (!response.ok) throw new Error(parsed.error || "選股查詢失敗");
      const rows = parsed.data || [];
      render(rows, params);
      const summary = conditionSummary(params);
      status.textContent = "顯示 " + rows.length + " 檔" + (summary.length ? "；條件：" + summary.join("、") : "") + "。";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
  form.addEventListener("reset", () => window.setTimeout(() => {
    hideThemeSuggestions();
    root.innerHTML = "";
    status.textContent = "已清除進階條件。";
  }, 0));
})();


(() => {
  const form = document.querySelector("[data-compare-form]");
  const input = document.querySelector("[data-compare-input]");
  const selectedRoot = document.querySelector("[data-compare-selected]");
  const suggestionsRoot = document.querySelector("[data-compare-suggestions]");
  const root = document.querySelector("[data-compare-results]");
  const status = document.querySelector("[data-compare-status]");
  const submit = form?.querySelector('button[type="submit"]');
  if (!form || !input || !selectedRoot || !suggestionsRoot || !root || !status || !submit) return;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const number = (value) => value === null || value === undefined ? "-" : Number(value).toLocaleString("zh-TW");
  const selected = new Map();
  let suggestionRows = [];
  let searchTimer = null;
  let searchRequest = 0;
  const hideSuggestions = () => {
    suggestionsRoot.hidden = true;
    suggestionsRoot.innerHTML = "";
    suggestionRows = [];
  };
  const renderSelected = () => {
    selectedRoot.innerHTML = [...selected.values()].map((stock) =>
      '<span class="compare-chip">' + esc(stock.stock_code + " " + stock.stock_name) + '<button type="button" data-compare-remove="' + esc(stock.stock_code) + '" aria-label="移除 ' + esc(stock.stock_name) + '">×</button></span>'
    ).join("");
    status.textContent = selected.size
      ? "已選 " + selected.size + " / 4 檔；" + (selected.size < 2 ? "再加入至少 " + (2 - selected.size) + " 檔。" : "可以開始比較或繼續加入。")
      : "請依序加入 2–4 檔股票。";
    root.innerHTML = "";
  };
  const addStock = (stock) => {
    const code = String(stock?.stock_code || "");
    if (!code || selected.has(code)) {
      input.value = "";
      hideSuggestions();
      input.focus();
      return;
    }
    if (selected.size >= 4) {
      status.textContent = "最多只能比較 4 檔；請先移除一檔。";
      return;
    }
    selected.set(code, stock);
    input.value = "";
    hideSuggestions();
    renderSelected();
    input.focus();
  };
  const renderSuggestions = (rows) => {
    suggestionRows = rows.filter((stock) => !selected.has(String(stock.stock_code))).slice(0, 8);
    suggestionsRoot.innerHTML = suggestionRows.length
      ? suggestionRows.map((stock) => '<button class="compare-suggestion" type="button" data-compare-suggestion="' + esc(stock.stock_code) + '"><strong>' + esc(stock.stock_code + " " + stock.stock_name) + '</strong><small>' + esc([stock.market_type,stock.industry_name].filter(Boolean).join(" / ")) + '</small></button>').join("")
      : '<span class="compare-suggestion"><small>找不到符合的股票</small></span>';
    suggestionsRoot.hidden = false;
  };
  const searchStocks = async () => {
    const keyword = input.value.trim();
    if (!keyword) return hideSuggestions();
    if (selected.size >= 4) {
      status.textContent = "最多只能比較 4 檔；請先移除一檔。";
      return hideSuggestions();
    }
    const requestId = ++searchRequest;
    try {
      const response = await fetch("/api/stocks/suggest?q=" + encodeURIComponent(keyword) + "&limit=8");
      const parsed = await response.json();
      if (!response.ok) throw new Error(parsed.error || "搜尋失敗");
      if (requestId !== searchRequest) return;
      renderSuggestions(parsed.data || []);
    } catch (error) {
      status.textContent = error.message;
      hideSuggestions();
    }
  };
  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(searchStocks, 180);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && suggestionRows.length) {
      event.preventDefault();
      addStock(suggestionRows[0]);
      return;
    }
    if (event.key === "Backspace" && !input.value && selected.size) {
      const code = [...selected.keys()].pop();
      selected.delete(code);
      renderSelected();
    }
  });
  suggestionsRoot.addEventListener("click", (event) => {
    const button = event.target.closest("[data-compare-suggestion]");
    if (!button) return;
    const stock = suggestionRows.find((row) => String(row.stock_code) === String(button.dataset.compareSuggestion));
    if (stock) addStock(stock);
  });
  selectedRoot.addEventListener("click", (event) => {
    const button = event.target.closest("[data-compare-remove]");
    if (!button) return;
    selected.delete(String(button.dataset.compareRemove));
    renderSelected();
    input.focus();
  });
  document.addEventListener("click", (event) => {
    if (!form.contains(event.target)) hideSuggestions();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const codes = [...selected.keys()];
    if (codes.length < 2) {
      status.textContent = "請先加入 2–4 檔股票。";
      return;
    }
    status.textContent = "正在比較 " + codes.join("、") + "...";
    submit.disabled = true;
    try {
      const rows = await Promise.all(codes.map(async (code) => {
        const response = await fetch("/api/stocks/" + code);
        if (!response.ok) throw new Error("找不到 " + code);
        return (await response.json()).data;
      }));
      root.innerHTML = rows.map((data) => {
        const stock = data.stock || {};
        const themes = (data.themes || []).map((theme) => theme.theme_name).slice(0, 3).join("、") || "-";
        const peText = data.valuation?.pe_ratio == null
          ? data.valuation?.status === "not_applicable" ? "不適用（虧損或零盈餘）" : "尚未同步"
          : number(data.valuation.pe_ratio) + " 倍";
        return '<a class="compare-card" href="#stock-' + esc(stock.stock_code) + '" data-stock-code="' + esc(stock.stock_code) + '"><h3>' + esc(stock.stock_code + " " + stock.stock_name) + '</h3><dl><div><dt>官方產業</dt><dd>' + esc(stock.industry_name || "-") + '</dd></div><div><dt>收盤</dt><dd>' + esc(number(data.latest_price?.close_price)) + '</dd></div><div><dt>本益比</dt><dd>' + esc(peText) + '</dd></div><div><dt>月營收 YoY</dt><dd>' + esc(data.latest_revenue?.yoy_growth_percent == null ? "-" : Number(data.latest_revenue.yoy_growth_percent).toFixed(1) + "%") + '</dd></div><div><dt>法人</dt><dd>' + esc(number(data.latest_institutional?.total_institutional_net_buy)) + ' 張</dd></div><div><dt>已驗證題材</dt><dd>' + esc(themes) + '</dd></div><div><dt>評分</dt><dd>' + esc(data.score?.total_score == null ? "資料不足" : number(data.score.total_score)) + '</dd></div></dl><span class="compare-open">查看完整個股抽屜 →</span></a>';
      }).join("");
      status.textContent = "比較完成；未達資料門檻的欄位會顯示資料不足。";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
  renderSelected();
})();


(() => {
  const root = document.querySelector("[data-global-market]");
  const grid = root?.querySelector("[data-global-market-grid]");
  const status = root?.querySelector("[data-global-market-status]");
  if (!root || !grid || !status) return;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const number = (value) => value === null || value === undefined || !Number.isFinite(Number(value))
    ? "--"
    : Number(value).toLocaleString("zh-TW", { maximumFractionDigits: 2 });
  const signed = (value, suffix = "") => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "--";
    return (numeric > 0 ? "+" : "") + numeric.toLocaleString("zh-TW", { maximumFractionDigits: 2 }) + suffix;
  };
  const render = (rows) => {
    grid.innerHTML = rows.map((row) => {
      const changeClass = Number(row.change) >= 0 ? "flow-buy-text" : "flow-sell-text";
      const title = [row.country, row.label].filter(Boolean).join(" · ");
      const note = row.kind === "night"
        ? [row.market, row.data_date, row.contract_month, row.session, row.volume == null ? "" : "量 " + number(row.volume)].filter(Boolean).join(" / ")
        : [row.market, row.market_time].filter(Boolean).join(" / ");
      return '<article class="global-market-card"><span>' + esc(title) + '</span><strong>' + esc(number(row.price)) + '</strong><em class="' + changeClass + '">' + esc(signed(row.change)) + ' / ' + esc(signed(row.change_percent, "%")) + '</em><small>' + esc(note || "資料時間待更新") + '</small></article>';
    }).join("");
  };
  fetch("/api/market/global")
    .then(async (response) => {
      const parsed = await response.json();
      if (!response.ok) throw new Error(parsed.error || "全球市場資料暫時無法載入");
      const rows = parsed.data || [];
      render(rows);
      const unavailable = rows.filter((row) => row.price == null).length;
      status.textContent = unavailable
        ? "已載入；" + unavailable + " 項來源暫時無資料，稍後會自動重試。"
        : "已載入 " + rows.length + " 項；資料快取五分鐘。";
    })
    .catch((error) => {
      status.textContent = error.message;
    });
})();


(() => {
  const root = document.querySelector("[data-capital-chart]");
  if (!root) return;
  const rowsRoot = root.querySelector("[data-capital-rows]");
  const title = root.querySelector("[data-capital-title]");
  const back = root.querySelector("[data-capital-back]");
  const previous = root.querySelector("[data-capital-prev]");
  const next = root.querySelector("[data-capital-next]");
  const pageLabel = root.querySelector("[data-capital-page]");
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const number = (value) => Number(value || 0).toLocaleString("zh-TW", { maximumFractionDigits: 2 });
  const amount = (value) => {
    const numeric = Number(value || 0);
    if (!numeric) return "-";
    return Math.abs(numeric) >= 100000000 ? (numeric / 100000000).toFixed(1) + " 億元" : Math.round(numeric / 10000).toLocaleString("zh-TW") + " 萬元";
  };
  let industries = [];
  try {
    industries = JSON.parse(root.dataset.industries || "[]");
  } catch {}
  const pageSize = 10;
  const marketTotal = industries.reduce((sum, row) => sum + Number(row.turnover_value || 0), 0);
  let mode = "industries";
  let page = 1;
  let detailPages = 1;
  let selectedIndustry = null;
  let requestId = 0;
  const barRow = (row, total, maximum, detail = false) => {
    const turnover = Number(row.turnover_value || 0);
    const share = total ? turnover / total * 100 : 0;
    const width = Math.max(1, maximum ? turnover / maximum * 100 : 1);
    const label = detail ? String(row.stock_code || "") + " " + String(row.stock_name || "") : String(row.industry_name || "未分類");
    const note = detail
      ? String(row.detail_label || "尚無已驗證細分標籤") + " · 漲跌 " + (row.change_percent == null ? "-" : (Number(row.change_percent) >= 0 ? "+" : "") + number(row.change_percent) + "%")
      : number(row.stock_count) + " 檔 · 平均漲跌 " + (row.average_change_percent == null ? "-" : (Number(row.average_change_percent) >= 0 ? "+" : "") + number(row.average_change_percent) + "%");
    const tag = detail ? "a" : "button";
    const attrs = detail
      ? ' href="#stock-' + esc(row.stock_code) + '" data-stock-code="' + esc(row.stock_code) + '"'
      : ' type="button" data-capital-industry="' + esc(row.industry_code || "UNKNOWN") + '"';
    return "<" + tag + ' class="capital-bar-row"' + attrs + '><div class="capital-bar-label"><strong>' + esc(label) + "</strong><small>" + esc(note) + '</small></div><div class="capital-bar-track"><i style="width:' + width.toFixed(2) + '%"></i></div><div class="capital-bar-value"><strong>' + esc(amount(turnover)) + "</strong><small>" + number(share) + "%</small></div></" + tag + ">";
  };
  const updatePager = (totalPages) => {
    previous.disabled = page <= 1;
    next.disabled = page >= totalPages;
    pageLabel.textContent = "第 " + page + " / " + totalPages + " 頁";
  };
  const renderIndustries = () => {
    mode = "industries";
    selectedIndustry = null;
    back.hidden = true;
    title.textContent = "官方產業資金分布";
    const totalPages = Math.max(1, Math.ceil(industries.length / pageSize));
    page = Math.min(page, totalPages);
    const picked = industries.slice((page - 1) * pageSize, page * pageSize);
    const maximum = Math.max(...picked.map((row) => Number(row.turnover_value || 0)), 1);
    rowsRoot.innerHTML = picked.length ? picked.map((row) => barRow(row, marketTotal, maximum)).join("") : '<p class="muted">尚無產業成交值資料。</p>';
    updatePager(totalPages);
  };
  const renderDetail = async () => {
    if (!selectedIndustry) return;
    const currentRequest = ++requestId;
    mode = "detail";
    back.hidden = false;
    title.textContent = selectedIndustry.industry_name + " › 個股與已驗證細分標籤";
    rowsRoot.innerHTML = '<p class="muted">正在載入細分資金量圖...</p>';
    previous.disabled = true;
    next.disabled = true;
    const endpoint = "/api/market/industry-concentration?industry_code=" + encodeURIComponent(selectedIndustry.industry_code) + "&page=" + page + "&page_size=" + pageSize;
    try {
      const response = await fetch(endpoint);
      const parsed = await response.json();
      if (!response.ok) throw new Error(parsed.error || "細分資料讀取失敗");
      if (currentRequest !== requestId) return;
      const data = parsed.data || {};
      detailPages = Math.max(1, Number(data.total_pages || 1));
      const rows = data.rows || [];
      const maximum = Math.max(...rows.map((row) => Number(row.turnover_value || 0)), 1);
      rowsRoot.innerHTML = rows.length ? rows.map((row) => barRow(row, Number(data.turnover_value || 0), maximum, true)).join("") : '<p class="muted">此產業目前沒有可顯示的細分資料。</p>';
      updatePager(detailPages);
    } catch (error) {
      rowsRoot.innerHTML = '<p class="muted">讀取失敗：' + esc(error.message) + "</p>";
      updatePager(1);
    }
  };
  root.addEventListener("click", (event) => {
    const industryButton = event.target.closest("[data-capital-industry]");
    if (industryButton) {
      selectedIndustry = industries.find((item) => String(item.industry_code) === String(industryButton.dataset.capitalIndustry)) || null;
      if (!selectedIndustry) return;
      page = 1;
      renderDetail();
      return;
    }
    if (event.target.closest("[data-capital-back]")) {
      page = 1;
      requestId += 1;
      renderIndustries();
      return;
    }
    if (event.target.closest("[data-capital-prev]") && page > 1) {
      page -= 1;
      mode === "detail" ? renderDetail() : renderIndustries();
      return;
    }
    if (event.target.closest("[data-capital-next]")) {
      const totalPages = mode === "detail" ? detailPages : Math.max(1, Math.ceil(industries.length / pageSize));
      if (page >= totalPages) return;
      page += 1;
      mode === "detail" ? renderDetail() : renderIndustries();
    }
  });
  renderIndustries();
})();


(() => {
  const drawer = document.querySelector("[data-stock-drawer]");
  if (!drawer) return;
  const backdrop = document.querySelector("[data-stock-backdrop]");
  const body = drawer.querySelector("[data-stock-drawer-body]");
  const title = drawer.querySelector("[data-stock-drawer-title]");
  const subtitle = drawer.querySelector("[data-stock-drawer-subtitle]");
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const n = (value) => value === null || value === undefined || value === "" ? "--" : Number(value).toLocaleString("zh-TW");
  const candleStore = new Map();
  const drawerCache = new Map();
  const signed = (value) => {
    const numeric = Number(value || 0);
    if (numeric > 0) return "法人資金流入 " + n(numeric);
    if (numeric < 0) return "法人資金流出 " + n(Math.abs(numeric));
    return "法人資金持平";
  };
  const money = (shares, closePrice) => {
    const amount = Number(shares || 0) * 1000 * Number(closePrice || 0);
    if (!amount) return "法人資金持平";
    const abs = Math.abs(amount);
    const unit = abs >= 100000000 ? (abs / 100000000).toFixed(1) + " 億元" : Math.round(abs / 10000).toLocaleString("zh-TW") + " 萬元";
    return amount > 0 ? "法人資金流入 " + unit : "法人資金流出 " + unit;
  };
  const amountText = (value) => {
    const numeric = Number(value || 0);
    if (!numeric) return "-";
    const abs = Math.abs(numeric);
    return abs >= 100000000 ? (numeric / 100000000).toFixed(1) + " \u5104\u5143" : Math.round(numeric / 10000).toLocaleString("zh-TW") + " \u842c\u5143";
  };
  const close = () => {
    drawer.classList.remove("open");
    backdrop?.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  };
  const open = () => {
    drawer.classList.add("open");
    backdrop?.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
  };
  function chart(rows, key, labelKey) {
    const clean = rows.filter((row) => row && row[key] !== null && row[key] !== undefined).slice(-60);
    if (!clean.length) return '<p class="muted">目前沒有足夠資料</p>';
    const values = clean.map((row) => Number(row[key]));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = clean.map((row, index) => {
      const x = clean.length === 1 ? 0 : (index / (clean.length - 1)) * 100;
      const y = 44 - ((Number(row[key]) - min) / range) * 38;
      return x.toFixed(2) + "," + y.toFixed(2);
    }).join(" ");
    const first = clean[0]?.[labelKey] || "";
    const last = clean[clean.length - 1]?.[labelKey] || "";
    const latest = values[values.length - 1];
    const valueText = key === "monthly_revenue" ? revenueAmount : n;
    const dots = clean.map((row, index) => {
      const x = clean.length === 1 ? 0 : (index / (clean.length - 1)) * 100;
      const y = 44 - ((Number(row[key]) - min) / range) * 38;
      const tip = String(row[labelKey] || "") + "\\n" + (key === "monthly_revenue" ? "\u6708\u71df\u6536 " : "\u6578\u503c ") + valueText(row[key]);
      return '<circle class="chart-hit mini-hit" cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" r="2.7" data-chart-tip="' + esc(tip) + '"></circle>';
    }).join("");
    return '<div class="chart-value-strip"><span>最新 ' + esc(valueText(latest)) + '</span><span>高 ' + esc(valueText(max)) + ' / 低 ' + esc(valueText(min)) + '</span></div><svg class="mini-chart" viewBox="0 0 100 48" preserveAspectRatio="none"><polyline points="' + points + '"></polyline>' + dots + '</svg><div class="chart-axis"><span>' + esc(first) + '</span><span>' + esc(last) + '</span></div>';
  }
  function normalizeCandle(row, labelKey) {
    const close = Number(row.close_price || 0);
    const open = Number(row.open_price || close);
    const high = Number(row.high_price || Math.max(open, close));
    const low = Number(row.low_price || Math.min(open, close));
    const volume = Number(row.volume || 0);
    const turnover = Number(row.turnover_value || 0);
    return { label: row[labelKey] || row.trade_date || "", open, high, low, close, volume, turnover };
  }
  function aggregateCandles(rows, mode) {
    const grouped = new Map();
    rows.forEach((row) => {
      const date = String(row.trade_date || "");
      const period = mode === "year" ? date.slice(0, 4) : date.slice(0, 7);
      if (!period) return;
      const candle = normalizeCandle(row, "trade_date");
      if (!grouped.has(period)) {
        grouped.set(period, { label: period, open: candle.open, high: candle.high, low: candle.low, close: candle.close, volume: candle.volume, turnover: candle.turnover });
        return;
      }
      const current = grouped.get(period);
      current.high = Math.max(current.high, candle.high);
      current.low = Math.min(current.low, candle.low);
      current.close = candle.close;
      current.volume += candle.volume;
      current.turnover += candle.turnover;
    });
    return [...grouped.values()];
  }
  function candleChart(rows) {
    const candles = rows.map((row) => row.open === undefined ? normalizeCandle(row, "trade_date") : row).filter((row) => row.close && row.high && row.low);
    if (!candles.length) return '<p class="muted">目前沒有足夠 K 線資料</p>';
    [5, 10, 20].forEach((windowSize) => {
      candles.forEach((candle, index) => {
        if (index + 1 < windowSize) return;
        const subset = candles.slice(index + 1 - windowSize, index + 1);
        candle["ma" + windowSize] = subset.reduce((sum, item) => sum + Number(item.close || 0), 0) / windowSize;
      });
    });
    candles.forEach((candle, index) => {
      if (index < 19) return;
      const subset = candles.slice(index - 19, index + 1).map((item) => Number(item.close || 0));
      const middle = subset.reduce((sum, value) => sum + value, 0) / subset.length;
      const variance = subset.reduce((sum, value) => sum + Math.pow(value - middle, 2), 0) / subset.length;
      const deviation = Math.sqrt(variance);
      candle.bollMiddle = middle;
      candle.bollUpper = middle + deviation * 2;
      candle.bollLower = middle - deviation * 2;
    });
    const id = "k-" + Math.random().toString(36).slice(2);
    candleStore.set(id, candles);
    return '<div class="k-chart" data-candle-id="' + esc(id) + '" data-moving-average="1" data-bollinger="0"></div>';
  }
  function lineCharts(priceRows) {
    const dayRows = priceRows;
    const monthRows = aggregateCandles(priceRows, "month");
    const yearRows = aggregateCandles(priceRows, "year");
    const firstDate = dayRows[0]?.trade_date || "-";
    const lastDate = dayRows[dayRows.length - 1]?.trade_date || "-";
    return '<section class="drawer-section line-tabs"><h3>K 線與線型</h3>' +
      '<p class="muted history-status" data-history-status>歷史資料 ' + dayRows.length + ' 筆 · ' + esc(firstDate) + ' 至 ' + esc(lastDate) + '</p>' +
      '<div class="chart-toolbar"><div class="chart-tabs"><button type="button" class="active" data-chart-tab="day">日線</button><button type="button" data-chart-tab="month">月線</button><button type="button" data-chart-tab="year">年線</button></div><div class="chart-indicators"><label class="indicator-toggle"><input type="checkbox" data-ma-toggle checked><span>移動平均線 MA</span></label><label class="indicator-toggle"><input type="checkbox" data-bollinger-toggle><span>布林通道 BOLL</span></label></div></div>' +
      '<div class="chart-panel" data-chart-panel="day">' + candleChart(dayRows) + '</div>' +
      '<div class="chart-panel" data-chart-panel="month" hidden>' + candleChart(monthRows) + '</div>' +
      '<div class="chart-panel" data-chart-panel="year" hidden>' + candleChart(yearRows) + '</div>' +
      '</section>';
  }
  function revenueAmount(value) {
    const amount = Number(value || 0) * 1000;
    if (!amount) return "--";
    const abs = Math.abs(amount);
    if (abs >= 100000000) return (amount / 100000000).toFixed(1) + " \u5104\u5143";
    return Math.round(amount / 10000).toLocaleString("zh-TW") + " \u842c\u5143";
  }
  function revenueRow(row) {
    const period = Number(row.revenue_year || 0) + "/" + String(row.revenue_month || "").padStart(2, "0");
    const hasPrevious = row.last_month_revenue !== null && row.last_month_revenue !== undefined && row.last_month_revenue !== "";
    const diff = hasPrevious ? Number(row.monthly_revenue || 0) - Number(row.last_month_revenue || 0) : null;
    const mom = row.mom_growth_percent === null || row.mom_growth_percent === undefined ? null : Number(row.mom_growth_percent);
    const direction = diff === null ? "-" : diff > 0 ? "\u589e\u52a0" : diff < 0 ? "\u6e1b\u5c11" : "\u6301\u5e73";
    const amountText = diff ? " / " + (diff > 0 ? "+" : "-") + revenueAmount(Math.abs(diff)) : "";
    const momText = mom === null ? "\u6bd4\u4e0a\u6708\uff1a" + direction + amountText : "\u6bd4\u4e0a\u6708" + direction + " " + n(Math.abs(mom)) + "%" + amountText;
    const yoyText = row.yoy_growth_percent === null || row.yoy_growth_percent === undefined ? "-" : n(row.yoy_growth_percent) + "%";
    return '<article><strong>' + esc(period) + '</strong><span>' + esc(revenueAmount(row.monthly_revenue)) + '</span><small>' + esc(momText) + '<br>YoY ' + esc(yoyText) + '</small></article>';
  }
  function nextRevenueAnnouncement(latestRevenue) {
    const year = Number(latestRevenue.revenue_year || 0);
    const month = Number(latestRevenue.revenue_month || 0);
    if (!year || !month) return "-";
    const nextRevenueMonth = month === 12 ? 1 : month + 1;
    const nextRevenueYear = month === 12 ? year + 1 : year;
    const announceMonth = nextRevenueMonth === 12 ? 1 : nextRevenueMonth + 1;
    const announceYear = nextRevenueMonth === 12 ? nextRevenueYear + 1 : nextRevenueYear;
    return announceYear + "-" + String(announceMonth).padStart(2, "0") + "-10 \u524d";
  }
  function latestRevenueAnnouncement(latestRevenue) {
    const reportDate = String(latestRevenue?.report_date || "");
    const year = Number(latestRevenue?.revenue_year || 0);
    const month = Number(latestRevenue?.revenue_month || 0);
    if (!reportDate || !year || !month) return "-";
    const deadlineYear = month === 12 ? year + 1 : year;
    const deadlineMonth = month === 12 ? 1 : month + 1;
    const deadline = deadlineYear + "-" + String(deadlineMonth).padStart(2, "0") + "-10";
    return reportDate + (reportDate < deadline ? "（提前公布）" : "");
  }
  function monthlyRevenueSection(rows, latestRevenue) {
    const allRows = [...rows].sort((a, b) => Number(b.revenue_year || 0) - Number(a.revenue_year || 0) || Number(b.revenue_month || 0) - Number(a.revenue_month || 0)).slice(0, 24);
    const chartRows = [...allRows].reverse();
    const latestSix = allRows.slice(0, 6);
    const olderRows = allRows.slice(6);
    return '<section class="drawer-section"><h3>\u6708\u71df\u6536</h3>' +
      '<p class="muted">\u8fd1\u5169\u5e74\u8cc7\u6599\uff1a\u76ee\u524d\u5df2\u5165\u5eab ' + allRows.length + ' / 24 \u500b\u6708\uff1b\u5148\u986f\u793a\u6700\u8fd1 6 \u7b46\u3002</p>' +
      chart(chartRows, "monthly_revenue", "revenue_month") +
      '<div class="revenue-list">' + latestSix.map(revenueRow).join("") + '</div>' +
      (olderRows.length ? '<details class="revenue-all"><summary>\u5c55\u958b\u5168\u90e8\u6708\u71df\u6536</summary><div class="revenue-list" data-paged-list data-page-size="10" data-pager-id="drawer-revenue-all">' + olderRows.map((row) => revenueRow(row).replace("<article>", "<article data-page-item>")).join("") + '</div><div class="pager" data-pager-controls="drawer-revenue-all"></div></details>' : '') +
      '<p class="muted">\u6700\u65b0\u7d2f\u8a08\u71df\u6536\uff1a' + esc(revenueAmount(latestRevenue?.cumulative_revenue)) + ' / \u4e0b\u6b21\u516c\u544a\u65e5\uff1a' + esc(nextRevenueAnnouncement(latestRevenue || {})) + '</p>' +
      '</section>';
  }
  function aggregateFlow(rows, days) {
    const picked = rows.slice(0, days);
    const latest = picked[0] || {};
    const total = picked.reduce((sum, row) => ({
      foreign_investor_net_buy: sum.foreign_investor_net_buy + Number(row.foreign_investor_net_buy || 0),
      investment_trust_net_buy: sum.investment_trust_net_buy + Number(row.investment_trust_net_buy || 0),
      dealer_net_buy: sum.dealer_net_buy + Number(row.dealer_net_buy || 0),
      total_institutional_net_buy: sum.total_institutional_net_buy + Number(row.total_institutional_net_buy || 0),
    }), { foreign_investor_net_buy: 0, investment_trust_net_buy: 0, dealer_net_buy: 0, total_institutional_net_buy: 0 });
    total.foreign_investor_holding_shares = latest.foreign_investor_holding_shares;
    total.foreign_investor_holding_percent = latest.foreign_investor_holding_percent;
    return total;
  }
  function lotLabel(value) {
    if (value === null || value === undefined || value === "") return "-";
    const lots = Number(value || 0) / 1000;
    return n(Math.round(lots)) + " \u5f35";
  }
  function flowMetric(label, lots, closePrice, holdingText) {
    const signedLots = Number(lots || 0);
    const direction = signedLots > 0 ? "\u8cb7\u8d85" : signedLots < 0 ? "\u8ce3\u8d85" : "\u6301\u5e73";
    const tone = signedLots >= 0 ? "flow-buy-text" : "flow-sell-text";
    const lotsText = direction + " " + n(Math.round(Math.abs(signedLots))) + " \u5f35";
    const estimatedAmount = amountText(signedLots * 1000 * Number(closePrice || 0));
    return '<article class="drawer-metric"><span>' + esc(label) + '</span><strong class="' + tone + '">' + esc(lotsText) + '</strong><small>\u4f30\u7b97\u91d1\u984d\uff1a' + esc(estimatedAmount) + '<br>\u76ee\u524d\u6301\u6709\u7e3d\u5f35\u6578\uff1a' + esc(holdingText || "\u5b98\u65b9\u672a\u63d0\u4f9b\u7e3d\u6301\u80a1") + '</small></article>';
  }
  function flowBlock(flow, closePrice) {
    const foreignHolding = lotLabel(flow.foreign_investor_holding_shares) + (flow.foreign_investor_holding_percent !== null && flow.foreign_investor_holding_percent !== undefined ? " / " + n(flow.foreign_investor_holding_percent) + "%" : "");
    const missingHolding = "\u5b98\u65b9\u672a\u63d0\u4f9b\u7e3d\u6301\u80a1";
    return '<div class="drawer-grid">' +
      flowMetric("\u5916\u8cc7", flow.foreign_investor_net_buy, closePrice, foreignHolding) +
      flowMetric("\u6295\u4fe1", flow.investment_trust_net_buy, closePrice, missingHolding) +
      flowMetric("\u81ea\u71df\u5546", flow.dealer_net_buy, closePrice, missingHolding) +
      flowMetric("\u4e09\u5927\u6cd5\u4eba\u5408\u8a08", flow.total_institutional_net_buy, closePrice, "\u5916\u8cc7\uff1a" + foreignHolding + "\uff1b\u6295\u4fe1/\u81ea\u71df\u5546\uff1a" + missingHolding) +
      '</div>';
  }
  function institutionalSection(rows, closePrice) {
    const periods = [{ key: "day", label: "\u7576\u65e5", days: 1 }, { key: "5d", label: "5\u65e5", days: 5 }, { key: "10d", label: "10\u65e5", days: 10 }];
    return '<section class="drawer-section institutional-tabs"><h3>\u4e09\u5927\u6cd5\u4eba\u9032\u51fa</h3>' +
      '<p class="muted">\u76ee\u524d\u5df2\u5165\u5eab ' + rows.length + ' \u500b\u4ea4\u6613\u65e5\uff1b\u53ef\u5207\u63db\u7576\u65e5\u30015\u65e5\u300110\u65e5\u3002\u5f35\u6578\u4ee5\u8cb7\u8ce3\u8d85\u5f35\u6578\u986f\u793a\uff0c\u91d1\u984d\u4ee5\u5f35\u6578 \u00d7 1000 \u00d7 \u6700\u65b0\u6536\u76e4\u50f9\u4f30\u7b97\u3002</p>' +
      '<div class="chart-tabs">' + periods.map((period, index) => '<button type="button" class="' + (index === 0 ? "active" : "") + '" data-flow-tab="' + period.key + '">' + period.label + '</button>').join("") + '</div>' +
      periods.map((period, index) => '<div class="flow-panel-body" data-flow-panel="' + period.key + '"' + (index === 0 ? "" : " hidden") + '>' + flowBlock(aggregateFlow(rows, period.days), closePrice) + '</div>').join("") +
      '</section>';
  }
  function dividendLabel(row) {
    if (!row) return "-";
    const value = row.dividend_value === null || row.dividend_value === undefined ? "" : " / " + n(row.dividend_value);
    return (row.ex_dividend_date || "-") + " " + (row.dividend_type || "\u9664\u6b0a\u606f") + value;
  }
  function importantDatesSection(latestRevenue, dividends = []) {
    const today = new Date().toISOString().slice(0, 10);
    const clean = [...(dividends || [])].filter((row) => row && row.ex_dividend_date).sort((a, b) => String(a.ex_dividend_date).localeCompare(String(b.ex_dividend_date)));
    const previousDividend = [...clean].reverse().find((row) => row.ex_dividend_date <= today) || null;
    const nextDividend = clean.find((row) => row.ex_dividend_date >= today) || null;
    return '<section class="drawer-section"><h3>\u91cd\u8981\u65e5\u671f</h3><div class="drawer-grid">' +
      metric("\u6700\u65b0\u71df\u6536\u5be6\u969b\u516c\u544a\u65e5", latestRevenueAnnouncement(latestRevenue)) +
      metric("\u4e0b\u6b21\u71df\u6536\u516c\u544a\u671f\u9650", nextRevenueAnnouncement(latestRevenue)) +
      metric("\u6700\u8fd1\u9664\u606f\u65e5", dividendLabel(previousDividend)) +
      metric("\u4e0b\u6b21\u9664\u606f\u65e5", dividendLabel(nextDividend)) +
      metric("\u6cd5\u8aaa\u6703\u516c\u544a\u65e5", "-") +
      '</div></section>';
  }
  function surveillanceSection(stock) {
    const notices = Array.isArray(stock.market_notices) ? stock.market_notices : [];
    if (!notices.length) return "";
    return '<section class="drawer-section"><h3>市場監視</h3>' + notices.map((notice) =>
      '<article class="notice-card"><strong>' + esc(notice.status || "市場公告") + '</strong><p class="muted">' + esc(notice.reason || "") + '</p>' +
      '<small>公告日期：' + esc(notice.announcement_date || "-") + ' / 區間：' + esc(notice.period || "-") + '</small>' +
      (notice.source_url ? '<a href="' + esc(notice.source_url) + '" target="_blank" rel="noopener noreferrer">官方公告來源</a>' : '') +
      '</article>'
    ).join("") + '</section>';
  }
  function stockNewsSection(rows = []) {
    const clean = rows.filter((row) => row && row.title && row.url).slice(0, 9);
    return '<section class="drawer-section"><h3>個股新聞與公告</h3><p class="muted">開啟個股時按需載入；官方公告優先，媒體只保留高可信來源標題。</p><div class="news-list">' +
      (clean.length ? clean.map((row) => {
        const date = row.published_at ? new Date(row.published_at).toLocaleString("zh-TW",{hour12:false}) : "";
        const confidence = row.confidence === "official" ? "官方公告" : "高可信度新聞";
        return '<a class="news-item" href="' + esc(row.url) + '" target="_blank" rel="noopener noreferrer"><strong>' + esc(row.title) + '</strong><small>' + esc([row.publisher,date].filter(Boolean).join(" · ")) + ' · <span class="news-confidence">' + esc(confidence) + '</span></small></a>';
      }).join("") : '<p class="muted">目前沒有符合可信來源門檻的新聞。</p>') +
      '</div></section>';
  }
  function metric(label, value) {
    return '<article class="drawer-metric"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong></article>';
  }
  function bindChartTabs() {
    body.querySelectorAll("[data-chart-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.chartTab;
        body.querySelectorAll("[data-chart-tab]").forEach((tab) => tab.classList.toggle("active", tab === button));
        body.querySelectorAll("[data-chart-panel]").forEach((panel) => {
          panel.hidden = panel.dataset.chartPanel !== target;
        });
      });
    });
  }
  function bindBollingerToggle() {
    const toggle = body.querySelector("[data-bollinger-toggle]");
    if (!toggle) return;
    toggle.addEventListener("change", () => {
      body.querySelectorAll(".line-tabs .k-chart").forEach((node) => {
        node.dataset.bollinger = toggle.checked ? "1" : "0";
        if (typeof node.renderCandleChart === "function") node.renderCandleChart();
      });
    });
  }
  function bindMovingAverageToggle() {
    const toggle = body.querySelector("[data-ma-toggle]");
    if (!toggle) return;
    toggle.addEventListener("change", () => {
      body.querySelectorAll(".line-tabs .k-chart").forEach((node) => {
        node.dataset.movingAverage = toggle.checked ? "1" : "0";
        if (typeof node.renderCandleChart === "function") node.renderCandleChart();
      });
    });
  }
  function bindFlowTabs() {
    body.querySelectorAll("[data-flow-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.flowTab;
        body.querySelectorAll("[data-flow-tab]").forEach((tab) => tab.classList.toggle("active", tab === button));
        body.querySelectorAll("[data-flow-panel]").forEach((panel) => {
          panel.hidden = panel.dataset.flowPanel !== target;
        });
      });
    });
  }
  function initDrawerPagedLists() {
    if (typeof window.initPagedLists === "function") window.initPagedLists(body);
  }
  function initKCharts() {
    body.querySelectorAll(".k-chart").forEach((node) => {
      const candles = candleStore.get(node.dataset.candleId) || [];
      if (!candles.length) return;
      let visible = Math.min(60, candles.length);
      const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
      const priceY = (price, min, range) => 60 - ((Number(price) - min) / range) * 54;
      const render = () => {
        const data = candles.slice(-visible);
        const showBollinger = node.dataset.bollinger === "1";
        const showMovingAverage = node.dataset.movingAverage !== "0";
        const movingValues = showMovingAverage
          ? data.flatMap((item) => [item.ma5, item.ma10, item.ma20].filter((value) => Number.isFinite(Number(value))).map(Number))
          : [];
        const lows = data.flatMap((item) => [Number(item.low), ...(showBollinger && item.bollLower ? [Number(item.bollLower)] : [])]).concat(movingValues);
        const highs = data.flatMap((item) => [Number(item.high), ...(showBollinger && item.bollUpper ? [Number(item.bollUpper)] : [])]).concat(movingValues);
        const maxVolume = Math.max(...data.map((item) => Number(item.volume || 0)), 1);
        const maxTurnover = Math.max(...data.map((item) => Number(item.turnover || 0)), 1);
        const min = Math.min(...lows);
        const max = Math.max(...highs);
        const range = max - min || 1;
        const step = 100 / data.length;
        const bodyWidth = clamp(step * 0.56, 1.2, 5.5);
        const parts = data.map((item, index) => {
          const open = Number(item.open);
          const high = Number(item.high);
          const low = Number(item.low);
          const closePrice = Number(item.close);
          const x = step * index + step / 2;
          const yHigh = priceY(high, min, range);
          const yLow = priceY(low, min, range);
          const yOpen = priceY(open, min, range);
          const yClose = priceY(closePrice, min, range);
          const top = Math.min(yOpen, yClose);
          const height = Math.max(1.2, Math.abs(yOpen - yClose));
          const color = closePrice >= open ? "up" : "down";
          return '<line class="' + color + '" x1="' + x.toFixed(2) + '" y1="' + yHigh.toFixed(2) + '" x2="' + x.toFixed(2) + '" y2="' + yLow.toFixed(2) + '"></line><rect class="' + color + '" x="' + (x - bodyWidth / 2).toFixed(2) + '" y="' + top.toFixed(2) + '" width="' + bodyWidth.toFixed(2) + '" height="' + height.toFixed(2) + '"></rect>';
        }).join("");
        const volumeBars = data.map((item, index) => {
          const x = step * index + step / 2;
          const height = Math.max(0.8, (Number(item.volume || 0) / maxVolume) * 18);
          const y = 90 - height;
          const color = Number(item.close) >= Number(item.open) ? "up" : "down";
          return '<rect class="volume ' + color + '" x="' + (x - bodyWidth / 2).toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + bodyWidth.toFixed(2) + '" height="' + height.toFixed(2) + '"></rect>';
        }).join("");
        const amountPoints = data.map((item, index) => {
          if (!Number(item.turnover || 0)) return "";
          const x = step * index + step / 2;
          const y = 88 - (Number(item.turnover || 0) / maxTurnover) * 18;
          return x.toFixed(2) + "," + y.toFixed(2);
        }).filter(Boolean).join(" ");
        const amountLine = amountPoints ? '<polyline class="amount-line" points="' + amountPoints + '"></polyline>' : "";
        const priceGrid = [6, 19.5, 33, 46.5, 60].map((y) =>
          '<line class="price-grid" x1="0" y1="' + y + '" x2="100" y2="' + y + '"></line>'
        ).join("");
        const movingLines = showMovingAverage ? [5, 10, 20].map((windowSize) => {
          const points = data.map((item, index) => {
            const value = item["ma" + windowSize];
            if (!value) return "";
            const x = step * index + step / 2;
            const y = priceY(value, min, range);
            return x.toFixed(2) + "," + y.toFixed(2);
          }).filter(Boolean).join(" ");
          return points ? '<polyline class="ma ma' + windowSize + '" points="' + points + '"></polyline>' : "";
        }).join("") : "";
        const bollinger = showBollinger ? (() => {
          const pointRows = data.map((item, index) => ({
            x: step * index + step / 2,
            upper: item.bollUpper,
            middle: item.bollMiddle,
            lower: item.bollLower,
          })).filter((item) => item.upper && item.middle && item.lower);
          if (pointRows.length < 2) return "";
          const upper = pointRows.map((item) => item.x.toFixed(2) + "," + priceY(item.upper, min, range).toFixed(2));
          const middle = pointRows.map((item) => item.x.toFixed(2) + "," + priceY(item.middle, min, range).toFixed(2));
          const lower = pointRows.map((item) => item.x.toFixed(2) + "," + priceY(item.lower, min, range).toFixed(2));
          return '<polygon class="boll-band" points="' + [...upper, ...[...lower].reverse()].join(" ") + '"></polygon><polyline class="boll-line boll-upper" points="' + upper.join(" ") + '"></polyline><polyline class="boll-line boll-mid" points="' + middle.join(" ") + '"></polyline><polyline class="boll-line boll-lower" points="' + lower.join(" ") + '"></polyline>';
        })() : "";
        const hits = data.map((item, index) => {
          const tip = [
            item.label || "",
            "\u958b " + n(item.open),
            "\u9ad8 " + n(item.high),
            "\u4f4e " + n(item.low),
            "\u6536 " + n(item.close),
            "\u91cf " + n(item.volume),
            "\u6210\u4ea4\u91d1\u984d " + amountText(item.turnover),
          ].join("\\n");
          return '<rect class="chart-hit" x="' + (step * index).toFixed(2) + '" y="0" width="' + step.toFixed(2) + '" height="92" data-chart-tip="' + esc(tip) + '"></rect>';
        }).join("");
        const first = data[0]?.label || "";
        const last = data[data.length - 1]?.label || "";
        const latest = data[data.length - 1] || {};
        const valueStrip = '<div class="chart-value-strip"><span>\u76ee\u524d\u80a1\u50f9 ' + esc(n(latest.close)) + '</span><span>\u9ad8 ' + esc(n(max)) + ' / \u4f4e ' + esc(n(min)) + '</span><span>\u6210\u4ea4\u91d1\u984d ' + esc(amountText(latest.turnover)) + '</span></div>';
        const scale = '<div class="chart-price-scale"><span>\u9ad8 ' + esc(n(max)) + '</span><span>\u6536 ' + esc(n(latest.close)) + '</span><span>\u4f4e ' + esc(n(min)) + '</span></div>';
        const maLegend = showMovingAverage
          ? '<b class="ma5">MA5 ' + esc(n(latest.ma5)) + '</b><b class="ma10">MA10 ' + esc(n(latest.ma10)) + '</b><b class="ma20">MA20 ' + esc(n(latest.ma20)) + '</b>'
          : '';
        const bollLegend = showBollinger
          ? '<b class="boll-label">UB ' + esc(n(latest.bollUpper)) + ' / MB ' + esc(n(latest.bollMiddle)) + ' / LB ' + esc(n(latest.bollLower)) + '</b>'
          : '';
        node.innerHTML = valueStrip + '<div class="ma-legend">' + maLegend + bollLegend + '<b class="volume-label">\u91cf</b><b class="amount-label">\u6210\u4ea4\u91d1\u984d</b></div><div class="chart-plot"><svg viewBox="0 0 100 92" preserveAspectRatio="none">' + priceGrid + bollinger + parts + movingLines + volumeBars + amountLine + hits + '</svg>' + scale + '</div><div class="chart-axis"><span>' + esc(first) + '</span><span>' + data.length + ' \u6839</span><span>' + esc(last) + '</span></div>';
      };
      node.addEventListener("wheel", (event) => {
        event.preventDefault();
        visible = clamp(visible + (event.deltaY > 0 ? 10 : -10), Math.min(12, candles.length), candles.length);
        render();
      }, { passive: false });
      node.renderCandleChart = render;
      render();
    });
  }
  let activeCode = "";
  const fetchStockJson = (code, suffix = "") => fetch("/api/stocks/" + encodeURIComponent(code) + suffix).then((res) => {
    if (!res.ok) throw new Error("API " + res.status);
    return res.json();
  });
  const fetchPriceHistory = (code) => fetchStockJson(code, "/history?months=24&v=${PERFORMANCE_ASSET_VERSION}")
    .catch(() => fetchStockJson(code, "/price"));
  function drawerSkeleton(code) {
    return '<section class="drawer-grid drawer-skeleton"><article class="drawer-metric"><span>\u80a1\u50f9</span><strong>...</strong></article><article class="drawer-metric"><span>\u6f32\u8dcc\u5e45</span><strong>...</strong></article><article class="drawer-metric"><span>\u4e09\u5927\u6cd5\u4eba</span><strong>...</strong></article><article class="drawer-metric"><span>EPS</span><strong>...</strong></article></section>' +
      '<section class="drawer-section"><h3>K \u7dda</h3><p class="muted">\u6b63\u5728\u8f09\u5165\u80a1\u50f9\u8207\u7dda\u578b...</p></section>' +
      '<section class="drawer-section"><h3>\u4e09\u5927\u6cd5\u4eba\u9032\u51fa</h3><p class="muted">\u6b63\u5728\u8f09\u5165\u5916\u8cc7\u3001\u6295\u4fe1\u3001\u81ea\u71df\u5546...</p></section>';
  }
  function renderLoaded(code, payload) {
    candleStore.clear();
    const detail = payload.detail || { data: {} };
    const prices = payload.prices || { data: [] };
    const revenue = payload.revenue || { data: [] };
    const financials = payload.financials || { data: [] };
    const institutional = payload.institutional || { data: [] };
    const surveillance = payload.surveillance || { data: [] };
    const news = payload.news || { data: [] };
    const stock = detail.data.stock || {};
    stock.market_notices = surveillance.data || [];
    stock.dividends = detail.data.dividends || [];
    const priceRows = prices.data || [];
    const revenueRows = revenue.data || [];
    const financialRows = financials.data || [];
    const flowRows = institutional.data || [];
    const newsRows = news.data || [];
    const latestPrice = priceRows[priceRows.length - 1] || detail.data.latest_price || {};
    const latestRevenue = revenueRows[0] || detail.data.latest_revenue || {};
    const latestFinancial = financialRows[0] || detail.data.latest_financial || {};
    const latestFlow = flowRows[0] || detail.data.latest_institutional || {};
    const valuation = detail.data.valuation || {};
    const peText = valuation.pe_ratio == null
      ? valuation.status === "not_applicable" ? "\u4e0d\u9069\u7528\uff08\u8667\u640d\u6216\u96f6\u76c8\u9918\uff09" : "\u5c1a\u672a\u540c\u6b65"
      : n(valuation.pe_ratio) + " \u500d";
    const epsText = valuation.ttm_eps == null
      ? valuation.status === "not_applicable" ? "\u975e\u6b63\u503c\uff0f\u4e0d\u9069\u7528" : "\u5c1a\u672a\u540c\u6b65"
      : n(valuation.ttm_eps) + " \u5143";
    const score = detail.data.score || {};
    const netAmount = Number(latestFlow.total_institutional_net_buy || 0) * 1000 * Number(latestPrice.close_price || 0);
    drawer.classList.toggle("tone-hot", netAmount > 0);
    drawer.classList.toggle("tone-cool", netAmount < 0);
    title.textContent = (stock.stock_code || code) + " " + (stock.stock_name || "");
    subtitle.textContent = [stock.market_type, stock.industry_name, stock.company_type].filter(Boolean).join(" / ");
    body.innerHTML =
      '<section class="drawer-product"><span>主要產品</span><p>' + esc(stock.product_description || "公司主要產品與服務請參考公開資訊觀測站") + '</p><div>' + (stock.product_groups || []).map((group) => '<b class="label-chip">' + esc(group) + '</b>').join("") + '</div></section>' +
      '<section class="drawer-section"><h3>個股評分</h3>' +
        (score.total_score == null
          ? '<p class="muted">目前沒有與最新行情同日的正式評分。</p>'
          : '<div class="drawer-grid">' +
              metric("總分", n(score.total_score) + " / 100") +
              metric("狀態", score.status || "-") +
              metric("價格動能 25%", n(score.price_momentum_score)) +
              metric("成交值 20%", n(score.volume_score)) +
              metric("法人 25%", n(score.institutional_score)) +
              metric("營收 20%", n(score.revenue_score)) +
              metric("已驗證題材 10%", n(score.theme_score)) +
            '</div><p class="muted">' + esc(score.reason || "缺值採中性 50 分。") + '</p>') +
      '</section>' +
      '<section class="drawer-grid">' +
        metric("\u6536\u76e4\u50f9", n(latestPrice.close_price)) +
        metric("\u6f32\u8dcc\u5e45", latestPrice.change_percent === undefined ? "--" : n(latestPrice.change_percent) + "%") +
        metric("\u672c\u76ca\u6bd4", peText) +
        metric("\u4e09\u5927\u6cd5\u4eba\u4f30\u7b97\u91d1\u984d", amountText(netAmount)) +
        metric("TTM EPS", epsText) +
      '</section>' +
      lineCharts(priceRows) +
      institutionalSection(flowRows, latestPrice.close_price) +
      monthlyRevenueSection(revenueRows, latestRevenue) +
      importantDatesSection(latestRevenue, stock.dividends) +
      surveillanceSection(stock) +
      stockNewsSection(newsRows) +
      '<section class="drawer-section"><h3>\u984c\u6750\u8207\u7522\u696d\u95dc\u806f</h3>' +
        (detail.data.themes || []).slice(0, 8).map((theme) => '<b class="label-chip">' + esc(theme.theme_name) + '</b>').join("") +
        (detail.data.supply_chain_roles || []).slice(0, 5).map((role) => '<p class="muted">' + esc(role.theme_name || "") + ' / ' + esc(role.role_type || "") + ' / ' + esc(role.major_products || "") + '</p>').join("") +
      '</section>';
    initKCharts();
    bindChartTabs();
    bindMovingAverageToggle();
    bindBollingerToggle();
    bindFlowTabs();
    initDrawerPagedLists();
  }
  async function load(code) {
    activeCode = code;
    title.textContent = code;
    subtitle.textContent = "\u6b63\u5728\u8f09\u5165\u500b\u80a1\u8cc7\u6599...";
    if (drawerCache.has(code)) {
      open();
      const cached = drawerCache.get(code);
      renderLoaded(code, cached);
    } else {
      body.innerHTML = drawerSkeleton(code);
      open();
    }
    try {
      const [detail, prices, institutional] = await Promise.all([
        fetchStockJson(code),
        fetchPriceHistory(code),
        fetchStockJson(code, "/institutional"),
      ]);
      if (activeCode !== code) return;
      const partial = { detail, prices, institutional, revenue: { data: [] }, financials: { data: [] }, surveillance: { data: [] }, news: { data: [] } };
      renderLoaded(code, partial);
      Promise.all([
        fetchStockJson(code, "/revenue"),
        fetchStockJson(code, "/financials"),
        fetch("/api/market/surveillance?stock_code=" + encodeURIComponent(code)).then((res) => res.ok ? res.json() : { data: [] }).catch(() => ({ data: [] })),
        fetchStockJson(code, "/news").catch(() => ({ data: [] })),
      ]).then(([revenue, financials, surveillance, news]) => {
        const full = { ...partial, revenue, financials, surveillance, news };
        drawerCache.set(code, full);
        if (activeCode === code) renderLoaded(code, full);
      }).catch(() => {
        drawerCache.set(code, partial);
      });
    } catch (error) {
      body.innerHTML = '<p class="muted">\u8b80\u53d6\u5931\u6557\uff1a' + esc(error.message) + '</p>';
    }
  }
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-stock-code]");
    if (!trigger) return;
    event.preventDefault();
    load(trigger.dataset.stockCode);
  });
  drawer.querySelectorAll("[data-stock-close]").forEach((button) => button.addEventListener("click", close));
  backdrop?.addEventListener("click", close);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
})();


(() => {
  const roots = Array.from(document.querySelectorAll("[data-market-k-chart]"));
  if (!roots.length) return;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const number = (value) => Number(value || 0).toLocaleString("zh-TW", { maximumFractionDigits: 2 });
  const volumeLabel = (value) => Number(value || 0) >= 100000000 ? (Number(value) / 100000000).toFixed(1) + " 億股" : Math.round(Number(value || 0) / 10000).toLocaleString("zh-TW") + " 萬股";
  const turnoverLabel = (value) => Number(value || 0) >= 100000000 ? (Number(value) / 100000000).toFixed(1) + " 億元" : Math.round(Number(value || 0) / 10000).toLocaleString("zh-TW") + " 萬元";
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  roots.forEach((root) => {
    const candles = JSON.parse(root.dataset.candles || "[]");
    if (!candles.length) return;
    const initialVisible = Math.min(120, candles.length);
    const minimumVisible = Math.min(12, candles.length);
    let visible = initialVisible;
    const body = root.querySelector("[data-market-chart-body]");
    const current = root.querySelector("[data-market-current]");
    const rangeLabel = root.querySelector("[data-market-range]");
    const zoomIn = root.querySelector("[data-market-zoom-in]");
    const zoomOut = root.querySelector("[data-market-zoom-out]");
    const reset = root.querySelector("[data-market-zoom-reset]");
    const render = () => {
      const rows = candles.slice(-visible);
      const lows = rows.map((item) => Number(item.low));
      const highs = rows.map((item) => Number(item.high));
      const min = Math.min(...lows);
      const max = Math.max(...highs);
      const priceRange = max - min || 1;
      const step = 100 / rows.length;
      const bodyWidth = clamp(step * 0.55, 0.7, 3.2);
      const volumeWidth = clamp(step * 0.68, 0.7, 3.6);
      const maxVolume = Math.max(...rows.map((item) => Number(item.volume || 0)), 1);
      const y = (price) => 84 - ((Number(price) - min) / priceRange) * 76;
      const bars = rows.map((item, index) => {
        const x = step * index + step / 2;
        const top = Math.min(y(item.open), y(item.close));
        const height = Math.max(0.8, Math.abs(y(item.open) - y(item.close)));
        const color = Number(item.close) >= Number(item.open) ? "up" : "down";
        return '<line class="' + color + '" x1="' + x.toFixed(2) + '" y1="' + y(item.high).toFixed(2) + '" x2="' + x.toFixed(2) + '" y2="' + y(item.low).toFixed(2) + '"></line><rect class="' + color + '" x="' + (x - bodyWidth / 2).toFixed(2) + '" y="' + top.toFixed(2) + '" width="' + bodyWidth.toFixed(2) + '" height="' + height.toFixed(2) + '"></rect>';
      }).join("");
      const hits = rows.map((item, index) => {
        const tip = [item.label, "開 " + number(item.open), "高 " + number(item.high), "低 " + number(item.low), "收 " + number(item.close), "成交量 " + volumeLabel(item.volume), "成交金額 " + turnoverLabel(item.turnover)].join("\\n");
        return '<rect class="chart-hit" x="' + (step * index).toFixed(2) + '" y="0" width="' + step.toFixed(2) + '" height="88" data-chart-tip="' + esc(tip) + '"></rect>';
      }).join("");
      const volumeBars = rows.map((item, index) => {
        const x = step * index + step / 2;
        const height = Math.max(0.6, (Number(item.volume || 0) / maxVolume) * 22);
        const color = Number(item.close) >= Number(item.open) ? "up" : "down";
        return '<rect class="market-volume ' + color + '" x="' + (x - volumeWidth / 2).toFixed(2) + '" y="' + (24 - height).toFixed(2) + '" width="' + volumeWidth.toFixed(2) + '" height="' + height.toFixed(2) + '"></rect>';
      }).join("");
      const volumeHits = rows.map((item, index) => {
        const tip = [item.label, "開 " + number(item.open), "高 " + number(item.high), "低 " + number(item.low), "收 " + number(item.close), "成交量 " + volumeLabel(item.volume), "成交金額 " + turnoverLabel(item.turnover)].join("\\n");
        return '<rect class="chart-hit" x="' + (step * index).toFixed(2) + '" y="0" width="' + step.toFixed(2) + '" height="24" data-chart-tip="' + esc(tip) + '"></rect>';
      }).join("");
      const latest = rows[rows.length - 1];
      const first = rows[0];
      const scale = '<div class="chart-price-scale"><span>高 ' + number(max) + '</span><span>收 ' + number(latest.close) + '</span><span>低 ' + number(min) + '</span></div>';
      const volumeScale = '<div class="market-volume-scale"><span>' + volumeLabel(maxVolume) + '</span><span>0</span></div>';
      body.innerHTML = '<div class="chart-plot"><svg viewBox="0 0 100 88" preserveAspectRatio="none">' + bars + hits + '</svg>' + scale + '</div><div class="market-volume-header"><strong>上市成交量</strong><span>最新 ' + volumeLabel(latest.volume) + ' / 成交金額 ' + turnoverLabel(latest.turnover) + '</span></div><div class="market-volume-plot"><svg viewBox="0 0 100 24" preserveAspectRatio="none">' + volumeBars + volumeHits + '</svg>' + volumeScale + '</div><div class="chart-axis"><span>' + esc(first.label) + '</span><span data-market-window>' + rows.length + ' / ' + candles.length + ' 根</span><span>' + esc(latest.label) + '</span></div>';
      current.textContent = "目前指數 " + number(latest.close);
      rangeLabel.textContent = "高 " + number(max) + " / 低 " + number(min);
      zoomIn.disabled = visible <= minimumVisible;
      zoomOut.disabled = visible >= candles.length;
    };
    const changeVisible = (delta) => {
      const next = clamp(visible + delta, minimumVisible, candles.length);
      if (next === visible) return;
      visible = next;
      render();
    };
    zoomIn.addEventListener("click", () => changeVisible(-12));
    zoomOut.addEventListener("click", () => changeVisible(12));
    reset.addEventListener("click", () => {
      visible = initialVisible;
      render();
    });
    root.addEventListener("wheel", (event) => {
      event.preventDefault();
      changeVisible(event.deltaY > 0 ? 12 : -12);
    }, { passive: false });
    root.tabIndex = 0;
    root.addEventListener("keydown", (event) => {
      if (event.key === "+" || event.key === "=") changeVisible(-12);
      else if (event.key === "-" || event.key === "_") changeVisible(12);
      else if (event.key === "0") {
        visible = initialVisible;
        render();
      } else return;
      event.preventDefault();
    });
    render();
  });
})();


(() => {
  const tip = document.createElement("div");
  tip.className = "chart-tip";
  tip.hidden = true;
  document.body.appendChild(tip);
  let pinned = false;
  const place = (event) => {
    const pad = 14;
    const rect = tip.getBoundingClientRect();
    let left = event.clientX + pad;
    let top = event.clientY + pad;
    if (left + rect.width > window.innerWidth - 8) left = event.clientX - rect.width - pad;
    if (top + rect.height > window.innerHeight - 8) top = event.clientY - rect.height - pad;
    tip.style.left = Math.max(8, left) + "px";
    tip.style.top = Math.max(8, top) + "px";
  };
  const show = (target, event) => {
    tip.textContent = target.dataset.chartTip || "";
    tip.hidden = false;
    place(event);
  };
  const hide = () => {
    tip.hidden = true;
    pinned = false;
  };
  document.addEventListener("pointermove", (event) => {
    if (pinned) return;
    const target = event.target.closest?.(".chart-hit");
    if (target) show(target, event);
    else tip.hidden = true;
  });
  document.addEventListener("click", (event) => {
    const target = event.target.closest?.(".chart-hit");
    if (target) {
      event.preventDefault();
      pinned = true;
      show(target, event);
      return;
    }
    if (pinned) hide();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide();
  });
})();


(() => {
  window.initPagedLists = (scope = document) => {
  const roots = [
    ...(scope.matches?.("[data-paged-list]") ? [scope] : []),
    ...scope.querySelectorAll("[data-paged-list]")
  ];
  roots.forEach((root) => {
    if (root.dataset.pagerReady === "1") return;
    root.dataset.pagerReady = "1";
    const size = Number(root.dataset.pageSize || 10);
    const pagerId = root.dataset.pagerId;
    const controls = root.parentElement?.querySelector('[data-pager-controls="' + pagerId + '"]') || document.querySelector('[data-pager-controls="' + pagerId + '"]');
    const items = Array.from(root.children).filter((node) => node.matches("[data-page-item]"));
    if (!controls || items.length <= size) {
      if (controls) controls.hidden = true;
      return;
    }
    controls.hidden = false;
    let page = 0;
    const total = Math.ceil(items.length / size);
    const render = () => {
      items.forEach((item, index) => {
        item.hidden = index < page * size || index >= (page + 1) * size;
      });
      const from = page * size + 1;
      const to = Math.min(items.length, (page + 1) * size);
      controls.innerHTML = '<button type="button" data-prev aria-label="上一頁">上頁</button><span class="pager-meta"><strong>第 ' + (page + 1) + ' / ' + total + ' 頁</strong><small>顯示 ' + from + '-' + to + ' / ' + items.length + ' 筆</small></span><button type="button" data-next aria-label="下一頁">下頁</button>';
      controls.querySelector("[data-prev]").disabled = page === 0;
      controls.querySelector("[data-next]").disabled = page >= total - 1;
      controls.querySelector("[data-prev]").addEventListener("click", () => { page = Math.max(0, page - 1); render(); root.scrollIntoView({block:"nearest"}); });
      controls.querySelector("[data-next]").addEventListener("click", () => { page = Math.min(total - 1, page + 1); render(); root.scrollIntoView({block:"nearest"}); });
    };
    render();
  });
  };
  document.addEventListener("toggle", (event) => {
    if (event.target.open) window.initPagedLists(event.target);
  }, true);
  window.initPagedLists(document);
})();

`;

const LAZY_TREE_JS = String.raw`
(() => {
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const number = (value) => Number(value || 0).toLocaleString("zh-TW");
  const amount = (value) => {
    const numeric = Number(value || 0);
    const absolute = Math.abs(numeric);
    const sign = numeric > 0 ? "+" : numeric < 0 ? "-" : "";
    if (absolute >= 100000000) return sign + (absolute / 100000000).toFixed(1) + " 億";
    if (absolute >= 10000) return sign + Math.round(absolute / 10000).toLocaleString("zh-TW") + " 萬";
    return sign + Math.round(absolute).toLocaleString("zh-TW");
  };
  const peer = (stock, detail) => '<a class="peer" href="#stock-' + esc(stock.stock_code) + '" data-stock-code="' + esc(stock.stock_code) + '"><span><strong>' + esc(stock.stock_code + " " + stock.stock_name) + '</strong><small>' + esc(detail || stock.industry_name || stock.market_type || "") + '</small></span><b>' + esc(stock.status || stock.market_type || "") + '</b></a>';
  const renderStockTree = (data) => {
    const applications = data?.applications || [];
    if (!applications.length) return '<p class="muted">目前沒有可顯示的產業樹資料。</p>';
    return '<p class="lazy-tree-meta">摘要母體 ' + number(data?.totals?.stock_count) + ' 檔；展開後才建立同業節點。</p>' + applications.map((application, applicationIndex) =>
      '<details class="tree"' + (applicationIndex === 0 ? ' open' : '') + '><summary><span>' + esc(application.application) + '</span><small>' + number(application.industry_count) + ' 個產業 / ' + number(application.stock_count) + ' 檔</small></summary><div class="tree-body">' +
      (application.industries || []).map((industry) =>
        '<details class="branch"><summary><span>' + esc(industry.industry_name) + '</span><small>同業 ' + number(industry.stock_count) + ' 檔</small></summary><div class="tagline">' +
        (industry.theme_tags || []).slice(0, 6).map((tag) => '<b class="tag">' + esc(tag) + '</b>').join("") +
        '</div><div class="peer-grid">' + (industry.peers || []).map((stock) => peer(stock, (stock.tags || []).slice(0, 4).join(" / ") || industry.industry_name)).join("") + '</div></details>'
      ).join("") + '</div></details>'
    ).join("");
  };
  const renderThemeTree = (data) => {
    const categories = Array.isArray(data) ? data : [];
    if (!categories.length) return '<p class="muted">目前沒有符合公開門檻且日期有效的題材資料。</p>';
    return categories.map((category, categoryIndex) =>
      '<details class="tree"' + (categoryIndex === 0 ? ' open' : '') + '><summary><span>' + esc(category.category) + '</span><small>' + number(category.count) + ' 個已驗證題材</small></summary><div class="tree-body">' +
      (category.themes || []).map((theme) =>
        '<details class="branch"><summary><span>' + esc(theme.theme_name) + '</span><small>' + esc(theme.status || "觀察") + '</small></summary><p class="muted">' + esc(theme.reason || theme.description || "") + '</p><div class="theme-industries">' +
        (theme.industries || []).map((industry) =>
          '<details class="theme-industry"><summary><strong>' + esc(industry.industry_name) + '</strong><small>同業 ' + number(industry.stock_count) + ' 檔</small></summary><div class="peer-grid">' +
          (industry.stocks || []).map((stock) => peer(stock, [stock.role_type || theme.theme_name, stock.relation_strength || industry.industry_name].filter(Boolean).join(" / "))).join("") +
          '</div></details>'
        ).join("") + '</div></details>'
      ).join("") + '</div></details>'
    ).join("");
  };
  const renderInstitutionalTree = (data) => {
    const applications = data?.applications || [];
    if (!applications.length) return '<p class="muted">目前沒有法人產業樹資料。</p>';
    return '<p class="lazy-tree-meta">法人日期 ' + esc(data.trade_date || "-") + ' / 涵蓋 ' + number(data.stock_count) + ' 檔</p>' + applications.map((application, applicationIndex) =>
      '<details class="tree"' + (applicationIndex === 0 ? ' open' : '') + '><summary><span>' + esc(application.application) + '</span><small class="lazy-flow">淨額 ' + esc(amount(application.flow?.total_institutional_net_amount)) + '</small></summary><div class="tree-body">' +
      (application.industries || []).map((industry) =>
        '<details class="branch"><summary><span>' + esc(industry.industry_name) + '</span><small>淨額 ' + esc(amount(industry.flow?.total_institutional_net_amount)) + '</small></summary><div class="peer-grid">' +
        (industry.peers || []).map((stock) => peer(stock, '三大法人 ' + amount(stock.total_institutional_net_amount) + ' / ' + (stock.trade_date || "-"))).join("") +
        '</div></details>'
      ).join("") + '</div></details>'
    ).join("");
  };
  const renderers = { stock: renderStockTree, theme: renderThemeTree, institutional: renderInstitutionalTree };
  async function load(root) {
    if (!root || root.dataset.loaded === "1" || root.dataset.loading === "1") return;
    root.dataset.loading = "1";
    const button = root.querySelector("[data-lazy-load]");
    const status = root.querySelector("[data-lazy-status]");
    const content = root.querySelector("[data-lazy-content]");
    if (button) button.disabled = true;
    if (status) status.textContent = "載入中，只抓目前需要的摘要…";
    try {
      const started = Date.now();
      const response = await fetch(root.dataset.endpoint, { headers: { accept: "application/json" } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "API " + response.status);
      const render = renderers[root.dataset.mode];
      content.innerHTML = render ? render(payload.data) : "";
      root.dataset.loaded = "1";
      if (status) status.textContent = "已載入，耗時 " + (Date.now() - started).toLocaleString("zh-TW") + " ms。";
      if (button) button.hidden = true;
      window.initPagedLists?.(content);
    } catch (error) {
      content.innerHTML = '<p class="lazy-tree-error">' + esc(error.message || "載入失敗") + '</p>';
      if (status) status.textContent = "載入失敗，可稍後重試。";
      if (button) button.disabled = false;
    } finally {
      root.dataset.loading = "0";
    }
  }
  const roots = [...document.querySelectorAll("[data-lazy-tree]")];
  roots.forEach((root) => root.querySelector("[data-lazy-load]")?.addEventListener("click", () => load(root)));
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        load(entry.target);
      }
    }, { rootMargin: "220px 0px" });
    roots.forEach((root) => observer.observe(root));
  }
})();
`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

function jsonWithHeaders(data, headers = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...headers,
    },
  });
}

function responseWithHeaders(response, additions = {}) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(additions)) {
    if (value !== null && value !== undefined && value !== "") headers.set(name, String(value));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function cachedResponse(request, ctx, factory, seconds = 300) {
  const startedAt = Date.now();
  if (request.method !== "GET" || !globalThis.caches?.default) {
    const response = await factory();
    const existingTiming = response.headers.get("server-timing");
    return responseWithHeaders(response, {
      "x-cache": "BYPASS",
      "server-timing": [existingTiming, `edge;desc="BYPASS";dur=${Date.now() - startedAt}`].filter(Boolean).join(", "),
    });
  }
  const cache = globalThis.caches.default;
  const cacheUrl = new URL(request.url);
  cacheUrl.searchParams.set("__app_version", PERFORMANCE_ASSET_VERSION);
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) {
    return responseWithHeaders(cached, {
      "x-cache": "HIT",
      "server-timing": `edge;desc="HIT";dur=${Date.now() - startedAt}`,
    });
  }
  const response = await factory();
  if (response.ok) {
    const headers = new Headers(response.headers);
    if (!headers.has("cache-control")) headers.set("cache-control", `public, max-age=0, must-revalidate, s-maxage=${seconds}`);
    headers.set("x-cache", "MISS");
    headers.set("server-timing", [
      response.headers.get("server-timing"),
      `edge;desc="MISS";dur=${Date.now() - startedAt}`,
    ].filter(Boolean).join(", "));
    const cacheable = new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    const write = cache.put(cacheKey, cacheable.clone()).catch(() => null);
    if (ctx?.waitUntil) ctx.waitUntil(write);
    else await write;
    return cacheable;
  }
  return response;
}

function isAdminAuthorized(request, env) {
  const expected = String(env.ADMIN_SYNC_TOKEN || "");
  if (!expected) return false;
  const authorization = String(request.headers.get("authorization") || "");
  return authorization === `Bearer ${expected}`;
}

function clientRateLimitKey(request, tier) {
  const clientIp = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  return `${tier}:${clientIp}`;
}

async function enforceApiRateLimit(request, env, url) {
  if (!url.pathname.startsWith("/api/")) return null;
  if (url.pathname.startsWith("/api/admin/")) return null;
  const tiers = [["PUBLIC_API_RATE_LIMITER", "public"]];
  if (
    url.pathname === "/api/auth/google"
    || (url.pathname.startsWith("/api/watchlist") && request.method !== "GET")
  ) {
    tiers.push(["WRITE_API_RATE_LIMITER", "write"]);
  } else if (
    /\/(?:news|history)$/.test(url.pathname)
    || url.pathname.includes("/tree")
    || url.pathname === "/api/market/global"
    || url.pathname === "/api/market/dashboard"
    || url.pathname === "/api/classifications/quality"
  ) {
    tiers.push(["EXPENSIVE_API_RATE_LIMITER", "expensive"]);
  }
  for (const [bindingName, tier] of tiers) {
    const limiter = env[bindingName];
    if (!limiter?.limit) continue;
    const result = await limiter.limit({ key: clientRateLimitKey(request, tier) });
    if (!result?.success) {
      return jsonWithHeaders(
        { error: "rate_limited", message: "請求過於頻繁，請稍後再試。" },
        { "retry-after": "60", "cache-control": "no-store" },
        429,
      );
    }
  }
  return null;
}

function rejectOversizedRequest(request, url) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return null;
  const contentLength = Number(request.headers.get("content-length") || 0);
  const maximumBytes = url.pathname.startsWith("/api/admin/") ? 6_000_000 : 65_536;
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    return jsonWithHeaders(
      { error: "payload_too_large" },
      { "cache-control": "no-store" },
      413,
    );
  }
  return null;
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replaceAll(",", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function value(row, keys, fallback = null) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== "") return row[key];
  }
  return fallback;
}

function rocDateToIso(input) {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, "");
  if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  if (digits.length === 7) {
    const year = Number(digits.slice(0, 3)) + 1911;
    return `${year}-${digits.slice(3, 5)}-${digits.slice(5, 7)}`;
  }
  if (digits.length === 6) {
    const year = Number(digits.slice(0, 2)) + 1911;
    return `${year}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
  }
  return null;
}

function revenuePeriod(input) {
  const raw = String(input || "").trim();
  const rocSlash = raw.match(/^(\d{3})\D+(\d{1,2})$/);
  if (rocSlash) return { year: Number(rocSlash[1]) + 1911, month: Number(rocSlash[2]) };
  const gregorianSlash = raw.match(/^(\d{4})\D+(\d{1,2})$/);
  if (gregorianSlash) return { year: Number(gregorianSlash[1]), month: Number(gregorianSlash[2]) };
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 6) return { year: Number(digits.slice(0, 4)), month: Number(digits.slice(4, 6)) };
  if (digits.length >= 5) return { year: Number(digits.slice(0, 3)) + 1911, month: Number(digits.slice(3, 5)) };
  return { year: null, month: null };
}

function isCommonStockCode(code) {
  return /^\d{4}$/.test(code || "");
}

async function fetchOfficialResponse(url, options = {}, maxRedirects = 2) {
  const original = new URL(url);
  let current = original;
  for (let attempt = 0; attempt <= maxRedirects; attempt++) {
    const response = await fetch(current.toString(), { ...options, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) throw new Error(`Official API redirect missing location: ${current}`);
    const next = new URL(location, current);
    if (next.hostname !== original.hostname || /\/errors?(?:\/|$)/i.test(next.pathname)) {
      throw new Error(`Official API redirected to unavailable page: ${url}`);
    }
    current = next;
  }
  throw new Error(`Official API exceeded redirect limit: ${url}`);
}

async function fetchOfficialJson(url) {
  const response = await fetchOfficialResponse(url, {
    headers: {
      accept: "application/json",
      "accept-language": "zh-TW,zh;q=0.9,en;q=0.7",
      referer: "https://www.tpex.org.tw/openapi/",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
    },
  });
  if (!response.ok) throw new Error(`Official API failed ${response.status}: ${url}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function fetchOfficialText(url) {
  const response = await fetchOfficialResponse(url, {
    headers: {
      accept: "text/csv,text/plain,*/*",
      "accept-language": "zh-TW,zh;q=0.9,en;q=0.7",
      referer: "https://mopsov.twse.com.tw/mops/web/index",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
    },
  });
  if (!response.ok) throw new Error(`Official text failed ${response.status}: ${url}`);
  return response.text();
}

async function fetchOfficialJsonDocument(url) {
  const response = await fetchOfficialResponse(url, {
    headers: {
      accept: "application/json,text/plain,*/*",
      "accept-language": "zh-TW,zh;q=0.9,en;q=0.7",
      referer: "https://www.tpex.org.tw/www/zh-tw/afterTrading/otc",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
    },
  });
  if (!response.ok) throw new Error(`Official JSON document failed ${response.status}: ${url}`);
  return response.json();
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      cell += '"';
      index++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function parseCsv(text) {
  const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function latestMopsRevenuePeriod() {
  const taipeiNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
  let year = taipeiNow.getUTCFullYear();
  let month = taipeiNow.getUTCMonth();
  if (month === 0) {
    year -= 1;
    month = 12;
  }
  return { rocYear: year - 1911, month };
}

function requiredMopsRevenuePeriod(date = new Date()) {
  const taipeiNow = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const monthsBack = taipeiNow.getUTCDate() <= 10 ? 2 : 1;
  const target = new Date(Date.UTC(
    taipeiNow.getUTCFullYear(),
    taipeiNow.getUTCMonth() - monthsBack,
    1,
  ));
  return {
    year: target.getUTCFullYear(),
    rocYear: target.getUTCFullYear() - 1911,
    month: target.getUTCMonth() + 1,
  };
}

function recentMopsRevenuePeriods(monthCount = 24) {
  const latest = latestMopsRevenuePeriod();
  let year = latest.rocYear + 1911;
  let month = latest.month;
  const periods = [];
  for (let index = 0; index < monthCount; index++) {
    periods.push({ year, rocYear: year - 1911, month });
    month -= 1;
    if (month === 0) {
      year -= 1;
      month = 12;
    }
  }
  return periods;
}

function mopsRevenueCsvUrl(marketPath, period = latestMopsRevenuePeriod()) {
  const { rocYear, month } = period;
  return `https://mopsov.twse.com.tw/nas/t21/${marketPath}/t21sc03_${rocYear}_${month}.csv`;
}

function recentYearMonthPeriods(monthCount = 12) {
  const taipeiNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
  let year = taipeiNow.getUTCFullYear();
  let month = taipeiNow.getUTCMonth() + 1;
  const periods = [];
  for (let index = 0; index < monthCount; index++) {
    periods.push({ year, month });
    month -= 1;
    if (month === 0) {
      year -= 1;
      month = 12;
    }
  }
  return periods;
}

function taipeiIsoDate(date = new Date()) {
  const taipeiDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = taipeiDate.getUTCFullYear();
  const month = String(taipeiDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(taipeiDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ymdDate(date) {
  const taipeiDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = taipeiDate.getUTCFullYear();
  const month = String(taipeiDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(taipeiDate.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function ymdToIso(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function recentYmdDates(days = 7) {
  const dates = [];
  for (let offset = 0; offset < days; offset++) dates.push(ymdDate(new Date(Date.now() - offset * 24 * 60 * 60 * 1000)));
  return dates;
}

function rocSlashDate(date) {
  const taipeiDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = taipeiDate.getUTCFullYear() - 1911;
  const month = String(taipeiDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(taipeiDate.getUTCDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function recentRocSlashDates(days = 7) {
  const dates = [];
  for (let offset = 0; offset < days; offset++) dates.push(rocSlashDate(new Date(Date.now() - offset * 24 * 60 * 60 * 1000)));
  return dates;
}

function normalizeFieldName(value) {
  return String(value || "").replace(/<[^>]+>/g, "").replace(/\s+/g, "");
}

function normalizeTwseStockBasic(row) {
  const stockCode = value(row, ["公司代號", "股票代號", "有價證券代號", "Code"]);
  if (!isCommonStockCode(stockCode)) return null;
  const officialIndustry = normalizeOfficialIndustry({
    stock_code: stockCode,
    stock_name: value(row, ["公司簡稱", "公司名稱", "有價證券名稱", "Name"], stockCode),
    industry_code: value(row, ["產業別", "SecuritiesIndustryCode", "Industry"], "UNKNOWN"),
  });
  return {
    stock_code: stockCode,
    stock_name: value(row, ["公司簡稱", "公司名稱", "有價證券名稱", "Name"], stockCode),
    market_type: "上市",
    industry_code: officialIndustry.industry_code,
    industry_name: officialIndustry.industry_name,
    instrument_type: officialIndustry.instrument_type,
    company_type: "上市股票",
    listing_date: rocDateToIso(value(row, ["上市日期", "DateOfListing"])),
    established_date: rocDateToIso(value(row, ["成立日期", "DateOfIncorporation"])),
    capital: toNumber(value(row, ["實收資本額", "Paidin.Capital.NTDollars"])),
    chairman: value(row, ["董事長", "Chairman"]),
    general_manager: value(row, ["總經理", "GeneralManager"]),
    spokesperson: value(row, ["發言人", "Spokesman"]),
    company_address: value(row, ["住址", "Address"]),
    company_url: value(row, ["網址", "WebAddress"]),
    source: "TWSE OpenAPI",
    source_url: SOURCE_TWSE_STOCK_BASIC,
  };
}

function normalizeTpexStockBasic(row, marketType, sourceUrl) {
  const stockCode = value(row, ["SecuritiesCompanyCode", "公司代號", "股票代號"]);
  if (!isCommonStockCode(stockCode)) return null;
  const officialIndustry = normalizeOfficialIndustry({
    stock_code: stockCode,
    stock_name: value(row, ["CompanyAbbreviation", "CompanyName", "公司簡稱", "公司名稱"], stockCode),
    industry_code: value(row, ["SecuritiesIndustryCode", "產業別"], "UNKNOWN"),
    market_type: marketType,
  });
  return {
    stock_code: stockCode,
    stock_name: value(row, ["CompanyAbbreviation", "CompanyName", "公司簡稱", "公司名稱"], stockCode),
    market_type: marketType,
    industry_code: officialIndustry.industry_code,
    industry_name: officialIndustry.industry_name,
    instrument_type: officialIndustry.instrument_type,
    company_type: `${marketType}股票`,
    listing_date: rocDateToIso(value(row, ["DateOfListing", "掛牌日期"])),
    established_date: rocDateToIso(value(row, ["DateOfIncorporation", "成立日期"])),
    capital: toNumber(value(row, ["Paidin.Capital.NTDollars", "實收資本額"])),
    chairman: value(row, ["Chairman", "董事長"]),
    general_manager: value(row, ["GeneralManager", "總經理"]),
    spokesperson: value(row, ["Spokesman", "發言人"]),
    company_address: value(row, ["Address", "住址"]),
    company_url: value(row, ["WebAddress", "網址"]),
    source: "TPEx OpenAPI",
    source_url: sourceUrl,
  };
}

function normalizeTwseDailyPrice(row) {
  const stockCode = value(row, ["Code", "股票代號", "有價證券代號"]);
  if (!isCommonStockCode(stockCode)) return null;
  const close = toNumber(value(row, ["ClosingPrice", "收盤價"]));
  const change = toNumber(value(row, ["Change", "漲跌價差"]));
  const previousClose = close !== null && change !== null ? close - change : null;
  return {
    stock_code: stockCode,
    stock_name: value(row, ["Name", "股票名稱", "有價證券名稱"], stockCode),
    market_type: "上市",
    trade_date: rocDateToIso(value(row, ["Date", "日期"])),
    open_price: toNumber(value(row, ["OpeningPrice", "開盤價"])),
    high_price: toNumber(value(row, ["HighestPrice", "最高價"])),
    low_price: toNumber(value(row, ["LowestPrice", "最低價"])),
    close_price: close,
    change_price: change,
    change_percent: previousClose ? (change / previousClose) * 100 : null,
    volume: toNumber(value(row, ["TradeVolume", "成交股數"])),
    turnover_value: toNumber(value(row, ["TradeValue", "成交金額"])),
    transaction_count: toNumber(value(row, ["Transaction", "成交筆數"])),
    source: "TWSE OpenAPI",
    source_url: SOURCE_TWSE_DAILY_PRICE,
  };
}

function normalizeTwseMiIndexDailyRow(cells, tradeDate, sourceUrl) {
  const stockCode = normalizeFieldName(cells?.[0]);
  if (!isCommonStockCode(stockCode)) return null;
  const close = toNumber(cells?.[8]);
  const rawChange = Math.abs(Number(toNumber(cells?.[10]) || 0));
  const sign = normalizeFieldName(cells?.[9]);
  const change = sign.includes("-") || sign.includes("－") ? -rawChange : rawChange;
  const previousClose = close !== null ? close - change : null;
  return {
    stock_code: stockCode,
    stock_name: normalizeFieldName(cells?.[1]) || stockCode,
    market_type: "上市",
    trade_date: tradeDate,
    open_price: toNumber(cells?.[5]),
    high_price: toNumber(cells?.[6]),
    low_price: toNumber(cells?.[7]),
    close_price: close,
    change_price: change,
    change_percent: previousClose ? (change / previousClose) * 100 : null,
    volume: toNumber(cells?.[2]),
    turnover_value: toNumber(cells?.[4]),
    transaction_count: toNumber(cells?.[3]),
    source: "TWSE MI_INDEX",
    source_url: sourceUrl,
  };
}

async function fetchTwseDailyRows() {
  const openApiRows = (await fetchOfficialJson(SOURCE_TWSE_DAILY_PRICE))
    .map(normalizeTwseDailyPrice)
    .filter((row) => row && row.trade_date);
  const openApiDate = openApiRows.reduce(
    (latest, row) => (!latest || row.trade_date > latest ? row.trade_date : latest),
    null,
  );
  for (const date of recentYmdDates(5)) {
    const sourceUrl = `${SOURCE_TWSE_MI_INDEX}?date=${date}&type=ALLBUT0999&response=json`;
    try {
      const doc = await fetchOfficialJsonDocument(sourceUrl);
      const tradeDate = ymdToIso(doc?.date || date);
      if (!tradeDate || (openApiDate && tradeDate <= openApiDate)) continue;
      const table = (doc?.tables || []).find((item) => {
        const fields = (item?.fields || []).map(normalizeFieldName);
        return fields.includes("證券代號") && fields.includes("收盤價") && Array.isArray(item?.data);
      });
      const rows = (table?.data || [])
        .map((cells) => normalizeTwseMiIndexDailyRow(cells, tradeDate, sourceUrl))
        .filter(Boolean);
      if (rows.length) return rows;
    } catch (_) {
      // Continue to the next recent date, then fall back to the OpenAPI snapshot.
    }
  }
  return openApiRows;
}

function normalizeTwseDailyValuation(row) {
  const stockCode = value(row, ["Code", "證券代號"]);
  if (!isCommonStockCode(stockCode)) return null;
  return {
    stock_code: stockCode,
    stock_name: value(row, ["Name", "證券名稱"], stockCode),
    market_type: "上市",
    trade_date: rocDateToIso(value(row, ["Date", "日期"])),
    pe_ratio: toNumber(value(row, ["PEratio", "本益比"])),
    dividend_yield: toNumber(value(row, ["DividendYield", "殖利率(%)"])),
    pb_ratio: toNumber(value(row, ["PBratio", "股價淨值比"])),
    fiscal_period: value(row, ["FiscalPeriod", "財報年/季"]),
    source: "TWSE BWIBBU_ALL",
    source_url: SOURCE_TWSE_DAILY_VALUATION,
  };
}

function normalizeTpexOpenApiValuation(row) {
  const stockCode = value(row, ["SecuritiesCompanyCode", "股票代號"]);
  if (!isCommonStockCode(stockCode)) return null;
  return {
    stock_code: stockCode,
    stock_name: value(row, ["CompanyName", "公司名稱"], stockCode),
    market_type: "上櫃",
    trade_date: rocDateToIso(value(row, ["Date", "日期"])),
    pe_ratio: toNumber(value(row, ["PriceEarningRatio", "本益比"])),
    dividend_yield: toNumber(value(row, ["YieldRatio", "殖利率(%)"])),
    pb_ratio: toNumber(value(row, ["PriceBookRatio", "股價淨值比"])),
    fiscal_period: null,
    source: "TPEx OpenAPI P/E",
    source_url: SOURCE_TPEX_OTC_DAILY_VALUATION,
  };
}

async function fetchOfficialValuationRows(db) {
  const rows = [];
  const errors = [];
  try {
    const twseRows = (await fetchOfficialJson(SOURCE_TWSE_DAILY_VALUATION))
      .map(normalizeTwseDailyValuation)
      .filter((row) => row && row.trade_date);
    rows.push(...twseRows);
  } catch (error) {
    errors.push({ market_type: "上市", error: String(error?.message || error) });
  }
  try {
    const tpexRows = (await fetchOfficialJson(SOURCE_TPEX_OTC_DAILY_VALUATION))
      .map(normalizeTpexOpenApiValuation)
      .filter((row) => row && row.trade_date);
    rows.push(...tpexRows);
  } catch (error) {
    errors.push({ market_type: "上櫃", error: String(error?.message || error) });
  }
  return { rows, errors };
}

function twseStockDayHistoryUrl(stockCode, year, month) {
  const date = `${year}${String(month).padStart(2, "0")}01`;
  return `${SOURCE_TWSE_STOCK_DAY_HISTORY}?response=json&date=${date}&stockNo=${encodeURIComponent(stockCode)}`;
}

function normalizeTwseStockDayHistoryRow(cells, stockCode, stockName, sourceUrl) {
  const close = toNumber(cells?.[6]);
  const change = toNumber(cells?.[7]);
  const previousClose = close !== null && change !== null ? close - change : null;
  return {
    stock_code: stockCode,
    stock_name: stockName || stockCode,
    market_type: "上市",
    trade_date: rocDateToIso(cells?.[0]),
    volume: toNumber(cells?.[1]),
    turnover_value: toNumber(cells?.[2]),
    open_price: toNumber(cells?.[3]),
    high_price: toNumber(cells?.[4]),
    low_price: toNumber(cells?.[5]),
    close_price: close,
    change_price: change,
    change_percent: previousClose ? (change / previousClose) * 100 : null,
    transaction_count: toNumber(cells?.[8]),
    source: "TWSE STOCK_DAY",
    source_url: sourceUrl,
  };
}

function normalizeTpexOtcDailyPrice(row) {
  const stockCode = value(row, ["SecuritiesCompanyCode", "股票代號"]);
  if (!isCommonStockCode(stockCode)) return null;
  const close = toNumber(value(row, ["Close", "收盤"]));
  const change = toNumber(value(row, ["Change", "漲跌"]));
  const previousClose = close !== null && change !== null ? close - change : null;
  return {
    stock_code: stockCode,
    stock_name: value(row, ["CompanyName", "證券名稱"], stockCode),
    market_type: "上櫃",
    trade_date: rocDateToIso(value(row, ["Date", "日期"])),
    open_price: toNumber(value(row, ["Open", "開盤"])),
    high_price: toNumber(value(row, ["High", "最高"])),
    low_price: toNumber(value(row, ["Low", "最低"])),
    close_price: close,
    change_price: change,
    change_percent: previousClose ? (change / previousClose) * 100 : null,
    volume: toNumber(value(row, ["TradingShares", "成交股數"])),
    turnover_value: toNumber(value(row, ["TransactionAmount", "成交金額"])),
    transaction_count: toNumber(value(row, ["TransactionNumber", "成交筆數"])),
    source: "TPEx OpenAPI",
    source_url: SOURCE_TPEX_OTC_DAILY_PRICE,
  };
}

async function fetchTpexOtcDailyRows() {
  for (const date of recentRocSlashDates(7)) {
    const url = `${SOURCE_TPEX_OTC_AFTER_TRADING}?date=${encodeURIComponent(date)}&type=EW&response=json`;
    const doc = await fetchOfficialJsonDocument(url);
    const table = doc?.tables?.[0];
    if (!table || !Array.isArray(table.data) || !table.data.length) continue;
    const fields = table.fields.map(normalizeFieldName);
    const tradeDate = rocDateToIso(table.date || date);
    return table.data.map((cells) => {
      const row = Object.fromEntries(fields.map((field, index) => [field, cells[index] ?? ""]));
      const close = toNumber(row["收盤"]);
      const change = toNumber(row["漲跌"]);
      const previousClose = close !== null && change !== null ? close - change : null;
      return {
        stock_code: row["代號"],
        stock_name: row["名稱"],
        market_type: "上櫃",
        trade_date: tradeDate,
        open_price: toNumber(row["開盤"]),
        high_price: toNumber(row["最高"]),
        low_price: toNumber(row["最低"]),
        close_price: close,
        change_price: change,
        change_percent: previousClose ? (change / previousClose) * 100 : null,
        volume: toNumber(row["成交股數"]),
        turnover_value: toNumber(row["成交金額(元)"]),
        transaction_count: toNumber(row["成交筆數"]),
        source: "TPEx JSON",
        source_url: url,
      };
    }).filter((row) => isCommonStockCode(row.stock_code) && row.trade_date);
  }
  return [];
}

async function fetchTwseForeignHoldingMap(date) {
  const url = `${SOURCE_TWSE_FOREIGN_HOLDING}?date=${date}&selectType=ALLBUT0999&response=json`;
  const doc = await fetchOfficialJsonDocument(url);
  const fields = (doc?.fields || []).map(normalizeFieldName);
  const rows = Array.isArray(doc?.data) ? doc.data : [];
  const tradeDate = ymdToIso(date);
  const map = new Map();
  if (!fields.length || !rows.length || !tradeDate) return map;
  rows.map((cells) => normalizeForeignHolding(objectFromTableRow(fields, cells), tradeDate, url))
    .filter(Boolean)
    .forEach((row) => map.set(row.stock_code, row));
  return map;
}

async function fetchTwseInstitutionalBatch(options = {}) {
  const cursor = clampInt(options.cursor, 0, 0, 60);
  const tradingDays = clampInt(options.tradingDays, 1, 1, 10);
  const lookbackDays = clampInt(options.lookbackDays, 21, 1, 60);
  const dates = recentYmdDates(lookbackDays);
  const rows = [];
  const fetched = [];
  const errors = [];
  let nextCursor = cursor;

  for (let index = cursor; index < dates.length && fetched.length < tradingDays; index++) {
    const date = dates[index];
    const url = `${SOURCE_TWSE_INSTITUTIONAL_T86}?date=${date}&selectType=ALLBUT0999&response=json`;
    nextCursor = index + 1;
    try {
      const doc = await fetchOfficialJsonDocument(url);
      const fields = (doc?.fields || []).map(normalizeFieldName);
      const rawRows = Array.isArray(doc?.data) ? doc.data : [];
      const tradeDate = ymdToIso(date);
      if (!fields.length || !rawRows.length || !tradeDate || doc?.stat === "很抱歉，沒有符合條件的資料!") continue;
      let holdings = new Map();
      try {
        holdings = await fetchTwseForeignHoldingMap(date);
      } catch (error) {
        errors.push({ date, source_url: SOURCE_TWSE_FOREIGN_HOLDING, error: String(error && error.message ? error.message : error) });
      }
      const normalized = rawRows
        .map((cells) => normalizeInstitutionalFlow(objectFromTableRow(fields, cells), "上市", tradeDate, "TWSE T86", url))
        .filter(Boolean)
        .map((row) => {
          const holding = holdings.get(row.stock_code);
          return holding ? {
            ...row,
            issued_shares: holding.issued_shares,
            foreign_investor_holding_shares: holding.foreign_investor_holding_shares,
            foreign_investor_holding_percent: holding.foreign_investor_holding_percent,
          } : row;
        });
      rows.push(...normalized);
      fetched.push({ date: tradeDate, rows: normalized.length, source_url: url, holding_rows: holdings.size });
    } catch (error) {
      errors.push({ date, source_url: url, error: String(error && error.message ? error.message : error) });
    }
  }
  return { rows, fetched, errors, cursor, next_cursor: nextCursor, done: nextCursor >= dates.length };
}

async function fetchTwseInstitutionalRows() {
  return (await fetchTwseInstitutionalBatch({ tradingDays: 1, lookbackDays: 10 })).rows;
}

async function fetchTpexInstitutionalRows() {
  for (const date of recentRocSlashDates(7)) {
    const url = `${SOURCE_TPEX_INSTITUTIONAL_DAILY}?date=${encodeURIComponent(date)}&type=Daily&response=json`;
    const doc = await fetchOfficialJsonDocument(url);
    const table = doc?.tables?.[0] || doc?.tables?.find?.((item) => Array.isArray(item?.data) && item.data.length);
    const rows = Array.isArray(table?.data) ? table.data : [];
    const tradeDate = rocDateToIso(table?.date || date);
    if (!rows.length || !tradeDate) continue;
    return rows
      .map((cells) => normalizeTpexInstitutionalCells(cells, {
        tradeDate,
        source: "TPEx institutional dailyTrade",
        sourceUrl: url,
      }))
      .filter(Boolean);
  }
  return [];
}

function normalizeTpexEmergingDailyPrice(row) {
  const stockCode = value(row, ["SecuritiesCompanyCode", "股票代號"]);
  if (!isCommonStockCode(stockCode)) return null;
  return {
    stock_code: stockCode,
    stock_name: value(row, ["CompanyName", "證券名稱"], stockCode),
    market_type: "興櫃",
    trade_date: rocDateToIso(value(row, ["Date", "日期"])),
    open_price: null,
    high_price: toNumber(value(row, ["Highest", "最高"])),
    low_price: toNumber(value(row, ["Lowest", "最低"])),
    close_price: toNumber(value(row, ["LatestPrice", "Average", "最新成交價", "均價"])),
    change_price: null,
    change_percent: null,
    volume: toNumber(value(row, ["TradingVolume", "成交量"])),
    turnover_value: toNumber(value(row, ["TransactionAmount", "成交金額"])),
    transaction_count: null,
    source: "TPEx OpenAPI",
    source_url: SOURCE_TPEX_EMERGING_DAILY_PRICE,
  };
}

function normalizeMonthlyRevenue(row, marketType, source, sourceUrl) {
  const stockCode = value(row, ["公司代號", "SecuritiesCompanyCode", "CompanyCode", "Code", "股票代號"]);
  if (!isCommonStockCode(stockCode)) return null;
  const period = revenuePeriod(value(row, ["資料年月", "YearMonth", "RevenueYearMonth", "年月"]));
  if (!period.year || !period.month) return null;
  return {
    stock_code: stockCode,
    stock_name: value(row, ["公司名稱", "公司簡稱", "CompanyName", "CompanyAbbreviation", "Name"], stockCode),
    market_type: marketType,
    revenue_year: period.year,
    revenue_month: period.month,
    report_date: rocDateToIso(value(row, ["出表日期", "ReportDate", "Date"])),
    monthly_revenue: toNumber(value(row, ["營業收入-當月營收", "當月營收", "MonthlyRevenue", "CurrentMonthRevenue"])),
    last_month_revenue: toNumber(value(row, ["營業收入-上月營收", "上月營收", "LastMonthRevenue", "PreviousMonthRevenue"])),
    last_year_revenue: toNumber(value(row, ["營業收入-去年當月營收", "去年當月營收", "LastYearRevenue", "PreviousYearMonthRevenue"])),
    mom_growth_percent: toNumber(value(row, ["營業收入-上月比較增減(%)", "上月比較增減(%)", "MoM", "MoMGrowthPercent"])),
    yoy_growth_percent: toNumber(value(row, ["營業收入-去年同月增減(%)", "去年同月增減(%)", "YoY", "YoYGrowthPercent"])),
    cumulative_revenue: toNumber(value(row, ["累計營業收入-當月累計營收", "當月累計營收", "CumulativeRevenue"])),
    cumulative_yoy_growth_percent: toNumber(value(row, ["累計營業收入-前期比較增減(%)", "累計去年同月增減(%)", "CumulativeYoYGrowthPercent"])),
    note: value(row, ["備註", "Note", "Remark"]),
    source,
    source_url: sourceUrl,
  };
}

function objectFromTableRow(fields, cells) {
  return Object.fromEntries(fields.map((field, index) => [field, cells?.[index] ?? ""]));
}

function fuzzyValue(row, exactKeys, includeParts = [], excludeParts = []) {
  const exact = value(row, exactKeys);
  if (exact !== null && exact !== undefined && exact !== "") return exact;
  const entries = Object.entries(row || {});
  const found = entries.find(([key]) => {
    const normalized = normalizeFieldName(key);
    return includeParts.every((part) => normalized.includes(part)) && excludeParts.every((part) => !normalized.includes(part));
  });
  return found ? found[1] : null;
}

function sharesToLots(input) {
  const shares = toNumber(input);
  return shares === null ? 0 : shares / 1000;
}

function normalizeInstitutionalFlow(row, marketType, tradeDate, source, sourceUrl) {
  const stockCode = value(row, ["證券代號", "代號", "股票代號", "SecuritiesCompanyCode", "Code"]);
  if (!isCommonStockCode(stockCode)) return null;
  const foreign = sharesToLots(fuzzyValue(
    row,
    ["外陸資買賣超股數(不含外資自營商)", "外資及陸資買賣超股數(不含外資自營商)", "外資及陸資買賣超股數", "ForeignInvestorNetBuySell"],
    ["外", "買賣超"],
    ["外資自營商"],
  ));
  const trust = sharesToLots(fuzzyValue(row, ["投信買賣超股數", "InvestmentTrustNetBuySell"], ["投信", "買賣超"]));
  const dealer = sharesToLots(fuzzyValue(row, ["自營商買賣超股數", "DealerNetBuySell"], ["自營商", "買賣超"], ["外資自營商"]));
  const total = sharesToLots(fuzzyValue(row, ["三大法人買賣超股數", "TotalInstitutionalNetBuySell"], ["三大法人", "買賣超"]));
  return {
    stock_code: stockCode,
    stock_name: value(row, ["證券名稱", "名稱", "股票名稱", "CompanyName", "Name"], stockCode),
    market_type: marketType,
    trade_date: tradeDate,
    foreign_investor_net_buy: foreign,
    investment_trust_net_buy: trust,
    dealer_net_buy: dealer,
    total_institutional_net_buy: total || foreign + trust + dealer,
    foreign_investor_holding_shares: null,
    foreign_investor_holding_percent: null,
    source,
    source_url: sourceUrl,
  };
}

function normalizeForeignHolding(row, tradeDate, sourceUrl) {
  const stockCode = value(row, ["證券代號", "股票代號", "Code"]);
  if (!isCommonStockCode(stockCode)) return null;
  return {
    stock_code: stockCode,
    stock_name: value(row, ["證券名稱", "股票名稱", "Name"], stockCode),
    market_type: "上市",
    trade_date: tradeDate,
    issued_shares: toNumber(value(row, ["發行股數"])),
    foreign_investor_holding_shares: toNumber(value(row, ["全體外資及陸資持有股數"])),
    foreign_investor_holding_percent: toNumber(value(row, ["全體外資及陸資持股比率"])),
    source: "TWSE MI_QFIIS",
    source_url: sourceUrl,
  };
}

function taiexHistoryUrl(year, month) {
  return `${SOURCE_TWSE_TAIEX_HISTORY}?date=${year}${String(month).padStart(2, "0")}01&response=json`;
}

function normalizeTaiexHistoryRow(cells, sourceUrl) {
  const tradeDate = rocDateToIso(cells?.[0]);
  if (!tradeDate) return null;
  return {
    index_code: "TAIEX",
    index_name: "\u52a0\u6b0a\u6307\u6578",
    trade_date: tradeDate,
    open_index: toNumber(cells?.[1]),
    high_index: toNumber(cells?.[2]),
    low_index: toNumber(cells?.[3]),
    close_index: toNumber(cells?.[4]),
    source: "TWSE MI_5MINS_HIST",
    source_url: sourceUrl,
  };
}

function normalizeTwseExDividend(cells, sourceUrl) {
  const stockCode = String(cells?.[1] || "").trim();
  if (!isCommonStockCode(stockCode)) return null;
  const exDate = rocDateToIso(cells?.[0]);
  if (!exDate) return null;
  return {
    stock_code: stockCode,
    stock_name: String(cells?.[2] || stockCode).trim(),
    market_type: "\u4e0a\u5e02",
    ex_dividend_date: exDate,
    before_close: toNumber(cells?.[3]),
    reference_price: toNumber(cells?.[4]),
    dividend_value: toNumber(cells?.[5]),
    dividend_type: String(cells?.[6] || "\u9664\u6b0a\u606f").trim(),
    source: "TWSE TWT49U",
    source_url: sourceUrl,
  };
}

const THEME_STATUS_ALIASES = {
  "資金已明顯進入": "主流",
  "觀察中": "觀察",
  "低基期剛轉強": "轉強",
};
const THEME_STATUSES = ["主流", "轉強", "過熱", "退燒", "觀察"];
const ROLE_TYPES = ["上游", "中游", "下游", "設備", "材料", "零組件", "代工", "系統整合", "品牌", "通路"];

function normalizeThemeStatus(value) {
  const status = THEME_STATUS_ALIASES[String(value || "").trim()] || String(value || "").trim();
  return THEME_STATUSES.includes(status) ? status : "觀察";
}

function normalizeRoleType(value) {
  const role = String(value || "").trim();
  if (ROLE_TYPES.includes(role)) return role;
  return ROLE_TYPES.find((allowed) => role.includes(allowed)) || "中游";
}

function n(value) {
  return Number(value || 0).toLocaleString("zh-TW");
}

function stockPopularity(item) {
  return Number(item?.turnover_value || 0)
    + Math.abs(Number(item?.institutional_net_amount || item?.total_institutional_net_buy || 0)) * 250
    + Number(item?.total_score || 0) * 1000000
    + Math.max(0, Number(item?.yoy_growth_percent || 0)) * 100000;
}

function flowAmount(rowOrFlow) {
  const close = Number(rowOrFlow?.close_price || 0);
  const shares = Number(rowOrFlow?.total_institutional_net_buy || 0) * 1000;
  return close ? shares * close : Number(rowOrFlow?.institutional_net_amount || 0);
}

function flowMoneyLabel(value) {
  const amount = Number(value || 0);
  if (!amount) return "法人資金持平";
  return `法人資金${flowDirectionMoney(value)}`;
}

function flowDirectionMoney(value) {
  const amount = Number(value || 0);
  if (!amount) return "持平";
  const abs = Math.abs(amount);
  const unit = abs >= 100000000 ? `${(abs / 100000000).toFixed(1)} 億元` : `${Math.round(abs / 10000).toLocaleString("zh-TW")} 萬元`;
  return amount > 0 ? `流入 ${unit}` : `流出 ${unit}`;
}

function flowMoneyBreakdown(flow) {
  return `外資${flowDirectionMoney(flow?.foreign_investor_net_amount)} / 投信${flowDirectionMoney(flow?.investment_trust_net_amount)} / 自營商${flowDirectionMoney(flow?.dealer_net_amount)}`;
}

function flowLabel(value) {
  return flowMoneyLabel(value);
}

function flowBreakdown(flow) {
  return flowMoneyBreakdown(flow);
}

function flowTrendText(trend) {
  if (!trend) return "";
  const change = Number(trend.change_amount || 0);
  if (trend.status === "持平") return "較前日資金持平";
  const abs = Math.abs(change);
  const unit = abs >= 100000000 ? `${(abs / 100000000).toFixed(1)} 億元` : `${Math.round(abs / 10000).toLocaleString("zh-TW")} 萬元`;
  return `較前日${change > 0 ? "增加" : "減少"} ${unit}`;
}

function flowTrendClass(trend) {
  if (!trend || trend.status === "持平") return "trend-flat";
  return Number(trend.change_amount || 0) > 0 ? "trend-growth" : "trend-decline";
}

function uniqueLabels(items) {
  return [...new Set(items.filter((item) => item !== null && item !== undefined && item !== ""))];
}

function escHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  return Object.fromEntries(header.split(";").map((part) => {
    const [name, ...rest] = part.trim().split("=");
    return [name, decodeURIComponent(rest.join("=") || "")];
  }).filter(([name]) => name));
}

function base64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function sessionCookie(token, maxAge = 60 * 60 * 24 * 14) {
  return `twstock_watchlist=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function expiredSessionCookie() {
  return "twstock_watchlist=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax";
}

function randomSessionToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function sessionTokenHash(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(token || "")));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function isMissingTableError(error) {
  return /no such table|SQLITE_ERROR.*table/i.test(String(error && error.message ? error.message : error));
}

async function verifyGoogleCredential(env, credential) {
  if (!env.GOOGLE_CLIENT_ID) throw new Error("Google login is not configured.");
  if (!credential) throw new Error("Missing Google credential.");
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!response.ok) throw new Error("Google credential verification failed.");
  const profile = await response.json();
  if (profile.aud !== env.GOOGLE_CLIENT_ID) throw new Error("Google credential audience mismatch.");
  if (profile.email_verified !== true && profile.email_verified !== "true") throw new Error("Google email is not verified.");
  return {
    sub: profile.sub,
    email: profile.email,
    name: profile.name || profile.email,
    picture: profile.picture || "",
  };
}

async function upsertWatchlistUser(db, profile) {
  const now = new Date().toISOString();
  await db.prepare(`
    insert into watchlist_users (google_sub, email, name, picture, created_at, last_login_at)
    values (?, ?, ?, ?, ?, ?)
    on conflict(google_sub) do update set
      email = excluded.email,
      name = excluded.name,
      picture = excluded.picture,
      last_login_at = excluded.last_login_at
  `).bind(profile.sub, profile.email, profile.name, profile.picture, now, now).run();
  return db.prepare("select * from watchlist_users where google_sub = ?").bind(profile.sub).first();
}

async function currentWatchlistUser(db, request) {
  const token = parseCookies(request).twstock_watchlist;
  if (!token) return null;
  const tokenHash = await sessionTokenHash(token);
  const now = new Date().toISOString();
  try {
    const session = await db.prepare(`
      select u.id, u.email, u.name, u.picture, s.token
      from watchlist_sessions s
      join watchlist_users u on u.id = s.user_id
      where s.token in (?, ?) and s.expires_at > ?
      limit 1
    `).bind(tokenHash, token, now).first();
    if (session?.token === token) {
      await db.prepare("update watchlist_sessions set token = ? where token = ?").bind(tokenHash, token).run();
      session.token = tokenHash;
    }
    return session;
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

async function createWatchlistSession(db, userId, request) {
  const token = randomSessionToken();
  const tokenHash = await sessionTokenHash(token);
  const now = new Date();
  const expires = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  await db.prepare(`
    insert into watchlist_sessions (user_id, token, created_at, expires_at, user_agent)
    values (?, ?, ?, ?, ?)
  `).bind(userId, tokenHash, now.toISOString(), expires.toISOString(), request.headers.get("user-agent") || "").run();
  return token;
}

async function listWatchlistItems(db, userId) {
  const { results } = await db.prepare(`
    with recent_flow_dates as (
      select distinct trade_date from institutional_flows order by trade_date desc limit 5
    ),
    five_day_flow as (
      select stock_id, sum(total_institutional_net_buy) as total_institutional_net_buy
      from institutional_flows
      where trade_date in (select trade_date from recent_flow_dates)
      group by stock_id
    )
    select wi.id, wi.stock_code, wi.note, wi.created_at, wi.updated_at,
      wi.quantity_shares, wi.buy_price, wi.sell_price, wi.fee_amount, wi.tax_amount,
      s.stock_name, s.market_type, s.industry_name,
      s.instrument_type,
      dp.trade_date, dp.close_price, dp.change_percent, dp.turnover_value,
      mr.yoy_growth_percent,
      ff.total_institutional_net_buy as five_day_institutional_net_buy,
      (
        select min(sd.ex_dividend_date)
        from stock_dividends sd
        where sd.stock_id = s.id and sd.ex_dividend_date >= date('now')
      ) as next_ex_dividend_date
    from watchlist_items wi
    left join stocks s on s.stock_code = wi.stock_code
    left join daily_prices dp on dp.stock_id = s.id and dp.trade_date = (
      select max(trade_date) from daily_prices where stock_id = s.id
    )
    left join monthly_revenue mr on mr.stock_id = s.id and (mr.revenue_year || '-' || printf('%02d', mr.revenue_month)) = (
      select revenue_year || '-' || printf('%02d', revenue_month)
      from monthly_revenue where stock_id = s.id
      order by revenue_year desc, revenue_month desc limit 1
    )
    left join five_day_flow ff on ff.stock_id = s.id
    where wi.user_id = ?
      and exists (
        select 1
        from watchlist_transactions wt
        where wt.user_id = wi.user_id and wt.stock_code = wi.stock_code
      )
    order by wi.created_at desc
  `).bind(userId).all();
  return (results || []).map((item) => enrichWatchlistProfit(item));
}

function sqlLike(value) {
  return `%${String(value || "").trim()}%`;
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function costNumber(value) {
  const numeric = optionalNumber(value);
  return numeric === null ? 0 : Math.max(0, numeric);
}

function normalizeQuantityShares(value) {
  const numeric = Math.round(Number(value || 1000));
  if (!Number.isFinite(numeric) || numeric <= 0) return 1000;
  return Math.min(numeric, 1000000000);
}

function stockCodeFromInput(value) {
  const match = String(value || "").match(/\d{4}/);
  return match ? match[0] : "";
}

async function parseWatchlistPayload(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return { body: await request.json().catch(() => ({})), isForm: false };
  }
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    return { body: Object.fromEntries(form.entries()), isForm: true };
  }
  return { body: await request.json().catch(() => ({})), isForm: false };
}

function watchlistRedirect(request, params) {
  const url = new URL("/watchlist", request.url);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return Response.redirect(url.toString(), 303);
}

function watchlistProfit(item, referencePrice) {
  const buyPrice = optionalNumber(item.buy_price);
  const price = optionalNumber(referencePrice);
  const quantity = normalizeQuantityShares(item.quantity_shares);
  const fees = costNumber(item.fee_amount) + costNumber(item.tax_amount);
  if (buyPrice === null || price === null) return null;
  const costBasis = buyPrice * quantity + fees;
  const profit = (price - buyPrice) * quantity - fees;
  return {
    reference_price: price,
    cost_basis: Math.round(costBasis),
    profit_amount: Math.round(profit),
    profit_percent: costBasis ? (profit / costBasis) * 100 : null,
  };
}

function enrichWatchlistProfit(item) {
  const current = watchlistProfit(item, item.close_price);
  const sell = item.sell_price === null || item.sell_price === undefined || item.sell_price === "" ? null : watchlistProfit(item, item.sell_price);
  return {
    ...item,
    quantity_shares: normalizeQuantityShares(item.quantity_shares),
    fee_amount: costNumber(item.fee_amount),
    tax_amount: costNumber(item.tax_amount),
    current_profit_amount: current?.profit_amount ?? null,
    current_profit_percent: current?.profit_percent ?? null,
    current_cost_basis: current?.cost_basis ?? null,
    sell_profit_amount: sell?.profit_amount ?? null,
    sell_profit_percent: sell?.profit_percent ?? null,
    alerts: [
      Number(item.yoy_growth_percent || 0) >= 20 ? `月營收 YoY ${Number(item.yoy_growth_percent).toFixed(1)}%` : null,
      Number(item.five_day_institutional_net_buy || 0) > 0 ? `法人 5 日買超 ${Number(item.five_day_institutional_net_buy).toLocaleString("zh-TW")} 張` : null,
      item.next_ex_dividend_date ? `除權息 ${item.next_ex_dividend_date}` : null,
    ].filter(Boolean),
  };
}

function defaultSellTaxRatePercent(stock = {}) {
  const instrument = String(stock.instrument_type || "").toLowerCase();
  const code = String(stock.stock_code || "");
  if (instrument === "etf") return /b$/i.test(code) ? 0 : 0.1;
  if (instrument === "etn" || instrument === "tdr" || instrument === "warrant") return 0.1;
  return 0.3;
}

function clampCostRate(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(5, numeric));
}

function roundCurrency(value) {
  return Math.floor(Number(value || 0) + 0.500000001);
}

function calculateWatchlistTradeCosts(body, stock, side, grossAmount) {
  const feePreset = ["standard", "discount60", "discount28", "custom", "manual_amount"].includes(String(body.fee_preset))
    ? String(body.fee_preset)
    : "standard";
  const feeRates = {
    standard: 0.1425,
    discount60: 0.0855,
    discount28: 0.0399,
  };
  const feeRatePercent = feePreset === "custom"
    ? clampCostRate(body.fee_rate_percent, 0.1425)
    : feePreset === "manual_amount"
      ? 0
      : feeRates[feePreset];
  const minimumFee = Math.max(0, Math.min(100000, costNumber(body.minimum_fee ?? 20)));
  const manualFee = feePreset === "manual_amount" ? optionalNumber(body.manual_fee_amount) : null;
  const calculatedFee = Math.max(minimumFee, roundCurrency(grossAmount * feeRatePercent / 100));
  const feeAmount = feePreset === "manual_amount" ? costNumber(manualFee) : calculatedFee;
  const requestedTaxPreset = String(body.tax_preset || "auto");
  const taxPreset = ["auto", "stock", "day_trade_stock", "etf_etn", "bond_etf", "custom", "manual_amount"].includes(requestedTaxPreset)
    ? requestedTaxPreset
    : "auto";
  const taxRates = {
    stock: 0.3,
    day_trade_stock: 0.15,
    etf_etn: 0.1,
    bond_etf: 0,
  };
  const taxRatePercent = side === "buy"
    ? 0
    : taxPreset === "auto"
      ? defaultSellTaxRatePercent(stock)
      : taxPreset === "custom"
        ? clampCostRate(body.tax_rate_percent, defaultSellTaxRatePercent(stock))
        : taxPreset === "manual_amount"
          ? 0
          : taxRates[taxPreset];
  const manualTax = taxPreset === "manual_amount" ? optionalNumber(body.manual_tax_amount) : null;
  const taxAmount = side === "buy"
    ? 0
    : taxPreset === "manual_amount"
      ? costNumber(manualTax)
      : roundCurrency(grossAmount * taxRatePercent / 100);
  return {
    fee_preset: feePreset,
    fee_rate_percent: feeRatePercent,
    minimum_fee: minimumFee,
    fee_amount: feeAmount,
    tax_preset: side === "buy" ? "none" : taxPreset,
    tax_rate_percent: taxRatePercent,
    tax_amount: taxAmount,
  };
}

const WATCHLIST_TRANSACTION_MODES = ["cash", "day_long", "day_short", "margin_long", "short_sell"];

function normalizeWatchlistTransactionMode(value) {
  const mode = String(value || "cash");
  return WATCHLIST_TRANSACTION_MODES.includes(mode) ? mode : "cash";
}

function isShortWatchlistMode(value) {
  return ["day_short", "short_sell"].includes(normalizeWatchlistTransactionMode(value));
}

function computeWatchlistPortfolio(items = [], transactions = []) {
  const itemByCode = new Map(items.map((item) => [String(item.stock_code), item]));
  const states = new Map();
  const ordered = [...transactions].sort((a, b) =>
    String(a.trade_date).localeCompare(String(b.trade_date)) || Number(a.id || 0) - Number(b.id || 0)
  );
  for (const transaction of ordered) {
    const code = String(transaction.stock_code);
    if (!states.has(code)) {
      states.set(code, {
        quantity_shares: 0,
        remaining_cost: 0,
        realized_cost: 0,
        realized_profit_amount: 0,
        total_fee_amount: 0,
        total_tax_amount: 0,
        latest_fee_rate_percent: 0.1425,
        latest_minimum_fee: 20,
        short_quantity_shares: 0,
        short_open_proceeds: 0,
        short_realized_cost: 0,
      });
    }
    const state = states.get(code);
    const quantity = normalizeQuantityShares(transaction.quantity_shares);
    const gross = Number(transaction.gross_amount || (Number(transaction.price || 0) * quantity));
    const fee = costNumber(transaction.fee_amount);
    const tax = costNumber(transaction.tax_amount);
    const shortMode = isShortWatchlistMode(transaction.transaction_mode);
    state.total_fee_amount += fee;
    state.total_tax_amount += tax;
    if (transaction.fee_rate_percent !== null && transaction.fee_rate_percent !== undefined) {
      state.latest_fee_rate_percent = clampCostRate(transaction.fee_rate_percent, 0.1425);
      state.latest_minimum_fee = costNumber(transaction.minimum_fee);
    }
    if (shortMode && transaction.side === "sell") {
      state.short_quantity_shares += quantity;
      state.short_open_proceeds += gross - fee - tax;
      continue;
    }
    if (shortMode && transaction.side === "buy") {
      const coverQuantity = Math.min(quantity, state.short_quantity_shares);
      const averageOpenProceeds = state.short_quantity_shares > 0 ? state.short_open_proceeds / state.short_quantity_shares : 0;
      const disposedOpenProceeds = averageOpenProceeds * coverQuantity;
      const coverCost = gross + fee;
      state.realized_cost += coverCost;
      state.short_realized_cost += coverCost;
      state.realized_profit_amount += disposedOpenProceeds - coverCost;
      state.short_open_proceeds = Math.max(0, state.short_open_proceeds - disposedOpenProceeds);
      state.short_quantity_shares = Math.max(0, state.short_quantity_shares - coverQuantity);
      if (!state.short_quantity_shares) state.short_open_proceeds = 0;
      continue;
    }
    if (transaction.side === "buy") {
      state.quantity_shares += quantity;
      state.remaining_cost += gross + fee + tax;
      continue;
    }
    const sellQuantity = Math.min(quantity, state.quantity_shares);
    const averageCost = state.quantity_shares > 0 ? state.remaining_cost / state.quantity_shares : 0;
    const disposedCost = averageCost * sellQuantity;
    const netProceeds = gross - fee - tax;
    state.realized_cost += disposedCost;
    state.realized_profit_amount += netProceeds - disposedCost;
    state.remaining_cost = Math.max(0, state.remaining_cost - disposedCost);
    state.quantity_shares = Math.max(0, state.quantity_shares - sellQuantity);
    if (!state.quantity_shares) state.remaining_cost = 0;
  }
  const positions = items.map((item) => {
    const state = states.get(String(item.stock_code)) || {
      quantity_shares: 0,
      remaining_cost: 0,
      realized_cost: 0,
      realized_profit_amount: 0,
      total_fee_amount: 0,
      total_tax_amount: 0,
      latest_fee_rate_percent: 0.1425,
      latest_minimum_fee: 20,
      short_quantity_shares: 0,
      short_open_proceeds: 0,
      short_realized_cost: 0,
    };
    const closePrice = optionalNumber(item.close_price);
    const longMarketValue = closePrice === null ? null : closePrice * state.quantity_shares;
    const shortMarketValue = closePrice === null ? null : closePrice * state.short_quantity_shares;
    const marketValue = closePrice === null ? null : longMarketValue - shortMarketValue;
    const estimatedSellFee = longMarketValue && state.quantity_shares
      ? Math.max(state.latest_minimum_fee, roundCurrency(longMarketValue * state.latest_fee_rate_percent / 100))
      : 0;
    const estimatedSellTax = longMarketValue && state.quantity_shares
      ? roundCurrency(longMarketValue * defaultSellTaxRatePercent(item) / 100)
      : 0;
    const estimatedCoverFee = shortMarketValue && state.short_quantity_shares
      ? Math.max(state.latest_minimum_fee, roundCurrency(shortMarketValue * state.latest_fee_rate_percent / 100))
      : 0;
    const longUnrealized = longMarketValue === null
      ? null
      : longMarketValue - estimatedSellFee - estimatedSellTax - state.remaining_cost;
    const shortUnrealized = shortMarketValue === null
      ? null
      : state.short_open_proceeds - shortMarketValue - estimatedCoverFee;
    const unrealized = closePrice === null ? null : Number(longUnrealized || 0) + Number(shortUnrealized || 0);
    const averageCost = state.quantity_shares ? state.remaining_cost / state.quantity_shares : null;
    const shortAveragePrice = state.short_quantity_shares ? state.short_open_proceeds / state.short_quantity_shares : null;
    const netQuantity = state.quantity_shares - state.short_quantity_shares;
    const openPositionBasis = state.remaining_cost + state.short_open_proceeds;
    return {
      ...item,
      position_quantity_shares: netQuantity,
      long_quantity_shares: state.quantity_shares,
      short_quantity_shares: state.short_quantity_shares,
      average_cost: averageCost,
      short_average_price: shortAveragePrice,
      remaining_cost: Math.round(state.remaining_cost),
      market_value: marketValue === null ? null : Math.round(marketValue),
      estimated_sell_fee: estimatedSellFee,
      estimated_sell_tax: estimatedSellTax,
      unrealized_profit_amount: unrealized === null ? null : Math.round(unrealized),
      unrealized_profit_percent: unrealized === null || !openPositionBasis ? null : unrealized / openPositionBasis * 100,
      realized_profit_amount: Math.round(state.realized_profit_amount),
      realized_profit_percent: state.realized_cost ? state.realized_profit_amount / state.realized_cost * 100 : null,
      total_profit_amount: Math.round(state.realized_profit_amount + Number(unrealized || 0)),
      total_fee_amount: Math.round(state.total_fee_amount),
      total_tax_amount: Math.round(state.total_tax_amount),
    };
  }).sort((a, b) => Number((b.long_quantity_shares || 0) + (b.short_quantity_shares || 0) > 0) - Number((a.long_quantity_shares || 0) + (a.short_quantity_shares || 0) > 0) || String(a.stock_code).localeCompare(String(b.stock_code)));
  const summary = positions.reduce((total, item) => ({
    remaining_cost: total.remaining_cost + Number(item.remaining_cost || 0),
    market_value: total.market_value + Number(item.market_value || 0),
    unrealized_profit_amount: total.unrealized_profit_amount + Number(item.unrealized_profit_amount || 0),
    realized_profit_amount: total.realized_profit_amount + Number(item.realized_profit_amount || 0),
    total_profit_amount: total.total_profit_amount + Number(item.total_profit_amount || 0),
    total_fee_amount: total.total_fee_amount + Number(item.total_fee_amount || 0),
    total_tax_amount: total.total_tax_amount + Number(item.total_tax_amount || 0),
  }), {
    remaining_cost: 0,
    market_value: 0,
    unrealized_profit_amount: 0,
    realized_profit_amount: 0,
    total_profit_amount: 0,
    total_fee_amount: 0,
    total_tax_amount: 0,
  });
  const history = [...transactions].sort((a, b) =>
    String(b.trade_date).localeCompare(String(a.trade_date)) || Number(b.id || 0) - Number(a.id || 0)
  ).map((transaction) => {
    const item = itemByCode.get(String(transaction.stock_code)) || {};
    return {
      ...transaction,
      stock_name: item.stock_name || "",
      market_type: item.market_type || "",
      instrument_type: item.instrument_type || "",
    };
  });
  return { positions, transactions: history, summary };
}

async function listWatchlistPortfolio(db, userId) {
  const items = await listWatchlistItems(db, userId);
  const { results } = await db.prepare(`
    select *
    from watchlist_transactions
    where user_id = ?
    order by trade_date desc, id desc
    limit 2000
  `).bind(userId).all();
  return computeWatchlistPortfolio(items, results || []);
}

async function updateStatus(db, dataType, latestDataDate, latestUpdateTime, source, status, note) {
  await db.prepare(`
    insert into data_update_status (data_type, latest_data_date, latest_update_time, source, status, note, created_at, last_updated_at)
    values (?, ?, ?, ?, ?, ?, ?, ?)
    on conflict(data_type) do update set
      latest_data_date = case
        when excluded.latest_data_date is null or excluded.latest_data_date = '' then data_update_status.latest_data_date
        when data_update_status.latest_data_date is null or data_update_status.latest_data_date = '' then excluded.latest_data_date
        when excluded.latest_data_date > data_update_status.latest_data_date then excluded.latest_data_date
        else data_update_status.latest_data_date
      end,
      latest_update_time = excluded.latest_update_time,
      source = excluded.source,
      status = excluded.status,
      note = excluded.note,
      last_updated_at = excluded.last_updated_at
  `).bind(dataType, latestDataDate, latestUpdateTime, source, status, note, latestUpdateTime, latestUpdateTime).run();
}

async function updateQualityStatus(db, {
  dataType,
  marketScope = "all",
  source,
  latestDataDate = null,
  status,
  recordCount = 0,
  coveredStocks = 0,
  expectedStocks = 0,
  isDemo = false,
  note = null,
}) {
  const now = new Date().toISOString();
  await db.prepare(`
    insert into data_quality_status (
      data_type, market_scope, source, latest_data_date, status,
      record_count, covered_stocks, expected_stocks, is_demo, note, updated_at
    )
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    on conflict(data_type, market_scope, source) do update set
      latest_data_date = excluded.latest_data_date,
      status = excluded.status,
      record_count = excluded.record_count,
      covered_stocks = excluded.covered_stocks,
      expected_stocks = excluded.expected_stocks,
      is_demo = excluded.is_demo,
      note = excluded.note,
      updated_at = excluded.updated_at
  `).bind(
    dataType,
    marketScope,
    source,
    latestDataDate,
    status,
    Number(recordCount || 0),
    Number(coveredStocks || 0),
    Number(expectedStocks || 0),
    isDemo ? 1 : 0,
    note,
    now,
  ).run();
}

async function expectedStockCount(db, marketType, instrumentType = "stock") {
  const row = await db.prepare(`
    select count(*) as count
    from stocks
    where (? = 'all' or instrument_type = ?)
      and (? = 'all' or market_type = ?)
  `).bind(
    instrumentType || "stock",
    instrumentType || "stock",
    marketType || "all",
    marketType || "all",
  ).first();
  return Number(row?.count || 0);
}

async function updateImportedMarketQuality(db, {
  dataType,
  rows,
  source,
  latestDataDate,
  note,
}) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const markets = [...new Set(normalizedRows.map((row) => row.market_type).filter(Boolean))];
  const table = {
    daily_price: ["daily_prices", "trade_date"],
    institutional_flow: ["institutional_flows", "trade_date"],
  }[dataType];
  for (const marketScope of markets) {
    const marketRows = normalizedRows.filter((row) => row.market_type === marketScope && /^\d{4}$/.test(row.stock_code || ""));
    const instrumentType = marketScope === "興櫃" ? "emerging" : "stock";
    let recordCount = marketRows.length;
    let coveredStocks = new Set(marketRows.map((row) => row.stock_code)).size;
    if (table && latestDataDate) {
      const [tableName, dateColumn] = table;
      const actual = await db.prepare(`
        select count(*) as record_count, count(distinct dataset.stock_id) as covered_stocks
        from ${tableName} dataset
        join stocks s on s.id = dataset.stock_id
        where s.market_type = ? and dataset.${dateColumn} = ?
      `).bind(marketScope, latestDataDate).first();
      recordCount = Number(actual?.record_count || 0);
      coveredStocks = Number(actual?.covered_stocks || 0);
    }
    await updateQualityStatus(db, {
      dataType,
      marketScope,
      source: source || marketRows[0]?.source || "Official import",
      latestDataDate,
      status: marketRows.length ? "success" : "partial",
      recordCount,
      coveredStocks,
      expectedStocks: await expectedStockCount(db, marketScope, instrumentType),
      note,
    });
  }
}

async function writeCrawlerLog(db, crawlerName, sourceName, targetUrl, startedAt, status, inserted, updated, errorMessage) {
  await db.prepare(`
    insert into crawler_logs (crawler_name, source_name, target_url, started_at, finished_at, status, records_inserted, records_updated, error_message, created_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crawlerName,
    sourceName,
    targetUrl,
    startedAt,
    new Date().toISOString(),
    status,
    inserted,
    updated,
    errorMessage,
    startedAt,
  ).run();
}

async function listStocks(db, url) {
  const limit = clampInt(url.searchParams.get("limit"), 100, 1, 1000);
  const offset = clampInt(url.searchParams.get("offset"), 0, 0, 1000000);
  const institutionalWindow = [1, 5, 10, 20].includes(Number(url.searchParams.get("institutional_window")))
    ? Number(url.searchParams.get("institutional_window"))
    : 1;
  const keyword = url.searchParams.get("keyword");
  const marketType = url.searchParams.get("market_type");
  const industry = url.searchParams.get("industry");
  const requestedInstrumentType = url.searchParams.get("instrument_type");
  const instrumentType = requestedInstrumentType || (keyword ? "all" : "stock");
  const theme = url.searchParams.get("theme");
  const minPrice = toNumber(url.searchParams.get("min_price"));
  const maxPrice = toNumber(url.searchParams.get("max_price"));
  const minTurnover = toNumber(url.searchParams.get("min_turnover"));
  const minRevenueYoy = toNumber(url.searchParams.get("min_revenue_yoy"));
  const flowParty = ["foreign", "trust", "dealer", "total"].includes(url.searchParams.get("flow_party"))
    ? url.searchParams.get("flow_party")
    : "total";
  const flowDirection = ["buy", "sell"].includes(url.searchParams.get("flow_direction"))
    ? url.searchParams.get("flow_direction")
    : null;
  const sortKey = url.searchParams.get("sort") || "score";
  const sortDirection = url.searchParams.get("direction") === "asc" ? "asc" : "desc";
  const flowColumns = {
    foreign: "ifw.foreign_investor_net_buy",
    trust: "ifw.investment_trust_net_buy",
    dealer: "ifw.dealer_net_buy",
    total: "ifw.total_institutional_net_buy",
  };
  const sortColumns = {
    score: "coalesce(ss.total_score, 0)",
    turnover: "coalesce(dp.turnover_value, 0)",
    revenue: "coalesce(mr.yoy_growth_percent, -999999)",
    price: "coalesce(dp.close_price, 0)",
    institutional: `coalesce(${flowColumns[flowParty]}, 0)`,
  };
  const orderColumn = sortColumns[sortKey] || sortColumns.score;

  const where = [];
  const binds = [];
  if (keyword) {
    where.push("(s.stock_code like ? or s.stock_name like ?)");
    binds.push(sqlLike(keyword), sqlLike(keyword));
  }
  if (marketType) {
    where.push("s.market_type = ?");
    binds.push(marketType);
  }
  if (industry) {
    where.push("(s.industry_code = ? or s.industry_name like ?)");
    binds.push(industry, sqlLike(industry));
  }
  if (instrumentType && instrumentType !== "all") {
    where.push("s.instrument_type = ?");
    binds.push(instrumentType);
  }
  if (theme) {
    where.push("exists (select 1 from stock_themes fst join themes ft on ft.id = fst.theme_id where fst.stock_id = s.id and (fst.review_status = 'approved' or fst.confidence_score >= 80) and (cast(ft.id as text) = ? or lower(ft.theme_name) like lower(?) or lower(coalesce(ft.keywords, '')) like lower(?)))");
    binds.push(theme, sqlLike(theme), sqlLike(theme));
  }
  if (minPrice !== null) {
    where.push("dp.close_price >= ?");
    binds.push(minPrice);
  }
  if (maxPrice !== null) {
    where.push("dp.close_price <= ?");
    binds.push(maxPrice);
  }
  if (minTurnover !== null) {
    where.push("dp.turnover_value >= ?");
    binds.push(minTurnover);
  }
  if (minRevenueYoy !== null) {
    where.push("mr.yoy_growth_percent >= ?");
    binds.push(minRevenueYoy);
  }
  if (flowDirection) where.push(`${flowColumns[flowParty]} ${flowDirection === "buy" ? ">" : "<"} 0`);
  const whereSql = where.length ? `where ${where.join(" and ")}` : "";

  const { results } = await db.prepare(`
    with recent_flow_dates as (
      select distinct trade_date
      from institutional_flows
      order by trade_date desc
      limit ?
    ),
    institutional_window as (
      select
        stock_id,
        sum(coalesce(foreign_investor_net_buy, 0)) as foreign_investor_net_buy,
        sum(coalesce(investment_trust_net_buy, 0)) as investment_trust_net_buy,
        sum(coalesce(dealer_net_buy, 0)) as dealer_net_buy,
        sum(coalesce(total_institutional_net_buy, 0)) as total_institutional_net_buy
      from institutional_flows
      where trade_date in (select trade_date from recent_flow_dates)
      group by stock_id
    )
    select
      s.id,
      s.stock_code,
      s.stock_name,
      s.market_type,
      s.industry_code,
      s.industry_name,
      s.instrument_type,
      coalesce(group_concat(distinct t.theme_name), '') as theme_names,
      dp.trade_date,
      dp.close_price,
      dp.change_percent,
      dp.volume,
      dp.turnover_value,
      ifw.foreign_investor_net_buy,
      ifw.investment_trust_net_buy,
      ifw.dealer_net_buy,
      ifw.total_institutional_net_buy,
      ${institutionalWindow} as institutional_window,
      mr.revenue_year,
      mr.revenue_month,
      mr.yoy_growth_percent,
      fr.eps,
      ss.total_score,
      ss.status
    from stocks s
    left join stock_themes st on st.stock_id = s.id and (st.review_status = 'approved' or st.confidence_score >= 80)
    left join themes t on t.id = st.theme_id
    left join daily_prices dp on dp.stock_id = s.id and dp.trade_date = (
      select max(trade_date) from daily_prices where stock_id = s.id
    )
    left join institutional_window ifw on ifw.stock_id = s.id
    left join monthly_revenue mr on mr.stock_id = s.id and (mr.revenue_year || '-' || printf('%02d', mr.revenue_month)) = (
      select revenue_year || '-' || printf('%02d', revenue_month)
      from monthly_revenue where stock_id = s.id
      order by revenue_year desc, revenue_month desc limit 1
    )
    left join financial_reports fr on fr.stock_id = s.id and (fr.fiscal_year || '-' || fr.quarter) = (
      select fiscal_year || '-' || quarter
      from financial_reports where stock_id = s.id
      order by fiscal_year desc, quarter desc limit 1
    )
    left join stock_scores ss on ss.stock_id = s.id
      and ss.score_date = (select max(trade_date) from daily_prices)
    ${whereSql}
    group by s.id
    order by ${orderColumn} ${sortDirection}, coalesce(dp.turnover_value, 0) desc, s.stock_code asc
    limit ? offset ?
  `).bind(institutionalWindow, ...binds, limit, offset).all();

  return results.map((row) => ({
    ...row,
    themes: row.theme_names ? row.theme_names.split(",") : [],
  }));
}

async function listStockSuggestions(db, url) {
  const query = String(url.searchParams.get("q") || "").trim().slice(0, 40);
  if (!query) return [];
  const limit = clampInt(url.searchParams.get("limit"), 15, 1, 30);
  const contains = sqlLike(query);
  const prefix = `${query}%`;
  const { results } = await db.prepare(`
    select
      s.stock_code,
      s.stock_name,
      s.market_type,
      s.industry_code,
      s.industry_name,
      s.instrument_type
    from stocks s
    where lower(s.stock_code) like lower(?)
       or lower(s.stock_name) like lower(?)
    order by
      case
        when lower(s.stock_code) = lower(?) then 0
        when lower(s.stock_name) = lower(?) then 1
        when lower(s.stock_code) like lower(?) then 2
        when lower(s.stock_name) like lower(?) then 3
        else 4
      end,
      case s.instrument_type
        when 'stock' then 0
        when 'emerging' then 1
        when 'etf' then 2
        when 'tdr' then 3
        else 4
      end,
      s.stock_code,
      s.market_type
    limit ?
  `).bind(contains, contains, query, query, prefix, prefix, limit).all();
  const instrumentLabels = {
    stock: "普通股",
    emerging: "興櫃股票",
    etf: "ETF",
    tdr: "TDR",
  };
  return (results || []).map((row) => ({
    ...row,
    instrument_label: instrumentLabels[row.instrument_type] || row.instrument_type || "證券",
  }));
}

async function listThemeSuggestions(db, url) {
  const query = String(url.searchParams.get("q") || "").trim();
  if (!query) return [];
  const limit = clampInt(url.searchParams.get("limit"), 8, 1, 12);
  const contains = sqlLike(query);
  const prefix = `${query}%`;
  const { results } = await db.prepare(`
    select
      t.id,
      t.theme_name,
      t.theme_category,
      count(distinct st.stock_id) as stock_count
    from themes t
    join stock_themes st on st.theme_id = t.id
      and (st.review_status = 'approved' or st.confidence_score >= 80)
    where lower(t.theme_name) like lower(?)
       or lower(coalesce(t.keywords, '')) like lower(?)
    group by t.id, t.theme_name, t.theme_category
    order by
      case
        when lower(t.theme_name) = lower(?) then 0
        when lower(t.theme_name) like lower(?) then 1
        else 2
      end,
      stock_count desc,
      t.theme_name
    limit ?
  `).bind(contains, contains, query, prefix, limit).all();
  return (results || []).map((row) => ({
    ...row,
    stock_count: Number(row.stock_count || 0),
  }));
}

async function listMarketIndex(db, limit = 260) {
  try {
    const { results } = await db.prepare(`
      select *
      from market_index_prices
      where index_code = 'TAIEX'
      order by trade_date desc
      limit ?
    `).bind(limit).all();
    if (!results.length) return [];
    const oldestDate = results[results.length - 1].trade_date;
    const { results: marketActivity } = await db.prepare(`
      select
        trade_date,
        sum(coalesce(volume, 0)) as market_volume,
        sum(coalesce(turnover_value, 0)) as market_turnover_value
      from daily_prices
      where trade_date >= ? and market_type = ?
      group by trade_date
    `).bind(oldestDate, "\u4e0a\u5e02").all();
    const activityByDate = new Map(marketActivity.map((row) => [row.trade_date, row]));
    return [...results].reverse().map((row) => ({
      ...row,
      market_volume: Number(activityByDate.get(row.trade_date)?.market_volume || 0),
      market_turnover_value: Number(activityByDate.get(row.trade_date)?.market_turnover_value || 0),
    }));
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

async function listDashboard(db) {
  const latestPriceDate = await db.prepare("select max(trade_date) as trade_date from daily_prices").first();
  const latestFlowDate = await db.prepare("select max(trade_date) as trade_date from institutional_flows").first();
  const tradeDate = latestPriceDate?.trade_date || null;
  const flowDate = latestFlowDate?.trade_date || null;
  const topStocks = await db.prepare(`
    select s.stock_code, s.stock_name, s.industry_name, dp.close_price, dp.change_percent,
      dp.turnover_value, ifl.foreign_investor_net_buy, ifl.investment_trust_net_buy,
      ifl.total_institutional_net_buy, ss.price_momentum_score, ss.volume_score,
      ss.institutional_score, ss.revenue_score, ss.theme_score,
      ss.total_score, ss.status, ss.reason as score_reason
    from stocks s
    left join daily_prices dp on dp.stock_id = s.id and dp.trade_date = ?
    left join institutional_flows ifl on ifl.stock_id = s.id and ifl.trade_date = ?
    left join stock_scores ss on ss.stock_id = s.id
      and ss.score_date = (select max(trade_date) from daily_prices)
    where dp.close_price is not null and s.instrument_type = 'stock'
    order by coalesce(ss.total_score, 0) desc, coalesce(dp.turnover_value, 0) desc
    limit 8
  `).bind(tradeDate, flowDate).all();
  const flowLeaders = await db.prepare(`
    select s.stock_code, s.stock_name, s.industry_name, dp.close_price, dp.change_percent,
      dp.turnover_value, ifl.foreign_investor_net_buy, ifl.investment_trust_net_buy,
      ifl.dealer_net_buy, ifl.total_institutional_net_buy,
      ifl.foreign_investor_net_buy * 1000 * coalesce(dp.close_price, 0) as foreign_investor_net_amount,
      ifl.investment_trust_net_buy * 1000 * coalesce(dp.close_price, 0) as investment_trust_net_amount,
      ifl.dealer_net_buy * 1000 * coalesce(dp.close_price, 0) as dealer_net_amount,
      ifl.total_institutional_net_buy * 1000 * coalesce(dp.close_price, 0) as total_institutional_net_amount
    from institutional_flows ifl
    join stocks s on s.id = ifl.stock_id
    left join daily_prices dp on dp.stock_id = s.id and dp.trade_date = (
      select max(trade_date) from daily_prices where stock_id = s.id
    )
    where ifl.trade_date = ? and s.instrument_type = 'stock'
    order by abs(ifl.total_institutional_net_buy * 1000 * coalesce(dp.close_price, 0)) desc, coalesce(dp.turnover_value, 0) desc
    limit 120
  `).bind(flowDate).all();
  const institutionalLeaderRows = async (field, desc = true) => {
    const direction = desc ? "desc" : "asc";
    const comparison = desc ? ">" : "<";
    const { results } = await db.prepare(`
      select s.id as stock_id, s.stock_code, s.stock_name, s.industry_name, dp.close_price, dp.change_percent,
        dp.turnover_value, ifl.foreign_investor_net_buy, ifl.investment_trust_net_buy,
        ifl.dealer_net_buy, ifl.total_institutional_net_buy,
        ifl.foreign_investor_net_buy * 1000 * coalesce(dp.close_price, 0) as foreign_investor_net_amount,
        ifl.investment_trust_net_buy * 1000 * coalesce(dp.close_price, 0) as investment_trust_net_amount,
        ifl.dealer_net_buy * 1000 * coalesce(dp.close_price, 0) as dealer_net_amount,
        ifl.total_institutional_net_buy * 1000 * coalesce(dp.close_price, 0) as total_institutional_net_amount
      from institutional_flows ifl
      join stocks s on s.id = ifl.stock_id
      left join daily_prices dp on dp.stock_id = s.id and dp.trade_date = (
        select max(trade_date) from daily_prices where stock_id = s.id
      )
      where ifl.trade_date = ? and s.instrument_type = 'stock' and ifl.${field} ${comparison} 0
      order by ifl.${field} ${direction}, abs(ifl.${field}) desc, coalesce(dp.turnover_value, 0) desc
      limit 20
    `).bind(flowDate).all();
    return results || [];
  };
  const [
    rawForeignBuyTop,
    rawForeignSellTop,
    rawTrustBuyTop,
    rawTrustSellTop,
    rawDealerBuyTop,
    rawDealerSellTop,
  ] = await Promise.all([
    institutionalLeaderRows("foreign_investor_net_buy", true),
    institutionalLeaderRows("foreign_investor_net_buy", false),
    institutionalLeaderRows("investment_trust_net_buy", true),
    institutionalLeaderRows("investment_trust_net_buy", false),
    institutionalLeaderRows("dealer_net_buy", true),
    institutionalLeaderRows("dealer_net_buy", false),
  ]);
  const leaderStockIds = [...new Set([
    ...rawForeignBuyTop,
    ...rawForeignSellTop,
    ...rawTrustBuyTop,
    ...rawTrustSellTop,
    ...rawDealerBuyTop,
    ...rawDealerSellTop,
  ].map((row) => Number(row.stock_id)).filter(Boolean))];
  const historyByStock = new Map();
  if (leaderStockIds.length && flowDate) {
    const placeholders = leaderStockIds.map(() => "?").join(",");
    const { results: historyRows } = await db.prepare(`
      select stock_id, trade_date, foreign_investor_net_buy, investment_trust_net_buy,
        dealer_net_buy, total_institutional_net_buy
      from institutional_flows
      where stock_id in (${placeholders})
        and trade_date in (
          select distinct trade_date
          from institutional_flows
          where trade_date <= ?
          order by trade_date desc
          limit 20
        )
      order by stock_id, trade_date desc
    `).bind(...leaderStockIds, flowDate).all();
    for (const row of historyRows || []) {
      if (!historyByStock.has(Number(row.stock_id))) historyByStock.set(Number(row.stock_id), []);
      historyByStock.get(Number(row.stock_id)).push(row);
    }
  }
  const decorateLeaderRows = (rows, field) => rows.map((row) => {
    const history = historyByStock.get(Number(row.stock_id)) || [];
    const current = Number(row[field] || 0);
    const direction = Math.sign(current);
    let consecutiveDays = 0;
    for (const item of history) {
      if (!direction || Math.sign(Number(item[field] || 0)) !== direction) break;
      consecutiveDays += 1;
    }
    const cumulative = (days) => history.slice(0, days).reduce((sum, item) => sum + Number(item[field] || 0), 0);
    return {
      ...row,
      consecutive_days: consecutiveDays,
      cumulative_net_buy_1d: cumulative(1),
      cumulative_net_buy_5d: cumulative(5),
      cumulative_net_buy_10d: cumulative(10),
      cumulative_net_buy_20d: cumulative(20),
      cumulative_net_amount_5d: cumulative(5) * 1000 * Number(row.close_price || 0),
    };
  });
  const foreignBuyTop = decorateLeaderRows(rawForeignBuyTop, "foreign_investor_net_buy");
  const foreignSellTop = decorateLeaderRows(rawForeignSellTop, "foreign_investor_net_buy");
  const trustBuyTop = decorateLeaderRows(rawTrustBuyTop, "investment_trust_net_buy");
  const trustSellTop = decorateLeaderRows(rawTrustSellTop, "investment_trust_net_buy");
  const dealerBuyTop = decorateLeaderRows(rawDealerBuyTop, "dealer_net_buy");
  const dealerSellTop = decorateLeaderRows(rawDealerSellTop, "dealer_net_buy");
  const breadth = await db.prepare(`
    select
      count(*) as stocks,
      sum(case when change_percent > 0 then 1 else 0 end) as advancers,
      sum(case when change_percent < 0 then 1 else 0 end) as decliners,
      sum(case when change_percent = 0 then 1 else 0 end) as unchanged,
      sum(turnover_value) as turnover_value
    from daily_prices dp
    join stocks s on s.id = dp.stock_id
    where dp.trade_date = ? and s.instrument_type = 'stock'
  `).bind(tradeDate).first();
  const industryConcentration = await db.prepare(`
    select
      coalesce(nullif(trim(s.industry_code), ''), 'UNKNOWN') as industry_code,
      coalesce(nullif(trim(s.industry_name), ''), '未分類') as industry_name,
      count(*) as stock_count,
      sum(coalesce(dp.turnover_value, 0)) as turnover_value,
      avg(dp.change_percent) as average_change_percent
    from daily_prices dp
    join stocks s on s.id = dp.stock_id
    where dp.trade_date = ? and s.instrument_type = 'stock'
    group by coalesce(nullif(trim(s.industry_code), ''), 'UNKNOWN'),
      coalesce(nullif(trim(s.industry_name), ''), '未分類')
    having sum(coalesce(dp.turnover_value, 0)) > 0
    order by turnover_value desc
  `).bind(tradeDate).all();
  const taiex = await listMarketIndex(db, 260);
  const pick = (key, desc = true) => [...flowLeaders.results].sort((a, b) => desc ? Number(b[key] || 0) - Number(a[key] || 0) : Number(a[key] || 0) - Number(b[key] || 0))[0] || null;
  const institutionalLeaders = {
    foreign: { buy: foreignBuyTop, sell: foreignSellTop },
    trust: { buy: trustBuyTop, sell: trustSellTop },
    dealer: { buy: dealerBuyTop, sell: dealerSellTop },
  };
  return {
    trade_date: tradeDate,
    flow_date: flowDate,
    breadth,
    taiex,
    hot_stocks: topStocks.results || [],
    industry_concentration: (industryConcentration.results || []).map((row) => ({
      ...row,
      stock_count: Number(row.stock_count || 0),
      turnover_value: Number(row.turnover_value || 0),
      average_change_percent: row.average_change_percent == null ? null : Number(row.average_change_percent),
    })),
    flow: {
      foreign_buy: institutionalLeaders.foreign.buy[0] || null,
      foreign_sell: institutionalLeaders.foreign.sell[0] || null,
      trust_buy: institutionalLeaders.trust.buy[0] || null,
      trust_sell: institutionalLeaders.trust.sell[0] || null,
      dealer_buy: institutionalLeaders.dealer.buy[0] || null,
      dealer_sell: institutionalLeaders.dealer.sell[0] || null,
      total_focus: pick("total_institutional_net_amount", true),
    },
    institutional_leaders: institutionalLeaders,
  };
}

async function listIndustryConcentrationDetail(db, url) {
  const industryCode = String(url.searchParams.get("industry_code") || "").trim();
  if (!industryCode) return null;
  const page = clampInt(url.searchParams.get("page"), 1, 1, 1000);
  const pageSize = clampInt(url.searchParams.get("page_size"), 10, 5, 20);
  const latest = await db.prepare("select max(trade_date) as trade_date from daily_prices").first();
  const tradeDate = latest?.trade_date || null;
  const summary = await db.prepare(`
    select
      coalesce(nullif(trim(s.industry_name), ''), '未分類') as industry_name,
      count(*) as stock_count,
      sum(coalesce(dp.turnover_value, 0)) as turnover_value
    from daily_prices dp
    join stocks s on s.id = dp.stock_id
    where dp.trade_date = ? and s.instrument_type = 'stock' and s.industry_code = ?
  `).bind(tradeDate, industryCode).first();
  const { results } = await db.prepare(`
    select
      s.stock_code,
      s.stock_name,
      s.market_type,
      s.industry_code,
      s.industry_name,
      dp.close_price,
      dp.change_percent,
      dp.turnover_value,
      (
        select scr.role_type
        from supply_chain_roles scr
        left join stock_themes st on st.stock_id = scr.stock_id
          and st.theme_id = scr.theme_id
          and (st.review_status = 'approved' or st.confidence_score >= 80)
        where scr.stock_id = s.id
          and trim(coalesce(scr.role_type, '')) not in ('', '官方產業分類')
          and (scr.theme_id is null or st.id is not null)
        order by coalesce(scr.confidence_score, 0) desc, scr.id
        limit 1
      ) as role_type,
      (
        select t.theme_name
        from stock_themes st
        join themes t on t.id = st.theme_id
        where st.stock_id = s.id
          and (st.review_status = 'approved' or st.confidence_score >= 80)
        order by coalesce(st.confidence_score, 0) desc, t.theme_name
        limit 1
      ) as verified_theme
    from daily_prices dp
    join stocks s on s.id = dp.stock_id
    where dp.trade_date = ? and s.instrument_type = 'stock' and s.industry_code = ?
    order by coalesce(dp.turnover_value, 0) desc, s.stock_code
    limit ? offset ?
  `).bind(tradeDate, industryCode, pageSize, (page - 1) * pageSize).all();
  const total = Number(summary?.stock_count || 0);
  return {
    trade_date: tradeDate,
    industry_code: industryCode,
    industry_name: summary?.industry_name || "未分類",
    turnover_value: Number(summary?.turnover_value || 0),
    stock_count: total,
    page,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
    rows: (results || []).map((row) => ({
      ...row,
      turnover_value: Number(row.turnover_value || 0),
      change_percent: row.change_percent == null ? null : Number(row.change_percent),
      detail_label: uniqueLabels([row.role_type, row.verified_theme]).join(" / ") || "尚無已驗證細分標籤",
    })),
  };
}

async function listThemeScores(db) {
  const { results } = await db.prepare(`
    select ts.*, t.theme_name, t.theme_category, t.description,
      (
        select count(*)
        from stock_themes st
        where st.theme_id = t.id
          and (st.review_status = 'approved' or st.confidence_score >= 80)
      ) as verified_stock_count
    from theme_scores ts
    join themes t on t.id = ts.theme_id
    where ts.score_date = (select max(score_date) from theme_scores)
      and ts.score_date = (select max(trade_date) from daily_prices)
      and exists (
        select 1
        from stock_themes st
        where st.theme_id = t.id
          and (st.review_status = 'approved' or st.confidence_score >= 80)
      )
    order by ts.rank asc, ts.total_theme_score desc
  `).all();
  return results;
}

async function recomputeVerifiedThemeScores(db) {
  const latest = await db.prepare("select max(trade_date) as trade_date from daily_prices").first();
  const scoreDate = latest?.trade_date || null;
  if (!scoreDate) return { status: "skipped", reason: "no price data" };
  const { results } = await db.prepare(`
    select
      t.id as theme_id,
      t.theme_name,
      count(distinct s.id) as stock_count,
      sum(coalesce(dp.turnover_value, 0)) as turnover_value,
      sum(coalesce(ifl.total_institutional_net_buy, 0)) as institutional_net_buy,
      sum(case when mr.yoy_growth_percent is not null then 1 else 0 end) as revenue_coverage,
      sum(case when mr.yoy_growth_percent > 0 then 1 else 0 end) as positive_revenue
    from themes t
    join stock_themes st on st.theme_id = t.id
      and (st.review_status = 'approved' or st.confidence_score >= ?)
    join stocks s on s.id = st.stock_id and s.instrument_type = 'stock'
    left join daily_prices dp on dp.stock_id = s.id and dp.trade_date = ?
    left join institutional_flows ifl on ifl.stock_id = s.id and ifl.trade_date = (
      select max(trade_date) from institutional_flows where trade_date <= ?
    )
    left join monthly_revenue mr on mr.stock_id = s.id and (mr.revenue_year || '-' || printf('%02d', mr.revenue_month)) = (
      select revenue_year || '-' || printf('%02d', revenue_month)
      from monthly_revenue
      where stock_id = s.id
      order by revenue_year desc, revenue_month desc
      limit 1
    )
    group by t.id, t.theme_name
    having count(distinct s.id) >= 3
  `).bind(PUBLIC_CLASSIFICATION_CONFIDENCE, scoreDate, scoreDate).all();
  if (!results.length) {
    await updateQualityStatus(db, {
      dataType: "theme_score",
      marketScope: "all",
      source: "verified-theme-score-v2",
      latestDataDate: scoreDate,
      status: "partial",
      note: "No verified themes have at least three stocks.",
    });
    return { status: "partial", score_date: scoreDate, themes: 0 };
  }
  const maxTurnover = Math.max(...results.map((row) => Number(row.turnover_value || 0)), 1);
  const maxInstitutional = Math.max(...results.map((row) => Math.max(0, Number(row.institutional_net_buy || 0))), 1);
  const scored = results.map((row) => {
    const turnoverScore = Math.min(100, Math.round((Number(row.turnover_value || 0) / maxTurnover) * 100));
    const institutionalScore = Math.min(100, Math.max(0, Math.round((Number(row.institutional_net_buy || 0) / maxInstitutional) * 100)));
    const momentumScore = Math.min(100, Number(row.stock_count || 0) * 10);
    const fundamentalScore = Number(row.revenue_coverage || 0)
      ? Math.round((Number(row.positive_revenue || 0) / Number(row.revenue_coverage)) * 100)
      : null;
    const total = Math.round(
      turnoverScore * 0.45
      + institutionalScore * 0.25
      + momentumScore * 0.2
      + Number(fundamentalScore || 0) * 0.1,
    );
    return {
      ...row,
      turnover_score: turnoverScore,
      institutional_score: institutionalScore,
      momentum_score: momentumScore,
      fundamental_score: fundamentalScore,
      total_theme_score: total,
      status: total >= 75 ? "主流" : total >= 60 ? "轉強" : "觀察",
    };
  }).sort((a, b) => b.total_theme_score - a.total_theme_score || b.stock_count - a.stock_count);
  const now = new Date().toISOString();
  await db.batch(scored.map((row, index) => db.prepare(`
    insert into theme_scores (
      theme_id, score_date, turnover_score, institutional_score, momentum_score,
      fundamental_score, news_score, total_theme_score, rank, status, reason, created_at
    )
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    on conflict(theme_id, score_date) do update set
      turnover_score = excluded.turnover_score,
      institutional_score = excluded.institutional_score,
      momentum_score = excluded.momentum_score,
      fundamental_score = excluded.fundamental_score,
      news_score = excluded.news_score,
      total_theme_score = excluded.total_theme_score,
      rank = excluded.rank,
      status = excluded.status,
      reason = excluded.reason,
      created_at = excluded.created_at
  `).bind(
    row.theme_id,
    scoreDate,
    row.turnover_score,
    row.institutional_score,
    row.momentum_score,
    row.fundamental_score,
    null,
    row.total_theme_score,
    index + 1,
    row.status,
    `已驗證題材股票 ${row.stock_count} 檔；分數依成交值、法人、廣度與營收覆蓋計算。`,
    now,
  )));
  await updateStatus(db, "theme_score", scoreDate, now, "verified-theme-score-v2", "success", `Scored ${scored.length} verified themes.`);
  await updateQualityStatus(db, {
    dataType: "theme_score",
    marketScope: "all",
    source: "verified-theme-score-v2",
    latestDataDate: scoreDate,
    status: "success",
    recordCount: scored.length,
    coveredStocks: scored.reduce((total, row) => total + Number(row.stock_count || 0), 0),
    expectedStocks: await expectedStockCount(db, "all"),
    note: "News score is intentionally omitted until an official source is connected.",
  });
  return { status: "success", score_date: scoreDate, themes: scored.length };
}

async function recomputeAvailableStockScores(db) {
  const latest = await db.prepare("select max(trade_date) as trade_date from daily_prices").first();
  const scoreDate = latest?.trade_date || null;
  if (!scoreDate) return { status: "skipped", reason: "no price data" };
  const now = new Date().toISOString();
  await db.prepare(`
    with
    latest_price as (
      select * from (
        select dp.*,
          row_number() over (partition by stock_id order by trade_date desc) as row_number
        from daily_prices dp
      )
      where row_number = 1
    ),
    latest_flow as (
      select * from (
        select ifl.*,
          row_number() over (partition by stock_id order by trade_date desc) as row_number
        from institutional_flows ifl
      )
      where row_number = 1
    ),
    latest_revenue as (
      select * from (
        select mr.*,
          row_number() over (
            partition by stock_id
            order by revenue_year desc, revenue_month desc
          ) as row_number
        from monthly_revenue mr
      )
      where row_number = 1
    ),
    latest_theme as (
      select st.stock_id, max(ts.total_theme_score) as theme_score
      from stock_themes st
      join theme_scores ts on ts.theme_id = st.theme_id
        and ts.score_date = (select max(score_date) from theme_scores)
      where st.review_status = 'approved' or st.confidence_score >= ?
      group by st.stock_id
    ),
    base as (
      select
        s.id as stock_id,
        lp.change_percent as price_momentum,
        lp.turnover_value as turnover_value,
        case
          when lf.stock_id is null then null
          else lf.total_institutional_net_buy * 1000 * coalesce(lp.close_price, 0)
        end as institutional_amount,
        lr.yoy_growth_percent as revenue_yoy,
        lt.theme_score
      from stocks s
      join latest_price lp on lp.stock_id = s.id
      left join latest_flow lf on lf.stock_id = s.id
      left join latest_revenue lr on lr.stock_id = s.id
      left join latest_theme lt on lt.stock_id = s.id
      where s.instrument_type = 'stock'
    ),
    price_rank as (
      select stock_id, round(percent_rank() over (order by price_momentum) * 100) as score
      from base where price_momentum is not null
    ),
    turnover_rank as (
      select stock_id, round(percent_rank() over (order by turnover_value) * 100) as score
      from base where turnover_value is not null
    ),
    institutional_rank as (
      select stock_id, round(percent_rank() over (order by institutional_amount) * 100) as score
      from base where institutional_amount is not null
    ),
    revenue_rank as (
      select stock_id, round(percent_rank() over (order by revenue_yoy) * 100) as score
      from base where revenue_yoy is not null
    ),
    components as (
      select
        b.stock_id,
        coalesce(p.score, 50) as price_score,
        coalesce(v.score, 50) as turnover_score,
        coalesce(i.score, 50) as institutional_score,
        coalesce(r.score, 50) as revenue_score,
        coalesce(b.theme_score, 50) as theme_score
      from base b
      left join price_rank p on p.stock_id = b.stock_id
      left join turnover_rank v on v.stock_id = b.stock_id
      left join institutional_rank i on i.stock_id = b.stock_id
      left join revenue_rank r on r.stock_id = b.stock_id
    ),
    scored as (
      select *,
        round(
          price_score * 0.25
          + turnover_score * 0.20
          + institutional_score * 0.25
          + revenue_score * 0.20
          + theme_score * 0.10
        ) as total_score
      from components
    )
    insert into stock_scores (
      stock_id, score_date, price_momentum_score, volume_score,
      institutional_score, revenue_score, financial_score, theme_score,
      risk_score, total_score, status, reason, created_at
    )
    select
      stock_id,
      ?,
      price_score,
      turnover_score,
      institutional_score,
      revenue_score,
      null,
      theme_score,
      0,
      total_score,
      case
        when price_score >= 90 and total_score >= 70 then '過熱'
        when total_score >= 75 then '強勢'
        when total_score >= 60 then '轉強'
        when total_score >= 40 then '中性'
        else '轉弱'
      end,
      printf(
        '可用資料公式 v1：動能 %.0f×25%% + 成交值 %.0f×20%% + 法人 %.0f×25%% + 營收 %.0f×20%% + 已驗證題材 %.0f×10%% = %.0f；缺值採中性 50。',
        price_score, turnover_score, institutional_score, revenue_score, theme_score, total_score
      ),
      ?
    from scored
    where true
    on conflict(stock_id, score_date) do update set
      price_momentum_score = excluded.price_momentum_score,
      volume_score = excluded.volume_score,
      institutional_score = excluded.institutional_score,
      revenue_score = excluded.revenue_score,
      financial_score = excluded.financial_score,
      theme_score = excluded.theme_score,
      risk_score = excluded.risk_score,
      total_score = excluded.total_score,
      status = excluded.status,
      reason = excluded.reason,
      created_at = excluded.created_at
  `).bind(PUBLIC_CLASSIFICATION_CONFIDENCE, scoreDate, now).run();
  const coverage = await db.prepare(`
    select count(*) as records, count(distinct stock_id) as stocks
    from stock_scores
    where score_date = ?
  `).bind(scoreDate).first();
  const stockCount = Number(coverage?.stocks || 0);
  const expectedStocks = await expectedStockCount(db, "all");
  await updateStatus(
    db,
    "stock_score",
    scoreDate,
    now,
    "available-data-score-v1",
    stockCount ? "success" : "partial",
    `Scored ${stockCount} common stocks with the published available-data formula.`,
  );
  await updateQualityStatus(db, {
    dataType: "stock_score",
    marketScope: "all",
    source: "available-data-score-v1",
    latestDataDate: scoreDate,
    status: stockCount ? "success" : "partial",
    recordCount: Number(coverage?.records || 0),
    coveredStocks: stockCount,
    expectedStocks,
    note: "Momentum 25% + turnover 20% + institutional 25% + revenue 20% + verified theme 10%; missing values are neutral 50.",
  });
  return { status: stockCount ? "success" : "partial", score_date: scoreDate, stocks: stockCount };
}

function addUnique(items, value) {
  if (value !== null && value !== undefined && value !== "" && !items.includes(value)) items.push(value);
}

function inferApplicationName(industryName, industryCode) {
  const name = String(industryName || "");
  const code = String(industryCode || "");
  const industryCodeLabels = {
    "01": "水泥建材產品",
    "02": "食品與農產產品",
    "03": "塑膠材料產品",
    "04": "紡織纖維產品",
    "05": "機械設備與自動化產品",
    "06": "電力設備與線纜產品",
    "08": "玻璃陶瓷材料產品",
    "09": "造紙包材產品",
    "10": "鋼鐵材料產品",
    "11": "橡膠材料產品",
    "12": "車用零組件與移動產品",
    "14": "營建與工程服務",
    "15": "運輸物流服務",
    "16": "觀光餐飲服務",
    "17": "金融保險服務",
    "18": "貿易百貨服務",
    "20": "綜合製造與服務",
    "21": "化工材料產品",
    "22": "生技醫療產品",
    "23": "能源與電力服務",
    "24": "半導體產品",
    "25": "伺服器與電腦週邊產品",
    "26": "面板與光電產品",
    "27": "網通設備與通訊產品",
    "28": "電子零組件產品",
    "29": "電子通路服務",
    "30": "軟體與資訊服務",
    "31": "電子設備與通路服務",
    "32": "內容娛樂服務",
    "33": "農業科技產品",
    "34": "電商與數位通路服務",
    "35": "綠能環保產品與服務",
    "36": "數位雲端服務",
    "37": "運動休閒產品與服務",
    "38": "居家生活產品與服務",
    "80": "管理股票",
    "91": "臺灣存託憑證",
  };
  const normalizedCode = /^\d+$/.test(code) ? code.padStart(2, "0") : code;
  if (/^\d+$/.test(name) && industryCodeLabels[name.padStart(2, "0")]) return industryCodeLabels[name.padStart(2, "0")];
  if (industryCodeLabels[normalizedCode]) return industryCodeLabels[normalizedCode];
  if (["半導體", "IC", "封測", "晶圓"].some((key) => name.includes(key))) return "半導體產品";
  if (["電腦", "週邊"].some((key) => name.includes(key))) return "伺服器與電腦週邊產品";
  if (name.includes("電子零組件")) return "電子零組件產品";
  if (["通信", "網路"].some((key) => name.includes(key))) return "網通設備與通訊產品";
  if (name.includes("光電")) return "面板與光電產品";
  if (name.includes("資訊服務")) return "軟體與資訊服務";
  if (["其他電子", "電子通路"].some((key) => name.includes(key))) return "電子設備與通路服務";
  if (["電機", "機械"].some((key) => name.includes(key))) return "機械設備與自動化產品";
  if (["電器", "電纜"].some((key) => name.includes(key))) return "電力設備與線纜產品";
  if (["能源", "油電", "燃氣", "綠能", "電力"].some((key) => name.includes(key))) return "能源與電力服務";
  if (["生技", "醫療"].some((key) => name.includes(key))) return "生技醫療產品";
  if (["金融", "保險", "證券"].some((key) => name.includes(key))) return "金融保險服務";
  if (["航運", "航空"].some((key) => name.includes(key))) return "運輸物流服務";
  if (["觀光", "貿易", "百貨"].some((key) => name.includes(key))) return "消費通路與生活服務";
  if (name.includes("水泥")) return "水泥建材產品";
  if (name.includes("鋼鐵")) return "鋼鐵材料產品";
  if (["塑膠", "化學", "橡膠"].some((key) => name.includes(key))) return "化工材料產品";
  if (["玻璃", "陶瓷", "造紙", "紡織", "建材", "營造"].some((key) => name.includes(key))) return "基礎材料與營建產品";
  if (["食品", "農業"].some((key) => name.includes(key))) return "食品與農產產品";
  if (["居家", "生活"].some((key) => name.includes(key))) return "生活消費產品";
  if (name.includes("汽車")) return "車用零組件與移動產品";
  if (["文化", "創意", "娛樂"].some((key) => name.includes(key))) return "內容娛樂服務";
  if (/^\d+$/.test(name)) return "綜合製造與服務";
  return name ? `${name}產品與服務` : "其他產品與服務";
}

function normalizeApplicationName(applicationName, industryName, industryCode) {
  const generic = ["未標籤應用", "theme", "其他", "未分類", "綜合產業應用"];
  if (applicationName && !generic.includes(String(applicationName))) return applicationName;
  return inferApplicationName(industryName, industryCode);
}

const PRODUCT_PEER_GROUP_RULES = [
  { name: "散熱與熱管理", description: "散熱模組、風扇、熱管、均熱板與液冷系統", keywords: ["散熱", "熱管理", "液冷", "風扇", "均熱板", "熱管", "水冷"], stockCodes: ["3017", "3324", "3653", "6230", "2421", "3338", "3483", "8996", "2308"] },
  { name: "PCB / 載板", description: "印刷電路板、ABF 載板、銅箔基板與相關材料", keywords: ["PCB", "ABF", "載板", "基板", "銅箔基板", "CCL"], stockCodes: ["3037", "8046", "3189", "3044", "2368"] },
  { name: "電源與電源管理", description: "電源供應器、電源管理 IC、UPS 與功率元件", keywords: ["電源IC", "電源管理", "電源供應", "PSU", "UPS", "功率元件"], stockCodes: ["2308", "2301", "6412"] },
  { name: "主機板與板卡", description: "主機板、伺服器板、顯示卡與擴充板卡", keywords: ["主機板", "板卡", "顯示卡"], stockCodes: ["2357", "2376", "2377"] },
  { name: "伺服器組裝", description: "伺服器、AI 整機、機櫃與資料中心系統整合", keywords: ["伺服器組裝", "AI Server", "伺服器ODM", "整櫃", "機櫃"], stockCodes: ["2382", "3231", "6669", "2356", "2324"] },
  { name: "高速傳輸與連接器", description: "高速連接器、線纜、CXL／PCIe 傳輸與介面元件", keywords: ["高速傳輸", "連接器", "線纜", "CXL", "PCIe"], stockCodes: ["3533", "3665", "3003"] },
  { name: "網通與光通訊", description: "交換器、路由器、光通訊模組與射頻元件", keywords: ["網通", "光通訊", "交換器", "路由器", "射頻"], stockCodes: ["2345", "3081", "4979", "5388"] },
  { name: "記憶體與儲存", description: "DRAM、NAND Flash、SSD 與儲存控制產品", keywords: ["記憶體", "DRAM", "NAND", "SSD", "儲存"], stockCodes: ["2408", "2344", "2337", "8299"] },
  { name: "先進製程與封裝", description: "先進製程、CoWoS、晶圓代工與半導體封測", keywords: ["CoWoS", "先進製程", "先進封裝", "封測"], stockCodes: ["2330", "3711", "2449"] },
  { name: "被動元件", description: "電阻、電容、電感與其他被動電子元件", keywords: ["被動元件", "電阻", "電容", "電感"], stockCodes: ["2327", "2492", "3026"] },
  { name: "半導體設備與材料", description: "半導體製程設備、檢測設備、矽晶圓、光阻與特用材料", keywords: ["半導體設備", "設備 / 檢測", "矽晶圓", "光阻", "特氣"], stockCodes: ["3131", "3583", "6187", "6488"] },
  { name: "ETF / 指數型基金", description: "追蹤特定市場、產業或選股指數的指數型基金", keywords: ["ETF", "指數型基金"], stockCodes: ["0050", "0051", "0052", "0053", "0055", "0056", "0057", "0061"] },
];

const STOCK_PRODUCT_PROFILES = {
  "0050": { groups: ["ETF / 指數型基金"], products: "追蹤臺灣 50 指數的大型權值股 ETF" },
  "0051": { groups: ["ETF / 指數型基金"], products: "追蹤臺灣中型 100 指數的 ETF" },
  "0052": { groups: ["ETF / 指數型基金"], products: "追蹤臺灣科技類股指數的 ETF" },
  "0053": { groups: ["ETF / 指數型基金"], products: "追蹤臺灣電子科技類股指數的 ETF" },
  "0055": { groups: ["ETF / 指數型基金"], products: "追蹤 MSCI 臺灣金融指數的 ETF" },
  "0056": { groups: ["ETF / 指數型基金"], products: "追蹤臺灣高股息選股指數的 ETF" },
  "0057": { groups: ["ETF / 指數型基金"], products: "追蹤 MSCI 臺灣指數的 ETF" },
  "0061": { groups: ["ETF / 指數型基金"], products: "追蹤中國 A 股市場指數的 ETF" },
  "3017": { groups: ["散熱與熱管理"], products: "散熱模組、風扇、熱管、均熱板與伺服器液冷零組件" },
  "3324": { groups: ["散熱與熱管理"], products: "散熱模組、熱管、均熱板與伺服器液冷散熱方案" },
  "3653": { groups: ["散熱與熱管理"], products: "均熱片、導線架、電子零組件與伺服器散熱產品" },
  "6230": { groups: ["散熱與熱管理"], products: "筆電與伺服器散熱模組、熱管及相關零組件" },
  "2421": { groups: ["散熱與熱管理"], products: "散熱風扇、馬達與工業及伺服器散熱產品" },
  "3338": { groups: ["散熱與熱管理"], products: "熱管、均熱板與電子設備散熱模組" },
  "3483": { groups: ["散熱與熱管理"], products: "散熱風扇、散熱模組與溫控相關零組件" },
  "8996": { groups: ["散熱與熱管理"], products: "熱交換器、熱能設備與資料中心液冷相關產品" },
  "3037": { groups: ["PCB / 載板"], products: "印刷電路板、HDI 板、軟硬結合板與 IC 載板" },
  "8046": { groups: ["PCB / 載板"], products: "印刷電路板與 IC 載板" },
  "3189": { groups: ["PCB / 載板"], products: "IC 載板與印刷電路板" },
  "3044": { groups: ["PCB / 載板"], products: "印刷電路板與多層板" },
  "2368": { groups: ["PCB / 載板"], products: "伺服器、網通與高階電子產品用印刷電路板" },
  "2308": { groups: ["電源與電源管理", "散熱與熱管理"], products: "電源與能源管理、工業自動化、散熱及資料中心基礎設施方案" },
  "2301": { groups: ["電源與電源管理"], products: "電源供應器、光電元件、車用電子與雲端應用產品" },
  "6412": { groups: ["電源與電源管理"], products: "電源供應器、電源轉換器與雲端設備電源產品" },
  "2357": { groups: ["主機板與板卡"], products: "主機板、電腦、顯示卡與伺服器相關產品" },
  "2376": { groups: ["主機板與板卡"], products: "主機板、顯示卡、伺服器與電競硬體" },
  "2377": { groups: ["主機板與板卡"], products: "主機板、顯示卡、筆電與電競硬體" },
  "2382": { groups: ["伺服器組裝"], products: "筆記型電腦、伺服器、雲端運算與資料中心系統" },
  "3231": { groups: ["伺服器組裝"], products: "資訊通訊產品、伺服器與雲端設備設計製造服務" },
  "6669": { groups: ["伺服器組裝"], products: "雲端資料中心伺服器、儲存與機櫃級運算系統" },
  "2356": { groups: ["伺服器組裝"], products: "伺服器、筆記型電腦與智慧裝置製造服務" },
  "2324": { groups: ["伺服器組裝"], products: "筆記型電腦、智慧裝置與伺服器製造服務" },
  "3533": { groups: ["高速傳輸與連接器"], products: "高速連接器、CPU 插槽與伺服器連接元件" },
  "3665": { groups: ["高速傳輸與連接器"], products: "線束、連接器與高速資料傳輸互連方案" },
  "3003": { groups: ["高速傳輸與連接器"], products: "連接器、端子台與工業控制連接元件" },
  "2345": { groups: ["網通與光通訊"], products: "乙太網路交換器、資料中心網通與寬頻設備" },
  "3081": { groups: ["網通與光通訊"], products: "光通訊雷射元件與磊晶片" },
  "4979": { groups: ["網通與光通訊"], products: "光通訊主動元件、光收發相關晶片與模組" },
  "5388": { groups: ["網通與光通訊"], products: "寬頻網路、無線通訊與物聯網設備" },
  "2408": { groups: ["記憶體與儲存"], products: "DRAM 記憶體產品" },
  "2344": { groups: ["記憶體與儲存"], products: "利基型記憶體、快閃記憶體與邏輯 IC" },
  "2337": { groups: ["記憶體與儲存"], products: "NOR Flash、NAND Flash 與唯讀記憶體" },
  "8299": { groups: ["記憶體與儲存"], products: "NAND Flash 控制晶片與固態儲存解決方案" },
  "2330": { groups: ["先進製程與封裝"], products: "晶圓代工、先進製程與先進封裝服務" },
  "3711": { groups: ["先進製程與封裝"], products: "半導體封裝、測試與電子製造服務" },
  "2449": { groups: ["先進製程與封裝"], products: "半導體晶圓與成品測試服務" },
  "2327": { groups: ["被動元件"], products: "電阻、電容與其他被動電子元件" },
  "2492": { groups: ["被動元件"], products: "積層陶瓷電容、電阻與射頻元件" },
  "3026": { groups: ["被動元件"], products: "積層陶瓷電容與相關被動元件" },
  "3131": { groups: ["半導體設備與材料"], products: "半導體濕製程、清洗與自動化設備" },
  "3583": { groups: ["半導體設備與材料"], products: "半導體製程設備、再生晶圓與廠務服務" },
  "6187": { groups: ["半導體設備與材料"], products: "半導體與電子產業自動化設備" },
  "6488": { groups: ["半導體設備與材料"], products: "半導體矽晶圓" },
};

const INDUSTRY_PRODUCT_DESCRIPTIONS = {
  "半導體產品": "半導體設計、製造、封裝測試或設備材料相關產品",
  "電子零組件產品": "連接器、PCB、電源、被動元件、散熱或其他電子零組件",
  "面板與光電產品": "顯示面板、LED、光學元件、鏡頭或其他光電產品",
  "伺服器與電腦週邊產品": "電腦、伺服器、儲存設備或電腦週邊產品",
  "機械設備與自動化產品": "工業機械、工具機、自動化設備或精密零組件",
  "電子設備與通路服務": "電子設備、系統整合、製造服務或電子產品通路",
  "網通設備與通訊產品": "交換器、路由器、寬頻、無線通訊或光通訊產品",
  "生技醫療產品": "藥品、醫材、檢測、醫療服務或生技相關產品",
  "綜合製造與服務": "公司公告之主要製造產品或專業服務",
  "營建與工程服務": "住宅、商辦、營造、工程承攬或建材服務",
  "觀光餐飲服務": "旅宿、餐飲、觀光休閒或相關服務",
  "軟體與資訊服務": "軟體、雲端、資訊系統整合或數位服務",
  "紡織纖維產品": "纖維、紗線、布料、成衣或機能性紡織品",
  "鋼鐵材料產品": "鋼材、不鏽鋼、特殊合金或鋼鐵加工產品",
  "化工材料產品": "化學品、樹脂、特用材料或工業化工產品",
  "金融保險服務": "銀行、證券、保險、租賃或其他金融服務",
  "車用零組件與移動產品": "車輛、車用電子、汽車零組件或移動服務",
  "食品與農產產品": "食品加工、飲料、飼料或農產相關產品",
  "電子通路服務": "電子零組件、半導體或資訊產品代理與通路服務",
  "運輸物流服務": "海空運輸、倉儲、物流或交通相關服務",
  "內容娛樂服務": "遊戲、影音、媒體、出版或數位內容服務",
  "塑膠材料產品": "塑膠原料、塑膠加工品或高分子材料",
  "貿易百貨服務": "商品貿易、零售、百貨或生活消費服務",
  "電力設備與線纜產品": "電線電纜、變壓器、配電或電力設備",
  "能源與電力服務": "發電、再生能源、儲能或能源管理服務",
  "橡膠材料產品": "輪胎、工業橡膠或橡膠加工產品",
  "農業科技產品": "農業生產、種苗、農業資材或農業科技服務",
  "造紙包材產品": "紙漿、紙品、紙器或包裝材料",
  "水泥建材產品": "水泥、預拌混凝土、石材或建築材料",
  "玻璃陶瓷材料產品": "玻璃、陶瓷或相關無機材料產品",
  "未分類": "公司公告之主要產品與服務（尚待補入更細產品分類）",
};

function inferProductPeerGroups(row) {
  const profileGroups = STOCK_PRODUCT_PROFILES[String(row.stock_code || "")]?.groups || [];
  if (profileGroups.length) return profileGroups;
  const text = [
    row.major_products,
    row.theme_reason,
  ].filter(Boolean).join(" ");
  const keywordMatches = PRODUCT_PEER_GROUP_RULES.filter((rule) => rule.keywords.some((keyword) => text.includes(keyword))).map((rule) => rule.name);
  return uniqueLabels(keywordMatches);
}

function stockProductDescription(row) {
  const profile = STOCK_PRODUCT_PROFILES[String(row.stock_code || "")];
  if (profile?.products) return profile.products;
  const majorProducts = String(row.major_products || "").trim();
  if (majorProducts) return majorProducts;
  const groups = inferProductPeerGroups(row);
  const descriptions = groups.map((group) => PRODUCT_PEER_GROUP_RULES.find((rule) => rule.name === group)?.description).filter(Boolean);
  if (descriptions.length) return uniqueLabels(descriptions).join("；");
  const rawIndustry = String(row.industry_name || "").trim();
  const industry = /^\d+$/.test(rawIndustry) ? inferApplicationName(rawIndustry, row.industry_code) : rawIndustry;
  if (INDUSTRY_PRODUCT_DESCRIPTIONS[industry]) return `${row.stock_name || row.stock_code || "本公司"}主要產品與服務涵蓋：${INDUSTRY_PRODUCT_DESCRIPTIONS[industry]}`;
  const theme = String(row.theme_name || "").trim();
  if (theme) return `${theme}相關產品與服務`;
  return industry && !/^\d+$/.test(industry) ? `${industry}相關產品與服務` : "公司主要產品與服務請參考公開資訊觀測站";
}

function stockPayload(row, options = {}) {
  const includeProductDescriptions = options.includeProductDescriptions !== false;
  const displayIndustryName = /^\d+$/.test(String(row.industry_name || ""))
    ? officialIndustryName(row.industry_code, "未分類")
    : row.industry_name;
  return {
    stock_id: row.id,
    stock_code: row.stock_code,
    stock_name: row.stock_name,
    market_type: row.market_type,
    instrument_type: row.instrument_type || detectInstrumentType(row),
    industry_code: row.industry_code,
    industry_name: displayIndustryName,
    company_type: row.company_type,
    trade_date: row.trade_date,
    close_price: row.close_price,
    change_percent: row.change_percent,
    volume: row.volume,
    turnover_value: row.turnover_value,
    total_institutional_net_buy: row.total_institutional_net_buy,
    institutional_net_amount: flowAmount(row),
    revenue_year: row.revenue_year,
    revenue_month: row.revenue_month,
    yoy_growth_percent: row.yoy_growth_percent,
    eps: row.eps,
    total_score: row.total_score,
    status: row.status,
    source: row.source,
    source_url: row.source_url,
    last_updated_at: row.last_updated_at,
    confidence_score: row.confidence_score,
    evidence_type: row.evidence_type,
    evidence_url: row.evidence_url,
    review_status: row.review_status,
    product_groups: inferProductPeerGroups(row),
    product_description: includeProductDescriptions ? stockProductDescription(row) : (row.major_products || row.theme_reason || ""),
    tags: [],
    roles: [],
  };
}

function buildStockTree(rows, options = {}) {
  const applicationLimit = clampInt(options.applicationLimit, 20, 1, 80);
  const industryLimit = clampInt(options.industryLimit, 16, 1, 80);
  const peerLimit = clampInt(options.peerLimit, 12, 1, 80);
  const applications = new Map();
  const allStocks = new Set();
  const industryKeys = new Set();
  let exposureCount = 0;

  for (const row of rows) {
    allStocks.add(row.id);
    const rawIndustryName = row.industry_name || "未分類";
    const industryName = /^\d+$/.test(String(rawIndustryName))
      ? officialIndustryName(row.industry_code, "未分類")
      : rawIndustryName;
    const applicationName = officialSectorName(row.industry_code);
    const industryKey = `${row.industry_code || "UNKNOWN"}:${industryName}`;
    const themeName = row.theme_name || industryName || "未標籤";
    industryKeys.add(industryKey);

    if (!applications.has(applicationName)) {
      applications.set(applicationName, {
        application: applicationName,
        stock_ids: new Set(),
        exposure_count: 0,
        theme_tags: [],
        industry_map: new Map(),
      });
    }
    const application = applications.get(applicationName);
    application.stock_ids.add(row.id);
    addUnique(application.theme_tags, themeName);

    if (!application.industry_map.has(industryKey)) {
      application.industry_map.set(industryKey, {
        industry_code: row.industry_code,
        industry_name: industryName,
        market_types: [],
        stock_ids: new Set(),
        exposure_count: 0,
        theme_tags: [],
        theme_map: new Map(),
        peer_map: new Map(),
      });
    }
    const industry = application.industry_map.get(industryKey);
    industry.stock_ids.add(row.id);
    addUnique(industry.market_types, row.market_type);
    addUnique(industry.theme_tags, themeName);
    addUnique(industry.theme_tags, row.role_type);

    const themeKey = row.theme_id || `industry:${industryKey}`;
    if (!industry.theme_map.has(themeKey)) {
      industry.theme_map.set(themeKey, {
        theme_id: row.theme_id,
        theme_name: themeName,
        description: row.theme_description,
        total_theme_score: row.total_theme_score,
        rank: row.theme_rank,
        status: row.theme_status,
        relation_strengths: [],
        stock_ids: new Set(),
      });
    }
    const theme = industry.theme_map.get(themeKey);
    addUnique(theme.relation_strengths, row.relation_strength);
    theme.stock_ids.add(row.id);

    if (!industry.peer_map.has(row.id)) industry.peer_map.set(row.id, stockPayload(row, options));
    const stock = industry.peer_map.get(row.id);
    addUnique(stock.tags, themeName);
    if (row.role_type) {
      addUnique(stock.tags, row.role_type);
      stock.roles.push({
        theme_name: themeName,
        role_type: row.role_type,
        role_description: row.role_description,
        major_products: row.major_products,
        major_customers: row.major_customers,
        confidence_score: row.confidence_score,
      });
    }
  }

  const data = [...applications.values()].map((application) => {
    const industries = [...application.industry_map.values()].map((industry) => {
      const peers = [...industry.peer_map.values()].sort(
        (a, b) => stockPopularity(b) - stockPopularity(a) || String(a.stock_code).localeCompare(String(b.stock_code)),
      );
      const themes = [...industry.theme_map.values()].map((theme) => ({
        ...theme,
        stock_count: theme.stock_ids.size,
        stock_ids: undefined,
      })).map(({ stock_ids, ...theme }) => theme).sort((a, b) => Number(b.total_theme_score || 0) - Number(a.total_theme_score || 0));
      return {
        industry_code: industry.industry_code,
        industry_name: industry.industry_name,
        market_types: industry.market_types,
        stock_count: industry.stock_ids.size,
        exposure_count: peers.length,
        popularity_score: peers.reduce((sum, stock) => sum + stockPopularity(stock), 0),
        theme_tags: industry.theme_tags,
        themes,
        peers: peers.slice(0, peerLimit),
      };
    }).sort((a, b) => b.popularity_score - a.popularity_score || b.stock_count - a.stock_count || a.industry_name.localeCompare(b.industry_name, "zh-Hant"))
      .slice(0, industryLimit);

    return {
      application: application.application,
      stock_count: application.stock_ids.size,
      industry_count: industries.length,
      exposure_count: industries.reduce((sum, industry) => sum + industry.exposure_count, 0),
      popularity_score: industries.reduce((sum, industry) => sum + Number(industry.popularity_score || 0), 0),
      theme_tags: application.theme_tags,
      industries,
    };
  }).sort((a, b) => b.popularity_score - a.popularity_score || b.stock_count - a.stock_count || b.exposure_count - a.exposure_count)
    .slice(0, applicationLimit);

  return {
    taxonomy_version: TAXONOMY_VERSION,
    applications: data,
    totals: {
      stock_count: allStocks.size,
      application_count: data.length,
      industry_count: industryKeys.size,
      exposure_count: exposureCount || data.reduce((sum, item) => sum + item.exposure_count, 0),
    },
  };
}

async function listStockTree(db, options = {}) {
  const rowLimit = clampInt(options.rowLimit, 800, 50, 1000);
  const rowOffset = clampInt(options.rowOffset, 0, 0, 200000);
  const { results } = await db.prepare(`
    with latest_price as (
      select max(trade_date) as trade_date from daily_prices
    ),
    stock_universe as (
      select s.*
      from stocks s
      left join daily_prices universe_price
        on universe_price.stock_id = s.id
        and universe_price.trade_date = (select trade_date from latest_price)
      where s.instrument_type = 'stock'
      order by coalesce(universe_price.turnover_value, 0) desc, s.stock_code
      limit ?
      offset ?
    )
    select
      s.id,
      s.stock_code,
      s.stock_name,
      s.market_type,
      s.instrument_type,
      s.industry_code,
      coalesce(s.industry_name, '未分類') as industry_name,
      s.company_type,
      s.source,
      s.source_url,
      s.last_updated_at,
      t.id as theme_id,
      t.theme_name,
      t.theme_category as application_name,
      t.description as theme_description,
      st.relation_strength,
      st.reason as theme_reason,
      st.confidence_score,
      st.evidence_type,
      st.evidence_url,
      st.review_status,
      scr.role_type,
      scr.role_description,
      scr.major_products,
      scr.major_customers,
      scr.confidence_score as role_confidence_score,
      ts.total_theme_score,
      ts.rank as theme_rank,
      ts.status as theme_status,
      dp.trade_date,
      dp.close_price,
      dp.change_percent,
      dp.volume,
      dp.turnover_value,
      ifl.total_institutional_net_buy,
      mr.revenue_year,
      mr.revenue_month,
      mr.yoy_growth_percent,
      fr.eps,
      ss.total_score,
      ss.status
    from stock_universe s
    left join stock_themes st on st.stock_id = s.id and (st.review_status = 'approved' or st.confidence_score >= 80)
    left join themes t on t.id = st.theme_id
    left join theme_scores ts on ts.theme_id = t.id and ts.score_date = (
      select max(score_date) from theme_scores where theme_id = t.id
    )
    left join supply_chain_roles scr on scr.stock_id = s.id and scr.theme_id = t.id
    left join daily_prices dp on dp.stock_id = s.id and dp.trade_date = (
      select max(trade_date) from daily_prices where stock_id = s.id
    )
    left join institutional_flows ifl on ifl.stock_id = s.id and ifl.trade_date = (
      select max(trade_date) from institutional_flows where stock_id = s.id
    )
    left join monthly_revenue mr on mr.stock_id = s.id and (mr.revenue_year || '-' || printf('%02d', mr.revenue_month)) = (
      select revenue_year || '-' || printf('%02d', revenue_month)
      from monthly_revenue where stock_id = s.id
      order by revenue_year desc, revenue_month desc limit 1
    )
    left join financial_reports fr on fr.stock_id = s.id and (fr.fiscal_year || '-' || fr.quarter) = (
      select fiscal_year || '-' || quarter
      from financial_reports where stock_id = s.id
      order by fiscal_year desc, quarter desc limit 1
    )
    left join stock_scores ss on ss.stock_id = s.id
      and ss.score_date = (select max(trade_date) from daily_prices)
    order by
      coalesce(t.theme_category, s.industry_name, '其他產品與服務'),
      coalesce(s.industry_name, '未分類'),
      coalesce(ts.total_theme_score, 0) desc,
      s.stock_code asc
  `).bind(rowLimit, rowOffset).all();
  return buildStockTree(results, options);
}

async function listThemeTree(db, options = {}) {
  const themeLimit = clampInt(options.themeLimit, 18, 1, 24);
  const themeOffset = clampInt(options.themeOffset, 0, 0, 1000);
  const industriesPerTheme = clampInt(options.industriesPerTheme, 5, 1, 12);
  const stocksPerIndustry = clampInt(options.stocksPerIndustry, 8, 1, 20);
  const includeDescriptions = options.includeDescriptions !== false;
  const includeProductDescriptions = options.includeProductDescriptions === true;
  const { results } = await db.prepare(`
    with latest_score as (
      select max(score_date) as score_date from theme_scores
    ),
    latest_price as (
      select max(trade_date) as trade_date from daily_prices
    ),
    ranked_themes as (
      select
        ts.*,
        t.theme_name,
        t.theme_category,
        t.description
      from theme_scores ts
      join themes t on t.id = ts.theme_id
      where ts.score_date = (select score_date from latest_score)
        and ts.score_date = (select trade_date from latest_price)
      order by ts.rank asc, ts.total_theme_score desc
      limit ?
      offset ?
    )
    select
      rt.*,
      s.stock_code,
      s.stock_name,
      s.market_type,
      s.instrument_type,
      s.industry_code,
      coalesce(s.industry_name, '未分類') as industry_name,
      st.relation_strength,
      st.reason as relation_reason,
      st.confidence_score,
      st.evidence_type,
      st.evidence_url,
      st.review_status,
      scr.role_type,
      scr.role_description,
      scr.major_products,
      dp.close_price,
      dp.change_percent,
      dp.turnover_value,
      ss.total_score as stock_score,
      ss.status as stock_status
    from ranked_themes rt
    left join stock_themes st on st.theme_id = rt.theme_id and (st.review_status = 'approved' or st.confidence_score >= 80)
    left join stocks s on s.id = st.stock_id and s.instrument_type = 'stock'
    left join supply_chain_roles scr on scr.stock_id = s.id and scr.theme_id = rt.theme_id
    left join daily_prices dp on dp.stock_id = s.id and dp.trade_date = (
      select max(trade_date) from daily_prices where stock_id = s.id
    )
    left join stock_scores ss on ss.stock_id = s.id
      and ss.score_date = (select max(trade_date) from daily_prices)
    order by
      rt.theme_category,
      rt.rank asc,
      rt.total_theme_score desc,
      coalesce(s.industry_name, '未分類'),
      s.stock_code asc
  `).bind(themeLimit, themeOffset).all();

  const groups = new Map();
  for (const row of results) {
    const category = row.theme_category || "其他";
    if (!groups.has(category)) groups.set(category, { category, theme_map: new Map() });
    const group = groups.get(category);
    if (!group.theme_map.has(row.theme_id)) {
      group.theme_map.set(row.theme_id, {
        theme_id: row.theme_id,
        theme_name: row.theme_name,
        theme_category: category,
        description: includeDescriptions ? row.description : undefined,
        score_date: row.score_date,
        turnover_score: row.turnover_score,
        institutional_score: row.institutional_score,
        momentum_score: row.momentum_score,
        fundamental_score: row.fundamental_score,
        news_score: row.news_score,
        total_theme_score: row.total_theme_score,
        rank: row.rank,
        status: row.status,
        reason: row.reason,
        industry_map: new Map(),
        stock_ids: new Set(),
      });
    }
    const theme = group.theme_map.get(row.theme_id);
    if (!row.stock_code) continue;
    const rawIndustryName = row.industry_name || "未分類";
    const industryName = /^\d+$/.test(String(rawIndustryName))
      ? officialIndustryName(row.industry_code, "未分類")
      : rawIndustryName;
    const productGroups = inferProductPeerGroups(row);
    const industryKey = `${row.industry_code || "UNKNOWN"}:${industryName}`;
    if (!theme.industry_map.has(industryKey)) {
      theme.industry_map.set(industryKey, {
        industry_code: row.industry_code,
        industry_name: industryName,
        market_types: [],
        tags: [],
        stocks: [],
        stock_ids: new Set(),
      });
    }
    const industry = theme.industry_map.get(industryKey);
    addUnique(industry.market_types, row.market_type);
    addUnique(industry.tags, row.theme_name);
    addUnique(industry.tags, row.role_type);
    addUnique(industry.tags, row.relation_strength);
    if (!industry.stock_ids.has(row.stock_code)) {
      industry.stock_ids.add(row.stock_code);
      theme.stock_ids.add(row.stock_code);
      industry.stocks.push({
        stock_code: row.stock_code,
        stock_name: row.stock_name,
        market_type: row.market_type,
        relation_strength: row.relation_strength,
        confidence_score: row.confidence_score,
        evidence_type: row.evidence_type,
        evidence_url: row.evidence_url,
        review_status: row.review_status,
        role_type: row.role_type,
        close_price: row.close_price,
        change_percent: row.change_percent,
        turnover_value: row.turnover_value,
        total_score: row.stock_score,
        status: row.stock_status,
        product_groups: productGroups,
        product_description: includeProductDescriptions ? stockProductDescription(row) : (row.major_products || row.relation_reason || ""),
      });
    }
  }

  return [...groups.values()].map((group) => {
    const themes = [...group.theme_map.values()].map((theme) => {
      const industries = [...theme.industry_map.values()].map((industry) => {
        const stocks = industry.stocks
          .sort((a, b) => Number(b.turnover_value || 0) - Number(a.turnover_value || 0))
          .slice(0, stocksPerIndustry);
        return {
          industry_code: industry.industry_code,
          industry_name: industry.industry_name,
          market_types: industry.market_types,
          tags: industry.tags,
          stock_count: industry.stock_ids.size,
          stocks,
        };
      }).sort((a, b) => b.stock_count - a.stock_count || a.industry_name.localeCompare(b.industry_name, "zh-Hant"))
        .slice(0, industriesPerTheme);
      return {
        ...theme,
        stock_count: theme.stock_ids.size,
        industry_count: industries.length,
        industries,
        industry_map: undefined,
        stock_ids: undefined,
      };
    }).map(({ industry_map, stock_ids, ...theme }) => theme).sort((a, b) => Number(b.total_theme_score || 0) - Number(a.total_theme_score || 0));

    return {
      category: group.category,
      count: themes.length,
      top_score: themes[0]?.total_theme_score ?? null,
      stock_count: themes.reduce((sum, theme) => sum + Number(theme.stock_count || 0), 0),
      themes,
    };
  }).sort((a, b) => Number(b.top_score || 0) - Number(a.top_score || 0));
}

function emptyFlow() {
  return {
    foreign_investor_net_buy: 0,
    investment_trust_net_buy: 0,
    dealer_net_buy: 0,
    total_institutional_net_buy: 0,
    foreign_investor_net_amount: 0,
    investment_trust_net_amount: 0,
    dealer_net_amount: 0,
    total_institutional_net_amount: 0,
  };
}

function addFlow(target, row) {
  const close = Number(row.close_price || 0);
  target.foreign_investor_net_buy += Number(row.foreign_investor_net_buy || 0);
  target.investment_trust_net_buy += Number(row.investment_trust_net_buy || 0);
  target.dealer_net_buy += Number(row.dealer_net_buy || 0);
  target.total_institutional_net_buy += Number(row.total_institutional_net_buy || 0);
  target.foreign_investor_net_amount += Number(row.foreign_investor_net_buy || 0) * 1000 * close;
  target.investment_trust_net_amount += Number(row.investment_trust_net_buy || 0) * 1000 * close;
  target.dealer_net_amount += Number(row.dealer_net_buy || 0) * 1000 * close;
  target.total_institutional_net_amount += Number(row.total_institutional_net_buy || 0) * 1000 * close;
}

function addPreviousFlow(target, row) {
  const close = Number(row.previous_close_price || row.close_price || 0);
  target.foreign_investor_net_buy += Number(row.previous_foreign_investor_net_buy || 0);
  target.investment_trust_net_buy += Number(row.previous_investment_trust_net_buy || 0);
  target.dealer_net_buy += Number(row.previous_dealer_net_buy || 0);
  target.total_institutional_net_buy += Number(row.previous_total_institutional_net_buy || 0);
  target.foreign_investor_net_amount += Number(row.previous_foreign_investor_net_buy || 0) * 1000 * close;
  target.investment_trust_net_amount += Number(row.previous_investment_trust_net_buy || 0) * 1000 * close;
  target.dealer_net_amount += Number(row.previous_dealer_net_buy || 0) * 1000 * close;
  target.total_institutional_net_amount += Number(row.previous_total_institutional_net_buy || 0) * 1000 * close;
}

function flowTrend(currentFlow, previousFlow, keys = ["total_institutional_net_amount"]) {
  const current = keys.reduce((sum, key) => sum + Number(currentFlow?.[key] || 0), 0);
  const previous = keys.reduce((sum, key) => sum + Number(previousFlow?.[key] || 0), 0);
  const change = current - previous;
  const threshold = Math.max(1000000, Math.abs(previous) * 0.005);
  const status = Math.abs(change) <= threshold ? "持平" : change > 0 ? "增長" : "衰退";
  return {
    status,
    current_amount: current,
    previous_amount: previous,
    change_amount: change,
    change_percent: previous ? (change / Math.abs(previous)) * 100 : null,
  };
}

function stockFlow(row, options = {}) {
  const includeProductDescriptions = options.includeProductDescriptions !== false;
  const displayIndustryName = /^\d+$/.test(String(row.industry_name || ""))
    ? officialIndustryName(row.industry_code, "未分類")
    : row.industry_name;
  return {
    stock_code: row.stock_code,
    stock_name: row.stock_name,
    market_type: row.market_type,
    instrument_type: row.instrument_type || detectInstrumentType(row),
    industry_code: row.industry_code,
    industry_name: displayIndustryName,
    application_name: officialSectorName(row.industry_code),
    theme_name: row.theme_name,
    relation_strength: row.relation_strength,
    role_type: row.role_type,
    trade_date: row.trade_date,
    foreign_investor_net_buy: row.foreign_investor_net_buy,
    investment_trust_net_buy: row.investment_trust_net_buy,
    dealer_net_buy: row.dealer_net_buy,
    total_institutional_net_buy: row.total_institutional_net_buy,
    foreign_investor_net_amount: Number(row.foreign_investor_net_buy || 0) * 1000 * Number(row.close_price || 0),
    investment_trust_net_amount: Number(row.investment_trust_net_buy || 0) * 1000 * Number(row.close_price || 0),
    dealer_net_amount: Number(row.dealer_net_buy || 0) * 1000 * Number(row.close_price || 0),
    total_institutional_net_amount: flowAmount(row),
    previous_trade_date: row.previous_trade_date,
    previous_foreign_investor_net_amount: Number(row.previous_foreign_investor_net_buy || 0) * 1000 * Number(row.previous_close_price || row.close_price || 0),
    previous_investment_trust_net_amount: Number(row.previous_investment_trust_net_buy || 0) * 1000 * Number(row.previous_close_price || row.close_price || 0),
    previous_dealer_net_amount: Number(row.previous_dealer_net_buy || 0) * 1000 * Number(row.previous_close_price || row.close_price || 0),
    previous_total_institutional_net_amount: Number(row.previous_total_institutional_net_buy || 0) * 1000 * Number(row.previous_close_price || row.close_price || 0),
    close_price: row.close_price,
    change_percent: row.change_percent,
    turnover_value: row.turnover_value,
    total_score: row.total_score,
    status: row.status,
    product_groups: inferProductPeerGroups(row),
    product_description: includeProductDescriptions ? stockProductDescription(row) : (row.major_products || row.theme_name || ""),
    tags: uniqueLabels([row.theme_name, row.role_type, row.industry_name]),
  };
}

function buildInstitutionalTree(rows, options = {}) {
  const applicationLimit = clampInt(options.applicationLimit, 12, 1, 60);
  const industryLimit = clampInt(options.industryLimit, 10, 1, 60);
  const peerLimit = clampInt(options.peerLimit, 10, 1, 80);
  const applications = new Map();
  const seenTotal = new Set();
  const totals = emptyFlow();
  const previousTotals = emptyFlow();
  let latestTradeDate = null;
  let previousTradeDate = null;

  for (const row of rows) {
    if (!seenTotal.has(row.id)) {
      addFlow(totals, row);
      addPreviousFlow(previousTotals, row);
      seenTotal.add(row.id);
    }
    if (row.trade_date && (!latestTradeDate || row.trade_date > latestTradeDate)) latestTradeDate = row.trade_date;
    if (row.previous_trade_date && (!previousTradeDate || row.previous_trade_date > previousTradeDate)) previousTradeDate = row.previous_trade_date;

    const rawIndustryName = row.industry_name || "未分類";
    const industryName = /^\d+$/.test(String(rawIndustryName))
      ? officialIndustryName(row.industry_code, "未分類")
      : rawIndustryName;
    const applicationName = officialSectorName(row.industry_code);
    const industryKey = `${row.industry_code || "UNKNOWN"}:${industryName}`;
    if (!applications.has(applicationName)) {
      applications.set(applicationName, {
        application: applicationName,
        flow: emptyFlow(),
        previous_flow: emptyFlow(),
        stock_ids: new Set(),
        industry_map: new Map(),
      });
    }
    const application = applications.get(applicationName);
    if (!application.industry_map.has(industryKey)) {
      application.industry_map.set(industryKey, {
        industry_code: row.industry_code,
        industry_name: industryName,
        flow: emptyFlow(),
        previous_flow: emptyFlow(),
        stock_ids: new Set(),
        tags: [],
        peer_map: new Map(),
      });
    }
    const industry = application.industry_map.get(industryKey);

    if (!application.stock_ids.has(row.id)) {
      addFlow(application.flow, row);
      addPreviousFlow(application.previous_flow, row);
      application.stock_ids.add(row.id);
    }
    if (!industry.stock_ids.has(row.id)) {
      addFlow(industry.flow, row);
      addPreviousFlow(industry.previous_flow, row);
      industry.stock_ids.add(row.id);
    }
    for (const tag of [row.theme_name, row.role_type, industryName]) addUnique(industry.tags, tag);
    if (!industry.peer_map.has(row.id)) industry.peer_map.set(row.id, stockFlow(row, options));
  }

  const data = [...applications.values()].map((application) => {
    const industries = [...application.industry_map.values()].map((industry) => ({
      industry_code: industry.industry_code,
      industry_name: industry.industry_name,
      flow: industry.flow,
      previous_flow: industry.previous_flow,
      trend: flowTrend(industry.flow, industry.previous_flow),
      stock_count: industry.stock_ids.size,
      tags: industry.tags,
      popularity_score: Math.abs(Number(industry.flow.total_institutional_net_amount || 0)) + [...industry.peer_map.values()].reduce((sum, stock) => sum + stockPopularity(stock), 0),
      peers: [...industry.peer_map.values()]
        .sort((a, b) => Math.abs(Number(b.total_institutional_net_amount || 0)) - Math.abs(Number(a.total_institutional_net_amount || 0)) || stockPopularity(b) - stockPopularity(a))
        .slice(0, peerLimit),
    })).sort((a, b) => b.popularity_score - a.popularity_score || Math.abs(Number(b.flow.total_institutional_net_amount || 0)) - Math.abs(Number(a.flow.total_institutional_net_amount || 0)))
      .slice(0, industryLimit);
    return {
      application: application.application,
      flow: application.flow,
      previous_flow: application.previous_flow,
      trend: flowTrend(application.flow, application.previous_flow),
      stock_count: application.stock_ids.size,
      industry_count: industries.length,
      popularity_score: Math.abs(Number(application.flow.total_institutional_net_amount || 0)) + industries.reduce((sum, industry) => sum + Number(industry.popularity_score || 0), 0),
      industries,
    };
  }).sort((a, b) => b.popularity_score - a.popularity_score || Math.abs(Number(b.flow.total_institutional_net_amount || 0)) - Math.abs(Number(a.flow.total_institutional_net_amount || 0)))
    .slice(0, applicationLimit);

  return {
    taxonomy_version: TAXONOMY_VERSION,
    trade_date: latestTradeDate,
    previous_trade_date: previousTradeDate,
    totals,
    previous_totals: previousTotals,
    trend: flowTrend(totals, previousTotals),
    stock_count: seenTotal.size,
    applications: data,
  };
}

async function listInstitutionalTree(db, options = {}) {
  const stockLimit = clampInt(options.stockLimit, 260, 20, 400);
  const stockOffset = clampInt(options.stockOffset, 0, 0, 200000);
  const { results: flowDates } = await db.prepare(`
    select distinct trade_date
    from institutional_flows
    order by trade_date desc
    limit 2
  `).all();
  const latestDate = flowDates[0]?.trade_date || null;
  const previousDate = flowDates[1]?.trade_date || null;
  if (!latestDate) return buildInstitutionalTree([], options);
  const { results } = await db.prepare(`
    with flow_universe as (
      select ifl.*
      from institutional_flows ifl
      left join daily_prices latest_dp on latest_dp.stock_id = ifl.stock_id and latest_dp.trade_date = (
        select max(trade_date) from daily_prices where stock_id = ifl.stock_id
      )
      where ifl.trade_date = ?
      order by abs(ifl.total_institutional_net_buy * 1000 * coalesce(latest_dp.close_price, 0)) desc,
        abs(ifl.total_institutional_net_buy) desc
      limit ?
      offset ?
    )
    select
      s.id,
      s.stock_code,
      s.stock_name,
      s.market_type,
      s.instrument_type,
      s.industry_code,
      coalesce(s.industry_name, '未分類') as industry_name,
      t.theme_category as application_name,
      t.theme_name,
      st.relation_strength,
      scr.role_type,
      scr.role_description,
      scr.major_products,
      ifl.trade_date,
      ifl.foreign_investor_net_buy,
      ifl.investment_trust_net_buy,
      ifl.dealer_net_buy,
      ifl.total_institutional_net_buy,
      pif.trade_date as previous_trade_date,
      pif.foreign_investor_net_buy as previous_foreign_investor_net_buy,
      pif.investment_trust_net_buy as previous_investment_trust_net_buy,
      pif.dealer_net_buy as previous_dealer_net_buy,
      pif.total_institutional_net_buy as previous_total_institutional_net_buy,
      dp.close_price,
      pdp.close_price as previous_close_price,
      dp.change_percent,
      dp.turnover_value,
      ss.total_score,
      ss.status
    from stocks s
    join flow_universe ifl on ifl.stock_id = s.id
    left join institutional_flows pif on pif.stock_id = s.id and pif.trade_date = ?
    left join stock_themes st on st.stock_id = s.id and (st.review_status = 'approved' or st.confidence_score >= 80)
    left join themes t on t.id = st.theme_id
    left join supply_chain_roles scr on scr.stock_id = s.id and scr.theme_id = t.id
    left join daily_prices dp on dp.stock_id = s.id and dp.trade_date = (
      select max(trade_date) from daily_prices where stock_id = s.id
    )
    left join daily_prices pdp on pdp.stock_id = s.id and pdp.trade_date = pif.trade_date
    left join stock_scores ss on ss.stock_id = s.id
      and ss.score_date = (select max(trade_date) from daily_prices)
    where s.instrument_type = 'stock'
    order by
      coalesce(t.theme_category, s.industry_name, '其他產品與服務'),
      coalesce(s.industry_name, '未分類'),
      ifl.total_institutional_net_buy desc,
      s.stock_code asc
  `).bind(latestDate, stockLimit, stockOffset, previousDate).all();
  return buildInstitutionalTree(results, options);
}

async function listThemeStocks(db, themeId) {
  const theme = await db.prepare("select * from themes where id = ?").bind(themeId).first();
  if (!theme) return null;
  const { results } = await db.prepare(`
    select
      s.stock_code,
      s.stock_name,
      s.market_type,
      s.industry_code,
      s.industry_name,
      st.relation_strength,
      st.reason,
      st.confidence_score,
      st.evidence_type,
      st.evidence_url,
      st.review_status,
      scr.role_type,
      scr.role_description,
      scr.major_products,
      scr.major_customers,
      scr.confidence_score,
      dp.trade_date,
      dp.close_price,
      dp.change_percent,
      dp.volume,
      dp.turnover_value
    from stock_themes st
    join stocks s on s.id = st.stock_id
    left join supply_chain_roles scr on scr.stock_id = s.id and scr.theme_id = st.theme_id
    left join daily_prices dp on dp.stock_id = s.id and dp.trade_date = (
      select max(trade_date) from daily_prices where stock_id = s.id
    )
    where st.theme_id = ?
      and s.instrument_type = 'stock'
      and (st.review_status = 'approved' or st.confidence_score >= 80)
    order by
      case st.relation_strength when '強' then 1 when '中' then 2 else 3 end,
      coalesce(dp.turnover_value, 0) desc,
      s.stock_code asc
  `).bind(themeId).all();
  return {
    theme,
    stocks: results.map((row) => ({
      ...row,
      product_groups: inferProductPeerGroups(row),
      product_description: stockProductDescription(row),
    })),
  };
}

async function listStatus(db) {
  const { results } = await db.prepare("select * from data_update_status order by data_type").all();
  return results;
}

async function listClassificationQuality(db) {
  const requiredRevenuePeriod = requiredMopsRevenuePeriod();
  const requiredRevenueKey = requiredRevenuePeriod.year * 100 + requiredRevenuePeriod.month;
  const requiredRevenueDate = `${requiredRevenuePeriod.year}-${String(requiredRevenuePeriod.month).padStart(2, "0")}-01`;
  const [
    stockSummary,
    industryRows,
    themeSummary,
    datasetCoverage,
    qualityRows,
    latestDates,
  ] = await Promise.all([
    db.prepare(`
      select
        count(*) as total,
        sum(case when instrument_type = 'stock' then 1 else 0 end) as common_stocks,
        sum(case when instrument_type = 'etf' then 1 else 0 end) as etfs,
        sum(case when instrument_type = 'tdr' then 1 else 0 end) as tdrs,
        sum(case when instrument_type = 'emerging' then 1 else 0 end) as emerging_stocks,
        sum(case
          when industry_name is null or industry_name = '未分類'
            or (industry_name <> '' and industry_name not glob '*[^0-9]*')
          then 1 else 0
        end) as invalid_industry_names
      from stocks
    `).first(),
    db.prepare(`
      select industry_code, industry_name, count(*) as stock_count
      from stocks
      where instrument_type = 'stock'
      group by industry_code, industry_name
      order by industry_code
    `).all(),
    db.prepare(`
      select
        count(*) as total_links,
        sum(case when review_status = 'approved' or confidence_score >= ? then 1 else 0 end) as public_links,
        sum(case when review_status = 'pending' and confidence_score between 60 and ? then 1 else 0 end) as pending_links,
        sum(case when confidence_score < 60 then 1 else 0 end) as rejected_by_threshold,
        count(distinct case when review_status = 'approved' or confidence_score >= ? then stock_id end) as public_stocks
      from stock_themes
    `).bind(PUBLIC_CLASSIFICATION_CONFIDENCE, PUBLIC_CLASSIFICATION_CONFIDENCE - 1, PUBLIC_CLASSIFICATION_CONFIDENCE).first(),
    db.prepare(`
      with
      price_latest as (
        select s.market_type, max(dp.trade_date) as latest_data_date
        from daily_prices dp join stocks s on s.id = dp.stock_id
        group by s.market_type
      ),
      institutional_latest as (
        select s.market_type, max(ifl.trade_date) as latest_data_date
        from institutional_flows ifl join stocks s on s.id = ifl.stock_id
        group by s.market_type
      ),
      revenue_latest as (
        select s.market_type, max(mr.revenue_year * 100 + mr.revenue_month) as latest_period
        from monthly_revenue mr join stocks s on s.id = mr.stock_id
        group by s.market_type
      )
      select 'daily_price' as data_type, s.market_type,
        count(distinct dp.stock_id) as covered_stocks,
        count(distinct s.id) as expected_stocks,
        pl.latest_data_date
      from stocks s
      left join price_latest pl on pl.market_type = s.market_type
      left join daily_prices dp on dp.stock_id = s.id and dp.trade_date = pl.latest_data_date
      where s.instrument_type in ('stock', 'emerging')
      group by s.market_type
      union all
      select 'institutional_flow', s.market_type,
        count(distinct ifl.stock_id), count(distinct s.id), il.latest_data_date
      from stocks s
      left join institutional_latest il on il.market_type = s.market_type
      left join institutional_flows ifl on ifl.stock_id = s.id and ifl.trade_date = il.latest_data_date
      where s.instrument_type = 'stock'
      group by s.market_type
      union all
      select 'monthly_revenue', s.market_type,
        count(distinct mr.stock_id), count(distinct s.id),
        ? as latest_data_date
      from stocks s
      left join monthly_revenue mr on mr.stock_id = s.id
        and (mr.revenue_year * 100 + mr.revenue_month) = ?
      where s.instrument_type in ('stock', 'emerging')
      group by s.market_type
      union all
      select 'monthly_revenue_early', s.market_type,
        count(distinct mr.stock_id), count(distinct s.id),
        case when rl.latest_period is null then null
          else printf('%04d-%02d-01', cast(rl.latest_period / 100 as integer), rl.latest_period % 100)
        end
      from stocks s
      join revenue_latest rl on rl.market_type = s.market_type and rl.latest_period > ?
      left join monthly_revenue mr on mr.stock_id = s.id
        and (mr.revenue_year * 100 + mr.revenue_month) = rl.latest_period
      where s.instrument_type in ('stock', 'emerging')
      group by s.market_type
    `).bind(requiredRevenueDate, requiredRevenueKey, requiredRevenueKey).all(),
    db.prepare(`
      select id, data_type, market_scope, source, latest_data_date, status,
        record_count, covered_stocks, expected_stocks, is_demo, note, updated_at
      from (
        select dqs.*,
          row_number() over (
            partition by data_type, market_scope
            order by updated_at desc, id desc
          ) as quality_rank
        from data_quality_status dqs
      )
      where quality_rank = 1
      order by data_type, market_scope
    `).all(),
    db.prepare(`
      select
        (select max(trade_date) from daily_prices) as latest_price_date,
        (select max(trade_date) from institutional_flows) as latest_institutional_date,
        (select max(score_date) from theme_scores) as latest_theme_score_date,
        (select max(score_date) from stock_scores) as latest_stock_score_date,
        (select count(distinct stock_id) from financial_reports) as financial_stock_count,
        (select count(distinct stock_id) from stock_scores where score_date = (select max(score_date) from stock_scores)) as scored_stock_count
    `).first(),
  ]);
  const coverage = (datasetCoverage.results || []).map((row) => ({
    ...row,
    coverage_label: row.data_type === "monthly_revenue"
      ? "\u6708\u71df\u6536\uff08\u5df2\u5230\u516c\u544a\u671f\u9650\uff09"
      : row.data_type === "monthly_revenue_early"
        ? "\u6708\u71df\u6536\uff08\u63d0\u524d\u516c\u544a\uff09"
        : row.data_type,
    coverage_note: row.data_type === "monthly_revenue_early"
      ? "\u5c1a\u672a\u5230\u516c\u544a\u671f\u9650\uff0c\u672a\u516c\u544a\u516c\u53f8\u4e0d\u5217\u5165\u7f3a\u6f0f\u6216\u5931\u6557"
      : null,
    coverage_percent: Number(row.expected_stocks || 0)
      ? Number(((Number(row.covered_stocks || 0) / Number(row.expected_stocks)) * 100).toFixed(1))
      : 0,
  }));
  return {
    taxonomy_version: TAXONOMY_VERSION,
    public_confidence_threshold: PUBLIC_CLASSIFICATION_CONFIDENCE,
    stocks: stockSummary,
    industries: industryRows.results || [],
    themes: themeSummary,
    datasets: coverage,
    source_status: qualityRows.results || [],
    latest_dates: latestDates,
    recommendations_ready: Boolean(
      latestDates?.latest_price_date
      && latestDates.latest_stock_score_date === latestDates.latest_price_date
      && latestDates.latest_theme_score_date === latestDates.latest_price_date
      && Number(latestDates.scored_stock_count || 0) >= Math.ceil(Number(stockSummary?.common_stocks || 0) * 0.8)
    ),
    score_formula: {
      version: "available-data-score-v1",
      price_momentum_weight: 25,
      turnover_weight: 20,
      institutional_weight: 25,
      revenue_weight: 20,
      verified_theme_weight: 10,
      missing_value_score: 50,
    },
  };
}

function trailingTwelveMonthEps(rows = []) {
  const valid = rows
    .filter((row) => Number.isFinite(Number(row?.eps)) && Number(row?.fiscal_year) && Number(row?.quarter))
    .sort((a, b) => Number(b.fiscal_year) - Number(a.fiscal_year) || Number(b.quarter) - Number(a.quarter));
  const latest = valid[0];
  if (!latest) return null;
  const latestEps = Number(latest.eps);
  const year = Number(latest.fiscal_year);
  const quarter = Number(latest.quarter);
  if (quarter === 4) return latestEps > 0 ? latestEps : null;
  const previousAnnual = valid.find((row) => Number(row.fiscal_year) === year - 1 && Number(row.quarter) === 4);
  const previousSameQuarter = valid.find((row) => Number(row.fiscal_year) === year - 1 && Number(row.quarter) === quarter);
  if (!previousAnnual || !previousSameQuarter) return null;
  const ttm = latestEps + Number(previousAnnual.eps) - Number(previousSameQuarter.eps);
  return Number.isFinite(ttm) && ttm > 0 ? Number(ttm.toFixed(4)) : null;
}

async function getStock(db, stockCode) {
  const stock = await db.prepare("select * from stocks where stock_code = ? order by market_type limit 1").bind(stockCode).first();
  if (!stock) return null;
  if (/^\d+$/.test(String(stock.industry_name || ""))) {
    stock.industry_name = officialIndustryName(stock.industry_code, "未分類");
  }

  const themesResult = await db.prepare(`
    select t.*, st.relation_strength, st.reason, st.confidence_score,
      st.evidence_type, st.evidence_url, st.rule_version, st.review_status
    from stock_themes st join themes t on t.id = st.theme_id
    where st.stock_id = ?
      and (st.review_status = 'approved' or st.confidence_score >= 80)
    order by t.theme_name
  `).bind(stock.id).all();

  const rolesResult = await db.prepare(`
    select scr.*, t.theme_name
    from supply_chain_roles scr left join themes t on t.id = scr.theme_id
    join stock_themes st on st.stock_id = scr.stock_id and st.theme_id = scr.theme_id
    where scr.stock_id = ?
      and (st.review_status = 'approved' or st.confidence_score >= 80)
    order by scr.confidence_score desc
  `).bind(stock.id).all();
  const productGroups = uniqueLabels([
    ...(themesResult.results || []).flatMap((theme) => inferProductPeerGroups({
      stock_code: stock.stock_code,
      theme_name: theme.theme_name,
      theme_reason: theme.reason,
    })),
    ...(rolesResult.results || []).flatMap((role) => inferProductPeerGroups({
      stock_code: stock.stock_code,
      theme_name: role.theme_name,
      role_type: role.role_type,
      role_description: role.role_description,
      major_products: role.major_products,
    })),
  ]);
  const officialIndustryLabel = stock.industry_name;
  stock.product_groups = productGroups;
  const majorProductDescriptions = uniqueLabels((rolesResult.results || []).map((role) => String(role.major_products || "").trim()).filter(Boolean));
  const groupProductDescriptions = productGroups.map((group) => PRODUCT_PEER_GROUP_RULES.find((rule) => rule.name === group)?.description).filter(Boolean);
  const themeProductDescriptions = (themesResult.results || []).map((theme) => `${theme.theme_name}相關產品與服務`);
  const industryProductDescription = INDUSTRY_PRODUCT_DESCRIPTIONS[officialIndustryLabel]
    ? `${stock.stock_name || stock.stock_code}主要產品與服務涵蓋：${INDUSTRY_PRODUCT_DESCRIPTIONS[officialIndustryLabel]}`
    : "";
  stock.product_description = STOCK_PRODUCT_PROFILES[String(stock.stock_code || "")]?.products || uniqueLabels([
    ...majorProductDescriptions,
    ...groupProductDescriptions,
    industryProductDescription,
    ...themeProductDescriptions,
  ]).slice(0, 3).join("；") || "公司主要產品與服務請參考公開資訊觀測站";

  const latestPrice = await db.prepare("select * from daily_prices where stock_id = ? order by trade_date desc limit 1").bind(stock.id).first();
  const latestRevenue = await db.prepare("select * from monthly_revenue where stock_id = ? order by revenue_year desc, revenue_month desc limit 1").bind(stock.id).first();
  const financialResult = await db.prepare("select * from financial_reports where stock_id = ? order by fiscal_year desc, quarter desc limit 12").bind(stock.id).all();
  const financialRows = financialResult.results || [];
  const latestFinancial = financialRows[0] || null;
  const latestInstitutional = await db.prepare("select * from institutional_flows where stock_id = ? order by trade_date desc limit 1").bind(stock.id).first();
  let officialValuation = null;
  try {
    officialValuation = await db.prepare("select * from stock_valuations where stock_id = ? order by trade_date desc limit 1").bind(stock.id).first();
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }
  const financialTtmEps = trailingTwelveMonthEps(financialRows);
  const officialPeRatio = toNumber(officialValuation?.pe_ratio);
  const derivedOfficialEps = officialPeRatio && Number(latestPrice?.close_price) > 0
    ? Number((Number(latestPrice.close_price) / officialPeRatio).toFixed(4))
    : null;
  const ttmEps = derivedOfficialEps || financialTtmEps;
  const peRatio = officialPeRatio || (financialTtmEps && Number(latestPrice?.close_price) > 0
    ? Number((Number(latestPrice.close_price) / financialTtmEps).toFixed(2))
    : null);
  const valuationStatus = peRatio !== null
    ? "available"
    : officialValuation
      ? "not_applicable"
      : "not_synced";
  let dividends = [];
  try {
    const dividendsResult = await db.prepare(`
      select *
      from stock_dividends
      where stock_id = ?
      order by ex_dividend_date desc
      limit 12
    `).bind(stock.id).all();
    dividends = dividendsResult.results || [];
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }
  const score = await db.prepare(`
    select *
    from stock_scores
    where stock_id = ?
      and score_date = (select max(trade_date) from daily_prices)
    order by score_date desc
    limit 1
  `).bind(stock.id).first();

  return {
    stock,
    latest_price: latestPrice,
    latest_revenue: latestRevenue,
    latest_financial: latestFinancial,
    valuation: {
      ttm_eps: ttmEps,
      pe_ratio: peRatio,
      dividend_yield: toNumber(officialValuation?.dividend_yield),
      pb_ratio: toNumber(officialValuation?.pb_ratio),
      fiscal_period: officialValuation?.fiscal_period || null,
      data_date: officialValuation?.trade_date || latestFinancial?.report_date || null,
      source: officialPeRatio ? officialValuation?.source : financialTtmEps ? "financial_reports" : officialValuation?.source || null,
      formula: officialPeRatio ? "官方每日公布本益比；TTM EPS = 收盤價 ÷ 本益比" : "收盤價 ÷ 近四季 EPS",
      status: valuationStatus,
    },
    latest_institutional: latestInstitutional,
    themes: themesResult.results,
    supply_chain_roles: rolesResult.results,
    dividends,
    score,
  };
}

async function stockSeries(db, stockCode, tableName, orderBy, options = {}) {
  const stock = await db.prepare("select id from stocks where stock_code = ? order by market_type limit 1").bind(stockCode).first();
  if (!stock) return null;
  const limit = options.limit ? clampInt(options.limit, 24, 1, 5000) : null;
  const sql = `select * from ${tableName} where stock_id = ? order by ${orderBy}${limit ? ` limit ${limit}` : ""}`;
  const { results } = await db.prepare(sql).bind(stock.id).all();
  return results;
}

function historyMonthRange(fromInput, toDate = new Date(), maxMonths = 240) {
  const match = String(fromInput || "2010-01").match(/^(\d{4})-(\d{1,2})$/);
  const startYear = match ? Number(match[1]) : 2010;
  const startMonth = match ? Number(match[2]) : 1;
  const endYear = toDate.getUTCFullYear();
  const endMonth = toDate.getUTCMonth() + 1;
  const months = [];
  for (let year = startYear; year <= endYear && months.length < maxMonths; year++) {
    const first = year === startYear ? startMonth : 1;
    const last = year === endYear ? endMonth : 12;
    for (let month = first; month <= last && months.length < maxMonths; month++) months.push({ year, month });
  }
  return months;
}

async function fetchTwseStockDayHistory(stockCode, stockName, months) {
  const rows = [];
  const errors = [];
  for (const chunk of rowChunks(months, 8)) {
    const settled = await Promise.allSettled(chunk.map(async ({ year, month }) => {
      const sourceUrl = twseStockDayHistoryUrl(stockCode, year, month);
      const response = await fetch(sourceUrl, {
        headers: {
          accept: "application/json",
          "accept-language": "zh-TW,zh;q=0.9,en;q=0.7",
          referer: "https://www.twse.com.tw/zh/trading/historical/stock-day.html",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
        },
      });
      if (!response.ok) throw new Error(`TWSE STOCK_DAY ${response.status}`);
      const parsed = await response.json();
      if (!Array.isArray(parsed.data)) return [];
      return parsed.data
        .map((cells) => normalizeTwseStockDayHistoryRow(cells, stockCode, stockName, sourceUrl))
        .filter((row) => row.trade_date && row.open_price !== null && row.high_price !== null && row.low_price !== null && row.close_price !== null);
    }));
    settled.forEach((item) => {
      if (item.status === "fulfilled") rows.push(...item.value);
      else errors.push(item.reason?.message || String(item.reason));
    });
  }
  return { rows, errors };
}

async function listOfficialStockHistory(db, stockCode, url) {
  const stock = await db.prepare("select id, stock_code, stock_name, market_type from stocks where stock_code = ? order by market_type limit 1").bind(stockCode).first();
  if (!stock) return null;
  const monthCount = clampInt(url.searchParams.get("months"), 24, 6, 36);
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthCount - 1), 1));
  const from = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
  const fromDate = `${from}-01`;
  const stored = await stockSeries(db, stockCode, "daily_prices", "trade_date asc");
  let officialRows = [];
  let errors = [];
  if (stock.market_type === "上市") {
    const months = historyMonthRange(from, now, monthCount);
    const fetched = await fetchTwseStockDayHistory(stock.stock_code, stock.stock_name, months);
    officialRows = fetched.rows;
    errors = fetched.errors;
  }
  const merged = new Map();
  [...(stored || []), ...officialRows].forEach((row) => {
    if (row?.trade_date && row.trade_date >= fromDate) merged.set(row.trade_date, row);
  });
  const rows = [...merged.values()].sort((a, b) => String(a.trade_date).localeCompare(String(b.trade_date)));
  return {
    rows,
    history: {
      market_type: stock.market_type,
      months: monthCount,
      first_date: rows[0]?.trade_date || null,
      last_date: rows[rows.length - 1]?.trade_date || null,
      rows: rows.length,
      source: stock.market_type === "上市" ? "TWSE STOCK_DAY + D1" : "D1（此市場官方歷史來源尚待串接）",
      source_errors: errors.slice(0, 3),
    },
  };
}

async function ensureStockPriceHistory(db, stockCode, url) {
  const stock = await db.prepare("select id, stock_code, stock_name, market_type from stocks where stock_code = ? order by market_type limit 1").bind(stockCode).first();
  if (!stock) return { skipped: true, reason: "stock not found" };
  if (stock.market_type !== "上市") return { skipped: true, reason: `${stock.market_type} history source not enabled` };
  const from = url.searchParams.get("from") || "2010-01";
  const maxMonths = clampInt(url.searchParams.get("months"), 36, 1, 48);
  const months = historyMonthRange(from, new Date(), maxMonths);
  const firstMonth = months[0];
  const lastMonth = months[months.length - 1];
  const expectedMin = Math.max(30, Math.floor(months.length * 16));
  const firstDate = `${firstMonth.year}-${String(firstMonth.month).padStart(2, "0")}-01`;
  const nextMonth = lastMonth.month === 12 ? { year: lastMonth.year + 1, month: 1 } : { year: lastMonth.year, month: lastMonth.month + 1 };
  const endExclusive = `${nextMonth.year}-${String(nextMonth.month).padStart(2, "0")}-01`;
  const coverage = await db.prepare(`
    select count(*) as count, min(trade_date) as first_date, max(trade_date) as last_date
    from daily_prices
    where stock_id = ? and trade_date >= ? and trade_date < ?
  `).bind(stock.id, firstDate, endExclusive).first();
  if (Number(coverage?.count || 0) >= expectedMin) {
    return { skipped: true, reason: "history already loaded", rows: Number(coverage.count || 0), first_date: coverage.first_date, last_date: coverage.last_date };
  }
  const fetched = await fetchTwseStockDayHistory(stock.stock_code, stock.stock_name, months);
  if (fetched.rows.length) {
    await importDailyPriceRowsBulk(db, {
      source: "TWSE STOCK_DAY",
      source_url: SOURCE_TWSE_STOCK_DAY_HISTORY,
      batch: `history-${stock.stock_code}-${from}`,
    }, fetched.rows, new Date().toISOString());
  }
  return { skipped: false, fetched: fetched.rows.length, errors: fetched.errors.slice(0, 5), from };
}

async function syncListedStockHistoryBatch(db, url) {
  const cursor = clampInt(url.searchParams.get("cursor"), 0, 0, 1000000);
  const stockLimit = clampInt(url.searchParams.get("stock_limit"), 2, 1, 4);
  const from = url.searchParams.get("from") || "2010-01";
  const months = clampInt(url.searchParams.get("months"), 12, 1, 24);
  const { results: stocks } = await db.prepare(`
    select id, stock_code, stock_name, market_type
    from stocks
    where market_type = '上市' and stock_code glob '[0-9][0-9][0-9][0-9]'
    order by stock_code
    limit ? offset ?
  `).bind(stockLimit, cursor).all();
  const total = await db.prepare("select count(*) as count from stocks where market_type = '上市' and stock_code glob '[0-9][0-9][0-9][0-9]'").first();
  const synced = [];
  for (const stock of stocks) {
    const fakeUrl = new URL("https://worker.local/history");
    fakeUrl.searchParams.set("from", from);
    fakeUrl.searchParams.set("months", String(months));
    const result = await ensureStockPriceHistory(db, stock.stock_code, fakeUrl);
    synced.push({ stock_code: stock.stock_code, stock_name: stock.stock_name, ...result });
  }
  const nextCursor = cursor + stocks.length;
  return {
    market_type: "上市",
    from,
    months,
    cursor,
    next_cursor: nextCursor < Number(total?.count || 0) ? nextCursor : null,
    stock_limit: stockLimit,
    total_stocks: Number(total?.count || 0),
    synced,
  };
}

function tableObjectsFromRows(fields = [], rows = []) {
  return rows.map((row) => Object.fromEntries(fields.map((field, index) => [field, row[index]])));
}

function marketTimeLabel(unixSeconds) {
  if (!Number.isFinite(Number(unixSeconds))) return null;
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(Number(unixSeconds) * 1000));
}

async function fetchGlobalIndex(definition) {
  const fallback = {
    kind: "index",
    symbol: definition.symbol,
    label: definition.label,
    country: definition.country,
    market: definition.market,
    price: null,
    change: null,
    change_percent: null,
    market_time: null,
    status: "unavailable",
  };
  try {
    const response = await fetch(`${SOURCE_YAHOO_FINANCE_CHART}/${encodeURIComponent(definition.symbol)}?range=5d&interval=1d`, {
      headers: {
        accept: "application/json",
        "accept-language": "zh-TW,zh;q=0.9",
        "user-agent": "Mozilla/5.0 (compatible; TWStockResearch/1.0)",
      },
    });
    if (!response.ok) return fallback;
    const result = (await response.json())?.chart?.result?.[0];
    const meta = result?.meta || {};
    const closes = (result?.indicators?.quote?.[0]?.close || []).filter((item) => Number.isFinite(Number(item)));
    const price = toNumber(meta.regularMarketPrice) ?? toNumber(closes.at(-1));
    const previous = toNumber(meta.chartPreviousClose) ?? toNumber(meta.previousClose) ?? toNumber(closes.at(-2));
    if (price === null) return fallback;
    const change = previous === null ? null : price - previous;
    return {
      ...fallback,
      price,
      change,
      change_percent: previous ? change / previous * 100 : null,
      market_time: marketTimeLabel(meta.regularMarketTime),
      currency: meta.currency || null,
      status: "ok",
    };
  } catch {
    return fallback;
  }
}

async function fetchTaifexNightFuture() {
  const fallback = {
    kind: "night",
    symbol: "TX",
    label: "台指期夜盤",
    country: "台灣",
    market: "台灣期交所",
    price: null,
    change: null,
    change_percent: null,
    data_date: null,
    contract_month: null,
    session: "盤後",
    volume: null,
    status: "unavailable",
  };
  try {
    const response = await fetch(SOURCE_TAIFEX_DAILY_FUTURES, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) return fallback;
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : [];
    const nightRows = rows
      .filter((row) => String(row.Contract || "").trim() === "TX" && String(row.TradingSession || "").includes("盤後"))
      .sort((a, b) => String(a["ContractMonth(Week)"] || "").localeCompare(String(b["ContractMonth(Week)"] || "")));
    const row = nightRows.find((item) => toNumber(item.Last) !== null) || null;
    if (!row) return fallback;
    const price = toNumber(row.Last);
    const change = toNumber(row.Change);
    const percent = Number(String(row["%"] || "").replace("%", "").replace(",", "").trim());
    return {
      ...fallback,
      price,
      change,
      change_percent: Number.isFinite(percent) ? percent : null,
      data_date: String(row.Date || "").replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3") || null,
      contract_month: row["ContractMonth(Week)"] || null,
      volume: toNumber(row.Volume),
      status: "ok",
    };
  } catch {
    return fallback;
  }
}

async function listGlobalMarkets() {
  const [indices, night] = await Promise.all([
    Promise.all(GLOBAL_INDEX_DEFINITIONS.map(fetchGlobalIndex)),
    fetchTaifexNightFuture(),
  ]);
  return [...indices, night];
}

function taipeiDateKey(date = new Date()) {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function syncGlobalMarketSnapshots(db) {
  const capturedAt = new Date().toISOString();
  const previousRows = await db.prepare("select symbol, price, captured_at from global_market_snapshots").all();
  const previousBySymbol = new Map((previousRows.results || []).map((row) => [String(row.symbol), row]));
  const rows = await listGlobalMarkets();
  if (rows.length) {
    await db.batch(rows.map((row) => db.prepare(`
      insert into global_market_snapshots (
        symbol, kind, label, country, market, price, change_value, change_percent,
        currency, market_time, data_date, contract_month, session, volume,
        source_status, captured_at
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(symbol) do update set
        kind = excluded.kind,
        label = excluded.label,
        country = excluded.country,
        market = excluded.market,
        price = excluded.price,
        change_value = excluded.change_value,
        change_percent = excluded.change_percent,
        currency = excluded.currency,
        market_time = excluded.market_time,
        data_date = excluded.data_date,
        contract_month = excluded.contract_month,
        session = excluded.session,
        volume = excluded.volume,
        source_status = excluded.source_status,
        captured_at = excluded.captured_at
    `).bind(
      row.symbol,
      row.kind || "index",
      row.label,
      row.country,
      row.market || null,
      toNumber(row.price),
      toNumber(row.change),
      toNumber(row.change_percent),
      row.currency || null,
      row.market_time || null,
      row.data_date || null,
      row.contract_month || null,
      row.session || null,
      toNumber(row.volume),
      row.status || "unavailable",
      capturedAt,
    )));
  }
  return {
    status: rows.some((row) => row.status !== "ok") ? "partial" : "success",
    captured_at: capturedAt,
    rows: rows.map((row) => {
      const previous = previousBySymbol.get(String(row.symbol));
      const previousPrice = toNumber(previous?.price);
      const price = toNumber(row.price);
      return {
        ...row,
        previous_sync_price: previousPrice,
        change_since_previous_sync: price !== null && previousPrice !== null ? price - previousPrice : null,
        previous_sync_at: previous?.captured_at || null,
      };
    }),
  };
}

function normalizeNotificationEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 254);
}

function isNotificationAdmin(user, env) {
  const adminEmail = normalizeNotificationEmail(env.NOTIFICATION_ADMIN_EMAIL || "admin@example.invalid");
  return normalizeNotificationEmail(user?.email) === adminEmail;
}

function notificationRoutingConfigured(env) {
  return Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.EMAIL_ROUTING_API_TOKEN);
}

async function cloudflareEmailRoutingRequest(env, path = "", init = {}) {
  if (!notificationRoutingConfigured(env)) {
    const error = new Error("Email 驗證信服務尚未設定，請先設定 EMAIL_ROUTING_API_TOKEN。");
    error.status = 503;
    throw error;
  }
  const apiFetch = typeof env.EMAIL_ROUTING_API_FETCH === "function"
    ? env.EMAIL_ROUTING_API_FETCH
    : fetch;
  const response = await apiFetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/email/routing/addresses${path}`,
    {
      ...init,
      headers: {
        authorization: `Bearer ${env.EMAIL_ROUTING_API_TOKEN}`,
        "content-type": "application/json",
        ...(init.headers || {}),
      },
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const detail = (payload.errors || []).map((item) => item.message).filter(Boolean).join("；");
    const error = new Error(detail || `Cloudflare Email Routing API ${response.status}`);
    error.status = response.status === 401 || response.status === 403 ? 503 : 502;
    throw error;
  }
  return payload;
}

async function listCloudflareDestinationAddresses(env) {
  const rows = [];
  for (let page = 1; page <= 20; page++) {
    const payload = await cloudflareEmailRoutingRequest(env, `?page=${page}&per_page=50`);
    rows.push(...(payload.result || []));
    if (page >= Number(payload.result_info?.total_pages || 1)) break;
  }
  return rows;
}

async function ensureCloudflareDestinationAddress(env, email) {
  const existing = (await listCloudflareDestinationAddresses(env))
    .find((row) => normalizeNotificationEmail(row.email) === email);
  if (existing) return { address: existing, verification_email_sent: false };
  const payload = await cloudflareEmailRoutingRequest(env, "", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return { address: payload.result || { email }, verification_email_sent: true };
}

async function syncNotificationAddressVerification(db, env) {
  if (!notificationRoutingConfigured(env)) return { configured: false, updated: 0 };
  const addresses = await listCloudflareDestinationAddresses(env);
  const now = new Date().toISOString();
  let updated = 0;
  for (const address of addresses) {
    const email = normalizeNotificationEmail(address.email);
    if (!email) continue;
    const verifiedAt = address.verified || null;
    const result = await db.prepare(`
      update notification_email_allowlist
      set
        provider_address_id = ?,
        verification_status = ?,
        verified_at = ?,
        enabled = case when activation_requested = 1 and ? is not null then 1 else 0 end,
        verification_error = null,
        updated_at = ?
      where lower(email) = ?
    `).bind(
      address.id || null,
      verifiedAt ? "verified" : "pending",
      verifiedAt,
      verifiedAt,
      now,
      email,
    ).run();
    updated += Number(result.meta?.changes || 0);
  }
  return { configured: true, updated };
}

async function notificationAccess(db, user, env) {
  const email = normalizeNotificationEmail(user?.email);
  const allowed = await db.prepare(`
    select enabled from notification_email_allowlist
    where lower(email) = ? and enabled = 1 and verification_status = 'verified'
  `).bind(email).first();
  return {
    allowed: Boolean(allowed),
    is_admin: isNotificationAdmin(user, env),
  };
}

function notificationPreferencePayload(row, user, env, access) {
  return {
    email: user.email,
    notify_0800: Boolean(row?.notify_0800),
    notify_1000: Boolean(row?.notify_1000),
    notify_1800: Boolean(row?.notify_1800),
    delivery_available: Boolean(env.EMAIL && env.NOTIFICATION_FROM_EMAIL),
    sender: env.NOTIFICATION_FROM_EMAIL || null,
    can_configure_notifications: Boolean(access?.allowed || access?.is_admin),
    is_notification_admin: Boolean(access?.is_admin),
  };
}

async function getNotificationPreferences(db, user, env) {
  const access = await notificationAccess(db, user, env);
  const row = await db.prepare(`
    select notify_0800, notify_1000, notify_1800, updated_at
    from watchlist_notification_preferences
    where user_id = ?
  `).bind(user.id).first();
  return { ...notificationPreferencePayload(row, user, env, access), updated_at: row?.updated_at || null };
}

async function writeNotificationPreferences(db, userId, body) {
  const now = new Date().toISOString();
  const values = {
    notify_0800: body.notify_0800 === true || body.notify_0800 === 1,
    notify_1000: body.notify_1000 === true || body.notify_1000 === 1,
    notify_1800: body.notify_1800 === true || body.notify_1800 === 1,
  };
  await db.prepare(`
    insert into watchlist_notification_preferences (
      user_id, notify_0800, notify_1000, notify_1800, updated_at
    )
    values (?, ?, ?, ?, ?)
    on conflict(user_id) do update set
      notify_0800 = excluded.notify_0800,
      notify_1000 = excluded.notify_1000,
      notify_1800 = excluded.notify_1800,
      updated_at = excluded.updated_at
  `).bind(
    userId,
    values.notify_0800 ? 1 : 0,
    values.notify_1000 ? 1 : 0,
    values.notify_1800 ? 1 : 0,
    now,
  ).run();
  return { ...values, updated_at: now };
}

async function saveNotificationPreferences(db, user, env, body) {
  const access = await notificationAccess(db, user, env);
  if (!access.allowed && !access.is_admin) {
    const error = new Error("此帳號尚未開放 Email 提醒功能。");
    error.status = 403;
    throw error;
  }
  const values = await writeNotificationPreferences(db, user.id, body);
  return { ...notificationPreferencePayload(values, user, env, access), updated_at: values.updated_at };
}

async function listNotificationRecipients(db) {
  const { results } = await db.prepare(`
    select
      a.email,
      a.enabled,
      a.added_by,
      a.updated_at,
      a.verification_status,
      a.activation_requested,
      a.verification_requested_at,
      a.verified_at,
      a.verification_error,
      u.id as user_id,
      u.name,
      u.last_login_at,
      coalesce(p.notify_0800, 0) as notify_0800,
      coalesce(p.notify_1000, 0) as notify_1000,
      coalesce(p.notify_1800, 0) as notify_1800
    from notification_email_allowlist a
    left join watchlist_users u on lower(u.email) = lower(a.email)
    left join watchlist_notification_preferences p on p.user_id = u.id
    order by a.enabled desc, coalesce(u.last_login_at, a.updated_at) desc, a.email
  `).all();
  return (results || []).map((row) => ({
    ...row,
    enabled: Boolean(row.enabled),
    activation_requested: Boolean(row.activation_requested),
    registered: Boolean(row.user_id),
    notify_0800: Boolean(row.notify_0800),
    notify_1000: Boolean(row.notify_1000),
    notify_1800: Boolean(row.notify_1800),
  }));
}

async function upsertNotificationRecipient(db, adminUser, env, body) {
  const email = normalizeNotificationEmail(body.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error("請輸入有效的 Email。");
    error.status = 400;
    throw error;
  }
  const now = new Date().toISOString();
  const activationRequested = body.enabled !== false && body.enabled !== 0;
  if (!activationRequested && ["admin@example.invalid", "member@example.invalid"].includes(email)) {
    const error = new Error("預設允許的 Email 不可停用。");
    error.status = 400;
    throw error;
  }
  if (!activationRequested) {
    await db.prepare(`
      update notification_email_allowlist
      set enabled = 0, activation_requested = 0, updated_at = ?
      where lower(email) = ?
    `).bind(now, email).run();
    return { email, enabled: false, verification_email_sent: false };
  }
  const current = await db.prepare(`
    select verification_status, provider_address_id, verified_at
    from notification_email_allowlist where lower(email) = ? limit 1
  `).bind(email).first();
  const routingResult = current?.verification_status === "verified"
    ? {
        address: {
          id: current.provider_address_id,
          email,
          verified: current.verified_at,
        },
        verification_email_sent: false,
      }
    : await ensureCloudflareDestinationAddress(env, email);
  const address = routingResult.address || {};
  const verifiedAt = address.verified || null;
  const verificationStatus = verifiedAt ? "verified" : "pending";
  await db.prepare(`
    insert into notification_email_allowlist (
      email, enabled, added_by, created_at, updated_at, verification_status,
      activation_requested, provider_address_id, verification_requested_at,
      verified_at, verification_error
    )
    values (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, null)
    on conflict(email) do update set
      enabled = excluded.enabled,
      added_by = excluded.added_by,
      updated_at = excluded.updated_at,
      verification_status = excluded.verification_status,
      activation_requested = 1,
      provider_address_id = coalesce(excluded.provider_address_id, notification_email_allowlist.provider_address_id),
      verification_requested_at = coalesce(notification_email_allowlist.verification_requested_at, excluded.verification_requested_at),
      verified_at = excluded.verified_at,
      verification_error = null
  `).bind(
    email,
    verifiedAt ? 1 : 0,
    normalizeNotificationEmail(adminUser.email),
    now,
    now,
    verificationStatus,
    address.id || null,
    routingResult.verification_email_sent ? now : null,
    verifiedAt,
  ).run();
  const target = await db.prepare(`
    select id, email, name from watchlist_users where lower(email) = ? limit 1
  `).bind(email).first();
  if (target && ["notify_0800", "notify_1000", "notify_1800"].some((key) => key in body)) {
    await writeNotificationPreferences(db, target.id, body);
  }
  return {
    email,
    enabled: Boolean(verifiedAt),
    registered: Boolean(target),
    verification_status: verificationStatus,
    verification_email_sent: routingResult.verification_email_sent,
  };
}

function signedNumber(value, digits = 2) {
  const number = toNumber(value);
  if (number === null) return "-";
  return `${number > 0 ? "+" : ""}${number.toLocaleString("zh-TW", { maximumFractionDigits: digits })}`;
}

function scheduledUpdateDetails(slot, report) {
  if (slot === "08:00") {
    const rows = report?.rows || [];
    const updates = rows.map((row) => `${row.country}｜${row.label}：${signedNumber(row.price)}（${signedNumber(row.change)}／${signedNumber(row.change_percent)}%）`);
    const changes = rows.map((row) => {
      const sincePrevious = toNumber(row.change_since_previous_sync);
      const previousText = sincePrevious === null ? "首次建立快照" : `較上次 08:00 快照 ${signedNumber(sincePrevious)}`;
      return `${row.country}｜${row.label}：${previousText}；來源狀態 ${row.status === "ok" ? "成功" : "未取得"}`;
    });
    return { updates, changes, failures: rows.filter((row) => row.status !== "ok").map((row) => `${row.country}｜${row.label}`) };
  }
  const labels = {
    daily_price: "每日行情",
    stock_valuation: "本益比與估值",
    institutional_flow: "三大法人",
    monthly_revenue: "月營收",
    market_index: "台灣加權指數",
    dividend_calendar: "除權息日曆",
    theme_score: "題材評分",
    stock_score: "個股評分",
    stock_basic: "股票名冊",
  };
  const updates = [];
  const changes = [];
  const visit = (value, path = []) => {
    if (!value || typeof value !== "object") return;
    if (value.error) return;
    const numericKeys = ["received", "inserted", "updated", "skipped"].filter((key) => Number.isFinite(Number(value[key])));
    if (numericKeys.length) {
      const key = path[0] || "資料";
      const name = labels[key] || key;
      const date = value.latest_data_date || value.data_date || "-";
      updates.push(`${name}：資料日期 ${date}`);
      changes.push(`${name}：新增 ${Number(value.inserted || 0).toLocaleString("zh-TW")}、更新 ${Number(value.updated || 0).toLocaleString("zh-TW")}、略過 ${Number(value.skipped || 0).toLocaleString("zh-TW")}`);
      return;
    }
    Object.entries(value).forEach(([key, child]) => visit(child, path.length ? path : [key]));
  };
  visit(report?.summary || {});
  const failures = (report?.source_errors || []).map((item) => `${item.source}：${item.error}`);
  if (!updates.length) updates.push("本次排程已執行，但來源沒有回傳可入庫資料。");
  return { updates, changes, failures };
}

function notificationEmailContent(slot, report, recipientName) {
  const details = scheduledUpdateDetails(slot, report);
  const status = report?.status === "success" ? "完成" : "部分完成";
  const subject = `[台股研究平台] ${slot} 資料更新${status}`;
  const lines = [
    `${recipientName || "您好"}，`,
    "",
    `${slot} 排程已${status}。`,
    "",
    "本次更新內容",
    ...details.updates.map((line) => `- ${line}`),
    "",
    "主要變動",
    ...(details.changes.length ? details.changes : ["沒有可比較的新增或更新筆數。"]).map((line) => `- ${line}`),
  ];
  if (details.failures.length) lines.push("", "失敗／未取得來源", ...details.failures.map((line) => `- ${line}`));
  lines.push("", "查看交易帳本與調整提醒：https://claw.terry878.org/watchlist", "本郵件是依您在交易帳本勾選的更新時段寄送。");
  const text = lines.join("\n");
  const html = `<div style="font-family:system-ui,-apple-system,'Noto Sans TC',sans-serif;line-height:1.65;color:#0d1b2a"><p>${escHtml(recipientName || "您好")}，</p><p><strong>${escHtml(slot)} 排程已${escHtml(status)}。</strong></p><h2 style="font-size:18px">本次更新內容</h2><ul>${details.updates.map((line) => `<li>${escHtml(line)}</li>`).join("")}</ul><h2 style="font-size:18px">主要變動</h2><ul>${(details.changes.length ? details.changes : ["沒有可比較的新增或更新筆數。"]).map((line) => `<li>${escHtml(line)}</li>`).join("")}</ul>${details.failures.length ? `<h2 style="font-size:18px;color:#a33">失敗／未取得來源</h2><ul>${details.failures.map((line) => `<li>${escHtml(line)}</li>`).join("")}</ul>` : ""}<p><a href="https://claw.terry878.org/watchlist">查看交易帳本或調整提醒</a></p><p style="color:#64727a;font-size:13px">本郵件是依您在交易帳本勾選的更新時段寄送。</p></div>`;
  return { subject, text, html };
}

async function sendScheduledUpdateNotifications(db, env, slot, report, scheduledAt = new Date()) {
  const column = { "08:00": "notify_0800", "10:00": "notify_1000", "18:00": "notify_1800" }[slot];
  if (!column) throw new Error(`Unsupported notification slot: ${slot}`);
  try {
    await syncNotificationAddressVerification(db, env);
  } catch (error) {
    console.error("notification verification sync failed", error?.message || error);
  }
  const notificationDate = taipeiDateKey(scheduledAt);
  const recipients = await db.prepare(`
    select u.id, u.email, u.name
    from watchlist_notification_preferences p
    join watchlist_users u on u.id = p.user_id
    join notification_email_allowlist a
      on lower(a.email) = lower(u.email)
      and a.enabled = 1
      and a.verification_status = 'verified'
    where p.${column} = 1
    order by u.id
    limit 500
  `).all();
  const summary = { selected: recipients.results?.length || 0, sent: 0, failed: 0, skipped: 0 };
  for (const recipient of recipients.results || []) {
    const existing = await db.prepare(`
      select status from notification_delivery_logs
      where user_id = ? and notification_date = ? and notification_slot = ?
    `).bind(recipient.id, notificationDate, slot).first();
    if (existing?.status === "sent") {
      summary.skipped++;
      continue;
    }
    const content = notificationEmailContent(slot, report, recipient.name);
    let status = "skipped";
    let messageId = null;
    let errorMessage = null;
    if (!env.EMAIL || !env.NOTIFICATION_FROM_EMAIL) {
      errorMessage = "Cloudflare Email binding or sender address is not configured.";
    } else {
      try {
        const result = await env.EMAIL.send({
          to: recipient.email,
          from: { email: env.NOTIFICATION_FROM_EMAIL, name: "台股研究平台" },
          subject: content.subject,
          text: content.text,
          html: content.html,
        });
        status = "sent";
        messageId = result?.messageId || null;
      } catch (error) {
        status = "failed";
        errorMessage = `${error?.code ? `${error.code}: ` : ""}${error?.message || error}`.slice(0, 500);
      }
    }
    await db.prepare(`
      insert into notification_delivery_logs (
        user_id, notification_date, notification_slot, recipient_email,
        status, subject, message_id, error_message, created_at
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(user_id, notification_date, notification_slot) do update set
        recipient_email = excluded.recipient_email,
        status = excluded.status,
        subject = excluded.subject,
        message_id = excluded.message_id,
        error_message = excluded.error_message,
        created_at = excluded.created_at
    `).bind(
      recipient.id,
      notificationDate,
      slot,
      recipient.email,
      status,
      content.subject,
      messageId,
      errorMessage,
      new Date().toISOString(),
    ).run();
    summary[status]++;
  }
  return summary;
}

function stockNewsAliases(stock) {
  const name = String(stock?.stock_name || "").trim();
  const baseName = name
    .replace(/\*/g, "")
    .replace(/[-－](?:KY|DR)$/i, "")
    .trim();
  return [...new Set([name, baseName].filter((alias) => alias.length >= 2))];
}

function isRelevantStockNews(item, stock) {
  const title = String(item?.title || "").trim();
  if (!title) return false;
  const code = String(stock?.stock_code || "").trim();
  const codePattern = code ? new RegExp(`(^|\\D)${code}(\\D|$)`) : null;
  if (codePattern?.test(title)) return true;
  if (stockNewsAliases(stock).some((alias) => title.toLowerCase().includes(alias.toLowerCase()))) return true;
  return (Array.isArray(item?.relatedTickers) ? item.relatedTickers : []).some((ticker) => {
    const symbol = String(ticker || "").toUpperCase();
    return symbol === code || symbol.startsWith(`${code}.`);
  });
}

async function listStockNews(db, stockCode) {
  const stock = await db.prepare("select stock_code, stock_name from stocks where stock_code = ? order by market_type limit 1").bind(stockCode).first();
  if (!stock) return null;
  const officialUrl = `https://tw.stock.yahoo.com/quote/${encodeURIComponent(stockCode)}/announcement`;
  const rows = [{
    title: `${stock.stock_name || stockCode}官方重大訊息公告`,
    publisher: "公開資訊觀測站公告入口",
    published_at: null,
    url: officialUrl,
    confidence: "official",
    type: "announcement",
  }];
  const trustedPublishers = [
    "中央社", "moneydj", "鉅亨", "經濟日報", "工商時報", "財訊快報",
    "reuters", "路透", "yahoo", "今周刊", "商業周刊",
  ];
  try {
    const query = `${stockCode} ${stock.stock_name || ""} 台股`;
    const response = await fetch(`${SOURCE_YAHOO_FINANCE_SEARCH}?q=${encodeURIComponent(query)}&quotesCount=1&newsCount=12`, {
      headers: {
        accept: "application/json",
        "accept-language": "zh-TW,zh;q=0.9",
        "user-agent": "Mozilla/5.0 (compatible; TWStockResearch/1.0)",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = await response.json();
    const newsRows = Array.isArray(parsed.news) ? parsed.news : [];
    for (const item of newsRows) {
      const title = String(item.title || "").trim();
      const publisher = String(item.publisher || item.provider || "").trim();
      const link = String(item.link || "").trim();
      const trusted = trustedPublishers.some((name) => publisher.toLowerCase().includes(name.toLowerCase()));
      if (!title || !trusted || !isRelevantStockNews(item, stock) || !/^https:\/\//i.test(link)) continue;
      rows.push({
        title,
        publisher,
        published_at: item.providerPublishTime ? new Date(Number(item.providerPublishTime) * 1000).toISOString() : null,
        url: link,
        confidence: "trusted-media",
        type: "news",
      });
      if (rows.length >= 9) break;
    }
  } catch (error) {
    console.warn(`stock news source failed: ${stockCode}`, error.message);
  }
  return rows;
}

async function listMarketSurveillance(url) {
  const stockCode = url.searchParams.get("stock_code");
  const sources = [];
  const fetchJson = async (source, status) => {
    try {
      const response = await fetch(source, {
        headers: {
          accept: "application/json",
          "accept-language": "zh-TW,zh;q=0.9,en;q=0.7",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = await response.json();
      const tables = Array.isArray(parsed.tables) ? parsed.tables : [{ title: parsed.title, fields: parsed.fields, data: parsed.data }];
      for (const table of tables) {
        const rows = tableObjectsFromRows(table.fields || [], table.data || []).map((row) => ({
          stock_code: row["證券代號"],
          stock_name: row["證券名稱"],
          status,
          announcement_date: row["公告日期"] || row["公布日期"],
          period: row["處置起迄時間"] || row["期間"] || "",
          reason: row["注意交易資訊"] || row["處置條件"] || row["處置內容"] || "",
          source_title: table.title || parsed.title || status,
          source_url: source,
        })).filter((row) => row.stock_code && (!stockCode || row.stock_code === stockCode));
        sources.push(...rows);
      }
    } catch (error) {
      console.warn(`surveillance source failed: ${source}`, error.message);
    }
  };
  await Promise.all([
    fetchJson(SOURCE_TWSE_DISPOSITION, "處置"),
    fetchJson(SOURCE_TPEX_ATTENTION, "注意"),
  ]);
  return sources.filter((row) => row.stock_code && (!stockCode || row.stock_code === stockCode));
}

async function ensureIndustry(db, row, now) {
  const code = row.industry_code || row.industry_name || "UNKNOWN";
  const name = row.industry_name || row.industry_code || "未分類";
  const existing = await db.prepare("select id from industries where industry_code = ? limit 1").bind(code).first();
  if (existing) {
    await db.prepare(`
      update industries
      set industry_name = ?, source = ?, source_url = ?, last_updated_at = ?
      where id = ?
    `).bind(name, row.source || "TWSE OpenAPI", row.source_url || SOURCE_TWSE_STOCK_BASIC, now, existing.id).run();
    return existing.id;
  }

  const result = await db.prepare(`
    insert into industries (industry_code, industry_name, description, source, source_url, last_updated_at)
    values (?, ?, ?, ?, ?, ?)
  `).bind(code, name, `Official industry classification: ${name}`, row.source || "TWSE OpenAPI", row.source_url || SOURCE_TWSE_STOCK_BASIC, now).run();
  return result.meta.last_row_id;
}

function prepareStockBasicUpsert(db, row, industryId, now) {
  const marketType = row.market_type || "上市";
  return db.prepare(`
    insert into stocks (
      stock_code, stock_name, market_type, industry_code, industry_name, industry_id, instrument_type, company_type,
      listing_date, established_date, capital, chairman, general_manager, spokesperson,
      company_address, company_url, source, source_url, last_updated_at
    )
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    on conflict(stock_code, market_type) do update set
      stock_name = excluded.stock_name,
      industry_code = excluded.industry_code,
      industry_name = excluded.industry_name,
      industry_id = excluded.industry_id,
      instrument_type = excluded.instrument_type,
      company_type = excluded.company_type,
      listing_date = excluded.listing_date,
      established_date = excluded.established_date,
      capital = excluded.capital,
      chairman = excluded.chairman,
      general_manager = excluded.general_manager,
      spokesperson = excluded.spokesperson,
      company_address = excluded.company_address,
      company_url = excluded.company_url,
      source = excluded.source,
      source_url = excluded.source_url,
      last_updated_at = excluded.last_updated_at
  `).bind(
    row.stock_code,
    row.stock_name || row.stock_code,
    marketType,
    row.industry_code || null,
    row.industry_name || null,
    industryId,
    row.instrument_type || detectInstrumentType(row),
    row.company_type || `${marketType}股票`,
    row.listing_date || null,
    row.established_date || null,
    toNumber(row.capital),
    row.chairman || null,
    row.general_manager || null,
    row.spokesperson || null,
    row.company_address || null,
    row.company_url || null,
    row.source || "TWSE OpenAPI",
    row.source_url || SOURCE_TWSE_STOCK_BASIC,
    now,
  );
}

async function importStockBasicRowsBulk(db, payload, rows, now) {
  const validRows = rows.filter((row) => /^\d{4}$/.test(row.stock_code || "")).map((row) => {
    const official = normalizeOfficialIndustry(row);
    return { ...row, ...official };
  });
  const industriesByCode = new Map();
  for (const row of validRows) {
    industriesByCode.set(row.industry_code || "UNKNOWN", {
      industry_code: row.industry_code || "UNKNOWN",
      industry_name: row.industry_name || "未分類",
      source: row.source || payload.source || "TWSE OpenAPI",
      source_url: row.source_url || payload.source_url || SOURCE_TWSE_STOCK_BASIC,
    });
  }
  const industryStatements = [...industriesByCode.values()].map((industry) => db.prepare(`
    insert into industries (industry_code, industry_name, description, source, source_url, last_updated_at)
    values (?, ?, ?, ?, ?, ?)
    on conflict(industry_code) do update set
      industry_name = excluded.industry_name,
      description = excluded.description,
      source = excluded.source,
      source_url = excluded.source_url,
      last_updated_at = excluded.last_updated_at
  `).bind(
    industry.industry_code,
    industry.industry_name,
    `Official industry classification: ${industry.industry_name}`,
    industry.source,
    industry.source_url,
    now,
  ));
  for (const batch of rowChunks(industryStatements, 40)) await db.batch(batch);

  const industryIdMap = new Map();
  for (const codeChunk of rowChunks([...industriesByCode.keys()], 80)) {
    const placeholders = codeChunk.map(() => "?").join(",");
    const { results } = await db.prepare(`
      select id, industry_code from industries where industry_code in (${placeholders})
    `).bind(...codeChunk).all();
    for (const industry of results || []) industryIdMap.set(industry.industry_code, industry.id);
  }
  const existingStocks = await stockIdMapForRows(db, validRows);
  const stockStatements = validRows.map((row) => prepareStockBasicUpsert(
    db,
    row,
    industryIdMap.get(row.industry_code || "UNKNOWN") || null,
    now,
  ));
  for (const batch of rowChunks(stockStatements, 40)) await db.batch(batch);
  const updated = existingStocks.size;
  const inserted = Math.max(0, validRows.length - updated);
  await updateStatus(
    db,
    "stock_basic",
    payload.latest_data_date || now.slice(0, 10),
    now,
    payload.source || "TWSE OpenAPI",
    "success",
    `Imported stock basic rows: inserted=${inserted}, updated=${updated}, batch=${payload.batch || ""}`,
  );
  await writeCrawlerLog(db, "import-stock-basic", payload.source || "TWSE OpenAPI", payload.source_url || SOURCE_TWSE_STOCK_BASIC, now, "success", inserted, updated, null);
  return { inserted, updated, received: rows.length };
}

async function importStockBasicRows(db, payload) {
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const now = new Date().toISOString();
  if (rows.length > 5) return importStockBasicRowsBulk(db, payload, rows, now);
  let inserted = 0;
  let updated = 0;

  for (const inputRow of rows) {
    const row = { ...inputRow, ...normalizeOfficialIndustry(inputRow) };
    if (!/^\d{4}$/.test(row.stock_code || "")) continue;
    const marketType = row.market_type || "上市";
    const industryId = await ensureIndustry(db, row, now);
    const existing = await db.prepare("select id from stocks where stock_code = ? and market_type = ?").bind(row.stock_code, marketType).first();
    await prepareStockBasicUpsert(db, row, industryId, now).run();

    existing ? updated++ : inserted++;
  }

  await updateStatus(
    db,
    "stock_basic",
    payload.latest_data_date || now.slice(0, 10),
    now,
    payload.source || "TWSE OpenAPI",
    "success",
    `Imported stock basic rows: inserted=${inserted}, updated=${updated}, batch=${payload.batch || ""}`,
  );
  await writeCrawlerLog(db, "import-stock-basic", payload.source || "TWSE OpenAPI", payload.source_url || SOURCE_TWSE_STOCK_BASIC, now, "success", inserted, updated, null);
  return { inserted, updated, received: rows.length };
}

function rowChunks(rows, size = 75) {
  const result = [];
  for (let index = 0; index < rows.length; index += size) result.push(rows.slice(index, index + size));
  return result;
}

async function stockIdMapForRows(db, rows) {
  const byMarket = new Map();
  for (const row of rows) {
    if (!/^\d{4}$/.test(row.stock_code || "")) continue;
    const marketType = row.market_type || "上市";
    if (!byMarket.has(marketType)) byMarket.set(marketType, new Set());
    byMarket.get(marketType).add(row.stock_code);
  }
  const stockMap = new Map();
  for (const [marketType, codes] of byMarket) {
    for (const codeChunk of rowChunks([...codes], 80)) {
      const placeholders = codeChunk.map(() => "?").join(",");
      const { results } = await db.prepare(`select id, stock_code, market_type from stocks where market_type = ? and stock_code in (${placeholders})`).bind(marketType, ...codeChunk).all();
      for (const stock of results) stockMap.set(`${stock.market_type}:${stock.stock_code}`, stock.id);
    }
  }
  return stockMap;
}

async function importDailyPriceRowsBulk(db, payload, rows, now) {
  const stockMap = await stockIdMapForRows(db, rows);
  const statements = [];
  let skipped = 0;
  let latestDate = null;

  for (const row of rows) {
    if (!/^\d{4}$/.test(row.stock_code || "") || !row.trade_date) continue;
    latestDate = latestDate && latestDate > row.trade_date ? latestDate : row.trade_date;
    const marketType = row.market_type || "上市";
    const stockId = stockMap.get(`${marketType}:${row.stock_code}`);
    if (!stockId) {
      skipped++;
      continue;
    }
    statements.push(db.prepare(`
      insert into daily_prices (
        stock_id, trade_date, open_price, high_price, low_price, close_price, change_price,
        change_percent, volume, turnover_value, transaction_count, market_type, source, source_url, created_at
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(stock_id, trade_date) do update set
        open_price = excluded.open_price,
        high_price = excluded.high_price,
        low_price = excluded.low_price,
        close_price = excluded.close_price,
        change_price = excluded.change_price,
        change_percent = excluded.change_percent,
        volume = excluded.volume,
        turnover_value = excluded.turnover_value,
        transaction_count = excluded.transaction_count,
        market_type = excluded.market_type,
        source = excluded.source,
        source_url = excluded.source_url,
        created_at = excluded.created_at
    `).bind(
      stockId,
      row.trade_date,
      toNumber(row.open_price),
      toNumber(row.high_price),
      toNumber(row.low_price),
      toNumber(row.close_price),
      toNumber(row.change_price),
      toNumber(row.change_percent),
      toNumber(row.volume),
      toNumber(row.turnover_value),
      toNumber(row.transaction_count),
      marketType,
      row.source || "TWSE OpenAPI",
      row.source_url || SOURCE_TWSE_DAILY_PRICE,
      now,
    ));
  }

  for (const batch of rowChunks(statements, 75)) await db.batch(batch);
  await updateStatus(db, "daily_price", payload.latest_data_date || latestDate, now, payload.source || "Official OpenAPI", "success", `Imported daily price rows: upserted=${statements.length}, skipped=${skipped}, batch=${payload.batch || ""}`);
  await updateImportedMarketQuality(db, {
    dataType: "daily_price",
    rows,
    source: payload.source || rows[0]?.source || "Official OpenAPI",
    latestDataDate: payload.latest_data_date || latestDate,
    note: `Imported daily price rows: upserted=${statements.length}, skipped=${skipped}, batch=${payload.batch || ""}`,
  });
  await writeCrawlerLog(db, "import-daily-price", payload.source || "Official OpenAPI", payload.source_url || SOURCE_TWSE_DAILY_PRICE, now, "success", 0, statements.length, null);
  return { inserted: 0, updated: statements.length, skipped, received: rows.length, latest_data_date: latestDate };
}

async function importDailyPriceRows(db, payload) {
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const now = new Date().toISOString();
  if (rows.length > 80) return importDailyPriceRowsBulk(db, payload, rows, now);
  let inserted = 0;
  let updated = 0;
  let latestDate = null;

  for (const row of rows) {
    if (!/^\d{4}$/.test(row.stock_code || "") || !row.trade_date) continue;
    latestDate = latestDate && latestDate > row.trade_date ? latestDate : row.trade_date;
    const marketType = row.market_type || "上市";
    let stock = await db.prepare("select id from stocks where stock_code = ? and market_type = ?").bind(row.stock_code, marketType).first();
    if (!stock) {
      await db.prepare(`
        insert into stocks (
          stock_code, stock_name, market_type, industry_code, industry_name,
          instrument_type, company_type, source, source_url, last_updated_at
        )
        values (?, ?, ?, 'UNKNOWN', '未分類', ?, ?, ?, ?, ?)
        on conflict(stock_code, market_type) do update set
          stock_name = excluded.stock_name,
          last_updated_at = excluded.last_updated_at
      `).bind(
        row.stock_code,
        row.stock_name || row.stock_code,
        marketType,
        marketType === "興櫃" ? "emerging" : "stock",
        `${marketType}股票`,
        row.source || "TWSE OpenAPI",
        row.source_url || SOURCE_TWSE_DAILY_PRICE,
        now,
      ).run();
      stock = await db.prepare("select id from stocks where stock_code = ? and market_type = ?").bind(row.stock_code, marketType).first();
    }

    const existing = await db.prepare("select id from daily_prices where stock_id = ? and trade_date = ?").bind(stock.id, row.trade_date).first();
    await db.prepare(`
      insert into daily_prices (
        stock_id, trade_date, open_price, high_price, low_price, close_price, change_price,
        change_percent, volume, turnover_value, transaction_count, market_type, source, source_url, created_at
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(stock_id, trade_date) do update set
        open_price = excluded.open_price,
        high_price = excluded.high_price,
        low_price = excluded.low_price,
        close_price = excluded.close_price,
        change_price = excluded.change_price,
        change_percent = excluded.change_percent,
        volume = excluded.volume,
        turnover_value = excluded.turnover_value,
        transaction_count = excluded.transaction_count,
        market_type = excluded.market_type,
        source = excluded.source,
        source_url = excluded.source_url,
        created_at = excluded.created_at
    `).bind(
      stock.id,
      row.trade_date,
      toNumber(row.open_price),
      toNumber(row.high_price),
      toNumber(row.low_price),
      toNumber(row.close_price),
      toNumber(row.change_price),
      toNumber(row.change_percent),
      toNumber(row.volume),
      toNumber(row.turnover_value),
      toNumber(row.transaction_count),
      marketType,
      row.source || "TWSE OpenAPI",
      row.source_url || SOURCE_TWSE_DAILY_PRICE,
      now,
    ).run();

    existing ? updated++ : inserted++;
  }

  await updateStatus(
    db,
    "daily_price",
    payload.latest_data_date || latestDate,
    now,
    payload.source || "TWSE OpenAPI",
    "success",
    `Imported daily price rows: inserted=${inserted}, updated=${updated}, batch=${payload.batch || ""}`,
  );
  await updateImportedMarketQuality(db, {
    dataType: "daily_price",
    rows,
    source: payload.source || rows[0]?.source || "Official OpenAPI",
    latestDataDate: payload.latest_data_date || latestDate,
    note: `Imported daily price rows: inserted=${inserted}, updated=${updated}, batch=${payload.batch || ""}`,
  });
  await writeCrawlerLog(db, "import-daily-price", payload.source || "TWSE OpenAPI", payload.source_url || SOURCE_TWSE_DAILY_PRICE, now, "success", inserted, updated, null);
  return { inserted, updated, received: rows.length, latest_data_date: latestDate };
}

async function importStockValuationRows(db, rows, errors = []) {
  const now = new Date().toISOString();
  const stockMap = await stockIdMapForRows(db, rows);
  const statements = [];
  let skipped = 0;
  let latestDate = null;
  for (const row of rows) {
    if (!/^\d{4}$/.test(row.stock_code || "") || !row.trade_date) continue;
    const marketType = row.market_type || "上市";
    const stockId = stockMap.get(`${marketType}:${row.stock_code}`);
    if (!stockId) {
      skipped++;
      continue;
    }
    latestDate = latestDate && latestDate > row.trade_date ? latestDate : row.trade_date;
    statements.push(db.prepare(`
      insert into stock_valuations (
        stock_id, trade_date, pe_ratio, ttm_eps, dividend_yield, pb_ratio,
        fiscal_period, market_type, source, source_url, created_at
      )
      values (?, ?, ?, null, ?, ?, ?, ?, ?, ?, ?)
      on conflict(stock_id, trade_date) do update set
        pe_ratio = excluded.pe_ratio,
        dividend_yield = excluded.dividend_yield,
        pb_ratio = excluded.pb_ratio,
        fiscal_period = excluded.fiscal_period,
        market_type = excluded.market_type,
        source = excluded.source,
        source_url = excluded.source_url,
        created_at = excluded.created_at
    `).bind(
      stockId,
      row.trade_date,
      toNumber(row.pe_ratio),
      toNumber(row.dividend_yield),
      toNumber(row.pb_ratio),
      row.fiscal_period || null,
      marketType,
      row.source || "Official daily valuation",
      row.source_url || "",
      now,
    ));
  }
  for (const batch of rowChunks(statements, 75)) await db.batch(batch);
  const status = errors.length ? "partial" : "success";
  await updateStatus(db, "stock_valuation", latestDate, now, "TWSE/TPEx official valuation", status, `Imported valuation rows: ${statements.length}; skipped=${skipped}; source_errors=${errors.length}`);
  await updateQualityStatus(db, {
    dataType: "stock_valuation",
    marketScope: "all",
    source: "TWSE/TPEx official valuation",
    latestDataDate: latestDate,
    status,
    recordCount: statements.length,
    coveredStocks: statements.length,
    expectedStocks: await expectedStockCount(db, "all"),
    note: errors.length ? JSON.stringify(errors).slice(0, 800) : "Official daily P/E, yield, and P/B.",
  });
  await writeCrawlerLog(db, "import-stock-valuation", "TWSE/TPEx official valuation", "", now, status, 0, statements.length, errors.length ? JSON.stringify(errors).slice(0, 1800) : null);
  return { inserted: 0, updated: statements.length, skipped, received: rows.length, latest_data_date: latestDate, errors };
}

async function importInstitutionalFlowRows(db, payload, rowsInput = null) {
  const rows = Array.isArray(rowsInput) ? rowsInput : Array.isArray(payload.rows) ? payload.rows : [];
  const now = new Date().toISOString();
  const stockMap = await stockIdMapForRows(db, rows);
  const statements = [];
  let skipped = 0;
  let latestDate = null;

  for (const row of rows) {
    if (!/^\d{4}$/.test(row.stock_code || "") || !row.trade_date) continue;
    latestDate = latestDate && latestDate > row.trade_date ? latestDate : row.trade_date;
    const marketType = row.market_type || "上市";
    const stockId = stockMap.get(`${marketType}:${row.stock_code}`);
    if (!stockId) {
      skipped++;
      continue;
    }
    statements.push(db.prepare(`
      insert into institutional_flows (
        stock_id, trade_date, foreign_investor_net_buy, investment_trust_net_buy,
        dealer_net_buy, total_institutional_net_buy, foreign_investor_holding_shares,
        foreign_investor_holding_percent, issued_shares, source, source_url, created_at
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(stock_id, trade_date) do update set
        foreign_investor_net_buy = excluded.foreign_investor_net_buy,
        investment_trust_net_buy = excluded.investment_trust_net_buy,
        dealer_net_buy = excluded.dealer_net_buy,
        total_institutional_net_buy = excluded.total_institutional_net_buy,
        foreign_investor_holding_shares = coalesce(excluded.foreign_investor_holding_shares, institutional_flows.foreign_investor_holding_shares),
        foreign_investor_holding_percent = coalesce(excluded.foreign_investor_holding_percent, institutional_flows.foreign_investor_holding_percent),
        issued_shares = coalesce(excluded.issued_shares, institutional_flows.issued_shares),
        source = excluded.source,
        source_url = excluded.source_url,
        created_at = excluded.created_at
    `).bind(
      stockId,
      row.trade_date,
      toNumber(row.foreign_investor_net_buy),
      toNumber(row.investment_trust_net_buy),
      toNumber(row.dealer_net_buy),
      toNumber(row.total_institutional_net_buy),
      toNumber(row.foreign_investor_holding_shares),
      toNumber(row.foreign_investor_holding_percent),
      toNumber(row.issued_shares),
      row.source || payload.source || "Official institutional flow",
      row.source_url || payload.source_url || "",
      now,
    ));
  }

  for (const batch of rowChunks(statements, 75)) await db.batch(batch);
  await updateStatus(db, "institutional_flow", payload.latest_data_date || latestDate, now, payload.source || "Official institutional flow", "success", `Imported institutional flow rows: upserted=${statements.length}, skipped=${skipped}, batch=${payload.batch || ""}`);
  await writeCrawlerLog(db, "import-institutional-flow", payload.source || "Official institutional flow", payload.source_url || "", now, "success", 0, statements.length, null);
  await updateImportedMarketQuality(db, {
    dataType: "institutional_flow",
    rows: rows.map((row) => ({ ...row, market_type: row.market_type || "上市" })),
    source: payload.source || rows[0]?.source || "Official institutional flow",
    latestDataDate: payload.latest_data_date || latestDate,
    note: `Imported institutional flow rows: upserted=${statements.length}, skipped=${skipped}, batch=${payload.batch || ""}`,
  });
  return { inserted: 0, updated: statements.length, skipped, received: rows.length, latest_data_date: latestDate };
}

async function importMarketIndexRows(db, payload, rowsInput = null) {
  const rows = Array.isArray(rowsInput) ? rowsInput : Array.isArray(payload.rows) ? payload.rows : [];
  const now = new Date().toISOString();
  const statements = [];
  let latestDate = null;
  for (const row of rows) {
    if (!row.index_code || !row.trade_date) continue;
    latestDate = latestDate && latestDate > row.trade_date ? latestDate : row.trade_date;
    statements.push(db.prepare(`
      insert into market_index_prices (
        index_code, index_name, trade_date, open_index, high_index, low_index,
        close_index, source, source_url, created_at
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(index_code, trade_date) do update set
        index_name = excluded.index_name,
        open_index = excluded.open_index,
        high_index = excluded.high_index,
        low_index = excluded.low_index,
        close_index = excluded.close_index,
        source = excluded.source,
        source_url = excluded.source_url,
        created_at = excluded.created_at
    `).bind(
      row.index_code,
      row.index_name || row.index_code,
      row.trade_date,
      toNumber(row.open_index),
      toNumber(row.high_index),
      toNumber(row.low_index),
      toNumber(row.close_index),
      row.source || payload.source || "TWSE index",
      row.source_url || payload.source_url || "",
      now,
    ));
  }
  for (const batch of rowChunks(statements, 75)) await db.batch(batch);
  await updateStatus(db, "market_index", payload.latest_data_date || latestDate, now, payload.source || "TWSE index", "success", `Imported market index rows: upserted=${statements.length}, batch=${payload.batch || ""}`);
  await writeCrawlerLog(db, "import-market-index", payload.source || "TWSE index", payload.source_url || "", now, "success", 0, statements.length, null);
  return { inserted: 0, updated: statements.length, received: rows.length, latest_data_date: latestDate };
}

async function importDividendRows(db, payload, rowsInput = null) {
  const rows = Array.isArray(rowsInput) ? rowsInput : Array.isArray(payload.rows) ? payload.rows : [];
  const now = new Date().toISOString();
  const stockMap = await stockIdMapForRows(db, rows);
  const statements = [];
  let skipped = 0;
  let latestDate = null;
  for (const row of rows) {
    if (!/^\d{4}$/.test(row.stock_code || "") || !row.ex_dividend_date) continue;
    latestDate = latestDate && latestDate > row.ex_dividend_date ? latestDate : row.ex_dividend_date;
    const marketType = row.market_type || "上市";
    const stockId = stockMap.get(`${marketType}:${row.stock_code}`);
    if (!stockId) {
      skipped++;
      continue;
    }
    statements.push(db.prepare(`
      insert into stock_dividends (
        stock_id, stock_code, stock_name, market_type, ex_dividend_date, before_close,
        reference_price, dividend_value, dividend_type, source, source_url, created_at
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(stock_id, ex_dividend_date, dividend_type) do update set
        stock_code = excluded.stock_code,
        stock_name = excluded.stock_name,
        market_type = excluded.market_type,
        before_close = excluded.before_close,
        reference_price = excluded.reference_price,
        dividend_value = excluded.dividend_value,
        source = excluded.source,
        source_url = excluded.source_url,
        created_at = excluded.created_at
    `).bind(
      stockId,
      row.stock_code,
      row.stock_name || row.stock_code,
      marketType,
      row.ex_dividend_date,
      toNumber(row.before_close),
      toNumber(row.reference_price),
      toNumber(row.dividend_value),
      row.dividend_type || "\u9664\u6b0a\u606f",
      row.source || payload.source || "TWSE TWT49U",
      row.source_url || payload.source_url || "",
      now,
    ));
  }
  for (const batch of rowChunks(statements, 75)) await db.batch(batch);
  await updateStatus(db, "dividend_calendar", payload.latest_data_date || latestDate, now, payload.source || "TWSE dividend", "success", `Imported dividend rows: upserted=${statements.length}, skipped=${skipped}, batch=${payload.batch || ""}`);
  await writeCrawlerLog(db, "import-dividend-calendar", payload.source || "TWSE dividend", payload.source_url || "", now, "success", 0, statements.length, null);
  return { inserted: 0, updated: statements.length, skipped, received: rows.length, latest_data_date: latestDate };
}

async function importMonthlyRevenueRowsBulk(db, payload, rows, now) {
  const stockMap = await stockIdMapForRows(db, rows);
  const statements = [];
  let skipped = 0;
  let latestPeriod = null;

  for (const row of rows) {
    if (!/^\d{4}$/.test(row.stock_code || "") || !row.revenue_year || !row.revenue_month) continue;
    const period = `${row.revenue_year}-${String(row.revenue_month).padStart(2, "0")}-01`;
    latestPeriod = latestPeriod && latestPeriod > period ? latestPeriod : period;
    const marketType = row.market_type || "上市";
    const stockId = stockMap.get(`${marketType}:${row.stock_code}`);
    if (!stockId) {
      skipped++;
      continue;
    }
    statements.push(db.prepare(`
      insert into monthly_revenue (
        stock_id, revenue_year, revenue_month, report_date, monthly_revenue, last_month_revenue,
        last_year_revenue, mom_growth_percent, yoy_growth_percent, cumulative_revenue,
        cumulative_yoy_growth_percent, note, source, source_url, created_at
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(stock_id, revenue_year, revenue_month) do update set
        report_date = excluded.report_date,
        monthly_revenue = excluded.monthly_revenue,
        last_month_revenue = excluded.last_month_revenue,
        last_year_revenue = excluded.last_year_revenue,
        mom_growth_percent = excluded.mom_growth_percent,
        yoy_growth_percent = excluded.yoy_growth_percent,
        cumulative_revenue = excluded.cumulative_revenue,
        cumulative_yoy_growth_percent = excluded.cumulative_yoy_growth_percent,
        note = excluded.note,
        source = excluded.source,
        source_url = excluded.source_url,
        created_at = excluded.created_at
    `).bind(
      stockId,
      Number(row.revenue_year),
      Number(row.revenue_month),
      row.report_date || period,
      toNumber(row.monthly_revenue),
      toNumber(row.last_month_revenue),
      toNumber(row.last_year_revenue),
      toNumber(row.mom_growth_percent),
      toNumber(row.yoy_growth_percent),
      toNumber(row.cumulative_revenue),
      toNumber(row.cumulative_yoy_growth_percent),
      row.note || null,
      row.source || "Official OpenAPI",
      row.source_url || "",
      now,
    ));
  }

  for (const batch of rowChunks(statements, 75)) await db.batch(batch);
  await updateStatus(db, "monthly_revenue", payload.latest_data_date || latestPeriod, now, payload.source || "Official OpenAPI", "success", `Imported monthly revenue rows: upserted=${statements.length}, skipped=${skipped}, batch=${payload.batch || ""}`);
  await writeCrawlerLog(db, "import-monthly-revenue", payload.source || "Official OpenAPI", payload.source_url || "", now, "success", 0, statements.length, null);
  return { inserted: 0, updated: statements.length, skipped, received: rows.length, latest_data_date: latestPeriod };
}

async function importMonthlyRevenueRows(db, payload) {
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const now = new Date().toISOString();
  if (rows.length > 80) return importMonthlyRevenueRowsBulk(db, payload, rows, now);
  let inserted = 0;
  let updated = 0;
  let latestPeriod = null;

  for (const row of rows) {
    if (!/^\d{4}$/.test(row.stock_code || "") || !row.revenue_year || !row.revenue_month) continue;
    const period = `${row.revenue_year}-${String(row.revenue_month).padStart(2, "0")}-01`;
    latestPeriod = latestPeriod && latestPeriod > period ? latestPeriod : period;
    const marketType = row.market_type || "上市";
    let stock = await db.prepare("select id from stocks where stock_code = ? and market_type = ?").bind(row.stock_code, marketType).first();
    if (!stock) {
      await db.prepare(`
        insert into stocks (stock_code, stock_name, market_type, industry_code, industry_name, company_type, source, source_url, last_updated_at)
        values (?, ?, ?, 'UNKNOWN', '未分類', ?, ?, ?, ?)
        on conflict(stock_code, market_type) do update set
          stock_name = excluded.stock_name,
          last_updated_at = excluded.last_updated_at
      `).bind(row.stock_code, row.stock_name || row.stock_code, marketType, `${marketType}股票`, row.source || "Official OpenAPI", row.source_url || "", now).run();
      stock = await db.prepare("select id from stocks where stock_code = ? and market_type = ?").bind(row.stock_code, marketType).first();
    }

    const existing = await db.prepare("select id from monthly_revenue where stock_id = ? and revenue_year = ? and revenue_month = ?").bind(stock.id, row.revenue_year, row.revenue_month).first();
    await db.prepare(`
      insert into monthly_revenue (
        stock_id, revenue_year, revenue_month, report_date, monthly_revenue, last_month_revenue,
        last_year_revenue, mom_growth_percent, yoy_growth_percent, cumulative_revenue,
        cumulative_yoy_growth_percent, note, source, source_url, created_at
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(stock_id, revenue_year, revenue_month) do update set
        report_date = excluded.report_date,
        monthly_revenue = excluded.monthly_revenue,
        last_month_revenue = excluded.last_month_revenue,
        last_year_revenue = excluded.last_year_revenue,
        mom_growth_percent = excluded.mom_growth_percent,
        yoy_growth_percent = excluded.yoy_growth_percent,
        cumulative_revenue = excluded.cumulative_revenue,
        cumulative_yoy_growth_percent = excluded.cumulative_yoy_growth_percent,
        note = excluded.note,
        source = excluded.source,
        source_url = excluded.source_url,
        created_at = excluded.created_at
    `).bind(
      stock.id,
      Number(row.revenue_year),
      Number(row.revenue_month),
      row.report_date || period,
      toNumber(row.monthly_revenue),
      toNumber(row.last_month_revenue),
      toNumber(row.last_year_revenue),
      toNumber(row.mom_growth_percent),
      toNumber(row.yoy_growth_percent),
      toNumber(row.cumulative_revenue),
      toNumber(row.cumulative_yoy_growth_percent),
      row.note || null,
      row.source || "Official OpenAPI",
      row.source_url || "",
      now,
    ).run();

    existing ? updated++ : inserted++;
  }

  await updateStatus(
    db,
    "monthly_revenue",
    payload.latest_data_date || latestPeriod,
    now,
    payload.source || "Official OpenAPI",
    "success",
    `Imported monthly revenue rows: inserted=${inserted}, updated=${updated}, batch=${payload.batch || ""}`,
  );
  await writeCrawlerLog(db, "import-monthly-revenue", payload.source || "Official OpenAPI", payload.source_url || "", now, "success", inserted, updated, null);
  return { inserted, updated, received: rows.length, latest_data_date: latestPeriod };
}

async function ensureTheme(db, theme, now) {
  await db.prepare(`
    insert into themes (theme_name, theme_category, description, keywords, source, source_url, last_updated_at)
    values (?, ?, ?, ?, ?, ?, ?)
    on conflict(theme_name) do update set
      theme_category = excluded.theme_category,
      description = excluded.description,
      keywords = excluded.keywords,
      source = excluded.source,
      source_url = excluded.source_url,
      last_updated_at = excluded.last_updated_at
  `).bind(
    theme.theme_name,
    theme.theme_category || "theme",
    theme.description || null,
    Array.isArray(theme.keywords) ? theme.keywords.join(",") : theme.keywords || null,
    theme.source || "auto-theme-rule-v2",
    theme.source_url || "scripts/sync-twse-to-cloudflare.mjs",
    now,
  ).run();
  return db.prepare("select id from themes where theme_name = ?").bind(theme.theme_name).first();
}

async function importThemeTagRows(db, payload) {
  const now = new Date().toISOString();
  const scoreDate = payload.score_date || now.slice(0, 10);
  const themes = Array.isArray(payload.themes) ? payload.themes : [];
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const scores = Array.isArray(payload.scores) ? payload.scores : [];
  let themesUpserted = 0;
  let linksUpserted = 0;
  let rolesInserted = 0;
  let scoresUpserted = 0;

  if (payload.replace) {
    await db.prepare("delete from supply_chain_roles where source like 'auto-theme-rule-%'").run();
    await db.prepare("delete from stock_themes where source like 'auto-theme-rule-%'").run();
    await db.prepare("delete from theme_scores").run();
  }

  for (const theme of themes) {
    if (!theme.theme_name) continue;
    await ensureTheme(db, theme, now);
    themesUpserted++;
  }

  for (const row of rows) {
    if (!row.stock_code || !row.theme_name) continue;
    const marketType = row.market_type || "上市";
    const stock = await db.prepare("select id from stocks where stock_code = ? and market_type = ?").bind(row.stock_code, marketType).first();
    if (!stock) continue;
    const theme = await ensureTheme(db, {
      theme_name: row.theme_name,
      theme_category: row.theme_category,
      description: row.theme_description,
      keywords: row.keywords,
      source: row.source,
      source_url: row.source_url,
    }, now);
    if (!theme) continue;
    const classificationConfidence = toNumber(row.confidence_score)
      || (row.relation_strength === "強" ? 88 : row.relation_strength === "中" ? 68 : 55);
    const reviewStatus = row.review_status
      || (classificationConfidence >= PUBLIC_CLASSIFICATION_CONFIDENCE ? "approved" : "pending");

    await db.prepare(`
      insert into stock_themes (
        stock_id, theme_id, relation_strength, reason, source, source_url, updated_at,
        confidence_score, evidence_type, evidence_url, rule_version, review_status
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(stock_id, theme_id) do update set
        relation_strength = excluded.relation_strength,
        reason = excluded.reason,
        source = excluded.source,
        source_url = excluded.source_url,
        updated_at = excluded.updated_at,
        confidence_score = excluded.confidence_score,
        evidence_type = excluded.evidence_type,
        evidence_url = excluded.evidence_url,
        rule_version = excluded.rule_version,
        review_status = excluded.review_status
      where stock_themes.source not in ('manual', 'manual-review')
    `).bind(
      stock.id,
      theme.id,
      row.relation_strength || "中",
      row.reason || null,
      row.source || "auto-theme-rule-v2",
      row.source_url || "scripts/sync-twse-to-cloudflare.mjs",
      now,
      classificationConfidence,
      row.evidence_type || "curated-stock-list",
      row.evidence_url || row.source_url || "scripts/sync-twse-to-cloudflare.mjs",
      row.rule_version || "auto-theme-rule-v2",
      reviewStatus,
    ).run();
    linksUpserted++;

    if (row.role_type || row.role_description || row.major_products || row.major_customers) {
      await db.prepare(`
        insert into supply_chain_roles (
          stock_id, theme_id, role_type, role_description, major_products, major_customers,
          confidence_score, source, source_url, updated_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        stock.id,
        theme.id,
        normalizeRoleType(row.role_type),
        row.role_description || null,
        row.major_products || null,
        row.major_customers || null,
        toNumber(row.confidence_score) || 60,
        row.source || "auto-theme-rule-v2",
        row.source_url || "scripts/sync-twse-to-cloudflare.mjs",
        now,
      ).run();
      rolesInserted++;
    }
  }

  for (const score of scores) {
    if (!score.theme_name) continue;
    const theme = await ensureTheme(db, score, now);
    if (!theme) continue;
    await db.prepare(`
      insert into theme_scores (
        theme_id, score_date, turnover_score, institutional_score, momentum_score,
        fundamental_score, news_score, total_theme_score, rank, status, reason, created_at
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(theme_id, score_date) do update set
        turnover_score = excluded.turnover_score,
        institutional_score = excluded.institutional_score,
        momentum_score = excluded.momentum_score,
        fundamental_score = excluded.fundamental_score,
        news_score = excluded.news_score,
        total_theme_score = excluded.total_theme_score,
        rank = excluded.rank,
        status = excluded.status,
        reason = excluded.reason,
        created_at = excluded.created_at
    `).bind(
      theme.id,
      scoreDate,
      toNumber(score.turnover_score),
      toNumber(score.institutional_score),
      toNumber(score.momentum_score),
      toNumber(score.fundamental_score),
      toNumber(score.news_score),
      toNumber(score.total_theme_score),
      toNumber(score.rank),
      normalizeThemeStatus(score.status),
      score.reason || null,
      now,
    ).run();
    scoresUpserted++;
  }

  await updateStatus(
    db,
    "theme_tags",
    scoreDate,
    now,
    payload.source || "auto-theme-rule-v2",
    "success",
    `Imported theme tags: themes=${themesUpserted}, links=${linksUpserted}, roles=${rolesInserted}, scores=${scoresUpserted}, batch=${payload.batch || ""}`,
  );
  if (scores.length) {
    const classificationCoverage = await db.prepare(`
      select count(*) as links, count(distinct stock_id) as stocks
      from stock_themes
      where review_status = 'approved' or confidence_score >= ?
    `).bind(PUBLIC_CLASSIFICATION_CONFIDENCE).first();
    await updateQualityStatus(db, {
      dataType: "theme_classification",
      marketScope: "all",
      source: payload.source || "auto-theme-rule-v2",
      latestDataDate: scoreDate,
      status: "success",
      recordCount: classificationCoverage?.links || 0,
      coveredStocks: classificationCoverage?.stocks || 0,
      expectedStocks: await expectedStockCount(db, "all"),
      note: `Only approved or confidence >= ${PUBLIC_CLASSIFICATION_CONFIDENCE} is public.`,
    });
  }
  await writeCrawlerLog(db, "import-theme-tags", payload.source || "auto-theme-rule-v2", payload.source_url || "scripts/sync-twse-to-cloudflare.mjs", now, "success", linksUpserted, themesUpserted, null);
  return { themes: themesUpserted, links: linksUpserted, roles: rolesInserted, scores: scoresUpserted };
}

async function syncOfficialStockBasic(db) {
  const jobs = [
    ["twse_stock_basic", SOURCE_TWSE_STOCK_BASIC, normalizeTwseStockBasic, "TWSE OpenAPI", "上市"],
    ["tpex_otc_stock_basic", SOURCE_TPEX_OTC_STOCK_BASIC, (row) => normalizeTpexStockBasic(row, "上櫃", SOURCE_TPEX_OTC_STOCK_BASIC), "TPEx OpenAPI", "上櫃"],
    ["tpex_emerging_stock_basic", SOURCE_TPEX_EMERGING_STOCK_BASIC, (row) => normalizeTpexStockBasic(row, "興櫃", SOURCE_TPEX_EMERGING_STOCK_BASIC), "TPEx OpenAPI", "興櫃"],
  ];
  const summary = {};
  for (const [name, url, normalizer, source, marketType] of jobs) {
    try {
      const raw = await fetchOfficialJson(url);
      const rows = raw.map(normalizer).filter(Boolean);
      const latestDataDate = new Date().toISOString().slice(0, 10);
      summary[name] = await importStockBasicRows(db, {
        rows,
        source,
        source_url: url,
        latest_data_date: latestDataDate,
        batch: "worker-official-sync",
      });
      await updateQualityStatus(db, {
        dataType: "stock_basic",
        marketScope: marketType,
        source,
        latestDataDate,
        status: rows.length ? "success" : "partial",
        recordCount: rows.length,
        coveredStocks: new Set(rows.map((row) => row.stock_code)).size,
        expectedStocks: await expectedStockCount(db, marketType, "all"),
      });
    } catch (error) {
      summary[name] = { error: String(error && error.message ? error.message : error), source_url: url };
      await updateQualityStatus(db, {
        dataType: "stock_basic",
        marketScope: marketType,
        source,
        status: "failed",
        expectedStocks: await expectedStockCount(db, marketType),
        note: String(error && error.message ? error.message : error),
      });
    }
  }
  return summary;
}

async function syncOfficialDailyPrice(db, payload = {}) {
  const jobs = [
    {
      name: "twse_daily_price",
      marketType: "上市",
      source: "TWSE daily close",
      sourceUrl: `${SOURCE_TWSE_DAILY_PRICE} + ${SOURCE_TWSE_MI_INDEX}`,
      load: fetchTwseDailyRows,
    },
    {
      name: "tpex_otc_daily_price",
      marketType: "上櫃",
      source: "TPEx JSON",
      sourceUrl: SOURCE_TPEX_OTC_AFTER_TRADING,
      load: fetchTpexOtcDailyRows,
    },
    {
      name: "tpex_emerging_daily_price",
      marketType: "興櫃",
      source: "TPEx OpenAPI",
      sourceUrl: SOURCE_TPEX_EMERGING_DAILY_PRICE,
      load: async () => (await fetchOfficialJson(SOURCE_TPEX_EMERGING_DAILY_PRICE)).map(normalizeTpexEmergingDailyPrice).filter((row) => row && row.trade_date),
    },
  ].filter((job) => payload.skip_tpex !== true || !job.name.startsWith("tpex_"));
  const summary = {};
  for (const job of jobs) {
    try {
      const rows = await job.load();
      const latestDataDate = rows.reduce((latest, row) => (latest && latest > row.trade_date ? latest : row.trade_date), null);
      summary[job.name] = await importDailyPriceRows(db, {
        rows,
        source: job.source,
        source_url: job.sourceUrl,
        latest_data_date: latestDataDate,
        batch: "worker-official-sync",
      });
      await updateQualityStatus(db, {
        dataType: "daily_price",
        marketScope: job.marketType,
        source: job.source,
        latestDataDate,
        status: rows.length ? "success" : "partial",
        recordCount: rows.length,
        coveredStocks: new Set(rows.map((row) => row.stock_code)).size,
        expectedStocks: await expectedStockCount(db, job.marketType),
        note: rows.length ? null : "Official source returned no rows.",
      });
    } catch (error) {
      summary[job.name] = { error: String(error && error.message ? error.message : error), source_url: job.sourceUrl };
      await updateQualityStatus(db, {
        dataType: "daily_price",
        marketScope: job.marketType,
        source: job.source,
        status: "failed",
        expectedStocks: await expectedStockCount(db, job.marketType),
        note: String(error && error.message ? error.message : error),
      });
    }
  }
  return summary;
}

async function syncOfficialMonthlyRevenue(db) {
  const jobs = [
    ["mops_listed_monthly_revenue", mopsRevenueCsvUrl("sii"), (row, url) => normalizeMonthlyRevenue(row, "上市", "MOPS CSV", url), "MOPS CSV", "上市"],
    ["mops_otc_monthly_revenue", mopsRevenueCsvUrl("otc"), (row, url) => normalizeMonthlyRevenue(row, "上櫃", "MOPS CSV", url), "MOPS CSV", "上櫃"],
    ["mops_emerging_monthly_revenue", mopsRevenueCsvUrl("rotc"), (row, url) => normalizeMonthlyRevenue(row, "興櫃", "MOPS CSV", url), "MOPS CSV", "興櫃"],
  ];
  const summary = {};
  for (const [name, url, normalizer, source, marketType] of jobs) {
    try {
      const raw = parseCsv(await fetchOfficialText(url));
      const rows = raw.map((row) => normalizer(row, url)).filter(Boolean);
      const latestDataDate = rows.reduce((latest, row) => {
        const period = `${row.revenue_year}-${String(row.revenue_month).padStart(2, "0")}-01`;
        return latest && latest > period ? latest : period;
      }, null);
      summary[name] = await importMonthlyRevenueRows(db, {
        rows,
        source,
        source_url: url,
        latest_data_date: latestDataDate,
        batch: "worker-official-sync",
      });
      await updateQualityStatus(db, {
        dataType: "monthly_revenue",
        marketScope: marketType,
        source,
        latestDataDate,
        status: rows.length ? "success" : "partial",
        recordCount: rows.length,
        coveredStocks: new Set(rows.map((row) => row.stock_code)).size,
        expectedStocks: await expectedStockCount(db, marketType),
        note: rows.length ? null : "Official source returned no rows.",
      });
    } catch (error) {
      summary[name] = { error: String(error && error.message ? error.message : error), source_url: url };
      await updateQualityStatus(db, {
        dataType: "monthly_revenue",
        marketScope: marketType,
        source,
        status: "failed",
        expectedStocks: await expectedStockCount(db, marketType),
        note: String(error && error.message ? error.message : error),
      });
    }
  }
  return summary;
}

async function syncOfficialMonthlyRevenueHistoryBatch(db, payload = {}) {
  const months = clampInt(payload.months, 24, 1, 36);
  const cursor = clampInt(payload.cursor, 0, 0, months);
  const batchSize = clampInt(payload.batch, 1, 1, 1);
  const periods = recentMopsRevenuePeriods(months);
  const selected = periods.slice(cursor, cursor + batchSize);
  const markets = [
    ["listed", "sii", "上市"],
    ["otc", "otc", "上櫃"],
    ["emerging", "rotc", "興櫃"],
  ];
  const rows = [];
  const errors = [];
  const fetched = [];

  for (const period of selected) {
    for (const [marketName, marketPath, marketType] of markets) {
      const url = mopsRevenueCsvUrl(marketPath, period);
      try {
        const raw = parseCsv(await fetchOfficialText(url));
        const normalized = raw.map((row) => normalizeMonthlyRevenue(row, marketType, "MOPS CSV", url)).filter(Boolean);
        rows.push(...normalized);
        fetched.push({ market: marketName, period: `${period.year}-${String(period.month).padStart(2, "0")}`, rows: normalized.length, source_url: url });
      } catch (error) {
        errors.push({ market: marketName, period: `${period.year}-${String(period.month).padStart(2, "0")}`, error: String(error && error.message ? error.message : error), source_url: url });
      }
    }
  }

  const latestDataDate = rows.reduce((latest, row) => {
    const period = `${row.revenue_year}-${String(row.revenue_month).padStart(2, "0")}-01`;
    return latest && latest > period ? latest : period;
  }, null);
  const imported = rows.length ? await importMonthlyRevenueRows(db, {
    rows,
    source: "MOPS CSV",
    latest_data_date: latestDataDate,
    batch: `history-${cursor}-${cursor + selected.length}`,
  }) : { inserted: 0, updated: 0, skipped: 0, received: 0, latest_data_date: latestDataDate };
  const nextCursor = Math.min(months, cursor + selected.length);
  return {
    ...imported,
    cursor,
    next_cursor: nextCursor,
    done: nextCursor >= months,
    months,
    batch: batchSize,
    fetched,
    errors,
  };
}

async function syncOfficialInstitutionalFlows(db, payload = {}) {
  const jobs = [
    ["twse_institutional_flow", fetchTwseInstitutionalRows, "TWSE T86", SOURCE_TWSE_INSTITUTIONAL_T86, "上市"],
    ["tpex_institutional_flow", fetchTpexInstitutionalRows, "TPEx institutional dailyTrade", SOURCE_TPEX_INSTITUTIONAL_DAILY, "上櫃"],
  ].filter(([name]) => payload.skip_tpex !== true || !name.startsWith("tpex_"));
  const summary = {};
  for (const [name, load, source, sourceUrl, marketType] of jobs) {
    try {
      const rows = await load();
      const latestDataDate = rows.reduce((latest, row) => (latest && latest > row.trade_date ? latest : row.trade_date), null);
      summary[name] = await importInstitutionalFlowRows(db, {
        rows,
        source,
        source_url: sourceUrl,
        latest_data_date: latestDataDate,
        batch: "worker-official-sync",
      });
      await updateQualityStatus(db, {
        dataType: "institutional_flow",
        marketScope: marketType,
        source,
        latestDataDate,
        status: rows.length ? "success" : "partial",
        recordCount: rows.length,
        coveredStocks: new Set(rows.map((row) => row.stock_code)).size,
        expectedStocks: await expectedStockCount(db, marketType),
        note: rows.length ? null : "Official source returned no rows.",
      });
    } catch (error) {
      summary[name] = { error: String(error && error.message ? error.message : error), source_url: sourceUrl };
      await updateQualityStatus(db, {
        dataType: "institutional_flow",
        marketScope: marketType,
        source,
        status: "failed",
        expectedStocks: await expectedStockCount(db, marketType),
        note: String(error && error.message ? error.message : error),
      });
    }
  }
  return summary;
}

async function syncOfficialInstitutionalHistoryBatch(db, payload = {}) {
  const days = clampInt(payload.days, 10, 1, 10);
  const cursor = clampInt(payload.cursor, 0, 0, 60);
  const batch = await fetchTwseInstitutionalBatch({ cursor, tradingDays: 1, lookbackDays: 30 });
  const latestDataDate = batch.rows.reduce((latest, row) => (latest && latest > row.trade_date ? latest : row.trade_date), null);
  const imported = batch.rows.length ? await importInstitutionalFlowRows(db, {
    rows: batch.rows,
    source: "TWSE T86 + MI_QFIIS",
    source_url: SOURCE_TWSE_INSTITUTIONAL_T86,
    latest_data_date: latestDataDate,
    batch: `history-${cursor}-${batch.next_cursor}`,
  }) : { inserted: 0, updated: 0, skipped: 0, received: 0, latest_data_date: latestDataDate };
  return {
    ...imported,
    cursor,
    next_cursor: batch.next_cursor,
    done: batch.done || batch.next_cursor >= 30,
    target_days: days,
    fetched: batch.fetched,
    errors: batch.errors,
  };
}

async function syncOfficialMarketIndex(db, payload = {}) {
  const months = clampInt(payload.months, 12, 1, 36);
  const rows = [];
  const errors = [];
  for (const period of recentYearMonthPeriods(months)) {
    const url = taiexHistoryUrl(period.year, period.month);
    try {
      const doc = await fetchOfficialJsonDocument(url);
      const normalized = (Array.isArray(doc?.data) ? doc.data : []).map((cells) => normalizeTaiexHistoryRow(cells, url)).filter(Boolean);
      rows.push(...normalized);
    } catch (error) {
      errors.push({ period: `${period.year}-${String(period.month).padStart(2, "0")}`, source_url: url, error: String(error && error.message ? error.message : error) });
    }
  }
  const imported = await importMarketIndexRows(db, {
    rows,
    source: "TWSE MI_5MINS_HIST",
    source_url: SOURCE_TWSE_TAIEX_HISTORY,
    batch: `latest-${months}-months`,
  });
  return { ...imported, months, errors };
}

async function syncOfficialDividendCalendar(db) {
  const url = `${SOURCE_TWSE_EX_DIVIDEND}?response=json`;
  const doc = await fetchOfficialJsonDocument(url);
  const rows = (Array.isArray(doc?.data) ? doc.data : [])
    .map((cells) => normalizeTwseExDividend(cells, url))
    .filter(Boolean);
  return importDividendRows(db, {
    rows,
    source: "TWSE TWT49U",
    source_url: url,
    batch: "worker-official-sync",
  });
}

async function syncOfficialStockValuations(db) {
  const { rows, errors } = await fetchOfficialValuationRows(db);
  return importStockValuationRows(db, rows, errors);
}

async function syncOfficialMarketData(db, payload = {}) {
  const startedAt = new Date().toISOString();
  const requestedTasks = Array.isArray(payload.tasks) && payload.tasks.length ? payload.tasks : ["daily-price", "stock-valuation", "monthly-revenue", "institutional-flow", "market-index", "dividend"];
  const tasks = new Set(requestedTasks);
  const summary = {};
  try {
    if (tasks.has("stock-basic") || tasks.has("all")) summary.stock_basic = await syncOfficialStockBasic(db);
    if (tasks.has("daily-price") || tasks.has("all")) summary.daily_price = await syncOfficialDailyPrice(db, payload);
    if (tasks.has("stock-valuation") || tasks.has("all")) summary.stock_valuation = await syncOfficialStockValuations(db);
    if (tasks.has("monthly-revenue") || tasks.has("all")) summary.monthly_revenue = await syncOfficialMonthlyRevenue(db);
    if (tasks.has("institutional-flow") || tasks.has("all")) summary.institutional_flow = await syncOfficialInstitutionalFlows(db, payload);
    if (tasks.has("market-index") || tasks.has("all")) summary.market_index = await syncOfficialMarketIndex(db, { months: payload.index_months || 12 });
    if (tasks.has("dividend") || tasks.has("all")) summary.dividend_calendar = await syncOfficialDividendCalendar(db);
    if (payload.recompute_scores === true || ["daily-price", "monthly-revenue", "institutional-flow", "all"].some((task) => tasks.has(task))) {
      summary.theme_score = await recomputeVerifiedThemeScores(db);
      summary.stock_score = await recomputeAvailableStockScores(db);
    }
    const sourceErrors = [];
    const collectErrors = (value, path = []) => {
      if (!value || typeof value !== "object") return;
      if (value.error) {
        sourceErrors.push({ source: path.join("."), error: String(value.error) });
        return;
      }
      Object.entries(value).forEach(([key, child]) => collectErrors(child, [...path, key]));
    };
    collectErrors(summary);
    const overallStatus = sourceErrors.length ? "partial" : "success";
    await writeCrawlerLog(
      db,
      payload.crawler_name || "official-market-sync",
      "TWSE/TPEx OpenAPI",
      requestedTasks.join(","),
      startedAt,
      overallStatus,
      Object.values(summary).reduce((total, group) => total + Object.values(group).reduce((sum, item) => sum + Number(item.inserted || 0), 0), 0),
      Object.values(summary).reduce((total, group) => total + Object.values(group).reduce((sum, item) => sum + Number(item.updated || 0), 0), 0),
      sourceErrors.length ? JSON.stringify(sourceErrors).slice(0, 1800) : null,
    );
    return { status: overallStatus, tasks: requestedTasks, summary, source_errors: sourceErrors };
  } catch (error) {
    await writeCrawlerLog(
      db,
      payload.crawler_name || "official-market-sync",
      "TWSE/TPEx OpenAPI",
      requestedTasks.join(","),
      startedAt,
      "failed",
      0,
      0,
      String(error && error.message ? error.message : error),
    );
    throw error;
  }
}

async function runScheduledUpdate(env, event, job) {
  const scheduledAt = new Date(event.scheduledTime || Date.now());
  let report;
  if (job.slot === "08:00") {
    report = await syncGlobalMarketSnapshots(env.DB);
    const available = report.rows.filter((row) => row.status === "ok").length;
    await updateQualityStatus(env.DB, {
      dataType: "global_market",
      marketScope: "global",
      source: "Yahoo Finance + TAIFEX OpenAPI",
      latestDataDate: taipeiDateKey(scheduledAt),
      status: report.status,
      recordCount: report.rows.length,
      coveredStocks: available,
      expectedStocks: GLOBAL_INDEX_DEFINITIONS.length + 1,
      note: `${available}/${GLOBAL_INDEX_DEFINITIONS.length + 1} global and night-session instruments available.`,
    });
    await writeCrawlerLog(
      env.DB,
      job.name,
      "Yahoo Finance + TAIFEX OpenAPI",
      "global-market,night-session",
      report.captured_at,
      report.status,
      available,
      report.rows.length,
      report.rows.filter((row) => row.status !== "ok").map((row) => row.symbol).join(",") || null,
    );
  } else {
    report = await syncOfficialMarketData(env.DB, {
      crawler_name: job.name,
      tasks: job.tasks,
      recompute_scores: job.recompute_scores === true,
      skip_tpex: true,
      trigger: "cloudflare-cron",
      cron: event.cron,
    });
  }
  const notifications = await sendScheduledUpdateNotifications(env.DB, env, job.slot, report, scheduledAt);
  return { job: job.name, slot: job.slot, report, notifications };
}

async function logCrawlerRun(db, payload) {
  const now = new Date().toISOString();
  const crawlerName = payload.crawler_name || "unknown";
  await writeCrawlerLog(
    db,
    crawlerName,
    "cloudflare-worker",
    JSON.stringify(payload),
    now,
    "partial",
    0,
    0,
    "Official large-source fetching is handled by scripts/sync-twse-to-cloudflare.mjs and small import endpoints.",
  );
  return {
    crawler_name: crawlerName,
    status: "partial",
    message: "Cloudflare Worker uses small import endpoints. Run scripts/sync-twse-to-cloudflare.mjs for official TWSE ingestion.",
  };
}

function serverKChart(rows, label = "K \u7dda") {
  const candles = rows.map((row) => ({
    label: row.trade_date || row.label || "",
    open: Number(row.open_index ?? row.open_price ?? row.open ?? 0),
    high: Number(row.high_index ?? row.high_price ?? row.high ?? 0),
    low: Number(row.low_index ?? row.low_price ?? row.low ?? 0),
    close: Number(row.close_index ?? row.close_price ?? row.close ?? 0),
    volume: Number(row.market_volume ?? row.volume ?? 0),
    turnover: Number(row.market_turnover_value ?? row.turnover_value ?? 0),
  })).filter((row) => row.open && row.high && row.low && row.close).slice(-260);
  if (!candles.length) return '<p class="muted">\u5c1a\u7121 K \u7dda\u8cc7\u6599</p>';
  const visibleCandles = candles.slice(-120);
  const lows = visibleCandles.map((item) => item.low);
  const highs = visibleCandles.map((item) => item.high);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const range = max - min || 1;
  const step = 100 / visibleCandles.length;
  const bodyWidth = Math.max(0.7, Math.min(3.2, step * 0.55));
  const volumeWidth = Math.max(0.7, Math.min(3.6, step * 0.68));
  const maxVolume = Math.max(...visibleCandles.map((item) => item.volume), 1);
  const volumeLabel = (value) => value >= 100000000 ? (value / 100000000).toFixed(1) + " \u5104\u80a1" : Math.round(value / 10000).toLocaleString("zh-TW") + " \u842c\u80a1";
  const turnoverLabel = (value) => value >= 100000000 ? (value / 100000000).toFixed(1) + " \u5104\u5143" : Math.round(value / 10000).toLocaleString("zh-TW") + " \u842c\u5143";
  const y = (price) => 84 - ((price - min) / range) * 76;
  const bars = visibleCandles.map((item, index) => {
    const x = step * index + step / 2;
    const top = Math.min(y(item.open), y(item.close));
    const height = Math.max(0.8, Math.abs(y(item.open) - y(item.close)));
    const color = item.close >= item.open ? "up" : "down";
    return '<line class="' + color + '" x1="' + x.toFixed(2) + '" y1="' + y(item.high).toFixed(2) + '" x2="' + x.toFixed(2) + '" y2="' + y(item.low).toFixed(2) + '"></line><rect class="' + color + '" x="' + (x - bodyWidth / 2).toFixed(2) + '" y="' + top.toFixed(2) + '" width="' + bodyWidth.toFixed(2) + '" height="' + height.toFixed(2) + '"></rect>';
  }).join("");
  const hits = visibleCandles.map((item, index) => {
    const tip = [
      item.label,
      "\u958b " + n(item.open),
      "\u9ad8 " + n(item.high),
      "\u4f4e " + n(item.low),
      "\u6536 " + n(item.close),
      "\u6210\u4ea4\u91cf " + volumeLabel(item.volume),
      "\u6210\u4ea4\u91d1\u984d " + turnoverLabel(item.turnover),
    ].join("\n");
    return '<rect class="chart-hit" x="' + (step * index).toFixed(2) + '" y="0" width="' + step.toFixed(2) + '" height="88" data-chart-tip="' + escHtml(tip) + '"></rect>';
  }).join("");
  const volumeBars = visibleCandles.map((item, index) => {
    const x = step * index + step / 2;
    const height = Math.max(0.6, (item.volume / maxVolume) * 22);
    const color = item.close >= item.open ? "up" : "down";
    return '<rect class="market-volume ' + color + '" x="' + (x - volumeWidth / 2).toFixed(2) + '" y="' + (24 - height).toFixed(2) + '" width="' + volumeWidth.toFixed(2) + '" height="' + height.toFixed(2) + '"></rect>';
  }).join("");
  const volumeHits = visibleCandles.map((item, index) => {
    const tip = [
      item.label,
      "\u958b " + n(item.open),
      "\u9ad8 " + n(item.high),
      "\u4f4e " + n(item.low),
      "\u6536 " + n(item.close),
      "\u6210\u4ea4\u91cf " + volumeLabel(item.volume),
      "\u6210\u4ea4\u91d1\u984d " + turnoverLabel(item.turnover),
    ].join("\n");
    return '<rect class="chart-hit" x="' + (step * index).toFixed(2) + '" y="0" width="' + step.toFixed(2) + '" height="24" data-chart-tip="' + escHtml(tip) + '"></rect>';
  }).join("");
  const latest = visibleCandles[visibleCandles.length - 1];
  const first = visibleCandles[0];
  const scale = '<div class="chart-price-scale"><span>\u9ad8 ' + n(max) + '</span><span>\u6536 ' + n(latest.close) + '</span><span>\u4f4e ' + n(min) + '</span></div>';
  const volumeScale = '<div class="market-volume-scale"><span>' + volumeLabel(maxVolume) + '</span><span>0</span></div>';
  const chartBody = '<div class="chart-plot"><svg viewBox="0 0 100 88" preserveAspectRatio="none">' + bars + hits + '</svg>' + scale + '</div><div class="market-volume-header"><strong>\u4e0a\u5e02\u6210\u4ea4\u91cf</strong><span>\u6700\u65b0 ' + volumeLabel(latest.volume) + ' / \u6210\u4ea4\u91d1\u984d ' + turnoverLabel(latest.turnover) + '</span></div><div class="market-volume-plot"><svg viewBox="0 0 100 24" preserveAspectRatio="none">' + volumeBars + volumeHits + '</svg>' + volumeScale + '</div><div class="chart-axis"><span>' + escHtml(first.label) + '</span><span data-market-window>' + visibleCandles.length + ' / ' + candles.length + ' \u6839</span><span>' + escHtml(latest.label) + '</span></div>';
  return '<div class="server-k-chart" data-market-k-chart data-candles="' + escHtml(JSON.stringify(candles)) + '"><div class="chart-value-strip"><span>' + escHtml(label) + '</span><strong data-market-current>\u76ee\u524d\u6307\u6578 ' + n(latest.close) + '</strong><span data-market-range>\u9ad8 ' + n(max) + ' / \u4f4e ' + n(min) + '</span></div><div class="chart-zoom-controls"><span>\u986f\u793a\u5340\u9593</span><button type="button" data-market-zoom-in aria-label="\u653e\u5927" title="\u653e\u5927">+</button><button type="button" data-market-zoom-out aria-label="\u7e2e\u5c0f" title="\u7e2e\u5c0f">\u2212</button><button type="button" data-market-zoom-reset aria-label="\u91cd\u8a2d\u5340\u9593" title="\u91cd\u8a2d\u5340\u9593">\u21ba</button></div><div data-market-chart-body>' + chartBody + '</div></div>';
}

function html(stocksData, themesData, statusData, stockTree, themeTree, institutionalTree, dashboard = {}, quality = {}, page = "home") {
  const show = (...pages) => pages.includes(page);
  const pageMeta = {
    home: ["台股全市場研究平台", "盤後市場摘要、資料品質與各研究工具入口。"],
    market: ["市場研究", "市場焦點、法人資金與量化推薦集中在同一頁。"],
    research: ["選股研究", "使用選股器建立條件，再比較 2–4 檔股票。"],
    taxonomy: ["分類探索", "官方產業、已驗證題材與龍頭供應鏈名冊。"],
    data: ["資料中心", "資料覆蓋率、來源狀態與官方參考連結。"],
    guide: ["使用教學", "快速了解平台特色、資料更新時間與各項功能的操作方式。"],
    disclaimer: ["投資風險聲明", "使用本研究平台前，請先閱讀資料使用與投資風險說明。"],
  }[page] || ["台股全市場研究平台", "盤後台股研究工具。"];
  const topRevenue = [...stocksData].sort((a, b) => Number(b.yoy_growth_percent || 0) - Number(a.yoy_growth_percent || 0))[0] || {};
  const topTurnover = [...stocksData].sort((a, b) => Number(b.turnover_value || 0) - Number(a.turnover_value || 0))[0] || {};
  const statusByType = Object.fromEntries((statusData || []).map((item) => [item.data_type, item]));
  const updatedRaw = (statusData || []).reduce((latest, item) => {
    const value = String(item.latest_update_time || "");
    return value > latest ? value : latest;
  }, "") || APP_UPDATED_AT;
  const updated = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(updatedRaw));
  const latestDataDate = (type) => statusByType[type]?.latest_data_date || "-";
  const recommendationsReady = quality?.recommendations_ready === true;
  const qualityDatasetCount = Array.isArray(quality.datasets) ? quality.datasets.length : 0;
  const qualitySourceCount = Array.isArray(quality.source_status) ? quality.source_status.length : 0;
  const recommendationRequired = Math.ceil(Number(quality.stocks?.common_stocks || 0) * 0.8);
  const scoreCoverageCount = Number(quality.latest_dates?.scored_stock_count || 0);
  const taiexRows = dashboard.taiex || [];
  const taiexLatest = taiexRows[taiexRows.length - 1] || {};
  const taiexPrev = taiexRows[taiexRows.length - 2] || {};
  const taiexChange = Number(taiexLatest.close_index || 0) - Number(taiexPrev.close_index || 0);
  const taiexChangePercent = taiexPrev.close_index ? (taiexChange / Number(taiexPrev.close_index)) * 100 : null;
  const amountLabel = (value) => {
    const amount = Number(value || 0);
    if (!amount) return "-";
    const abs = Math.abs(amount);
    return abs >= 100000000 ? (amount / 100000000).toFixed(1) + " \u5104\u5143" : Math.round(amount / 10000).toLocaleString("zh-TW") + " \u842c\u5143";
  };
  const flowToneClass = (value) => Number(value || 0) >= 0 ? "flow-buy-text" : "flow-sell-text";
  const flowStockCard = (label, stock, amountKey, lotKey, direction) => {
    const lots = Number(stock?.[lotKey] || 0);
    const validDirection = direction === "buy" ? lots > 0 : lots < 0;
    if (!stock || !validDirection) {
      return '<article class="snapshot-card"><span>' + label + '</span><strong>-</strong><small>\u5c1a\u7121\u8cc7\u6599</small></article>';
    }
    const amount = Number(stock[amountKey] || 0);
    const flowText = amount
      ? flowDirectionMoney(amount)
      : (direction === "buy" ? "\u8cb7\u8d85 " : "\u8ce3\u8d85 ") + Math.abs(lots).toLocaleString("zh-TW") + " \u5f35";
    return '<a class="snapshot-card" href="#stock-' + stock.stock_code + '" data-stock-code="' + stock.stock_code + '"><span>' + label + '</span><strong>' + stock.stock_code + ' ' + stock.stock_name + '</strong><small><b class="' + flowToneClass(lots) + '">' + flowText + '</b> / ' + (stock.industry_name || "-") + ' / \u80a1\u50f9 ' + (stock.close_price ? n(stock.close_price) : "-") + '</small></a>';
  };
  const hotStockRows = (dashboard.hot_stocks || []).slice(0, 4).map((stock) => `<a class="snapshot-card" href="#stock-${stock.stock_code}" data-stock-code="${stock.stock_code}">
    <span>熱門股票</span><strong>${stock.stock_code} ${stock.stock_name}</strong>
    <small>成交金額 ${amountLabel(stock.turnover_value)} / 評分 ${stock.total_score == null ? "資料不足" : n(stock.total_score)} / ${stock.status || "-"}</small>
  </a>`).join("");
  const marketSnapshotRows = [
    `<article class="snapshot-card taiex-card"><span>加權指數</span><strong>${taiexLatest.close_index ? n(taiexLatest.close_index) : "-"}</strong><small>${taiexLatest.trade_date || "-"} / ${taiexChange ? (taiexChange > 0 ? "+" : "") + n(taiexChange) : "0"} 點${taiexChangePercent === null ? "" : " / " + n(taiexChangePercent) + "%"}</small></article>`,
    flowStockCard("外資買超最多", dashboard.flow?.foreign_buy, "foreign_investor_net_amount", "foreign_investor_net_buy", "buy"),
    flowStockCard("外資賣超最多", dashboard.flow?.foreign_sell, "foreign_investor_net_amount", "foreign_investor_net_buy", "sell"),
    flowStockCard("投信買超最多", dashboard.flow?.trust_buy, "investment_trust_net_amount", "investment_trust_net_buy", "buy"),
    flowStockCard("投信賣超最多", dashboard.flow?.trust_sell, "investment_trust_net_amount", "investment_trust_net_buy", "sell"),
    flowStockCard("自營商買超最多", dashboard.flow?.dealer_buy, "dealer_net_amount", "dealer_net_buy", "buy"),
    flowStockCard("自營商賣超最多", dashboard.flow?.dealer_sell, "dealer_net_amount", "dealer_net_buy", "sell"),
    `<article class="snapshot-card"><span>大盤廣度</span><strong>${n(dashboard.breadth?.advancers)} 漲 / ${n(dashboard.breadth?.decliners)} 跌</strong><small>成交金額 ${amountLabel(dashboard.breadth?.turnover_value)} / 股票數 ${n(dashboard.breadth?.stocks)}</small></article>`,
  ].join("") + hotStockRows;
  const marketKRows = serverKChart(taiexRows, "加權指數 K 線");
  const concentrationRows = (dashboard.industry_concentration || []).slice(0, 10);
  const concentrationMax = Math.max(...concentrationRows.map((row) => Number(row.turnover_value || 0)), 1);
  const concentrationTotal = Number(dashboard.breadth?.turnover_value || 0);
  const concentrationTopShare = concentrationTotal
    ? concentrationRows.reduce((sum, row) => sum + Number(row.turnover_value || 0), 0) / concentrationTotal * 100
    : 0;
  const capitalConcentrationChart = `<section class="panel capital-concentration" id="capital-concentration" data-capital-chart data-industries="${escHtml(JSON.stringify(dashboard.industry_concentration || []))}">
    <div class="panel-head"><div><p class="eyebrow">Capital Concentration</p><h2>市場資金集中量圖</h2></div><span class="info-dot" tabindex="0" data-tip="依最新交易日普通股成交值，按官方產業彙總。這是成交熱度與資金集中度，不代表資金淨流入；法人買賣超請看下方三大法人區。">!</span></div>
    <p class="muted">資料日期：${escHtml(dashboard.trade_date || "-")}。點選官方產業可下鑽到產業內個股；已驗證題材／角色會另外標示，不冒充官方次產業。</p>
    <div class="capital-concentration-summary"><b>全市場成交值 ${amountLabel(concentrationTotal)}</b><b>前 10 產業占比 ${n(concentrationTopShare)}%</b></div>
    <div class="capital-drill-head"><strong data-capital-title>官方產業資金分布</strong><button class="capital-back" type="button" data-capital-back hidden>返回全部產業</button></div>
    <div class="capital-bars" data-capital-rows>${concentrationRows.length ? concentrationRows.map((row) => {
      const turnover = Number(row.turnover_value || 0);
      const share = concentrationTotal ? turnover / concentrationTotal * 100 : 0;
      const width = Math.max(1, turnover / concentrationMax * 100);
      const averageChange = row.average_change_percent == null ? "-" : `${Number(row.average_change_percent) >= 0 ? "+" : ""}${n(row.average_change_percent)}%`;
      return `<button type="button" class="capital-bar-row" data-capital-industry="${escHtml(row.industry_code || "UNKNOWN")}"><div class="capital-bar-label"><strong>${escHtml(row.industry_name || "未分類")}</strong><small>${n(row.stock_count)} 檔 · 平均漲跌 ${averageChange}</small></div><div class="capital-bar-track" aria-label="${escHtml(row.industry_name || "未分類")}成交值占比 ${n(share)}%"><i style="width:${width.toFixed(2)}%"></i></div><div class="capital-bar-value"><strong>${amountLabel(turnover)}</strong><small>${n(share)}%</small></div></button>`;
    }).join("") : '<p class="muted">尚無可彙總的成交值資料。</p>'}</div>
    <div class="capital-pager"><button type="button" data-capital-prev disabled>上一頁</button><span data-capital-page>第 1 頁</span><button type="button" data-capital-next ${Number((dashboard.industry_concentration || []).length) <= 10 ? "disabled" : ""}>下一頁</button></div>
  </section>`;
  const recommendations = (dashboard.hot_stocks || []).filter((stock) => stock.total_score != null).slice(0, 4).map((stock) => ({
    title: `${stock.stock_code} ${stock.stock_name}`,
    labels: uniqueLabels([
      `總分 ${n(stock.total_score)}`,
      stock.status,
      stock.industry_name,
      `法人 ${n(stock.institutional_score)}`,
    ]),
    note: stock.score_reason || "依可用資料評分公式排序，請再展開個股抽屜核對原始資料。",
    href: `#stock-${stock.stock_code}`,
    stockCode: stock.stock_code,
  }));
  const recommendationRows = recommendationsReady
    ? recommendations.map((item) => `<a class="recommend-card" href="${escHtml(item.href)}" ${item.stockCode ? `data-stock-code="${escHtml(item.stockCode)}"` : ""}>
      <strong>${escHtml(item.title)}</strong>
      <p class="muted">${escHtml(item.note)}</p>
      <span>${item.labels.map((label) => `<b class="label-chip">${escHtml(label)}</b>`).join("")}</span>
    </a>`).join("")
    : `<article class="quality-warning"><strong>評分尚未完成，暫停產生推薦</strong><p>可用資料評分必須與最新行情同日，且至少覆蓋普通股母體 80%；完成後自動開啟。</p></article>`;
  const qualityCoverageRows = (quality.datasets || []).map((row) => `<article class="quality-row">
    <span>${escHtml(row.coverage_label || row.data_type)} · ${escHtml(row.market_type)}</span>
    <strong>${n(row.covered_stocks)} / ${n(row.expected_stocks)}</strong>
    <small>${n(row.coverage_percent)}% · ${escHtml(row.latest_data_date || "-")}${row.coverage_note ? `<br>${escHtml(row.coverage_note)}` : ""}</small>
  </article>`).join("");
  const qualitySourceRows = (quality.source_status || []).map((row) => `<article class="quality-row">
    <span>${escHtml(row.data_type)} · ${escHtml(row.market_scope)} · ${escHtml(row.source)}</span>
    <strong>${escHtml(row.status)}${Number(row.is_demo || 0) ? " · DEMO" : ""}</strong>
    <small>${escHtml(row.latest_data_date || "-")} · ${escHtml(row.note || "無補充說明")}</small>
  </article>`).join("");
  const industryOptions = (quality.industries || []).map((row) => `<option value="${escHtml(row.industry_code)}">${escHtml(row.industry_name)} (${n(row.stock_count)})</option>`).join("");
  const sourceLinks = [
    { group: "\u4ea4\u6613\u6240\u516c\u544a", label: "\u53f0\u7063\u8b49\u5238\u4ea4\u6613\u6240\uff08TWSE\uff09", href: "https://www.twse.com.tw/zh/", note: "\u4e0a\u5e02\u516c\u53f8\u516c\u544a\u3001\u6bcf\u65e5\u884c\u60c5\u3001\u52a0\u6b0a\u6307\u6578\u3001\u6ce8\u610f\u8207\u8655\u7f6e\u516c\u544a\u7684\u4e3b\u8981\u4f86\u6e90\u3002" },
    { group: "\u4ea4\u6613\u6240\u516c\u544a", label: "\u8b49\u5238\u6ac3\u6aaf\u8cb7\u8ce3\u4e2d\u5fc3\uff08TPEx\uff09", href: "https://www.tpex.org.tw/zh-tw/index.html", note: "\u4e0a\u6ac3\u8207\u8208\u6ac3\u516c\u53f8\u516c\u544a\u3001\u76e4\u5f8c\u8cc7\u8a0a\u3001\u6ce8\u610f\u8207\u8655\u7f6e\u8cc7\u8a0a\u3002" },
    { group: "\u6cd5\u4eba\u8cc7\u91d1", label: "\u4e09\u5927\u6cd5\u4eba\u8cb7\u8ce3\u8d85\u65e5\u5831", href: "https://www.twse.com.tw/zh/trading/foreign/t86.html", note: "\u5916\u8cc7\u3001\u6295\u4fe1\u3001\u81ea\u71df\u5546\u6bcf\u65e5\u8cb7\u8ce3\u8d85\uff1b\u672c\u7ad9\u4f9d\u6536\u76e4\u50f9\u4f30\u7b97\u6d41\u5165\u6d41\u51fa\u91d1\u984d\u3002" },
    { group: "\u6cd5\u4eba\u8cc7\u91d1", label: "\u5916\u8cc7\u6301\u80a1\u6bd4\u7387\u8207\u5f35\u6578", href: "https://www.twse.com.tw/zh/trading/foreign/mi-qfiis.html", note: "\u5916\u8cc7\u6301\u6709\u80a1\u6578\u8207\u6301\u80a1\u6bd4\u7387\uff1b\u6295\u4fe1\u8207\u81ea\u71df\u5546\u82e5\u7121\u5b98\u65b9\u7e3d\u6301\u80a1\u4f86\u6e90\uff0c\u9801\u9762\u6703\u660e\u78ba\u6a19\u793a\u3002" },
    { group: "\u57fa\u672c\u9762\u8207\u516c\u53f8\u8cc7\u8a0a", label: "\u516c\u958b\u8cc7\u8a0a\u89c0\u6e2c\u7ad9\uff08MOPS\uff09", href: "https://mopsov.twse.com.tw/mops/web/index", note: "\u91cd\u5927\u8a0a\u606f\u3001\u6708\u71df\u6536\u3001\u6cd5\u8aaa\u6703\u3001\u516c\u53f8\u57fa\u672c\u8cc7\u6599\u8207\u8ca1\u5831\u516c\u544a\u3002" },
    { group: "\u914d\u606f\u8207\u6b0a\u606f", label: "\u9664\u6b0a\u606f\u516c\u544a\u8207\u53c3\u8003\u50f9", href: "https://mopsov.twse.com.tw/mops/web/index", note: "\u5f9e\u516c\u958b\u8cc7\u8a0a\u89c0\u6e2c\u7ad9\u9032\u5165\u80a1\u6771\u6703\u53ca\u80a1\u5229 / \u9664\u6b0a\u9664\u606f\u5165\u53e3\uff1b\u500b\u80a1\u62bd\u5c5c\u6703\u986f\u793a\u6700\u8fd1\u8207\u4e0b\u6b21\u9664\u606f\u65e5\u3002" },
    { group: "\u98a8\u96aa\u63d0\u9192", label: "\u6ce8\u610f\u80a1\u8207\u8655\u7f6e\u516c\u544a", href: "https://www.twse.com.tw/zh/announcement/notice.html", note: "\u7528\u65bc\u6aa2\u67e5\u500b\u80a1\u662f\u5426\u6709\u6ce8\u610f\u3001\u8655\u7f6e\u6216\u5373\u5c07\u9054\u8655\u7f6e\u689d\u4ef6\u7684\u98a8\u96aa\u3002" },
  ];
  const sourceRows = sourceLinks.map((link) => '<a class="source-link" href="' + link.href + '" target="_blank" rel="noopener noreferrer"><span>' + link.group + '</span><strong>' + link.label + '</strong><small>' + link.note + '</small></a>').join("");
  const sectionGuide = [
    { href: "/market", title: "\u5e02\u5834\u7126\u9ede", text: "\u5148\u770b\u52a0\u6b0a\u6307\u6578\u3001\u6cd5\u4eba\u8cb7\u8ce3\u8d85\u8207\u71b1\u9580\u80a1\u3002" },
    { href: "/research", title: "\u9078\u80a1\u7814\u7a76", text: "\u7528\u689d\u4ef6\u7be9\u9078\u5f8c\uff0c\u76f4\u63a5\u6bd4\u8f03 2\u20134 \u6a94\u80a1\u7968\u3002" },
    { href: "/taxonomy", title: "\u5206\u985e\u63a2\u7d22", text: "\u628a\u7522\u696d\u3001\u984c\u6750\u8207\u4f9b\u61c9\u93c8\u653e\u5728\u4e00\u8d77\u67e5\u770b\u3002" },
    { href: "/data", title: "\u8cc7\u6599\u4e2d\u5fc3", text: "\u6aa2\u67e5\u8986\u84cb\u7387\u3001\u540c\u6b65\u72c0\u614b\u8207\u5b98\u65b9\u4f86\u6e90\u3002" },
    { href: "/watchlist", title: "\u81ea\u9078\u80a1", text: "\u7ba1\u7406\u500b\u4eba\u6301\u80a1\u3001\u6210\u672c\u8207\u640d\u76ca\u8ffd\u8e64\u3002" },
  ].map((item, index) => '<a class="ux-step" href="' + item.href + '"><b>' + (index + 1) + '</b><strong>' + item.title + '</strong><small>' + item.text + '</small></a>').join("");
  const infoMenuRows = [
    { key: "stock-tree", title: "\u5168\u53f0\u80a1\u8cc7\u8a0a\u6a39", note: "\u61c9\u7528 > \u7522\u696d > \u540c\u696d" },
    { key: "theme-tree", title: "\u71b1\u9580\u984c\u6750\u6392\u884c\u6a39", note: "\u984c\u6750 > \u7522\u696d > \u500b\u80a1" },
    { key: "institutional-flow", title: "\u4e09\u5927\u6cd5\u4eba\u8cc7\u91d1\u52d5\u5411", note: "\u61c9\u7528\u3001\u985e\u80a1\u3001\u540c\u696d\u7fa4" },
    { key: "recommendations", title: "\u76ee\u524d\u63a8\u85a6", note: "\u4f9d\u6210\u4ea4\u503c\u8207\u984c\u6750\u71b1\u5ea6" },
    { key: "leader-roster", title: "\u9f8d\u982d\u61c9\u7528\u5546\u4f9b\u61c9\u93c8\u540d\u518a", note: "NVIDIA / AMD / Intel" },
    { key: "sources", title: "\u8cc7\u6599\u4f86\u6e90\u8207\u53c3\u8003\u9023\u7d50", note: "\u5b98\u65b9\u4f86\u6e90\u8207\u516c\u544a" },
  ].map((item, index) => '<button type="button" class="' + (index === 0 ? 'active' : '') + '" data-info-target="' + item.key + '"><strong>' + item.title + '</strong><small>' + item.note + '</small></button>').join("");
  const sectionMenuScript = `<script>
(() => {
  const workspace = document.getElementById("info-workspace");
  const content = document.querySelector("[data-info-content]");
  const buttons = Array.from(document.querySelectorAll("[data-info-target]"));
  const map = {
    "stock-tree": "stock-tree-section",
    "theme-tree": "theme-tree-section",
    "institutional-flow": "institutional-flow",
    "recommendations": "recommendations",
    "leader-roster": "leader-roster",
    "sources": "sources"
  };
  const hashToKey = Object.fromEntries(Object.entries(map).map(([key, id]) => ["#" + id, key]));
  const entries = Object.entries(map)
    .map(([key, id]) => ({ key, node: document.getElementById(id) }))
    .filter((entry) => entry.node);
  if (!workspace || !content || !entries.length) return;
  const oldParents = new Set(entries.map((entry) => entry.node.parentElement).filter(Boolean));
  entries.forEach((entry) => {
    entry.node.dataset.infoSection = entry.key;
    entry.node.classList.add("info-section");
    entry.node.style.marginTop = "0";
    content.appendChild(entry.node);
  });
  oldParents.forEach((parent) => {
    if (parent !== content && parent.classList.contains("grid") && !parent.children.length) parent.remove();
  });
  function activate(key, scroll = false) {
    const chosen = map[key] ? key : "stock-tree";
    buttons.forEach((button) => button.classList.toggle("active", button.dataset.infoTarget === chosen));
    entries.forEach((entry) => { entry.node.hidden = entry.key !== chosen; });
    if (scroll) {
      history.replaceState(null, "", "#" + map[chosen]);
      workspace.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }
  buttons.forEach((button) => button.addEventListener("click", () => activate(button.dataset.infoTarget, true)));
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link) return;
    const key = hashToKey[link.getAttribute("href")];
    if (!key) return;
    event.preventDefault();
    activate(key, true);
  });
  activate(hashToKey[window.location.hash] || "stock-tree");
})();
</script>`;
  const topFlowApplications = (institutionalTree?.applications || []).slice(0, 10);
  const maxApplicationFlow = Math.max(...topFlowApplications.map((item) => Math.abs(Number(item.flow.total_institutional_net_amount || 0))), 1);
  const flowBar = (value, max = maxApplicationFlow) => {
    const numeric = Number(value || 0);
    const width = Math.max(3, Math.min(100, Math.round((Math.abs(numeric) / max) * 100)));
    return `<span class="flow-track"><i class="${numeric >= 0 ? "buy" : "sell"}" style="width:${width}%"></i></span>`;
  };
  const institutionalLeaderGroups = [
    { title: "外資", data: dashboard.institutional_leaders?.foreign || {}, amountKey: "foreign_investor_net_amount", lotKey: "foreign_investor_net_buy" },
    { title: "投信", data: dashboard.institutional_leaders?.trust || {}, amountKey: "investment_trust_net_amount", lotKey: "investment_trust_net_buy" },
    { title: "自營商", data: dashboard.institutional_leaders?.dealer || {}, amountKey: "dealer_net_amount", lotKey: "dealer_net_buy" },
  ];
  const leaderListRows = (rows = [], amountKey, lotKey, tone) => rows.length
    ? rows.slice(0, 20).map((stock, index) => {
      const lots = Math.abs(Number(stock[lotKey] || 0));
      const amount = Number(stock[amountKey] || 0);
      const consecutiveDays = Number(stock.consecutive_days || 0);
      const cumulative5d = Math.abs(Number(stock.cumulative_net_buy_5d || 0));
      const streakLabel = consecutiveDays ? `連${tone === "buy" ? "買" : "賣"} ${n(consecutiveDays)} 日` : "尚未形成連續";
      return `<a class="institution-leader-row ${tone === "buy" ? "leader-buy" : "leader-sell"}" href="#stock-${escHtml(stock.stock_code)}" data-stock-code="${escHtml(stock.stock_code)}">
        <b>${index + 1}</b>
        <span><strong>${escHtml(stock.stock_code)} ${escHtml(stock.stock_name)}</strong><small>${escHtml(stock.industry_name || "-")} / 股價 ${stock.close_price ? n(stock.close_price) : "-"}<br>${streakLabel} / 5 日累積 ${n(cumulative5d)} 張</small></span>
        <em>${tone === "buy" ? "買超" : "賣超"} ${n(lots)} 張<br>${escHtml(flowDirectionMoney(amount))}</em>
      </a>`;
    }).join("")
    : `<p class="muted leader-empty">尚無${tone === "buy" ? "買超" : "賣超"}資料</p>`;
  const institutionalLeaderBoard = institutionalLeaderGroups.some((group) => (group.data.buy || []).length || (group.data.sell || []).length)
    ? `<section class="institution-leaders"><div class="panel-head"><div><p class="eyebrow">Institution Top 20</p><h3>外資、投信、自營商買賣超前 20 名</h3></div><span class="info-dot" tabindex="0" data-tip="依最新法人日買賣超張數排序；顯示連買／連賣天數與 5 日累積，右側金額以當日買賣超張數 × 1000 × 收盤價估算。">!</span></div><div class="institution-leader-grid">${institutionalLeaderGroups.map((group) => `<article class="institution-leader-card">
      <h4>${group.title}</h4>
      <div class="institution-leader-lists">
        <div><strong class="leader-side leader-buy">買超 Top 20</strong><div class="institution-leader-list">${leaderListRows(group.data.buy || [], group.amountKey, group.lotKey, "buy")}</div></div>
        <div><strong class="leader-side leader-sell">賣超 Top 20</strong><div class="institution-leader-list">${leaderListRows(group.data.sell || [], group.amountKey, group.lotKey, "sell")}</div></div>
      </div>
    </article>`).join("")}</div></section>`
    : "";
  const topApplicationRows = topFlowApplications.map((application, index) => `<button type="button" class="flow-row flow-choice ${index === 0 ? "active" : ""}" data-flow-application-index="${index}">
    <span><strong>${application.application}</strong><small>${application.industry_count} 個產業類群 / ${application.stock_count} 檔同業<br>${flowMoneyBreakdown(application.flow)}${institutionalTree?.previous_trade_date ? `<em class="flow-trend ${flowTrendClass(application.trend)}">${flowTrendText(application.trend)}</em>` : ""}</small></span>
    ${flowBar(application.flow.total_institutional_net_amount)}
    <b>${flowMoneyLabel(application.flow.total_institutional_net_amount)}</b>
  </button>`).join("");
  const allFlowIndustries = (institutionalTree?.applications || []).flatMap((application) => application.industries.map((industry) => ({ ...industry, application: application.application })))
    .sort((a, b) => Number(b.popularity_score || 0) - Number(a.popularity_score || 0));
  const peerGroupName = (stock, industry) => {
    if (Array.isArray(stock.product_groups) && stock.product_groups.length) return stock.product_groups[0];
    if (stock.role_type && stock.role_type !== "官方產業分類") return stock.role_type;
    if (stock.theme_name) return stock.theme_name;
    return stock.industry_name || industry?.industry_name || "未分類同業";
  };
  const peerGroups = (industry) => {
    const groups = new Map();
    (industry?.peers || []).forEach((stock) => {
      const name = peerGroupName(stock, industry);
      if (!groups.has(name)) groups.set(name, { name, stocks: [], flow: 0 });
      const group = groups.get(name);
      group.stocks.push(stock);
      group.flow += Number(stock.total_institutional_net_amount || 0);
    });
    return [...groups.values()].sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow)).slice(0, 10);
  };
  const renderPeerGroups = (industry, industryIndex = 0) => {
    const groups = peerGroups(industry);
    const maxGroupFlow = Math.max(...groups.map((group) => Math.abs(Number(group.flow || 0))), 1);
    return groups.map((group, groupIndex) => {
      const maxStockFlow = Math.max(...group.stocks.map((stock) => Math.abs(Number(stock.total_institutional_net_amount || 0))), 1);
      const pagerId = `flow-peers-${industryIndex}-${groupIndex}`;
      return `<details class="flow-group" ${groupIndex === 0 ? "open" : ""}>
        <summary class="flow-row">
          <span><strong>${group.name}</strong><small>${industry?.application || ""} / ${industry?.industry_name || ""}<br>目前已入庫 ${group.stocks.length} 檔法人明細</small></span>
          ${flowBar(group.flow, maxGroupFlow)}
          <b>${flowMoneyLabel(group.flow)}</b>
        </summary>
        <div class="flow-group-body" data-paged-list data-page-size="10" data-pager-id="${pagerId}">${group.stocks.map((stock, stockIndex) => `<a class="flow-row flow-link" href="#stock-${stock.stock_code}" data-stock-code="${stock.stock_code}" data-page-item${stockIndex >= 10 ? " hidden" : ""}>
          <span><strong>${stock.stock_code} ${stock.stock_name}</strong><small>${escHtml(stock.product_description || "公司主要產品與服務請參考公開資訊觀測站")}<br>${(stock.tags || []).slice(0, 3).join("、")}<br>${flowMoneyBreakdown(stock)}</small></span>
          ${flowBar(stock.total_institutional_net_amount, maxStockFlow)}
          <b>${flowMoneyLabel(stock.total_institutional_net_amount)}</b>
        </a>`).join("")}</div>
        <div class="pager" data-pager-controls="${pagerId}"></div>
      </details>`;
    }).join("");
  };
  const scenarioRules = [
    { name: "伺服器 / AI 資料中心", keywords: ["AI", "伺服器", "Server", "資料中心", "CoWoS", "先進製程", "散熱", "高速傳輸", "記憶體"] },
    { name: "通訊 / 航太 / 太空", keywords: ["通訊", "航太", "衛星", "低軌", "太空", "國防", "網通", "射頻"] },
    { name: "車用 / 能源", keywords: ["車", "電動車", "電池", "充電", "能源", "儲能", "功率", "電源"] },
    { name: "智慧製造 / 自動化", keywords: ["智慧製造", "自動化", "機器人", "機械", "設備", "工具機", "工業"] },
    { name: "電子零組件 / PCB", keywords: ["PCB", "電子零組件", "被動元件", "連接器", "載板", "基板", "光電"] },
    { name: "生技醫療", keywords: ["生技", "醫療", "製藥", "保健", "醫材"] },
    { name: "金融 / 內需服務", keywords: ["金融", "保險", "百貨", "物流", "旅遊", "餐飲", "民生"] },
  ];
  const extraScenarioRules = [
    { name: "伺服器 / AI 資料中心", keywords: ["半導體", "ABF", "載板", "主機板", "PCB", "被動元件", "電源IC", "電源管理", "散熱", "高速傳輸", "連接器", "伺服器與電腦週邊"] },
    { name: "電子零組件 / PCB", keywords: ["ABF", "載板", "主機板", "被動元件", "電容", "電阻", "PCB", "CCL", "銅箔基板", "連接器"] },
    { name: "車用 / 能源", keywords: ["電源IC", "電源管理", "功率半導體", "逆變器", "充電樁", "電池材料", "散熱"] },
    { name: "通訊 / 航太 / 太空", keywords: ["光通訊", "交換器", "路由器", "天線", "射頻", "衛星通訊", "低軌衛星"] },
  ];
  const scenarioChainLabel = (scenario) => {
    if (scenario.includes("伺服器") || scenario.includes("AI")) return "晶片 / 先進製程、ABF / PCB / 主機板、被動元件、電源IC / 散熱、高速傳輸、伺服器組裝";
    if (scenario.includes("電子零組件") || scenario.includes("PCB")) return "PCB、ABF / 載板、主機板、被動元件、連接器、光電材料";
    if (scenario.includes("通訊") || scenario.includes("航太") || scenario.includes("太空")) return "網通設備、光通訊、射頻 / 天線、衛星通訊、航太國防零組件";
    if (scenario.includes("車用") || scenario.includes("能源")) return "電源IC、功率半導體、電池 / 儲能、充電、散熱與車用零組件";
    if (scenario.includes("智慧製造") || scenario.includes("自動化")) return "設備、機器人、工業電腦、感測控制、線纜與自動化模組";
    return "依官方產業、題材、產品與供應鏈角色標籤歸類";
  };
  const scenarioSortScore = (scenario) => /未分類|其他/.test(String(scenario || "")) ? -1 : 0;
  const scenarioNamesForIndustry = (industry) => {
    const text = [industry.application, industry.industry_name, ...(industry.tags || [])].filter(Boolean).join(" ");
    const matches = [...scenarioRules, ...extraScenarioRules].filter((item) => item.keywords.some((keyword) => text.includes(keyword))).map((item) => item.name);
    return matches.length ? [...new Set(matches)] : [industry.application || "其他應用"];
  };
  const scenarioBuckets = new Map();
  allFlowIndustries.slice(0, 80).forEach((industry) => {
    const amount = Number(industry.flow?.foreign_investor_net_amount || 0) + Number(industry.flow?.investment_trust_net_amount || 0);
    const previousAmount = Number(industry.previous_flow?.foreign_investor_net_amount || 0) + Number(industry.previous_flow?.investment_trust_net_amount || 0);
    if (!amount && !previousAmount) return;
    scenarioNamesForIndustry(industry).forEach((scenario) => {
      if (!scenarioBuckets.has(scenario)) scenarioBuckets.set(scenario, { scenario, industries: new Map(), flow: emptyFlow(), previous_flow: emptyFlow(), netAmount: 0, previousAmount: 0, absAmount: 0, stockCount: 0 });
      const bucket = scenarioBuckets.get(scenario);
      const industryKey = String(industry.industry_name || "未分類");
      if (!bucket.industries.has(industryKey)) {
        bucket.industries.set(industryKey, {
          industry_name: industryKey,
          application: industry.application || "",
          amount: 0,
          previousAmount: 0,
          absAmount: 0,
          stock_count: 0,
          tags: [],
          flow: emptyFlow(),
          previous_flow: emptyFlow(),
          peer_map: new Map(),
        });
      }
      const item = bucket.industries.get(industryKey);
      item.amount += amount;
      item.previousAmount += previousAmount;
      item.absAmount += Math.abs(amount);
      item.stock_count += Number(industry.stock_count || 0);
      item.tags = uniqueLabels([...item.tags, ...(industry.tags || [])]).slice(0, 5);
      for (const key of ["foreign_investor_net_amount", "investment_trust_net_amount", "dealer_net_amount", "total_institutional_net_amount", "foreign_investor_net_buy", "investment_trust_net_buy", "dealer_net_buy", "total_institutional_net_buy"]) {
        item.flow[key] += Number(industry.flow?.[key] || 0);
        bucket.flow[key] += Number(industry.flow?.[key] || 0);
        item.previous_flow[key] += Number(industry.previous_flow?.[key] || 0);
        bucket.previous_flow[key] += Number(industry.previous_flow?.[key] || 0);
      }
      (industry.peers || []).forEach((stock) => {
        if (!item.peer_map.has(stock.stock_code)) item.peer_map.set(stock.stock_code, stock);
      });
      bucket.netAmount += amount;
      bucket.previousAmount += previousAmount;
      bucket.absAmount += Math.abs(amount);
      bucket.stockCount += Number(industry.stock_count || 0);
    });
  });
  const scenarioGroups = [...scenarioBuckets.values()].map((bucket) => {
    const industries = [...bucket.industries.values()].map((industry) => ({
      ...industry,
      trend: flowTrend(industry.flow, industry.previous_flow, ["foreign_investor_net_amount", "investment_trust_net_amount"]),
      peers: [...industry.peer_map.values()].sort((a, b) => Math.abs(Number(b.total_institutional_net_amount || 0)) - Math.abs(Number(a.total_institutional_net_amount || 0))),
    })).sort((a, b) => b.absAmount - a.absAmount).slice(0, 8);
    return {
      ...bucket,
      industries,
      inflowAmount: industries.reduce((sum, industry) => sum + Math.max(0, Number(industry.amount || 0)), 0),
      outflowAmount: industries.reduce((sum, industry) => sum + Math.abs(Math.min(0, Number(industry.amount || 0))), 0),
      trend: flowTrend(bucket.flow, bucket.previous_flow, ["foreign_investor_net_amount", "investment_trust_net_amount"]),
    };
  }).sort((a, b) => scenarioSortScore(b.scenario) - scenarioSortScore(a.scenario) || b.absAmount - a.absAmount).slice(0, 6);
  const institutionalFlowKeys = ["foreign_investor_net_amount", "investment_trust_net_amount", "dealer_net_amount", "total_institutional_net_amount", "foreign_investor_net_buy", "investment_trust_net_buy", "dealer_net_buy", "total_institutional_net_buy"];
  const applicationFlowHierarchy = topFlowApplications.map((application) => {
    const chainMap = new Map();
    (application.industries || []).forEach((industry) => {
      scenarioNamesForIndustry({ ...industry, application: application.application }).forEach((scenario) => {
        if (!chainMap.has(scenario)) {
          chainMap.set(scenario, {
            application: application.application,
            industry_name: scenario,
            flow: emptyFlow(),
            previous_flow: emptyFlow(),
            tags: [scenarioChainLabel(scenario)],
            industry_names: new Set(),
            peer_map: new Map(),
          });
        }
        const chain = chainMap.get(scenario);
        chain.industry_names.add(industry.industry_name || "未分類");
        institutionalFlowKeys.forEach((key) => {
          chain.flow[key] += Number(industry.flow?.[key] || 0);
          chain.previous_flow[key] += Number(industry.previous_flow?.[key] || 0);
        });
        (industry.peers || []).forEach((stock) => {
          if (!chain.peer_map.has(stock.stock_code)) chain.peer_map.set(stock.stock_code, stock);
        });
      });
    });
    const chains = [...chainMap.values()].map((chain) => ({
      application: chain.application,
      industry_name: chain.industry_name,
      flow: chain.flow,
      previous_flow: chain.previous_flow,
      trend: flowTrend(chain.flow, chain.previous_flow),
      stock_count: chain.peer_map.size,
      tags: chain.tags,
      industry_names: [...chain.industry_names],
      peers: [...chain.peer_map.values()].sort((a, b) => Math.abs(Number(b.total_institutional_net_amount || 0)) - Math.abs(Number(a.total_institutional_net_amount || 0))),
    })).sort((a, b) => Math.abs(Number(b.flow.total_institutional_net_amount || 0)) - Math.abs(Number(a.flow.total_institutional_net_amount || 0)));
    return {
      application: application.application,
      flow: application.flow,
      previous_flow: application.previous_flow,
      trend: application.trend,
      industry_count: application.industry_count,
      stock_count: application.stock_count,
      chains,
    };
  });
  const renderScenarioFlowRows = (chains = []) => {
    const maxScenarioFlow = Math.max(...chains.map((item) => Math.abs(Number(item.flow.total_institutional_net_amount || 0))), 1);
    return chains.map((industry, index) => `<button type="button" class="flow-row flow-choice ${index === 0 ? "active" : ""}" data-flow-chain-index="${index}">
      <span><strong>${industry.industry_name}</strong><small>${industry.tags[0] || ""}<br>${industry.industry_names.join("、")} · ${industry.stock_count} 檔同業<br>${flowMoneyBreakdown(industry.flow)}${institutionalTree?.previous_trade_date ? `<em class="flow-trend ${flowTrendClass(industry.trend)}">${flowTrendText(industry.trend)}</em>` : ""}</small></span>
      ${flowBar(industry.flow.total_institutional_net_amount, maxScenarioFlow)}
      <b>${flowMoneyLabel(industry.flow.total_institutional_net_amount)}</b>
    </button>`).join("");
  };
  const initialFlowChains = applicationFlowHierarchy[0]?.chains || [];
  const scenarioFlowRows = renderScenarioFlowRows(initialFlowChains);
  const scenarioFlowPayload = JSON.stringify(applicationFlowHierarchy.map((application) => ({
    ...application,
    chains: application.chains.map((chain) => ({ ...chain, peers: chain.peers.slice(0, 180) })),
  }))).replace(/</g, "\\u003c");
  const scenarioPeerRows = renderPeerGroups(initialFlowChains[0]);
  const maxScenarioBarAmount = Math.max(...scenarioGroups.flatMap((group) => group.industries.map((industry) => Math.abs(Number(industry.amount || 0)))), 1);
  const maxScenarioGrossAmount = Math.max(...scenarioGroups.flatMap((group) => [group.inflowAmount, group.outflowAmount]), 1);
  const compactMoneyLabel = (value) => {
    const amount = Number(value || 0);
    if (!amount) return "持平";
    const abs = Math.abs(amount);
    const unit = abs >= 100000000 ? `${(abs / 100000000).toFixed(abs >= 1000000000 ? 0 : 1)}億` : `${Math.round(abs / 10000).toLocaleString("zh-TW")}萬`;
    return amount > 0 ? `流入 ${unit}` : `流出 ${unit}`;
  };
  const compactAbsoluteMoneyLabel = (value) => {
    const abs = Math.abs(Number(value || 0));
    return abs >= 100000000 ? `${(abs / 100000000).toFixed(abs >= 1000000000 ? 0 : 1)}億` : `${Math.round(abs / 10000).toLocaleString("zh-TW")}萬`;
  };
  const scenarioMenuRows = scenarioGroups.map((group, groupIndex) => {
    const scenarioDirection = flowDirectionMoney(group.netAmount);
    return `<button type="button" role="tab" data-scenario-index="${groupIndex}" aria-controls="scenario-panel-${groupIndex}" aria-selected="${groupIndex === 0 ? "true" : "false"}" class="${groupIndex === 0 ? "active" : ""}">
      <strong>${escHtml(group.scenario)}</strong>
      <small>淨額：${escHtml(scenarioDirection)} · ${group.stockCount} 檔股票</small>
    </button>`;
  }).join("");
  const scenarioCardRows = scenarioGroups.map((group, groupIndex) => {
    const listRows = group.industries.map((industry, index) => {
      const label = String(industry.industry_name || "未分類");
      const direction = flowDirectionMoney(industry.amount);
      const trendHint = institutionalTree?.previous_trade_date ? `<em class="flow-trend ${flowTrendClass(industry.trend)}">${flowTrendText(industry.trend)}</em>` : "";
      return `<li><a href="#institutional-flow" title="${escHtml(group.scenario)} / ${escHtml(label)}：外資 + 投信 ${escHtml(direction)}"><span class="scenario-rank">${index + 1}</span><strong>${escHtml(label)}</strong>${flowBar(industry.amount, maxScenarioBarAmount)}<small>${escHtml(compactMoneyLabel(industry.amount))}${trendHint}</small></a></li>`;
    }).join("");
    const scenarioDirection = flowDirectionMoney(group.netAmount);
    const chainLabel = scenarioChainLabel(group.scenario);
    return `<section class="scenario-card" id="scenario-panel-${groupIndex}" role="tabpanel" data-scenario-panel="${groupIndex}"${groupIndex === 0 ? "" : " hidden"}>
      <header class="scenario-summary">
        <div class="scenario-summary-title"><strong>${escHtml(group.scenario)}</strong><small>淨額：${escHtml(scenarioDirection)} · ${group.industries.length} 個產業 · ${group.stockCount} 檔股票${institutionalTree?.previous_trade_date ? `<em class="flow-trend ${flowTrendClass(group.trend)}">${flowTrendText(group.trend)}</em>` : ""}</small></div>
        <div class="scenario-summary-bars">
          <div><span><b>流入總額</b><strong>${compactAbsoluteMoneyLabel(group.inflowAmount)}</strong></span>${flowBar(group.inflowAmount, maxScenarioGrossAmount)}</div>
          <div><span><b>流出總額</b><strong>${compactAbsoluteMoneyLabel(group.outflowAmount)}</strong></span>${flowBar(-group.outflowAmount, maxScenarioGrossAmount)}</div>
        </div>
      </header>
      <div class="scenario-card-body">
        <p class="scenario-chain">${escHtml(chainLabel)}</p>
        <ol class="scenario-list">${listRows}</ol>
      </div>
    </section>`;
  }).join("");
  const industryCapitalBarChart = scenarioGroups.length ? `<section class="panel industry-capital-panel" id="industry-capital-map"><div class="panel-head"><div><p class="eyebrow">Industry Capital Map</p><h2>應用產業鏈資金量條表</h2></div><span class="info-dot" tabindex="0" data-tip="先從左側選擇終端應用，右側才顯示該應用的流入、流出總額與產業明細。資金增長或衰退比較前一法人日。">!</span></div><p class="muted ux-note">最新法人日期：${institutionalTree?.trade_date || "-"}；比較日期：${institutionalTree?.previous_trade_date || "-"}。先選左側應用，右側會切換成對應的資金量條與產業明細。</p><p class="relation-definition"><strong>相關定義</strong> 同一個選項代表同一個終端應用或產業鏈場景，例如伺服器 / AI 資料中心、通訊 / 航太 / 太空。如果某產業同時屬於多條鏈，會重複出現在不同應用。</p><div class="scenario-legend"><span><i class="bar-size"></i>量條越長代表流入或流出總額越大</span><span><i class="bar-in"></i>紅色：估算流入</span><span><i class="bar-out"></i>綠色：估算流出</span><span class="trend-growth">資金較前日增加</span><span class="trend-decline">資金較前日減少</span></div><div class="scenario-map-grid"><aside class="scenario-menu" role="tablist" aria-label="應用產業鏈">${scenarioMenuRows}</aside><div class="scenario-content">${scenarioCardRows}</div></div></section>` : `<section class="panel industry-capital-panel" id="industry-capital-map"><div class="panel-head"><div><p class="eyebrow">Industry Capital Map</p><h2>應用產業鏈資金量條表</h2></div><span class="info-dot" tabindex="0" data-tip="法人資金資料入庫後，這裡會依應用場景分群顯示外資與投信在各產業的估算總金額。">!</span></div><p class="muted">尚無法人產業資金資料。</p></section>`;
  const scenarioSelectorScript = `<script>
(() => {
  const buttons = Array.from(document.querySelectorAll("[data-scenario-index]"));
  const panels = Array.from(document.querySelectorAll("[data-scenario-panel]"));
  if (!buttons.length || !panels.length) return;
  const selectScenario = (index) => {
    buttons.forEach((button) => {
      const active = Number(button.dataset.scenarioIndex) === index;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    panels.forEach((panel) => {
      panel.hidden = Number(panel.dataset.scenarioPanel) !== index;
    });
  };
  buttons.forEach((button) => button.addEventListener("click", () => selectScenario(Number(button.dataset.scenarioIndex))));
})();
</script>`;
  const flowScript = `<script>
(() => {
  const applications = ${scenarioFlowPayload};
  const previousFlowDate = ${JSON.stringify(institutionalTree?.previous_trade_date || "")};
  const applicationButtons = Array.from(document.querySelectorAll("[data-flow-application-index]"));
  const chainRoot = document.querySelector("[data-flow-chains]");
  const peerRoot = document.querySelector("[data-flow-peers]");
  if (!chainRoot || !peerRoot || !applicationButtons.length || !applications.length) return;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const amount = (stock) => Number(stock.total_institutional_net_amount || 0);
  const label = (value) => {
    const numeric = Number(value || 0);
    if (!numeric) return "法人資金持平";
    const abs = Math.abs(numeric);
    const unit = abs >= 100000000 ? (abs / 100000000).toFixed(1) + " 億元" : Math.round(abs / 10000).toLocaleString("zh-TW") + " 萬元";
    return numeric > 0 ? "法人資金流入 " + unit : "法人資金流出 " + unit;
  };
  const direction = (value) => {
    const numeric = Number(value || 0);
    if (!numeric) return "持平";
    const abs = Math.abs(numeric);
    const unit = abs >= 100000000 ? (abs / 100000000).toFixed(1) + " 億元" : Math.round(abs / 10000).toLocaleString("zh-TW") + " 萬元";
    return numeric > 0 ? "流入 " + unit : "流出 " + unit;
  };
  const breakdown = (stock) => "外資" + direction(stock.foreign_investor_net_amount) + " / 投信" + direction(stock.investment_trust_net_amount) + " / 自營商" + direction(stock.dealer_net_amount);
  const trendText = (trend) => {
    if (!trend) return "";
    const change = Number(trend.change_amount || 0);
    if (trend.status === "持平") return "較前日資金持平";
    const abs = Math.abs(change);
    const unit = abs >= 100000000 ? (abs / 100000000).toFixed(1) + " 億元" : Math.round(abs / 10000).toLocaleString("zh-TW") + " 萬元";
    return "較前日" + (change > 0 ? "增加 " : "減少 ") + unit;
  };
  const trendClass = (trend) => !trend || trend.status === "持平" ? "trend-flat" : Number(trend.change_amount || 0) > 0 ? "trend-growth" : "trend-decline";
  const bar = (value, max) => {
    const width = Math.max(3, Math.min(100, Math.round((Math.abs(Number(value || 0)) / Math.max(1, max)) * 100)));
    return '<span class="flow-track"><i class="' + (Number(value || 0) >= 0 ? 'buy' : 'sell') + '" style="width:' + width + '%"></i></span>';
  };
  function peerGroupName(stock, industry) {
    if (Array.isArray(stock.product_groups) && stock.product_groups.length) return stock.product_groups[0];
    if (stock.role_type && stock.role_type !== "官方產業分類") return stock.role_type;
    if (stock.theme_name) return stock.theme_name;
    return stock.industry_name || industry?.industry_name || "未分類同業";
  }
  function peerGroups(industry) {
    const groups = new Map();
    (industry?.peers || []).forEach((stock) => {
      const name = peerGroupName(stock, industry);
      if (!groups.has(name)) groups.set(name, {name, stocks: [], flow: 0});
      const group = groups.get(name);
      group.stocks.push(stock);
      group.flow += amount(stock);
    });
    return Array.from(groups.values()).sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow)).slice(0, 10);
  }
  function renderPeers(applicationIndex, chainIndex) {
    const application = applications[applicationIndex] || applications[0];
    const industry = application?.chains?.[chainIndex] || application?.chains?.[0];
    if (!industry) {
      peerRoot.innerHTML = '<p class="flow-empty">這個應用目前沒有可展開的產業鏈資料。</p>';
      return;
    }
    const groups = peerGroups(industry);
    if (!groups.length) {
      peerRoot.innerHTML = '<p class="flow-empty">這條產業鏈目前沒有已入庫的同業法人資料。</p>';
      return;
    }
    const maxGroup = Math.max(...groups.map((group) => Math.abs(group.flow)), 1);
    peerRoot.innerHTML = '<p class="flow-context">' + esc(application.application) + ' › ' + esc(industry.industry_name) + '</p>' + groups.map((group, groupIndex) => {
      const maxStock = Math.max(...group.stocks.map((stock) => Math.abs(amount(stock))), 1);
      const pagerId = 'flow-peers-' + applicationIndex + '-' + chainIndex + '-' + groupIndex;
      const stocks = group.stocks.map((stock, stockIndex) => '<a class="flow-row flow-link" href="#stock-' + esc(stock.stock_code) + '" data-stock-code="' + esc(stock.stock_code) + '" data-page-item' + (stockIndex >= 10 ? ' hidden' : '') + '><span><strong>' + esc(stock.stock_code) + ' ' + esc(stock.stock_name) + '</strong><small>' + esc(stock.product_description || "公司主要產品與服務請參考公開資訊觀測站") + '<br>' + esc((stock.tags || []).slice(0, 3).join("、")) + '<br>' + esc(breakdown(stock)) + '</small></span>' + bar(amount(stock), maxStock) + '<b>' + esc(label(amount(stock))) + '</b></a>').join("");
      return '<details class="flow-group" ' + (groupIndex === 0 ? 'open' : '') + '><summary class="flow-row"><span><strong>' + esc(group.name) + '</strong><small>' + esc(industry.application) + ' / ' + esc(industry.industry_name) + '<br>目前已入庫 ' + group.stocks.length + ' 檔法人明細</small></span>' + bar(group.flow, maxGroup) + '<b>' + esc(label(group.flow)) + '</b></summary><div class="flow-group-body" data-paged-list data-page-size="10" data-pager-id="' + pagerId + '">' + stocks + '</div><div class="pager" data-pager-controls="' + pagerId + '"></div></details>';
    }).join("");
    if (typeof window.initPagedLists === "function") window.initPagedLists(peerRoot);
  }
  function renderChains(applicationIndex) {
    const application = applications[applicationIndex] || applications[0];
    const chains = application?.chains || [];
    if (!chains.length) {
      chainRoot.innerHTML = '<p class="flow-empty">這個應用目前沒有可展開的產業鏈資料。</p>';
      peerRoot.innerHTML = '<p class="flow-empty">請先選擇有產業鏈資料的應用。</p>';
      return;
    }
    const maxChain = Math.max(...chains.map((chain) => Math.abs(amount(chain.flow))), 1);
    chainRoot.innerHTML = '<p class="flow-context">' + esc(application.application) + ' 的產業鏈</p>' + chains.map((chain, chainIndex) =>
      '<button type="button" class="flow-row flow-choice ' + (chainIndex === 0 ? 'active' : '') + '" data-flow-chain-index="' + chainIndex + '"><span><strong>' + esc(chain.industry_name) + '</strong><small>' + esc((chain.tags || [])[0] || '') + '<br>' + esc((chain.industry_names || []).join("、")) + ' · ' + Number(chain.stock_count || 0).toLocaleString("zh-TW") + ' 檔同業<br>' + esc(breakdown(chain.flow || {})) + (previousFlowDate ? '<em class="flow-trend ' + trendClass(chain.trend) + '">' + esc(trendText(chain.trend)) + '</em>' : '') + '</small></span>' + bar(amount(chain.flow), maxChain) + '<b>' + esc(label(amount(chain.flow))) + '</b></button>'
    ).join("");
    const chainButtons = Array.from(chainRoot.querySelectorAll("[data-flow-chain-index]"));
    chainButtons.forEach((button) => button.addEventListener("click", () => {
      const chainIndex = Number(button.dataset.flowChainIndex || 0);
      chainButtons.forEach((item) => item.classList.toggle("active", item === button));
      renderPeers(applicationIndex, chainIndex);
    }));
    renderPeers(applicationIndex, 0);
  }
  applicationButtons.forEach((button) => button.addEventListener("click", () => {
    const applicationIndex = Number(button.dataset.flowApplicationIndex || 0);
    applicationButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderChains(applicationIndex);
  }));
  renderChains(0);
})();
</script>`;
  const leaderRosterScript = `<script>
(() => {
  const defaults = [
    {leader:"NVIDIA",focus:"GPU、AI Server、資料中心加速卡",items:[
      {id:"nv-tsmc",company:"台積電",layer:"晶圓製造",product:"GPU / AI ASIC 先進製程",suppliers:["2330 台積電"]},
      {id:"nv-cowos",company:"日月光投控",layer:"先進封裝",product:"CoWoS / 封測服務",suppliers:["3711 日月光投控","3260 威剛"]},
      {id:"nv-server",company:"廣達",layer:"系統整合",product:"AI 伺服器與整櫃系統",suppliers:["2382 廣達","3231 緯創","6669 緯穎"]},
      {id:"nv-thermal",company:"奇鋐",layer:"散熱",product:"液冷、風扇、散熱模組",suppliers:["3017 奇鋐","3324 雙鴻","6230 尼得科超眾"]}
    ]},
    {leader:"AMD",focus:"CPU、GPU、資料中心平台",items:[
      {id:"amd-foundry",company:"台積電",layer:"晶圓製造",product:"CPU / GPU 先進製程",suppliers:["2330 台積電"]},
      {id:"amd-board",company:"華碩",layer:"板卡與主機板",product:"主機板、顯示卡、伺服器板",suppliers:["2357 華碩","2376 技嘉","2377 微星"]},
      {id:"amd-substrate",company:"欣興",layer:"載板",product:"ABF 載板、高階 PCB",suppliers:["3037 欣興","8046 南電","3189 景碩"]}
    ]},
    {leader:"Intel",focus:"CPU、PC、伺服器平台與封裝",items:[
      {id:"intel-pc",company:"仁寶",layer:"終端製造",product:"筆電、PC、伺服器代工",suppliers:["2324 仁寶","2356 英業達","2382 廣達"]},
      {id:"intel-board",company:"華碩",layer:"主機板",product:"PC 主機板、伺服器板",suppliers:["2357 華碩","2376 技嘉","2377 微星"]},
      {id:"intel-power",company:"台達電",layer:"電源管理",product:"電源供應器、資料中心電力管理",suppliers:["2308 台達電","6412 群電"]}
    ]}
  ];
  const key = "leaderSupplyRoster.v1";
  const defaultLeaderNames = new Set(defaults.map((item) => item.leader));
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(key) || "null");
  } catch {}
  let state = Array.isArray(stored) && stored.length ? stored : defaults;
  state = state
    .filter((item) => item && item.leader)
    .map((item) => ({...item, focus:item.focus || "待補主要應用", items:Array.isArray(item.items) ? item.items : []}));
  if (!state.length) state = defaults;
  let active = state[0].leader;
  let query = "";
  let dragId = null;
  const root = document.querySelector("[data-roster-root]");
  const save = () => localStorage.setItem(key, JSON.stringify(state));
  const current = () => state.find((item) => item.leader === active) || state[0];
  const esc = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const supplierChip = (supplier) => {
    const text = String(supplier || "").trim();
    const match = text.match(/^(\\d{4})\\s*(.*)$/);
    if (!match) return \`<b class="label-chip">\${esc(text)}</b>\`;
    const code = match[1];
    return \`<a class="label-chip roster-stock-link" href="#stock-\${esc(code)}" data-stock-code="\${esc(code)}">\${esc(text)}</a>\`;
  };
  function render() {
    const roster = current();
    const keyword = query.trim().toLowerCase();
    const items = keyword ? roster.items.filter((item) => [item.company,item.layer,item.product,item.note,(item.suppliers || []).join(" ")].join(" ").toLowerCase().includes(keyword)) : roster.items;
    root.innerHTML = \`
      <div class="leader-create">
        <input data-new-leader placeholder="龍頭公司，例如 Microsoft">
        <input data-new-focus placeholder="主要應用，例如雲端、AI 資料中心">
        <button type="button" data-add-leader>新增龍頭</button>
      </div>
      <div class="leader-tabs">\${state.map((item) => \`<span class="leader-tab-wrap"><button type="button" data-leader="\${esc(item.leader)}" class="\${item.leader === active ? "active" : ""}">\${esc(item.leader)}</button>\${defaultLeaderNames.has(item.leader) ? "" : \`<button type="button" class="leader-remove" data-delete-leader="\${esc(item.leader)}" aria-label="刪除 \${esc(item.leader)}">×</button>\`}</span>\`).join("")}</div>
      <p class="muted">\${esc(roster.focus)}</p>
      <div class="roster-tools">
        <input data-query placeholder="搜尋公司、產品、台廠..." value="\${esc(query)}">
        <input data-company placeholder="供應鏈公司">
        <input data-layer placeholder="層級，例如晶圓製造">
        <input data-product placeholder="產品 / 服務">
        <input data-note placeholder="負責區塊／備註">
        <input data-suppliers placeholder="台股供應商，用空白或逗號分隔">
        <button type="button" data-add>新增</button>
      </div>
      <div class="roster-list">\${items.map((item) => \`
        <article class="roster-item" draggable="true" data-id="\${esc(item.id)}">
          <span class="drag-handle">拖曳</span>
          <div><strong>\${esc(item.company)}</strong><p class="muted">\${esc(item.layer)} / \${esc(item.product)}</p><div>\${(item.suppliers || []).map(supplierChip).join("")}</div><label class="roster-note-editor"><span>負責區塊／備註</span><input data-item-note="\${esc(item.id)}" value="\${esc(item.note || "")}" placeholder="例如：GPU 先進製程、液冷散熱"></label></div>
          <button type="button" data-delete="\${esc(item.id)}">刪除</button>
        </article>\`).join("")}</div>\`;
    root.querySelectorAll("[data-leader]").forEach((button) => button.addEventListener("click", () => { active = button.dataset.leader; render(); }));
    root.querySelector("[data-add-leader]").addEventListener("click", () => {
      const leader = root.querySelector("[data-new-leader]").value.trim();
      const focus = root.querySelector("[data-new-focus]").value.trim() || "待補主要應用";
      if (!leader || state.some((item) => item.leader.toLowerCase() === leader.toLowerCase())) return;
      state.push({leader, focus, items:[]});
      active = leader;
      query = "";
      save(); render();
    });
    root.querySelectorAll("[data-delete-leader]").forEach((button) => button.addEventListener("click", () => {
      const leader = button.dataset.deleteLeader;
      if (defaultLeaderNames.has(leader)) return;
      state = state.filter((item) => item.leader !== leader);
      active = state[0].leader;
      query = "";
      save(); render();
    }));
    root.querySelector("[data-query]").addEventListener("input", (event) => { query = event.target.value; render(); });
    root.querySelector("[data-add]").addEventListener("click", () => {
      const company = root.querySelector("[data-company]").value.trim();
      const layer = root.querySelector("[data-layer]").value.trim();
      const product = root.querySelector("[data-product]").value.trim() || "待補產品";
      const note = root.querySelector("[data-note]").value.trim();
      const suppliers = root.querySelector("[data-suppliers]").value.split(/[、,\\s]+/).map((item) => item.trim()).filter(Boolean);
      if (!company || !layer) return;
      roster.items.unshift({id: active + "-" + Date.now(), company, layer, product, note, suppliers});
      save(); render();
    });
    root.querySelectorAll("[data-item-note]").forEach((input) => input.addEventListener("change", () => {
      const item = roster.items.find((entry) => entry.id === input.dataset.itemNote);
      if (!item) return;
      item.note = input.value.trim();
      save();
    }));
    root.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => { roster.items = roster.items.filter((item) => item.id !== button.dataset.delete); save(); render(); }));
    root.querySelectorAll(".roster-item").forEach((node) => {
      node.addEventListener("dragstart", () => { dragId = node.dataset.id; });
      node.addEventListener("dragover", (event) => event.preventDefault());
      node.addEventListener("drop", () => {
        if (!dragId || dragId === node.dataset.id) return;
        const from = roster.items.findIndex((item) => item.id === dragId);
        const to = roster.items.findIndex((item) => item.id === node.dataset.id);
        const moved = roster.items.splice(from, 1)[0];
        roster.items.splice(to, 0, moved);
        dragId = null; save(); render();
      });
    });
  }
  render();
})();
</script>`;

  const updateScript = `<script>
(() => {
  const button = document.querySelector("[data-run-official-update]");
  const status = document.querySelector("[data-update-status]");
  const syncTime = document.querySelector("[data-latest-sync-time]");
  const priceDate = document.querySelector("[data-latest-price-date]");
  const institutionalDate = document.querySelector("[data-latest-institutional-date]");
  const indexDate = document.querySelector("[data-latest-index-date]");
  const revenueDate = document.querySelector("[data-latest-revenue-date]");
  if (!button || !status) return;
  const tasks = [
    { key: "daily-price", label: "每日行情" },
    { key: "monthly-revenue", label: "最新月營收" },
    { key: "institutional-flow", label: "三大法人" },
    { key: "market-index", label: "加權指數", extra: { index_months: 1 } },
  ];
  const sourceLabels = {
    tpex_otc_daily_price: "上櫃行情",
    tpex_emerging_daily_price: "興櫃行情",
    tpex_institutional_flow: "上櫃法人",
    twse_institutional_flow: "上市法人",
    twse_daily_price: "上市行情",
  };
  const nestedErrors = (value, path = [], found = []) => {
    if (!value || typeof value !== "object") return found;
    if (value.error) {
      const key = path[path.length - 1] || "官方來源";
      found.push(sourceLabels[key] || key);
      return found;
    }
    Object.entries(value).forEach(([key, child]) => nestedErrors(child, [...path, key], found));
    return found;
  };
  async function runTask(task) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 70000);
    try {
      const response = await fetch("/api/admin/crawler/run", {
        method: "POST",
        headers: {"content-type":"application/json"},
        body: JSON.stringify({
          crawler_name: "manual-" + task.key,
          tasks: [task.key],
          trigger: "homepage-button",
          wait: true,
          ...(task.extra || {}),
        }),
        signal: controller.signal,
      });
      const parsed = await response.json().catch(() => ({}));
      if (!response.ok || parsed.error) throw new Error(parsed.error || task.label + "更新失敗");
      return nestedErrors(parsed.data?.summary || {});
    } finally {
      clearTimeout(timeout);
    }
  }
  const displayTime = (value) => {
    if (!value) return "-";
    return new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(value));
  };
  async function refreshDisplayedDates() {
    const response = await fetch("/api/crawler/status?ts=" + Date.now(), { cache: "no-store" });
    if (!response.ok) return;
    const parsed = await response.json().catch(() => ({}));
    const rows = parsed.data?.status || [];
    const byType = Object.fromEntries(rows.map((row) => [row.data_type, row]));
    const latestTime = rows.reduce((latest, row) => {
      const value = String(row.latest_update_time || "");
      return value > latest ? value : latest;
    }, "");
    if (syncTime) syncTime.textContent = displayTime(latestTime);
    if (priceDate) priceDate.textContent = byType.daily_price?.latest_data_date || "-";
    if (institutionalDate) institutionalDate.textContent = byType.institutional_flow?.latest_data_date || "-";
    if (indexDate) indexDate.textContent = byType.market_index?.latest_data_date || "-";
    if (revenueDate) revenueDate.textContent = String(byType.monthly_revenue?.latest_data_date || "-").slice(0, 7);
  }
  button.addEventListener("click", async () => {
    button.disabled = true;
    const completed = [];
    const failed = [];
    for (let index = 0; index < tasks.length; index++) {
      const task = tasks[index];
      status.textContent = "更新中 " + (index + 1) + " / " + tasks.length + "：" + task.label;
      try {
        const partial = await runTask(task);
        completed.push(task.label);
        failed.push(...partial);
      } catch (error) {
        failed.push(task.label);
      }
    }
    const uniqueFailed = [...new Set(failed)];
    await refreshDisplayedDates().catch(() => {});
    status.textContent = completed.length
      ? "更新完成：" + completed.join("、") + (uniqueFailed.length ? "；暫時未更新：" + uniqueFailed.join("、") : "") + "。上方日期已同步更新。"
      : "更新失敗：官方來源目前無法連線，請稍後再試。";
    button.disabled = false;
  });
})();
</script>`;

  const stockTreeRows = (stockTree?.applications || []).map((application, index) => {
    const industryRows = application.industries.map((industry, industryIndex) => {
      const pagerId = `peers-${index}-${industryIndex}`;
      const peerRows = industry.peers.map((stock, stockIndex) => `<a class="peer" href="#stock-${stock.stock_code}" data-stock-code="${stock.stock_code}" data-page-item${stockIndex >= 10 ? " hidden" : ""}>
        <span><strong>${stock.stock_code} ${stock.stock_name}</strong><small>${escHtml(stock.product_description || "公司主要產品與服務請參考公開資訊觀測站")}<br>${(stock.tags || []).slice(0, 5).join(" / ") || industry.industry_name}</small></span>
        <b>${stock.status || stock.market_type || ""}</b>
      </a>`).join("");
      return `<details class="branch">
        <summary><span>${industry.industry_name}</span><small>同業 ${industry.stock_count} 檔 / ${industry.theme_tags.slice(0, 5).join("、")}</small></summary>
        <div class="tagline">${industry.theme_tags.map((tag) => `<b class="tag">${tag}</b>`).join("")}</div>
        <div class="peer-grid" data-paged-list data-page-size="10" data-pager-id="${pagerId}">${peerRows}</div>
        <div class="pager" data-pager-controls="${pagerId}"></div>
      </details>`;
    }).join("");
    return `<details class="tree" ${index === 0 ? "open" : ""} data-page-item>
      <summary><span>${application.application}</span><small>涵蓋 ${application.industry_count} 個產業類群、${application.stock_count} 檔同業</small></summary>
      <div class="tree-body">${industryRows}</div>
    </details>`;
  }).join("");
  const themeTreeRows = (themeTree || []).map((category, index) => {
    const themeRows = category.themes.map((theme, themeIndex) => {
      const industryRows = theme.industries.slice(0, 8).map((industry, industryIndex) => {
        const pagerId = `theme-peers-${index}-${themeIndex}-${industryIndex}`;
        const stocks = (industry.stocks || []).map((stock, stockIndex) => `<a class="peer" href="#stock-${stock.stock_code}" data-stock-code="${stock.stock_code}" data-page-item${stockIndex >= 10 ? " hidden" : ""}>
          <span><strong>${stock.stock_code} ${stock.stock_name}</strong><small>${escHtml(stock.product_description || "公司主要產品與服務請參考公開資訊觀測站")}<br>${stock.role_type || theme.theme_name} / ${stock.relation_strength || industry.industry_name}</small></span>
          <b>${stock.status || stock.market_type || ""}</b>
        </a>`).join("");
        return `<details class="theme-industry">
          <summary><strong>${industry.industry_name}</strong><small>同業 ${industry.stock_count} 檔 / ${industry.tags.join("、")}</small></summary>
          <div class="peer-grid" data-paged-list data-page-size="10" data-pager-id="${pagerId}">${stocks || "<p class=\"muted\">尚無同業股票</p>"}</div>
          <div class="pager" data-pager-controls="${pagerId}"></div>
        </details>`;
      }).join("");
      return `<details class="branch">
        <summary><span>${theme.theme_name}</span><small>狀態：${theme.status || "觀察"}，可展開看產業與同業</small></summary>
        <p class="muted">${theme.reason || theme.description || ""}</p>
        <div class="theme-industries">${industryRows}</div>
      </details>`;
    }).join("");
    return `<details class="tree" ${index === 0 ? "open" : ""}>
      <summary><span>${category.category}</span><small>${category.count} 個題材抽屜，依產業拆同業</small></summary>
      <div class="tree-body">${themeRows}</div>
    </details>`;
  }).join("");

  return new Response(`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escHtml(pageMeta[0])} | 台股研究平台</title>
  ${PWA_HEAD}
  <link rel="stylesheet" href="/assets/app.css?v=${PERFORMANCE_ASSET_VERSION}">
</head>
<body>
<main>
  <section class="manual-update"><small data-update-status>官方資料由受保護排程更新；公開頁面只讀取已驗證的 TWSE / TPEx / MOPS 資料。</small></section>
  <nav class="nav"><a href="/">首頁</a><a href="/market">市場研究</a><a href="/research">選股研究</a><a href="/taxonomy">分類探索</a><a href="/data">資料中心</a><a href="/guide">使用教學</a><a href="/disclaimer">投資風險聲明</a><button class="install-app" type="button" data-install-app hidden>下載 APP</button><span class="nav-account"><a href="/watchlist#login">Google 登入</a><a href="/watchlist">自選股／交易帳本</a></span></nav>
  ${show("home") ? `<section class="hero">
    <div><p class="eyebrow">Cloudflare + D1 MVP</p><h1>台股全市場研究平台</h1><p>以「應用方向 > 產業 > 同業」整理所有台股資訊；公司業務可同時出現在多個應用抽屜，產業節點會帶出題材與角色標籤。</p></div>
    <aside class="update"><span>最後同步時間</span><strong data-latest-sync-time>${updated}</strong><small>收盤行情：<b data-latest-price-date>${latestDataDate("daily_price")}</b></small><small>三大法人：<b data-latest-institutional-date>${latestDataDate("institutional_flow")}</b>／加權指數：<b data-latest-index-date>${latestDataDate("market_index")}</b></small><small>月營收：<b data-latest-revenue-date>${String(latestDataDate("monthly_revenue")).slice(0, 7)}</b></small><small>本網站僅供研究觀察，不構成投資建議。</small></aside>
  </section>
  <section class="ux-guide">${sectionGuide}</section>` : `<section class="hero"><div><p class="eyebrow">TW Stock Research</p><h1>${escHtml(pageMeta[0])}</h1><p>${escHtml(pageMeta[1])}</p></div><aside class="update"><span>最後同步時間</span><strong>${updated}</strong><small>盤後研究資料，非即時報價。</small></aside></section>`}
  ${show("disclaimer") ? `<section class="panel disclaimer-panel">
    <p class="eyebrow">Investment Risk Disclaimer</p>
    <h2>投資決策與盈虧由使用者自行承擔</h2>
    <p class="disclaimer-callout">投資屬於個人自主行為。本研究平台提供的行情、分類、評分、題材、新聞、法人資料與其他研究內容僅供資訊整理及研究參考，不構成任何買進、賣出、持有或其他投資建議。</p>
    <ul class="disclaimer-list">
      <li>使用者應自行判斷資料、風險承受能力與投資決策，並自行承擔所有獲利或虧損結果。</li>
      <li>本平台不保證資料即時、完整、準確或適合特定投資目的；官方來源異動、網路中斷或同步延遲都可能造成差異。</li>
      <li>在法律允許的最大範圍內，本平台及維護者不對因使用或依賴本站內容所產生的直接、間接或衍生投資損失負賠償責任。</li>
      <li>任何依法不得排除或限制的責任，不因本聲明而排除或限制。</li>
    </ul>
    <p>繼續使用本平台，即表示您已閱讀並理解上述風險。若無法接受，請停止使用本平台提供的研究內容。</p>
    <time datetime="2026-07-02">最後更新：2026-07-02</time>
  </section>` : ""}
  ${show("guide") ? `<section class="guide-page">
    <article class="guide-intro"><strong>平台特色</strong><p>把官方產業、已驗證題材、法人、營收、估值、全球市場與個人交易帳本放在同一套研究流程。資料不足時會明確標示，不把示範資料包裝成正式推薦。</p></article>
    <article class="panel"><p class="eyebrow">Update Schedule</p><h2>每天什麼時候更新？</h2><div class="guide-schedule"><article><strong>08:00</strong><small>美國、日本、韓國主要指數與台指期夜盤；可寄送漲跌與快照變動。</small></article><article><strong>10:00</strong><small>月營收、台灣加權指數、除權息；週日另同步完整股票名冊。</small></article><article><strong>18:00</strong><small>收盤行情、本益比、三大法人與可用資料評分。</small></article></div></article>
    <div class="guide-grid">
      <article class="guide-card"><h2>1. 搜尋股票</h2><ol><li>前往「選股研究」。</li><li>輸入代號或名稱片段，例如 2330、台積。</li><li>從預選清單點選股票，右側會開啟 K 線、本益比、法人、營收、日期與新聞。</li></ol></article>
      <article class="guide-card"><h2>2. 進階條件選股</h2><ol><li>展開「進階條件選股」。</li><li>設定市場、官方產業、已驗證題材、價格、成交額、營收或法人條件。</li><li>按「開始篩選」；這些條件不會影響上方一般股票搜尋。</li></ol></article>
      <article class="guide-card"><h2>3. 市場與資金</h2><ul><li>市場資金集中量圖可點產業後繼續查看細分同業。</li><li>法人區分外資、投信、自營商，可看買賣超與期間累積。</li><li>全球市場區顯示國家、指數名稱與夜盤資訊。</li></ul></article>
      <article class="guide-card"><h2>4. 個股圖表</h2><ul><li>日線、月線、年線可切換。</li><li>移動平均線 MA 與布林通道 BOLL 可個別勾選。</li><li>新聞只保留與股票代號、公司名稱或 ticker 相符的高可信來源。</li></ul></article>
      <article class="guide-card"><h2>5. 個股比較</h2><ol><li>逐一輸入股票代號或名稱。</li><li>點選預選項目加入比較框。</li><li>加入 2–4 檔後，比較價格、估值、營收、法人、題材與評分。</li></ol></article>
      <article class="guide-card"><h2>6. 交易帳本</h2><ol><li>使用 Google 帳號登入。</li><li>選擇買入／賣出、交易模式、股或張、價格與費率。</li><li>系統依加權平均成本計算庫存、已實現與未實現損益；每筆歷史可個別刪除。</li></ol></article>
      <article class="guide-card"><h2>7. Email 更新提醒</h2><ol><li>提醒功能只開放白名單帳號；未開放時選項會呈灰色。</li><li>獲授權後可勾選 08:00、10:00、18:00，並可複選。</li><li>提醒管理員可新增特定 Email，並替已登入帳號設定時段。</li><li>郵件會列出本次更新內容、主要變動與失敗來源。</li></ol></article>
      <article class="guide-card"><h2>8. 資料限制</h2><ul><li>本站是盤後研究工具，不是即時下單系統。</li><li>官方來源尚未公告、同步失敗或涵蓋不足時會顯示資料不足。</li><li>評分與題材僅供研究，不構成投資建議；投資盈虧由使用者自行承擔。</li></ul></article>
    </div>
  </section>` : ""}
  ${show("market") ? `<section class="market-snapshot" id="market-dashboard">
    <article class="panel"><p class="eyebrow">Market Dashboard</p><div class="panel-head"><h2>目前市場焦點</h2><span class="info-dot" tabindex="0" data-tip="熱門股票依成交值、題材分數與法人資料排序；外資/投信買賣超來自 TWSE T86，金額與張數僅作研究觀察。">!</span></div><div class="snapshot-grid">${marketSnapshotRows}</div></article>
    <article class="panel"><p class="eyebrow">TAIEX</p><div class="panel-head"><h2>加權指數</h2><span class="info-dot" tabindex="0" data-tip="加權指數 OHLC 來自 TWSE MI_5MINS_HIST；成交量與成交金額為同交易日已入庫上市股票加總。可用滑鼠滾輪或加減按鈕同步縮放 K 線與量柱。">!</span></div>${marketKRows}</article>
  </section>${capitalConcentrationChart}` : ""}
  ${show("home", "market") ? `<section class="panel global-market" data-global-market>
    <p class="eyebrow">Global & Night Session</p>
    <div class="panel-head"><div><h2>全球指數與台指期夜盤</h2><p class="muted">美股、日韓主要指數與台指期最近月份盤後行情；區塊延遲載入，不阻塞主頁。</p></div><span class="info-dot" tabindex="0" data-tip="國際指數使用 Yahoo Finance 行情；台指期夜盤使用期交所官方每日交易行情。資料快取五分鐘，並標示來源日期。">!</span></div>
    <div class="global-market-grid" data-global-market-grid>
      ${["美國 · 道瓊工業", "美國 · S&P 500", "美國 · NASDAQ", "日本 · 日經 225", "韓國 · KOSPI", "台灣 · 台指期夜盤"].map((label) => `<article class="global-market-card"><span>${label}</span><strong>載入中</strong><em>--</em><small>正在取得行情</small></article>`).join("")}
    </div>
    <p class="global-market-source" data-global-market-status>行情將在主頁完成後載入。</p>
  </section>` : ""}
  ${show("home") ? `<section class="grid grid-4">
    <article class="metric"><span>目前主流題材</span><strong>${themesData[0]?.theme_name || "-"}</strong><small>${themesData[0] ? `${themesData[0].status || "觀察"} / 熱度 ${n(themesData[0].total_theme_score)} / ${themesData[0].score_date || "-"}` : "等待每日市場熱度重算"}</small></article>
    <article class="metric"><span>普通股母體</span><strong>${quality.stocks?.common_stocks ?? "-"}</strong><small>首頁摘要顯示 ${stockTree?.totals?.stock_count ?? "-"} 檔高成交股票；完整樹由快取 API 提供</small></article>
    <article class="metric"><span>成交值最高</span><strong>${topTurnover.stock_name || "-"}</strong><small>${n(topTurnover.turnover_value)}</small></article>
    <article class="metric"><span>月營收成長</span><strong>${topRevenue.stock_name || "-"}</strong><small>YoY ${topRevenue.yoy_growth_percent ?? "-"}%</small></article>
  </section>` : ""}
  ${show("research") ? `<section class="panel" id="stock-screener" style="margin-top:16px">
    <p class="eyebrow">Stock Search & Advanced Screener</p>
    <div class="panel-head"><div><h2>股票搜尋</h2><p class="muted">輸入代號或名稱的一部分，從預選結果直接開啟個股資訊；不受選股條件限制。</p></div><span class="info-dot" tabindex="0" data-tip="股票搜尋涵蓋目前總表內的上市、上櫃、興櫃、ETF 與 TDR，並依完全相符、開頭相符、部分相符排序。">!</span></div>
    <div class="stock-lookup">
      <div class="stock-lookup-search"><input data-stock-lookup-input autocomplete="off" aria-autocomplete="list" aria-expanded="false" aria-controls="stock-lookup-suggestions" placeholder="例如 2330、台積、元大台灣"><div class="stock-lookup-suggestions" id="stock-lookup-suggestions" data-stock-lookup-suggestions role="listbox" hidden></div></div>
      <button type="button" data-stock-lookup-submit>查看股票</button>
    </div>
    <p class="screener-status" data-stock-lookup-status role="status" aria-live="polite">可搜尋上市、上櫃、興櫃、ETF 與 TDR。</p>
    <details class="advanced-screener">
      <summary><span>進階條件選股</span><small>市場、產業、題材、價格、營收、成交額與法人條件</small></summary>
    <form class="screener-form" data-screener-form>
      <label>市場<select name="market_type"><option value="">全部</option><option value="上市">上市</option><option value="上櫃">上櫃</option><option value="興櫃">興櫃</option></select></label>
      <label>資產類型<select name="instrument_type"><option value="stock">普通股</option><option value="emerging">興櫃股票</option><option value="etf">ETF</option><option value="tdr">TDR</option><option value="all">全部</option></select></label>
      <label>官方產業<select name="industry"><option value="">全部</option>${industryOptions}</select></label>
      <label>已驗證題材（可搜尋）<span class="screener-theme-search"><input name="theme" data-screener-theme-input autocomplete="off" aria-autocomplete="list" aria-expanded="false" aria-controls="screener-theme-suggestions" placeholder="輸入 AI、CoWo 或散熱"><span class="screener-theme-suggestions" id="screener-theme-suggestions" data-screener-theme-suggestions role="listbox" hidden></span></span></label>
      <label>最低股價<input name="min_price" type="number" min="0" step="0.01" placeholder="不限"></label>
      <label>最高股價<input name="max_price" type="number" min="0" step="0.01" placeholder="不限"></label>
      <label>最低成交額<input name="min_turnover" type="number" min="0" step="10000" placeholder="例如 100000000"></label>
      <label>最低營收 YoY<input name="min_revenue_yoy" type="number" step="0.1" placeholder="例如 10"></label>
      <label>法人期間<select name="institutional_window"><option value="1">1 日</option><option value="5">5 日</option><option value="10">10 日</option><option value="20">20 日</option></select></label>
      <label>法人別<select name="flow_party"><option value="total">三大法人</option><option value="foreign">外資</option><option value="trust">投信</option><option value="dealer">自營商</option></select></label>
      <label>方向<select name="flow_direction"><option value="">不限</option><option value="buy">買超</option><option value="sell">賣超</option></select></label>
      <label>排序<select name="sort"><option value="turnover">成交額</option><option value="revenue">營收 YoY</option><option value="institutional">法人買賣超</option><option value="price">股價</option></select></label>
      <label>順序<select name="direction"><option value="desc">高到低</option><option value="asc">低到高</option></select></label>
      <div class="screener-actions"><button type="submit">開始篩選</button><button class="screener-reset" type="reset">清除條件</button></div>
      <div class="screener-presets"><span>快速試用：</span><button type="button" data-screener-theme-example="CoWoS">CoWoS</button><button type="button" data-screener-theme-example="AI Server">AI Server</button><button type="button" data-screener-theme-example="散熱">散熱</button></div>
    </form>
    <p class="screener-status" data-screener-status role="status" aria-live="polite">設定條件後開始篩選；這裡不會影響上方股票搜尋。</p>
    <div class="screener-results" data-screener-results></div>
    </details>
  </section>` : ""}
  ${show("data") ? `<section class="panel" id="data-quality" style="margin-top:16px">
    <p class="eyebrow">Data Quality</p>
    <div class="panel-head"><div><h2>資料品質中心</h2><p class="muted">分類版本 ${escHtml(quality.taxonomy_version || TAXONOMY_VERSION)}；市場資料已載入 ${n(qualityDatasetCount)} 組。${recommendationsReady ? `推薦功能可用：評分 ${n(scoreCoverageCount)} 檔。` : `推薦功能暫停：評分 ${n(scoreCoverageCount)} / ${n(recommendationRequired)}，尚未達普通股母體 80% 或評分日期不是最新行情日。`}</p></div><span class="info-dot" tabindex="0" data-tip="覆蓋率會分上市、上櫃、興櫃顯示；缺少的市場不會被包裝成全市場結論。">!</span></div>
    <div class="quality-summary"><b>全站證券 ${n(quality.stocks?.total || 0)} 檔</b><b>普通股 ${n(quality.stocks?.common_stocks || 0)}</b><b>興櫃 ${n(quality.stocks?.emerging_stocks || 0)}</b><b>ETF ${n(quality.stocks?.etfs || 0)}</b><b>TDR ${n(quality.stocks?.tdrs || 0)}</b><b>資料集 ${n(qualityDatasetCount)} 組</b><b>來源狀態 ${n(qualitySourceCount)} 筆</b><b>產業名稱異常 ${n(quality.stocks?.invalid_industry_names || 0)}</b><b>公開題材關聯 ${n(quality.themes?.public_links || 0)}</b><b>待審關聯 ${n(quality.themes?.pending_links || 0)}</b><b>可信門檻 ${n(quality.public_confidence_threshold || PUBLIC_CLASSIFICATION_CONFIDENCE)}</b></div>
    <p class="muted">行情與營收分開顯示上市、上櫃、興櫃；法人報表只適用上市與上櫃普通股。官方當日未列出的股票保留為「無報表紀錄」，不會擅自補成 0。</p>
    <div class="quality-grid">${qualityCoverageRows || '<p class="muted">尚無覆蓋率資料。</p>'}</div>
    <h3>來源狀態</h3>
    <div class="quality-grid">${qualitySourceRows || '<p class="muted">尚無來源狀態紀錄。</p>'}</div>
  </section>` : ""}
  ${show("research") ? `<section class="panel" id="stock-compare" style="margin-top:16px">
    <p class="eyebrow">Stock Compare</p>
    <div class="panel-head"><div><h2>個股比較</h2><p class="muted">逐檔搜尋並加入 2–4 檔，比較股價、營收、法人、官方產業與已驗證題材。</p></div><span class="info-dot" tabindex="0" data-tip="輸入代號或名稱，從預選結果加入；已選股票會變成可移除的框框。">!</span></div>
    <form class="compare-form" data-compare-form><div class="compare-builder"><div class="compare-selected" data-compare-selected></div><div class="compare-search"><input data-compare-input autocomplete="off" placeholder="輸入代號或名稱，例如：2330、台積電"><div class="compare-suggestions" data-compare-suggestions hidden></div></div></div><button type="submit">開始比較</button></form>
    <p class="screener-status" data-compare-status>請依序加入 2–4 檔股票。</p>
    <div class="compare-grid" data-compare-results></div>
  </section>` : ""}
  ${show("taxonomy") ? `<section class="panel" id="stock-tree-section" style="margin-top:16px"><p class="eyebrow">Application Tree</p><div class="panel-head"><h2>全台股資訊樹</h2><span class="info-dot" tabindex="0" data-tip="大型樹狀資料按需從五分鐘快取 API 取得。">!</span></div><div class="lazy-tree-shell" data-lazy-tree data-mode="stock" data-endpoint="/api/stocks/tree?applications=8&industries=6&peers=8&rows=800"><div class="lazy-tree-toolbar"><p class="muted" data-lazy-status>尚未載入。</p><button class="lazy-tree-load" type="button" data-lazy-load>載入產業樹</button></div><div class="lazy-tree-content" data-lazy-content></div></div></section>` : ""}
  ${show("taxonomy") ? `<section class="panel" id="theme-tree-section" style="margin-top:16px"><p class="eyebrow">Hot Theme Tree</p><div class="panel-head"><h2>熱門題材排行樹</h2><span class="info-dot" tabindex="0" data-tip="只載入已人工核准或信心至少 80、且分數日期有效的題材。">!</span></div><div class="lazy-tree-shell" data-lazy-tree data-mode="theme" data-endpoint="/api/themes/tree?themes=18&industries=5&stocks=8"><div class="lazy-tree-toolbar"><p class="muted" data-lazy-status>尚未載入。</p><button class="lazy-tree-load" type="button" data-lazy-load>載入題材樹</button></div><div class="lazy-tree-content" data-lazy-content></div></div></section>` : ""}
  ${show("market") ? `<section class="panel" id="institutional-flow" style="margin-top:16px"><p class="eyebrow">Institutional Flow</p><div class="panel-head"><h2>三大法人資金動向</h2><span class="info-dot" tabindex="0" data-tip="前 20 名直接顯示，產業與同業樹按需載入。">!</span></div><p class="muted">最新法人日期：${dashboard.flow_date || "-"}。外資、投信、自營商前 20 名直接顯示。</p>${institutionalLeaderBoard}<div class="lazy-tree-shell" data-lazy-tree data-mode="institutional" data-endpoint="/api/market/institutional-tree?stocks=260&applications=8&industries=6&peers=8"><div class="lazy-tree-toolbar"><p class="muted" data-lazy-status>法人產業樹尚未載入。</p><button class="lazy-tree-load" type="button" data-lazy-load>載入法人產業樹</button></div><div class="lazy-tree-content" data-lazy-content></div></div></section>` : ""}
  ${show("market") ? `<section class="panel" id="recommendations" style="margin-top:16px"><p class="eyebrow">Current Picks</p><div class="panel-head"><h2>目前推薦</h2><span class="info-dot" tabindex="0" data-tip="只使用目前有高覆蓋率且可重算的盤後資料；排名不代表投資建議。">!</span></div><div class="relation-definition"><strong>評分公式 v1</strong><span>當日價格動能分位 × 25% ＋ 成交值分位 × 20% ＋ 法人淨買超金額分位 × 25% ＋ 月營收 YoY 分位 × 20% ＋ 已驗證題材分數 × 10%。各項皆為 0–100 分；缺值採中性 50 分，不使用尚未完整的季財報。</span></div><div class="recommend-grid">${recommendationRows}</div></section>` : ""}
  ${show("data") ? `<section class="panel" id="sources" style="margin-top:16px"><p class="eyebrow">Reference Sources</p><div class="panel-head"><h2>資料來源與參考連結</h2><span class="info-dot" tabindex="0" data-tip="快訊、注意股、處置股與重大訊息優先採交易所或公開資訊觀測站。">!</span></div><p class="muted">快訊、注意股、處置股、重大訊息與基本行情會優先採官方來源；新聞只作輔助解讀，不能取代官方公告。</p><div class="source-list">${sourceRows}</div></section>` : ""}
  ${show("taxonomy") ? `<section class="panel" id="leader-roster" style="margin-top:16px"><p class="eyebrow">Leader Supply Chain</p><div class="panel-head"><h2>龍頭應用商供應鏈名冊</h2><span class="info-dot" tabindex="0" data-tip="供應商若有 4 碼股票代號，可點開右側個股抽屜。">!</span></div><div data-roster-root></div></section>` : ""}
</main>
<div class="stock-backdrop" data-stock-backdrop></div>
<aside class="stock-drawer" data-stock-drawer aria-hidden="true">
  <header class="drawer-head"><div><p class="eyebrow">Stock Detail</p><h2 data-stock-drawer-title>個股資訊</h2><small class="muted" data-stock-drawer-subtitle>點選股票查看日線、月線與法人指標</small></div><button type="button" data-stock-close aria-label="關閉">×</button></header>
  <div class="drawer-body" data-stock-drawer-body></div>
</aside>
${show("taxonomy") ? leaderRosterScript : ""}
<script src="/assets/app.js?v=${PERFORMANCE_ASSET_VERSION}" defer></script>
<script src="/assets/lazy-trees.js?v=${PERFORMANCE_ASSET_VERSION}" defer></script>
<script src="/assets/pwa.js?v=${PERFORMANCE_ASSET_VERSION}" defer></script>
</body>
</html>`, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60, s-maxage=300" },
  });
}

function watchlistHtml(env) {
  const clientId = env.GOOGLE_CLIENT_ID || "";
  return new Response(`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>自選股 | 台股產業鏈研究</title>
  <style>
    :root{color-scheme:light;--bg:#f7f8f4;--ink:#0d1b2a;--muted:#5d6b7a;--line:#d9dfd7;--green:#0b7f5f;--red:#df4b3f;--card:#fff}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif}
    main{width:min(1120px,calc(100% - 32px));margin:0 auto;padding:24px 0 48px}
    .nav{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:18px}.nav a{color:var(--green);font-weight:800;text-decoration:none}
    .hero{display:grid;grid-template-columns:1.1fr .9fr;gap:16px;align-items:stretch}.panel{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:18px}
    h1,h2{margin:0 0 10px}p{margin:0}.muted{color:var(--muted);line-height:1.65}.login-box{display:grid;gap:12px;align-content:start}
    .user{display:flex;align-items:center;gap:10px}.user img{width:42px;height:42px;border-radius:50%;background:#eef2ee}
    form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}label{display:grid;gap:5px;color:var(--muted);font-size:.78rem;font-weight:900}.wide{grid-column:span 2}input{width:100%;border:1px solid var(--line);border-radius:8px;padding:10px 12px;font:inherit;background:#fff}
    button{border:0;border-radius:8px;background:var(--green);color:#fff;font-weight:800;padding:10px 14px;cursor:pointer}button.secondary{background:#eef3ef;color:var(--ink)}button.danger{background:#f7e7e4;color:#9d2f26}button.google-disabled{width:100%;margin:4px 0 10px;background:#eef3ef;color:var(--muted);cursor:not-allowed}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px}.item{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:start;border:1px solid var(--line);border-radius:8px;padding:14px;background:#fff}
    .item strong{font-size:1.05rem}.item small{display:block;color:var(--muted);line-height:1.5}.profit-box{display:grid;gap:3px;margin-top:8px;border-top:1px solid var(--line);padding-top:8px}.profit-box b{font-size:1rem}.trade-meta{display:block;margin-top:6px}.alert-list{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.alert-list b{border:1px solid rgba(11,127,95,.24);border-radius:999px;padding:3px 7px;background:rgba(11,127,95,.08);color:var(--green);font-size:.74rem}.up{color:var(--red)}.down{color:var(--green)}.empty{border:1px dashed var(--line);border-radius:8px;padding:24px;text-align:center;color:var(--muted);margin-top:16px}
    .status{margin-top:10px;color:var(--muted)}.form-status{grid-column:1/-1;min-height:20px}.auto-refresh-note{display:block;margin-top:8px;color:var(--muted);font-size:.78rem}.config-hint{border:1px dashed var(--line);border-radius:8px;padding:12px;background:#fbfcf8}.config-hint code{display:block;margin-top:8px;padding:8px;border-radius:6px;background:#eef3ef;color:var(--ink);white-space:normal}.item a{color:inherit;text-decoration:none}.item button{align-self:start}form>[type="submit"]{grid-column:1/-1;justify-self:start;min-width:130px}@media(max-width:900px){form{grid-template-columns:repeat(2,minmax(0,1fr))}.wide{grid-column:1/-1}}@media(max-width:760px){.hero,.grid,form{grid-template-columns:1fr}.wide{grid-column:auto}.nav{align-items:flex-start;flex-direction:column}}
  </style>
  ${clientId ? '<script src="https://accounts.google.com/gsi/client" async defer></script>' : ''}
</head>
<body>
<main>
  <nav class="nav"><a href="/">返回首頁</a><a href="/disclaimer">投資風險聲明</a><span>Google 帳號個人自選股</span></nav>
  <section class="hero">
    <article class="panel">
      <h1>自選股</h1>
      <p class="muted">任何 Google 帳號都可登入並建立自己的台股清單；每位使用者的資料分開保存，只能查看自己的清單。</p>
    </article>
    <aside class="panel login-box" id="login" data-auth></aside>
  </section>
  <section class="panel" style="margin-top:16px" data-app hidden>
    <h2>我的清單</h2>
    <form data-add-form action="/api/watchlist" method="post">
      <label class="wide">股票
        <input name="stock_query" data-stock-input list="stock-options" autocomplete="off" placeholder="輸入代號或名稱，例如 2330 / 台積電">
      </label>
      <datalist id="stock-options" data-stock-options></datalist>
      <label>股數
        <input name="quantity_shares" type="number" min="1" step="1" value="1000" inputmode="numeric">
      </label>
      <label>買入價
        <input name="buy_price" type="number" min="0" step="0.01" inputmode="decimal" placeholder="例如 780">
      </label>
      <label>買入日期
        <input name="buy_date" type="date">
      </label>
      <label>賣出價
        <input name="sell_price" type="number" min="0" step="0.01" inputmode="decimal" placeholder="可空白">
      </label>
      <label>賣出日期
        <input name="sell_date" type="date">
      </label>
      <label>手續費
        <input name="fee_amount" type="number" min="0" step="1" inputmode="decimal" placeholder="總額">
      </label>
      <label>稅費
        <input name="tax_amount" type="number" min="0" step="1" inputmode="decimal" placeholder="總額">
      </label>
      <label class="wide">備註
        <input name="note" autocomplete="off" placeholder="例如 CoWoS / 長線觀察">
      </label>
      <button type="submit" data-submit-watchlist>新增 / 更新</button>
      <small class="status form-status" data-form-status></small>
    </form>
    <small class="auto-refresh-note" data-profit-refresh-status>未賣出損益依最新收盤價計算，清單每 60 秒自動更新。</small>
    <div data-list></div>
  </section>
</main>
<script>
(() => {
  const CLIENT_ID = ${JSON.stringify(clientId)};
  const auth = document.querySelector("[data-auth]");
  const app = document.querySelector("[data-app]");
  const listRoot = document.querySelector("[data-list]");
  const form = document.querySelector("[data-add-form]");
  const submitButton = document.querySelector("[data-submit-watchlist]");
  const stockInput = document.querySelector("[data-stock-input]");
  const optionsRoot = document.querySelector("[data-stock-options]");
  const formStatus = document.querySelector("[data-form-status]");
  const profitRefreshStatus = document.querySelector("[data-profit-refresh-status]");
  const queryStatus = new URLSearchParams(window.location.search);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const n = (value) => value === null || value === undefined || value === "" ? "-" : Number(value).toLocaleString("zh-TW");
  const amount = (value) => {
    const numeric = Number(value || 0);
    if (!numeric) return "-";
    const abs = Math.abs(numeric);
    return abs >= 100000000 ? (numeric / 100000000).toFixed(1) + " 億元" : Math.round(numeric / 10000).toLocaleString("zh-TW") + " 萬元";
  };
  const twd = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const numeric = Number(value || 0);
    const prefix = numeric > 0 ? "+" : numeric < 0 ? "-" : "";
    return prefix + Math.abs(Math.round(numeric)).toLocaleString("zh-TW") + " 元";
  };
  const pct = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const numeric = Number(value || 0);
    const prefix = numeric > 0 ? "+" : "";
    return prefix + numeric.toFixed(2) + "%";
  };
  async function api(path, options = {}) {
    const response = await fetch(path, { credentials: "same-origin", ...options });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) throw new Error("登入已過期，請重新使用 Google 登入。");
      throw new Error(payload.error || "API " + response.status);
    }
    return payload.data;
  }
  function signedClass(value) {
    const numeric = Number(value || 0);
    return numeric > 0 ? "up" : numeric < 0 ? "down" : "";
  }
  function numberValue(formData, name) {
    const raw = String(formData.get(name) || "").trim();
    return raw === "" ? null : Number(raw);
  }
  function setFormStatus(message = "") {
    if (formStatus) formStatus.textContent = message;
  }
  function initialStatusMessage() {
    const status = queryStatus.get("status");
    const stock = queryStatus.get("stock") || "";
    const message = queryStatus.get("message") || "";
    if (status === "added") return "已新增 / 更新 " + stock + "，收益已重新計算。";
    if (status === "login_required") return "登入已過期，請重新使用 Google 登入。";
    if (message === "stock_not_found") return "找不到 " + stock + "，請確認股票代號是否正確。";
    if (message === "stock_code") return "請輸入股票代號或從搜尋建議選一檔股票。";
    return "";
  }
  function parseStockCode(value) {
    const text = String(value || "");
    for (let index = 0; index <= text.length - 4; index += 1) {
      const code = text.slice(index, index + 4);
      if ([...code].every((char) => char >= "0" && char <= "9")) return code;
    }
    return "";
  }
  let searchTimer = 0;
  async function searchStocks(keyword) {
    const clean = String(keyword || "").trim();
    if (!clean || clean.length < 1 || !optionsRoot) return;
    const items = await api("/api/stocks/suggest?q=" + encodeURIComponent(clean) + "&limit=12");
    optionsRoot.innerHTML = items.map((item) => '<option value="' + esc(item.stock_code + " " + item.stock_name) + '">' + esc([item.market_type, item.industry_name].filter(Boolean).join(" / ")) + '</option>').join("");
  }
  function renderLogin(message = "") {
    app.hidden = true;
    auth.innerHTML = CLIENT_ID
      ? '<h2>登入</h2><p class="muted">任何 Google 帳號皆可登入；登入後只會看到自己的自選股。</p><div id="google-button"></div><p class="status">' + esc(message) + '</p>'
      : '<h2>Google 登入</h2><button class="google-disabled" type="button" disabled>使用 Google 登入</button><div class="config-hint"><p class="muted">程式端已支援 Google 登入，但 Cloudflare Worker 還沒有 GOOGLE_CLIENT_ID，所以目前只能先顯示設定狀態。設定後這顆按鈕會變成真正的 Google 登入。</p><code>wrangler secret put GOOGLE_CLIENT_ID</code><p class="muted">Google OAuth 來源網域需加入 claw.terry878.org 與 twstock-research.eric24588.workers.dev。</p></div>';
    if (!CLIENT_ID) return;
    const init = () => {
      if (!window.google?.accounts?.id) return setTimeout(init, 120);
      google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (response) => {
          try {
            await api("/api/auth/google", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ credential: response.credential }) });
            await boot();
          } catch (error) {
            renderLogin(error.message);
          }
        },
      });
      google.accounts.id.renderButton(document.getElementById("google-button"), { theme: "outline", size: "large", text: "signin_with" });
    };
    init();
  }
  function renderUser(user) {
    auth.innerHTML = '<div class="user">' + (user.picture ? '<img src="' + esc(user.picture) + '" alt="">' : '') + '<div><strong>' + esc(user.name || user.email) + '</strong><small class="muted">' + esc(user.email) + '</small></div></div><button class="secondary" type="button" data-logout>登出</button>';
    auth.querySelector("[data-logout]").addEventListener("click", async () => { await api("/api/auth/logout", { method: "POST" }); renderLogin("已登出"); });
  }
  function renderList(items) {
    if (!items.length) {
      listRoot.innerHTML = '<div class="empty">尚未新增自選股</div>';
      return;
    }
    listRoot.innerHTML = '<div class="grid">' + items.map((item) => {
      const currentProfit = item.current_profit_amount === null || item.current_profit_amount === undefined
        ? '<span class="muted">未實現損益：填入買入價後計算</span>'
        : '<span>未實現損益（截至 ' + esc(item.trade_date || "-") + '）：<b class="' + signedClass(item.current_profit_amount) + '">' + esc(twd(item.current_profit_amount)) + ' / ' + esc(pct(item.current_profit_percent)) + '</b></span>';
      const sellProfit = item.sell_profit_amount === null || item.sell_profit_amount === undefined
        ? ''
        : '<span>已實現損益' + (item.sell_date ? '（' + esc(item.sell_date) + '）' : '') + '：<b class="' + signedClass(item.sell_profit_amount) + '">' + esc(twd(item.sell_profit_amount)) + ' / ' + esc(pct(item.sell_profit_percent)) + '</b></span>';
      const tradeMeta = '股數 ' + n(item.quantity_shares || 1000) + ' 股 / 買入 ' + n(item.buy_price) + (item.buy_date ? '（' + item.buy_date + '）' : '') + ' / 賣出 ' + n(item.sell_price) + (item.sell_date ? '（' + item.sell_date + '）' : '') + ' / 手續費 ' + twd(item.fee_amount || 0).replace("+", "") + ' / 稅費 ' + twd(item.tax_amount || 0).replace("+", "");
      const profitRows = sellProfit || currentProfit;
      const alertRows = (item.alerts || []).length ? '<div class="alert-list">' + item.alerts.map((alert) => '<b>' + esc(alert) + '</b>').join("") + '</div>' : '';
      return '<article class="item"><a href="/#stock-' + esc(item.stock_code) + '" data-code="' + esc(item.stock_code) + '"><strong>' + esc(item.stock_code + " " + (item.stock_name || "")) + '</strong><small>' + esc([item.market_type, item.industry_name, item.trade_date].filter(Boolean).join(" / ")) + '<br>收盤 ' + esc(n(item.close_price)) + ' / <span class="' + signedClass(item.change_percent) + '">' + esc(item.change_percent === null || item.change_percent === undefined ? "-" : n(item.change_percent) + "%") + '</span> / 成交金額 ' + esc(amount(item.turnover_value)) + '<span class="trade-meta">' + esc(tradeMeta) + '</span>' + (item.note ? '<br>備註：' + esc(item.note) : '') + '</small>' + alertRows + '<div class="profit-box">' + profitRows + '</div></a><button class="danger" type="button" data-delete="' + esc(item.stock_code) + '">刪除</button></article>';
    }).join("") + '</div>';
    listRoot.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", async () => {
      await api("/api/watchlist/" + encodeURIComponent(button.dataset.delete), { method: "DELETE" });
      await loadList();
    }));
  }
  async function loadList() {
    const items = await api("/api/watchlist");
    renderList(items);
    if (profitRefreshStatus) profitRefreshStatus.textContent = "未賣出損益依最新收盤價計算；最近更新：" + new Date().toLocaleTimeString("zh-TW", { hour12: false });
  }
  async function boot() {
    try {
      const user = await api("/api/auth/me");
      renderUser(user);
      app.hidden = false;
      await loadList();
    } catch (_) {
      renderLogin();
    }
  }
  async function submitWatchlist(event) {
    event?.preventDefault();
    if (submitButton?.disabled) return;
    const formData = new FormData(form);
    const stockRaw = String(formData.get("stock_query") || "").trim();
    const stock_code = parseStockCode(formData.get("stock_query"));
    const note = String(formData.get("note") || "").trim();
    const quantity_shares = numberValue(formData, "quantity_shares") || 1000;
    const buy_price = numberValue(formData, "buy_price");
    const buy_date = String(formData.get("buy_date") || "").trim() || null;
    const sell_price = numberValue(formData, "sell_price");
    const sell_date = String(formData.get("sell_date") || "").trim() || null;
    const fee_amount = numberValue(formData, "fee_amount") || 0;
    const tax_amount = numberValue(formData, "tax_amount") || 0;
    if (!stock_code) {
      setFormStatus(stockRaw ? "股票欄位目前是「" + stockRaw + "」，請輸入 4 碼股票代號，例如 2330 台積電。" : "請在股票欄位輸入 4 碼股票代號，例如 2330 台積電。");
      return;
    }
    if (quantity_shares <= 0) {
      setFormStatus("股數需要大於 0。");
      return;
    }
    if (buy_date && sell_date && sell_date < buy_date) {
      setFormStatus("賣出日期不能早於買入日期。");
      return;
    }
    if (submitButton) submitButton.disabled = true;
    setFormStatus("正在新增 / 更新 " + stock_code + "...");
    try {
      const items = await api("/api/watchlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stock_code, note, quantity_shares, buy_price, buy_date, sell_price, sell_date, fee_amount, tax_amount }),
      });
      form.reset();
      form.querySelector('[name="quantity_shares"]').value = "1000";
      optionsRoot.innerHTML = "";
      renderList(items || []);
      setFormStatus("已新增 / 更新 " + stock_code + "，收益已重新計算。");
      await loadList();
    } catch (error) {
      setFormStatus(error.message === "stock not found" ? "找不到這檔股票，請確認代號是否正確。" : error.message);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  }
  submitButton?.addEventListener("click", submitWatchlist);
  form.addEventListener("submit", submitWatchlist);
  window.setInterval(() => {
    if (!document.hidden && app && !app.hidden) loadList().catch(() => {});
  }, 60000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && app && !app.hidden) loadList().catch(() => {});
  });
  stockInput?.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => searchStocks(stockInput.value).catch(() => null), 180);
  });
  boot();
  const redirectedStatus = initialStatusMessage();
  if (redirectedStatus) {
    setFormStatus(redirectedStatus);
    history.replaceState(null, "", "/watchlist");
  }
})();
</script>
</body>
</html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

function watchlistLedgerHtml(env) {
  const clientId = env.GOOGLE_CLIENT_ID || "";
  return new Response(`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>交易帳本 | 台股產業鏈研究</title>
  ${PWA_HEAD}
  <link rel="stylesheet" href="/assets/app.css?v=${PERFORMANCE_ASSET_VERSION}">
  <script src="/assets/app.js?v=${PERFORMANCE_ASSET_VERSION}" defer></script>
  <style>
    :root{color-scheme:light;--bg:#f7f8f4;--ink:#0d1b2a;--muted:#5d6b7a;--line:#d9dfd7;--green:#0b7f5f;--red:#df4b3f;--card:#fff;--blue:#286da8}
    *{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif}main{width:min(1160px,calc(100% - 32px));margin:0 auto;padding:24px 0 48px}
    .nav{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:18px}.nav a{color:var(--green);font-weight:800;text-decoration:none}.hero{display:grid;grid-template-columns:1.1fr .9fr;gap:16px}.panel{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:18px}h1,h2,h3{margin:0 0 10px}p{margin:0}.muted{color:var(--muted);line-height:1.65}.login-box{display:grid;gap:12px;align-content:start}.user{display:flex;align-items:center;gap:10px}.user img{width:42px;height:42px;border-radius:50%;background:#eef2ee}
    .watchlist-ledger .nav{overflow:visible;padding:0}.watchlist-ledger .hero{align-items:stretch;padding:0}.watchlist-ledger .hero h1{max-width:none;font-size:clamp(1.7rem,3vw,2.4rem);line-height:1.15;word-break:keep-all;overflow-wrap:normal}
    .trade-tabs{display:flex;gap:8px;margin:14px 0 4px}.trade-tabs button{min-width:110px;border:1px solid var(--line);background:#fff;color:var(--ink)}.trade-tabs button.active[data-side="buy"]{border-color:var(--red);background:var(--red);color:#fff}.trade-tabs button.active[data-side="sell"]{border-color:var(--green);background:var(--green);color:#fff}
    form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0}label{display:grid;gap:5px;min-width:0;color:var(--muted);font-size:.78rem;font-weight:900}.wide{grid-column:span 2}input,select{width:100%;min-width:0;border:1px solid var(--line);border-radius:8px;padding:10px 12px;font:inherit;background:#fff}button{border:0;border-radius:8px;background:var(--green);color:#fff;font-weight:800;padding:10px 14px;cursor:pointer}button.secondary{background:#eef3ef;color:var(--ink)}button.danger{background:#f7e7e4;color:#9d2f26}button:disabled{cursor:not-allowed;opacity:.55}.form-status{grid-column:1/-1;min-height:20px;color:var(--muted)}form>[type="submit"]{grid-column:1/-1;justify-self:start;min-width:150px}.cost-preview{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px;border:1px dashed var(--line);border-radius:8px;padding:10px;background:#fbfcf8}.cost-preview b{border-radius:999px;padding:4px 8px;background:#eef3ef;font-size:.78rem}.fee-help{margin:8px 0 18px;border:1px solid var(--line);border-radius:8px;padding:10px 12px;background:#fbfcf8}.fee-help summary{cursor:pointer;color:var(--green);font-weight:900}.fee-help p{margin-top:8px;color:var(--muted);line-height:1.65}.fee-help a{color:var(--blue)}
    .summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}.summary-card{border:1px solid var(--line);border-radius:8px;padding:12px;background:#fff}.summary-card span,.summary-card small{display:block;color:var(--muted);font-size:.76rem}.summary-card strong{display:block;margin:5px 0;font-size:1.1rem}.up{color:var(--red)!important}.down{color:var(--green)!important}
    .position-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.position{display:block;border:1px solid var(--line);border-radius:8px;padding:14px;background:#fff}.position a{display:block;color:inherit;text-decoration:none}.position small{display:block;color:var(--muted);line-height:1.55}.profit-box{display:grid;gap:4px;margin-top:8px;border-top:1px solid var(--line);padding-top:8px}.alert-list{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.alert-list b{border:1px solid rgba(11,127,95,.24);border-radius:999px;padding:3px 7px;background:rgba(11,127,95,.08);color:var(--green);font-size:.74rem}.empty{border:1px dashed var(--line);border-radius:8px;padding:24px;text-align:center;color:var(--muted)}
    .history{display:grid;gap:10px;margin-top:10px}.stock-ledger{border:1px solid var(--line);border-radius:8px;background:#fff;overflow:hidden}.stock-ledger>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px;cursor:pointer;list-style:none}.stock-ledger>summary::-webkit-details-marker{display:none}.stock-ledger>summary::after{content:"展開";flex:none;border:1px solid var(--line);border-radius:999px;padding:3px 8px;color:var(--green);font-size:.72rem;font-weight:900}.stock-ledger[open]>summary::after{content:"收合"}.ledger-title{display:grid;gap:3px;min-width:0}.ledger-title strong{font-size:1rem}.ledger-title small,.ledger-meta{color:var(--muted);font-size:.76rem}.ledger-meta{text-align:right;line-height:1.5}.ledger-transactions{display:grid;gap:8px;padding:0 12px 12px;border-top:1px solid var(--line)}.transaction{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:start;border:1px solid var(--line);border-radius:8px;padding:11px;background:#fff}.ledger-transactions .transaction:first-child{margin-top:12px}.side-chip{display:inline-flex;border-radius:999px;padding:4px 8px;color:#fff;font-size:.76rem;font-weight:900}.side-buy{background:var(--red)}.side-sell{background:var(--green)}.transaction strong,.transaction small{display:block}.transaction small{margin-top:3px;color:var(--muted);line-height:1.5}.auto-refresh-note{display:block;margin:8px 0 14px;color:var(--muted);font-size:.78rem}.config-hint{border:1px dashed var(--line);border-radius:8px;padding:12px;background:#fbfcf8}.config-hint code{display:block;margin-top:8px;padding:8px;border-radius:6px;background:#eef3ef}.google-disabled{width:100%;background:#eef3ef;color:var(--muted);cursor:not-allowed}.notification-settings{margin-bottom:18px;border:1px solid rgba(40,109,168,.22);border-radius:8px;padding:14px;background:rgba(40,109,168,.05)}.notification-settings h2{margin-bottom:5px}.notification-settings.notification-locked{border-color:var(--line);background:#f0f2f0;color:var(--muted)}.notification-settings.notification-locked .notification-option{background:#e8ebe8;cursor:not-allowed;opacity:.72}.notification-options{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.notification-option{display:flex;grid-template-columns:none;align-items:flex-start;gap:8px;min-width:190px;border:1px solid var(--line);border-radius:8px;padding:10px;background:#fff;color:var(--ink);cursor:pointer}.notification-option input{width:18px;height:18px;margin:1px 0 0;accent-color:var(--green)}.notification-option span{display:grid;gap:2px}.notification-option small{color:var(--muted);font-weight:700;line-height:1.4}.notification-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px}.notification-status{color:var(--muted);font-size:.8rem;font-weight:800}.notification-admin{margin:12px 0 20px;border:1px solid rgba(11,127,95,.25);border-radius:8px;padding:14px;background:#f7fbf8}.notification-admin-create{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin:10px 0}.notification-admin-list{display:grid;gap:8px}.notification-recipient{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;border:1px solid var(--line);border-radius:8px;padding:11px;background:#fff}.notification-recipient strong,.notification-recipient small{display:block}.notification-recipient small{color:var(--muted);line-height:1.45}.verification-badge{display:inline-flex;margin-left:7px;border-radius:999px;padding:2px 7px;font-size:.7rem;font-weight:900;vertical-align:middle}.verification-badge.verified{background:#e6f5ef;color:var(--green)}.verification-badge.pending{background:#fff3d6;color:#8a5b00}.verification-badge.error{background:#fde9e7;color:#a5332a}.notification-recipient-slots{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.notification-recipient-slots label{display:flex;align-items:center;gap:4px;color:var(--ink)}.notification-recipient-slots input{width:16px;height:16px}.notification-recipient-actions{display:flex;flex-wrap:wrap;align-items:center;gap:6px}.notification-recipient-actions .danger{padding:8px 10px}
    @media(max-width:900px){form{grid-template-columns:repeat(2,minmax(0,1fr))}.wide{grid-column:1/-1}.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.hero,.position-grid,form{grid-template-columns:1fr}.wide{grid-column:auto}.nav{align-items:flex-start;flex-direction:column}.summary-grid{grid-template-columns:1fr 1fr}.transaction{grid-template-columns:auto minmax(0,1fr)}.transaction .danger{grid-column:1/-1}.trade-tabs button{flex:1;min-width:0}.stock-ledger>summary{align-items:flex-start}.ledger-meta{text-align:left}.stock-ledger>summary::after{margin-left:auto}.notification-admin-create,.notification-recipient{grid-template-columns:1fr}.notification-recipient-actions{justify-content:flex-start}}@media(max-width:430px){.summary-grid{grid-template-columns:1fr}.stock-ledger>summary{display:grid;grid-template-columns:minmax(0,1fr) auto}.ledger-meta{grid-column:1/-1}}
  </style>
  ${clientId ? '<script src="https://accounts.google.com/gsi/client" async defer></script>' : ''}
</head>
<body class="watchlist-ledger"><main>
  <nav class="nav"><a href="/">返回首頁</a><a href="/guide">使用教學</a><a href="/disclaimer">投資風險聲明</a><button class="install-app" type="button" data-install-app hidden>下載 APP</button><span>Google 帳號個人交易帳本</span></nav>
  <section class="hero">
    <article class="panel"><h1>自選股與交易帳本</h1><p class="muted">買入、賣出分筆保存；依加權平均成本自動計算庫存、已實現與未實現損益。</p></article>
    <aside class="panel login-box" data-auth></aside>
  </section>
  <section class="panel" style="margin-top:16px" data-app hidden>
    <div class="notification-settings" data-notification-settings>
      <h2>更新 Email 提醒</h2>
      <p class="muted">寄送到 Google 登入信箱；可複選時段。郵件會列出本次更新內容、主要變動及失敗來源。</p>
      <div class="notification-options">
        <label class="notification-option"><input type="checkbox" data-notify-slot="notify_0800"><span><strong>08:00</strong><small>各國股市、台指夜盤</small></span></label>
        <label class="notification-option"><input type="checkbox" data-notify-slot="notify_1000"><span><strong>10:00</strong><small>營收、指數、除權息</small></span></label>
        <label class="notification-option"><input type="checkbox" data-notify-slot="notify_1800"><span><strong>18:00</strong><small>行情、估值、法人與評分</small></span></label>
      </div>
      <div class="notification-actions"><button type="button" data-save-notifications>儲存提醒設定</button><span class="notification-status" data-notification-status role="status" aria-live="polite"></span></div>
    </div>
    <div class="notification-admin" data-notification-admin hidden>
      <h2>特定收件人管理</h2>
      <p class="muted">僅提醒管理員可見。每個新 Email 都會先收到 Cloudflare 驗證信；完成驗證並使用 Google 登入後，才能啟用提醒時段。</p>
      <div class="notification-admin-create"><input type="email" data-notification-admin-email placeholder="輸入要開放提醒的 Email"><button type="button" data-notification-admin-add>新增 Email</button></div>
      <div class="notification-admin-list" data-notification-admin-list></div>
      <span class="notification-status" data-notification-admin-status role="status" aria-live="polite"></span>
    </div>
    <h2>新增交易</h2>
    <div class="trade-tabs" role="tablist" aria-label="交易方向"><button type="button" class="active" data-side="buy">買入</button><button type="button" data-side="sell">賣出</button></div>
    <form data-trade-form>
      <input type="hidden" name="side" value="buy">
      <label class="wide">股票<input name="stock_query" data-stock-input list="stock-options" autocomplete="off" placeholder="輸入代號或名稱，例如 2330 / 台積電"></label>
      <datalist id="stock-options" data-stock-options></datalist>
      <label>數量<input name="quantity_value" type="number" min="1" step="1" value="1000" inputmode="numeric"></label>
      <label>數量單位<select name="quantity_unit"><option value="shares">股</option><option value="lots">張（1 張＝1,000 股）</option></select></label>
      <label><span data-price-label>買入價</span><input name="price" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="例如 780"></label>
      <label>交易日期<input name="trade_date" type="date"></label>
      <label>交易模式<select name="transaction_mode"><option value="cash">現股</option><option value="day_long">當沖做多</option><option value="day_short">當沖看空（先賣）</option><option value="margin_long">融資</option><option value="short_sell">融券</option></select></label>
      <label>手續費方案<select name="fee_preset"><option value="standard">標準 0.1425%</option><option value="discount60">6 折 0.0855%</option><option value="discount28">28 折 0.0399%</option><option value="custom">自訂費率</option><option value="manual_amount">手動輸入手續費</option></select></label>
      <label data-custom-fee hidden>自訂手續費率（%）<input name="fee_rate_percent" type="number" min="0" max="5" step="0.0001" value="0.1425"></label>
      <label>最低手續費（元）<input name="minimum_fee" type="number" min="0" step="1" value="20"></label>
      <label data-manual-fee hidden>手動手續費（元）<input name="manual_fee_amount" type="number" min="0" step="1" placeholder="依券商成交單填入"></label>
      <label data-tax-field>賣出稅率／稅費<select name="tax_preset"><option value="auto">依商品自動</option><option value="stock">普通股票 0.3%</option><option value="day_trade_stock">合格現股當沖 0.15%</option><option value="etf_etn">ETF／ETN／TDR 0.1%</option><option value="bond_etf">債券 ETF 0%</option><option value="custom">自訂稅率</option><option value="manual_amount">手動輸入稅費</option></select></label>
      <label data-custom-tax hidden>自訂稅率（%）<input name="tax_rate_percent" type="number" min="0" max="5" step="0.0001" value="0.3"></label>
      <label data-manual-tax hidden>手動稅費（元）<input name="manual_tax_amount" type="number" min="0" step="1" placeholder="依券商成交單填入"></label>
      <label class="wide">備註<input name="note" autocomplete="off" placeholder="例如 CoWoS / 分批買入"></label>
      <div class="cost-preview" data-cost-preview></div>
      <button type="submit" data-submit>記錄買入</button>
      <small class="form-status" data-form-status></small>
    </form>
    <details class="fee-help"><summary>費率怎麼算？</summary><p>手續費＝成交金額 × 券商費率，買賣都收；券商可自行訂價，0.1425% 是常見上限，最低手續費依券商而異。證交稅只在賣出收：普通股票 0.3%、合格現股當沖 0.15%、ETF／ETN 等 0.1%；債券 ETF 免稅期限與商品資格仍應以成交單為準。實際費用若不同，可用手填欄覆蓋。參考：<a href="https://www.twse.com.tw/zh/about/company/guide.html" target="_blank" rel="noopener">TWSE 投資指南</a>、<a href="https://www.etax.nat.gov.tw/etwmain/tax-info/understanding/tax-q-and-a/national/securities-transaction-tax/filing/mM8n39b" target="_blank" rel="noopener">財政部證交稅說明</a>。</p></details>
    <h2>損益總覽</h2><div class="summary-grid" data-summary></div>
    <small class="auto-refresh-note" data-refresh-status>依最新收盤價估算未實現損益，每 60 秒更新。</small>
    <h2>持倉與損益</h2><div data-positions></div>
    <h2 style="margin-top:20px">買賣歷史</h2><div class="history" data-history></div>
  </section>
</main>
<div class="stock-backdrop" data-stock-backdrop></div>
<aside class="stock-drawer" data-stock-drawer aria-hidden="true">
  <header class="drawer-head"><div><p class="eyebrow">Stock Detail</p><h2 data-stock-drawer-title>個股資訊</h2><small class="muted" data-stock-drawer-subtitle>點選持倉查看日線、月線與法人指標</small></div><button type="button" data-stock-close aria-label="關閉">×</button></header>
  <div class="drawer-body" data-stock-drawer-body></div>
</aside>
<script>
(() => {
  const CLIENT_ID = ${JSON.stringify(clientId)};
  const auth = document.querySelector("[data-auth]");
  const app = document.querySelector("[data-app]");
  const form = document.querySelector("[data-trade-form]");
  const submit = document.querySelector("[data-submit]");
  const positionsRoot = document.querySelector("[data-positions]");
  const historyRoot = document.querySelector("[data-history]");
  const summaryRoot = document.querySelector("[data-summary]");
  const stockInput = document.querySelector("[data-stock-input]");
  const optionsRoot = document.querySelector("[data-stock-options]");
  const status = document.querySelector("[data-form-status]");
  const refreshStatus = document.querySelector("[data-refresh-status]");
  const notificationSettings = document.querySelector("[data-notification-settings]");
  const notificationStatus = document.querySelector("[data-notification-status]");
  const notificationSave = document.querySelector("[data-save-notifications]");
  const notificationSlots = Array.from(document.querySelectorAll("[data-notify-slot]"));
  const notificationAdmin = document.querySelector("[data-notification-admin]");
  const notificationAdminEmail = document.querySelector("[data-notification-admin-email]");
  const notificationAdminAdd = document.querySelector("[data-notification-admin-add]");
  const notificationAdminList = document.querySelector("[data-notification-admin-list]");
  const notificationAdminStatus = document.querySelector("[data-notification-admin-status]");
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const number = (value, digits = 2) => value === null || value === undefined || value === "" ? "-" : Number(value).toLocaleString("zh-TW", { maximumFractionDigits: digits });
  const twd = (value) => value === null || value === undefined ? "-" : (Number(value) > 0 ? "+" : Number(value) < 0 ? "-" : "") + Math.abs(Math.round(Number(value))).toLocaleString("zh-TW") + " 元";
  const pct = (value) => value === null || value === undefined ? "-" : (Number(value) > 0 ? "+" : "") + Number(value).toFixed(2) + "%";
  const tone = (value) => Number(value || 0) > 0 ? "up" : Number(value || 0) < 0 ? "down" : "";
  const modeLabel = (value) => ({cash:"現股",day_long:"當沖做多",day_short:"當沖看空",margin_long:"融資",short_sell:"融券"}[value] || "現股");
  const shortMode = () => ["day_short","short_sell"].includes(form.elements.transaction_mode.value);
  const quantityShares = () => Math.max(0, Number(form.elements.quantity_value.value || 0)) * (form.elements.quantity_unit.value === "lots" ? 1000 : 1);
  const quantityLabel = (item) => item.quantity_unit === "lots"
    ? number(Number(item.quantity_shares || 0) / 1000, 3) + " 張（" + number(item.quantity_shares,0) + " 股）"
    : number(item.quantity_shares,0) + " 股";
  const stockCode = (value) => (String(value || "").match(/\\d{4}/) || [""])[0];
  const optional = (input) => input && input.value !== "" ? Number(input.value) : null;
  const roundMoney = (value) => Math.floor(Number(value || 0) + 0.500000001);
  async function api(path, options = {}) {
    const response = await fetch(path, { credentials:"same-origin", ...options });
    const parsed = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) throw new Error("登入已過期，請重新使用 Google 登入。");
      throw new Error(parsed.error || "API " + response.status);
    }
    return parsed.data;
  }
  function renderLogin(message = "") {
    app.hidden = true;
    auth.innerHTML = CLIENT_ID
      ? '<h2>登入</h2><p class="muted">登入後只會看到自己的交易紀錄。</p><div id="google-button"></div><p class="muted">' + esc(message) + '</p>'
      : '<h2>Google 登入</h2><button class="google-disabled" disabled>使用 Google 登入</button><div class="config-hint"><p class="muted">尚未設定 GOOGLE_CLIENT_ID。</p><code>wrangler secret put GOOGLE_CLIENT_ID</code></div>';
    if (!CLIENT_ID) return;
    const init = () => {
      if (!window.google?.accounts?.id) return setTimeout(init, 120);
      google.accounts.id.initialize({ client_id:CLIENT_ID, callback:async(response) => {
        try { await api("/api/auth/google", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({credential:response.credential})}); await boot(); }
        catch (error) { renderLogin(error.message); }
      }});
      google.accounts.id.renderButton(document.getElementById("google-button"), {theme:"outline",size:"large",text:"signin_with"});
    };
    init();
  }
  function renderUser(user) {
    auth.innerHTML = '<div class="user">' + (user.picture ? '<img src="' + esc(user.picture) + '" alt="">' : "") + '<div><strong>' + esc(user.name || user.email) + '</strong><small class="muted">' + esc(user.email) + '</small></div></div><button class="secondary" data-logout>登出</button>';
    auth.querySelector("[data-logout]").addEventListener("click", async() => { await api("/api/auth/logout",{method:"POST"}); renderLogin("已登出"); });
  }
  function summaryCard(label, value, note, valueTone = "") {
    return '<article class="summary-card"><span>' + esc(label) + '</span><strong class="' + valueTone + '">' + esc(value) + '</strong><small>' + esc(note) + '</small></article>';
  }
  function renderPortfolio(data) {
    const summary = data.summary || {};
    summaryRoot.innerHTML =
      summaryCard("持倉成本", twd(summary.remaining_cost).replace("+",""), "含買入手續費") +
      summaryCard("目前市值", twd(summary.market_value).replace("+",""), "依最新收盤價") +
      summaryCard("未實現損益", twd(summary.unrealized_profit_amount), "已估賣出費用", tone(summary.unrealized_profit_amount)) +
      summaryCard("已實現損益", twd(summary.realized_profit_amount), "依加權平均成本", tone(summary.realized_profit_amount)) +
      summaryCard("總損益", twd(summary.total_profit_amount), "已實現＋未實現", tone(summary.total_profit_amount)) +
      summaryCard("累計手續費", twd(summary.total_fee_amount).replace("+",""), "買賣合計") +
      summaryCard("累計證交稅", twd(summary.total_tax_amount).replace("+",""), "僅賣出") +
      summaryCard("交易筆數", number((data.transactions || []).length, 0), "每筆獨立保存");
    const positions = data.positions || [];
    positionsRoot.innerHTML = positions.length ? '<div class="position-grid">' + positions.map((item) => {
      const alerts = (item.alerts || []).length ? '<div class="alert-list">' + item.alerts.map((text) => '<b>' + esc(text) + '</b>').join("") + "</div>" : "";
      const positionText = Number(item.short_quantity_shares || 0) > 0
        ? '多單 ' + number(item.long_quantity_shares || 0,0) + ' 股 / 空單 ' + number(item.short_quantity_shares || 0,0) + ' 股 / 空單均價 ' + number(item.short_average_price)
        : '庫存 ' + number(item.long_quantity_shares ?? item.position_quantity_shares,0) + ' 股 / 均價 ' + number(item.average_cost);
      return '<article class="position"><a href="#stock-' + esc(item.stock_code) + '" data-stock-code="' + esc(item.stock_code) + '"><strong>' + esc(item.stock_code + " " + (item.stock_name || "")) + '</strong><small>' + esc([item.market_type,item.industry_name].filter(Boolean).join(" / ")) + '<br>' + positionText + ' / 收盤 ' + number(item.close_price) + '<br>成本 ' + twd(item.remaining_cost).replace("+","") + ' / 淨部位市值 ' + twd(item.market_value).replace("+","") + '</small>' + alerts + '<div class="profit-box"><span>未實現：<b class="' + tone(item.unrealized_profit_amount) + '">' + esc(twd(item.unrealized_profit_amount) + " / " + pct(item.unrealized_profit_percent)) + '</b></span><span>已實現：<b class="' + tone(item.realized_profit_amount) + '">' + esc(twd(item.realized_profit_amount) + " / " + pct(item.realized_profit_percent)) + '</b></span><span>總損益：<b class="' + tone(item.total_profit_amount) + '">' + esc(twd(item.total_profit_amount)) + '</b></span><small>累計手續費 ' + twd(item.total_fee_amount).replace("+","") + ' / 稅費 ' + twd(item.total_tax_amount).replace("+","") + '</small></div></a></article>';
    }).join("") + "</div>" : '<div class="empty">尚無持倉；先記錄一筆買入交易。</div>';
    const history = data.transactions || [];
    const positionsByCode = new Map(positions.map((item) => [String(item.stock_code), item]));
    const ledgerByCode = new Map();
    history.forEach((item) => {
      const code = String(item.stock_code || "");
      if (!ledgerByCode.has(code)) ledgerByCode.set(code, []);
      ledgerByCode.get(code).push(item);
    });
    const ledgers = [...ledgerByCode.entries()].map(([code, rows]) => {
      const buys = rows.filter((item) => item.side === "buy");
      const openingRows = rows.filter((item) =>
        (["day_short","short_sell"].includes(item.transaction_mode) && item.side === "sell") ||
        (!["day_short","short_sell"].includes(item.transaction_mode) && item.side === "buy")
      );
      if (!openingRows.length) return null;
      const latestBuy = [...openingRows].sort((a, b) =>
        Number(b.id || 0) - Number(a.id || 0) || String(b.created_at || "").localeCompare(String(a.created_at || ""))
      )[0];
      const totalBuyShares = openingRows.reduce((total, item) => total + Number(item.quantity_shares || 0), 0);
      const totalBuyAmount = openingRows.reduce((total, item) => {
        const gross = Number(item.gross_amount || 0);
        return total + (["day_short","short_sell"].includes(item.transaction_mode)
          ? gross - Number(item.fee_amount || 0) - Number(item.tax_amount || 0)
          : gross + Number(item.fee_amount || 0));
      }, 0);
      return {
        code,
        rows,
        latestBuy,
        averageBuyCost: totalBuyShares ? totalBuyAmount / totalBuyShares : null,
        position: positionsByCode.get(code) || {},
      };
    }).filter(Boolean).sort((a, b) =>
      Number(b.latestBuy.id || 0) - Number(a.latestBuy.id || 0) || String(b.latestBuy.created_at || "").localeCompare(String(a.latestBuy.created_at || ""))
    );
    historyRoot.innerHTML = ledgers.length ? ledgers.map((ledger, index) => {
      const latestBuyLabel = ledger.latestBuy.trade_date || "-";
      const item = ledger.latestBuy;
      const transactions = ledger.rows.map((row) => {
        const net = row.side === "buy" ? -(Number(row.gross_amount || 0) + Number(row.fee_amount || 0)) : Number(row.gross_amount || 0) - Number(row.fee_amount || 0) - Number(row.tax_amount || 0);
        const isShort = ["day_short","short_sell"].includes(row.transaction_mode);
        const actionLabel = isShort ? (row.side === "sell" ? "放空" : "回補") : (row.side === "buy" ? "買入" : "賣出");
        return '<article class="transaction"><b class="side-chip side-' + esc(row.side) + '">' + actionLabel + '</b><div><strong>' + esc(row.trade_date + " · " + modeLabel(row.transaction_mode)) + '</strong><small>' + quantityLabel(row) + ' × ' + number(row.price) + '＝' + twd(row.gross_amount).replace("+","") + '<br>手續費 ' + twd(row.fee_amount).replace("+","") + ' / 稅費 ' + twd(row.tax_amount).replace("+","") + ' / 淨現金流 <b class="' + tone(net) + '">' + twd(net) + '</b><br>' + esc(row.fee_preset || "-") + ' / 稅率 ' + number(row.tax_rate_percent,4) + '%' + (row.note ? " / " + esc(row.note) : "") + '</small></div><button class="danger" data-delete-transaction="' + Number(row.id) + '">刪除此筆</button></article>';
      }).join("");
      const shortLedger = ["day_short","short_sell"].includes(ledger.latestBuy.transaction_mode);
      const positionLabel = Number(ledger.position.short_quantity_shares || 0) > 0
        ? "空單 " + number(ledger.position.short_quantity_shares,0) + " 股"
        : "庫存 " + number(ledger.position.long_quantity_shares ?? ledger.position.position_quantity_shares,0) + " 股";
      return '<details class="stock-ledger"' + (index === 0 ? " open" : "") + '><summary><span class="ledger-title"><strong>' + esc(ledger.code + " " + (item.stock_name || "")) + '</strong><small>' + esc([item.market_type,item.instrument_type].filter(Boolean).join(" / ")) + '</small></span><span class="ledger-meta">最近' + (shortLedger ? "放空" : "買入") + '／加碼 ' + esc(latestBuyLabel) + '<br>加權開倉均價 ' + number(ledger.averageBuyCost) + ' · ' + positionLabel + '<br>總損益 <b class="' + tone(ledger.position.total_profit_amount) + '">' + esc(twd(ledger.position.total_profit_amount || 0)) + '</b> · ' + number(ledger.rows.length,0) + ' 筆交易</span></summary><div class="ledger-transactions">' + transactions + "</div></details>";
    }).join("") : '<div class="empty">尚無買入紀錄。</div>';
  }
  function setSide(side) {
    form.elements.side.value = side;
    const isShort = shortMode();
    document.querySelectorAll("[data-side]").forEach((button) => button.classList.toggle("active", button.dataset.side === side));
    document.querySelector('[data-side="buy"]').textContent = isShort ? "買回／回補" : "買入";
    document.querySelector('[data-side="sell"]').textContent = isShort ? "先賣／放空" : "賣出";
    document.querySelector("[data-price-label]").textContent = isShort
      ? (side === "buy" ? "回補價" : "放空價")
      : (side === "buy" ? "買入價" : "賣出價");
    submit.textContent = isShort
      ? (side === "buy" ? "記錄回補" : "記錄放空")
      : (side === "buy" ? "記錄買入" : "記錄賣出");
    form.querySelectorAll("[data-tax-field]").forEach((field) => field.hidden = side === "buy");
    if (side === "buy") {
      document.querySelector("[data-custom-tax]").hidden = true;
      document.querySelector("[data-manual-tax]").hidden = true;
    }
    else updateCustomFields();
    updatePreview();
  }
  function updateModeUI(resetSide = false) {
    const mode = form.elements.transaction_mode.value;
    if (resetSide) setSide(["day_short","short_sell"].includes(mode) ? "sell" : "buy");
    if (["day_long","day_short"].includes(mode) && form.elements.tax_preset.value === "auto") {
      form.elements.tax_preset.value = "day_trade_stock";
    } else if (!["day_long","day_short"].includes(mode) && form.elements.tax_preset.value === "day_trade_stock") {
      form.elements.tax_preset.value = "auto";
    }
    updateCustomFields();
    updatePreview();
  }
  function updateCustomFields() {
    document.querySelector("[data-custom-fee]").hidden = form.elements.fee_preset.value !== "custom";
    const usesManualFee = form.elements.fee_preset.value === "manual_amount";
    document.querySelector("[data-manual-fee]").hidden = !usesManualFee;
    form.elements.manual_fee_amount.required = usesManualFee;
    if (!usesManualFee) form.elements.manual_fee_amount.value = "";
    document.querySelector("[data-custom-tax]").hidden = form.elements.side.value === "buy" || form.elements.tax_preset.value !== "custom";
    const usesManualTax = form.elements.side.value === "sell" && form.elements.tax_preset.value === "manual_amount";
    document.querySelector("[data-manual-tax]").hidden = !usesManualTax;
    form.elements.manual_tax_amount.required = usesManualTax;
    if (!usesManualTax) form.elements.manual_tax_amount.value = "";
  }
  function updatePreview() {
    const quantity = quantityShares();
    const price = Math.max(0, Number(form.elements.price.value || 0));
    const gross = quantity * price;
    const rates = {standard:0.1425,discount60:0.0855,discount28:0.0399};
    const feePreset = form.elements.fee_preset.value;
    const feeRate = feePreset === "custom" ? Number(form.elements.fee_rate_percent.value || 0) : rates[feePreset] || 0;
    const manualFee = feePreset === "manual_amount" ? optional(form.elements.manual_fee_amount) : null;
    const fee = feePreset === "manual_amount" ? Number(manualFee || 0) : Math.max(Number(form.elements.minimum_fee.value || 0), roundMoney(gross * feeRate / 100));
    const taxRates = {stock:0.3,day_trade_stock:0.15,etf_etn:0.1,bond_etf:0,auto:0.3};
    const taxPreset = form.elements.tax_preset.value;
    const taxRate = taxPreset === "custom" ? Number(form.elements.tax_rate_percent.value || 0) : taxRates[taxPreset] || 0;
    const manualTax = taxPreset === "manual_amount" ? optional(form.elements.manual_tax_amount) : null;
    const tax = form.elements.side.value === "buy" ? 0 : taxPreset === "manual_amount" ? Number(manualTax || 0) : roundMoney(gross * taxRate / 100);
    const net = form.elements.side.value === "buy" ? gross + fee : gross - fee - tax;
    document.querySelector("[data-cost-preview]").innerHTML = '<b>成交金額 ' + esc(twd(gross).replace("+","")) + '</b><b>手續費 ' + esc(twd(fee).replace("+","")) + '</b><b>稅費 ' + esc(twd(tax).replace("+","")) + '</b><b>' + (form.elements.side.value === "buy" ? "預估支出 " : "預估入帳 ") + esc(twd(net).replace("+","")) + "</b>";
  }
  let timer = null;
  async function searchStocks(keyword) {
    const clean = String(keyword || "").trim();
    if (!clean) return;
    const rows = await api("/api/stocks/suggest?q=" + encodeURIComponent(clean) + "&limit=12");
    optionsRoot.innerHTML = rows.map((item) => '<option value="' + esc(item.stock_code + " " + item.stock_name) + '">' + esc([item.market_type,item.industry_name].filter(Boolean).join(" / ")) + "</option>").join("");
  }
  async function loadPortfolio() {
    const data = await api("/api/watchlist");
    renderPortfolio(data);
    refreshStatus.textContent = "損益依最新收盤價估算；最近更新：" + new Date().toLocaleTimeString("zh-TW",{hour12:false});
  }
  async function loadNotificationPreferences() {
    const data = await api("/api/watchlist/notifications");
    notificationSlots.forEach((input) => { input.checked = Boolean(data[input.dataset.notifySlot]); });
    const canConfigure = Boolean(data.can_configure_notifications);
    notificationSettings.classList.toggle("notification-locked", !canConfigure);
    notificationSettings.setAttribute("aria-disabled", canConfigure ? "false" : "true");
    notificationSlots.forEach((input) => { input.disabled = !canConfigure; });
    notificationSave.disabled = !canConfigure;
    notificationStatus.textContent = !canConfigure
      ? "此 Google 帳號尚未獲得 Email 提醒權限，請聯絡提醒管理員。"
      : data.delivery_available
        ? "寄送信箱：" + data.email
        : "設定可先保存；Cloudflare Email Service 尚未完成寄件網域啟用。";
    notificationAdmin.hidden = !data.is_notification_admin;
    if (data.is_notification_admin) await loadNotificationRecipients();
  }
  async function saveNotificationPreferencesUI() {
    notificationSave.disabled = true;
    notificationStatus.textContent = "正在儲存...";
    const payload = Object.fromEntries(notificationSlots.map((input) => [input.dataset.notifySlot, input.checked]));
    try {
      const data = await api("/api/watchlist/notifications", { method:"PUT", headers:{"content-type":"application/json"}, body:JSON.stringify(payload) });
      notificationStatus.textContent = "已儲存；將寄到 " + data.email + (data.delivery_available ? "。" : "。寄信服務啟用後開始寄送。");
    } catch (error) {
      notificationStatus.textContent = error.message;
    } finally {
      notificationSave.disabled = false;
    }
  }
  function renderNotificationRecipients(rows) {
    const protectedEmails = new Set(["admin@example.invalid","member@example.invalid"]);
    notificationAdminList.innerHTML = rows.length ? rows.map((row) => {
      const email = String(row.email || "");
      const locked = protectedEmails.has(email.toLowerCase());
      const verificationStatus = ["verified","pending","error"].includes(row.verification_status) ? row.verification_status : "pending";
      const verificationLabel = verificationStatus === "verified" ? "已驗證" : verificationStatus === "error" ? "驗證失敗" : "待驗證";
      const ready = verificationStatus === "verified";
      const accountText = row.registered ? (row.name || "已登入帳號") : "尚未使用 Google 登入";
      const verificationText = ready ? accountText : accountText + "；請先點擊信中的驗證連結";
      return '<article class="notification-recipient" data-notification-recipient="' + esc(email) + '"><div><strong>' + esc(email) + '<span class="verification-badge ' + verificationStatus + '">' + verificationLabel + '</span></strong><small>' + esc(verificationText) + '</small>' + (row.registered ? '<div class="notification-recipient-slots"><label><input type="checkbox" data-recipient-slot="notify_0800"' + (row.notify_0800 ? " checked" : "") + (ready ? "" : " disabled") + '>08:00</label><label><input type="checkbox" data-recipient-slot="notify_1000"' + (row.notify_1000 ? " checked" : "") + (ready ? "" : " disabled") + '>10:00</label><label><input type="checkbox" data-recipient-slot="notify_1800"' + (row.notify_1800 ? " checked" : "") + (ready ? "" : " disabled") + '>18:00</label></div>' : "") + '</div><div class="notification-recipient-actions">' + (row.registered && ready ? '<button type="button" data-save-recipient>儲存此人提醒</button>' : "") + (locked ? "" : '<button type="button" class="danger" data-disable-recipient>停用</button>') + '</div></article>';
    }).join("") : '<div class="empty">目前沒有允許提醒的 Email。</div>';
  }
  async function loadNotificationRecipients() {
    const rows = await api("/api/watchlist/notification-recipients");
    renderNotificationRecipients(rows);
  }
  async function updateNotificationRecipient(payload) {
    const rows = await api("/api/watchlist/notification-recipients", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(payload) });
    renderNotificationRecipients(rows);
    return rows.find((row) => String(row.email || "").toLowerCase() === String(payload.email || "").toLowerCase()) || null;
  }
  async function boot() {
    try { const user = await api("/api/auth/me"); renderUser(user); app.hidden = false; await Promise.all([loadPortfolio(), loadNotificationPreferences()]); }
    catch (_) { renderLogin(); }
  }
  document.querySelectorAll("[data-side]").forEach((button) => button.addEventListener("click", () => setSide(button.dataset.side)));
  form.elements.transaction_mode.addEventListener("change", () => updateModeUI(true));
  form.elements.quantity_unit.addEventListener("change", () => {
    form.elements.quantity_value.value = form.elements.quantity_unit.value === "lots" ? "1" : "1000";
    updatePreview();
  });
  form.addEventListener("input", () => { updateCustomFields(); updatePreview(); });
  form.addEventListener("submit", async(event) => {
    event.preventDefault();
    const code = stockCode(form.elements.stock_query.value);
    if (!code) { status.textContent = "請輸入 4 碼股票代號。"; return; }
    if (!form.elements.trade_date.value) { status.textContent = "請選擇交易日期。"; return; }
    submit.disabled = true;
    status.textContent = "正在記錄交易...";
    const payload = {
      stock_code:code,
      side:form.elements.side.value,
      transaction_mode:form.elements.transaction_mode.value,
      quantity_value:Number(form.elements.quantity_value.value),
      quantity_unit:form.elements.quantity_unit.value,
      quantity_shares:quantityShares(),
      price:Number(form.elements.price.value),
      trade_date:form.elements.trade_date.value,
      fee_preset:form.elements.fee_preset.value,
      fee_rate_percent:optional(form.elements.fee_rate_percent),
      minimum_fee:Number(form.elements.minimum_fee.value || 0),
      manual_fee_amount:optional(form.elements.manual_fee_amount),
      tax_preset:form.elements.tax_preset.value,
      tax_rate_percent:optional(form.elements.tax_rate_percent),
      manual_tax_amount:optional(form.elements.manual_tax_amount),
      note:String(form.elements.note.value || "").trim(),
    };
    try {
      const data = await api("/api/watchlist/transactions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      renderPortfolio(data);
      const payloadShort = ["day_short","short_sell"].includes(payload.transaction_mode);
      const sideLabel = payloadShort ? (payload.side === "buy" ? "回補" : "放空") : (payload.side === "buy" ? "買入" : "賣出");
      form.reset();
      form.elements.stock_query.value = "";
      form.elements.quantity_value.value = "";
      form.elements.price.value = "";
      form.elements.note.value = "";
      form.elements.trade_date.value = new Date().toISOString().slice(0,10);
      updateModeUI(true);
      status.textContent = "已記錄 " + code + " " + sideLabel + "交易，損益已重算。";
    } catch(error) { status.textContent = error.message; }
    finally { submit.disabled = false; }
  });
  historyRoot.addEventListener("click", async(event) => {
    const button = event.target.closest("[data-delete-transaction]");
    if (!button) return;
    const data = await api("/api/watchlist/transactions/" + encodeURIComponent(button.dataset.deleteTransaction),{method:"DELETE"});
    renderPortfolio(data);
  });
  notificationSave.addEventListener("click", saveNotificationPreferencesUI);
  notificationAdminAdd.addEventListener("click", async() => {
    const email = notificationAdminEmail.value.trim();
    if (!email) { notificationAdminStatus.textContent = "請輸入 Email。"; return; }
    notificationAdminAdd.disabled = true;
    try {
      const recipient = await updateNotificationRecipient({email, enabled:true});
      notificationAdminEmail.value = "";
      notificationAdminStatus.textContent = recipient?.verification_email_sent
        ? "驗證信已寄到 " + email + "；對方點擊連結後才會啟用提醒。"
        : recipient?.verification_status === "verified"
          ? email + " 已完成驗證，可以設定提醒。"
          : email + " 已在 Cloudflare 待驗證清單中，請檢查收件匣或垃圾郵件。";
    } catch(error) {
      notificationAdminStatus.textContent = error.message;
    } finally {
      notificationAdminAdd.disabled = false;
    }
  });
  notificationAdminList.addEventListener("click", async(event) => {
    const item = event.target.closest("[data-notification-recipient]");
    if (!item) return;
    const email = item.dataset.notificationRecipient;
    if (event.target.closest("[data-save-recipient]")) {
      const payload = {email, enabled:true};
      item.querySelectorAll("[data-recipient-slot]").forEach((input) => { payload[input.dataset.recipientSlot] = input.checked; });
      try { await updateNotificationRecipient(payload); notificationAdminStatus.textContent = "已更新 " + email + " 的提醒時段。"; }
      catch(error) { notificationAdminStatus.textContent = error.message; }
    }
    if (event.target.closest("[data-disable-recipient]")) {
      try { await updateNotificationRecipient({email, enabled:false}); notificationAdminStatus.textContent = "已停用 " + email + "。"; }
      catch(error) { notificationAdminStatus.textContent = error.message; }
    }
  });
  stockInput.addEventListener("input",() => { clearTimeout(timer); timer = setTimeout(() => searchStocks(stockInput.value).catch(() => null),180); });
  form.elements.trade_date.value = new Date().toISOString().slice(0,10);
  setSide("buy");
  window.setInterval(() => { if (!document.hidden && !app.hidden) loadPortfolio().catch(() => null); },60000);
  boot();
})();
</script>
<script src="/assets/pwa.js?v=${PERFORMANCE_ASSET_VERSION}" defer></script>
</body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

function classificationAdminHtml() {
  return new Response(`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>分類審核 | 台股研究平台</title>
  <style>
    :root{--bg:#f6f7f2;--ink:#1d252b;--muted:#64727a;--line:#dce2dc;--green:#1f7a5a;--red:#d94a3a;--blue:#286da8}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif}
    main{width:min(1080px,calc(100% - 32px));margin:0 auto;padding:24px 0 48px}a{color:var(--green)}
    .panel,.item{border:1px solid var(--line);border-radius:9px;background:#fff;padding:14px}.panel{margin-bottom:14px}.login{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
    input,button{border:1px solid var(--line);border-radius:6px;padding:10px;font:inherit}button{cursor:pointer;font-weight:900}.load,.approve{background:var(--green);color:#fff}.reject{background:var(--red);color:#fff}
    .list{display:grid;gap:9px}.item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px}.item p{margin:5px 0;color:var(--muted)}.actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;min-width:230px}.actions input{grid-column:1/-1}.status{color:var(--muted)}
    @media(max-width:700px){.login,.item{grid-template-columns:1fr}.actions{min-width:0}}
  </style>
</head>
<body><main>
  <p><a href="/">← 回首頁</a></p>
  <section class="panel"><h1>分類修正後台</h1><p class="status">管理權杖只保留在目前頁面記憶體，不寫入網址或 localStorage。</p><form class="login" data-login><input data-token type="password" autocomplete="off" placeholder="ADMIN_SYNC_TOKEN"><button class="load">載入待審分類</button></form><p class="status" data-status>尚未載入。</p></section>
  <section class="list" data-list></section>
</main>
<script>
(() => {
  const form=document.querySelector("[data-login]"), token=document.querySelector("[data-token]"), root=document.querySelector("[data-list]"), status=document.querySelector("[data-status]");
  let rows=[];
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const headers=()=>({authorization:"Bearer "+token.value,"content-type":"application/json"});
  const render=()=>{root.innerHTML=rows.map((row)=>'<article class="item" data-key="'+esc(row.stock_code+":"+row.theme_id)+'"><div><strong>'+esc(row.stock_code+" "+row.stock_name+" → "+row.theme_name)+'</strong><p>'+esc(row.market_type+" / "+row.industry_name+" / 信心 "+row.confidence_score)+'</p><p>'+esc(row.reason||"尚無理由")+'</p></div><div class="actions"><input data-evidence placeholder="證據網址（建議填寫）" value="'+esc(row.evidence_url||"")+'"><button class="approve" data-decision="approved">核准</button><button class="reject" data-decision="rejected">駁回</button></div></article>').join("")||'<article class="panel">目前沒有待審分類。</article>';};
  async function load(){status.textContent="載入中...";const response=await fetch("/api/admin/classifications/pending",{headers:headers()});const parsed=await response.json();if(!response.ok)throw new Error(parsed.error||"載入失敗");rows=parsed.data||[];render();status.textContent="待審 "+rows.length+" 筆。";}
  form.addEventListener("submit",async(event)=>{event.preventDefault();try{await load();}catch(error){status.textContent=error.message;}});
  root.addEventListener("click",async(event)=>{const button=event.target.closest("[data-decision]");if(!button)return;const item=button.closest("[data-key]");const [stockCode,themeId]=item.dataset.key.split(":");button.disabled=true;try{const response=await fetch("/api/admin/classifications/"+stockCode+"/themes/"+themeId,{method:"POST",headers:headers(),body:JSON.stringify({decision:button.dataset.decision,evidence_url:item.querySelector("[data-evidence]").value,reviewed_by:"classification-admin"})});const parsed=await response.json();if(!response.ok)throw new Error(parsed.error||"更新失敗");rows=rows.filter((row)=>!(row.stock_code===stockCode&&String(row.theme_id)===themeId));render();status.textContent="已更新 "+stockCode+"。";}catch(error){status.textContent=error.message;button.disabled=false;}});
})();
</script></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      const origin = request.headers.get("origin");
      if (origin && origin !== url.origin) return json({ error: "cross_origin_forbidden" }, 403);
      return new Response(null, {
        status: 204,
        headers: {
          ...(origin ? { "access-control-allow-origin": origin, vary: "Origin" } : {}),
          "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
          "access-control-allow-headers": "content-type, authorization",
          "access-control-max-age": "600",
        },
      });
    }
    if (request.method === "GET" && url.pathname === "/assets/performance.css") {
      return new Response(PERFORMANCE_CSS, {
        headers: {
          "content-type": "text/css; charset=utf-8",
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    }
    if (request.method === "GET" && url.pathname === "/assets/app.css") {
      return new Response(`${HOME_CSS}\n${PERFORMANCE_CSS}`, {
        headers: {
          "content-type": "text/css; charset=utf-8",
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    }
    if (request.method === "GET" && url.pathname === "/assets/lazy-trees.js") {
      return new Response(LAZY_TREE_JS, {
        headers: {
          "content-type": "text/javascript; charset=utf-8",
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    }
    if (request.method === "GET" && url.pathname === "/assets/app.js") {
      return new Response(HOME_APP_JS, {
        headers: {
          "content-type": "text/javascript; charset=utf-8",
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    }
    if (request.method === "GET" && url.pathname === "/assets/pwa.js") {
      return new Response(PWA_JS, {
        headers: {
          "content-type": "text/javascript; charset=utf-8",
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    }
    if (
      (url.pathname.startsWith("/api/admin/") || url.pathname === "/admin/classifications")
      && url.hostname !== "claw.terry878.org"
      && url.hostname !== "localhost"
      && url.hostname !== "127.0.0.1"
      && url.hostname !== "example.test"
    ) {
      return json({ error: "not found" }, 404);
    }
    const oversizedResponse = rejectOversizedRequest(request, url);
    if (oversizedResponse) return oversizedResponse;
    if (url.pathname.startsWith("/api/admin/") && !isAdminAuthorized(request, env)) {
      const limiter = env.ADMIN_API_RATE_LIMITER;
      if (limiter?.limit) {
        const result = await limiter.limit({ key: clientRateLimitKey(request, "admin") });
        if (!result?.success) {
          return jsonWithHeaders(
            { error: "rate_limited", message: "未授權請求過於頻繁，請稍後再試。" },
            { "retry-after": "60", "cache-control": "no-store" },
            429,
          );
        }
      }
      return json({ error: "unauthorized" }, 401);
    }
    const rateLimitedResponse = await enforceApiRateLimit(request, env, url);
    if (rateLimitedResponse) return rateLimitedResponse;
    const db = env.DB;
    if (!db) return json({ error: "D1 binding missing" }, 500);

    try {
      if (url.pathname === "/watchlist" && request.method === "GET") {
        return watchlistLedgerHtml(env);
      }
      if (url.pathname === "/admin/classifications" && request.method === "GET") {
        return classificationAdminHtml();
      }

      if (url.pathname === "/api/auth/google" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const profile = await verifyGoogleCredential(env, body.credential);
        const user = await upsertWatchlistUser(db, profile);
        const token = await createWatchlistSession(db, user.id, request);
        return jsonWithHeaders({ data: { id: user.id, email: user.email, name: user.name, picture: user.picture } }, { "set-cookie": sessionCookie(token) });
      }

      if (url.pathname === "/api/auth/me" && request.method === "GET") {
        const user = await currentWatchlistUser(db, request);
        if (!user) return json({ error: "unauthorized" }, 401);
        return json({ data: { id: user.id, email: user.email, name: user.name, picture: user.picture } });
      }

      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
        const token = parseCookies(request).twstock_watchlist;
        if (token) {
          const tokenHash = await sessionTokenHash(token);
          await db.prepare("delete from watchlist_sessions where token in (?, ?)").bind(tokenHash, token).run();
        }
        return jsonWithHeaders({ data: { status: "ok" } }, { "set-cookie": expiredSessionCookie() });
      }

      if (url.pathname === "/api/watchlist" && request.method === "GET") {
        const user = await currentWatchlistUser(db, request);
        if (!user) return json({ error: "unauthorized" }, 401);
        const data = await listWatchlistPortfolio(db, user.id);
        return json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
      }

      if (url.pathname === "/api/watchlist/notifications" && request.method === "GET") {
        const user = await currentWatchlistUser(db, request);
        if (!user) return json({ error: "unauthorized" }, 401);
        const data = await getNotificationPreferences(db, user, env);
        return json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
      }

      if (url.pathname === "/api/watchlist/notifications" && ["PUT", "POST"].includes(request.method)) {
        const user = await currentWatchlistUser(db, request);
        if (!user) return json({ error: "unauthorized" }, 401);
        const body = await request.json().catch(() => ({}));
        try {
          const data = await saveNotificationPreferences(db, user, env, body);
          return json({ data, meta: { updated_at: data.updated_at, source: "cloudflare-d1", is_realtime: false } });
        } catch (error) {
          return json({ error: error.message || "notification preference update failed" }, error.status || 500);
        }
      }

      if (url.pathname === "/api/watchlist/notification-recipients" && request.method === "GET") {
        const user = await currentWatchlistUser(db, request);
        if (!user) return json({ error: "unauthorized" }, 401);
        if (!isNotificationAdmin(user, env)) return json({ error: "forbidden" }, 403);
        try {
          await syncNotificationAddressVerification(db, env);
        } catch (error) {
          console.error("notification verification sync failed", error?.message || error);
        }
        const data = await listNotificationRecipients(db);
        return json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
      }

      if (url.pathname === "/api/watchlist/notification-recipients" && ["POST", "PUT"].includes(request.method)) {
        const user = await currentWatchlistUser(db, request);
        if (!user) return json({ error: "unauthorized" }, 401);
        if (!isNotificationAdmin(user, env)) return json({ error: "forbidden" }, 403);
        const body = await request.json().catch(() => ({}));
        try {
          const result = await upsertNotificationRecipient(db, user, env, body);
          const data = (await listNotificationRecipients(db)).map((row) => (
            normalizeNotificationEmail(row.email) === result.email
              ? { ...row, verification_email_sent: Boolean(result.verification_email_sent) }
              : row
          ));
          return json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
        } catch (error) {
          return json({ error: error.message || "notification recipient update failed" }, error.status || 500);
        }
      }

      if (url.pathname === "/api/watchlist/transactions" && request.method === "POST") {
        const user = await currentWatchlistUser(db, request);
        if (!user) return json({ error: "unauthorized" }, 401);
        const body = await request.json().catch(() => ({}));
        const stockCode = stockCodeFromInput(body.stock_code || body.stock_query);
        const side = ["buy", "sell"].includes(String(body.side)) ? String(body.side) : null;
        const transactionMode = normalizeWatchlistTransactionMode(body.transaction_mode);
        const shortMode = isShortWatchlistMode(transactionMode);
        const quantityUnit = body.quantity_unit === "lots" ? "lots" : "shares";
        const enteredQuantity = optionalNumber(body.quantity_value);
        const quantityShares = normalizeQuantityShares(
          enteredQuantity === null ? body.quantity_shares : enteredQuantity * (quantityUnit === "lots" ? 1000 : 1)
        );
        const price = optionalNumber(body.price);
        const tradeDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.trade_date || "")) ? String(body.trade_date) : null;
        if (!/^\d{4}$/.test(stockCode)) return json({ error: "stock_code must be 4 digits" }, 400);
        if (!side) return json({ error: "side must be buy or sell" }, 400);
        if (!price || price <= 0) return json({ error: "price must be greater than 0" }, 400);
        if (!tradeDate) return json({ error: "trade_date is required" }, 400);
        if (enteredQuantity !== null && (!Number.isInteger(enteredQuantity) || enteredQuantity <= 0)) {
          return json({ error: "數量必須是大於 0 的整數" }, 400);
        }
        if (body.fee_preset === "manual_amount" && optionalNumber(body.manual_fee_amount) === null) {
          return json({ error: "手動手續費為必填" }, 400);
        }
        if (side === "sell" && body.tax_preset === "manual_amount" && optionalNumber(body.manual_tax_amount) === null) {
          return json({ error: "手動稅費為必填" }, 400);
        }
        const stock = await db.prepare(`
          select id, stock_code, stock_name, market_type, instrument_type
          from stocks
          where stock_code = ?
          order by market_type
          limit 1
        `).bind(stockCode).first();
        if (!stock) return json({ error: "stock not found" }, 404);
        if (side === "sell" && !shortMode) {
          const available = await db.prepare(`
            select coalesce(sum(case when side = 'buy' then quantity_shares else -quantity_shares end), 0) as quantity
            from watchlist_transactions
            where user_id = ? and stock_code = ? and coalesce(transaction_mode, 'cash') = ?
              ${transactionMode === "day_long" ? "and trade_date = ?" : ""}
          `).bind(user.id, stockCode, transactionMode, ...(transactionMode === "day_long" ? [tradeDate] : [])).first();
          if (quantityShares > Number(available?.quantity || 0)) {
            return json({ error: `賣出股數超過庫存，目前可賣 ${Number(available?.quantity || 0)} 股` }, 400);
          }
        }
        if (side === "buy" && shortMode) {
          const available = await db.prepare(`
            select coalesce(sum(case when side = 'sell' then quantity_shares else -quantity_shares end), 0) as quantity
            from watchlist_transactions
            where user_id = ? and stock_code = ? and coalesce(transaction_mode, 'cash') = ?
              ${transactionMode === "day_short" ? "and trade_date = ?" : ""}
          `).bind(user.id, stockCode, transactionMode, ...(transactionMode === "day_short" ? [tradeDate] : [])).first();
          if (quantityShares > Number(available?.quantity || 0)) {
            return json({ error: `回補股數超過空單，目前可回補 ${Number(available?.quantity || 0)} 股` }, 400);
          }
        }
        if (side === "sell" && ["day_long", "day_short"].includes(transactionMode) && String(body.tax_preset || "auto") === "auto") {
          body.tax_preset = "day_trade_stock";
        }
        const grossAmount = price * quantityShares;
        const costs = calculateWatchlistTradeCosts(body, stock, side, grossAmount);
        if (costs.fee_amount > grossAmount || costs.tax_amount > grossAmount) {
          return json({ error: "手續費或稅費不可高於成交金額" }, 400);
        }
        const now = new Date().toISOString();
        const note = String(body.note || "").trim().slice(0, 240);
        await db.prepare(`
          insert into watchlist_items (user_id, stock_id, stock_code, note, created_at, updated_at)
          values (?, ?, ?, ?, ?, ?)
          on conflict(user_id, stock_code) do update set
            stock_id = excluded.stock_id,
            note = case when excluded.note = '' then watchlist_items.note else excluded.note end,
            updated_at = excluded.updated_at
        `).bind(user.id, stock.id, stock.stock_code, note, now, now).run();
        await db.prepare(`
          insert into watchlist_transactions (
            user_id, stock_id, stock_code, side, transaction_mode, trade_date, quantity_shares, quantity_unit, price,
            gross_amount, fee_preset, fee_rate_percent, minimum_fee, fee_amount,
            tax_preset, tax_rate_percent, tax_amount, note, created_at
          )
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          user.id,
          stock.id,
          stock.stock_code,
          side,
          transactionMode,
          tradeDate,
          quantityShares,
          quantityUnit,
          price,
          grossAmount,
          costs.fee_preset,
          costs.fee_rate_percent,
          costs.minimum_fee,
          costs.fee_amount,
          costs.tax_preset,
          costs.tax_rate_percent,
          costs.tax_amount,
          note,
          now,
        ).run();
        const data = await listWatchlistPortfolio(db, user.id);
        return json({ data, meta: { updated_at: now, source: "cloudflare-d1", is_realtime: false } });
      }

      const watchlistTransactionDeleteMatch = url.pathname.match(/^\/api\/watchlist\/transactions\/(\d+)$/);
      if (watchlistTransactionDeleteMatch && request.method === "DELETE") {
        const user = await currentWatchlistUser(db, request);
        if (!user) return json({ error: "unauthorized" }, 401);
        const transactionId = Number(watchlistTransactionDeleteMatch[1]);
        const transaction = await db.prepare("select stock_code from watchlist_transactions where id = ? and user_id = ?").bind(transactionId, user.id).first();
        await db.prepare("delete from watchlist_transactions where id = ? and user_id = ?").bind(transactionId, user.id).run();
        if (transaction?.stock_code) {
          await db.prepare(`
            delete from watchlist_items
            where user_id = ? and stock_code = ?
              and not exists (
                select 1 from watchlist_transactions
                where user_id = ? and stock_code = ?
              )
          `).bind(user.id, transaction.stock_code, user.id, transaction.stock_code).run();
        }
        const data = await listWatchlistPortfolio(db, user.id);
        return json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
      }

      if (url.pathname === "/api/watchlist" && request.method === "POST") {
        const user = await currentWatchlistUser(db, request);
        const parsed = await parseWatchlistPayload(request);
        if (!user) {
          if (parsed.isForm) return watchlistRedirect(request, { status: "login_required" });
          return json({ error: "unauthorized" }, 401);
        }
        const body = parsed.body;
        const stockCode = stockCodeFromInput(body.stock_code || body.stock_query);
        if (!/^\d{4}$/.test(stockCode)) {
          if (parsed.isForm) return watchlistRedirect(request, { status: "error", message: "stock_code" });
          return json({ error: "stock_code must be 4 digits" }, 400);
        }
        const stock = await db.prepare("select id, stock_code from stocks where stock_code = ? order by market_type limit 1").bind(stockCode).first();
        if (!stock) {
          if (parsed.isForm) return watchlistRedirect(request, { status: "error", message: "stock_not_found", stock: stockCode });
          return json({ error: "stock not found" }, 404);
        }
        const now = new Date().toISOString();
        const quantityShares = normalizeQuantityShares(body.quantity_shares);
        const buyPrice = optionalNumber(body.buy_price);
        const buyDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.buy_date || "")) ? String(body.buy_date) : null;
        const sellPrice = optionalNumber(body.sell_price);
        const sellDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.sell_date || "")) ? String(body.sell_date) : null;
        if (buyDate && sellDate && sellDate < buyDate) return json({ error: "sell_date must not be earlier than buy_date" }, 400);
        const feeAmount = costNumber(body.fee_amount);
        const taxAmount = costNumber(body.tax_amount);
        await db.prepare(`
          insert into watchlist_items (user_id, stock_id, stock_code, note, quantity_shares, buy_price, buy_date, sell_price, sell_date, fee_amount, tax_amount, created_at, updated_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          on conflict(user_id, stock_code) do update set
            stock_id = excluded.stock_id,
            note = excluded.note,
            quantity_shares = excluded.quantity_shares,
            buy_price = excluded.buy_price,
            buy_date = excluded.buy_date,
            sell_price = excluded.sell_price,
            sell_date = excluded.sell_date,
            fee_amount = excluded.fee_amount,
            tax_amount = excluded.tax_amount,
            updated_at = excluded.updated_at
        `).bind(
          user.id,
          stock.id,
          stock.stock_code,
          String(body.note || "").slice(0, 120),
          quantityShares,
          buyPrice,
          buyDate,
          sellPrice,
          sellDate,
          feeAmount,
          taxAmount,
          now,
          now,
        ).run();
        const data = await listWatchlistItems(db, user.id);
        if (parsed.isForm) return watchlistRedirect(request, { status: "added", stock: stockCode });
        return json({ data, meta: { updated_at: now, source: "cloudflare-d1", is_realtime: false } });
      }

      const watchlistDeleteMatch = url.pathname.match(/^\/api\/watchlist\/(\d{4})$/);
      if (watchlistDeleteMatch && request.method === "DELETE") {
        const user = await currentWatchlistUser(db, request);
        if (!user) return json({ error: "unauthorized" }, 401);
        await db.prepare("delete from watchlist_transactions where user_id = ? and stock_code = ?").bind(user.id, watchlistDeleteMatch[1]).run();
        await db.prepare("delete from watchlist_items where user_id = ? and stock_code = ?").bind(user.id, watchlistDeleteMatch[1]).run();
        return json({ data: { status: "deleted" }, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
      }

      if (url.pathname === "/api/admin/classifications/pending" && request.method === "GET") {
        const { results } = await db.prepare(`
          select
            s.stock_code, s.stock_name, s.market_type, s.industry_code, s.industry_name,
            t.id as theme_id, t.theme_name, st.relation_strength, st.reason,
            st.confidence_score, st.evidence_type, st.evidence_url, st.rule_version,
            st.review_status, st.updated_at
          from stock_themes st
          join stocks s on s.id = st.stock_id
          join themes t on t.id = st.theme_id
          where st.review_status = 'pending'
          order by st.confidence_score desc, s.stock_code, t.theme_name
          limit 500
        `).all();
        return json({ data: results || [], meta: { taxonomy_version: TAXONOMY_VERSION } });
      }

      const classificationReviewMatch = url.pathname.match(/^\/api\/admin\/classifications\/(\d{4})\/themes\/(\d+)$/);
      if (classificationReviewMatch && ["POST", "PATCH"].includes(request.method)) {
        const [, stockCode, themeId] = classificationReviewMatch;
        const body = await request.json().catch(() => ({}));
        const decision = ["approved", "rejected", "pending"].includes(String(body.decision))
          ? String(body.decision)
          : null;
        if (!decision) return json({ error: "decision must be approved, rejected, or pending" }, 400);
        const stock = await db.prepare("select id from stocks where stock_code = ? order by market_type limit 1").bind(stockCode).first();
        if (!stock) return json({ error: "stock not found" }, 404);
        const confidence = Math.max(0, Math.min(100, Number(body.confidence_score ?? (decision === "approved" ? 100 : 0))));
        const now = new Date().toISOString();
        const updated = await db.prepare(`
          update stock_themes
          set review_status = ?, confidence_score = ?, evidence_type = ?,
            evidence_url = ?, source = 'manual-review', source_url = ?,
            rule_version = 'manual-review-v1', updated_at = ?
          where stock_id = ? and theme_id = ?
        `).bind(
          decision,
          confidence,
          String(body.evidence_type || "manual-review").slice(0, 80),
          String(body.evidence_url || "").slice(0, 500) || null,
          String(body.evidence_url || "").slice(0, 500) || "manual-review",
          now,
          stock.id,
          Number(themeId),
        ).run();
        if (!Number(updated.meta?.changes || 0)) return json({ error: "classification not found" }, 404);
        await db.prepare(`
          insert into classification_reviews (
            stock_id, theme_id, decision, confidence_score, evidence_type,
            evidence_url, note, reviewed_by, reviewed_at
          )
          values (?, ?, ?, ?, ?, ?, ?, ?, ?)
          on conflict(stock_id, theme_id) do update set
            decision = excluded.decision,
            confidence_score = excluded.confidence_score,
            evidence_type = excluded.evidence_type,
            evidence_url = excluded.evidence_url,
            note = excluded.note,
            reviewed_by = excluded.reviewed_by,
            reviewed_at = excluded.reviewed_at
        `).bind(
          stock.id,
          Number(themeId),
          decision,
          confidence,
          String(body.evidence_type || "manual-review").slice(0, 80),
          String(body.evidence_url || "").slice(0, 500) || null,
          String(body.note || "").slice(0, 500) || null,
          String(body.reviewed_by || "admin").slice(0, 120),
          now,
        ).run();
        return json({ data: { stock_code: stockCode, theme_id: Number(themeId), decision, confidence_score: confidence } });
      }

      const stockMatch = url.pathname.match(/^\/api\/stocks\/([^/]+)(?:\/([^/]+))?$/);

      if (url.pathname === "/api/stocks") {
        const data = await listStocks(db, url);
        return json({
          data,
          meta: {
            updated_at: new Date().toISOString(),
            source: "cloudflare-d1",
            is_realtime: false,
            taxonomy_version: TAXONOMY_VERSION,
            public_confidence_threshold: PUBLIC_CLASSIFICATION_CONFIDENCE,
            institutional_window: [1, 5, 10, 20].includes(Number(url.searchParams.get("institutional_window")))
              ? Number(url.searchParams.get("institutional_window"))
              : 1,
          },
        });
      }

      if (url.pathname === "/api/stocks/suggest") {
        const data = await listStockSuggestions(db, url);
        return json({
          data,
          meta: {
            updated_at: new Date().toISOString(),
            source: "cloudflare-d1-stock-master",
            is_realtime: false,
            includes_instrument_types: ["stock", "emerging", "etf", "tdr"],
          },
        });
      }

      if (url.pathname === "/api/themes/suggest") {
        const data = await listThemeSuggestions(db, url);
        return json({
          data,
          meta: {
            updated_at: new Date().toISOString(),
            source: "cloudflare-d1",
            is_realtime: false,
            public_confidence_threshold: PUBLIC_CLASSIFICATION_CONFIDENCE,
          },
        });
      }

      if (url.pathname === "/api/stocks/tree") {
        const page = clampInt(url.searchParams.get("page"), 1, 1, 10000);
        const pageSize = clampInt(url.searchParams.get("page_size") || url.searchParams.get("rows"), 800, 50, 1000);
        return await cachedResponse(request, ctx, async () => {
          const data = await listStockTree(db, {
            applicationLimit: clampInt(url.searchParams.get("applications"), 8, 1, 12),
            industryLimit: clampInt(url.searchParams.get("industries"), 6, 1, 12),
            peerLimit: clampInt(url.searchParams.get("peers"), 8, 1, 20),
            rowLimit: pageSize,
            rowOffset: (page - 1) * pageSize,
            includeProductDescriptions: ["1", "true", "full"].includes(String(url.searchParams.get("details") || "").toLowerCase()),
          });
          return jsonWithHeaders(
            { data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false, taxonomy_version: TAXONOMY_VERSION, page, page_size: pageSize, has_more: Number(data?.totals?.stock_count || 0) >= pageSize } },
            { "cache-control": "public, max-age=300, s-maxage=300" },
          );
        });
      }

      if (url.pathname === "/api/admin/crawler/history-prices" && (request.method === "POST" || request.method === "GET")) {
        const data = await syncListedStockHistoryBatch(db, url);
        return json({ data, meta: { updated_at: new Date().toISOString(), source: "twse-stock-day", is_realtime: false } });
      }

      if (stockMatch) {
        const [, stockCode, series] = stockMatch;
        if (!series) {
          const data = await getStock(db, stockCode);
          return data ? json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } }) : json({ error: "not found" }, 404);
        }
        if (series === "news") {
          return await cachedResponse(request, ctx, async () => {
            const data = await listStockNews(db, stockCode);
            return data
              ? jsonWithHeaders(
                  { data, meta: { updated_at: new Date().toISOString(), source: "official-announcements-and-trusted-media", is_realtime: false } },
                  { "cache-control": "public, max-age=300, s-maxage=900" },
                )
              : json({ error: "not found" }, 404);
          }, 900);
        }
        if (series === "history") {
          return await cachedResponse(request, ctx, async () => {
            const result = await listOfficialStockHistory(db, stockCode, url);
            if (!result) return json({ error: "not found" }, 404);
            return jsonWithHeaders({
              data: result.rows,
              meta: {
                updated_at: new Date().toISOString(),
                source: result.history.source,
                is_realtime: false,
                history: result.history,
              },
            }, { "cache-control": "public, max-age=300, s-maxage=3600" });
          }, 3600);
        }
        const tableMap = {
          price: ["daily_prices", "trade_date asc"],
          revenue: ["monthly_revenue", "revenue_year desc, revenue_month desc"],
          financials: ["financial_reports", "fiscal_year desc, quarter desc"],
          institutional: ["institutional_flows", "trade_date desc"],
        };
        if (!tableMap[series]) return json({ error: "not found" }, 404);
        let history = null;
        if (series === "price" && ["all", "1", "true"].includes(String(url.searchParams.get("history") || "").toLowerCase())) {
          history = await ensureStockPriceHistory(db, stockCode, url);
        }
        if (String(url.searchParams.get("return") || "").toLowerCase() === "meta") {
          return json({ data: [], meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false, history } });
        }
        const seriesOptions = {};
        if (series === "revenue") seriesOptions.limit = clampInt(url.searchParams.get("months"), 24, 1, 120);
        if (series === "institutional") seriesOptions.limit = clampInt(url.searchParams.get("days"), 60, 1, 240);
        const data = await stockSeries(db, stockCode, tableMap[series][0], tableMap[series][1], seriesOptions);
        return data ? json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false, history } }) : json({ error: "not found" }, 404);
      }

      if (url.pathname === "/api/market/main-flow" || url.pathname === "/api/themes/ranking") {
        const data = await listThemeScores(db);
        return json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
      }

      if (url.pathname === "/api/themes/tree") {
        const page = clampInt(url.searchParams.get("page"), 1, 1, 1000);
        const pageSize = clampInt(url.searchParams.get("page_size") || url.searchParams.get("themes"), 18, 1, 24);
        return await cachedResponse(request, ctx, async () => {
          const data = await listThemeTree(db, {
            themeLimit: pageSize,
            themeOffset: (page - 1) * pageSize,
            industriesPerTheme: clampInt(url.searchParams.get("industries"), 5, 1, 12),
            stocksPerIndustry: clampInt(url.searchParams.get("stocks"), 8, 1, 20),
            includeProductDescriptions: ["1", "true", "full"].includes(String(url.searchParams.get("details") || "").toLowerCase()),
          });
          return jsonWithHeaders(
            { data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false, taxonomy_version: TAXONOMY_VERSION, public_confidence_threshold: PUBLIC_CLASSIFICATION_CONFIDENCE, page, page_size: pageSize } },
            { "cache-control": "public, max-age=300, s-maxage=300" },
          );
        });
      }

      if (url.pathname === "/api/market/institutional-tree") {
        const page = clampInt(url.searchParams.get("page"), 1, 1, 10000);
        const pageSize = clampInt(url.searchParams.get("page_size") || url.searchParams.get("stocks"), 260, 20, 400);
        return await cachedResponse(request, ctx, async () => {
          const data = await listInstitutionalTree(db, {
            stockLimit: pageSize,
            stockOffset: (page - 1) * pageSize,
            applicationLimit: clampInt(url.searchParams.get("applications"), 8, 1, 12),
            industryLimit: clampInt(url.searchParams.get("industries"), 6, 1, 12),
            peerLimit: clampInt(url.searchParams.get("peers"), 8, 1, 20),
            includeProductDescriptions: ["1", "true", "full"].includes(String(url.searchParams.get("details") || "").toLowerCase()),
          });
          return jsonWithHeaders(
            { data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false, taxonomy_version: TAXONOMY_VERSION, page, page_size: pageSize, has_more: Number(data?.stock_count || 0) >= pageSize } },
            { "cache-control": "public, max-age=300, s-maxage=300" },
          );
        });
      }

      if (url.pathname === "/api/market/global") {
        return await cachedResponse(request, ctx, async () => {
          const data = await listGlobalMarkets();
          return jsonWithHeaders(
            {
              data,
              meta: {
                updated_at: new Date().toISOString(),
                source: "yahoo-finance-and-taifex-openapi",
                is_realtime: false,
                cache_seconds: 300,
              },
            },
            { "cache-control": "public, max-age=60, s-maxage=300" },
          );
        }, 300);
      }

      if (url.pathname === "/api/market/dashboard") {
        return await cachedResponse(request, ctx, async () => {
          const data = await listDashboard(db);
          return jsonWithHeaders(
            { data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } },
            { "cache-control": "public, max-age=300, s-maxage=300" },
          );
        });
      }

      if (url.pathname === "/api/market/industry-concentration") {
        return await cachedResponse(request, ctx, async () => {
          const data = await listIndustryConcentrationDetail(db, url);
          return data
            ? jsonWithHeaders(
                { data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } },
                { "cache-control": "public, max-age=300, s-maxage=300" },
              )
            : json({ error: "industry_code is required" }, 400);
        });
      }

      if (url.pathname === "/api/market/index") {
        const limit = clampInt(url.searchParams.get("limit"), 260, 1, 1000);
        const data = await listMarketIndex(db, limit);
        return json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
      }

      if (url.pathname === "/api/market/surveillance") {
        const data = await listMarketSurveillance(url);
        return json({ data, meta: { updated_at: new Date().toISOString(), source: "twse-tpex-official-announcements", is_realtime: false } });
      }

      const themeStocksMatch = url.pathname.match(/^\/api\/themes\/(\d+)\/stocks$/);
      if (themeStocksMatch) {
        const data = await listThemeStocks(db, themeStocksMatch[1]);
        return data ? json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } }) : json({ error: "not found" }, 404);
      }

      if (url.pathname === "/api/classifications/quality") {
        return await cachedResponse(request, ctx, async () => {
          const data = await listClassificationQuality(db);
          return jsonWithHeaders(
            { data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false, taxonomy_version: TAXONOMY_VERSION } },
            { "cache-control": "public, max-age=300, s-maxage=300" },
          );
        });
      }

      if (url.pathname === "/api/crawler/status") {
        const status = await listStatus(db);
        return json({ data: { status }, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
      }

      if (url.pathname === "/api/admin/crawler/run" && request.method === "POST") {
        const payload = await request.json().catch(() => ({}));
        if (payload.wait === true) {
          const data = await syncOfficialMarketData(db, payload);
          return json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
        }
        ctx.waitUntil(syncOfficialMarketData(db, payload));
        const data = { status: "accepted", tasks: payload.tasks || ["daily-price", "stock-valuation", "monthly-revenue", "institutional-flow", "market-index", "dividend"], message: "Official market sync started in background." };
        return json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
      }

      if (url.pathname === "/api/admin/scores/recompute" && request.method === "POST") {
        const themeScore = await recomputeVerifiedThemeScores(db);
        const stockScore = await recomputeAvailableStockScores(db);
        return json({
          data: { theme_score: themeScore, stock_score: stockScore },
          meta: { updated_at: new Date().toISOString(), source: "available-data-score-v1", is_realtime: false },
        });
      }

      if (url.pathname === "/api/admin/crawler/revenue-history" && ["GET", "POST"].includes(request.method)) {
        const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
        const data = await syncOfficialMonthlyRevenueHistoryBatch(db, {
          months: body.months ?? url.searchParams.get("months"),
          cursor: body.cursor ?? url.searchParams.get("cursor"),
          batch: body.batch ?? url.searchParams.get("batch"),
        });
        return json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
      }

      if (url.pathname === "/api/admin/crawler/institutional-history" && ["GET", "POST"].includes(request.method)) {
        const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
        const data = await syncOfficialInstitutionalHistoryBatch(db, {
          days: body.days ?? url.searchParams.get("days"),
          cursor: body.cursor ?? url.searchParams.get("cursor"),
        });
        return json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
      }

      if (url.pathname === "/api/admin/import/twse-stock-basic" && request.method === "POST") {
        const payload = await request.json();
        const data = await importStockBasicRows(db, payload);
        return json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
      }

      if (url.pathname === "/api/admin/import/twse-daily-price" && request.method === "POST") {
        const payload = await request.json();
        const data = await importDailyPriceRows(db, payload);
        return json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
      }

      if (url.pathname === "/api/admin/import/stock-valuation" && request.method === "POST") {
        const payload = await request.json();
        const forcedMarketType = payload.market_scope === "tpex"
          ? "\u4e0a\u6ac3"
          : payload.market_scope === "twse"
            ? "\u4e0a\u5e02"
            : null;
        const rows = Array.isArray(payload.rows)
          ? payload.rows.slice(0, 2500).map((row) => ({ ...row, market_type: forcedMarketType || row.market_type }))
          : [];
        const data = await importStockValuationRows(db, rows, []);
        return json({ data, meta: { updated_at: new Date().toISOString(), source: "protected-official-valuation-import", is_realtime: false } });
      }

      if (url.pathname === "/api/admin/import/monthly-revenue" && request.method === "POST") {
        const payload = await request.json();
        const data = await importMonthlyRevenueRows(db, payload);
        return json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
      }

      if (url.pathname === "/api/admin/import/institutional-flow" && request.method === "POST") {
        const payload = await request.json();
        const data = await importInstitutionalFlowRows(db, payload);
        return json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
      }

      if (url.pathname === "/api/admin/import/theme-tags" && request.method === "POST") {
        const payload = await request.json();
        const data = await importThemeTagRows(db, payload);
        return json({ data, meta: { updated_at: new Date().toISOString(), source: "cloudflare-d1", is_realtime: false } });
      }

      const pageRoutes = new Map([
        ["/", "home"],
        ["/market", "market"],
        ["/research", "research"],
        ["/taxonomy", "taxonomy"],
        ["/data", "data"],
        ["/guide", "guide"],
        ["/disclaimer", "disclaimer"],
      ]);
      const legacyPageRedirects = new Map([
        ["/screener", "/research#stock-screener"],
        ["/compare", "/research#stock-compare"],
        ["/quality", "/data#data-quality"],
        ["/industries", "/taxonomy#stock-tree-section"],
        ["/themes", "/taxonomy#theme-tree-section"],
        ["/institutional", "/market#institutional-flow"],
        ["/recommendations", "/market#recommendations"],
        ["/leaders", "/taxonomy#leader-roster"],
        ["/sources", "/data#sources"],
      ]);
      if (request.method === "GET" && legacyPageRedirects.has(url.pathname)) {
        return Response.redirect(new URL(legacyPageRedirects.get(url.pathname), url.origin).toString(), 302);
      }
      const page = pageRoutes.get(url.pathname);
      if (!page || request.method !== "GET") return json({ error: "not found" }, 404);

      const renderPage = async () => {
        const queryStartedAt = Date.now();
        const dashboardUrl = new URL(url);
        dashboardUrl.searchParams.set("limit", "48");
        dashboardUrl.searchParams.set("sort", "turnover");
        const needsStocks = page === "home";
        const needsThemes = page === "home";
        const needsDashboard = page === "market";
        const needsQuality = ["home", "market", "research", "data"].includes(page);
        const [
          data,
          themeData,
          statusData,
          dashboard,
          quality,
        ] = await Promise.all([
          needsStocks ? listStocks(db, dashboardUrl) : Promise.resolve([]),
          needsThemes ? listThemeScores(db) : Promise.resolve([]),
          listStatus(db),
          needsDashboard ? listDashboard(db) : Promise.resolve({}),
          needsQuality ? listClassificationQuality(db) : Promise.resolve({}),
        ]);
        const queryDuration = Date.now() - queryStartedAt;
        const renderStartedAt = Date.now();
        const response = html(
          data,
          themeData,
          statusData,
          { applications: [], totals: { stock_count: 0, application_count: 0, industry_count: 0 } },
          [],
          { applications: [], stock_count: 0 },
          dashboard,
          quality,
          page,
        );
        return responseWithHeaders(response, {
          "server-timing": `db;dur=${queryDuration}, render;dur=${Date.now() - renderStartedAt}`,
        });
      };
      return await cachedResponse(request, ctx, renderPage);
    } catch (error) {
      const message = error && error.stack ? error.stack : String(error);
      try {
        await writeCrawlerLog(db, "worker-error", "cloudflare-worker", url.href, new Date().toISOString(), "failed", 0, 0, message);
      } catch (_) {
        // Avoid masking the original error.
      }
      return json({ error: "internal server error" }, 500);
    }
  },
  async scheduled(event, env, ctx) {
    const scheduledAt = new Date(event.scheduledTime || Date.now());
    const utcHour = scheduledAt.getUTCHours();
    const utcDay = scheduledAt.getUTCDay();
    const job = utcHour === 0
      ? { slot: "08:00", name: "daily-global-market-sync", tasks: [] }
      : utcHour === 10
        ? { slot: "18:00", name: "daily-price-valuation-institutional-sync", tasks: ["daily-price", "stock-valuation", "institutional-flow"], recompute_scores: true }
        : utcDay === 0
          ? { slot: "10:00", name: "weekly-official-stock-basic-sync", tasks: ["stock-basic"] }
          : { slot: "10:00", name: "daily-fundamental-calendar-sync", tasks: ["monthly-revenue", "market-index", "dividend"], recompute_scores: true };
    ctx.waitUntil(runScheduledUpdate(env, event, job));
  },
};

export {
  isAdminAuthorized,
  normalizeTwseMiIndexDailyRow,
  normalizeTpexStockBasic,
  normalizeTwseStockBasic,
  notificationEmailContent,
};
