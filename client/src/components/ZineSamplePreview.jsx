import { ArrowLeft, ArrowRight, Leaf } from "lucide-react";
import OnePageZine from "./OnePageZine.jsx";
import "./zine.css";
export function ZineEntry({ onOpen }) {
  return <section className="zine-entry"><span className="zine-label">Local prototype</span>
    <div className="zine-entry-art" aria-hidden="true"><Leaf size={40} /><span>A recipe worth<br />keeping.</span></div>
    <h2>ChefSpark One-Page Zine</h2><p>Your recipe, reimagined as a handmade editorial page. Three looks, the same delicious details.</p>
    <button type="button" className="zine-primary" onClick={onOpen}>Create My ChefSpark Zine <ArrowRight size={18} aria-hidden="true" /></button>
    <p className="zine-caption">Local preview only. No AI generation or saving.</p>
  </section>;
}
export default function ZineSamplePreview({ recipe, view, styleId = "collage", assetSample = null, onNavigate, onBackToRecipe }) {
  return <main className="app-page zine-screen">
    <header className="zine-topbar"><button type="button" className="zine-secondary" onClick={onBackToRecipe}><ArrowLeft size={18} aria-hidden="true" />Back to Recipe</button><span><Leaf size={18} aria-hidden="true" />ChefSpark</span></header>
    <div className="zine-heading"><span className="zine-label">Local prototype · no AI generation</span><h1 id="zine-heading" tabIndex={-1}>Your One-Page Zine</h1><p>One recipe. Three ways to tell its story.</p></div>
    {view === "intro" ? <section className="zine-intro"><Leaf size={46} aria-hidden="true" /><h2>A little paper. A lot of personality.</h2><p>Preview <strong>{recipe?.title}</strong> with every ingredient and instruction rendered as readable text. The page grows with your recipe.</p><button type="button" className="zine-primary" onClick={() => onNavigate("preview")}>Preview One-Page Zine <ArrowRight size={18} aria-hidden="true" /></button></section> : <OnePageZine recipe={recipe} styleId={styleId} assets={assetSample?.assets} />}
    <p className="zine-caption">{assetSample
      ? `Development sample: AI-generated artwork manually reviewed on ${assetSample.reviewedOn}, for ${assetSample.recipeTitle} only. All recipe facts are rendered as text, not taken from the images.`
      : "Local frontend preview. Existing recipe photography or a visual placeholder only. No personalized AI image has been generated."}</p>
    <button type="button" className="zine-secondary" onClick={onBackToRecipe}><ArrowLeft size={18} aria-hidden="true" />Back to Recipe</button>
  </main>;
}
