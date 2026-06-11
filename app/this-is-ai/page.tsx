"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Beer,
  Candy,
  ChevronDown,
  Check,
  Cigarette,
  CupSoda,
  Droplets,
  Dumbbell,
  EyeOff,
  Flame,
  Footprints,
  Leaf,
  Martini,
  Moon,
  RotateCcw,
  Salad,
  Scale,
  Smartphone,
  Sparkles,
  Wine,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════════════════════

type Mode = "allowance" | "debt" | "tonight";

type HabitId = "run" | "gym" | "salad" | "water";
type ViceId =
  | "beer" | "shot" | "drink"
  | "cig" | "joint" | "edible" | "dab"
  | "porn" | "scroll"
  | "night";

/** A selectable item (habit or vice) with its mile-equivalent exchange rate. */
interface BarterItem<Id extends string> {
  id: Id;
  label: string;
  /** Short chip label (habits only). */
  short?: string;
  plural: string;
  /** Unit label for the slider readout, e.g. "miles", "beers". */
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

/** Vices are grouped into categories for the progressive-disclosure picker. */
interface ViceCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  vices: BarterItem<ViceId>[];
}

/** One context-aware scenario card. Tone drives the answer colour. */
interface Scenario {
  q: string;
  a: string;
  tone: "good" | "bad" | "info";
}

// ════════════════════════════════════════════════════════════════════════════
//  EXCHANGE-RATE TABLES (canonical currency: run-mile equivalents, "ME")
//
//  Vices:   beer 1.5 · shot 1 · weed drink 1 · cigarette 0.5 · joint 2
//           edible 1.5 · dab 2.5 · porn 1 · infinite scroll 1/hr · night out 6
//  Habits:  run 1/mi · gym 2/workout · salad 1.5 · water 1/gallon
//
//  Locked barter rules:
//  · 1 Beer            = 1.5 mi run  OR 1 clean salad
//  · 1 Cigarette       = 0.5 mi run  OR 0.5 clean salads
//  · 1 Cannabis sesh   = 2 mi run    OR 1 high-intensity gym workout
//  · 1 Heavy Night Out = 6 mi run    OR 4 clean salads + 1 gallon of water
// ════════════════════════════════════════════════════════════════════════════

const HABITS: BarterItem<HabitId>[] = [
  { id: "run",   label: "Running",          short: "Run",   plural: "Miles",    unit: "miles",    me: 1,   min: 0.5, max: 10, step: 0.5, def: 3, icon: <Footprints className="w-4 h-4" /> },
  { id: "gym",   label: "Gym Workout",      short: "Gym",   plural: "Workouts", unit: "sessions", me: 2,   min: 1,   max: 4,  step: 1,   def: 1, icon: <Dumbbell className="w-4 h-4" /> },
  { id: "salad", label: "Clean Salad",      short: "Salad", plural: "Salads",   unit: "salads",   me: 1.5, min: 1,   max: 6,  step: 1,   def: 2, icon: <Salad className="w-4 h-4" /> },
  { id: "water", label: "Proper Hydration", short: "Water", plural: "Gallons",  unit: "gallons",  me: 1,   min: 0.5, max: 3,  step: 0.5, def: 1, icon: <Droplets className="w-4 h-4" /> },
];

