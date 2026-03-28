import type { Card } from '../types';

export const WORDS: Card[] = [
  // Кухня и еда
  { id: 'kitchen_001', english: 'eat',    russian: 'есть',     synonyms: [], topicId: 'kitchen', isCustom: false },
  { id: 'kitchen_002', english: 'drink',  russian: 'пить',     synonyms: [], topicId: 'kitchen', isCustom: false },
  { id: 'kitchen_003', english: 'cook',   russian: 'готовить', synonyms: [], topicId: 'kitchen', isCustom: false },
  { id: 'kitchen_004', english: 'water',  russian: 'вода',     synonyms: [], topicId: 'kitchen', isCustom: false },
  { id: 'kitchen_005', english: 'bread',  russian: 'хлеб',     synonyms: [], topicId: 'kitchen', isCustom: false },
  { id: 'kitchen_006', english: 'milk',   russian: 'молоко',   synonyms: [], topicId: 'kitchen', isCustom: false },
  { id: 'kitchen_007', english: 'apple',  russian: 'яблоко',   synonyms: [], topicId: 'kitchen', isCustom: false },
  { id: 'kitchen_008', english: 'meat',   russian: 'мясо',     synonyms: [], topicId: 'kitchen', isCustom: false },

  // Семья и отношения
  { id: 'family_001', english: 'mother', russian: 'мама',    synonyms: ['mom', 'mum'], topicId: 'family', isCustom: false },
  { id: 'family_002', english: 'father', russian: 'папа',    synonyms: ['dad'],        topicId: 'family', isCustom: false },
  { id: 'family_003', english: 'sister', russian: 'сестра',  synonyms: [],             topicId: 'family', isCustom: false },
  { id: 'family_004', english: 'brother',russian: 'брат',    synonyms: [],             topicId: 'family', isCustom: false },
  { id: 'family_005', english: 'friend', russian: 'друг',    synonyms: [],             topicId: 'family', isCustom: false },
  { id: 'family_006', english: 'child',  russian: 'ребёнок', synonyms: ['kid'],        topicId: 'family', isCustom: false },

  // Дом и интерьер
  { id: 'home_001', english: 'house',  russian: 'дом',    synonyms: [],       topicId: 'home', isCustom: false },
  { id: 'home_002', english: 'room',   russian: 'комната',synonyms: [],       topicId: 'home', isCustom: false },
  { id: 'home_003', english: 'door',   russian: 'дверь',  synonyms: [],       topicId: 'home', isCustom: false },
  { id: 'home_004', english: 'window', russian: 'окно',   synonyms: [],       topicId: 'home', isCustom: false },
  { id: 'home_005', english: 'table',  russian: 'стол',   synonyms: [],       topicId: 'home', isCustom: false },
  { id: 'home_006', english: 'chair',  russian: 'стул',   synonyms: [],       topicId: 'home', isCustom: false },
  { id: 'home_007', english: 'bed',    russian: 'кровать',synonyms: [],       topicId: 'home', isCustom: false },

  // Природа и погода
  { id: 'nature_001', english: 'sun',   russian: 'солнце', synonyms: [], topicId: 'nature', isCustom: false },
  { id: 'nature_002', english: 'rain',  russian: 'дождь',  synonyms: [], topicId: 'nature', isCustom: false },
  { id: 'nature_003', english: 'tree',  russian: 'дерево', synonyms: [], topicId: 'nature', isCustom: false },
  { id: 'nature_004', english: 'sea',   russian: 'море',   synonyms: [], topicId: 'nature', isCustom: false },
  { id: 'nature_005', english: 'sky',   russian: 'небо',   synonyms: [], topicId: 'nature', isCustom: false },
  { id: 'nature_006', english: 'snow',  russian: 'снег',   synonyms: [], topicId: 'nature', isCustom: false },
  { id: 'nature_007', english: 'wind',  russian: 'ветер',  synonyms: [], topicId: 'nature', isCustom: false },

  // Город и инфраструктура
  { id: 'city_001', english: 'car',    russian: 'машина',  synonyms: [],       topicId: 'city', isCustom: false },
  { id: 'city_002', english: 'bus',    russian: 'автобус', synonyms: [],       topicId: 'city', isCustom: false },
  { id: 'city_003', english: 'road',   russian: 'дорога',  synonyms: [],       topicId: 'city', isCustom: false },
  { id: 'city_004', english: 'shop',   russian: 'магазин', synonyms: ['store'],topicId: 'city', isCustom: false },
  { id: 'city_005', english: 'school', russian: 'школа',   synonyms: [],       topicId: 'city', isCustom: false },
  { id: 'city_006', english: 'park',   russian: 'парк',    synonyms: [],       topicId: 'city', isCustom: false },

  // Эмоции и чувства
  { id: 'emotions_001', english: 'happy', russian: 'счастливый', synonyms: ['glad'],topicId: 'emotions', isCustom: false },
  { id: 'emotions_002', english: 'sad',   russian: 'грустный',   synonyms: [],      topicId: 'emotions', isCustom: false },
  { id: 'emotions_003', english: 'angry', russian: 'злой',       synonyms: [],      topicId: 'emotions', isCustom: false },
  { id: 'emotions_004', english: 'tired', russian: 'уставший',   synonyms: [],      topicId: 'emotions', isCustom: false },
  { id: 'emotions_005', english: 'love',  russian: 'любовь',     synonyms: [],      topicId: 'emotions', isCustom: false },
  { id: 'emotions_006', english: 'fear',  russian: 'страх',      synonyms: [],      topicId: 'emotions', isCustom: false },

  // Время и даты
  { id: 'time_001', english: 'day',     russian: 'день',    synonyms: [], topicId: 'time', isCustom: false },
  { id: 'time_002', english: 'night',   russian: 'ночь',    synonyms: [], topicId: 'time', isCustom: false },
  { id: 'time_003', english: 'week',    russian: 'неделя',  synonyms: [], topicId: 'time', isCustom: false },
  { id: 'time_004', english: 'year',    russian: 'год',     synonyms: [], topicId: 'time', isCustom: false },
  { id: 'time_005', english: 'morning', russian: 'утро',    synonyms: [], topicId: 'time', isCustom: false },
  { id: 'time_006', english: 'evening', russian: 'вечер',   synonyms: [], topicId: 'time', isCustom: false },

  // Спорт
  { id: 'sports_001', english: 'run',    russian: 'бежать', synonyms: [], topicId: 'sports', isCustom: false },
  { id: 'sports_002', english: 'swim',   russian: 'плыть',  synonyms: [], topicId: 'sports', isCustom: false },
  { id: 'sports_003', english: 'game',   russian: 'игра',   synonyms: [], topicId: 'sports', isCustom: false },
  { id: 'sports_004', english: 'win',    russian: 'победа', synonyms: [], topicId: 'sports', isCustom: false },
  { id: 'sports_005', english: 'team',   russian: 'команда',synonyms: [], topicId: 'sports', isCustom: false },
];
