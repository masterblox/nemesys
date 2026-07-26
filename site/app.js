const MANIFEST_PATHS = [
  "../packages/@demo/portal-cartographer/v1.0.0/nemesys.yml",
  "../packages/@demo/abyssal-security-auditor/v2.1.0/nemesys.yml",
  "../packages/@demo/cable-signal-router/v0.9.3/nemesys.yml",
];

const CHARACTER_SPECS = {
  butter: { id: 826, name: "Butter Robot", image: "https://rickandmortyapi.com/api/character/avatar/826.jpeg" },
  scary: { id: 306, name: "Scary Terry", image: "https://rickandmortyapi.com/api/character/avatar/306.jpeg" },
  eyehole: { id: 121, name: "Eyehole Man", image: "https://rickandmortyapi.com/api/character/avatar/121.jpeg" },
  krombopulos: { id: 196, name: "Krombopulos Michael", image: "https://rickandmortyapi.com/api/character/avatar/196.jpeg" },
};

const PORTAL_SESSION_KEY = "atlantis.portalIntroSeen.v1";
const LEGACY_HASHES = new Set(["#/cable", "#/portal", "#/atlantis"]);
const SUPPORTED_ANCHORS = new Set(["", "#surface", "#registry"]);

const BUTTER_MESSAGES = [
  "Purpose: index package manifests.",
  "Passing butter. Parsing YAML.",
  "One existential task at a time.",
  "Registry purpose nearly fulfilled.",
];

const state = {
  packages: [],
  characters: structuredClone(CHARACTER_SPECS),
  query: "",
  risk: "all",
  tickerPaused: false,
  particles: [],
  frame: 0,
  loadingStarted: performance.now(),
  portalTimers: [],
};

const root = document.querySelector("#scenarioRoot");
const ticker = document.querySelector("#ticker");
const nav = document.querySelector("#worldNav");
const portalEntrance = document.querySelector("#portalEntrance");
const loadLayer = document.querySelector("#loadLayer");
const butterTask = document.querySelector("#butterTask");
const stateLayer = document.querySelector("#stateLayer");
const drawer = document.querySelector("#manifestDrawer");
const confirms = document.querySelector("#confirmStack");
const canvas = document.querySelector("#ambientCanvas");
const context = canvas.getContext("2d", { alpha: true });

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function attr(value = "") {
  return esc(value);
}

function normalizeLocation() {
  const hash = window.location.hash;
  if (LEGACY_HASHES.has(hash) || !SUPPORTED_ANCHORS.has(hash)) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    return "";
  }
  return hash;
}

const initialAnchor = normalizeLocation();

function character(persona, options = {}) {
  const data = state.characters[persona] || CHARACTER_SPECS[persona];
  const size = options.size || "md";
  return `
    <span class="character character--${persona} character--${size} ${options.className || ""}" data-persona="${persona}" title="${attr(options.label || data.name)}">
      <span class="character__fallback" aria-hidden="true"></span>
      <img src="${attr(data.image)}" alt="${attr(options.label || data.name)}" ${options.eager ? 'loading="eager"' : 'loading="lazy"'}>
      <span class="character__blink" aria-hidden="true"></span>
      <span class="character__status" aria-hidden="true"></span>
    </span>`;
}

function parseYaml(source) {
  const lines = source.split(/\r?\n/);
  const rootValue = {};
  const stack = [{ indent: -1, value: rootValue }];

  const nextContent = (start) => {
    for (let index = start + 1; index < lines.length; index += 1) {
      const raw = lines[index];
      if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
      return raw.trim();
    }
    return "";
  };

  lines.forEach((rawLine, index) => {
    if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) return;
    const indent = rawLine.length - rawLine.trimStart().length;
    const line = rawLine.trim();
    while (stack.at(-1).indent >= indent) stack.pop();
    const parent = stack.at(-1).value;

    if (line.startsWith("- ")) {
      if (!Array.isArray(parent)) throw new Error(`Unexpected YAML list item on line ${index + 1}`);
      parent.push(parseScalar(line.slice(2).trim()));
      return;
    }

    const match = /^([A-Za-z0-9_]+):(?:\s*(.*))?$/.exec(line);
    if (!match) throw new Error(`Unsupported YAML syntax on line ${index + 1}`);
    const [, key, rawValue = ""] = match;
    if (rawValue === "") {
      const container = nextContent(index).startsWith("- ") ? [] : {};
      parent[key] = container;
      stack.push({ indent, value: container });
    } else {
      parent[key] = parseScalar(rawValue);
    }
  });

  return rootValue;
}

