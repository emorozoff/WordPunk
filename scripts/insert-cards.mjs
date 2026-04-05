import { readFileSync, writeFileSync } from 'fs';
import { existsSync } from 'fs';

const wordsPath = '/Users/egor/Desktop/Claude Code/wordpunk/src/data/words.ts';
const topics = [
  'home', 'restaurant', 'school', 'shopping', 'airport',
  'doctor', 'nature', 'hotel', 'bank', 'work',
  'family', 'driving', 'science', 'health', 'politics',
  'kitchen', 'internet', 'leisure', 'sports', 'basic'
];

// Read current words.ts
let content = readFileSync(wordsPath, 'utf-8');

// Find the closing ]; and insert before it
const closingIdx = content.lastIndexOf('];');
if (closingIdx === -1) {
  console.error('Could not find closing ]; in words.ts');
  process.exit(1);
}

let toInsert = '\n';
let totalCards = 0;

for (const topic of topics) {
  const cardFile = `/tmp/cards_${topic}.ts`;
  if (!existsSync(cardFile)) {
    console.warn(`WARNING: Missing card file for ${topic}`);
    continue;
  }
  const cards = readFileSync(cardFile, 'utf-8').trim();
  if (!cards || cards.length < 10) {
    console.warn(`WARNING: Empty card file for ${topic}`);
    continue;
  }
  // Count cards
  const count = (cards.match(/\{ id: '/g) || []).length;
  console.log(`${topic}: inserting ${count} cards`);
  totalCards += count;
  toInsert += `  // ${topic} expansion\n`;
  // Normalize indentation: ensure each line starts with 2 spaces if it starts with {
  const lines = cards.split('\n').map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('{ id:')) return '  ' + trimmed;
    return line;
  });
  toInsert += lines.join('\n') + '\n';
}

// Insert before the closing ];
const newContent = content.slice(0, closingIdx) + toInsert + content.slice(closingIdx);
writeFileSync(wordsPath, newContent, 'utf-8');

console.log(`\nInserted ${totalCards} total cards into words.ts`);
