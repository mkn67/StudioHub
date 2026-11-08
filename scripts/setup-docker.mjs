import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const target = new URL("../.env.compose", import.meta.url);
let template = await readFile(new URL("../.env.example", import.meta.url), "utf8");
for (const key of ["LOCAL_JWT_SECRET", "LOCAL_HELPDESK_BRIDGE_SECRET"]) {
  template = template.replace(new RegExp(`^${key}=$`, "m"), `${key}=${randomBytes(32).toString("hex")}`);
}
try {
  await writeFile(target, template, { flag: "wx", mode: 0o600 });
  console.log("Created .env.compose with local Compose settings and random secrets; existing .env was left untouched.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log(".env.compose already exists; left unchanged. Ensure local secret values contain at least 32 characters.");
}
