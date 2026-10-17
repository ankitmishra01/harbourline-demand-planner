import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Meta } from "@/lib/data";

/** Reads the exported planner metadata on the server (app/data/meta.json, written by pipeline/export.py). */
export async function readMeta(): Promise<Meta> {
  const file = path.join(process.cwd(), "data", "meta.json");
  return JSON.parse(await readFile(file, "utf8")) as Meta;
}
