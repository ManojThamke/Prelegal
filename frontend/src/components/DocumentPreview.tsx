import {
  ATTRIBUTION_URL,
  attribution,
  keyTerms,
  signatureRows,
  type DocumentSpec,
  type Draft,
} from "@/lib/documents";
import { clauseLabel, clauseNumber, isSection, type Clause, type Run } from "@/lib/template";

type Props = { spec: DocumentSpec; clauses: Clause[]; draft: Draft };

/** HTML preview of the drafted document: Key Terms, signatures, and the Standard Terms. */
export default function DocumentPreview({ spec, clauses, draft }: Props) {
  return (
    <article className="mx-auto max-w-[8.5in] bg-white px-10 py-12 font-serif text-[13px] leading-relaxed text-slate-900 shadow-lg ring-1 ring-slate-200 sm:px-16">
      <h1 className="text-center text-2xl font-bold">{spec.name}</h1>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide">Key Terms</h2>
      <dl className="mt-2 divide-y divide-slate-200 border-y border-slate-200">
        {keyTerms(spec, draft).map((term) => (
          <div key={term.label} className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)] gap-4 py-2">
            <dt className="font-bold">{term.label}</dt>
            <dd
              className={`whitespace-pre-wrap ${term.placeholder ? "rounded bg-amber-100 px-1 text-amber-900" : ""}`}
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

      <h1 className="mt-16 border-t border-slate-300 pt-12 text-center text-2xl font-bold">Standard Terms</h1>
      <div className="mt-6 space-y-4 text-justify">
        {clauses.map((clause, i) => (
          <ClauseView key={i} clause={clause} number={clause.marker} />
        ))}
      </div>

      <p className="mt-6 text-xs text-slate-500">
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
        <h3 className="font-bold">
          {label} {clause.title}
        </h3>
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
