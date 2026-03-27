import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Card, CardProgress, DayActivity } from '../types';

interface WordPunkDB extends DBSchema {
  cards: {
    key: string;
    value: Card;
    indexes: { 'by-topic': string };
  };
  progress: {
    key: string;
    value: CardProgress;
    indexes: { 'by-next-review': string; 'by-level': number };
  };
  activity: {
    key: string; // ISO date "2026-04-01"
    value: DayActivity;
  };
}

let _db: IDBPDatabase<WordPunkDB> | null = null;

async function getDB(): Promise<IDBPDatabase<WordPunkDB>> {
  if (_db) return _db;
  _db = await openDB<WordPunkDB>('wordpunk', 1, {
    upgrade(db) {
      const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
      cardStore.createIndex('by-topic', 'topicId');

      const progressStore = db.createObjectStore('progress', { keyPath: 'cardId' });
      progressStore.createIndex('by-next-review', 'nextReviewDate');
      progressStore.createIndex('by-level', 'level');

      db.createObjectStore('activity', { keyPath: 'date' });
    },
  });
  return _db;
}

// ── Cards ──────────────────────────────────────────────────────────────────

export async function getAllCards(): Promise<Card[]> {
  const db = await getDB();
  return db.getAll('cards');
}

export async function getCardsByTopic(topicId: string): Promise<Card[]> {
  const db = await getDB();
  return db.getAllFromIndex('cards', 'by-topic', topicId);
}

export async function putCard(card: Card): Promise<void> {
  const db = await getDB();
  await db.put('cards', card);
}

export async function putCards(cards: Card[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cards', 'readwrite');
  await Promise.all([...cards.map(c => tx.store.put(c)), tx.done]);
}

export async function deleteCard(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('cards', id);
}

export async function countCards(): Promise<number> {
  const db = await getDB();
  return db.count('cards');
}

// ── Progress ───────────────────────────────────────────────────────────────

export async function getAllProgress(): Promise<CardProgress[]> {
  const db = await getDB();
  return db.getAll('progress');
}

export async function getProgress(cardId: string): Promise<CardProgress | undefined> {
  const db = await getDB();
  return db.get('progress', cardId);
}

export async function putProgress(progress: CardProgress): Promise<void> {
  const db = await getDB();
  await db.put('progress', progress);
}

export async function getDueCards(today: string): Promise<CardProgress[]> {
  const db = await getDB();
  const all = await db.getAll('progress');
  return all.filter(p => p.nextReviewDate <= today);
}

export async function getKnownCount(): Promise<number> {
  const db = await getDB();
  const all = await db.getAll('progress');
  return all.filter(p => p.level >= 3).length;
}

export async function getLevelDistribution(): Promise<Record<number, number>> {
  const db = await getDB();
  const all = await db.getAll('progress');
  const dist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const p of all) {
    dist[p.level] = (dist[p.level] ?? 0) + 1;
  }
  return dist;
}

// ── Activity ───────────────────────────────────────────────────────────────

export async function recordActivity(date: string): Promise<void> {
  const db = await getDB();
  const existing = await db.get('activity', date);
  await db.put('activity', {
    date,
    count: (existing?.count ?? 0) + 1,
  });
}

export async function getActivity(days = 90): Promise<DayActivity[]> {
  const db = await getDB();
  const all = await db.getAll('activity');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0]!;
  return all.filter(a => a.date >= cutoffStr).sort((a, b) => a.date.localeCompare(b.date));
}

// ── Seed check ─────────────────────────────────────────────────────────────

export async function isSeeded(): Promise<boolean> {
  const count = await countCards();
  return count > 0;
}
