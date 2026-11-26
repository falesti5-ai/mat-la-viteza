const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

test("modul fără internet: fișierele din index.html sunt toate salvate de sw.js", () => {
  const html = rd("index.html"), sw = rd("sw.js");
  const refs = [...html.matchAll(/(?:src|href)="([^"]+\?v=\d+)"/g)].map(m => m[1]);
  assert.ok(refs.length >= 7);
  for (const r of refs) assert.ok(sw.includes(`"${r}"`), "lipsește din sw.js: " + r);
  const ver = refs[0].split("?v=")[1];
  assert.ok(sw.includes(`mlv-${ver}`), "VER din sw.js nu se potrivește cu ?v=");
  for (const f of [...sw.matchAll(/"([\w./-]+\.(?:png|woff2|webmanifest))"/g)].map(m => m[1])) assert.ok(fs.existsSync(path.join(__dirname, "..", f)), f);
  assert.ok(!html.includes("fonts.googleapis"), "fontul trebuie să fie local");
});
