import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const target = new URL("../.env", import.meta.url);
let template = await readFile(new URL("../.env.example", import.meta.url), "utf8");
for (const key of ["JWT_SECRET", "HELPDESK_BRIDGE_SECRET"]) {
  template = template.replace(new RegExp(`^${key}=$`, "m"), `${key}=${randomBytes(32).toString("hex")}`);
}
try {
  await writeFile(target, template, { flag: "wx", mode: 0o600 });
  console.log("Created root .env with local Docker settings and random secrets.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log("Root .env already exists; left unchanged. Ensure JWT_SECRET and HELPDESK_BRIDGE_SECRET contain at least 32 characters.");
}
