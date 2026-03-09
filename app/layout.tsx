import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CircuitAI — Analog Design Platform",
  description:
    "AI-powered agentic analog circuit design platform. Describe your circuit requirements and let the AI agent design, simulate, and optimize for you.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