function parseScalar(value) {
  if (value === "[]") return [];
  if (value === "{}") return {};
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(value) && !/^\d+\.\d+\.\d+/.test(value)) return Number(value);
  return value.replace(/^(['"])(.*)\1$/, "$2");
}

async function fetchManifests() {
  const responses = await Promise.all(MANIFEST_PATHS.map(async (path, index) => {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not read ${path} (${response.status})`);
    const raw = await response.text();
    const manifest = parseYaml(raw);
    const required = ["name", "version", "publisher", "runtime", "requires", "permissions", "risk_level", "source", "assessment"];
    const missing = required.filter((key) => manifest[key] === undefined);
    if (missing.length) throw new Error(`${path} is missing ${missing.join(", ")}`);
    return {
      ...manifest,
      id: `${manifest.publisher}/${manifest.name}`,
      path,
      raw,
      channel: [512, 97, 303][index],
      received: ["00:12", "02:41", "05:08"][index],
    };
  }));
  state.packages = responses;
}

async function fetchCharacters() {
  const entries = Object.entries(CHARACTER_SPECS);
  const settled = await Promise.allSettled(entries.map(async ([persona, spec]) => {
    const response = await fetch(`https://rickandmortyapi.com/api/character/${spec.id}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`${persona}: ${response.status}`);
    return [persona, await response.json()];
  }));
  settled.forEach((result) => {
    if (result.status === "fulfilled") {
      const [persona, data] = result.value;
      state.characters[persona] = data;
    }
  });
}

function renderLoading(message = BUTTER_MESSAGES[0]) {
  butterTask.innerHTML = `
    <div class="character-task__portal butter-purpose-ring" aria-hidden="true"><span></span><span></span></div>
    ${character("butter", { size: "xl", eager: true, label: "Butter Robot indexing package manifests" })}
    <div class="character-task__copy">
      <span>PURPOSE / READ REAL MANIFESTS</span>
      <b>${esc(message)}</b>
      <small>packages/@demo/**/nemesys.yml</small>
    </div>`;
  wireImageFallbacks();
}

function hideLoading() {
  const elapsed = performance.now() - state.loadingStarted;
  return new Promise((resolve) => {
    window.setTimeout(() => {
      loadLayer.classList.add("is-gone");
      loadLayer.setAttribute("aria-hidden", "true");
      resolve();
    }, Math.max(0, 820 - elapsed));
  });
}

function renderError(error) {
  stateLayer.innerHTML = `
    <section class="state-error scary-error" role="alert">
      <div class="state-error__rift" aria-hidden="true"></div>
      ${character("scary", { size: "xl", eager: true, label: "Scary Terry reporting a manifest nightmare" })}
      <span class="state-kicker">NIGHTMARE BUS / MANIFEST FAILURE</span>
      <h1>This registry is<br>a nightmare.</h1>
      <p>${esc(error.message)}</p>
      <button class="action action--portal" type="button" data-retry>Wake the receiver</button>
    </section>`;
  stateLayer.classList.add("is-active");
  stateLayer.setAttribute("aria-hidden", "false");
  loadLayer.classList.add("is-gone");
  wireImageFallbacks();
}

function renderChrome() {
  document.body.className = "world world--atlantis";
  document.documentElement.style.setProperty("--world-accent", "#00d4ff");
  document.querySelector('meta[name="theme-color"]').setAttribute("content", "#0a0e1a");

  nav.innerHTML = `
    <div class="world-nav__inner">
      <a class="brand brand--atlantis" href="#surface" aria-label="Atlantis — Public Agent Registry">
        <span class="brand__tear" aria-hidden="true"></span>
        <span>ATLANTIS</span>
        <small>PUBLIC AGENT REGISTRY</small>
      </a>
      <nav class="dimension-nav atlantis-nav" aria-label="Atlantis sections">
        <a href="#surface"><span>01</span>Shell Court</a>
        <a href="#registry"><span>02</span>Deep Registry</a>
        <button type="button" data-open-gate><span>∞</span>Open Gate</button>
      </nav>
      <button class="world-nav__manifest" type="button" data-inspect="${attr(state.packages[0]?.id || "")}">
        <span>YML</span> Open manifest
      </button>
      <button class="dimension-menu" type="button" data-menu aria-label="Toggle Atlantis navigation" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>`;

  const descriptors = ["CURRENT STABLE", "NIMBUS APPROVED", "DEPTH 2,100M"];

  const items = state.packages.map((pkg, index) => `
    <span class="ticker-signal">
      <b>${esc(descriptors[index])}</b>
      <span>@${esc(pkg.publisher)}/${esc(pkg.name)}</span>
      <em class="version-static" data-text="v${attr(pkg.version)}">v${esc(pkg.version)}</em>
      <i>${esc(pkg.risk_level.toUpperCase())}</i>
    </span>`).join("");

  ticker.innerHTML = `
    <span class="ticker-station ticker-station--atlantis"><i></i><b>INTERDIMENSIONAL CABLE</b><em>ATLANTIS CURRENT</em></span>
    <div class="ticker-window">
      <div class="ticker-track ${state.tickerPaused ? "is-paused" : ""}">${items}${items}</div>
    </div>
    <button type="button" data-ticker aria-pressed="${state.tickerPaused}" aria-label="${state.tickerPaused ? "Resume" : "Pause"} ticker">${state.tickerPaused ? "▶" : "Ⅱ"}</button>`;
}

function renderExperience() {
  resetParticles();
  renderChrome();
  renderAtlantis();
  document.title = "Atlantis — Public Agent Registry";
  root.focus({ preventScroll: true });
  wireImageFallbacks();
}

function manifestPath(pkg) {
  return pkg.path.replace("../", "");
}

function filteredPackages() {
  const query = state.query.trim().toLowerCase();
  return state.packages.filter((pkg) => {
    const text = `${pkg.name} ${pkg.description} ${pkg.publisher} ${pkg.runtime} ${pkg.risk_level}`.toLowerCase();
    return (!query || text.includes(query)) && (state.risk === "all" || pkg.risk_level === state.risk);
  });
}

function registryLine() {
  if (state.query) return `${filteredPackages().length} current${filteredPackages().length === 1 ? "" : "s"} match “${state.query}”.`;
  if (state.risk !== "all") return `Trident authority admits ${state.risk}-risk specimens only.`;
  return "Shell court verified. Trench registry is accepting public manifests.";
}

function atlantisCard(pkg, index) {
  const tools = pkg.requires?.tools || [];
  const models = pkg.requires?.models || [];
  return `
    <article class="abyss-card" style="--depth-index:${index}">
      <div class="abyss-card__sonar" aria-hidden="true"><span></span></div>
      <div class="abyss-card__top">
        <span class="abyss-card__depth">DEPTH / ${String(840 + index * 630).padStart(4, "0")}M</span>
        <span class="risk-bubble risk-bubble--${attr(pkg.risk_level)}">${esc(pkg.risk_level)}</span>
      </div>
      <p class="abyss-card__scope">@${esc(pkg.publisher)} / ${esc(pkg.runtime)}</p>
      <h2>${esc(pkg.name)}</h2>
      <p>${esc(pkg.description)}</p>
      <div class="abyss-card__biology">
        <span><small>models</small><b>${models.length ? models.map(esc).join(", ") : "none"}</b></span>
        <span><small>tools</small><b>${tools.length ? tools.map(esc).join(", ") : "none"}</b></span>
        <span><small>permissions</small><b>${pkg.permissions.length}</b></span>
      </div>
      <div class="abyss-card__actions">
        <button type="button" data-inspect="${attr(pkg.id)}">Open specimen</button>
        <button type="button" data-deploy="${attr(pkg.id)}">Summon package</button>
      </div>
    </article>`;
}

function renderAtlantis() {
  const packages = filteredPackages();
  root.innerHTML = `
    <section class="atlantis-world">
      <header class="shell-court" id="surface">
        <div class="shell-court__copy">
          <span class="scenario-label">ATLANTIS / THE SHELL COURT</span>
          <h1>Registry<br>below <em>sea level.</em></h1>
          <p>Public packages report to the shell court before descending into the Mariana archive.</p>
          <a class="action action--ocean" href="#registry">Descend to the manifests <span>↓</span></a>
        </div>
        <div class="ocean-authority" aria-label="Ocean authority registry status">
          <div class="trident-sigil" aria-hidden="true"><i></i><i></i><i></i></div>
          <div>
            <span>OCEAN AUTHORITY / SHELL COURT</span>
            <p>${esc(registryLine())}</p>
          </div>
        </div>
      </header>

      <div class="descent-seam" aria-hidden="true">
        <span>SURFACE / 0000M</span>
        <i></i><i></i><i></i>
        <b>PRESSURE LOCK</b>
        <i></i><i></i><i></i>
        <span>TRENCH / 2100M</span>
      </div>

      <section class="trench-registry" id="registry">
        <header class="trench-registry__header">
          <div>
            <span class="scenario-label">MARIANA ARCHIVE / CONCH VAULT</span>
            <h2>Search the<br><em>deep registry.</em></h2>
          </div>
          <p>Atlantis reads the real <code>nemesys.yml</code> manifest protocol. No mock packages crossed the pressure lock.</p>
        </header>

        <div class="underwater-search shell-search">
          <form data-atlantis-search role="search">
            <span class="sonar-icon" aria-hidden="true"><i></i></span>
            <label class="sr-only" for="atlantisSearch">Search package manifests</label>
            <input id="atlantisSearch" name="q" type="search" value="${attr(state.query)}" placeholder="Ping names, runtimes, risks…">
            <button type="submit">PING CONCH</button>
          </form>
          <div class="bubble-filters" role="group" aria-label="Filter by package risk">
            ${["all", "low", "medium", "high"].map((risk) => `
              <button type="button" data-risk="${risk}" aria-pressed="${state.risk === risk}">
                <i></i>${risk === "all" ? "All currents" : `${risk} risk`}
              </button>`).join("")}
          </div>
          <span class="current-count">${packages.length} / ${state.packages.length} specimens visible</span>
        </div>

        <div class="atlantis-grid">
          ${packages.length ? packages.map(atlantisCard).join("") : nicheEmpty("No eyeholes in this current.", "The conch returned zero public manifests. Eyehole Man is taking this personally.")}
        </div>
      </section>
    </section>`;
}

function nicheEmpty(title, message) {
  return `
    <section class="signal-empty">
      <div class="eyehole-signal">
        ${character("eyehole", { size: "xl", eager: true, label: "Eyehole Man reporting an empty registry current" })}
        <span class="eyehole-signal__ring"></span>
        <span class="eyehole-signal__noise">•••</span>
      </div>
      <div>
        <span>EMPTY STATE / EYEHOLE FREQUENCY</span>
        <h2>${esc(title)}</h2>
        <p>${esc(message)}</p>
        <button type="button" data-reset-empty>Retune the eyeholes</button>
      </div>
    </section>`;
}

function showManifest(id) {
  const pkg = state.packages.find((item) => item.id === id);
  if (!pkg) return;
  drawer.innerHTML = `
    <div class="manifest-drawer__backdrop" data-close-drawer></div>
    <section class="manifest-panel" role="dialog" aria-modal="true" aria-labelledby="manifestTitle">
      <header>
        <div>
          <span>REAL FILE / ${esc(manifestPath(pkg))}</span>
          <h2 id="manifestTitle">${esc(pkg.name)}</h2>
        </div>
        <button type="button" data-close-drawer aria-label="Close manifest viewer">×</button>
      </header>
      <div class="manifest-panel__meta">
        <span>@${esc(pkg.publisher)}</span>
        <b class="version-static" data-text="v${attr(pkg.version)}">v${esc(pkg.version)}</b>
        <span>${esc(pkg.runtime)}</span>
        <span class="risk-mark risk-mark--${attr(pkg.risk_level)}">${esc(pkg.risk_level)} risk</span>
      </div>
      <div class="manifest-panel__body">
        <aside>
          ${[
            ["Models", pkg.requires.models.length],
            ["Tools", pkg.requires.tools.length],
            ["Skills", pkg.requires.skills.length],
            ["Permissions", pkg.permissions.length],
          ].map(([label, value]) => `<span><b>${value}</b><small>${label}</small></span>`).join("")}
          <button type="button" data-copy-manifest="${attr(pkg.id)}">Copy YAML</button>
          <button type="button" data-deploy="${attr(pkg.id)}">Deploy package</button>
        </aside>
        <pre><code>${highlightYaml(pkg.raw)}</code></pre>
      </div>
    </section>`;
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  drawer.querySelector("[data-close-drawer]")?.focus();
}

function highlightYaml(raw) {
  return esc(raw)
    .replace(/^([a-z_]+):/gm, '<span class="yaml-key">$1</span>:')
    .replace(/^(\s+-\s+)(.+)$/gm, '$1<span class="yaml-list">$2</span>')
    .replace(/:\s+(low|medium|high|critical|approved|conditional)$/gm, ': <span class="yaml-value">$1</span>');
}

function closeDrawer() {
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
}

function deployPackage(id) {
  const pkg = state.packages.find((item) => item.id === id);
  if (!pkg) return;
  const toast = document.createElement("article");
  toast.className = "deploy-confirm krombopulos-confirm";
  toast.innerHTML = `
    ${character("krombopulos", { size: "md", label: "Krombopulos Michael confirming a successful deploy" })}
    <div><span>ASSIGNMENT COMPLETE</span><b>${esc(pkg.name)} is tuned in.</b><p>Oh boy. Here the validated deployment goes again.</p></div>
    <button type="button" aria-label="Dismiss confirmation">×</button>`;
  confirms.append(toast);
  wireImageFallbacks();
  void toast.offsetWidth;
  toast.classList.add("is-visible");
  const remove = () => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => toast.remove(), 240);
  };
  toast.querySelector("button").addEventListener("click", remove, { once: true });
  window.setTimeout(remove, 4600);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const area = document.createElement("textarea");
    area.value = value;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

function portalHasPlayed() {
  try {
    return window.sessionStorage.getItem(PORTAL_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

function markPortalPlayed() {
  try {
    window.sessionStorage.setItem(PORTAL_SESSION_KEY, "true");
  } catch {
    // The entrance still works when storage is blocked.
  }
}

function clearPortalTimers() {
  state.portalTimers.forEach((timer) => window.clearTimeout(timer));
  state.portalTimers = [];
}

function scrollToAnchor(hash = window.location.hash || initialAnchor) {
  const target = hash === "#registry" ? document.querySelector("#registry") : document.querySelector("#surface");
  if (!target) return;
  window.requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: "instant", block: "start" });
  });
}

