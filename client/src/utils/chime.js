// A short, soft two-note chime made with Web Audio (no sound files). The audio context is created on
// the first user gesture (starting a timer), which browsers require before sound can play.
let context = null;

export function prepareChime() {
  try {
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!context && AudioContext) context = new AudioContext();
    if (context?.state === "suspended") context.resume();
  } catch {
    context = null;
  }
}

export function playChime() {
  if (!context) return;
  try {
    const start = context.currentTime;
    [[784, 0], [1047, 0.18]].forEach(([frequency, delay]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start + delay);
      gain.gain.exponentialRampToValueAtTime(0.25, start + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + 0.6);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + delay);
      oscillator.stop(start + delay + 0.65);
    });
  } catch {
    // Audio unavailable: the visual and screen-reader alerts still fire.
  }
}
