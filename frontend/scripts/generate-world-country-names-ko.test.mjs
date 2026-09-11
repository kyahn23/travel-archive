#!/usr/bin/env node
// Travel Archive - Korean label generator tests (node:test).
//
// Run: node --test frontend/scripts/generate-world-country-names-ko.test.mjs
//
// These tests exercise pure helpers exported by generate-world-country-names-ko.mjs
// and never touch the network or the checked-in output. --check is verified by
// running the CLI twice and asserting the file mtime/size stays identical.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  renderOutput,
  resolveAliases,
  resolveNumericMap,
  sha256Hex,
} from "./generate-world-country-names-ko.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const outTs = path.join(frontendRoot, "src/lib/geo/world-country-names-ko.ts");
const outLicense = path.join(frontendRoot, "src/lib/geo/UNICODE-LICENSE.txt");
const topologyPath = path.join(frontendRoot, "src/lib/geo/world-110m.json");

// Fixture A: current codes only, every alpha-2 has a nonblank Korean label.
function currentOnlyFixtures() {
  return {
    codeMappings: {
      KP: { _numeric: "408" },
      KR: { _numeric: "410" },
      CD: { _numeric: "180" },
      TL: { _numeric: "626" },
      AQ: { _numeric: "010" },
      PS: { _numeric: "275" },
      EH: { _numeric: "732" },
    },
    territories: {
      KP: "북한",
      KR: "대한민국",
      CD: "콩고-킨샤사",
      TL: "동티모르",
      AQ: "남극 대륙",
      PS: "팔레스타인 지구",
      EH: "서사하라",
    },
    topologyIds: ["408", "410", "180", "626", "010", "275", "732"],
  };
}

// Fixture B: adds historical ZR/TP and alpha-3 DZD to exercise current-code rules.
function historicalFixtures() {
  const fx = currentOnlyFixtures();
  fx.codeMappings.ZR = { _numeric: "180" };
  fx.codeMappings.TP = { _numeric: "626" };
  fx.codeMappings.DZ = { _numeric: "012" };
  fx.codeMappings.DZD = { _numeric: "012" }; // alpha-3, must be ignored
  fx.territories.DZ = "알제리";
  fx.territories.ZR = ""; // explicit blank -> not a candidate
  fx.territories.TP = "";
  return fx;
}

