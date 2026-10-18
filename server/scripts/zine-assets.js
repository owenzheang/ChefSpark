import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { runAssetPoc, AssetPocError } from "../src/services/zineAssetsService.js";

export const assetConfirmationPhrase = "GENERATE ONE ASSET SHEET WITH UNVERIFIED COST";
export async function confirmAssetPaid({ input = process.stdin, output = process.stdout, openTerminal = createInterface } = {}) {
  if (!input.isTTY || !output.isTTY) return false;
  const terminal = openTerminal({ input, output });
  try {
    const answer = await terminal.question(
      "\nWARNING: ONE paid Flare asset sheet, medium, 1024x1024, no reference image.\n" +
      "Total cost is unknown in advance. ZINE_POC_MAX_COST_USD is NOT enforced and NOT a guaranteed ceiling.\n" +
      "Failures may still be billed. No automatic retries.\n" +
      `Type ${assetConfirmationPhrase} to send now; anything else cancels: `);
    return answer === assetConfirmationPhrase;
  } catch { return false; }
  finally { terminal.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
  try { await runAssetPoc({ args: process.argv.slice(2), confirmPaid: confirmAssetPaid }); }
  catch (error) {
    console.error(error instanceof AssetPocError ? error.message : "Local asset PoC failed. Inspect reports before retrying; no automatic retry.");
    process.exitCode = 1;
  }
}
