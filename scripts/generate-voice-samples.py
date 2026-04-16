#!/usr/bin/env python3
"""
Генерация аудио-сэмплов для тестирования голосов в WordPunk.

Зависимости:
    pip install edge-tts

Использование:
    python scripts/generate-voice-samples.py

Результат:
    public/audio-samples/<voice>/<word>_<bitrate>.mp3
"""

import asyncio
import os
import subprocess
import sys

try:
    import edge_tts
except ImportError:
    print("❌  edge-tts не установлен. Установи:")
    print("    pip install edge-tts")
    sys.exit(1)

# ── Конфигурация ──────────────────────────────────────────────────────────────

WORDS = ["cat", "phone", "beautiful", "comfortable", "particularly", "extraordinary"]

VOICES = {
    "jenny":    "en-US-JennyNeural",        # женский, нейтральный
    "aria":     "en-US-AriaNeural",          # женский, тёплый
    "guy":      "en-US-GuyNeural",           # мужской, чёткий
    "sonia":    "en-GB-SoniaNeural",         # британский женский
}

BITRATES = ["64k", "128k"]

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "audio-samples")


# ── Генерация ─────────────────────────────────────────────────────────────────

async def generate_one(word: str, voice_key: str, voice_id: str, bitrate: str):
    """Генерирует один MP3 файл через Edge TTS."""
    out_dir = os.path.join(OUT_DIR, voice_key)
    os.makedirs(out_dir, exist_ok=True)

    filename = f"{word}_{bitrate}.mp3"
    filepath = os.path.join(out_dir, filename)

    if os.path.exists(filepath):
        print(f"  ⏭  {voice_key}/{filename} — уже есть")
        return

    # Edge TTS генерирует аудио
    tmp_path = filepath + ".tmp"
    communicate = edge_tts.Communicate(word, voice_id)
    await communicate.save(tmp_path)

    # Перекодируем в нужный битрейт через ffmpeg (если доступен)
    if has_ffmpeg():
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", tmp_path, "-ab", bitrate, "-ac", "1", "-ar", "22050", filepath],
                capture_output=True, check=True
            )
            os.remove(tmp_path)
        except subprocess.CalledProcessError:
            # Если ffmpeg не смог — используем оригинал
            os.rename(tmp_path, filepath)
    else:
        os.rename(tmp_path, filepath)

    print(f"  ✅  {voice_key}/{filename}")


_ffmpeg_check = None

def has_ffmpeg() -> bool:
    global _ffmpeg_check
    if _ffmpeg_check is None:
        try:
            subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
            _ffmpeg_check = True
        except (FileNotFoundError, subprocess.CalledProcessError):
            _ffmpeg_check = False
            print("⚠️  ffmpeg не найден — файлы будут сохранены без перекодировки битрейта")
    return _ffmpeg_check


async def main():
    total = len(WORDS) * len(VOICES) * len(BITRATES)
    print(f"🎙  Генерация {total} сэмплов...")
    print(f"   Слова: {', '.join(WORDS)}")
    print(f"   Голоса: {', '.join(f'{k} ({v})' for k, v in VOICES.items())}")
    print(f"   Битрейты: {', '.join(BITRATES)}")
    print(f"   Папка: {os.path.abspath(OUT_DIR)}")
    print()

    for voice_key, voice_id in VOICES.items():
        print(f"🔊 {voice_key} ({voice_id})")
        for word in WORDS:
            for bitrate in BITRATES:
                await generate_one(word, voice_key, voice_id, bitrate)
        print()

    print("✅  Готово! Теперь запусти приложение и открой тест голосов через дебаг-панель.")


if __name__ == "__main__":
    asyncio.run(main())
