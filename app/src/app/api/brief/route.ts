import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Item, Meta } from "@/lib/data";
import { evaluateAutonomy } from "@/lib/logic";
import { BRIEF_SYSTEM, buildBriefFacts, deterministicBrief } from "@/lib/brief";

export const runtime = "nodejs";

const ROOT = path.join(process.cwd(), "data");
/** Two ways to reach Claude: a direct Anthropic key (model id claude-opus-5-5), or Vercel AI Gateway with the project's
 *  OIDC token or an AI_GATEWAY_API_KEY (gateway model id anthropic/claude-opus-5.5, from https://ai-gateway.vercel.sh/v1/models). */
const DIRECT_MODEL = process.env.BRIEF_MODEL ?? "claude-opus-5-5";
const GATEWAY_MODEL = process.env.BRIEF_GATEWAY_MODEL ?? "anthropic/claude-opus-5.5";

/** GET /api/brief?store=S09&week=0 → { text, source: "claude" | "facts", model?, facts }.
 *  Facts are computed here from the exported data; Claude (through Vercel AI Gateway, Anthropic Messages API) only rephrases them.
 *  Without a gateway credential, or on any error, the deterministic brief is returned so the screen always works. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const store = url.searchParams.get("store") ?? "S09";
  const week = url.searchParams.get("week") === "1" ? 1 : 0;
  if (!/^S\d{2}$/.test(store)) return NextResponse.json({ error: "Unknown store" }, { status: 404 });
  let meta: Meta; let items: Item[];
  try {
    meta = JSON.parse(await readFile(path.join(ROOT, "meta.json"), "utf8")) as Meta;
    items = (JSON.parse(await readFile(path.join(ROOT, "store", `${store}.json`), "utf8")) as { items: Item[] }).items;
  } catch { return NextResponse.json({ error: "Unknown store" }, { status: 404 }); }
  const st = meta.stores.find((s) => s.store === store);
  if (!st) return NextResponse.json({ error: "Unknown store" }, { status: 404 });
  const levels: Record<string, 1 | 2 | 3> = {};
  for (const [c, e] of Object.entries(meta.autonomy_evidence)) levels[c] = evaluateAutonomy(e.weeks, e.fresh).level as 1 | 2 | 3;
  const facts = buildBriefFacts(meta, st, items, week, levels);
  const fallback = deterministicBrief(facts);

  const direct = process.env.ANTHROPIC_API_KEY;
  const gatewayKey = process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN;
  if (!direct && !gatewayKey) return NextResponse.json({ text: fallback, source: "facts", facts });
  try {
    const client = direct
      ? new Anthropic({ apiKey: direct, timeout: 25_000, maxRetries: 1 })
      : new Anthropic({ apiKey: gatewayKey, baseURL: "https://ai-gateway.vercel.sh", timeout: 25_000, maxRetries: 1 });
    const res = await client.messages.create({
      model: direct ? DIRECT_MODEL : GATEWAY_MODEL,
      max_tokens: 600,
      system: BRIEF_SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(facts) }],
    });
    if (res.stop_reason === "refusal") return NextResponse.json({ text: fallback, source: "facts", facts });
    const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
    if (!text) return NextResponse.json({ text: fallback, source: "facts", facts });
    return NextResponse.json({ text, source: "claude", model: res.model, facts }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    const reason = err instanceof Anthropic.APIError ? `${err.status}` : "error";
    return NextResponse.json({ text: fallback, source: "facts", reason, facts });
  }
}
