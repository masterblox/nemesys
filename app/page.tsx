import { RadarDashboard } from "@/components/radar-dashboard";
import { PortalEntrance } from "@/components/portal-entrance";
import { getCatalog } from "@/lib/catalog";

export const revalidate = 300;

export default async function HomePage() {
  const catalog = await getCatalog();
  const revisions = catalog.skills.reduce((total, skill) => total + skill.revisions.length, 0);
  const passed = catalog.skills.filter((skill) => skill.auditStatus === "pass").length;
  return (
    <>
      <PortalEntrance />
      <main className="atlantis-home" id="main" tabIndex={-1}>
        <section className="shell-court" id="surface" aria-labelledby="surface-title">
          <div className="shell-court__shade" aria-hidden="true" />
          <div className="shell-court__copy">
            <span className="eyebrow">The shell court · public intelligence above the trench</span>
            <h1 id="surface-title">Updates report<br /><em>before deployment.</em></h1>
            <p>
              Atlantis watches public skills, repositories, creators, and emerging signals. Inspect what changed, trace the source, then ask whether it fits your fleet.
            </p>
            <div className="hero-actions">
              <a className="primary-button ocean-button" href="#registry">Descend to the registry <span aria-hidden="true">↓</span></a>
              <a className="secondary-button" href="#signals">Read the currents</a>
            </div>
          </div>
          <aside className="court-readout" aria-label="Current public registry status">
            <span>Ocean authority / public evidence</span>
            <strong>Shell court verified.</strong>
            <p>{catalog.skills.length} public skills · {revisions} revisions · {passed} audits passed</p>
          </aside>
        </section>

        <section className="descent-seam" aria-label="Descent from shell court to deep registry">
          <div>
            <span>Pressure seam / content-hash depth</span>
            <h2>Follow every change<br />to its source.</h2>
            <p>Releases are useful. Content hashes catch the updates that tags miss. Atlantis retains readable revisions, public attribution, permissions, and audits.</p>
          </div>
          <div className="depth-gauge" aria-hidden="true"><i /><i /><i /><b>2,100M</b></div>
        </section>

        <section className="deep-registry" id="registry" aria-labelledby="updates-title">
          <div className="deep-registry__backdrop" aria-hidden="true" />
          <div className="registry-content">
            <div className="section-head">
              <div><span className="section-kicker">Mariana Trench registry</span><h2 id="updates-title">Search below the surface.</h2></div>
              <p>Every capability resolves to a public source. Ask Dev compares public evidence with browser-local capability names—never secrets or private fleet data.</p>
            </div>
            <RadarDashboard catalog={catalog} />
          </div>
        </section>
      </main>
    </>
  );
}
