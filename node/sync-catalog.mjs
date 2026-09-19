// Keep a local copy of the catalogue metadata. One request a day; 304 until a new version ships.
//   node sync-catalog.mjs        writes catalog.json and catalog.etag next to this file
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const EB = process.env.EB_BASE ?? "https://exercisebank.net/v1";
const etag = existsSync("catalog.etag") ? readFileSync("catalog.etag", "utf8") : "";
const res = await fetch(`${EB}/catalog`, { headers: { authorization: `Bearer ${process.env.EB_KEY}`, ...(etag ? { "if-none-match": etag } : {}) } });
if (res.status === 304) console.log("Catalogue unchanged.");
else if (res.ok) {
  const catalog = await res.json();
  writeFileSync("catalog.json", JSON.stringify(catalog));
  writeFileSync("catalog.etag", res.headers.get("etag") ?? "");
  console.log(`Catalogue ${catalog.version}: ${catalog.count} exercises saved. /v1/changelog lists what changed.`);
} else console.error(res.status, await res.text());
