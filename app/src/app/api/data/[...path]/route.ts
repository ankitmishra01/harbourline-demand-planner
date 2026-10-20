import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
// The synthetic dataset changes only with a deployment. Build every response once,
// so opening a store does not need a serverless invocation or filesystem read.
export const dynamic = "force-static";
export const dynamicParams = false;
export async function generateStaticParams() {
  const stores = await readdir(path.join(process.cwd(), "data", "store"));
  return [{ path: ["meta.json"] }, ...stores.filter((name) => /^S\d{2}\.json$/.test(name)).map((name) => ({ path: ["store", name] }))];
}

/** Serves the exported JSON (app/data/, written by pipeline/export.py). Synthetic data, public. */
const ROOT = path.join(process.cwd(), "data");
const SAFE = /^[A-Za-z0-9_-]+(\.json)?$/;

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  if (!parts.length || !parts.every((p) => SAFE.test(p)) || !parts.at(-1)!.endsWith(".json")) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const body = await readFile(path.join(ROOT, ...parts), "utf8");
    return new NextResponse(body, { headers: { "content-type": "application/json", "cache-control": "public, max-age=300" } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
