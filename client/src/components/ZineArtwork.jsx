import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, RefreshCw, Trash2, LoaderCircle } from "lucide-react";
import { getZineArtwork, createZineArtwork, deleteZineArtwork, getZineImageUrl } from "../services/api.js";

const kinds = ["hero", "cooking", "ingredients", "decoration"];
const altText = title => ({
  hero: `AI-generated illustration of ${title || "the finished dish"}`,
  cooking: "AI-generated cooking scene",
  ingredients: "AI-generated ingredient illustration",
  decoration: ""
});
const pollMs = 3000, maxPolls = 100;

// Loads, creates and removes a saved recipe's AI artwork. Recipe facts never come from the images.
export function useZineArtwork({ savedRecipeId, title, active, api = { getZineArtwork, createZineArtwork, deleteZineArtwork, getZineImageUrl } }) {
  const [state, setState] = useState({ loading: false, zine: null, availability: null, message: "", busy: false });
  const [assets, setAssets] = useState(null);
  const urls = useRef([]);
  const polls = useRef(0);

  const revoke = () => { urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current = []; };

  const load = useCallback(async () => {
    try {
      const data = await api.getZineArtwork(savedRecipeId);
      setState(current => ({ ...current, loading: false, zine: data.zine, availability: data.availability }));
    } catch (error) {
      setState(current => ({ ...current, loading: false, message: error.message }));
    }
  }, [savedRecipeId]);

  useEffect(() => {
    if (!active || savedRecipeId == null) return;
    setState(current => ({ ...current, loading: true }));
    load();
  }, [active, savedRecipeId, load]);

  // Poll while the server is generating; stop after a bounded number of checks.
  useEffect(() => {
    if (state.zine?.status !== "generating") { polls.current = 0; return; }
    if (polls.current >= maxPolls) {
      setState(current => ({ ...current, message: "This is taking longer than expected. Check back later." }));
      return;
    }
    const timer = setTimeout(() => { polls.current += 1; load(); }, pollMs);
    return () => clearTimeout(timer);
  }, [state.zine, load]);

  // Fetch the four images once per ready Zine version.
  const readyKey = state.zine?.status === "ready" ? `${state.zine.id}:${state.zine.updatedAt}` : null;
  useEffect(() => {
    if (!readyKey) { revoke(); setAssets(null); return; }
    let cancelled = false;
    Promise.all(kinds.map(kind => api.getZineImageUrl(state.zine.id, kind))).then(loaded => {
      if (cancelled) { loaded.forEach(url => URL.revokeObjectURL(url)); return; }
      revoke(); urls.current = loaded;
      const alts = altText(title);
      setAssets(Object.fromEntries(kinds.map((kind, i) => [kind, { src: loaded[i], alt: alts[kind] }])));
    }).catch(() => { if (!cancelled) setState(current => ({ ...current, message: "The artwork could not be loaded." })); });
    return () => { cancelled = true; };
  }, [readyKey]);

  useEffect(() => revoke, []);

  async function act(action) {
    setState(current => ({ ...current, busy: true, message: "" }));
    try {
      await action();
      await load();
    } catch (error) {
      setState(current => ({ ...current, message: error.message }));
    } finally {
      setState(current => ({ ...current, busy: false }));
    }
  }

  return {
    ...state, assets, saved: savedRecipeId != null,
    create: () => act(() => api.createZineArtwork(savedRecipeId, false)),
    regenerate: () => act(() => api.createZineArtwork(savedRecipeId, true)),
    remove: () => act(() => api.deleteZineArtwork(state.zine.id))
  };
}

export function ZineArtworkPanel({ artwork }) {
  const { saved, loading, zine, availability, message, busy } = artwork;
  const remaining = availability?.remainingToday ?? 0;
  const canCreate = availability?.enabled && remaining > 0 && !busy;
  const left = availability?.enabled ? <small>{remaining} of today's creations left</small> : null;
  let body;
  if (!saved) body = <p>Save this recipe to add personalised AI artwork.</p>;
  else if (loading) body = <p>Checking for artwork…</p>;
  else if (zine?.status === "generating") body = <p className="zine-artwork-progress" role="status"><LoaderCircle size={18} aria-hidden="true" />Creating your artwork. This usually takes under a minute.</p>;
  else if (zine?.status === "ready") body = <div className="zine-artwork-actions">
    <button type="button" className="zine-secondary" disabled={!canCreate} onClick={artwork.regenerate}><RefreshCw size={16} aria-hidden="true" />Create new artwork</button>
    <button type="button" className="zine-secondary" disabled={busy} onClick={artwork.remove}><Trash2 size={16} aria-hidden="true" />Remove artwork</button>{left}</div>;
  else if (!availability?.enabled) body = <p>AI artwork isn't available right now. Your Zine works without it.</p>;
  else body = <div className="zine-artwork-actions">
    {zine?.status === "failed" && <p role="alert">{zine.error}</p>}
    <button type="button" className="zine-primary" disabled={!canCreate} onClick={artwork.create}><Sparkles size={18} aria-hidden="true" />{zine?.status === "failed" ? "Try again" : "Create AI artwork"}</button>{left}
    {remaining === 0 && <p>You've used today's artwork creations. Try again tomorrow.</p>}</div>;
  return <section className="zine-artwork" aria-label="AI artwork">{body}{message && <p role="alert">{message}</p>}</section>;
}
