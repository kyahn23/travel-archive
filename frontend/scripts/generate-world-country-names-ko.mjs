#!/usr/bin/env node
// Travel Archive - Korean geography label generator.
//
// Pins Unicode CLDR 48.2.0 territory/numeric mappings and renders a static
// TypeScript module checked into the repository. No network at runtime;
// Node 20 built-ins only. CLI execution is guarded so the test file can
// import pure functions without invoking fetch.
//
// Regenerate:  node frontend/scripts/generate-world-country-names-ko.mjs
// Verify only: node frontend/scripts/generate-world-country-names-ko.mjs --check
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

// ponytail: pinned CLDR 48.2.0 endpoints and known hashes. Update together with
// the pinned upstream tag; bumping the CLDR release is a Wave 2 task.
const CODE_MAPPINGS_URL =
  "https://raw.githubusercontent.com/unicode-org/cldr-json/48.2.0/cldr-json/cldr-core/supplemental/codeMappings.json";
const CODE_MAPPINGS_SHA256 =
  "0d1ef50b92c1140e5847d22d96faf1a9c35543b0dedf8e9a2fcb87e4c51b9ed6";
const TERRITORIES_URL =
  "https://raw.githubusercontent.com/unicode-org/cldr-json/48.2.0/cldr-json/cldr-localenames-full/main/ko/territories.json";
const TERRITORIES_SHA256 =
  "47b2f98d9cbf823068b0594074fe5db7fde80f9baf6a8038bd24ed81aefe7829";
const LICENSE_URL =
  "https://raw.githubusercontent.com/unicode-org/cldr-json/48.2.0/cldr-json/cldr-localenames-full/LICENSE";
const LICENSE_SHA256 =
  "b49d0e9f8ead51ca8b7df6fec89cc3ae6809198b4b9d43c74216da0118f23f5b";
const UN_M49_REFERENCE_URL = "https://unstats.un.org/unsd/methodology/m49/overview";
const MOFA_SOMALILAND_URL =
  "https://www.mofa.go.kr/www/nation/m_3458/view.do?seq=161";
const CLDR_VERSION = "48.2.0";

// ID-less topology names -> Korean label. Sourced explicitly:
//   Kosovo      -> CLDR XK entry, current spelling.
//   N. Cyprus   -> topology-specific transliteration, not present in CLDR.
//   Somaliland  -> MOFA cited spelling, matches Somaliland reference text.
const ALIAS_LABELS = Object.freeze({
  Kosovo: "코소보",
  "N. Cyprus": "북키프로스",
  Somaliland: "소말릴란드",
});

