import { ArrowLeft, ArrowRight, Leaf } from "lucide-react";
import OnePageZine from "./OnePageZine.jsx";
import "./zine.css";
export function ZineEntry({ onOpen }) {
  return <section className="zine-entry"><span className="zine-label">One-Page Zine</span>
    <div className="zine-entry-art" aria-hidden="true"><Leaf size={40} /><span>A recipe worth<br />keeping.</span></div>
    <h2>ChefSpark One-Page Zine</h2><p>Your recipe, reimagined as a handmade editorial page. Three looks, the same delicious details.</p>
    <button type="button" className="zine-primary" onClick={onOpen}>Create My ChefSpark Zine <ArrowRight size={18} aria-hidden="true" /></button>
    <p className="zine-caption">Saved recipes can add optional AI artwork.</p>
  </section>;
}
// Presentation only: artwork state and API calls live in ZineArtwork.jsx and arrive as props.
export default function ZineSamplePreview({ recipe, view, styleId = "collage", assetSample = null, artworkAssets = null, artworkPanel = null, onNavigate, onBackToRecipe }) {
  const assets = artworkAssets || assetSample?.assets;
  return <main className="app-page zine-screen">
    <header className="zine-topbar"><button type="button" className="zine-secondary" onClick={onBackToRecipe}><ArrowLeft size={18} aria-hidden="true" />Back to Recipe</button><span><Leaf size={18} aria-hidden="true" />ChefSpark</span></header>
    <div className="zine-heading"><span className="zine-label">One-Page Zine</span><h1 id="zine-heading" tabIndex={-1}>Your One-Page Zine</h1><p>One recipe. Three ways to tell its story.</p></div>
    {view === "intro" ? <section className="zine-intro"><Leaf size={46} aria-hidden="true" /><h2>A little paper. A lot of personality.</h2><p>Preview <strong>{recipe?.title}</strong> with every ingredient and instruction rendered as readable text. The page grows with your recipe.</p><button type="button" className="zine-primary" onClick={() => onNavigate("preview")}>Preview One-Page Zine <ArrowRight size={18} aria-hidden="true" /></button></section>
      : <>{artworkPanel}<OnePageZine recipe={recipe} styleId={styleId} assets={assets} /></>}
    <p className="zine-caption">{artworkAssets
      ? "AI-generated artwork, for illustration only. Every ingredient, amount and step comes from your saved recipe."
      : assetSample
        ? `Development sample: AI-generated artwork manually reviewed on ${assetSample.reviewedOn}, for ${assetSample.recipeTitle} only. All recipe facts are rendered as text, not taken from the images.`
        : "Recipe photography or a visual placeholder. No AI artwork has been created for this Zine."}</p>
    <button type="button" className="zine-secondary" onClick={onBackToRecipe}><ArrowLeft size={18} aria-hidden="true" />Back to Recipe</button>
  </main>;
}
