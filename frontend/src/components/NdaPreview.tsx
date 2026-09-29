import {
  ATTRIBUTION,
  ATTRIBUTION_URL,
  coverSections,
  signatureRows,
  type NdaData,
  type NdaTemplate,
  type Run,
} from "@/lib/nda";

type Props = { template: NdaTemplate; data: NdaData };

export default function NdaPreview({ template, data }: Props) {
  return (
    <article className="mx-auto max-w-[8.5in] bg-white px-10 py-12 font-serif text-[13px] leading-relaxed text-slate-900 shadow-lg ring-1 ring-slate-200 sm:px-16">
      <h1 className="text-center text-2xl font-bold">Mutual Non-Disclosure Agreement</h1>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide">
        Using this Mutual Non-Disclosure Agreement
      </h2>
      <p className="mt-2">
        <Runs runs={template.coverIntro} />
      </p>

      {coverSections(data).map((section) => (
        <section key={section.heading} className="mt-6">
          <h3 className="font-bold">{section.heading}</h3>
          {section.label && <p className="text-xs italic text-slate-500">{section.label}</p>}
          {section.lines.map((line) => (
            <p
              key={line.text}
              className={`mt-1 whitespace-pre-wrap ${line.placeholder ? "rounded bg-amber-100 px-1 text-amber-900" : ""}`}
            >
              {line.text}
            </p>
          ))}
        </section>
      ))}

      <p className="mt-8">
        By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective
        Date.
      </p>

      <table className="mt-4 w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="w-1/4 border border-slate-400 p-2" />
            <th className="border border-slate-400 p-2 text-center">PARTY 1</th>
            <th className="border border-slate-400 p-2 text-center">PARTY 2</th>
          </tr>
        </thead>
        <tbody>
          {signatureRows(data).map((row) => (
            <tr key={row.label}>
              <th className="border border-slate-400 p-2 font-semibold">{row.label}</th>
              {row.values.map((v, i) => (
                <td key={i} className="h-10 border border-slate-400 p-2 whitespace-pre-wrap">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <Attribution />

      <h1 className="mt-16 border-t border-slate-300 pt-12 text-center text-2xl font-bold">
        Standard Terms
      </h1>
      <ol className="mt-6 space-y-4">
        {template.clauses.map((clause) => (
          <li key={clause.number} className="text-justify">
            {clause.number}. <strong>{clause.title}</strong>. <Runs runs={clause.body} />
          </li>
        ))}
      </ol>

      <Attribution />
    </article>
  );
}

function Runs({ runs }: { runs: Run[] }) {
  return runs.map((run, i) => {
    switch (run.kind) {
      case "bold":
        return <strong key={i}>{run.text}</strong>;
      case "term":
        return (
          <span key={i} className="underline decoration-slate-400 underline-offset-2">
            {run.text}
          </span>
        );
      case "link":
        return (
          <a key={i} href={run.href} className="text-indigo-700 underline" target="_blank" rel="noreferrer">
            {run.text}
          </a>
        );
      default:
        return <span key={i}>{run.text}</span>;
    }
  });
}

function Attribution() {
  return (
    <p className="mt-6 text-xs text-slate-500">
      <a href={ATTRIBUTION_URL} target="_blank" rel="noreferrer" className="underline">
        {ATTRIBUTION}
      </a>
    </p>
  );
}
