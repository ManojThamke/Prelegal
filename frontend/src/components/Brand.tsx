/** The Prelegal wordmark: the name set in the document serif, "legal" under a highlighter stroke. */
export default function Brand({ className = "", inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={`font-serif font-semibold tracking-tight ${inverted ? "text-white" : "text-brand-navy"} ${className}`}>
      Pre<span className={inverted ? "text-brand-yellow" : "highlight"}>legal</span>
    </span>
  );
}
