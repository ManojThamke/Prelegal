/** The Prelegal wordmark. */
export default function Brand({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold text-brand-navy ${className}`}>
      Pre<span className="text-brand-yellow">legal</span>
    </span>
  );
}