test("sha256Hex matches Node crypto for known inputs", () => {
  assert.equal(
    sha256Hex(Buffer.from("abc")),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("resolveAliases returns exactly the three fixed topology aliases", () => {
  const aliases = resolveAliases();
  assert.deepEqual(
    Object.keys(aliases).sort(),
    ["Kosovo", "N. Cyprus", "Somaliland"],
  );
  assert.equal(aliases.Kosovo, "코소보");
  assert.equal(aliases["N. Cyprus"], "북키프로스");
  assert.equal(aliases.Somaliland, "소말릴란드");
});

test("resolveNumericMap selects current alpha-2 over historical codes", () => {
  const fx = historicalFixtures();
  const { labels, ambiguous, blank } = resolveNumericMap(fx);
  assert.deepEqual(ambiguous, []);
  assert.deepEqual(blank, []);
  assert.equal(labels.get("180"), "콩고-킨샤사");
  assert.equal(labels.get("626"), "동티모르");
  assert.equal(labels.get("010"), "남극 대륙");
  assert.equal(labels.get("275"), "팔레스타인 지구");
  assert.equal(labels.get("732"), "서사하라");
  assert.equal(labels.get("408"), "북한");
  assert.equal(labels.get("410"), "대한민국");
});

test("resolveNumericMap reports ambiguous numeric IDs when two nonblank candidates exist", () => {
  const fx = historicalFixtures();
  fx.codeMappings.CG = { _numeric: "180" };
  fx.territories.CG = "콩고-브라자빌";
  const { ambiguous, labels } = resolveNumericMap(fx);
  assert.equal(ambiguous.length, 1);
  assert.equal(ambiguous[0].id, "180");
  assert.deepEqual(ambiguous[0].codes.sort(), ["CD", "CG"]);
  assert.equal(labels.get("180"), undefined);
});

test("resolveNumericMap reports a missing label as blank, not ambiguous", () => {
  const fx = historicalFixtures();
  delete fx.territories.EH;
  const { blank, labels, ambiguous } = resolveNumericMap(fx);
  assert.deepEqual(ambiguous, []);
  assert.deepEqual(blank, ["732"]);
  assert.equal(labels.get("732"), undefined);
});

test("resolveNumericMap rejects blank or non-string labels", () => {
  const fx = historicalFixtures();
  fx.territories.KP = "";
  delete fx.territories.KR;
  const { blank, labels } = resolveNumericMap(fx);
  assert.equal(labels.get("408"), undefined);
  assert.equal(labels.get("410"), undefined);
  assert.ok(blank.includes("408"));
  assert.ok(blank.includes("410"));
});

test("resolveNumericMap ignores alpha-3 keys for current-code selection", () => {
  const fx = historicalFixtures();
  const { labels, ambiguous } = resolveNumericMap({
    ...fx,
    topologyIds: ["012"],
  });
  assert.deepEqual(ambiguous, []);
  assert.equal(labels.get("012"), "알제리"); // DZ wins, DZD is alpha-3
});

test("renderOutput emits lexicographically sorted, LF-terminated map with required labels", () => {
  const fx = currentOnlyFixtures();
  const { labels } = resolveNumericMap(fx);
  const aliases = resolveAliases();
  const out = renderOutput({ labels, aliases });

  // Must end with exactly one trailing LF.
  assert.equal(out.endsWith("\n"), true);
  assert.equal(out.endsWith("\n\n"), false);

  // No CRLF, no exotic whitespace.
  assert.equal(out.includes("\r"), false);

  // Representative labels present and intact.
  assert.match(out, /"180": "콩고-킨샤사"/);
  assert.match(out, /"626": "동티모르"/);
  assert.match(out, /"732": "서사하라"/);
  assert.match(out, /"275": "팔레스타인 지구"/);
  assert.match(out, /"010": "남극 대륙"/);
  assert.match(out, /"408": "북한"/);
  assert.match(out, /"410": "대한민국"/);

  // Aliases appear with explicit Korean spelling.
  assert.match(out, /"Kosovo": "코소보"/);
  assert.match(out, /"N\. Cyprus": "북키프로스"/);
  assert.match(out, /"Somaliland": "소말릴란드"/);

  // Sorting: every M49 line in lexicographic order.
  const m49Lines = out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\s*"0\d{2}":/.test(l));
  const ids = m49Lines.map((l) => l.match(/"(\d{3})":/)[1]);
  const sorted = [...ids].sort();
  assert.deepEqual(ids, sorted);

  // SPDX + source provenance present.
  assert.match(out, /SPDX-License-Identifier: Unicode-3.0/);
  assert.match(out, /0d1ef50b92c1140e5847d22d96faf1a9c35543b0dedf8e9a2fcb87e4c51b9ed6/);
  assert.match(out, /47b2f98d9cbf823068b0594074fe5db7fde80f9baf6a8038bd24ed81aefe7829/);
  assert.match(out, /b49d0e9f8ead51ca8b7df6fec89cc3ae6809198b4b9d43c74216da0118f23f5b/);
  assert.match(out, /raw\.githubusercontent\.com\/unicode-org\/cldr-json/);
  assert.match(out, /unstats\.un\.org\/unsd\/methodology\/m49\/overview/);
  assert.match(out, /mofa\.go\.kr\/www\/nation\/m_3458\/view\.do\?seq=161/);
});

test("renderOutput refuses mismatched alias counts and empty labels", () => {
  const fx = currentOnlyFixtures();
  const { labels } = resolveNumericMap(fx);
  assert.throws(
    () => renderOutput({ labels, aliases: { Kosovo: "코소보" } }),
    /expected 3 aliases/,
  );
  assert.throws(
    () => renderOutput({ labels: new Map(), aliases: resolveAliases() }),
    /labels is empty/,
  );
});

test("checked-in TypeScript and license files match --check output without writes", async () => {
  const statBefore = async () => ({
    ts: await stat(outTs),
    lic: await stat(outLicense),
  });
  const before = await statBefore();
  execFileSync(
    "node",
    ["scripts/generate-world-country-names-ko.mjs", "--check"],
    { cwd: frontendRoot, stdio: "pipe" },
  );
  const after = await statBefore();
  assert.equal(before.ts.mtimeMs, after.ts.mtimeMs, "ts mtime must not change");
  assert.equal(before.ts.size, after.ts.size, "ts size must not change");
  assert.equal(
    before.lic.mtimeMs,
    after.lic.mtimeMs,
    "license mtime must not change",
  );
  assert.equal(before.lic.size, after.lic.size, "license size must not change");

  // License SHA must match the pinned CLDR 48.2.0 LICENSE.
  const licenseBuf = await readFile(outLicense);
  assert.equal(
    sha256Hex(licenseBuf),
    "b49d0e9f8ead51ca8b7df6fec89cc3ae6809198b4b9d43c74216da0118f23f5b",
  );

  // Topology must contain 177 geometries with 174 numeric + 3 aliases.
  const raw = await readFile(topologyPath, "utf8");
  const topo = JSON.parse(raw);
  const geos = topo.objects.countries.geometries;
  const numericIds = geos.filter((g) => g.id).map((g) => String(g.id));
  const aliases = geos.filter((g) => !g.id).map((g) => g.properties?.name);
  assert.equal(geos.length, 177);
  assert.equal(new Set(numericIds).size, 174);
  assert.equal(numericIds.length, 174);
  assert.deepEqual(aliases.sort(), ["Kosovo", "N. Cyprus", "Somaliland"]);
});