function finishPortalEntrance() {
  clearPortalTimers();
  markPortalPlayed();
  portalEntrance.classList.remove("is-active", "is-opening");
  portalEntrance.classList.add("is-complete");
  portalEntrance.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-portal-active");
  root.removeAttribute("inert");
  root.focus({ preventScroll: true });
  scrollToAnchor();
}

function playPortalEntrance() {
  clearPortalTimers();
  portalEntrance.classList.remove("is-complete");
  portalEntrance.classList.add("is-active");
  portalEntrance.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-portal-active");
  root.setAttribute("inert", "");

  const skip = portalEntrance.querySelector("[data-skip-intro]");
  skip?.focus({ preventScroll: true });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const openTimer = window.setTimeout(() => portalEntrance.classList.add("is-opening"), reducedMotion ? 0 : 40);
  const finishTimer = window.setTimeout(finishPortalEntrance, reducedMotion ? 160 : 900);
  state.portalTimers.push(openTimer, finishTimer);
}

function wirePortalFallback() {
  portalEntrance.querySelectorAll("img").forEach((image) => {
    if (image.complete && image.naturalWidth === 0) portalEntrance.classList.add("has-asset-failure");
    image.addEventListener("error", () => portalEntrance.classList.add("has-asset-failure"), { once: true });
  });
}

