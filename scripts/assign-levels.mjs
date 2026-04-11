// Assign a SUBTLEX-frequency-based "freqLevel" (1-10) to every unique
// English headword in data/raw/*.csv.
//
// Output: data/levels.json — { "word": level, ... }
//
// Scale:
//   L1: SUBTLEX rank 1-200       (most common: "the", "be", "I")
//   L2: 201-500
//   L3: 501-1200
//   L4: 1201-2500
//   L5: 2501-5000
//   L6: 5001-8000
//   L7: 8001-13000
//   L8: 13001-20000
//   L9: 20001-35000
//   L10: 35001+ OR not in SUBTLEX-50k at all (specialized vocabulary)
//
// Multi-word phrases ("wake-up call", "service charge", "carry-on"):
//   freqLevel = max(component levels) + 1, capped at 10.
//
// Single words not found in SUBTLEX: L9 (assumed specialized).

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = '/Users/egor/Desktop/Claude Code/wordpunk';
const SUBTLEX = join(ROOT, 'data/freq/subtlex_50k.txt');
const RAW = join(ROOT, 'data/raw');
const OUT = join(ROOT, 'data/levels.json');

// --- Load SUBTLEX 50k into a rank map ------------------------------------
function loadSubtlex() {
  const text = readFileSync(SUBTLEX, 'utf8');
  const lines = text.split('\n').filter(l => l.trim());
  const rank = new Map();
  lines.forEach((line, i) => {
    const word = line.split(/\s+/)[0].toLowerCase();
    if (word && !rank.has(word)) rank.set(word, i + 1);
  });
  return rank;
}

// --- SUBTLEX rank → freqLevel ---------------------------------------------
function rankToLevel(r) {
  if (r == null) return null;        // not in SUBTLEX
  if (r <= 200)   return 1;
  if (r <= 500)   return 2;
  if (r <= 1200)  return 3;
  if (r <= 2500)  return 4;
  if (r <= 5000)  return 5;
  if (r <= 8000)  return 6;
  if (r <= 13000) return 7;
  if (r <= 20000) return 8;
  if (r <= 35000) return 9;
  return 10;
}

// --- Parse CSV line --------------------------------------------------------
function parseCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else {
      if (ch === ',') { fields.push(cur); cur = ''; }
      else if (ch === '"' && cur === '') inQ = true;
      else cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

// --- Collect all unique headwords -----------------------------------------
function collectWords() {
  const set = new Set();
  for (const f of readdirSync(RAW)) {
    if (!f.endsWith('.csv')) continue;
    const text = readFileSync(join(RAW, f), 'utf8');
    const lines = text.split('\n').slice(1);
    for (const line of lines) {
      if (!line.trim()) continue;
      const fields = parseCsvLine(line);
      const en = (fields[0] || '').trim().toLowerCase();
      if (en) set.add(en);
    }
  }
  return set;
}

// --- Assign a level to one headword ---------------------------------------
function assignLevel(headword, rankMap) {
  const lower = headword.toLowerCase().trim();

  // Single word — direct lookup
  if (!/[\s\-]/.test(lower)) {
    const r = rankMap.get(lower);
    if (r != null) return rankToLevel(r);
    // Try plural/simple inflection stripping
    if (lower.endsWith('s') && rankMap.has(lower.slice(0, -1))) {
      return rankToLevel(rankMap.get(lower.slice(0, -1)));
    }
    if (lower.endsWith('ed') && rankMap.has(lower.slice(0, -2))) {
      return rankToLevel(rankMap.get(lower.slice(0, -2)));
    }
    if (lower.endsWith('ing') && rankMap.has(lower.slice(0, -3))) {
      return rankToLevel(rankMap.get(lower.slice(0, -3)));
    }
    // Single word not found → specialized, L9
    return 9;
  }

  // Multi-word phrase — split on spaces and hyphens, take max + 1
  const parts = lower.split(/[\s\-]+/).filter(p => p.length > 0);
  let maxLevel = 0;
  let unknownParts = 0;
  for (const p of parts) {
    const r = rankMap.get(p);
    if (r != null) {
      const l = rankToLevel(r);
      if (l > maxLevel) maxLevel = l;
    } else {
      unknownParts++;
    }
  }
  if (maxLevel === 0 && unknownParts === parts.length) {
    // All components unknown — rare specialized phrase
    return 10;
  }
  // Phrase is harder than its hardest component
  return Math.min(10, maxLevel + 1);
}

// --- Main ------------------------------------------------------------------
const rankMap = loadSubtlex();
console.log(`Loaded SUBTLEX: ${rankMap.size} unique words`);

const words = collectWords();
console.log(`Collected ${words.size} unique headwords from raw CSVs`);

const levels = {};
const dist = {};
let multiWord = 0;
let specialized = 0;

for (const w of words) {
  const level = assignLevel(w, rankMap);
  levels[w] = level;
  dist[level] = (dist[level] || 0) + 1;
  if (/[\s\-]/.test(w)) multiWord++;
  if (level >= 9) specialized++;
}

// Sort levels object alphabetically for stable git diffs
const sorted = Object.fromEntries(
  Object.entries(levels).sort(([a], [b]) => a.localeCompare(b))
);

writeFileSync(OUT, JSON.stringify(sorted, null, 2) + '\n');

console.log(`\nFreq-level distribution:`);
for (let l = 1; l <= 10; l++) {
  const n = dist[l] || 0;
  const pct = ((n / words.size) * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(n / 40));
  console.log(`  L${l.toString().padStart(2)}: ${n.toString().padStart(5)} (${pct}%) ${bar}`);
}
console.log(`\nMulti-word phrases: ${multiWord}`);
console.log(`Specialized (L9-L10): ${specialized}`);
console.log(`\nWrote ${OUT}`);
