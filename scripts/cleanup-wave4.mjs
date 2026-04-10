import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const STAGING = '/Users/egor/Desktop/Claude Code/wordpunk/data/staging/wave4';

// Words to remove from specific files (fake closed compounds + dupes)
const REMOVALS = {
  'hotel.csv': new Set([
    'pillowtop', 'memoryfoam', 'bodywash', 'bugspray', 'lipbalm',
    'bathbomb', 'ironingboard', 'hotstone', 'deeptissue', 'bodyscrub',
    'bathsalt', 'rackrate', 'bestavailable', 'ratecard', 'winelist',
    'poolbar',
    'overbooking', // dupe with airport
  ]),
  'science.csv': new Set([
    'antibody', // dupe with doctor, same meaning
  ]),
};

// In-place edits: {file: {english: {newSentence?, newRu?}}}
const EDITS = {
  'hotel.csv': {
    swedish: { sentence: 'She booked a relaxing **Swedish** massage appointment.' },
    thai:    { sentence: 'I tried a traditional **Thai** massage at the spa.' },
  },
};

function parseLine(line) {
  const cells = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; continue; }
      inQ = !inQ; continue;
    }
    if (c === ',' && !inQ) { cells.push(cur); cur = ''; continue; }
    cur += c;
  }
  cells.push(cur);
  return cells;
}

function csvEscape(s) {
  if (s.includes(',') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

for (const [file, removals] of Object.entries(REMOVALS)) {
  const path = join(STAGING, file);
  const lines = readFileSync(path, 'utf8').split('\n');
  const kept = [];
  let removed = 0;
  let edited = 0;
  const edits = EDITS[file] || {};

  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = parseLine(line);
    if (cells.length !== 5) { kept.push(line); continue; }
    const [en, ru, sentence, diff, topic] = cells.map(s => s.trim());
    const enLower = en.toLowerCase();

    if (removals.has(enLower)) {
      removed++;
      continue;
    }

    if (edits[enLower]) {
      const e = edits[enLower];
      const newRow = [
        en,
        e.russian || ru,
        csvEscape(e.sentence || sentence),
        diff,
        topic,
      ].join(',');
      kept.push(newRow);
      edited++;
      continue;
    }

    kept.push(line);
  }

  writeFileSync(path, kept.join('\n') + '\n');
  console.log(`[${file}] removed ${removed}, edited ${edited}, kept ${kept.length}`);
}
