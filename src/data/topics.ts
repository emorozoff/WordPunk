import type { Topic } from '../types';

export const TOPICS: Topic[] = [
  { id: 'kitchen',    name: 'Кухня и еда',          emoji: '🍳' },
  { id: 'travel',     name: 'Путешествия и транспорт', emoji: '✈️' },
  { id: 'work',       name: 'Работа и офис',         emoji: '💼' },
  { id: 'health',     name: 'Тело и здоровье',       emoji: '💪' },
  { id: 'emotions',   name: 'Эмоции и чувства',      emoji: '🧠' },
  { id: 'nature',     name: 'Природа и погода',      emoji: '🌿' },
  { id: 'home',       name: 'Дом и интерьер',        emoji: '🏠' },
  { id: 'tech',       name: 'Технологии',            emoji: '💻' },
  { id: 'fashion',    name: 'Одежда и внешность',    emoji: '👗' },
  { id: 'family',     name: 'Семья и отношения',     emoji: '❤️' },
  { id: 'time',       name: 'Время и даты',          emoji: '🕐' },
  { id: 'money',      name: 'Деньги и покупки',      emoji: '💰' },
  { id: 'sports',     name: 'Спорт и активность',    emoji: '⚽' },
  { id: 'city',       name: 'Город и инфраструктура', emoji: '🏙️' },
  { id: 'custom',     name: 'Мои слова',             emoji: '✏️' },
];

export function getTopicById(id: string): Topic | undefined {
  return TOPICS.find(t => t.id === id);
}