function wireImageFallbacks() {
  document.querySelectorAll(".character img").forEach((image) => {
    const parent = image.closest(".character");
    if (image.complete && image.naturalWidth === 0) parent?.classList.add("is-fallback");
    image.addEventListener("error", () => parent?.classList.add("is-fallback"), { once: true });
  });
}

/* Canvas ambient systems: every world stays below 100 particles. */

function particleCountFor() {
  return 76;
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  resetParticles();
}

function resetParticles() {
  const count = particleCountFor();
  state.particles = Array.from({ length: count }, (_, index) => makeParticle(index));
}

function makeParticle(index) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const color = ["0,212,255", "255,107,138", "151,206,76"][index % 3];
  return {
    x: (index * 73) % width,
    y: (index * 149) % height,
    size: 1.5 + (index % 7) * 0.7,
    speed: 0.18 + (index % 9) * 0.035,
    drift: ((index % 5) - 2) * 0.045,
    alpha: 0.18 + (index % 6) * 0.07,
    color,
    phase: index * 0.6,
  };
}

function drawAmbient(time) {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawAtlantisParticles(time);
  state.frame = window.requestAnimationFrame(drawAmbient);
}

function drawAtlantisParticles(time) {
  state.particles.forEach((particle) => {
    particle.y -= particle.speed;
    particle.x += Math.sin(time * 0.0005 + particle.phase) * 0.08 + particle.drift;
    if (particle.y < -20) {
      particle.y = window.innerHeight + 20;
      particle.x = (particle.x + 170) % window.innerWidth;
    }
    const radius = particle.size * (1 + Math.sin(time * 0.001 + particle.phase) * 0.18);
    context.globalAlpha = particle.alpha;
    context.fillStyle = `rgba(${particle.color},0.09)`;
    context.strokeStyle = `rgba(${particle.color},0.72)`;
    context.lineWidth = Math.max(1, radius * 0.22);
    context.beginPath();
    context.arc(particle.x, particle.y, radius * 1.8, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.globalAlpha = 1;
  });
}

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-skip-intro]")) {
    finishPortalEntrance();
    return;
  }

  if (event.target.closest("[data-open-gate]")) {
    nav.querySelector("[data-menu]")?.setAttribute("aria-expanded", "false");
    nav.querySelector(".dimension-nav")?.classList.remove("is-open");
    playPortalEntrance();
    return;
  }

  const inspect = event.target.closest("[data-inspect]");
  if (inspect) {
    showManifest(inspect.dataset.inspect);
    return;
  }

  if (event.target.closest("[data-close-drawer]")) {
    closeDrawer();
    return;
  }

  const deploy = event.target.closest("[data-deploy]");
  if (deploy) {
    deployPackage(deploy.dataset.deploy);
    return;
  }

  const risk = event.target.closest("[data-risk]");
  if (risk) {
    state.risk = risk.dataset.risk;
    renderAtlantis();
    wireImageFallbacks();
    return;
  }

  if (event.target.closest("[data-reset-empty]")) {
    state.query = "";
    state.risk = "all";
    renderAtlantis();
    wireImageFallbacks();
    return;
  }

  if (event.target.closest("[data-ticker]")) {
    state.tickerPaused = !state.tickerPaused;
    renderChrome();
    return;
  }

  const menu = event.target.closest("[data-menu]");
  if (menu) {
    const expanded = menu.getAttribute("aria-expanded") === "true";
    menu.setAttribute("aria-expanded", String(!expanded));
    nav.querySelector(".dimension-nav")?.classList.toggle("is-open", !expanded);
    return;
  }

  const sectionLink = event.target.closest('a[href="#surface"], a[href="#registry"]');
  if (sectionLink) {
    const menu = nav.querySelector("[data-menu]");
    menu?.setAttribute("aria-expanded", "false");
    nav.querySelector(".dimension-nav")?.classList.remove("is-open");
  }

  const copy = event.target.closest("[data-copy-manifest]");
  if (copy) {
    const pkg = state.packages.find((item) => item.id === copy.dataset.copyManifest);
    if (pkg) copyText(pkg.raw);
    copy.textContent = "COPIED";
    window.setTimeout(() => { copy.textContent = "Copy YAML"; }, 1400);
    return;
  }

  if (event.target.closest("[data-retry]")) {
    window.location.reload();
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-atlantis-search]");
  if (!form) return;
  event.preventDefault();
  state.query = new FormData(form).get("q")?.toString().trim() || "";
  renderAtlantis();
  wireImageFallbacks();
});

