import { setTimeout } from "node:timers/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function runJob() {
  console.log(`[${new Date().toISOString()}] Running scheduled review export...`);
  try {
    const { stdout, stderr } = await execFileAsync("node", ["./scripts/export-reviewed.mjs"], {
      env: process.env,
      cwd: process.cwd(),
    });
    process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  } catch (error) {
    console.error("Scheduled export failed:", error);
  }
}

async function main() {
  // Run immediately, then once per day.
  await runJob();
  while (true) {
    await setTimeout(24 * 60 * 60 * 1000);
    await runJob();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
