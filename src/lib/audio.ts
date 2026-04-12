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
  window.speechSynthesis.cancel();
  // Chrome bug: speak() immediately after cancel() is sometimes silent.
  // Small delay + resume() fixes it.
  setTimeout(() => {
    if (!speechEndCallback) return; // stopSpeech() was called in the meantime
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  }, 50);
}

/** Stops any ongoing speech. The onEnd callback will NOT be called. */
export function stopSpeech(): void {
  speechEndCallback = null;
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}
