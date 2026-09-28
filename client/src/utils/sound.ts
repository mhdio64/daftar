/**
 * پخش افکت صوتی ملایم با استفاده از Web Audio API بدون نیاز به فایل صوتی خارجی
 */
let audioCtx: AudioContext | null = null;

export function playCopyChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    // زنگ ملایم هارمونیک (E6 به G#6) با محو شدن نرم
    osc.frequency.setValueAtTime(1318.51, now);
    osc.frequency.exponentialRampToValueAtTime(1661.22, now + 0.06);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  } catch {
    // در صورت غیرفعال بودن صدا یا عدم تعامل اولیه
  }
}

export function playSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1174.66, now + 0.08);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    // ignore
  }
}
