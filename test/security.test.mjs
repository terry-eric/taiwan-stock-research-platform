import test from "node:test";
import assert from "node:assert/strict";
import worker, { isAdminAuthorized, isTpexSyncAuthorized } from "../src/index.js";

test("admin endpoints require the configured bearer token", async () => {
  assert.equal(
    isAdminAuthorized(new Request("https://example.test/api/admin/crawler/run"), { ADMIN_SYNC_TOKEN: "secret" }),
    false,
  );
  assert.equal(
    isAdminAuthorized(new Request("https://example.test/api/admin/crawler/run", {
      headers: { authorization: "Bearer secret" },
    }), { ADMIN_SYNC_TOKEN: "secret" }),
    true,
  );
  const response = await worker.fetch(
    new Request("https://example.test/api/admin/crawler/run", { method: "POST" }),
    { DB: {}, ADMIN_SYNC_TOKEN: "secret" },
    { waitUntil() {} },
  );
  assert.equal(response.status, 401);
});

test("TPEx sync token is restricted to its four POST-only endpoints", async () => {
  const env = { TPEX_SYNC_TOKEN: "tpex-secret" };
  const authorized = new Request("https://example.test/api/tpex-sync/daily-price", {
    method: "POST", headers: { authorization: "Bearer tpex-secret" },
  });
  assert.equal(isTpexSyncAuthorized(authorized, env, new URL(authorized.url)), true);
  const forbidden = new Request("https://example.test/api/admin/crawler/run", {
    method: "POST", headers: { authorization: "Bearer tpex-secret" },
  });
  assert.equal(isTpexSyncAuthorized(forbidden, env, new URL(forbidden.url)), false);
  const denied = await worker.fetch(
    new Request("https://example.test/api/tpex-sync/daily-price", { method: "POST" }),
    { DB: {}, TPEX_SYNC_TOKEN: "tpex-secret" },
    { waitUntil() {} },
  );
  assert.equal(denied.status, 401);
});

test("public 500 responses do not expose stack traces", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/"),
    { DB: {} },
    { waitUntil() {} },
  );
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "internal server error" });
});

test("public pages keep the release notice visible when D1 daily reads are exhausted", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/"),
    {
      DB: {
        prepare() {
          throw new Error("D1_ERROR: exceeded D1's free tier daily row read limit [code: 7500]");
        },
      },
    },
    { waitUntil() {} },
  );
  assert.equal(response.status, 503);
  const page = await response.text();
  assert.match(page, /資料庫讀取額度暫時到達上限/);
  assert.match(page, /data-release-notice-version="2026-09-03-d1-read-optimization"/);
});

test("public APIs report a D1 daily read limit without exposing an internal error", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/stocks"),
    {
      DB: {
        prepare() {
          throw new Error("D1_ERROR: exceeded D1's free tier daily row read limit [code: 7500]");
        },
      },
    },
    { waitUntil() {} },
  );
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("retry-after"), "3600");
  assert.equal((await response.json()).error, "d1_daily_read_limit");
});

test("public API rate limiting returns 429 before touching D1", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/stocks", {
      headers: { "cf-connecting-ip": "203.0.113.8" },
    }),
    {
      DB: {},
      PUBLIC_API_RATE_LIMITER: {
        async limit({ key }) {
          assert.equal(key, "public:203.0.113.8");
          return { success: false };
        },
      },
    },
    { waitUntil() {} },
  );
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.deepEqual(await response.json(), {
    error: "rate_limited",
    message: "請求過於頻繁，請稍後再試。",
  });
});

test("admin endpoints are hidden on the workers.dev hostname", async () => {
  const response = await worker.fetch(
    new Request("https://twstock-research.example.workers.dev/api/admin/crawler/run", {
      method: "POST",
      headers: { authorization: "Bearer secret" },
    }),
    { DB: {}, ADMIN_SYNC_TOKEN: "secret" },
    { waitUntil() {} },
  );
  assert.equal(response.status, 404);
});

test("admin rate limiter counts unauthorized attempts but bypasses valid bearer requests", async () => {
  let limiterCalls = 0;
  const env = {
    ADMIN_SYNC_TOKEN: "secret",
    ADMIN_API_RATE_LIMITER: {
      async limit() {
        limiterCalls += 1;
        return { success: false };
      },
    },
  };
  const blocked = await worker.fetch(
    new Request("https://example.test/api/admin/crawler/run", { method: "POST" }),
    env,
    { waitUntil() {} },
  );
  assert.equal(blocked.status, 429);
  assert.equal(limiterCalls, 1);

  const authorized = await worker.fetch(
    new Request("https://example.test/api/admin/crawler/run", {
      method: "POST",
      headers: { authorization: "Bearer secret" },
    }),
    env,
    { waitUntil() {} },
  );
  assert.equal(authorized.status, 500);
  assert.equal(limiterCalls, 1, "valid admin traffic must not consume the attack limiter");
});

test("oversized non-admin writes are rejected before JSON parsing", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/watchlist/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "70000",
      },
      body: "{}",
    }),
    { DB: {} },
    { waitUntil() {} },
  );
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: "payload_too_large" });
});

test("cross-origin API preflights are rejected while same-origin preflights are allowed", async () => {
  const blocked = await worker.fetch(
    new Request("https://example.test/api/stocks", {
      method: "OPTIONS",
      headers: { origin: "https://attacker.example" },
    }),
    {},
    { waitUntil() {} },
  );
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.get("access-control-allow-origin"), null);

  const allowed = await worker.fetch(
    new Request("https://example.test/api/stocks", {
      method: "OPTIONS",
      headers: { origin: "https://example.test" },
    }),
    {},
    { waitUntil() {} },
  );
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://example.test");
});
