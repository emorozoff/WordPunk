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

// ─── TTS ──────────────────────────────────────────────────────────────────────

const TTS_KEY = 'tts_enabled';
let speechEndCallback: (() => void) | null = null;
let bestVoice: SpeechSynthesisVoice | null = null;

// Best-sounding free voices by platform, in priority order
const PREFERRED_VOICES = [
  'Google US English',        // Chrome — very natural
  'Google UK English Female', // Chrome fallback
  'Samantha',                 // macOS / iOS
  'Karen',                    // macOS / iOS (Australian)
  'Daniel',                   // macOS / iOS (British)
  'Microsoft Zira',           // Windows
  'Microsoft David',          // Windows
];

function selectBestVoice(): void {
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return;
  for (const name of PREFERRED_VOICES) {
    const match = voices.find(v => v.name === name);
    if (match) { bestVoice = match; return; }
  }
  bestVoice = voices.find(v => v.lang.startsWith('en')) ?? voices[0] ?? null;
}

// Voices load asynchronously in Chrome
if (typeof speechSynthesis !== 'undefined') {
  selectBestVoice();
  speechSynthesis.onvoiceschanged = selectBestVoice;
}

export function isTtsEnabled(): boolean {
  return localStorage.getItem(TTS_KEY) !== 'false';
}

export function setTtsEnabled(v: boolean): void {
  localStorage.setItem(TTS_KEY, v ? 'true' : 'false');
}

/** Speaks the sentence (strips **markers**), calls onEnd when finished naturally.
 *  If cancelled via stopSpeech(), onEnd is NOT called. */
export function speakSentence(text: string, onEnd: () => void): void {
  if (!window.speechSynthesis) return;
  const clean = text.replace(/\*\*/g, '');
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  if (bestVoice) utterance.voice = bestVoice;
  speechEndCallback = onEnd;
  utterance.onend = () => {
    if (speechEndCallback) {
      const cb = speechEndCallback;
      speechEndCallback = null;
      cb();
    }
  };
  utterance.onerror = () => {
    // Cancelled or interrupted — do NOT call onEnd
    speechEndCallback = null;
  };
  // speak() must be called synchronously in the user gesture stack —
  // iOS Safari silently blocks it otherwise.
  // No cancel() here: stopSpeech() in advance() already handles cleanup.
  window.speechSynthesis.speak(utterance);
}

/** Stops any ongoing speech. The onEnd callback will NOT be called. */
export function stopSpeech(): void {
  speechEndCallback = null;
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}
