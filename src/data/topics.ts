import type { Topic } from '../types';

export const TOPICS: Topic[] = [
  { id: 'basic',      name: 'Основа языка',               emoji: '⚡' },
  { id: 'home',       name: 'Дома и в быту',              emoji: '🏠' },
  { id: 'restaurant', name: 'В ресторане и кафе',          emoji: '🍽️' },
  { id: 'shopping',   name: 'В магазине и шопинг',         emoji: '🛍️' },
  { id: 'airport',    name: 'В аэропорту и в дороге',      emoji: '✈️' },
  { id: 'hotel',      name: 'В отеле и путешествии',       emoji: '🏨' },
  { id: 'doctor',     name: 'У врача и в аптеке',          emoji: '🏥' },
  { id: 'work',       name: 'На работе и в офисе',         emoji: '💼' },
  { id: 'school',     name: 'В школе и университете',      emoji: '🎓' },
  { id: 'bank',       name: 'В банке и финансы',           emoji: '💳' },
  { id: 'driving',    name: 'За рулём и транспорт',        emoji: '🚗' },
  { id: 'internet',   name: 'В интернете и соцсетях',      emoji: '📱' },
  { id: 'leisure',    name: 'Кино, музыка и досуг',        emoji: '🎬' },
  { id: 'sports',     name: 'Спорт и тренировки',          emoji: '💪' },
  { id: 'nature',     name: 'На природе и погода',         emoji: '🌿' },
  { id: 'family',     name: 'Семья и отношения',           emoji: '❤️' },
  { id: 'party',      name: 'Вечеринка и общение',         emoji: '🎉' },
  { id: 'kitchen',    name: 'На кухне и готовка',          emoji: '🍳' },
  { id: 'health',     name: 'Здоровье и тело',             emoji: '🫀' },
  { id: 'science',    name: 'Наука и технологии',          emoji: '🔬' },
  { id: 'politics',   name: 'Политика и общество',         emoji: '🗳️' },
];

export function getTopicById(id: string): Topic | undefined {
  return TOPICS.find(t => t.id === id);
}
