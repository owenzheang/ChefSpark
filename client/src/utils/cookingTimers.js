// Finds cooking durations in step text so Cooking Mode can offer timers. Deterministic, no AI:
// if the text names no time, there is no timer. Ranges ("5 to 6 minutes") start at the lower
// bound so beginners check early rather than overcook.

const WORD_NUMBERS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, "forty-five": 45, sixty: 60
};
const FRACTIONS = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };
const UNIT_SECONDS = { s: 1, sec: 1, secs: 1, second: 1, seconds: 1, min: 60, mins: 60, minute: 60, minutes: 60,
  h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600 };
const MAX_SECONDS = 24 * 3600;

const NUMBER = String.raw`(\d+(?:\.\d+)?(?:\s*[½¼¾⅓⅔])?|[½¼¾⅓⅔]|${Object.keys(WORD_NUMBERS).sort((a, b) => b.length - a.length).join("|")})`;
const UNIT = String.raw`(seconds?|secs?|minutes?|mins?|hours?|hrs?)`;
const PATTERN = new RegExp(String.raw`\b${NUMBER}(?:\s*(?:to|-|–|or)\s*${NUMBER})?[\s-]*${UNIT}\b`, "gi");

function toNumber(raw) {
  if (raw === undefined) return null;
  const text = raw.trim().toLowerCase();
  if (text in WORD_NUMBERS) return WORD_NUMBERS[text];
  if (text in FRACTIONS) return FRACTIONS[text];
  const fraction = Object.keys(FRACTIONS).find((symbol) => text.endsWith(symbol));
  if (fraction) return Number(text.slice(0, -1).trim()) + FRACTIONS[fraction];
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function formatAmount(seconds) {
  if (seconds % 3600 === 0) return `${seconds / 3600} h`;
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60} min`;
  if (seconds > 60) return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
  return `${seconds} s`;
}

// Returns every duration in the text, in order: { seconds, maxSeconds, label, text }.
export function findStepTimers(text) {
  if (typeof text !== "string") return [];
  const timers = [];
  for (const match of text.matchAll(PATTERN)) {
    const [whole, first, second, unit] = match;
    const perUnit = UNIT_SECONDS[unit.toLowerCase()];
    const low = toNumber(first);
    const high = toNumber(second);
    if (!perUnit || !low || low <= 0) continue;
    const seconds = Math.round(low * perUnit);
    const maxSeconds = high && high > low ? Math.round(high * perUnit) : null;
    if (seconds > MAX_SECONDS) continue;
    timers.push({
      seconds,
      maxSeconds,
      label: maxSeconds ? `Check at ${formatAmount(seconds)}, up to ${formatAmount(maxSeconds)}` : formatAmount(seconds),
      text: whole.trim()
    });
  }
  return timers;
}

// "0:42", "12:05", "1:02:30".
export function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = String(safe % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}