document.addEventListener("input", (event) => {
  if (!event.target.matches("#atlantisSearch")) return;
  state.query = event.target.value;
  renderAtlantis();
  wireImageFallbacks();
  requestAnimationFrame(() => {
    const input = document.querySelector("#atlantisSearch");
    input?.focus();
    input?.setSelectionRange(state.query.length, state.query.length);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer();
  if (event.key === "Escape" && portalEntrance.classList.contains("is-active")) finishPortalEntrance();
});

window.addEventListener("hashchange", () => {
  const hash = normalizeLocation();
  scrollToAnchor(hash);
});
window.addEventListener("resize", resizeCanvas, { passive: true });

async function init() {
  renderLoading();
  const messageTimer = window.setInterval(() => {
    const current = BUTTER_MESSAGES.indexOf(butterTask.querySelector("b")?.textContent);
    renderLoading(BUTTER_MESSAGES[(current + 1 + BUTTER_MESSAGES.length) % BUTTER_MESSAGES.length]);
  }, 900);
  resizeCanvas();
  state.frame = window.requestAnimationFrame(drawAmbient);

  try {
    await Promise.all([fetchManifests(), fetchCharacters()]);
    window.clearInterval(messageTimer);
    renderExperience();
    wirePortalFallback();
    await hideLoading();
    if (portalHasPlayed()) {
      scrollToAnchor();
    } else {
      playPortalEntrance();
    }
  } catch (error) {
    window.clearInterval(messageTimer);
    renderError(error);
  }
}

init();
