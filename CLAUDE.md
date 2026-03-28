# WordPunk — CLAUDE.md

## Проект

PWA-приложение для изучения английских слов в стиле киберпанка.
React + TypeScript + Vite + IndexedDB (idb). Без бэкенда — всё локально.

GitHub: https://github.com/emorozoff/wordpunk
Deploy: https://emorozoff.github.io/WordPunk/

## Версия

Текущая версия: **v0.246**

Версия отображается в интерфейсе (хедер, рядом с логотипом).
При каждом изменении обновлять версию:
- Мелкие правки: третья цифра (v1.0 → v1.01 → v1.02)
- Значимые изменения: вторая цифра (v1.0 → v1.1)
- Крупные обновления: первая цифра — только по команде пользователя

Версию обновлять везде: в компоненте хедера и в этом файле.

## Git / Deploy

После каждого изменения: `git add . && git commit -m "..." && git push`
Не спрашивать подтверждения — просто пушить.
GitHub Actions автоматически деплоит в GitHub Pages при пуше в main.

## Структура

```
src/
  App.tsx              — роутинг между экранами
  components/
    MainScreen.tsx     — главный экран с карточками
    AddWordModal.tsx   — модалка добавления слова
    TopicModal.tsx     — выбор темы
    StatsScreen.tsx    — статистика
    LevelUpPopup.tsx   — попап нового уровня
  data/
    words.ts           — база слов
    topics.ts          — темы
  db/index.ts          — IndexedDB (idb)
  lib/
    srs.ts             — алгоритм SRS + система уровней
    audio.ts           — звуки
  styles/global.css    — все стили
  types/index.ts       — TypeScript типы
```

## Стиль

- Шрифты: VT323 (display), IBM Plex Mono (UI)
- Цвета: `--accent-green: #00ff88`, `--accent-amber: #ffaa00`, `--accent-red: #ff3366`
- Тёмный фон `#0d0d0d`, CRT scanline эффект
- Весь текст-UI — монохромный кибер-стиль

## Планы на v2.0+

- Функция «Мои слова» — добавление своих слов (топик `custom`, AddWordModal.tsx уже существует в коде)

## Мелкие баги

Фиксить сразу без согласования.