const VICE_CATEGORIES: ViceCategory[] = [
  {
    id: "drinks",
    label: "Drinks & Liquor",
    icon: <Beer className="w-4 h-4" />,
    vices: [
      { id: "beer",  label: "Beer",           plural: "Beers",       unit: "beers",  me: 1.5, min: 1, max: 12, step: 1, def: 2, icon: <Beer className="w-4 h-4" /> },
      { id: "shot",  label: "Shot of Liquor", plural: "Shots",       unit: "shots",  me: 1,   min: 1, max: 10, step: 1, def: 2, icon: <Wine className="w-4 h-4" /> },
      { id: "drink", label: "Weed Drink",     plural: "Weed Drinks", unit: "drinks", me: 1,   min: 1, max: 8,  step: 1, def: 1, icon: <CupSoda className="w-4 h-4" /> },
    ],
  },
  {
    id: "smoke",
    label: "Smoke & Herb",
    icon: <Leaf className="w-4 h-4" />,
    vices: [
      { id: "cig",    label: "Cigarette", plural: "Cigarettes", unit: "cigarettes", me: 0.5, min: 1, max: 20, step: 1, def: 4, icon: <Cigarette className="w-4 h-4" /> },
      { id: "joint",  label: "Joint",     plural: "Joints",     unit: "joints",     me: 2,   min: 1, max: 6,  step: 1, def: 1, icon: <Leaf className="w-4 h-4" /> },
      { id: "edible", label: "Edible",    plural: "Edibles",    unit: "edibles",    me: 1.5, min: 1, max: 8,  step: 1, def: 1, icon: <Candy className="w-4 h-4" /> },
      { id: "dab",    label: "Dab",       plural: "Dabs",       unit: "dabs",       me: 2.5, min: 1, max: 6,  step: 1, def: 1, icon: <Flame className="w-4 h-4" /> },
    ],
  },
  {
    id: "digital",
    label: "Digital Dopamine",
    icon: <Smartphone className="w-4 h-4" />,
    vices: [
      { id: "porn",   label: "Porn Session",    plural: "Porn Sessions", unit: "sessions", me: 1, min: 1, max: 6, step: 1, def: 1, icon: <EyeOff className="w-4 h-4" /> },
      { id: "scroll", label: "Infinite Scroll", plural: "Scroll Hours",  unit: "hours",    me: 1, min: 1, max: 8, step: 1, def: 2, icon: <Smartphone className="w-4 h-4" /> },
    ],
  },
  {
    id: "nights",
    label: "Big Nights",
    icon: <Martini className="w-4 h-4" />,
    vices: [
      { id: "night", label: "Heavy Night Out", plural: "Heavy Nights", unit: "nights", me: 6, min: 1, max: 3, step: 1, def: 1, icon: <Martini className="w-4 h-4" /> },
    ],
  },
];

const ALL_VICES: BarterItem<ViceId>[] = VICE_CATEGORIES.flatMap((c) => c.vices);

/** Vices selectable in the Tonight planner (single events, not whole nights). */
const TONIGHT_IDS: ViceId[] = ["beer", "shot", "cig", "joint", "edible", "dab", "drink"];

/** The cannabis family pays its debt at the gym (1 workout per 2 ME). */
const CANNABIS_IDS: ViceId[] = ["joint", "edible", "dab", "drink"];

/** Format a number cleanly: integers stay whole, fractions get one decimal. */
const fmt = (n: number): string =>
  Math.abs(n % 1) < 0.05 ? Math.round(n).toString() : n.toFixed(1);

// ════════════════════════════════════════════════════════════════════════════
//  CONTEXT-AWARE SCENARIO MATRIX
//  The two bottom cards are regenerated on every render from whatever habit /
//  vice / quantity is live in the controls above — never static, never stale.
// ════════════════════════════════════════════════════════════════════════════

