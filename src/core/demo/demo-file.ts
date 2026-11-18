/**
 * The file behind "Try the demo flight": the glider, then the 3D model's bench run and flight.
 * Three sessions of two models in one file, so the demo shows the model list, totals and the export too.
 */
import { encodeTlm } from "../adapters/spektrum-tlm/encode.ts";
import { demo3dSession, demoGroundTestSession } from "./demo-3d.ts";
import { demoGliderSession } from "./demo-flight.ts";

export function demoFileTlm(): Uint8Array {
  return encodeTlm([demoGliderSession(), demoGroundTestSession(), demo3dSession()]);
}
