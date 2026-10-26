// Reads one password through hidden stdin and prints only its salted hash parts.
import { scrypt, randomBytes } from "node:crypto";
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stderr.write("Ready for password JSON on hidden stdin.\n");
process.stdin.setEncoding("utf8");
let input = "";
process.stdin.on("data", (chunk) => {
  input += chunk;
  if (input.includes("\u0003")) process.exit(130);
  if (input.length > 4096) process.exit(1);
  if (!/[\r\n]/.test(input)) return;
  process.stdin.pause();
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  const { password } = JSON.parse(input.trim());
  if (typeof password !== "string" || password.length < 12) process.exit(1);
  const salt = randomBytes(24).toString("base64url");
  scrypt(
    password,
    salt,
    64,
    { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
    (err, key) => {
      if (err) process.exit(1);
      const value = key.toString("base64url");
      process.stdout.write(
        "\n" +
          JSON.stringify({
            salt,
            key1: value.slice(0, 43),
            key2: value.slice(43),
          }) +
          "\n",
      );
      process.exit(0);
    },
  );
});