function buildScenarios(
  mode: Mode,
  habit: BarterItem<HabitId>,
  habitQty: number,
  vice: BarterItem<ViceId>,
  viceQty: number,
  netME: number,
  tonightPicks: ViceId[],
): Scenario[] {
  // ── Allowance: "what does this good work actually buy me?" ──────────────
  if (mode === "allowance") {
    const earned = habitQty * habit.me;
    switch (habit.id) {
      case "run":
        return [
          { q: `What does ${fmt(habitQty)} mi buy?`, a: `${fmt(earned / 1.5)} beers · ${fmt(earned / 0.5)} cigs`, tone: "info" },
          {
            q: "Cover 3 beers tonight?",
            a: earned >= 4.5 ? "Yes — 4.5 mi banked" : `Need ${fmt(4.5 - earned)} more mi`,
            tone: earned >= 4.5 ? "good" : "bad",
          },
        ];
      case "gym":
        return [
          {
            q: "Joint after the gym?",
            a: earned >= 2 ? "Covered — net zero" : `Short ${fmt(2 - earned)} mi`,
            tone: earned >= 2 ? "good" : "bad",
          },
          { q: `${fmt(habitQty)} workout${habitQty === 1 ? "" : "s"} buys`, a: `${fmt(earned / 1.5)} beers · ${fmt(earned / 0.5)} cigs`, tone: "info" },
        ];
      case "salad":
        return [
          { q: "Beer with this salad?", a: habitQty >= 1 ? "Yes — clean trade" : "Not quite", tone: habitQty >= 1 ? "good" : "bad" },
          // Locked rule: 0.5 clean salads neutralize 1 cigarette.
          { q: `${fmt(habitQty)} salad${habitQty === 1 ? "" : "s"} erases`, a: `${fmt(habitQty * 2)} cigarettes`, tone: "info" },
        ];
      case "water":
        return [
          { q: `${fmt(habitQty)} gallon${habitQty === 1 ? "" : "s"} buys`, a: `${fmt(earned / 1.5)} beers`, tone: "info" },
          { q: "Night out tonight?", a: "6 mi · or 4 salads + 1 gal", tone: "info" },
        ];
    }
  }

  // ── Debt: "what does this indulgence cost, and am I covered?" ───────────
  if (mode === "debt") {
    const owed = viceQty * vice.me;
    const payback =
      vice.id === "night"
        ? `${4 * viceQty} salads + ${viceQty} gal water`        // locked night-out route
        : vice.id === "cig"
        ? `${fmt(viceQty * 0.5)} clean salads`                  // locked: 0.5 salads / cig
        : CANNABIS_IDS.includes(vice.id)
        ? `${fmt(Math.ceil(owed / 2))} gym workout${Math.ceil(owed / 2) === 1 ? "" : "s"}`
        : `${fmt(owed / 1.5)} clean salads`;
    return [
      { q: `Pay off ${fmt(viceQty)} ${viceQty === 1 ? vice.label.toLowerCase() : vice.unit}?`, a: `${fmt(owed)} mi run · or ${payback}`, tone: "info" },
      {
        q: "Can my balance cover it?",
        a: netME >= owed ? "Yes — fully banked" : `Short ${fmt(owed - netME)} mi`,
        tone: netME >= owed ? "good" : "bad",
      },
    ];
  }

  // ── Tonight: "is the evening I'm planning actually funded?" ─────────────
  const budget = Math.max(netME, 0);
  const oneOfEach = tonightPicks.reduce(
    (sum, id) => sum + (ALL_VICES.find((v) => v.id === id)?.me ?? 0),
    0,
  );
  return [
    { q: "Tonight's budget?", a: `${fmt(budget)} run-miles`, tone: budget > 0 ? "good" : "bad" },
    tonightPicks.length === 0
      ? { q: "One of each pick?", a: "Pick a vice first", tone: "info" }
      : {
          q: "One of each pick?",
          a: oneOfEach <= budget ? `Covered — ${fmt(oneOfEach)} mi` : `Need ${fmt(oneOfEach - budget)} more mi`,
          tone: oneOfEach <= budget ? "good" : "bad",
        },
  ];
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export default function VicesAiPage() {
  // ── Core state ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("allowance");
  const [habitId, setHabitId] = useState<HabitId>("run");
  const [viceId, setViceId] = useState<ViceId>("beer");
  const [habitQty, setHabitQty] = useState<number>(3);
  const [viceQty, setViceQty] = useState<number>(2);
  const [tonightPicks, setTonightPicks] = useState<ViceId[]>(["beer", "cig"]);

  /** Signed run-mile balance — the whole ledger reduced to one number. */
  const [netME, setNetME] = useState<number>(0);
  const [lastEntry, setLastEntry] = useState<string | null>(null);

  // ── Vice picker (progressive disclosure: trigger → category → vice) ─────
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [openCat, setOpenCat] = useState<string>("drinks");

  // ── Splash screen ───────────────────────────────────────────────────────
  const [splashFading, setSplashFading] = useState<boolean>(false);
  const [splashGone, setSplashGone] = useState<boolean>(false);
  useEffect(() => {
    const t1 = setTimeout(() => setSplashFading(true), 1800);
    const t2 = setTimeout(() => setSplashGone(true), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // ── Persistence ─────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("vices-ledger-v2");
      if (raw) {
        const p = JSON.parse(raw);
        setNetME(p.netME ?? 0);
        setLastEntry(p.lastEntry ?? null);
      }
    } catch { /* corrupted storage — start clean */ }
  }, []);
  useEffect(() => {
    localStorage.setItem("vices-ledger-v2", JSON.stringify({ netME, lastEntry }));
  }, [netME, lastEntry]);

  // ── Current selection + reactive math ───────────────────────────────────
  const habit = HABITS.find((h) => h.id === habitId) as BarterItem<HabitId>;
  const vice = ALL_VICES.find((v) => v.id === viceId) as BarterItem<ViceId>;

  const isAllowance = mode === "allowance";
  const isDebt = mode === "debt";
  const isTonight = mode === "tonight";

  const item = isDebt ? vice : habit;
  const qty = isDebt ? viceQty : habitQty;
  const setQty = isDebt ? setViceQty : setHabitQty;
  const totalME = qty * item.me;

  /** Tonight planner: split today's surplus evenly across the picks. */
  const tonightBudget = Math.max(netME, 0);
  const tonightGrid = useMemo(() => {
    if (tonightPicks.length === 0) return [];
    const share = tonightBudget / tonightPicks.length;
    return tonightPicks.map((id) => {
      const v = ALL_VICES.find((x) => x.id === id) as BarterItem<ViceId>;
      return { ...v, count: share / v.me };
    });
  }, [tonightPicks, tonightBudget]);

  const scenarios = buildScenarios(mode, habit, habitQty, vice, viceQty, netME, tonightPicks);

  // ── Life Balance status (three glowing-dot states) ──────────────────────
  const status =
    netME > 0.25
      ? { label: "Vitality Surplus", dot: "bg-emerald-400", text: "text-emerald-300", glow: "shadow-[0_0_10px_rgba(52,211,153,0.9)]" }
      : netME < -0.25
      ? { label: "Karma Deficit",    dot: "bg-rose-400",    text: "text-rose-300",    glow: "shadow-[0_0_10px_rgba(251,113,133,0.9)]" }
      : { label: "Neutral Zone",     dot: "bg-sky-300",     text: "text-sky-200",     glow: "shadow-[0_0_10px_rgba(125,211,252,0.9)]" };

  // ── Actions ─────────────────────────────────────────────────────────────
  const logEntry = (): void => {
    const signed = isAllowance ? totalME : -totalME;
    setNetME((prev) => Math.round((prev + signed) * 100) / 100);
    setLastEntry(
      `${item.label} · ${fmt(qty)} ${item.unit} · ${signed >= 0 ? "+" : ""}${fmt(signed)} mi · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    );
  };

  const togglePick = (id: ViceId): void =>
    setTonightPicks((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const selectVice = (id: ViceId): void => {
    const next = ALL_VICES.find((v) => v.id === id);
    if (next) { setViceId(next.id); setViceQty(next.def); }
    setPickerOpen(false);
  };

  // ── Mode-dependent accent classes ───────────────────────────────────────
  const accent = isAllowance
    ? { tab: "bg-emerald-400/20 text-emerald-200", text: "text-emerald-300", slider: "vslider-emerald", chip: "bg-emerald-400/15 border-emerald-300/30 text-emerald-200", btn: "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_8px_24px_rgba(52,211,153,0.35)]" }
    : isDebt
    ? { tab: "bg-rose-400/20 text-rose-200",       text: "text-rose-300",    slider: "vslider-rose",    chip: "bg-rose-400/15 border-rose-300/30 text-rose-200",          btn: "bg-gradient-to-r from-rose-500 to-amber-400 shadow-[0_8px_24px_rgba(251,113,133,0.35)]" }
    : { tab: "bg-indigo-400/20 text-indigo-200",   text: "text-indigo-300",  slider: "vslider-indigo",  chip: "bg-indigo-400/15 border-indigo-300/30 text-indigo-200",    btn: "bg-gradient-to-r from-indigo-500 to-violet-400 shadow-[0_8px_24px_rgba(129,140,248,0.35)]" };

  const glass = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md";

  // ══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="relative min-h-dvh w-full bg-zinc-950 font-sans text-zinc-100 antialiased lg:flex lg:items-center lg:justify-center lg:p-8">
      {/* Scoped styles: invisible scrollbars, slider thumbs, splash loader */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .vslider { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 9999px; background: rgba(255,255,255,0.08); outline: none; }
        .vslider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 9999px; cursor: pointer; }
        .vslider::-moz-range-thumb { width: 18px; height: 18px; border: none; border-radius: 9999px; cursor: pointer; }
        .vslider-emerald::-webkit-slider-thumb { background: #34d399; box-shadow: 0 0 14px rgba(52,211,153,0.8); }
        .vslider-emerald::-moz-range-thumb { background: #34d399; }
        .vslider-rose::-webkit-slider-thumb { background: #fb7185; box-shadow: 0 0 14px rgba(251,113,133,0.8); }
        .vslider-rose::-moz-range-thumb { background: #fb7185; }
        .vslider-indigo::-webkit-slider-thumb { background: #818cf8; box-shadow: 0 0 14px rgba(129,140,248,0.8); }
        .vslider-indigo::-moz-range-thumb { background: #818cf8; }
        @keyframes loadbar { from { width: 0%; } to { width: 100%; } }
      `}</style>

      {/* Desktop-only ambient backdrop behind the phone frame */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block bg-[radial-gradient(ellipse_at_top_left,#101b2e_0%,transparent_55%),radial-gradient(ellipse_at_bottom_right,#0c1f1a_0%,transparent_55%)]" />

      {/* ─────────────── PHONE FRAME ───────────────
          Mobile: fills the native viewport edge-to-edge.
          Desktop: centered, cropped device mock-up with rounded bezel. */}
      <div className="relative h-dvh w-full overflow-hidden bg-gradient-to-b from-zinc-900 via-zinc-950 to-black lg:h-[780px] lg:max-h-[92vh] lg:w-[390px] lg:rounded-[40px] lg:border lg:border-zinc-700/50 lg:ring-8 lg:ring-zinc-900 lg:shadow-[0_40px_120px_-20px_rgba(0,0,0,0.85)]">

        {/* Notch — desktop mock-up only */}
        <div className="absolute left-1/2 top-3 z-40 hidden h-6 w-28 -translate-x-1/2 rounded-full border border-zinc-800 bg-black lg:block" />

        {/* ─────────────── SPLASH / LOADING SCREEN ─────────────── */}
        {!splashGone && (
          <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 transition-opacity duration-700 ${splashFading ? "opacity-0" : "opacity-100"}`}>
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 via-teal-400 to-indigo-400 shadow-[0_0_50px_rgba(52,211,153,0.45)]">
              <Scale className="h-9 w-9 text-zinc-950" />
            </div>
            <h1 className="mt-6 text-4xl font-black tracking-tight">
              Vices<span className="text-emerald-400">.ai</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-400">Earn your vices the easy way.</p>
            <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300" style={{ animation: "loadbar 2.2s ease-out forwards" }} />
            </div>
          </div>
        )}

        {/* ─────────────── SINGLE-SCREEN APP SHELL (zero scroll) ─────────────── */}
        <div className="flex h-full flex-col justify-between gap-3 overflow-hidden p-6 lg:pt-12">

          {/* ── HEADER: brand + Life Balance status ── */}
          <header className="flex flex-shrink-0 items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-teal-400 to-indigo-400 shadow-[0_0_20px_rgba(52,211,153,0.35)]">
                <Scale className="h-4 w-4 text-zinc-950" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-none tracking-tight">
                  Vices<span className="text-emerald-400">.ai</span>
                </h1>
                <p className="mt-1 text-[8px] uppercase tracking-[0.18em] text-zinc-500">Earn your vices the easy way</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Life Balance</span>
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${status.dot} ${status.glow}`} />
                <span className={`text-[10px] font-semibold ${status.text}`}>{status.label}</span>
              </div>
            </div>
          </header>

          {/* ── MODE TOGGLE ── */}
          <div className="flex flex-shrink-0 rounded-xl border border-white/10 bg-white/5 p-1">
            {([["allowance", "Allowance"], ["debt", "Debt"], ["tonight", "Tonight"]] as [Mode, string][]).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors duration-200 ${mode === m ? accent.tab : "text-zinc-500 hover:text-zinc-300"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── MAIN PANEL (the only region allowed to flex) ── */}
          <main className={`no-scrollbar min-h-0 flex-1 overflow-y-auto ${glass} flex flex-col gap-4 p-5`}>
            {isTonight ? (
              <>
                {/* Tonight planner: multi-select, then split the surplus */}
                <div>
                  <h2 className={`text-xs font-bold uppercase tracking-[0.18em] ${accent.text}`}>Tonight&apos;s Plan</h2>
                  <p className="mt-1 text-[11px] text-zinc-500">Pick your poisons — today&apos;s surplus gets split across them.</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TONIGHT_IDS.map((id) => {
                    const v = ALL_VICES.find((x) => x.id === id) as BarterItem<ViceId>;
                    const on = tonightPicks.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => togglePick(id)}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${on ? accent.chip : "border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200"}`}
                      >
                        {v.icon}
                        {v.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-indigo-300/20 bg-white/[0.03] px-3.5 py-2.5">
                  <Moon className={`h-4 w-4 flex-shrink-0 ${accent.text}`} />
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    Tonight&apos;s budget: <span className={`font-bold ${accent.text}`}>{fmt(tonightBudget)} run-miles</span> — earned from today&apos;s logged exercise.
                  </p>
                </div>
                {tonightGrid.length > 0 && tonightBudget > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {tonightGrid.map((g) => (
                      <div key={g.id} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                        <span className={accent.text}>{g.icon}</span>
                        <div className="min-w-0">
                          <p className="text-base font-bold leading-none tabular-nums">{fmt(g.count)}</p>
                          <p className="mt-0.5 truncate text-[9px] uppercase tracking-wider text-zinc-500">{g.plural}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] italic text-zinc-600">
                    {tonightPicks.length === 0 ? "Nothing selected yet." : "No surplus to spend — log exercise in Allowance first."}
                  </p>
                )}
              </>
            ) : (
              <>
                {/* Allowance / Debt: one item, one slider, one log button */}
                <div>
                  <h2 className={`text-xs font-bold uppercase tracking-[0.18em] ${accent.text}`}>
                    {isAllowance ? "Earned Allowance" : "Debt Recovery"}
                  </h2>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {isAllowance ? "Log the good work — see what it buys." : "Confess the indulgence — see what it costs."}
                  </p>
                </div>

                {isAllowance ? (
                  /* Habits are few enough for a flat chip row */
                  <div className="grid grid-cols-4 gap-2">
                    {HABITS.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => { setHabitId(h.id); setHabitQty(h.def); }}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border py-2.5 transition-colors ${habitId === h.id ? accent.chip : "border-white/10 bg-white/5 text-zinc-500 hover:text-zinc-300"}`}
                      >
                        {h.icon}
                        <span className="text-[9px] font-semibold">{h.short}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Vices are many — progressive disclosure via category picker */
                  <button
                    onClick={() => setPickerOpen(true)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
                  >
                    <span className={accent.text}>{vice.icon}</span>
                    <span className="flex-1 text-left text-sm font-medium">{vice.label}</span>
                    <span className="text-[10px] text-zinc-500">{fmt(vice.me)} mi each</span>
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  </button>
                )}

                {/* Quantity slider */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Quantity</label>
                    <span className={`text-sm font-bold tabular-nums ${accent.text}`}>{fmt(qty)} {item.unit}</span>
                  </div>
                  <input
                    type="range"
                    min={item.min}
                    max={item.max}
                    step={item.step}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className={`vslider ${accent.slider}`}
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
                    <span>{item.min}</span>
                    <span>{item.max}</span>
                  </div>
                </div>

                {/* Live readout */}
                <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
                  <Sparkles className={`h-4 w-4 flex-shrink-0 ${accent.text}`} />
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    {isAllowance
                      ? <>Banking <span className={`font-bold ${accent.text}`}>{fmt(totalME)} run-miles</span> — that&apos;s {fmt(totalME / 1.5)} beers of headroom.</>
                      : <>This costs <span className={`font-bold ${accent.text}`}>{fmt(totalME)} run-miles</span> of payback.</>}
                  </p>
                </div>

                <button
                  onClick={logEntry}
                  className={`mt-auto w-full rounded-xl py-3.5 text-sm font-bold text-zinc-950 transition-transform active:scale-[0.98] ${accent.btn}`}
                >
                  Log to Ledger
                </button>
              </>
            )}
          </main>

          {/* ── VIBE LEDGER: one-number balance + last entry + reset ── */}
          <div className={`${glass} flex flex-shrink-0 items-center gap-3 px-4 py-3`}>
            <div className="flex-shrink-0">
              <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Vibe Ledger</p>
              <p className={`text-xl font-bold tabular-nums leading-tight ${netME > 0.25 ? "text-emerald-300" : netME < -0.25 ? "text-rose-300" : "text-sky-200"}`}>
                {netME >= 0 ? "+" : ""}{fmt(netME)} mi
              </p>
            </div>
            <p className="min-w-0 flex-1 truncate text-right text-[10px] text-zinc-500">
              {lastEntry ?? "Slate is clean — log something."}
            </p>
            <button
              onClick={() => { setNetME(0); setLastEntry(null); }}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-500 transition-colors hover:text-zinc-200"
              aria-label="Reset ledger"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* ── DYNAMIC SCENARIO CARDS: follow the live selection above ── */}
          <div className="grid flex-shrink-0 grid-cols-2 gap-2.5">
            {scenarios.map((s) => (
              <div key={s.q} className={`${glass} px-3.5 py-3`}>
                <p className="text-[10px] font-semibold leading-snug text-zinc-400">{s.q}</p>
                <p className={`mt-1.5 text-[11px] font-bold leading-snug ${s.tone === "good" ? "text-emerald-300" : s.tone === "bad" ? "text-rose-300" : "text-sky-200"}`}>
                  {s.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ─────────────── CATEGORIZED VICE PICKER (bottom sheet) ─────────────── */}
        {pickerOpen && (
          <div className="absolute inset-0 z-30">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPickerOpen(false)} />
            <div className="no-scrollbar absolute inset-x-0 bottom-0 max-h-[75%] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-zinc-900/95 p-5 backdrop-blur-xl">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Pick your indulgence</h3>
              <div className="space-y-2">
                {VICE_CATEGORIES.map((cat) => (
                  <div key={cat.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                    {/* Category row — first level of disclosure */}
                    <button
                      onClick={() => setOpenCat(openCat === cat.id ? "" : cat.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
                    >
                      <span className="text-rose-300">{cat.icon}</span>
                      <span className="flex-1 text-left text-sm font-semibold">{cat.label}</span>
                      <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${openCat === cat.id ? "rotate-180" : ""}`} />
                    </button>
                    {/* Vice rows — second level, shown only for the open category */}
                    {openCat === cat.id && (
                      <div className="border-t border-white/5">
                        {cat.vices.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => selectVice(v.id)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/5"
                          >
                            <span className="text-zinc-400">{v.icon}</span>
                            <span className="flex-1 text-left text-[13px] text-zinc-200">{v.label}</span>
                            <span className="text-[10px] text-zinc-500">{fmt(v.me)} mi</span>
                            {viceId === v.id && <Check className="h-3.5 w-3.5 text-emerald-300" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
