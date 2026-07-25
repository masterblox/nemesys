import Link from "next/link";
import { notFound } from "next/navigation";
import { getCreator } from "@/lib/catalog";

export default async function CreatorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const creator = await getCreator(handle);
  if (!creator) notFound();
  return (
    <main className="detail-shell" id="main">
      <Link className="back-link" href="/">← PUBLIC RADAR</Link>
      <section className="detail-hero"><div><span className="eyebrow">Public creator profile</span><h1>{creator.handle}</h1><p>Identity links are shown only when verified by explicit public repository metadata.</p></div></section>
      <div className="skill-grid">{creator.skills.map((skill) => <article className="skill-card" key={skill.id}><h3>{skill.name}</h3><p>{skill.description}</p><Link className="card-link" href={`/skills/${skill.id}`} aria-label={`Open ${skill.name}`} /></article>)}</div>
    </main>
  );
}
