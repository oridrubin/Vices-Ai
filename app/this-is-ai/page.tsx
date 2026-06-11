"use client";

import React, { useMemo, useState } from "react";
import {
  Beer,
  Cigarette,
  Leaf,
  Martini,
  Footprints,
  Dumbbell,
  Salad,
  Droplets,
  Scale,
  X,
  ChevronDown,
  Sparkles,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════════════════════

type Mode = "allowance" | "debt";

type HabitId = "run" | "gym" | "salad" | "water";
type ViceId = "beer" | "cig" | "cannabis" | "night";

/** A selectable item (habit or vice) with its mile-equivalent exchange rate. */
interface BarterItem<Id extends string> {
  id: Id;
  label: string;
  /** Unit label for slider readout, e.g. "miles", "beers". */
  unit: string;
  /** Mile-equivalents per single unit. Canonical currency of the engine. */
  me: number;
  min: number;
  max: number;
  step: number;
  /** Default quantity when this item is selected. */
  def: number;
  icon: React.ReactNode;
}

interface LedgerEntry {
  id: number;
  mode: Mode;
  label: string;
  qty: number;
  unit: string;
  /** Signed mile-equivalents: positive = earned, negative = owed. */
  me: number;
  time: string;
}

interface ScenarioCard {
  id: string;
  question: string;
  sub: string;
  /** Net mile-equivalents of the scenario. */
  net: number;
  verdict: string;
}

interface ScenarioResult {
  question: string;
  verdict: string;
  net: number;
}

// ════════════════════════════════════════════════════════════════════════════
//  EXCHANGE-RATE TABLES (canonical currency: run-mile equivalents, "ME")
//  1 Beer = 1.5 mi · 1 Cigarette = 0.5 mi · 1 Cannabis = 2 mi · Night Out = 6 mi
//  1 Salad = 1.5 mi (≡ 1 beer) · 1 Gym Workout = 2 mi (≡ 1 cannabis) · 1 Gal = 1 mi
// ════════════════════════════════════════════════════════════════════════════

const HABITS: BarterItem<HabitId>[] = [
  { id: "run",   label: "Running",          unit: "miles",    me: 1,   min: 0.5, max: 10, step: 0.5, def: 3, icon: <Footprints className="w-4 h-4" /> },
  { id: "gym",   label: "Gym Workout",      unit: "sessions", me: 2,   min: 1,   max: 4,  step: 1,   def: 1, icon: <Dumbbell className="w-4 h-4" /> },
  { id: "salad", label: "Eating Clean",     unit: "salads",   me: 1.5, min: 1,   max: 6,  step: 1,   def: 2, icon: <Salad className="w-4 h-4" /> },
  { id: "water", label: "Proper Hydration", unit: "gallons",  me: 1,   min: 0.5, max: 3,  step: 0.5, def: 1, icon: <Droplets className="w-4 h-4" /> },
];

const VICES: BarterItem<ViceId>[] = [
  { id: "beer",     label: "Individual Beer",  unit: "beers",      me: 1.5, min: 1, max: 12, step: 1, def: 2, icon: <Beer className="w-4 h-4" /> },
  { id: "cig",      label: "Cigarettes",       unit: "cigarettes", me: 0.5, min: 1, max: 20, step: 1, def: 4, icon: <Cigarette className="w-4 h-4" /> },
  { id: "cannabis", label: "Cannabis Session", unit: "sessions",   me: 2,   min: 1, max: 6,  step: 1, def: 1, icon: <Leaf className="w-4 h-4" /> },
  { id: "night",    label: "Heavy Night Out",  unit: "nights",     me: 6,   min: 1, max: 3,  step: 1, def: 1, icon: <Martini className="w-4 h-4" /> },
];

/** Pre-computed quick-validation scenarios for the bottom matrix. */
const SCENARIOS: ScenarioCard[] = [
  {
    id: "beer-salad",
    question: "Can I have a beer with this salad?",
    sub: "1 beer · 1 clean salad",
    net: 1.5 - 1.5,
    verdict: "Net Zero Change. Enjoy your beer.",
  },
  {
    id: "gym-joint",
    question: "Joint after the gym?",
    sub: "1 session · 1 workout",
    net: 2 - 2,
    verdict: "Perfectly balanced. Enjoy the session.",
  },
  {
    id: "run-smokes",
    question: "Two smokes after a 1-mile run?",
    sub: "2 cigarettes · 1 mile",
    net: 1 - 1,
    verdict: "Slate stays clean. You're covered.",
  },
  {
    id: "night-short",
    question: "Night out, but I ran 4 miles?",
    sub: "1 heavy night · 4 miles",
    net: 4 - 6,
    verdict: "Still 2 miles short — you'd owe a 2-mile run tomorrow.",
  },
];

/** Format a number cleanly: integers stay whole, fractions get one decimal. */
const fmt = (n: number): string =>
  Math.abs(n % 1) < 0.05 ? Math.round(n).toString() : n.toFixed(1);

// ════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export default function ThisIsAIPage() {
  // ── Core state ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("allowance");
  const [habitId, setHabitId] = useState<HabitId>("run");
  const [viceId, setViceId] = useState<ViceId>("beer");
  const [habitQty, setHabitQty] = useState<number>(3);
  const [viceQty, setViceQty] = useState<number>(2);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [scenario, setScenario] = useState<ScenarioResult | null>(null);

  const isAllowance = mode === "allowance";

  // ── Current selection + reactive math ───────────────────────────────────
  const habit = HABITS.find((h) => h.id === habitId) as BarterItem<HabitId>;
  const vice = VICES.find((v) => v.id === viceId) as BarterItem<ViceId>;

  const item = isAllowance ? habit : vice;
  const qty = isAllowance ? habitQty : viceQty;
  const setQty = isAllowance ? setHabitQty : setViceQty;

  /** Total mile-equivalents of the current selection. */
  const totalME = useMemo(() => qty * item.me, [qty, item]);

  /** Allowance mode: what vices does this neutralize? */
  const allowanceGrid = useMemo(
    () =>
      VICES.map((v) => ({
        label: v.label === "Individual Beer" ? "Beers" : v.label === "Cigarettes" ? "Cigarettes" : v.label === "Cannabis Session" ? "Cannabis Sessions" : "Heavy Nights",
        icon: v.icon,
        value: totalME / v.me,
      })),
    [totalME]
  );

  /** Debt mode: real-world payback options ("pick one"). */
  const paybackGrid = useMemo(
    () => [
      { label: "Mile Run", icon: <Footprints className="w-4 h-4" />, value: totalME / 1 },
      { label: "Clean Salads", icon: <Salad className="w-4 h-4" />, value: totalME / 1.5 },
      { label: "Gym Workouts", icon: <Dumbbell className="w-4 h-4" />, value: totalME / 2 },
    ],
    [totalME]
  );

  /** Net ledger balance in signed mile-equivalents. */
  const netME = useMemo(() => ledger.reduce((sum, e) => sum + e.me, 0), [ledger]);

  const status =
    netME > 0.25 ? "In the Green" : netME < -0.25 ? "In the Red" : "In Equilibrium";
  const statusColor =
    netME > 0.25 ? "bg-emerald-400" : netME < -0.25 ? "bg-rose-400" : "bg-sky-300";

  // ── Gauge geometry (outer progress ring) ────────────────────────────────
  const RADIUS = 70;
  const CIRC = 2 * Math.PI * RADIUS;
  const gaugeRatio = Math.min(Math.abs(netME) / 10, 1); // full ring at ±10 ME
  const gaugeOffset = CIRC * (1 - gaugeRatio);
  const inGreen = netME >= 0;

  // ── Actions ─────────────────────────────────────────────────────────────
  const logToLedger = (): void => {
    const entry: LedgerEntry = {
      id: Date.now(),
      mode,
      label: item.label,
      qty,
      unit: item.unit,
      me: isAllowance ? totalME : -totalME,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setLedger((prev) => [entry, ...prev]);
  };

  const selectItem = (value: string): void => {
    if (isAllowance) {
      const next = HABITS.find((h) => h.id === value);
      if (next) {
        setHabitId(next.id);
        setHabitQty(next.def);
      }
    } else {
      const next = VICES.find((v) => v.id === value);
      if (next) {
        setViceId(next.id);
        setViceQty(next.def);
      }
    }
  };

  // ── Mode-dependent accent classes ───────────────────────────────────────
  const accent = isAllowance
    ? {
        text: "text-emerald-300",
        ring: "#34d399",
        ringDim: "rgba(52,211,153,0.15)",
        glow: "shadow-[0_0_40px_rgba(52,211,153,0.25)]",
        btnGlow: "shadow-[0_8px_30px_rgba(52,211,153,0.35)]",
        btn: "bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300",
        thumb: "[&::-webkit-slider-thumb]:bg-emerald-300 [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(52,211,153,0.8)]",
        border: "border-emerald-400/20",
      }
    : {
        text: "text-amber-300",
        ring: "#fb7185",
        ringDim: "rgba(251,113,133,0.15)",
        glow: "shadow-[0_0_40px_rgba(251,113,133,0.22)]",
        btnGlow: "shadow-[0_8px_30px_rgba(251,113,133,0.35)]",
        btn: "bg-gradient-to-r from-rose-500 to-amber-400 hover:from-rose-400 hover:to-amber-300",
        thumb: "[&::-webkit-slider-thumb]:bg-amber-300 [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(251,191,36,0.8)]",
        border: "border-rose-400/20",
      };

  const glass = "backdrop-blur-md bg-white/5 border border-white/10 shadow-2xl rounded-2xl";

  // ══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="relative min-h-screen lg:h-screen lg:overflow-hidden w-full bg-[#070b14] text-white antialiased font-sans">
      {/* ── Animated mesh-gradient backdrop ── */}
      <style>{`
        @keyframes orbDrift1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,-40px) scale(1.15); } }
        @keyframes orbDrift2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px,50px) scale(0.9); } }
        @keyframes orbDrift3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,30px) scale(1.1); } }
      `}</style>
      <div className="pointer-events-none fixed inset-0 w-screen h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#0f1b33_0%,transparent_55%),radial-gradient(ellipse_at_bottom_right,#0a2620_0%,transparent_55%),radial-gradient(ellipse_at_center,#101426_0%,#070b14_75%)]" />
        <div className="absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full bg-indigo-600/20 blur-[120px]" style={{ animation: "orbDrift1 18s ease-in-out infinite" }} />
        <div className="absolute bottom-[-180px] right-[-100px] w-[520px] h-[520px] rounded-full bg-emerald-500/15 blur-[130px]" style={{ animation: "orbDrift2 22s ease-in-out infinite" }} />
        <div className="absolute top-1/3 left-1/2 w-[380px] h-[380px] rounded-full bg-cyan-500/10 blur-[110px]" style={{ animation: "orbDrift3 26s ease-in-out infinite" }} />
      </div>

      {/* ── App shell: header / main / footer-ledger, locked above the fold ── */}
      <div className="relative z-10 flex flex-col min-h-screen lg:h-full max-w-[1400px] mx-auto px-5 lg:px-8 py-4 gap-4">

        {/* ─────────────── HEADER ─────────────── */}
        <header className="flex items-center justify-between flex-shrink-0">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 via-cyan-400 to-emerald-400 flex items-center justify-center shadow-[0_0_24px_rgba(94,234,212,0.4)]">
              <Scale className="w-4.5 h-4.5 text-[#070b14]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none">This is AI</h1>
              <p className="text-[10px] text-white/40 tracking-[0.2em] uppercase mt-0.5">Direct Barter Engine</p>
            </div>
          </div>

          {/* Status badge */}
          <div className={`hidden sm:flex items-center gap-2 ${glass} px-4 py-2`}>
            <span className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
            <span className="text-xs font-medium text-white/80">Status: {status}</span>
          </div>

          {/* Sliding segmented mode toggle */}
          <div className={`relative flex ${glass} p-1 w-[270px] select-none`}>
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all duration-300 ease-out ${
                isAllowance
                  ? "left-1 bg-emerald-400/20 border border-emerald-300/30 shadow-[0_0_18px_rgba(52,211,153,0.35)]"
                  : "left-[calc(50%+3px)] bg-rose-400/20 border border-rose-300/30 shadow-[0_0_18px_rgba(251,113,133,0.35)]"
              }`}
            />
            <button
              onClick={() => setMode("allowance")}
              className={`relative z-10 flex-1 py-2 text-xs font-semibold tracking-wide transition-colors duration-300 ${isAllowance ? "text-emerald-200" : "text-white/40 hover:text-white/70"}`}
            >
              Allowance
            </button>
            <button
              onClick={() => setMode("debt")}
              className={`relative z-10 flex-1 py-2 text-xs font-semibold tracking-wide transition-colors duration-300 ${!isAllowance ? "text-amber-200" : "text-white/40 hover:text-white/70"}`}
            >
              Debt
            </button>
          </div>
        </header>

        {/* ─────────────── MAIN SPLIT-PANEL ─────────────── */}
        <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* ── LEFT: interactive controls ── */}
          <section className={`lg:col-span-5 ${glass} ${accent.border} p-6 flex flex-col gap-5 transition-shadow duration-500 ${accent.glow}`}>
            <div>
              <h2 className={`text-sm font-bold uppercase tracking-[0.18em] ${accent.text}`}>
                {isAllowance ? "Earned Allowance" : "Debt Recovery"}
              </h2>
              <p className="text-xs text-white/40 mt-1">
                {isAllowance
                  ? "Log the good work — see exactly what it buys you."
                  : "Confess the indulgence — see exactly what it costs."}
              </p>
            </div>

            {/* Item dropdown */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-2">
                {isAllowance ? "Healthy Habit" : "Indulgence"}
              </label>
              <div className="relative">
                <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${accent.text}`}>{item.icon}</span>
                <select
                  value={item.id}
                  onChange={(e) => selectItem(e.target.value)}
                  className="w-full appearance-none rounded-xl bg-white/5 border border-white/10 pl-10 pr-10 py-3 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/20 cursor-pointer [&>option]:bg-[#0d1322]"
                >
                  {(isAllowance ? HABITS : VICES).map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
              </div>
            </div>

            {/* Quantity slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">Quantity</label>
                <span className={`text-sm font-bold tabular-nums ${accent.text}`}>
                  {fmt(qty)} {item.unit}
                </span>
              </div>
              <input
                type="range"
                min={item.min}
                max={item.max}
                step={item.step}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className={`w-full h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full ${accent.thumb}`}
              />
              <div className="flex justify-between mt-1 text-[10px] text-white/25">
                <span>{item.min}</span>
                <span>{item.max}</span>
              </div>
            </div>

            {/* Live readout strip */}
            <div className={`rounded-xl border ${accent.border} bg-white/[0.03] px-4 py-3 flex items-center gap-3`}>
              <Sparkles className={`w-4 h-4 flex-shrink-0 ${accent.text}`} />
              <p className="text-xs text-white/60 leading-relaxed">
                {isAllowance
                  ? <>Banking <span className={`font-bold ${accent.text}`}>{fmt(qty)} {item.unit}</span> of {item.label.toLowerCase()} into your balance.</>
                  : <>This indulgence costs <span className={`font-bold ${accent.text}`}>{fmt(totalME)} run-miles</span> of payback.</>}
              </p>
            </div>

            {/* Log button */}
            <button
              onClick={logToLedger}
              className={`mt-auto w-full rounded-xl py-3.5 text-sm font-bold text-[#070b14] transition-all duration-300 ${accent.btn} ${accent.btnGlow} active:scale-[0.98]`}
            >
              Log to Ledger
            </button>
          </section>

          {/* ── RIGHT: visual balance + conversion metrics ── */}
          <section className={`lg:col-span-7 ${glass} p-6 flex flex-col sm:flex-row items-center gap-6 min-h-0`}>

            {/* Concentric ring gauge */}
            <div className="relative flex-shrink-0 w-52 h-52">
              <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                <defs>
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={inGreen ? "#34d399" : "#fb7185"} />
                    <stop offset="100%" stopColor={inGreen ? "#22d3ee" : "#fbbf24"} />
                  </linearGradient>
                </defs>
                {/* Outer decorative ring */}
                <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                {/* Track */}
                <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                {/* Progress */}
                <circle
                  cx="100" cy="100" r={RADIUS} fill="none"
                  stroke="url(#ringGrad)" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={CIRC} strokeDashoffset={gaugeOffset}
                  style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)" }}
                />
                {/* Inner dashed ring */}
                <circle cx="100" cy="100" r="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3 6" />
              </svg>
              {/* Center readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <span className={`text-3xl font-bold tabular-nums leading-none ${inGreen ? "text-emerald-300" : "text-rose-300"}`}>
                  {inGreen ? `+${fmt(netME / 1.5)}` : fmt(Math.abs(netME))}
                </span>
                <span className="text-[10px] uppercase tracking-[0.15em] text-white/40 mt-1.5 leading-tight">
                  {inGreen ? "Beers Banked" : "Miles Owed"}
                </span>
              </div>
            </div>

            {/* Conversion metrics — large crisp typography */}
            <div className="flex-1 w-full min-w-0">
              <h3 className={`text-[10px] uppercase tracking-[0.2em] font-semibold mb-3 ${accent.text}`}>
                {isAllowance ? "This lets you have" : "Penance & Payback Matrix — pick one"}
              </h3>

              {isAllowance ? (
                <div className="grid grid-cols-2 gap-3">
                  {allowanceGrid.map((g) => (
                    <div key={g.label} className="rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 flex items-center gap-3">
                      <span className="text-emerald-300/80">{g.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xl font-bold tabular-nums text-white leading-none">{fmt(g.value)}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1 truncate">{g.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {paybackGrid.map((g, i) => (
                    <div key={g.label} className="rounded-xl bg-white/[0.04] border border-rose-300/15 px-4 py-3 flex items-center gap-3">
                      <span className="text-amber-300/80">{g.icon}</span>
                      <p className="text-lg font-bold tabular-nums text-white leading-none">
                        {fmt(g.value)}
                        <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider ml-2">{g.label}</span>
                      </p>
                      {i < 2 && <span className="ml-auto text-[9px] uppercase tracking-widest text-white/25">or</span>}
                    </div>
                  ))}
                  {viceId === "night" && (
                    <p className="text-[10px] text-white/35 flex items-center gap-1.5 pl-1">
                      <Droplets className="w-3 h-3" /> Salad route also requires 1 gallon of water per night.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>

        {/* ─────────────── BOTTOM ROW: scenarios + ledger ─────────────── */}
        <footer className="flex-shrink-0 grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Quick-Scenario Matrix */}
          <div className="lg:col-span-7 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setScenario({ question: s.question, verdict: s.verdict, net: s.net })}
                className={`${glass} px-3.5 py-3 text-left hover:bg-white/10 transition-colors duration-200 group`}
              >
                <p className="text-[11px] font-semibold text-white/85 leading-snug group-hover:text-white">{s.question}</p>
                <p className="text-[9px] text-white/35 mt-1.5 uppercase tracking-wider">{s.sub}</p>
              </button>
            ))}
          </div>

          {/* Compact Ledger */}
          <div className={`lg:col-span-5 ${glass} px-4 py-3`}>
            <h3 className="text-[9px] uppercase tracking-[0.2em] text-white/35 font-semibold mb-2">Recent Ledger</h3>
            {ledger.length === 0 ? (
              <p className="text-[11px] text-white/30 italic">Nothing logged yet — your slate is clean.</p>
            ) : (
              <table className="w-full text-[10px]">
                <tbody>
                  {ledger.slice(0, 4).map((e) => (
                    <tr key={e.id} className="text-white/60">
                      <td className="py-0.5 pr-2 text-white/35 tabular-nums">{e.time}</td>
                      <td className="py-0.5 pr-2 font-medium text-white/75">{e.label}</td>
                      <td className="py-0.5 pr-2 tabular-nums">{fmt(e.qty)} {e.unit}</td>
                      <td className={`py-0.5 text-right font-bold tabular-nums ${e.me >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {e.me >= 0 ? "+" : ""}{fmt(e.me)} mi
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </footer>
      </div>

      {/* ─────────────── SCENARIO VERDICT MODAL ─────────────── */}
      {scenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setScenario(null)} />
          <div className={`relative w-full max-w-sm ${glass} p-7 text-center border ${scenario.net >= 0 ? "border-emerald-300/25" : "border-rose-300/25"}`}>
            <button
              onClick={() => setScenario(null)}
              className="absolute top-3.5 right-3.5 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
              scenario.net >= 0
                ? "bg-emerald-400/10 border border-emerald-300/30 shadow-[0_0_30px_rgba(52,211,153,0.3)]"
                : "bg-rose-400/10 border border-rose-300/30 shadow-[0_0_30px_rgba(251,113,133,0.3)]"
            }`}>
              <Scale className={`w-6 h-6 ${scenario.net >= 0 ? "text-emerald-300" : "text-rose-300"}`} />
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-2">{scenario.question}</p>
            <h4 className="text-lg font-bold text-white leading-snug mb-3">{scenario.verdict}</h4>
            <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
              scenario.net >= 0
                ? "bg-emerald-400/15 text-emerald-300 border border-emerald-300/25"
                : "bg-rose-400/15 text-rose-300 border border-rose-300/25"
            }`}>
              Net {scenario.net >= 0 ? "+" : ""}{fmt(scenario.net)} miles
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
