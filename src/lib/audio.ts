let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function playCorrect(): void {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ac.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ac.currentTime + 0.08); // E5
    gain.gain.setValueAtTime(0.15, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.3);
  } catch (_) {}
}

export function playWrong(): void {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ac.currentTime);
    osc.frequency.setValueAtTime(180, ac.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.25);
  } catch (_) {}
}

export function playLevelUp(): void {
  try {
    const ac = getCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ac.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0.12, ac.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.1 + 0.3);
      osc.start(ac.currentTime + i * 0.1);
      osc.stop(ac.currentTime + i * 0.1 + 0.3);
    });
  } catch (_) {}
}

// ─── TTS (pre-generated MP3) ─────────────────────────────────────────────────

const MANUAL_INPUT_KEY = 'manual_input_enabled';

export function isManualInputEnabled(): boolean {
  return localStorage.getItem(MANUAL_INPUT_KEY) !== 'false';
}

export function setManualInputEnabled(v: boolean): void {
  localStorage.setItem(MANUAL_INPUT_KEY, v ? 'true' : 'false');
}

const TTS_KEY = 'tts_enabled';
const AUDIO_CDN = 'https://pub-00a95b8df66f46f597ce91f5544ae35f.r2.dev';
let currentSource: AudioBufferSourceNode | null = null;
let speechEndCallback: (() => void) | null = null;

export function isTtsEnabled(): boolean {
  return localStorage.getItem(TTS_KEY) !== 'false';
}

export function setTtsEnabled(v: boolean): void {
  localStorage.setItem(TTS_KEY, v ? 'true' : 'false');
}

function toSlug(word: string): string {
  return word
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function speakWord(word: string, onEnd: () => void): void {
  stopSpeech();
  const slug = toSlug(word);
  if (!slug) { onEnd(); return; }

  const ac = getCtx();
  if (ac.state === 'suspended') ac.resume();
  speechEndCallback = onEnd;

  const url = `${AUDIO_CDN}/${slug}.mp3`;
  fetch(url)
    .then(r => { if (!r.ok) throw new Error(r.statusText); return r.arrayBuffer(); })
    .then(buf => ac.decodeAudioData(buf))
    .then(audioBuffer => {
      if (!speechEndCallback) return;
      const source = ac.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ac.destination);
      currentSource = source;
      source.onended = () => {
        if (speechEndCallback) {
          const cb = speechEndCallback;
          speechEndCallback = null;
          currentSource = null;
          cb();
        }
      };
      source.start(0);
    })
    .catch(() => {
      if (speechEndCallback) {
        const cb = speechEndCallback;
        speechEndCallback = null;
        cb();
      }
    });
}

export function stopSpeech(): void {
  speechEndCallback = null;
  if (currentSource) {
    try { currentSource.stop(); } catch (_) {}
    currentSource.onended = null;
    currentSource = null;
  }
}

async function sentenceHash(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 16);
}

function cleanExample(example: string): string {
  return example.replace(/\*\*([^*]+)\*\*/g, '$1');
}

export function speakSentence(example: string, onEnd: () => void): void {
  stopSpeech();
  const clean = cleanExample(example);
  if (!clean) { onEnd(); return; }

  const ac = getCtx();
  if (ac.state === 'suspended') ac.resume();
  speechEndCallback = onEnd;

  sentenceHash(clean)
    .then(hash => fetch(`${AUDIO_CDN}/s_${hash}.mp3`))
    .then(r => { if (!r.ok) throw new Error(r.statusText); return r.arrayBuffer(); })
    .then(buf => ac.decodeAudioData(buf))
    .then(audioBuffer => {
      if (!speechEndCallback) return;
      const source = ac.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ac.destination);
      currentSource = source;
      source.onended = () => {
        if (speechEndCallback) {
          const cb = speechEndCallback;
          speechEndCallback = null;
          currentSource = null;
          cb();
        }
      };
      source.start(0);
    })
    .catch(() => {
      if (speechEndCallback) {
        const cb = speechEndCallback;
        speechEndCallback = null;
        cb();
      }
    });
}
