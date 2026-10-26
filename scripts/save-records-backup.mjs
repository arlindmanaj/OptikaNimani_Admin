// Receives a connector-exported snapshot through hidden stdin. Never logs records.
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stderr.write("Ready for backup JSON on hidden stdin.\n");
process.stdin.setEncoding("utf8");
let input = "";
process.stdin.on("data", async chunk => {
  input += chunk;
  if (input.includes("\u0003")) process.exit(130);
  if (!/[\r\n]/.test(input)) return;
  process.stdin.pause();
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  const data = JSON.parse(input.trim());
  const target = path.resolve("outputs/private-migration/live-records.json");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(data), { mode: 0o600, flag: "wx" });
  console.log("Private backup saved outside Git.");
  process.exit(0);
});
