import Link from "next/link";

export function AppState({
  eyebrow,
  title,
  message,
  action
}: {
  eyebrow: string;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <main className="detail-shell" id="main" tabIndex={-1}>
      <section className="detail-panel" style={{ marginTop: "3rem", maxWidth: 760 }}>
        <span className="eyebrow">{eyebrow}</span>
        <h1 style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)", marginBottom: ".5rem" }}>{title}</h1>
        <p>{message}</p>
        {action || <Link className="secondary-button" href="/">Return to the registry</Link>}
      </section>
    </main>
  );
}
