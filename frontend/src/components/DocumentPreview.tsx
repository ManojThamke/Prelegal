import {
  ATTRIBUTION_URL,
  attribution,
  keyTerms,
  signatureRows,
  type DocumentSpec,
  type Draft,
} from "@/lib/documents";
import { DISCLAIMER } from "@/components/ui";
import { clauseLabel, clauseNumber, isSection, type Clause, type Run } from "@/lib/template";

type Props = { spec: DocumentSpec; clauses: Clause[]; draft: Draft };

/** HTML preview of the drafted document: Key Terms, signatures, and the Standard Terms. */
export default function DocumentPreview({ spec, clauses, draft }: Props) {
  return (
    <article aria-label={spec.name} className="mx-auto max-w-[8.5in] rounded-sm bg-white px-8 py-12 font-serif text-[14px] leading-relaxed text-slate-900 shadow-[0_1px_3px_rgba(3,33,71,0.08),0_8px_24px_rgba(3,33,71,0.06)] ring-1 ring-slate-200 sm:px-16">
      <p className="text-center font-sans text-xs text-slate-500">Draft for legal review</p>
      <h2 className="mt-2 text-center text-2xl font-bold text-brand-navy">{spec.name}</h2>

      <h3 className="mt-10 text-lg font-bold text-brand-navy">Key terms</h3>
      <dl className="mt-2 divide-y divide-slate-200 border-y border-slate-200">
        {keyTerms(spec, draft).map((term) => (
          <div key={term.label} className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)] gap-4 py-2">
            <dt className="font-bold">{term.label}</dt>
            <dd
              className={`whitespace-pre-wrap ${term.placeholder ? "highlight font-sans text-sm text-slate-700" : ""}`}
            >
              {term.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-8">
        By signing below, each party agrees to enter into this {spec.name} as of the date of the last
        signature below, including the Key Terms above and the Standard Terms that follow.
      </p>

      <table className="mt-4 w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="w-1/4 border border-slate-400 p-2" />
            {spec.roles.map((role) => (
              <th key={role} className="border border-slate-400 p-2 text-center uppercase">
                {role}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {signatureRows(draft).map((row) => (
            <tr key={row.label}>
              <th className="border border-slate-400 p-2 font-semibold">{row.label}</th>
              {row.values.map((v, i) => (
                <td key={i} className="h-10 whitespace-pre-wrap border border-slate-400 p-2">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-16 border-t border-slate-300 pt-12 text-center text-2xl font-bold text-brand-navy">Standard Terms</h3>
      <div className="mt-6 space-y-4 text-justify">
        {clauses.map((clause, i) => (
          <ClauseView key={i} clause={clause} number={clause.marker} />
        ))}
      </div>

      <p className="mt-10 border-t border-slate-200 pt-4 font-sans text-xs leading-relaxed text-slate-500">
        {DISCLAIMER}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        <a href={ATTRIBUTION_URL} target="_blank" rel="noreferrer" className="underline">
          {attribution(spec)}
        </a>
      </p>
    </article>
  );
}

function ClauseView({ clause, number }: { clause: Clause; number: string }) {
  const label = clauseLabel(clause, number);
  const children = clause.children.map((child, i) => (
    <ClauseView key={i} clause={child} number={clauseNumber(child, number)} />
  ));

  if (isSection(clause)) {
    return (
      <section className="space-y-2">
        <h4 className="font-bold">
          {label} {clause.title}
        </h4>
        {clause.body.length > 0 && (
          <p>
            <Runs runs={clause.body} />
          </p>
        )}
        {children}
      </section>
    );
  }
  return (
    <div className={clause.level >= 2 ? "ml-6 space-y-1" : "space-y-1"}>
      <p>
        {label}{" "}
        {clause.title && <strong>{clause.title}. </strong>}
        <Runs runs={clause.body} />
      </p>
      {children}
    </div>
  );
}

function Runs({ runs }: { runs: Run[] }) {
  return runs.map((run, i) => {
    switch (run.kind) {
      case "bold":
        return (
          <strong key={i}>
            <Runs runs={run.runs} />
          </strong>
        );
      case "term":
        return (
          <span key={i} className="underline decoration-slate-400 underline-offset-2">
            {run.text}
          </span>
        );
      case "link":
        return (
          <a key={i} href={run.href} className="text-brand-blue underline" target="_blank" rel="noreferrer">
            {run.text}
          </a>
        );
      default:
        return <span key={i}>{run.text}</span>;
    }
  });
}
