import type { Topic } from '../types';

export const TOPICS: Topic[] = [
  { id: 'basic',      name: 'Основа языка',               icon: 'Zap' },
  { id: 'swearing',   name: '18+ Ругательства',           icon: 'Flame',        isAdult: true },
  { id: 'home',       name: 'Дома и в быту',              icon: 'Home' },
  { id: 'restaurant', name: 'В ресторане и кафе',          icon: 'Utensils' },
  { id: 'shopping',   name: 'В магазине и шопинг',         icon: 'ShoppingCart' },
  { id: 'airport',    name: 'В аэропорту и в дороге',      icon: 'Plane' },
  { id: 'hotel',      name: 'В отеле и путешествии',       icon: 'Building2' },
  { id: 'doctor',     name: 'У врача и в аптеке',          icon: 'Stethoscope' },
  { id: 'work',       name: 'На работе и в офисе',         icon: 'Briefcase' },
  { id: 'school',     name: 'В школе и университете',      icon: 'GraduationCap' },
  { id: 'bank',       name: 'В банке и финансы',           icon: 'Landmark' },
  { id: 'driving',    name: 'За рулём и транспорт',        icon: 'Car' },
  { id: 'internet',   name: 'В интернете и соцсетях',      icon: 'Globe' },
  { id: 'leisure',    name: 'Кино, музыка и досуг',        icon: 'Film' },
  { id: 'sports',     name: 'Спорт и тренировки',          icon: 'Dumbbell' },
  { id: 'nature',     name: 'На природе и погода',         icon: 'TreePine' },
  { id: 'family',     name: 'Семья и отношения',           icon: 'Users' },
  { id: 'party',      name: 'Вечеринка и общение',         icon: 'Music' },
  { id: 'kitchen',    name: 'На кухне и готовка',          icon: 'ChefHat' },
  { id: 'health',     name: 'Здоровье и тело',             icon: 'HeartPulse' },
  { id: 'science',    name: 'Наука и технологии',          icon: 'FlaskConical' },
  { id: 'politics',   name: 'Политика и общество',         icon: 'Scale' },
];

export function getTopicById(id: string): Topic | undefined {
  return TOPICS.find(t => t.id === id);
}
