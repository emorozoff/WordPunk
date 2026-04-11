import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = '/Users/egor/Desktop/Claude Code/wordpunk';
const S = join(ROOT, 'data/staging/wave7');

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

function toCSVLine(cells) {
  return cells.map((c, i) => {
    // sentence (col 2) — wrap in quotes if contains comma
    if (i === 2 && c.includes(',')) return '"' + c.replace(/"/g, '""') + '"';
    return c;
  }).join(',');
}

function fixFile(filename, removeFn) {
  const path = join(S, filename);
  const lines = readFileSync(path, 'utf8').split('\n').filter(l => l.trim());
  const kept = [];
  let removed = 0;
  for (const line of lines) {
    const cells = parseLine(line);
    // Auto-join bad rows (cols > 5): middle cols are the sentence
    let fixed = cells;
    if (cells.length > 5) {
      const en = cells[0];
      const ru = cells[1];
      const sentence = cells.slice(2, cells.length - 2).join(',');
      const diff = cells[cells.length - 2];
      const topic = cells[cells.length - 1];
      fixed = [en, ru, sentence, diff, topic];
    }
    if (fixed.length !== 5) { removed++; continue; }
    if (removeFn && removeFn(fixed[0].trim().toLowerCase())) { removed++; continue; }
    kept.push(toCSVLine(fixed));
  }
  writeFileSync(path, kept.join('\n') + '\n');
  console.log(`${filename}: kept ${kept.length}, removed ${removed}`);
}

// airport.csv: remove DB collision 'surcharge'
fixFile('airport.csv', w => ['surcharge'].includes(w));

// bank.csv: fix bad format row only (join cols), no word removals
fixFile('bank.csv', null);

// batch32.csv: fix bad format row only
fixFile('batch32.csv', null);

// home.csv: remove 18 DB collisions
const homeRemove = new Set([
  'hallway','patio','cellar','dresser','nightstand','chandelier',
  'blender','plumber','driveway','scrub','wipe','storage',
  'blinds','loft','radiator','extension','damp'
]);
fixFile('home.csv', w => homeRemove.has(w));

// hotel.csv: remove cross-file dupes check-in, overbook, waiver, service charge
//            (keeping them in airport.csv and restaurant.csv respectively)
fixFile('hotel.csv', w => ['check-in','overbook','waiver','service charge'].includes(w));

// batch35.csv: remove 'inch' (duplicate of batch34)
fixFile('batch35.csv', w => ['inch'].includes(w));

console.log('\nDone.');
