import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/catalog";

export default async function RepositoryPage({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;
  const repository = await getRepository(owner, repo);
  if (!repository) notFound();
  return (
    <main className="detail-shell" id="main">
      <Link className="back-link" href="/">← PUBLIC RADAR</Link>
      <section className="detail-hero"><div><span className="eyebrow">Verified public repository</span><h1>{owner}/{repo}</h1><p>{repository.skills.length} indexed public skill{repository.skills.length === 1 ? "" : "s"} resolve to this source.</p></div></section>
      <div className="skill-grid">{repository.skills.map((skill) => <article className="skill-card" key={skill.id}><h3>{skill.name}</h3><p>{skill.description}</p><Link className="card-link" href={`/skills/${skill.id}`} aria-label={`Open ${skill.name}`} /></article>)}</div>
    </main>
  );
}
