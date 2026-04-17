#!/usr/bin/env python3
"""
Generate MP3 audio for all WordPunk sentences using Edge TTS.
Run on your local machine (not sandbox).

Usage:
  pip install edge-tts boto3
  python scripts/generate-sentence-audio.py

Steps:
  1. Reads sentences_manifest.json (list of {hash, text})
  2. Generates MP3 via edge-tts (en-US-GuyNeural)
  3. Uploads to Cloudflare R2 bucket "wordpunk-audio"
"""
import asyncio
import json
import os
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import edge_tts
import boto3
from botocore.config import Config

VOICE = "en-US-GuyNeural"
WORKERS_TTS = 8
WORKERS_UPLOAD = 32
OUT_DIR = Path(__file__).parent.parent / "tmp_sentence_audio"

R2_ENDPOINT = "https://429b99e3263c351f346568efb6fc7a83.r2.cloudflarestorage.com"
R2_ACCESS_KEY = "ea9c6f7f972723e468f54c118d47211c"
R2_SECRET_KEY = "d3a00adff67f988e87d772d957b00a15b977d09b94d64403a7a7a170bb3d07a4"
R2_BUCKET = "wordpunk-audio"

MANIFEST_PATH = Path(__file__).parent.parent / "scripts" / "sentences_manifest.json"


async def generate_one(text: str, out_path: Path) -> bool:
    try:
        communicate = edge_tts.Communicate(text, VOICE)
        await communicate.save(str(out_path))
        return out_path.stat().st_size > 0
    except Exception as e:
        print(f"  TTS ERROR: {e}", file=sys.stderr)
        return False


async def generate_batch(items: list[dict], out_dir: Path) -> int:
    sem = asyncio.Semaphore(WORKERS_TTS)
    ok = 0

    async def worker(item):
        nonlocal ok
        h, text = item["hash"], item["text"]
        out_path = out_dir / f"s_{h}.mp3"
        if out_path.exists() and out_path.stat().st_size > 0:
            ok += 1
            return
        async with sem:
            if await generate_one(text, out_path):
                ok += 1

    tasks = [asyncio.create_task(worker(item)) for item in items]
    total = len(tasks)
    done = 0
    for coro in asyncio.as_completed(tasks):
        await coro
        done += 1
        if done % 100 == 0 or done == total:
            print(f"  TTS: {done}/{total} (ok={ok})")
    return ok


def upload_all(out_dir: Path, items: list[dict]):
    s3 = boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        region_name="auto",
        config=Config(
            signature_version="s3v4",
            retries={"max_attempts": 5, "mode": "standard"},
            max_pool_connections=WORKERS_UPLOAD * 2,
        ),
    )

    files = [out_dir / f"s_{item['hash']}.mp3" for item in items]
    files = [f for f in files if f.exists() and f.stat().st_size > 0]
    total = len(files)
    print(f"\nUploading {total} files to R2...")

    done = 0
    fail = 0

    def upload_one(path: Path):
        nonlocal done, fail
        try:
            s3.upload_file(
                str(path),
                R2_BUCKET,
                path.name,
                ExtraArgs={
                    "ContentType": "audio/mpeg",
                    "CacheControl": "public, max-age=31536000, immutable",
                },
            )
        except Exception as e:
            fail += 1
            print(f"  UPLOAD ERROR {path.name}: {e}", file=sys.stderr)
        done += 1
        if done % 200 == 0 or done == total:
            print(f"  Upload: {done}/{total} (fail={fail})")

    with ThreadPoolExecutor(max_workers=WORKERS_UPLOAD) as ex:
        list(ex.map(upload_one, files))

    print(f"\nUpload done. success={done - fail} fail={fail}")


def main():
    if not MANIFEST_PATH.exists():
        print(f"Manifest not found: {MANIFEST_PATH}")
        print("Run from the WordPunk project root directory.")
        sys.exit(1)

    with open(MANIFEST_PATH) as f:
        items = json.load(f)

    print(f"Loaded {len(items)} sentences from manifest")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"\n=== Step 1: Generate MP3 ({VOICE}) ===")
    ok = asyncio.run(generate_batch(items, OUT_DIR))
    print(f"Generated: {ok}/{len(items)}")

    if ok == 0:
        print("No files generated. Check edge-tts installation.")
        sys.exit(1)

    print(f"\n=== Step 2: Upload to R2 ===")
    upload_all(OUT_DIR, items)

    total_mb = sum(f.stat().st_size for f in OUT_DIR.glob("*.mp3")) / (1024 * 1024)
    print(f"\nTotal audio size: {total_mb:.0f} MB")
    print("Done! You can delete tmp_sentence_audio/ when satisfied.")


if __name__ == "__main__":
    main()
