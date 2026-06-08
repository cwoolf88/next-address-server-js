#!/usr/bin/env node
/**
 * Builds this SDK and updates the local file dependency in paws-and-tails-demo.
 *
 * Usage:
 *   npm run sync:demo
 *   PAWS_AND_TAILS_DEMO_PATH=../other/demo npm run sync:demo
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sdkRoot = path.join(__dirname, "..");
const demoRoot = process.env.PAWS_AND_TAILS_DEMO_PATH
  ? path.resolve(sdkRoot, process.env.PAWS_AND_TAILS_DEMO_PATH)
  : path.join(sdkRoot, "..", "paws-and-tails-demo");
const demoPkg = path.join(demoRoot, "package.json");

if (!fs.existsSync(demoPkg)) {
  console.error("Could not find paws-and-tails-demo (missing package.json):", demoRoot);
  process.exit(1);
}

console.log("Syncing SDK into demo at:", demoRoot);
execSync("npm run sdk:sync:local", {
  cwd: demoRoot,
  stdio: "inherit",
  env: { ...process.env, LOCAL_NEXT_ADDRESS_SERVER_JS: sdkRoot },
});
