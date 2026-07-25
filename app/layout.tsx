import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nemesys — Agent update radar",
  description: "Discover public agent skill updates, inspect the diff, and check fleet compatibility."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <div className="ambient-grid" aria-hidden="true" />
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Nemesys home">
            <span className="portal-mark" aria-hidden="true"><i /></span>
            <span>NEMESYS</span>
            <small>COMMUNITY RADAR</small>
          </Link>
          <nav aria-label="Primary navigation">
            <Link href="/#updates">Updates</Link>
            <Link href="/#discover">Discover</Link>
            <Link href="/#signals">Signals</Link>
            <Link href="/curator">Curator</Link>
          </nav>
          <div className="network-status">
            <span aria-hidden="true" /> PUBLIC NET
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <p>Nemesys indexes public sources. Verify before you install.</p>
          <p className="mono">NO PRIVATE FLEET DATA IN THE CATALOG</p>
        </footer>
      </body>
    </html>
  );
}
