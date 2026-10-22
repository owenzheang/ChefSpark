// Product feature switches. The One-Page Zine is paused (2026-10-22) while ChefSpark
// refocuses on being a cooking companion; its code stays and can be re-enabled with
// VITE_ZINE_ENABLED=true. Server-side artwork generation has its own ZINE_GENERATION_ENABLED.
export const features = Object.freeze({
  zine: import.meta.env.VITE_ZINE_ENABLED === "true"
});
