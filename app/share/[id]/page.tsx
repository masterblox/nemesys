import Link from "next/link";
import { notFound } from "next/navigation";
import { getShareCard } from "@/lib/share-store";

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getShareCard(id);
  if (!card) notFound();
  return (
    <main className="detail-shell" id="main">
      <Link className="back-link" href="/">NEMESYS / SHARED VERDICT</Link>
      <section className="detail-panel" style={{ marginTop: "3rem", maxWidth: 760 }}>
        <span className="eyebrow">Privacy-safe compatibility card</span>
        <h1 style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)", marginBottom: ".5rem" }}>{card.skillName}</h1>
        <h2 className={`verdict ${card.verdict}`}>{card.verdict}</h2>
        <p>{card.explanation}</p>
        <ul className="result-list">{card.publicReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        <p className="privacy-note">This card contains public evidence only. The operator’s fleet selections were not saved or shared.</p>
        <a className="secondary-button" href={card.sourceUrl} target="_blank" rel="noreferrer">Inspect public source ↗</a>
      </section>
    </main>
  );
}
