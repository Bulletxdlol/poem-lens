import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { useState, useRef, useId } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Language data ─────────────────────────────────────────────────────────────
const LANGUAGES = [
  "English","French","Spanish","Italian","German","Portuguese",
  "Russian","Japanese","Chinese","Arabic","Hindi","Persian",
  "Turkish","Latin","Greek","Dutch","Korean","Swedish","Polish","Hebrew",
];

const LANG_FLAGS: Record<string, string> = {
  "English":    "🇬🇧", "French":     "🇫🇷", "Spanish":    "🇪🇸",
  "Italian":    "🇮🇹", "German":     "🇩🇪", "Portuguese": "🇵🇹",
  "Russian":    "🇷🇺", "Japanese":   "🇯🇵", "Chinese":    "🇨🇳",
  "Arabic":     "🇸🇦", "Hindi":      "🇮🇳", "Persian":    "🇮🇷",
  "Turkish":    "🇹🇷", "Latin":      "🏛️",  "Greek":      "🇬🇷",
  "Dutch":      "🇳🇱", "Korean":     "🇰🇷", "Swedish":    "🇸🇪",
  "Polish":     "🇵🇱", "Hebrew":     "🇮🇱",
};

// ── Panel colour themes ───────────────────────────────────────────────────────
const PANEL = {
  poet: {
    border:   "rgba(124,58,237,0.22)",
    header:   "linear-gradient(135deg,#f5f3ff,#ede9fe)",
    stripe:   "#8b5cf6",
    badgeBg:  "#ede9fe", badgeTxt: "#5b21b6", badgeBdr: "rgba(124,58,237,0.3)",
    dot:      "#8b5cf6",
  },
  explanation: {
    border:   "rgba(180,120,10,0.22)",
    header:   "linear-gradient(135deg,#fdf6e3,#fef3c7)",
    stripe:   "#d97706",
    badgeBg:  "#fef3c7", badgeTxt: "#7c4f08", badgeBdr: "rgba(180,120,10,0.3)",
    dot:      "#d97706",
  },
  translation: {
    border:   "rgba(5,150,105,0.22)",
    header:   "linear-gradient(135deg,#f0fdf4,#dcfce7)",
    stripe:   "#10b981",
    badgeBg:  "#dcfce7", badgeTxt: "#065f46", badgeBdr: "rgba(5,150,105,0.3)",
    dot:      "#10b981",
  },
  cultural: {
    border:   "rgba(2,132,199,0.22)",
    header:   "linear-gradient(135deg,#f0f9ff,#e0f2fe)",
    stripe:   "#0ea5e9",
    badgeBg:  "#e0f2fe", badgeTxt: "#0369a1", badgeBdr: "rgba(2,132,199,0.3)",
    dot:      "#0ea5e9",
  },
} as const;
type PanelTheme = keyof typeof PANEL;

interface TranslationResult {
  original_poem: string;
  source_language: string;
  target_language: string;
  translated_poem: string;
  explanation: string;
  cultural_notes: string[];
  poet_name: string;
  poet_bio: string;
  poet_era: string;
  poet_image_url: string | null;
}

// ── Islamic Geometric Pattern ─────────────────────────────────────────────────
function IslamicPattern({ opacity = 0.07, color = "#d4a017" }: { opacity?: number; color?: string }) {
  const id = useId();
  const R = 22, r = 9, S = 88;
  const starPts = (cx: number, cy: number) => {
    const p: string[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8 - Math.PI / 2;
      const rad = i % 2 === 0 ? R : r;
      p.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
    }
    return p.join(" ");
  };
  const els: React.ReactNode[] = [];
  for (let row = -1; row <= 10; row++) {
    for (let col = -1; col <= 14; col++) {
      const x = col * S, y = row * S;
      els.push(<polygon key={`${id}-s${row}-${col}`} points={starPts(x, y)} fill="none" stroke={color} strokeWidth="0.75" />);
      const mx = x + S / 2, my = y + S / 2;
      els.push(<rect key={`${id}-c${row}-${col}`} x={mx - 7} y={my - 7} width={14} height={14}
        transform={`rotate(45 ${mx} ${my})`} fill="none" stroke={color} strokeWidth="0.5" />);
    }
  }
  return (
    <svg aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity, pointerEvents: "none" }}
      preserveAspectRatio="xMidYMid slice">
      {els}
    </svg>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ── LensIcon ──────────────────────────────────────────────────────────────────
function LensIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="8" stroke="#d4a017" strokeWidth="1.5" />
      <circle cx="11" cy="11" r="3.5" fill="#d4a017" />
      {[0, 90, 180, 270].map(deg => {
        const r2 = deg * Math.PI / 180;
        return <line key={deg}
          x1={11 + 8 * Math.cos(r2)} y1={11 + 8 * Math.sin(r2)}
          x2={11 + 11 * Math.cos(r2)} y2={11 + 11 * Math.sin(r2)}
          stroke="#d4a017" strokeWidth="1.5" strokeLinecap="round" />;
      })}
    </svg>
  );
}

// ── Language Select with flag badge ──────────────────────────────────────────
function LanguageSelect({ value, onChange, label }: {
  value: string; onChange: (v: string) => void; label: string;
}) {
  return (
    <div>
      <label className="block text-[0.68rem] font-bold uppercase tracking-widest mb-1.5"
        style={{ color: "#4a4258" }}>{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="lang-select w-full text-sm rounded-xl pl-3.5 pr-8 py-2.5 text-stone-900"
          style={{ background: "#f5f0e8", border: "1px solid rgba(184,134,11,0.22)" }}>
          {LANGUAGES.map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs"
          style={{ color: "#8b7fa0" }}>▾</span>
      </div>
    </div>
  );
}

// ── Result Panel ──────────────────────────────────────────────────────────────
function Panel({ icon, title, children, badge, theme, delay = 0 }: {
  icon: string; title: string; children: React.ReactNode;
  badge?: string; theme: PanelTheme; delay?: number;
}) {
  const t = PANEL[theme];
  return (
    <div className="result-panel rounded-2xl overflow-hidden"
      style={{
        border: `1px solid ${t.border}`,
        borderLeft: `4px solid ${t.stripe}`,
        animationDelay: `${delay}s`,
      }}>
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b"
        style={{ background: t.header, borderColor: t.border }}>
        <span className="text-base">{icon}</span>
        <h3 className="font-bold text-sm"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1a1523" }}>
          {title}
        </h3>
        {badge && (
          <span className="ml-auto text-[0.64rem] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5"
            style={{ color: t.badgeTxt, background: t.badgeBg, border: `1px solid ${t.badgeBdr}` }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
function Header() {
  const [loc] = useLocation();
  const onHome = loc === "/";
  return (
    <header style={{ background: "#1a1523" }} className="sticky top-0 z-50 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <LensIcon />
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            className="text-xl text-white tracking-tight">
            Poem<em style={{ color: "#d4a017", fontStyle: "italic" }}>Lens</em>
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/" className="hidden sm:block text-sm no-underline"
            style={{ color: onHome ? "#d4a017" : "#6b5f7a" }}>Home</Link>
          <Link href="/app"
            className="text-sm font-semibold px-4 py-1.5 rounded-lg no-underline"
            style={{
              background: !onHome ? "#d4a017" : "transparent",
              color: !onHome ? "#1a1523" : "#6b5f7a",
              border: "1px solid rgba(212,160,23,0.4)",
            }}>Open App</Link>
        </nav>
      </div>
    </header>
  );
}

// ── HOMEPAGE ──────────────────────────────────────────────────────────────────
function HomePage() {
  const QUOTES = [
    { text: "Poetry is when an emotion has found its thought and the thought has found words.", author: "Robert Frost" },
    { text: "A poem begins as a lump in the throat, a sense of wrong, a homesickness, a lovesickness.", author: "Robert Frost" },
    { text: "Poetry is not a turning loose of emotion, but an escape from emotion.", author: "T.S. Eliot" },
    { text: "If I read a book and it makes my whole body so cold no fire can ever warm me, I know that is poetry.", author: "Emily Dickinson" },
    { text: "Poetry is the spontaneous overflow of powerful feelings recollected in tranquility.", author: "William Wordsworth" },
    { text: "A poet is, before anything else, a person who is passionately in love with language.", author: "W.H. Auden" },
  ];
  const FEATURES = [
    { icon: "🌐", title: "Translate",        desc: "Cross any language barrier while preserving rhythm, rhyme, and emotional weight — not just words." },
    { icon: "💡", title: "Understand",       desc: "Get a rich analysis of themes, imagery, and literary devices in plain, engaging language." },
    { icon: "🎭", title: "Meet the Poet",    desc: "Discover the life, era, and context of the person who wrote it, complete with their portrait." },
    { icon: "🌍", title: "Cultural Context", desc: "Uncover the historical and cultural nuances that give a poem its enduring resonance." },
  ];
  const POEMS = [
    { lines: ["Do not go gentle into that good night,", "Old age should burn and rave at close of day;", "Rage, rage against the dying of the light."], poet: "Dylan Thomas", work: "Do Not Go Gentle into That Good Night" },
    { lines: ["Two roads diverged in a yellow wood,", "And sorry I could not travel both", "And be one traveler, long I stood…"], poet: "Robert Frost", work: "The Road Not Taken" },
    { lines: ["I carry your heart with me (I carry it in", "my heart) I am never without it (anywhere", "I go you go, my dear; and whatever is done…"], poet: "E.E. Cummings", work: "i carry your heart with me" },
  ];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#110d1a 0%,#1a1523 40%,#2a1a35 70%,#1a1523 100%)", minHeight: "94vh", display: "flex", alignItems: "center" }}>
        <IslamicPattern opacity={0.09} color="#d4a017" />
        {/* Soft purple radial glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.08) 0%, transparent 60%)" }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left */}
            <div className="anim-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-7 text-xs font-semibold uppercase tracking-widest"
                style={{ background: "rgba(212,160,23,0.1)", border: "1px solid rgba(212,160,23,0.35)", color: "#d4a017" }}>
                <LensIcon size={13} /> Poetry, seen clearly
              </div>
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(2.5rem,5.5vw,4rem)", color: "white", lineHeight: 1.12, letterSpacing: "-0.02em" }}>
                Every poem holds<br />
                <em style={{ color: "#d4a017" }}>a universe</em><br />
                inside it.
              </h1>
              <p className="mt-6 leading-relaxed" style={{ color: "#a89cbf", maxWidth: 460, fontSize: "1.05rem" }}>
                PoemLens translates poetry across 20 languages while preserving its soul — then unlocks its meaning, cultural roots, and the life of the poet who wrote it.
              </p>
              <div className="flex items-center gap-8 mt-8 mb-8">
                {[["20", "Languages"], ["AI", "Powered"], ["∞", "Poems"]].map(([n, l]) => (
                  <div key={l}>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "#d4a017", lineHeight: 1 }}>{n}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#6b5f7a" }}>{l}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <Link href="/app"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm no-underline"
                  style={{ background: "#d4a017", color: "#1a1523", boxShadow: "0 4px 24px rgba(212,160,23,0.35)" }}>
                  Start Exploring →
                </Link>
                <a href="#how" className="text-sm no-underline" style={{ color: "#6b5f7a" }}>How it works ↓</a>
              </div>
            </div>

            {/* Right: poem cards */}
            <div className="hidden lg:flex flex-col gap-4">
              {POEMS.map((p, i) => (
                <div key={i} className="anim-fade-in-up rounded-2xl p-5"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(212,160,23,0.12)",
                    backdropFilter: "blur(10px)",
                    transform: `translateX(${i === 1 ? 36 : i === 2 ? 18 : 0}px)`,
                    animationDelay: `${0.1 + i * 0.1}s`,
                  }}>
                  <p style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "rgba(255,255,255,0.78)", fontSize: "0.9rem", lineHeight: 1.85, fontStyle: "italic" }}>
                    {p.lines.map((l, li) => <span key={li}>{l}<br /></span>)}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span style={{ width: 20, height: 1, background: "#d4a017", display: "inline-block" }} />
                    <p className="text-xs font-semibold" style={{ color: "#d4a017" }}>{p.poet}</p>
                    <p className="text-xs" style={{ color: "#5a4f6a" }}>· {p.work}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-20 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, #faf8f2)" }} />
      </section>

      {/* ── How it works ── */}
      <section id="how" style={{ background: "#faf8f2" }} className="py-24">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#b8860b" }}>How it works</p>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2.1rem", color: "#1a1523" }}>
              Four ways to see a poem more clearly
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="rounded-2xl p-6"
                style={{ background: "white", border: "1px solid rgba(184,134,11,0.15)", boxShadow: "0 2px 16px rgba(26,21,35,0.05)" }}>
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold mb-2"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1a1523" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6b6278" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quotes ── */}
      <section className="relative overflow-hidden" style={{ background: "#1a1523", paddingTop: "5.5rem", paddingBottom: "5.5rem" }}>
        <IslamicPattern opacity={0.05} color="#d4a017" />
        <div className="max-w-6xl mx-auto px-5 sm:px-8 relative z-10">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#b8860b" }}>Words about words</p>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2rem", color: "white" }}>
              What the great poets said
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {QUOTES.map((q, i) => (
              <div key={i} className="rounded-2xl p-6"
                style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(212,160,23,0.1)" }}>
                <p style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "rgba(255,255,255,0.72)", fontSize: "0.95rem", lineHeight: 1.8, fontStyle: "italic" }}>
                  ❝{q.text}❞
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <span style={{ width: 16, height: 1, background: "#d4a017", display: "inline-block" }} />
                  <p className="text-xs font-semibold" style={{ color: "#d4a017" }}>{q.author}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 relative overflow-hidden" style={{ background: "#fdf6e3" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.04 }}>
          <IslamicPattern opacity={1} color="#b8860b" />
        </div>
        <div className="max-w-lg mx-auto px-6 text-center relative z-10">
          <div className="text-5xl mb-5">📜</div>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2.1rem", color: "#1a1523", lineHeight: 1.3 }}>
            A poem you love is waiting<br />to reveal more of itself.
          </h2>
          <p className="mt-4 text-base leading-relaxed" style={{ color: "#6b6278" }}>
            Paste it into PoemLens. See it translated, explained, and brought to life.
          </p>
          <Link href="/app"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm no-underline mt-8"
            style={{ background: "#1a1523", color: "white", boxShadow: "0 4px 20px rgba(26,21,35,0.2)" }}>
            Open PoemLens →
          </Link>
        </div>
      </section>

      <footer className="text-center py-5 text-xs"
        style={{ color: "#8b7fa0", borderTop: "1px solid rgba(184,134,11,0.1)", background: "#f5f0e8" }}>
        PoemLens · Powered by Google Gemini · See every poem clearly.
      </footer>
    </div>
  );
}

// ── APP PAGE ──────────────────────────────────────────────────────────────────
function AppPage() {
  const [poem, setPoem]           = useState("");
  const [sourceLang, setSourceLang] = useState("English");
  const [targetLang, setTargetLang] = useState("French");
  const [mode, setMode]           = useState<"translate" | "explain">("translate");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [result, setResult]       = useState<TranslationResult | null>(null);
  const [resultKey, setResultKey] = useState(0);
  const [mobileTab, setMobileTab] = useState<"input" | "results">("input");
  const outputRef = useRef<HTMLDivElement>(null);

  async function handleSubmit() {
    if (!poem.trim()) { setError("Please paste a poem first."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poem: poem.trim(),
          source_lang: sourceLang,
          target_lang: mode === "explain" ? sourceLang : targetLang,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || `Error ${res.status}. Please try again.`); return; }
      setResult(data as TranslationResult);
      setResultKey(k => k + 1);
      setMobileTab("results");
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch {
      setError("Network error — could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col" style={{ background: "#faf8f2", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Mobile tab bar ── */}
      <div className="lg:hidden sticky top-[56px] z-40 flex border-b"
        style={{ background: "#1a1523", borderColor: "rgba(212,160,23,0.18)" }}>
        {(["input", "results"] as const).map(tab => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className="flex-1 py-3 text-sm font-semibold relative capitalize"
            style={{ color: mobileTab === tab ? "#d4a017" : "#6b5f7a" }}>
            {tab === "results" ? (result ? "Results ✓" : "Results") : "Input"}
            {mobileTab === tab && (
              <span className="absolute bottom-0 inset-x-4 h-0.5 rounded-full"
                style={{ background: "#d4a017" }} />
            )}
          </button>
        ))}
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-5 py-5 lg:py-7
        grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-5 items-start">

        {/* ── Input card ── */}
        <div
          className={`bg-white rounded-2xl p-5 lg:sticky lg:top-20 ${mobileTab === "input" ? "block" : "hidden lg:block"}`}
          style={{ border: "1px solid rgba(184,134,11,0.2)", boxShadow: "0 2px 16px rgba(26,21,35,0.06)" }}>

          <div className="mb-4">
            <h2 className="text-lg text-stone-900"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Your Poem</h2>
            <p className="text-xs mt-0.5" style={{ color: "#8b7fa0" }}>
              Paste any poem to translate, explain, or explore its poet.
            </p>
          </div>

          {/* Mode toggle — smooth sliding pill */}
          <div className="relative flex rounded-xl overflow-hidden border mb-4 p-0.5"
            style={{ borderColor: "rgba(184,134,11,0.25)", background: "#fdf6e3" }}>
            {/* Sliding background */}
            <div className="absolute inset-y-0.5 rounded-lg"
              style={{
                background: "#1a1523",
                width: "calc(50% - 2px)",
                left: mode === "translate" ? "2px" : "calc(50%)",
                transition: "left 280ms cubic-bezier(0.34,1.56,0.64,1)",
              }} />
            {([["translate", "🌐 Translate"], ["explain", "💡 Explain"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setMode(val)}
                className="relative flex-1 py-2 text-sm font-semibold z-10"
                style={{
                  color: mode === val ? "white" : "#8b7fa0",
                  transition: "color 200ms ease",
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Poem textarea */}
          <textarea
            value={poem}
            onChange={e => setPoem(e.target.value)}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSubmit(); }}
            rows={9}
            placeholder={"Shall I compare thee to a summer's day?\nThou art more lovely and more temperate…"}
            className="w-full text-sm leading-relaxed rounded-xl px-4 py-3 text-stone-900 resize-y"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              background: "#fdf6e3",
              border: "1px solid rgba(184,134,11,0.2)",
              fontSize: "0.93rem",
            }}
          />

          {/* Language pickers */}
          {mode === "translate" ? (
            <div className="grid grid-cols-[1fr_24px_1fr] items-end gap-1.5 mt-4">
              <LanguageSelect value={sourceLang} onChange={setSourceLang} label="From" />
              <div className="flex items-center justify-center pb-2.5 text-sm font-light" style={{ color: "#b8860b" }}>→</div>
              <LanguageSelect value={targetLang} onChange={setTargetLang} label="To" />
            </div>
          ) : (
            <div className="mt-4">
              <LanguageSelect value={sourceLang} onChange={setSourceLang} label="Poem language" />
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading}
            className="w-full flex items-center justify-center gap-2 font-bold text-sm rounded-xl py-3.5 px-5 mt-5"
            style={{
              background: loading
                ? "#6b5f7a"
                : "linear-gradient(135deg, #1a1523 0%, #2d1f3d 100%)",
              color: "white",
              boxShadow: loading ? "none" : "0 4px 18px rgba(26,21,35,0.3)",
              cursor: loading ? "not-allowed" : "pointer",
            }}>
            {loading
              ? <><Spinner />{mode === "translate" ? "Translating…" : "Explaining…"}</>
              : mode === "translate" ? "✨ Translate Poem" : "💡 Explain Poem"}
          </button>

          {/* Error */}
          {error && (
            <div className="anim-slide-down mt-4 p-3.5 rounded-xl text-sm leading-relaxed"
              style={{ background: "#fff0f0", border: "1px solid #fca5a5", color: "#b91c1c" }}>
              {error}
            </div>
          )}

          <p className="mt-3 text-center text-xs" style={{ color: "#c4b8d0" }}>Ctrl + Enter to submit</p>
        </div>

        {/* ── Results column ── */}
        <div ref={outputRef}
          className={`flex flex-col gap-4 ${mobileTab === "results" ? "flex" : "hidden lg:flex"}`}>

          {!result ? (
            /* Empty state */
            <div className="anim-scale-in bg-white rounded-2xl p-10 sm:p-14 text-center"
              style={{ border: "1px solid rgba(184,134,11,0.18)", boxShadow: "0 2px 16px rgba(26,21,35,0.05)" }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "linear-gradient(135deg,#fdf6e3,#fef3c7)", border: "1px solid rgba(184,134,11,0.2)" }}>
                <span className="text-3xl">🔍</span>
              </div>
              <p className="text-base font-medium"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#5a4a6a" }}>
                Your results will appear here
              </p>
              <p className="text-sm mt-2" style={{ color: "#8b7fa0" }}>
                Paste a poem and click <strong>Translate</strong> or <strong>Explain</strong>
              </p>
              {/* Preview chips */}
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {([
                  ["🎭", "Poet bio",     PANEL.poet.stripe],
                  ["💡", "Analysis",     PANEL.explanation.stripe],
                  ["📜", "Translation",  PANEL.translation.stripe],
                  ["🌍", "Context",      PANEL.cultural.stripe],
                ] as [string, string, string][]).map(([icon, lbl, clr]) => (
                  <div key={lbl}
                    className="flex items-center gap-1.5 rounded-full py-1.5 px-3 text-xs font-medium"
                    style={{ background: "#f9f5ef", border: `1px solid ${clr}44`, color: "#6b5f7a" }}>
                    {icon} {lbl}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div key={resultKey} className="flex flex-col gap-4">

              {/* Poet card */}
              {result.poet_name && result.poet_name.toLowerCase() !== "unknown" && (
                <Panel icon="🎭" title="About the Poet" badge={result.poet_era} theme="poet" delay={0}>
                  <div className="flex gap-4 p-5">
                    {result.poet_image_url && (
                      <img src={result.poet_image_url} alt={result.poet_name}
                        className="w-20 h-24 sm:w-24 sm:h-28 object-cover rounded-xl flex-shrink-0 shadow-md"
                        style={{ border: "2px solid rgba(124,58,237,0.22)" }}
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-stone-900 text-base mb-0.5"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                        {result.poet_name}
                      </p>
                      {result.poet_era && (
                        <p className="text-xs font-semibold mb-2.5" style={{ color: PANEL.poet.stripe }}>
                          {result.poet_era}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed text-stone-700">{result.poet_bio}</p>
                    </div>
                  </div>
                </Panel>
              )}

              {/* Explanation */}
              <Panel icon="💡" title="Poem Explanation" theme="explanation" delay={0.08}>
                <p className="px-5 py-4 text-sm leading-[1.9] text-stone-800">{result.explanation}</p>
              </Panel>

              {/* Translation */}
              {result.translated_poem && (
                <Panel icon="📜" title="Translated Poem"
                  badge={`${LANG_FLAGS[result.source_language] ?? ""}  ${result.source_language}  →  ${LANG_FLAGS[result.target_language] ?? ""}  ${result.target_language}`}
                  theme="translation" delay={0.16}>
                  <pre className="px-5 py-4 whitespace-pre-wrap leading-[2.1] text-stone-900"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "0.97rem" }}>
                    {result.translated_poem}
                  </pre>
                </Panel>
              )}

              {/* Cultural notes */}
              <Panel icon="🌍" title="Cultural & Linguistic Notes" theme="cultural" delay={0.24}>
                <ul className="px-5 py-4 space-y-3.5">
                  {(result.cultural_notes ?? []).map((note, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-[1.75] text-stone-800">
                      <span className="flex-shrink-0 mt-[5px]"
                        style={{ color: PANEL.cultural.stripe, fontSize: "0.5rem" }}>✦</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </Panel>

            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-4 text-xs mt-2"
        style={{ color: "#8b7fa0", borderTop: "1px solid rgba(184,134,11,0.1)", background: "#f5f0e8" }}>
        PoemLens · Powered by Google Gemini · See every poem clearly.
      </footer>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
function AnimatedRoutes() {
  const [loc] = useLocation();
  return (
    <div key={loc} className="anim-page-fade flex-1 flex flex-col">
      <Switch>
        <Route path="/"    component={HomePage} />
        <Route path="/app" component={AppPage} />
        <Route>
          <div className="flex-1 flex items-center justify-center text-stone-400 text-sm">
            Page not found
          </div>
        </Route>
      </Switch>
    </div>
  );
}

export default function App() {
  return (
    <WouterRouter base={BASE}>
      <div className="min-h-screen flex flex-col">
        <Header />
        <AnimatedRoutes />
      </div>
    </WouterRouter>
  );
}
