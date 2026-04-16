#!/usr/bin/env python3
"""
Генерация аудио-сэмплов для тестирования голосов в WordPunk.

Использование (из корня проекта):
    python3 scripts/generate-voice-samples.py

Автоматически установит edge-tts если его нет.
Результат: public/audio-samples/<voice>/<word>.mp3
"""

import asyncio
import os
import subprocess
import sys

try:
    import edge_tts
except ImportError:
    print("📦  Устанавливаю edge-tts...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "edge-tts", "-q"])
    import edge_tts

# ── Конфигурация ──────────────────────────────────────────────────────────────

WORDS = ["cat", "phone", "beautiful", "comfortable", "particularly", "extraordinary"]

VOICES = {
    "jenny":    "en-US-JennyNeural",        # женский, нейтральный (US)
    "aria":     "en-US-AriaNeural",          # женский, тёплый (US)
    "guy":      "en-US-GuyNeural",           # мужской, чёткий (US)
    "sonia":    "en-GB-SoniaNeural",         # женский, британский
}

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "audio-samples")


# ── Генерация ─────────────────────────────────────────────────────────────────

async def generate_one(word: str, voice_key: str, voice_id: str):
    """Генерирует один MP3 файл через Edge TTS."""
    out_dir = os.path.join(OUT_DIR, voice_key)
    os.makedirs(out_dir, exist_ok=True)

    filename = f"{word}.mp3"
    filepath = os.path.join(out_dir, filename)

    if os.path.exists(filepath):
        print(f"  ⏭  {voice_key}/{filename} — уже есть")
        return

    communicate = edge_tts.Communicate(word, voice_id)
    await communicate.save(filepath)
    size = os.path.getsize(filepath)
    print(f"  ✅  {voice_key}/{filename}  ({size // 1024}KB)")


async def main():
    total = len(WORDS) * len(VOICES)
    print(f"🎙  Генерация {total} сэмплов...")
    print(f"   Слова: {', '.join(WORDS)}")
    print(f"   Голоса: {', '.join(f'{k} ({v})' for k, v in VOICES.items())}")
    print(f"   Папка: {os.path.abspath(OUT_DIR)}")
    print()

    for voice_key, voice_id in VOICES.items():
        print(f"🔊 {voice_key} ({voice_id})")
        for word in WORDS:
            await generate_one(word, voice_key, voice_id)
        print()

    print("✅  Готово!")
    print(f"   Файлы: {os.path.abspath(OUT_DIR)}")
    print("   Теперь запусти npm run dev и открой тест голосов через дебаг-панель.")


if __name__ == "__main__":
    asyncio.run(main())
