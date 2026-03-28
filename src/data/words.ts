import type { Card } from '../types';

export const WORDS: Card[] = [
  // Кухня и еда
  { id: 'kitchen_001', english: 'eat',    russian: 'есть',     synonyms: [], topicId: 'kitchen', isCustom: false, example: 'What do you eat for breakfast?' },
  { id: 'kitchen_002', english: 'drink',  russian: 'пить',     synonyms: [], topicId: 'kitchen', isCustom: false, example: 'I always drink water in the morning.' },
  { id: 'kitchen_003', english: 'cook',   russian: 'готовить', synonyms: [], topicId: 'kitchen', isCustom: false, example: 'She loves to cook on weekends.' },
  { id: 'kitchen_004', english: 'water',  russian: 'вода',     synonyms: [], topicId: 'kitchen', isCustom: false, example: 'Can I have a glass of water?' },
  { id: 'kitchen_005', english: 'bread',  russian: 'хлеб',     synonyms: [], topicId: 'kitchen', isCustom: false, example: 'I bought fresh bread at the market.' },
  { id: 'kitchen_006', english: 'milk',   russian: 'молоко',   synonyms: [], topicId: 'kitchen', isCustom: false, example: 'Add some milk to your coffee.' },
  { id: 'kitchen_007', english: 'apple',  russian: 'яблоко',   synonyms: [], topicId: 'kitchen', isCustom: false, example: 'An apple a day keeps the doctor away.' },
  { id: 'kitchen_008', english: 'meat',   russian: 'мясо',     synonyms: [], topicId: 'kitchen', isCustom: false, example: 'He prefers fish over meat.' },

  // Семья и отношения
  { id: 'family_001', english: 'mother', russian: 'мама',    synonyms: ['mom', 'mum'], topicId: 'family', isCustom: false, example: 'My mother makes the best soup.' },
  { id: 'family_002', english: 'father', russian: 'папа',    synonyms: ['dad'],        topicId: 'family', isCustom: false, example: 'His father works in the city.' },
  { id: 'family_003', english: 'sister', russian: 'сестра',  synonyms: [],             topicId: 'family', isCustom: false, example: 'My sister lives in London.' },
  { id: 'family_004', english: 'brother',russian: 'брат',    synonyms: [],             topicId: 'family', isCustom: false, example: 'He plays football with his brother.' },
  { id: 'family_005', english: 'friend', russian: 'друг',    synonyms: [],             topicId: 'family', isCustom: false, example: "She's my best friend since school." },
  { id: 'family_006', english: 'child',  russian: 'ребёнок', synonyms: ['kid'],        topicId: 'family', isCustom: false, example: 'Every child loves to play.' },

  // Дом и интерьер
  { id: 'home_001', english: 'house',  russian: 'дом',    synonyms: [],       topicId: 'home', isCustom: false, example: 'They bought a new house last year.' },
  { id: 'home_002', english: 'room',   russian: 'комната',synonyms: [],       topicId: 'home', isCustom: false, example: 'This room is very bright.' },
  { id: 'home_003', english: 'door',   russian: 'дверь',  synonyms: [],       topicId: 'home', isCustom: false, example: 'Please close the door behind you.' },
  { id: 'home_004', english: 'window', russian: 'окно',   synonyms: [],       topicId: 'home', isCustom: false, example: 'She looked out the window at the rain.' },
  { id: 'home_005', english: 'table',  russian: 'стол',   synonyms: [],       topicId: 'home', isCustom: false, example: 'Put your keys on the table.' },
  { id: 'home_006', english: 'chair',  russian: 'стул',   synonyms: [],       topicId: 'home', isCustom: false, example: 'He sat in the chair by the window.' },
  { id: 'home_007', english: 'bed',    russian: 'кровать',synonyms: [],       topicId: 'home', isCustom: false, example: 'I was still in bed at noon.' },

  // Природа и погода
  { id: 'nature_001', english: 'sun',   russian: 'солнце', synonyms: [], topicId: 'nature', isCustom: false, example: 'The sun was shining all day.' },
  { id: 'nature_002', english: 'rain',  russian: 'дождь',  synonyms: [], topicId: 'nature', isCustom: false, example: "Don't forget your umbrella — it might rain." },
  { id: 'nature_003', english: 'tree',  russian: 'дерево', synonyms: [], topicId: 'nature', isCustom: false, example: "There's a big tree in the garden." },
  { id: 'nature_004', english: 'sea',   russian: 'море',   synonyms: [], topicId: 'nature', isCustom: false, example: 'We spent the summer by the sea.' },
  { id: 'nature_005', english: 'sky',   russian: 'небо',   synonyms: [], topicId: 'nature', isCustom: false, example: 'The sky turned red at sunset.' },
  { id: 'nature_006', english: 'snow',  russian: 'снег',   synonyms: [], topicId: 'nature', isCustom: false, example: 'The kids played in the snow all morning.' },
  { id: 'nature_007', english: 'wind',  russian: 'ветер',  synonyms: [], topicId: 'nature', isCustom: false, example: 'The wind knocked over the sign.' },

  // Город и инфраструктура
  { id: 'city_001', english: 'car',    russian: 'машина',  synonyms: [],       topicId: 'city', isCustom: false, example: 'He drives his car to work every day.' },
  { id: 'city_002', english: 'bus',    russian: 'автобус', synonyms: [],       topicId: 'city', isCustom: false, example: 'I take the bus to the office.' },
  { id: 'city_003', english: 'road',   russian: 'дорога',  synonyms: [],       topicId: 'city', isCustom: false, example: 'The road was blocked by snow.' },
  { id: 'city_004', english: 'shop',   russian: 'магазин', synonyms: ['store'],topicId: 'city', isCustom: false, example: 'Is there a shop near here?' },
  { id: 'city_005', english: 'school', russian: 'школа',   synonyms: [],       topicId: 'city', isCustom: false, example: 'She walks to school every morning.' },
  { id: 'city_006', english: 'park',   russian: 'парк',    synonyms: [],       topicId: 'city', isCustom: false, example: 'We had lunch in the park.' },

  // Эмоции и чувства
  { id: 'emotions_001', english: 'happy', russian: 'счастливый', synonyms: ['glad'],topicId: 'emotions', isCustom: false, example: "I'm happy to see you again." },
  { id: 'emotions_002', english: 'sad',   russian: 'грустный',   synonyms: [],      topicId: 'emotions', isCustom: false, example: 'She felt sad when he left.' },
  { id: 'emotions_003', english: 'angry', russian: 'злой',       synonyms: [],      topicId: 'emotions', isCustom: false, example: "Don't make him angry." },
  { id: 'emotions_004', english: 'tired', russian: 'уставший',   synonyms: [],      topicId: 'emotions', isCustom: false, example: "I'm too tired to go out tonight." },
  { id: 'emotions_005', english: 'love',  russian: 'любовь',     synonyms: [],      topicId: 'emotions', isCustom: false, example: 'They fell in love at first sight.' },
  { id: 'emotions_006', english: 'fear',  russian: 'страх',      synonyms: [],      topicId: 'emotions', isCustom: false, example: 'Fear is not always a bad thing.' },

  // Время и даты
  { id: 'time_001', english: 'day',     russian: 'день',    synonyms: [], topicId: 'time', isCustom: false, example: 'It was the best day of my life.' },
  { id: 'time_002', english: 'night',   russian: 'ночь',    synonyms: [], topicId: 'time', isCustom: false, example: 'I stayed up all night to finish.' },
  { id: 'time_003', english: 'week',    russian: 'неделя',  synonyms: [], topicId: 'time', isCustom: false, example: 'See you next week!' },
  { id: 'time_004', english: 'year',    russian: 'год',     synonyms: [], topicId: 'time', isCustom: false, example: "It's been a tough year for everyone." },
  { id: 'time_005', english: 'morning', russian: 'утро',    synonyms: [], topicId: 'time', isCustom: false, example: 'Good morning! Did you sleep well?' },
  { id: 'time_006', english: 'evening', russian: 'вечер',   synonyms: [], topicId: 'time', isCustom: false, example: 'We met for drinks that evening.' },

  // Спорт
  { id: 'sports_001', english: 'run',    russian: 'бежать', synonyms: [], topicId: 'sports', isCustom: false, example: 'She can run a mile in six minutes.' },
  { id: 'sports_002', english: 'swim',   russian: 'плыть',  synonyms: [], topicId: 'sports', isCustom: false, example: 'Can you swim?' },
  { id: 'sports_003', english: 'game',   russian: 'игра',   synonyms: [], topicId: 'sports', isCustom: false, example: 'Did you watch the game last night?' },
  { id: 'sports_004', english: 'win',    russian: 'победа', synonyms: [], topicId: 'sports', isCustom: false, example: 'They played hard to win the match.' },
  { id: 'sports_005', english: 'team',   russian: 'команда',synonyms: [], topicId: 'sports', isCustom: false, example: 'Our team won the championship.' },
];
