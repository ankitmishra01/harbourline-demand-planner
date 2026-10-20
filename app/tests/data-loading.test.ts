import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMeta, loadStore } from "../src/lib/data.ts";

test("data loaders deduplicate requests, reject HTTP errors and retry failures", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('{"error":"Unavailable"}', { status: 503 }); };
  try {
    await assert.rejects(loadStore("S01"), /503/);
    await assert.rejects(loadMeta(), /503/);
    assert.equal(calls, 2);
    globalThis.fetch = async () => { calls++; return Response.json({ store: "S01", items: [] }); };
    const a = loadStore("S01"), b = loadStore("S01");
    assert.equal(a, b);
    assert.equal((await a).store, "S01");
    await loadStore("S01");
    assert.equal(calls, 3);
    await loadMeta();
    assert.equal(calls, 4);
    await assert.rejects(loadStore("../secrets"), /Invalid store/);
    assert.equal(calls, 4);
  } finally { globalThis.fetch = original; }
});

test("network failures do not permanently poison a store cache", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new TypeError("Network failed"); };
    await assert.rejects(loadStore("S02"), /Network failed/);
    globalThis.fetch = async () => Response.json({ store: "S02", items: [] });
    assert.equal((await loadStore("S02")).store, "S02");
  } finally { globalThis.fetch = original; }
});
