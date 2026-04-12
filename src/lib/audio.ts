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

// ─── Piper TTS ────────────────────────────────────────────────────────────────

const TTS_KEY = 'tts_enabled';
const VOICE_ID = 'en_US-hfc_female-low';

let currentSource: AudioBufferSourceNode | null = null;
let speechEndCallback: (() => void) | null = null;
let piperReady = false;
let piperDownloading = false;
let piperProgress = 0;
let piperError: string | null = null;

type PiperStatusListener = (status: PiperStatus) => void;
const listeners = new Set<PiperStatusListener>();

export interface PiperStatus {
  downloading: boolean;
  progress: number;
  ready: boolean;
  error: string | null;
}

function notify(): void {
  const s: PiperStatus = { downloading: piperDownloading, progress: piperProgress, ready: piperReady, error: piperError };
  listeners.forEach(fn => fn(s));
}

export function subscribePiperStatus(fn: PiperStatusListener): () => void {
  listeners.add(fn);
  fn({ downloading: piperDownloading, progress: piperProgress, ready: piperReady, error: piperError });
  return () => { listeners.delete(fn); };
}

export function isPiperReady(): boolean { return piperReady; }

// Lazy dynamic import — WASM не грузится пока не нужен
let ttsModule: typeof import('@mintplex-labs/piper-tts-web') | null = null;
async function getTtsModule() {
  if (!ttsModule) ttsModule = await import('@mintplex-labs/piper-tts-web');
  return ttsModule;
}

export async function initPiper(): Promise<void> {
  if (piperReady || piperDownloading) return;
  piperError = null;
  try {
    const tts = await getTtsModule();
    const cached = await tts.stored();
    if (cached.includes(VOICE_ID)) {
      piperReady = true;
      notify();
      return;
    }
    piperDownloading = true;
    piperProgress = 0;
    notify();
    await tts.download(VOICE_ID, (p) => {
      piperProgress = Math.round(p.loaded * 100 / p.total);
      notify();
    });
    piperDownloading = false;
    piperReady = true;
    notify();
  } catch (e) {
    piperDownloading = false;
    piperError = 'init: ' + (e instanceof Error ? e.message : String(e));
    notify();
  }
}

export function isTtsEnabled(): boolean {
  return localStorage.getItem(TTS_KEY) !== 'false';
}

export function setTtsEnabled(v: boolean): void {
  localStorage.setItem(TTS_KEY, v ? 'true' : 'false');
}

export function speakSentence(text: string, onEnd: () => void): void {
  if (!piperReady) return;
  const clean = text.replace(/\*\*/g, '');
  stopSpeech();

  // Разблокируем / создаём AudioContext синхронно в стеке жеста (iOS)
  const ac = getCtx();
  if (ac.state === 'suspended') ac.resume();

  speechEndCallback = onEnd;

  getTtsModule()
    .then(tts => tts.predict({ text: clean, voiceId: VOICE_ID }))
    .then(wav => wav.arrayBuffer())
    .then(buf => ac.decodeAudioData(buf))
    .then(audioBuffer => {
      if (!speechEndCallback) return; // stopSpeech() was called
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
      piperError = null;
      notify();
    })
    .catch((e) => {
      speechEndCallback = null;
      currentSource = null;
      piperError = 'speak: ' + (e instanceof Error ? e.message : String(e));
      notify();
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
