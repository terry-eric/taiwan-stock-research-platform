import http from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/index.js";

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
    return { success: true, results: this.database.prepare(this.sql).all(...this.values) };
  }
  async first() {
    return this.database.prepare(this.sql).get(...this.values) || null;
  }
  async run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes || 0), last_row_id: Number(result.lastInsertRowid || 0) } };
  }
}

class PreviewDatabase {
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
}

const DB = new PreviewDatabase();
const port = Number(globalThis.__previewPort || 8788);

http.createServer(async (incoming, outgoing) => {
  try {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const request = new Request(`http://127.0.0.1:${port}${incoming.url}`, {
      method: incoming.method,
      headers: incoming.headers,
      body: ["GET", "HEAD"].includes(incoming.method || "GET") ? undefined : Buffer.concat(chunks),
    });
    const response = await worker.fetch(request, { DB, ADMIN_SYNC_TOKEN: "preview" }, { waitUntil() {} });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    outgoing.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    outgoing.end(String(error?.stack || error));
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Local preview: http://127.0.0.1:${port}`);
});
