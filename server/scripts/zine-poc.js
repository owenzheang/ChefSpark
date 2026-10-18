import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { runZinePoc } from "../src/services/zinePocService.js";

export const confirmationPhrase = "GENERATE ONE IMAGE WITH UNVERIFIED COST";

export async function confirmUnverifiedCost({ input = process.stdin, output = process.stdout,
  openTerminal = createInterface } = {}) {
  if (!input.isTTY || !output.isTTY) return false;
  const terminal = openTerminal({ input, output });
  try {
    const answer = await terminal.question(
      "\nWARNING: One paid gpt-image-2.5-flare image, medium, 1024x1536, with one reference image.\n" +
      "Exact total cost cannot be known before this request. ZINE_POC_MAX_COST_USD is NOT enforced\n" +
      "and is NOT a guaranteed ceiling for this override. Failures may still be billed. No retries.\n" +
      `Type ${confirmationPhrase} to send now; anything else cancels: `);
    return answer === confirmationPhrase;
  } catch {
    return false;
  } finally {
    terminal.close();
  }
}

// Importing this module never runs the CLI or loads credentials.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Read only; never edit .env or expose dotenv diagnostics. Shell variables take precedence.
  dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
  try {
    await runZinePoc({ args: process.argv.slice(2), confirmUnverifiedCost });
  } catch (error) {
    // Service errors are controlled messages. Do not dump objects or stacks.
    const message = error?.message || "";
    const safe = /^(Unsupported|OPENAI_IMAGE|Only portrait|Set a positive|Cost profile|Reliable cost|Estimated request|Duplicate CLI|Unknown or incomplete|Cannot combine|Paid acknowledgement|Recipe JSON|Invalid structured recipe|Recipe prompt|Paid execution|OPENAI_API_KEY is missing|Output must|Unsafe output|OpenAI image request failed|Image request failed|Invalid image response|Could not finalize)/.test(message);
    console.error(safe ? message : "Local PoC operation failed. No automatic retry; inspect local reports before retrying.");
    process.exitCode = 1;
  }
}
