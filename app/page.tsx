import { RadarDashboard } from "@/components/radar-dashboard";
import { getCatalog } from "@/lib/catalog";

export const revalidate = 300;

export default async function HomePage() {
  const catalog = await getCatalog();
  return (
    <main className="page-shell" id="main">
      <section className="hero">
        <div>
          <span className="eyebrow">Public agent intelligence · live multiverse feed</span>
          <h1>Know what changed. <em>Before your fleet does.</em></h1>
          <p className="hero-copy">
            Nemesys watches the public agent-skill ecosystem, surfaces meaningful updates, and tells you whether a capability deserves a place in your fleet.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#discover">Scan the updates <span aria-hidden="true">↘</span></a>
            <a className="secondary-button" href="#signals">Browse community signals</a>
          </div>
        </div>
        <div className="portal-orbit" aria-label={`${catalog.skills.length} public skills currently in this radar view`}>
          <div className="orbit-core" aria-hidden="true" />
          <span className="orbit-label one">PUBLIC SOURCES / VERIFIED</span>
          <span className="orbit-label two">{catalog.skills.length.toString().padStart(3, "0")} SKILLS IN RANGE</span>
        </div>
      </section>
      <div className="transmission-rail" aria-hidden="true">
        <div className="rail-track">
          {[0, 1].map((group) => (
            <span key={group}><b>NEW TRANSMISSION</b> CONTENT HASHES · PUBLIC AUDITS · CREATOR ACTIVITY · READABLE DIFFS · FLEET FIT ·</span>
          ))}
        </div>
      </div>
      <section id="updates" aria-labelledby="updates-title">
        <div className="section-head">
          <div><span className="section-kicker">Update registry</span><h2 id="updates-title">Fresh through the portal.</h2></div>
          <p>Every card resolves to a public source. Updates are detected from content changes—not marketing noise.</p>
        </div>
        <RadarDashboard catalog={catalog} />
      </section>
    </main>
  );
}
