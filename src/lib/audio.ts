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

// ─── TTS (Piper + speechSynthesis fallback) ──────────────────────────────────

const TTS_KEY = 'tts_enabled';
const VOICE_ID = 'en_US-hfc_female-low';

let currentSource: AudioBufferSourceNode | null = null;
let speechEndCallback: (() => void) | null = null;
let piperReady = false;
let piperDownloading = false;
let piperProgress = 0;
let piperError: string | null = null;
let useFallback = false; // true = Piper сломан, используем speechSynthesis

type PiperStatusListener = (status: PiperStatus) => void;
const listeners = new Set<PiperStatusListener>();

export interface PiperStatus {
  downloading: boolean;
  progress: number;
  ready: boolean;
  error: string | null;
  fallback: boolean;
}

function notify(): void {
  const s: PiperStatus = { downloading: piperDownloading, progress: piperProgress, ready: piperReady, error: piperError, fallback: useFallback };
  listeners.forEach(fn => fn(s));
}

export function subscribePiperStatus(fn: PiperStatusListener): () => void {
  listeners.add(fn);
  fn({ downloading: piperDownloading, progress: piperProgress, ready: piperReady, error: piperError, fallback: useFallback });
  return () => { listeners.delete(fn); };
}

export function isPiperReady(): boolean { return piperReady || useFallback; }

// Lazy dynamic import
let ttsModule: typeof import('@mintplex-labs/piper-tts-web') | null = null;
async function getTtsModule() {
  if (!ttsModule) ttsModule = await import('@mintplex-labs/piper-tts-web');
  return ttsModule;
}

export async function initPiper(): Promise<void> {
  if (piperReady || piperDownloading || useFallback) return;
  piperError = null;
  try {
    const tts = await getTtsModule();
    const cached = await tts.stored();
    if (cached.includes(VOICE_ID)) {
      try {
        await tts.predict({ text: 'test', voiceId: VOICE_ID });
        piperReady = true;
        notify();
        return;
      } catch (_) {
        await tts.flush();
      }
    }
    piperDownloading = true;
    piperProgress = 0;
    notify();
    await tts.download(VOICE_ID, (p) => {
      piperProgress = Math.round(p.loaded * 100 / p.total);
      notify();
    });
    // Проверяем что свежескачанная модель работает
    try {
      await tts.predict({ text: 'test', voiceId: VOICE_ID });
      piperDownloading = false;
      piperReady = true;
      notify();
    } catch (e) {
      // Piper не работает на этом браузере — переключаемся на speechSynthesis
      piperDownloading = false;
      useFallback = true;
      piperError = null;
      notify();
    }
  } catch (e) {
    piperDownloading = false;
    // Любая ошибка (сеть, WASM, OPFS) — фоллбэк на speechSynthesis
    useFallback = true;
    piperError = null;
    notify();
  }
}

export function isTtsEnabled(): boolean {
  return localStorage.getItem(TTS_KEY) !== 'false';
}

export function setTtsEnabled(v: boolean): void {
  localStorage.setItem(TTS_KEY, v ? 'true' : 'false');
}

// ─── speakSentence: Piper → speechSynthesis fallback ─────────────────────────

export function speakSentence(text: string, onEnd: () => void): void {
  const clean = text.replace(/\*\*/g, '');

  if (useFallback) {
    speakViaSpeechSynthesis(clean, onEnd);
    return;
  }

  if (!piperReady) return;
  stopSpeech();

  const ac = getCtx();
  if (ac.state === 'suspended') ac.resume();

  speechEndCallback = onEnd;

  getTtsModule()
    .then(tts => tts.predict({ text: clean, voiceId: VOICE_ID }))
    .then(wav => wav.arrayBuffer())
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
      piperError = null;
      notify();
    })
    .catch((e) => {
      // Piper сломался в рантайме — фоллбэк
      useFallback = true;
      piperError = null;
      notify();
      speakViaSpeechSynthesis(clean, onEnd);
    });
}

function speakViaSpeechSynthesis(text: string, onEnd: () => void): void {
  if (!window.speechSynthesis) { onEnd(); return; }
  stopSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  speechEndCallback = onEnd;
  utterance.onend = () => {
    if (speechEndCallback) {
      const cb = speechEndCallback;
      speechEndCallback = null;
      cb();
    }
  };
  utterance.onerror = () => {
    // Если speechSynthesis тоже не работает — просто вызываем onEnd
    if (speechEndCallback) {
      const cb = speechEndCallback;
      speechEndCallback = null;
      cb();
    }
  };
  window.speechSynthesis.speak(utterance);
}

export function stopSpeech(): void {
  speechEndCallback = null;
  if (currentSource) {
    try { currentSource.stop(); } catch (_) {}
    currentSource.onended = null;
    currentSource = null;
  }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}
