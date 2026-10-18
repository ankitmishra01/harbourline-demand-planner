import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getVercelOidcToken } from "@vercel/functions/oidc";
import type { Item, Meta } from "@/lib/data";
import { evaluateAutonomy } from "@/lib/logic";
import { BRIEF_SYSTEM, buildBriefFacts, deterministicBrief, factLines } from "@/lib/brief";

export const runtime = "nodejs";

const ROOT = path.join(process.cwd(), "data");
/** Model paths, in order. A direct Anthropic key uses the official API (claude-opus-5-5). Otherwise the call goes
 *  through Vercel AI Gateway with the deployment's OIDC identity (no key to manage): Claude first, then Gemini 2.5 Flash,
 *  which the gateway's free tier allows. A direct Gemini key (GEMINI_API_KEY, as on the G20 dashboard) is a last paid-free path.
 *  Model ids for the gateway come from https://ai-gateway.vercel.sh/v1/models. */
const DIRECT_MODEL = process.env.BRIEF_MODEL ?? "claude-opus-5-5";
const GATEWAY_MODELS = (process.env.BRIEF_GATEWAY_MODELS ?? "anthropic/claude-opus-5.5,google/gemini-2.5-flash-lite,google/gemini-2.5-flash").split(",").map((m) => m.trim()).filter(Boolean);
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

async function gatewayToken(): Promise<string | undefined> {
  if (process.env.AI_GATEWAY_API_KEY) return process.env.AI_GATEWAY_API_KEY;
  try { return getVercelOidcToken(); } catch { return process.env.VERCEL_OIDC_TOKEN || undefined; }
}

async function geminiDirect(apiKey: string, system: string, user: string): Promise<string> {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
    method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": apiKey }, signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }], generationConfig: { maxOutputTokens: 600, temperature: 0.4 } }),
  });
  if (!r.ok) throw new Error(`gemini ${r.status}`);
  const d = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return (d.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
}

/** GET /api/brief?store=S09&week=0 → { text, source: "claude" | "facts", model?, facts }.
 *  Facts are computed here from the exported data; Claude (through Vercel AI Gateway, Anthropic Messages API) only rephrases them.
 *  Without a gateway credential, or on any error, the deterministic brief is returned so the screen always works. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const store = url.searchParams.get("store") ?? "S09";
  const week = url.searchParams.get("week") === "1" ? 1 : 0;
  const forceGemini = url.searchParams.get("provider") === "gemini"; // test switch: skip the gateway and use the direct Gemini key
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

  const user = `FACTS\n${factLines(facts).map((l) => `- ${l}`).join("\n")}\n\nDRAFT (already correct)\n${fallback}`;
  const direct = process.env.ANTHROPIC_API_KEY;
  const tried: string[] = [];
  try {
    let res: Anthropic.Message | null = null;
    if (direct) {
      const client = new Anthropic({ apiKey: direct, timeout: 25_000, maxRetries: 1 });
      res = await client.messages.create({ model: DIRECT_MODEL, max_tokens: 2000, system: BRIEF_SYSTEM, messages: [{ role: "user", content: user }] });
    } else {
      const token = forceGemini ? undefined : await gatewayToken();
      if (token) {
        const client = new Anthropic({ apiKey: token, baseURL: "https://ai-gateway.vercel.sh", timeout: 25_000, maxRetries: 0 });
        for (const model of GATEWAY_MODELS) {
          tried.push(model);
          try {
            const r = await client.messages.create({ model, max_tokens: 2000, system: BRIEF_SYSTEM, messages: [{ role: "user", content: user }] });
            const words = r.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join(" ").trim().split(/\s+/).filter(Boolean).length;
            if (r.stop_reason === "refusal" || words < 60) continue; // truncated or declined: try the next model
            res = r; break;
          }
          catch (err) { if (err instanceof Anthropic.APIError && (err.status === 403 || err.status === 404 || err.status === 402)) continue; throw err; }
        }
      }
      if (!res && process.env.GEMINI_API_KEY) {
        const text = await geminiDirect(process.env.GEMINI_API_KEY, BRIEF_SYSTEM, user);
        if (text) return NextResponse.json({ text, source: "model", model: GEMINI_MODEL, facts }, { headers: { "cache-control": "no-store" } });
      }
    }
    if (!res) return NextResponse.json({ text: fallback, source: "facts", reason: tried.length ? "no model available" : "no credential", facts });
    if (res.stop_reason === "refusal") return NextResponse.json({ text: fallback, source: "facts", facts });
    const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
    if (!text) return NextResponse.json({ text: fallback, source: "facts", facts });
    return NextResponse.json({ text, source: "model", model: res.model, facts }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    const reason = err instanceof Anthropic.APIError ? `${err.status}` : "error";
    return NextResponse.json({ text: fallback, source: "facts", reason, facts });
  }
}
