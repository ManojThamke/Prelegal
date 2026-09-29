"use client";

import { useEffect, useState } from "react";

import NdaForm from "@/components/NdaForm";
import NdaPreview from "@/components/NdaPreview";
import { defaultNdaData, missingFields, pdfFileName, type NdaData, type NdaTemplate } from "@/lib/nda";

function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function NdaCreator({ template }: { template: NdaTemplate }) {
  const [data, setData] = useState<NdaData>(defaultNdaData);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default the Effective Date to the user's local "today". Done after mount so the
  // statically prerendered HTML doesn't bake in the build date.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData((d) => (d.effectiveDate ? d : { ...d, effectiveDate: todayIso() }));
  }, []);

  const missing = missingFields(data);

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      // Loaded on demand: the PDF renderer is large and only needed on download.
      const [{ pdf }, { default: NdaPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/NdaPdf"),
      ]);
      const blob = await pdf(<NdaPdf template={template} data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfFileName(data);
      a.click();
      // Give the browser a moment to start the download before releasing the blob.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
      setError("Sorry, the PDF could not be generated. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <NdaForm data={data} onChange={setData} />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {missing.length === 0 ? (
              "All required fields are complete."
            ) : (
              <>
                <span className="font-medium text-slate-800">Still needed:</span> {missing.join(", ")}
              </>
            )}
          </p>
          <button
            type="button"
            onClick={download}
            disabled={missing.length > 0 || downloading}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {downloading ? "Preparing PDF…" : "Download PDF"}
          </button>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <NdaPreview template={template} data={data} />
      </div>
    </div>
  );
}
