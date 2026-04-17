#!/usr/bin/env python3
"""
Generate MP3 audio for all WordPunk sentences using Edge TTS.
Run on your local machine (not sandbox).

Usage:
  pip3 install edge-tts boto3
  python3 scripts/generate-sentence-audio.py

Workflow:
  1. Scans src/data/words.ts for all unique sentences
  2. Skips MP3 already generated locally (tmp_sentence_audio/s_<hash>.mp3)
  3. Generates missing MP3 via edge-tts (en-US-GuyNeural)
  4. Lists existing files in R2 bucket (to skip uploads)
  5. Uploads only missing files

Run after any words.ts edit - it will auto-sync new/changed sentences.
"""
import asyncio
import hashlib
import re
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import edge_tts
import boto3
from botocore.config import Config

VOICE = "en-US-GuyNeural"
WORKERS_TTS = 8
WORKERS_UPLOAD = 32

ROOT = Path(__file__).parent.parent
WORDS_PATH = ROOT / "src" / "data" / "words.ts"
OUT_DIR = ROOT / "tmp_sentence_audio"

R2_ENDPOINT = "https://429b99e3263c351f346568efb6fc7a83.r2.cloudflarestorage.com"
R2_ACCESS_KEY = "ea9c6f7f972723e468f54c118d47211c"
R2_SECRET_KEY = "d3a00adff67f988e87d772d957b00a15b977d09b94d64403a7a7a170bb3d07a4"
R2_BUCKET = "wordpunk-audio"


def extract_sentences() -> list[dict]:
    """Parse words.ts and return list of {hash, text, key} for unique sentences."""
    content = WORDS_PATH.read_text()
    examples = set()
    for m in re.finditer(r"example:\s*'([^']*(?:\\'[^']*)*)'", content):
        raw = m.group(1).replace("\\'", "'")
        clean = re.sub(r"\*\*([^*]+)\*\*", r"\1", raw)
        examples.add(clean)
    items = []
    for text in sorted(examples):
        h = hashlib.sha256(text.encode()).hexdigest()[:16]
        items.append({"hash": h, "text": text, "key": f"s_{h}.mp3"})
    return items


async def generate_one(text: str, out_path: Path) -> bool:
    try:
        communicate = edge_tts.Communicate(text, VOICE)
        await communicate.save(str(out_path))
        return out_path.stat().st_size > 0
    except Exception as e:
        print(f"  TTS ERROR: {e}", file=sys.stderr)
        return False


async def generate_missing(items: list[dict], out_dir: Path) -> int:
    missing = [it for it in items if not (out_dir / it["key"]).exists() or (out_dir / it["key"]).stat().st_size == 0]
    if not missing:
        print(f"  All {len(items)} MP3 already generated locally")
        return 0

    print(f"  Missing locally: {len(missing)} (of {len(items)})")
    sem = asyncio.Semaphore(WORKERS_TTS)
    ok = 0

    async def worker(item):
        nonlocal ok
        out_path = out_dir / item["key"]
        async with sem:
            if await generate_one(item["text"], out_path):
                ok += 1

    tasks = [asyncio.create_task(worker(it)) for it in missing]
    total = len(tasks)
    done = 0
    for coro in asyncio.as_completed(tasks):
        await coro
        done += 1
        if done % 50 == 0 or done == total:
            print(f"  TTS: {done}/{total} (ok={ok})")
    return ok


def get_r2_existing_keys(s3) -> set[str]:
    """List all keys in R2 bucket to skip already-uploaded files."""
    keys = set()
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=R2_BUCKET):
        for obj in page.get("Contents", []):
            keys.add(obj["Key"])
    return keys


def upload_missing(items: list[dict], out_dir: Path):
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

    print("  Listing existing R2 keys...")
    existing = get_r2_existing_keys(s3)
    print(f"  R2 already has {len(existing)} objects")

    to_upload = []
    for it in items:
        local_path = out_dir / it["key"]
        if not local_path.exists() or local_path.stat().st_size == 0:
            continue
        if it["key"] in existing:
            continue
        to_upload.append((local_path, it["key"]))

    if not to_upload:
        print("  Nothing to upload — R2 is in sync")
        return

    print(f"  Uploading {len(to_upload)} missing files to R2...")
    done = 0
    fail = 0

    def upload_one(arg):
        nonlocal done, fail
        path, key = arg
        try:
            s3.upload_file(
                str(path),
                R2_BUCKET,
                key,
                ExtraArgs={
                    "ContentType": "audio/mpeg",
                    "CacheControl": "public, max-age=31536000, immutable",
                },
            )
        except Exception as e:
            fail += 1
            print(f"  UPLOAD ERROR {key}: {e}", file=sys.stderr)
        done += 1
        if done % 50 == 0 or done == len(to_upload):
            print(f"  Upload: {done}/{len(to_upload)} (fail={fail})")

    with ThreadPoolExecutor(max_workers=WORKERS_UPLOAD) as ex:
        list(ex.map(upload_one, to_upload))

    print(f"\n  Upload done. success={done - fail} fail={fail}")


def main():
    if not WORDS_PATH.exists():
        print(f"words.ts not found: {WORDS_PATH}")
        print("Run from the WordPunk project root directory.")
        sys.exit(1)

    print("=== Step 1: Extract sentences from words.ts ===")
    items = extract_sentences()
    print(f"  Found {len(items)} unique sentences")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"\n=== Step 2: Generate missing MP3 ({VOICE}) ===")
    asyncio.run(generate_missing(items, OUT_DIR))

    print("\n=== Step 3: Upload missing files to R2 ===")
    upload_missing(items, OUT_DIR)

    total_mb = sum(f.stat().st_size for f in OUT_DIR.glob("*.mp3")) / (1024 * 1024)
    print(f"\nTotal local audio: {total_mb:.0f} MB")
    print("Done! Local cache at tmp_sentence_audio/ speeds up future runs.")


if __name__ == "__main__":
    main()
