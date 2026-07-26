import type { Metadata } from "next";
import Link from "next/link";
import { AtlantisTicker } from "@/components/atlantis-ticker";
import { OpenGate } from "@/components/open-gate";
import { getCatalog } from "@/lib/catalog";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlantis — Public Agent Registry",
  description: "Discover public agent-skill updates, inspect the evidence, and check fleet compatibility."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const catalog = await getCatalog();
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <AtlantisTicker skills={catalog.skills} />
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Atlantis public agent registry home">
            <span className="atlantis-mark" aria-hidden="true"><i /></span>
            <span>ATLANTIS</span>
            <small>PUBLIC AGENT REGISTRY</small>
          </Link>
          <nav aria-label="Primary navigation">
            <Link href="/#surface">Shell Court</Link>
            <Link href="/#registry">Deep Registry</Link>
            <Link href="/#signals">Signals</Link>
            <Link href="/curator">Curator</Link>
          </nav>
          <OpenGate />
        </header>
        {children}
        <footer className="site-footer">
          <p><strong>ATLANTIS</strong> indexes public sources. Verify before you install.</p>
          <p className="mono">NEMESYS PROTOCOL · NO PRIVATE FLEET DATA IN THE CATALOG</p>
        </footer>
      </body>
    </html>
  );
}
