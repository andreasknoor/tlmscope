/**
 * Writes the synthetic demo flight to public/demo/demo-flight.TLM.
 * Usage: npm run demo
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { demoFlightTlm } from "../src/core/demo/demo-flight.ts";

const dir = join(import.meta.dirname, "../public/demo");
mkdirSync(dir, { recursive: true });
const data = demoFlightTlm();
writeFileSync(join(dir, "demo-flight.TLM"), data);
console.log(`public/demo/demo-flight.TLM: ${(data.length / 1e6).toFixed(2)} MB`);
