import NdaCreator from "@/components/NdaCreator";
import { loadMutualNdaTemplate } from "@/lib/templates";

export default async function Home() {
  const template = await loadMutualNdaTemplate();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Prelegal</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Mutual NDA Creator</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Fill in the key terms and party details. The agreement updates as you type, and you can
          download the completed document as a PDF.
        </p>
      </header>
      <NdaCreator template={template} />
    </main>
  );
}
