import { useEffect, useRef, useState } from "react";

// Phase 5b: the browser's own speech recognition (Web Speech API). Free and no server involved, but
// the browser may send the audio to its speech service (Chrome: Google). Needs HTTPS or localhost;
// missing in Firefox, so callers hide the button when unsupported.
export function getSpeechRecognition(win = globalThis.window) {
  return win?.SpeechRecognition || win?.webkitSpeechRecognition || null;
}

const errorMessages = {
  "not-allowed": "Microphone access is blocked. Allow it in your browser settings, or type instead.",
  "service-not-allowed": "Voice input isn't allowed here. Please type instead.",
  "no-speech": "Didn't catch that. Tap the microphone and try again.",
  "audio-capture": "No microphone found. Please type instead.",
  network: "Voice input needs a connection. Please type instead."
};

export function useSpeechInput({ onText, lang = "en-AU" }) {
  const [supported] = useState(() => Boolean(getSpeechRecognition()));
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognition = useRef(null);
  const latestOnText = useRef(onText);
  latestOnText.current = onText;

  useEffect(() => () => recognition.current?.abort(), []);

  function start() {
    const Recognition = getSpeechRecognition();
    if (!Recognition || recognition.current) return;
    const instance = new Recognition();
    instance.lang = lang;
    instance.interimResults = false;
    instance.continuous = false;
    instance.maxAlternatives = 1;
    instance.onresult = (event) => {
      const text = Array.from(event.results, (result) => result[0]?.transcript || "").join(" ").trim();
      if (text) latestOnText.current(text);
    };
    instance.onerror = (event) => {
      if (event.error !== "aborted") setError(errorMessages[event.error] || "Voice input isn't available right now. Please type instead.");
    };
    instance.onend = () => {
      recognition.current = null;
      setListening(false);
    };
    recognition.current = instance;
    setError("");
    setListening(true);
    try {
      instance.start();
    } catch {
      recognition.current = null;
      setListening(false);
      setError("Voice input isn't available right now. Please type instead.");
    }
  }

  function stop() {
    recognition.current?.stop();
  }

  return { supported, listening, error, start, stop };
}
