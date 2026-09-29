import type { Metadata } from "next";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// Public Sans for the interface; Source Serif for page titles and the documents themselves.
const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Prelegal",
  description: "Draft legal agreements from Common Paper templates with an AI assistant.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${publicSans.variable} ${sourceSerif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-paper font-sans text-slate-800">{children}</body>
    </html>
  );
}