// ponytail: zero deps, zero side effects on import. Pure helpers live up here
// and are the only thing the node:test suite imports.
export function sha256Hex(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function readJsonStrict(raw, label) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${label}: invalid JSON (${err.message})`);
  }
  return parsed;
}

function requireSourceShape(label, payload, pathParts) {
  let cursor = payload;
  for (const part of pathParts) {
    if (cursor == null || typeof cursor !== "object" || !(part in cursor)) {
      throw new Error(
        `${label}: missing required key at ${pathParts.join(".")}`,
      );
    }
    cursor = cursor[part];
  }
  return cursor;
}

function normalizeM49(value) {
  if (value == null) return null;
  const digits = String(value).match(/^\d+$/) ? String(value) : null;
  if (!digits) return null;
  if (digits.length > 3) return null;
  return digits.padStart(3, "0");
}

// Collects every current alpha-2 -> numeric mapping that matches the topology
// IDs we care about. Filters by the three current-code conditions in the plan.
export function resolveNumericMap({
  codeMappings,
  territories,
  topologyIds,
}) {
  const codeNumeric = new Map(); // alpha-2 -> normalized m49
  const candidatesByNumeric = new Map(); // normalized m49 -> Set<alpha-2>

  for (const [key, value] of Object.entries(codeMappings || {})) {
    if (!/^[A-Z]{2}$/.test(key)) continue;
    const numeric = normalizeM49(value?._numeric);
    if (!numeric) continue;
    codeNumeric.set(key, numeric);
    if (!candidatesByNumeric.has(numeric)) candidatesByNumeric.set(numeric, []);
    candidatesByNumeric.get(numeric).push(key);
  }

  const labels = new Map();
  const ambiguous = [];
  const blank = [];
  for (const id of topologyIds) {
    const cands = (candidatesByNumeric.get(id) || []).filter((alpha2) => {
      const label = territories?.[alpha2];
      return typeof label === "string" && label.trim().length > 0;
    });
    if (cands.length === 0) {
      blank.push(id);
      continue;
    }
    if (cands.length > 1) {
      ambiguous.push({ id, codes: cands });
      continue;
    }
    labels.set(id, territories[cands[0]].trim());
  }

  return { labels, ambiguous, blank };
}

// Aliases are fixed policy choices, not derived. This helper just enforces the
// shape so callers/tests get a single error surface.
export function resolveAliases() {
  return { ...ALIAS_LABELS };
}

function escapeForDoubleQuoted(value) {
  // Strict ASCII-safe escape: backslash and double-quote only.
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function renderObject(getValue, orderedKeys, sortKeys) {
  const keys = sortKeys ? [...orderedKeys].sort() : orderedKeys;
  const lines = keys.map((k) => {
    const v = getValue(k);
    if (typeof v !== "string") {
      throw new Error(`renderObject: missing value for key ${JSON.stringify(k)}`);
    }
    return `  ${JSON.stringify(k)}: ${JSON.stringify(escapeForDoubleQuoted(v))},`;
  });
  return ["{", ...lines, "}"].join("\n");
}

export function renderOutput({ labels, aliases }) {
  if (labels.size === 0) throw new Error("renderOutput: labels is empty");
  const aliasKeys = Object.keys(aliases);
  if (aliasKeys.length !== 3) {
    throw new Error(
      `renderOutput: expected 3 aliases, got ${aliasKeys.length}`,
    );
  }
  const orderedM49 = [...labels.keys()].sort();
  const header = [
    "/**",
    " * Korean display names for every bundled world geography.",
    " *",
    ` * Generated from Unicode CLDR ${CLDR_VERSION} (pinned). Do NOT edit by hand.`,
    " *",
    " * Pinned sources:",
    ` *   - ${CODE_MAPPINGS_URL}`,
    ` *       sha256: ${CODE_MAPPINGS_SHA256}`,
    ` *   - ${TERRITORIES_URL}`,
    ` *       sha256: ${TERRITORIES_SHA256}`,
    " *",
    " * Reference URLs:",
    ` *   - UN M49:        ${UN_M49_REFERENCE_URL}`,
    ` *   - MOFA Somaliland spelling: ${MOFA_SOMALILAND_URL}`,
    " *",
    ` * Unicode license text lives next to this file (./UNICODE-LICENSE.txt).`,
    ` *   sha256: ${LICENSE_SHA256}`,
    " *",
    " * Regenerate: node frontend/scripts/generate-world-country-names-ko.mjs",
    " * Verify only: node frontend/scripts/generate-world-country-names-ko.mjs --check",
    " *",
    " * SPDX-License-Identifier: Unicode-3.0",
    " */",
  ].join("\n");

  const m49Body = renderObject((k) => labels.get(k), orderedM49, true);
  const aliasKeysOrdered = [...aliasKeys].sort();
  const aliasBody = renderObject((k) => aliases[k], aliasKeysOrdered, false);

  const tail = [
    header,
    "",
    "export const WORLD_COUNTRY_NAMES_M49 = " + m49Body + " as const;",
    "",
    "export const WORLD_COUNTRY_ALIASES = " + aliasBody + " as const;",
    "",
  ];
  // LF endings, exactly one trailing newline.
  return tail.join("\n");
}

async function fetchAndVerify(url, expectedHash) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${url}: HTTP ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const sha = sha256Hex(Buffer.from(text, "utf8"));
  if (sha !== expectedHash) {
    throw new Error(
      `${url}: sha256 mismatch\n  expected ${expectedHash}\n  got      ${sha}`,
    );
  }
  return { text, sha256: sha };
}

function loadTopologyIdsFromObject(world) {
  const geos = world?.objects?.countries?.geometries;
  if (!Array.isArray(geos)) throw new Error("topology: missing geometries array");
  const ids = [];
  const aliases = [];
  for (const g of geos) {
    if (g?.id) {
      ids.push(String(g.id));
    } else if (g?.properties?.name) {
      aliases.push(g.properties.name);
    }
  }
  return { numericIds: ids, aliasIds: aliases };
}

// Create the require function only inside the CLI entry; tests bypass it.
function createNodeRequire() {
  return createRequire(import.meta.url);
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  if (args.length > 1 || (args.length === 1 && !checkOnly)) {
    process.stderr.write(
      "usage: node generate-world-country-names-ko.mjs [--check]\n",
    );
    process.exit(2);
  }

  const nodeRequire = createNodeRequire();
  const here = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(here, "..");
  const repoRoot = path.resolve(frontendRoot, "..");
  const topologyPath = path.join(frontendRoot, "src/lib/geo/world-110m.json");
  const outTs = path.join(frontendRoot, "src/lib/geo/world-country-names-ko.ts");
  const outLicense = path.join(frontendRoot, "src/lib/geo/UNICODE-LICENSE.txt");

  const topology = nodeRequire(topologyPath);
  const { numericIds, aliasIds } = loadTopologyIdsFromObject(topology);
  const expectedAliases = resolveAliases();
  const aliasSet = new Set(aliasIds);
  for (const name of Object.keys(expectedAliases)) {
    if (!aliasSet.has(name)) {
      throw new Error(`topology alias "${name}" missing from world-110m.json`);
    }
  }
  for (const name of aliasIds) {
    if (!(name in expectedAliases)) {
      throw new Error(
        `topology has unexpected alias "${name}" not in generator table`,
      );
    }
  }

  const [cm, terr, lic] = await Promise.all([
    fetchAndVerify(CODE_MAPPINGS_URL, CODE_MAPPINGS_SHA256),
    fetchAndVerify(TERRITORIES_URL, TERRITORIES_SHA256),
    fetchAndVerify(LICENSE_URL, LICENSE_SHA256),
  ]);

  const cmJson = readJsonStrict(cm.text, "codeMappings.json");
  const terrJson = readJsonStrict(terr.text, "territories.json");
  const codeMappings = requireSourceShape(
    "codeMappings.json",
    cmJson,
    ["supplemental", "codeMappings"],
  );
  const territories = requireSourceShape(
    "territories.json",
    terrJson,
    ["main", "ko", "localeDisplayNames", "territories"],
  );

  const { labels, ambiguous, blank } = resolveNumericMap({
    supplemental: cmJson.supplemental,
    codeMappings,
    territories,
    topologyIds: numericIds,
  });

  const sortedTopology = [...numericIds].sort();
  const sortedLabels = [...labels.keys()].sort();
  if (ambiguous.length > 0) {
    throw new Error(
      `ambiguous alpha-2 candidates for: ${ambiguous
        .map((a) => `${a.id} -> ${a.codes.join(",")}`)
        .join("; ")}`,
    );
  }
  if (blank.length > 0) {
    throw new Error(`missing Korean label for M49: ${blank.join(", ")}`);
  }
  if (sortedTopology.length !== sortedLabels.length) {
    throw new Error(
      `topology count ${sortedTopology.length} != label count ${sortedLabels.length}`,
    );
  }
  for (let i = 0; i < sortedTopology.length; i++) {
    if (sortedTopology[i] !== sortedLabels[i]) {
      throw new Error(
        `M49 key mismatch at ${i}: topology ${sortedTopology[i]} vs labels ${sortedLabels[i]}`,
      );
    }
  }

  const tsContent = renderOutput({ labels, aliases: expectedAliases });
  const licenseContent = lic.text;

  if (checkOnly) {
    const errors = [];
    let actualTs;
    try {
      actualTs = await readFile(outTs, "utf8");
    } catch {
      errors.push(`missing checked-in file: ${outTs}`);
    }
    if (actualTs !== undefined && actualTs !== tsContent) {
      const expected = tsContent.split("\n");
      const actual = actualTs.split("\n");
      const max = Math.max(expected.length, actual.length);
      const diffs = [];
      for (let i = 0; i < max; i++) {
        if (expected[i] !== actual[i]) {
          diffs.push(
            `  line ${i + 1}:\n    expected: ${JSON.stringify(expected[i] ?? "")}\n    actual:   ${JSON.stringify(actual[i] ?? "")}`,
          );
        }
      }
      errors.push(
        `${outTs}: content mismatch (${diffs.length} differing lines)\n${diffs.slice(0, 20).join("\n")}`,
      );
    }

    let actualLicense;
    try {
      actualLicense = await readFile(outLicense);
    } catch {
      errors.push(`missing checked-in file: ${outLicense}`);
    }
    if (actualLicense !== undefined) {
      const expectedBuf = Buffer.from(licenseContent, "utf8");
      const actualSha = sha256Hex(actualLicense);
      const expectedSha = sha256Hex(expectedBuf);
      if (actualSha !== expectedSha) {
        errors.push(
          `${outLicense}: sha256 mismatch\n  expected ${expectedSha}\n  got      ${actualSha}`,
        );
      } else if (!actualLicense.equals(expectedBuf)) {
        errors.push(`${outLicense}: bytes differ but sha256 collides`);
      }
    }

    if (errors.length > 0) {
      process.stderr.write(errors.join("\n") + "\n");
      process.exit(1);
    }
    process.stdout.write("ok\n");
    return;
  }

  await writeFile(outTs, tsContent, "utf8");
  await writeFile(outLicense, licenseContent, "utf8");
  process.stdout.write(
    `wrote ${path.relative(repoRoot, outTs)} and ${path.relative(repoRoot, outLicense)}\n`,
  );
}

import { createRequire } from "node:module";

const isCli =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  main().catch((err) => {
    process.stderr.write(`generate-world-country-names-ko: ${err.stack || err}\n`);
    process.exit(1);
  });
}