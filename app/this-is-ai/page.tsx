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
  UserPlus,
  Users,
  Wine,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════════════════════

type Mode = "allowance" | "debt" | "tonight" | "friends";

type HabitId = "run" | "gym" | "meal" | "water";
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
//  Degenerate-friendly rates — generous enough to feel achievable:
//  Vices:   beer 1 · shot 0.75 · weed drink 0.75 · cigarette 0.25 · joint 1.5
//           edible 1 · dab 2 · porn 0.5 · infinite scroll 0.5/hr · night out 4
//  Habits:  run 1/mi · gym 2/workout · good meal 1.5 · water 0.25/glass
//
//  Barter rules:
//  · 1 Beer            = 1 mi run     OR 1 good meal (with change to spare)
//  · 1 Cigarette       = 0.25 mi run
//  · 1 Cannabis sesh   = 1.5 mi run   OR 1 gym workout
//  · 1 Heavy Night Out = 4 mi run     OR 3 good meals
// ════════════════════════════════════════════════════════════════════════════

const HABITS: BarterItem<HabitId>[] = [
  { id: "run",   label: "Running",     short: "Run",   plural: "Miles",    unit: "miles",   me: 1,    min: 0.5, max: 10, step: 0.5, def: 3, icon: <Footprints className="w-4 h-4" /> },
  { id: "gym",   label: "Gym Workout", short: "Gym",   plural: "Workouts", unit: "sessions", me: 2,   min: 1,   max: 4,  step: 1,   def: 1, icon: <Dumbbell className="w-4 h-4" /> },
  { id: "meal",  label: "Good Meal",   short: "Meal",  plural: "Meals",    unit: "meals",   me: 1.5,  min: 1,   max: 6,  step: 1,   def: 2, icon: <Salad className="w-4 h-4" /> },
  { id: "water", label: "Hydration",   short: "Water", plural: "Glasses",  unit: "glasses", me: 0.25, min: 1,   max: 12, step: 1,   def: 4, icon: <Droplets className="w-4 h-4" /> },
];

const VICE_CATEGORIES: ViceCategory[] = [
  {
    id: "drinks",
    label: "Drinks & Liquor",
    icon: <Beer className="w-4 h-4" />,
    vices: [
      { id: "beer",  label: "Beer",           plural: "Beers",       unit: "beers",  me: 1,    min: 1, max: 12, step: 1, def: 2, icon: <Beer className="w-4 h-4" /> },
      { id: "shot",  label: "Shot of Liquor", plural: "Shots",       unit: "shots",  me: 0.75, min: 1, max: 10, step: 1, def: 2, icon: <Wine className="w-4 h-4" /> },
      { id: "drink", label: "Weed Drink",     plural: "Weed Drinks", unit: "drinks", me: 0.75, min: 1, max: 8,  step: 1, def: 1, icon: <CupSoda className="w-4 h-4" /> },
    ],
  },
  {
    id: "smoke",
    label: "Smoke & Herb",
    icon: <Leaf className="w-4 h-4" />,
    vices: [
      { id: "cig",    label: "Cigarette", plural: "Cigarettes", unit: "cigarettes", me: 0.25, min: 1, max: 20, step: 1, def: 4, icon: <Cigarette className="w-4 h-4" /> },
      { id: "joint",  label: "Joint",     plural: "Joints",     unit: "joints",     me: 1.5,  min: 1, max: 6,  step: 1, def: 1, icon: <Leaf className="w-4 h-4" /> },
      { id: "edible", label: "Edible",    plural: "Edibles",    unit: "edibles",    me: 1,    min: 1, max: 8,  step: 1, def: 1, icon: <Candy className="w-4 h-4" /> },
      { id: "dab",    label: "Dab",       plural: "Dabs",       unit: "dabs",       me: 2,    min: 1, max: 6,  step: 1, def: 1, icon: <Flame className="w-4 h-4" /> },
    ],
  },
  {
    id: "digital",
    label: "Digital Dopamine",
    icon: <Smartphone className="w-4 h-4" />,
    vices: [
      { id: "porn",   label: "Porn Session",    plural: "Porn Sessions", unit: "sessions", me: 0.5, min: 1, max: 6, step: 1, def: 1, icon: <EyeOff className="w-4 h-4" /> },
      { id: "scroll", label: "Infinite Scroll", plural: "Scroll Hours",  unit: "hours",    me: 0.5, min: 1, max: 8, step: 1, def: 2, icon: <Smartphone className="w-4 h-4" /> },
    ],
  },
  {
    id: "nights",
    label: "Big Nights",
    icon: <Martini className="w-4 h-4" />,
    vices: [
      { id: "night", label: "Heavy Night Out", plural: "Heavy Nights", unit: "nights", me: 4, min: 1, max: 3, step: 1, def: 1, icon: <Martini className="w-4 h-4" /> },
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
//  FRIENDS / BALANCE BOARD
//  The point of the app is moderation — too much of anything is bad, booze or
//  burpees. The board scores everyone on how close to even they keep it.
// ════════════════════════════════════════════════════════════════════════════

interface Friend {
  name: string;
  netME: number;
  last: string;
  you?: boolean;
}

/** Local demo friends until real account sync lands. */
const SEED_FRIENDS: Friend[] = [
  { name: "Ori",  netME: 0.5, last: "Gym Workout · 1 session · +2 mi" },
  { name: "Maya", netME: -1,  last: "Beer · 2 beers · -2 mi" },
  { name: "Jake", netME: 7.5, last: "Running · 8 miles · +8 mi" },
];

/** Moderation score: 100 at perfect equilibrium, 0 by ±8 mi of imbalance. */
const moderation = (me: number): number =>
  Math.max(0, Math.round(100 - Math.abs(me) * 12.5));

/** Status dot colour for any balance — yours or a friend's. */
const dotFor = (me: number): string =>
  me > 0.25 ? "bg-emerald-500" : me < -0.25 ? "bg-amber-400" : "bg-stone-300";

/** Bottom navigation tabs. */
const TABS: { id: Mode; label: string; icon: React.ReactNode }[] = [
  { id: "allowance", label: "Allowance", icon: <Footprints className="w-4 h-4" /> },
  { id: "debt",      label: "Debt",      icon: <Wine className="w-4 h-4" /> },
  { id: "tonight",   label: "Tonight",   icon: <Moon className="w-4 h-4" /> },
  { id: "friends",   label: "Friends",   icon: <Users className="w-4 h-4" /> },
];

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
  // Friends mode has no selection-driven cards.
  if (mode === "friends") return [];

  // ── Allowance: "what does this good work actually buy me?" ──────────────
  if (mode === "allowance") {
    const earned = habitQty * habit.me;
    switch (habit.id) {
      case "run":
        return [
          { q: `What does ${fmt(habitQty)} mi buy?`, a: `${fmt(earned)} beers · ${fmt(earned / 0.25)} cigs`, tone: "info" },
          {
            q: "Cover 3 beers tonight?",
            a: earned >= 3 ? "Yes — 3 mi banked" : `Need ${fmt(3 - earned)} more mi`,
            tone: earned >= 3 ? "good" : "bad",
          },
        ];
      case "gym":
        return [
          {
            q: "Joint after the gym?",
            a: earned >= 1.5 ? "Covered — net zero" : `Short ${fmt(1.5 - earned)} mi`,
            tone: earned >= 1.5 ? "good" : "bad",
          },
          { q: `${fmt(habitQty)} workout${habitQty === 1 ? "" : "s"} buys`, a: `${fmt(earned)} beers · ${fmt(earned / 0.25)} cigs`, tone: "info" },
        ];
      case "meal":
        return [
          { q: "Beer with this meal?", a: habitQty >= 1 ? "Yes — covered, with change" : "Not quite", tone: habitQty >= 1 ? "good" : "bad" },
          { q: `${fmt(habitQty)} meal${habitQty === 1 ? "" : "s"} erases`, a: `${fmt(habitQty * 6)} cigarettes`, tone: "info" },
        ];
      case "water":
        return [
          { q: `${fmt(habitQty)} glass${habitQty === 1 ? "" : "es"} buys`, a: `${fmt(earned)} beers`, tone: "info" },
          { q: "Night out tonight?", a: "4 mi · or 3 good meals", tone: "info" },
        ];
    }
  }

  // ── Debt: "what does this indulgence cost, and am I covered?" ───────────
  if (mode === "debt") {
    const owed = viceQty * vice.me;
    const payback =
      vice.id === "night"
        ? `${3 * viceQty} good meals`
        : CANNABIS_IDS.includes(vice.id)
        ? `${fmt(Math.ceil(owed / 2))} gym workout${Math.ceil(owed / 2) === 1 ? "" : "s"}`
        : `${fmt(owed / 1.5)} good meals`;
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
  const [friends, setFriends] = useState<Friend[]>(SEED_FRIENDS);
  const [newFriend, setNewFriend] = useState<string>("");

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
  useEffect(() => {
    try {
      const raw = localStorage.getItem("vices-friends-v1");
      if (raw) setFriends(JSON.parse(raw));
    } catch { /* corrupted storage — keep seeds */ }
  }, []);
  useEffect(() => {
    localStorage.setItem("vices-friends-v1", JSON.stringify(friends));
  }, [friends]);

  // ── Current selection + reactive math ───────────────────────────────────
  const habit = HABITS.find((h) => h.id === habitId) as BarterItem<HabitId>;
  const vice = ALL_VICES.find((v) => v.id === viceId) as BarterItem<ViceId>;

  const isAllowance = mode === "allowance";
  const isDebt = mode === "debt";
  const isTonight = mode === "tonight";
  const isFriends = mode === "friends";

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

  /** Leaderboard: you + friends, ranked by moderation score. */
  const board = useMemo(() => {
    const rows: Friend[] = [
      ...friends,
      { name: "You", netME, last: lastEntry ?? "No logs yet", you: true },
    ];
    return rows.sort((a, b) => moderation(b.netME) - moderation(a.netME));
  }, [friends, netME, lastEntry]);

  const addFriend = (): void => {
    const name = newFriend.trim();
    if (!name || friends.some((f) => f.name.toLowerCase() === name.toLowerCase())) return;
    setFriends((prev) => [...prev, { name, netME: 0, last: "No logs yet" }]);
    setNewFriend("");
  };

  // ── Life Balance status (three glowing-dot states) ──────────────────────
  const status =
    netME > 0.25
      ? { label: "Vitality Surplus", dot: "bg-emerald-500", text: "text-emerald-600", glow: "shadow-[0_0_8px_rgba(16,185,129,0.5)]" }
      : netME < -0.25
      ? { label: "Karma Deficit",    dot: "bg-amber-400",   text: "text-amber-600",   glow: "shadow-[0_0_8px_rgba(251,191,36,0.5)]" }
      : { label: "Neutral Zone",     dot: "bg-stone-300",   text: "text-stone-500",   glow: "shadow-[0_0_8px_rgba(214,211,209,0.6)]" };

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

  // ── Mode-dependent accent classes (vibrant on eggshell) ─────────────────
  const accent = isAllowance
    ? { text: "text-emerald-600", slider: "vslider-emerald", chip: "bg-emerald-500/10 border-emerald-500/40 text-emerald-700", btn: "bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/25" }
    : isDebt
    ? { text: "text-amber-600",   slider: "vslider-amber",   chip: "bg-amber-500/10 border-amber-500/40 text-amber-700",       btn: "bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/25" }
    : isTonight
    ? { text: "text-sky-600",     slider: "vslider-sky",     chip: "bg-sky-500/10 border-sky-500/40 text-sky-700",             btn: "bg-sky-500 hover:bg-sky-400 shadow-lg shadow-sky-500/25" }
    : { text: "text-stone-600",   slider: "vslider-sky",     chip: "bg-stone-900/10 border-stone-900/20 text-stone-700",       btn: "bg-stone-900 hover:bg-stone-700 shadow-lg shadow-stone-900/20" };

  const glass = "rounded-2xl border border-stone-900/10 bg-white/60 backdrop-blur-md shadow-sm";

  // ══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="relative min-h-dvh w-full bg-[#EDE9E1] font-sans text-stone-800 antialiased lg:flex lg:items-center lg:justify-center lg:p-8">
      {/* Scoped styles: invisible scrollbars, slider thumbs, splash loader */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .vslider { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 9999px; background: rgba(28,25,23,0.1); outline: none; }
        .vslider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 9999px; cursor: pointer; box-shadow: 0 2px 6px rgba(28,25,23,0.25); }
        .vslider::-moz-range-thumb { width: 18px; height: 18px; border: none; border-radius: 9999px; cursor: pointer; }
        .vslider-emerald::-webkit-slider-thumb { background: #10b981; }
        .vslider-emerald::-moz-range-thumb { background: #10b981; }
        .vslider-amber::-webkit-slider-thumb { background: #f59e0b; }
        .vslider-amber::-moz-range-thumb { background: #f59e0b; }
        .vslider-sky::-webkit-slider-thumb { background: #0ea5e9; }
        .vslider-sky::-moz-range-thumb { background: #0ea5e9; }
        @keyframes loadbar { from { width: 0%; } to { width: 100%; } }
      `}</style>

      {/* Desktop-only ambient backdrop behind the phone frame */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block bg-[radial-gradient(ellipse_at_top_left,#FFFFFF_0%,transparent_60%),radial-gradient(ellipse_at_bottom_right,#E0DACE_0%,transparent_60%)]" />

      {/* ─────────────── PHONE FRAME ───────────────
          Mobile: fills the native viewport edge-to-edge.
          Desktop: centered, cropped device mock-up with rounded bezel. */}
      <div className="relative h-dvh w-full overflow-hidden bg-gradient-to-b from-[#FAF8F4] to-[#F1EDE5] lg:h-[780px] lg:max-h-[92vh] lg:w-[390px] lg:rounded-[40px] lg:border lg:border-stone-700/60 lg:ring-8 lg:ring-stone-900 lg:shadow-[0_40px_120px_-20px_rgba(28,25,23,0.5)]">

        {/* Notch — desktop mock-up only */}
        <div className="absolute left-1/2 top-3 z-40 hidden h-6 w-28 -translate-x-1/2 rounded-full bg-stone-900 lg:block" />

        {/* ─────────────── SPLASH / LOADING SCREEN ─────────────── */}
        {!splashGone && (
          <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF8F4] transition-opacity duration-700 ${splashFading ? "opacity-0" : "opacity-100"}`}>
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-stone-900 shadow-xl shadow-stone-900/25">
              <Scale className="h-9 w-9 text-[#FAF8F4]" />
            </div>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-stone-900">
              Vices<span className="text-emerald-500">.ai</span>
            </h1>
            <p className="mt-2 text-sm text-stone-500">Earn your vices the easy way.</p>
            <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-stone-900/10">
              <div className="h-full rounded-full bg-emerald-500" style={{ animation: "loadbar 2.2s ease-out forwards" }} />
            </div>
          </div>
        )}

        {/* ─────────────── SINGLE-SCREEN APP SHELL (zero scroll) ─────────────── */}
        <div className="flex h-full flex-col justify-between gap-3 overflow-hidden p-6 lg:pt-12">

          {/* ── HEADER: brand + Life Balance status ── */}
          <header className="flex flex-shrink-0 items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 shadow-md shadow-stone-900/20">
                <Scale className="h-4 w-4 text-[#FAF8F4]" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-none tracking-tight text-stone-900">
                  Vices<span className="text-emerald-500">.ai</span>
                </h1>
                <p className="mt-1 text-[8px] uppercase tracking-[0.18em] text-stone-400">Earn your vices the easy way</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-stone-400">Life Balance</span>
              <div className="flex items-center gap-1.5 rounded-full border border-stone-900/10 bg-white/70 px-2.5 py-1">
                <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${status.dot} ${status.glow}`} />
                <span className={`text-[10px] font-semibold ${status.text}`}>{status.label}</span>
              </div>
            </div>
          </header>

          {/* ── MAIN PANEL (the only region allowed to flex) ── */}
          <main className={`no-scrollbar min-h-0 flex-1 overflow-y-auto ${glass} flex flex-col gap-4 p-5`}>
            {isFriends ? (
              <>
                {/* Balance Board: who's keeping it the most level */}
                <div>
                  <h2 className={`text-xs font-bold uppercase tracking-[0.18em] ${accent.text}`}>Balance Board</h2>
                  <p className="mt-1 text-[11px] italic text-stone-400">Moderation in all things.</p>
                </div>
                <div className="flex gap-2">
                  <input
                    value={newFriend}
                    onChange={(e) => setNewFriend(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addFriend()}
                    placeholder="Add a friend by name"
                    className="min-w-0 flex-1 rounded-xl border border-stone-900/15 bg-white/70 px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-900/30 focus:outline-none"
                  />
                  <button
                    onClick={addFriend}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-stone-900 text-[#FAF8F4] transition-colors hover:bg-stone-700"
                    aria-label="Add friend"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {board.map((f, i) => (
                    <div
                      key={f.name}
                      className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${f.you ? "border-stone-900/30 bg-white shadow-sm" : "border-stone-900/10 bg-white/50"}`}
                    >
                      <span className="w-4 flex-shrink-0 text-xs font-bold tabular-nums text-stone-400">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-stone-900">{f.name}</p>
                        <p className="truncate text-[10px] text-stone-400">{f.last}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-base font-bold leading-none tabular-nums text-stone-900">{moderation(f.netME)}</p>
                        <p className="mt-0.5 text-[8px] uppercase tracking-wider text-stone-400">balance</p>
                      </div>
                      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotFor(f.netME)}`} />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] leading-relaxed text-stone-400">
                  Closest to even wins — too much of anything, good or bad, costs points.
                </p>
              </>
            ) : isTonight ? (
              <>
                {/* Tonight planner: multi-select, then split the surplus */}
                <h2 className={`text-xs font-bold uppercase tracking-[0.18em] ${accent.text}`}>Tonight&apos;s Plan</h2>
                <div className="flex flex-wrap gap-1.5">
                  {TONIGHT_IDS.map((id) => {
                    const v = ALL_VICES.find((x) => x.id === id) as BarterItem<ViceId>;
                    const on = tonightPicks.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => togglePick(id)}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${on ? accent.chip : "border-stone-900/10 bg-white/40 text-stone-400 hover:text-stone-600"}`}
                      >
                        {v.icon}
                        {v.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-stone-900/10 bg-white/40 px-3.5 py-2.5">
                  <Moon className={`h-4 w-4 flex-shrink-0 ${accent.text}`} />
                  <p className="text-[11px] leading-relaxed text-stone-500">
                    Tonight&apos;s budget: <span className={`font-bold ${accent.text}`}>{fmt(tonightBudget)} run-miles</span> — earned from today&apos;s logged exercise.
                  </p>
                </div>
                {tonightGrid.length > 0 && tonightBudget > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {tonightGrid.map((g) => (
                      <div key={g.id} className="flex items-center gap-2.5 rounded-xl border border-stone-900/10 bg-white/40 px-3 py-2.5">
                        <span className={accent.text}>{g.icon}</span>
                        <div className="min-w-0">
                          <p className="text-base font-bold leading-none tabular-nums text-stone-900">{fmt(g.count)}</p>
                          <p className="mt-0.5 truncate text-[9px] uppercase tracking-wider text-stone-400">{g.plural}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] italic text-stone-400">
                    {tonightPicks.length === 0 ? "Nothing selected yet." : "No surplus to spend — log exercise in Allowance first."}
                  </p>
                )}
              </>
            ) : (
              <>
                {/* Allowance / Debt: one item, one slider, one log button */}
                <h2 className={`text-xs font-bold uppercase tracking-[0.18em] ${accent.text}`}>
                  {isAllowance ? "Earned Allowance" : "Debt Recovery"}
                </h2>

                {isAllowance ? (
                  /* Habits are few enough for a flat chip row */
                  <div className="grid grid-cols-4 gap-2">
                    {HABITS.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => { setHabitId(h.id); setHabitQty(h.def); }}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border py-2.5 transition-colors ${habitId === h.id ? accent.chip : "border-stone-900/10 bg-white/40 text-stone-400 hover:text-stone-600"}`}
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
                    className="flex w-full items-center gap-3 rounded-xl border border-stone-900/10 bg-white/40 px-4 py-3 transition-colors hover:bg-white/80"
                  >
                    <span className={accent.text}>{vice.icon}</span>
                    <span className="flex-1 text-left text-sm font-medium text-stone-800">{vice.label}</span>
                    <span className="text-[10px] text-stone-400">{fmt(vice.me)} mi each</span>
                    <ChevronDown className="h-4 w-4 text-stone-400" />
                  </button>
                )}

                {/* Quantity slider */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">Quantity</label>
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
                  <div className="mt-1 flex justify-between text-[10px] text-stone-400">
                    <span>{item.min}</span>
                    <span>{item.max}</span>
                  </div>
                </div>

                {/* Live readout */}
                <div className="flex items-center gap-2.5 rounded-xl border border-stone-900/10 bg-white/40 px-3.5 py-2.5">
                  <Sparkles className={`h-4 w-4 flex-shrink-0 ${accent.text}`} />
                  <p className="text-[11px] leading-relaxed text-stone-500">
                    {isAllowance
                      ? <>Banking <span className={`font-bold ${accent.text}`}>{fmt(totalME)} run-miles</span> — that&apos;s {fmt(totalME)} beers of headroom.</>
                      : <>This costs <span className={`font-bold ${accent.text}`}>{fmt(totalME)} run-miles</span> of payback.</>}
                  </p>
                </div>

                <button
                  onClick={logEntry}
                  className={`mt-auto w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98] ${accent.btn}`}
                >
                  Log to Ledger
                </button>
              </>
            )}
          </main>

          {/* ── VIBE LEDGER: one-number balance + last entry + reset ── */}
          <div className={`${glass} flex flex-shrink-0 items-center gap-3 px-4 py-3`}>
            <div className="flex-shrink-0">
              <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-stone-400">Vibe Ledger</p>
              <p className={`text-xl font-bold tabular-nums leading-tight ${netME > 0.25 ? "text-emerald-600" : netME < -0.25 ? "text-amber-600" : "text-stone-500"}`}>
                {netME >= 0 ? "+" : ""}{fmt(netME)} mi
              </p>
            </div>
            <p className="min-w-0 flex-1 truncate text-right text-[10px] text-stone-400">
              {lastEntry ?? "Slate is clean — log something."}
            </p>
            <button
              onClick={() => { setNetME(0); setLastEntry(null); }}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-stone-900/10 bg-white/50 text-stone-400 transition-colors hover:text-stone-700"
              aria-label="Reset ledger"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* ── DYNAMIC SCENARIO CARDS (hidden in modes with none) ── */}
          {scenarios.length > 0 && (
            <div className="grid flex-shrink-0 grid-cols-2 gap-2.5">
              {scenarios.map((s) => (
                <div key={s.q} className={`${glass} px-3.5 py-3`}>
                  <p className="text-[10px] font-semibold leading-snug text-stone-500">{s.q}</p>
                  <p className={`mt-1.5 text-[11px] font-bold leading-snug ${s.tone === "good" ? "text-emerald-600" : s.tone === "bad" ? "text-amber-600" : "text-sky-600"}`}>
                    {s.a}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── BOTTOM TAB BAR ── */}
          <nav className="flex flex-shrink-0 rounded-2xl border border-stone-900/10 bg-stone-900/5 p-1">
            {TABS.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 transition-colors ${mode === id ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-600"}`}
              >
                {icon}
                <span className="text-[9px] font-semibold">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* ─────────────── CATEGORIZED VICE PICKER (bottom sheet) ─────────────── */}
        {pickerOpen && (
          <div className="absolute inset-0 z-30">
            <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm" onClick={() => setPickerOpen(false)} />
            <div className="no-scrollbar absolute inset-x-0 bottom-0 max-h-[75%] overflow-y-auto rounded-t-3xl border-t border-stone-900/10 bg-[#FAF8F4]/95 p-5 backdrop-blur-xl">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-900/15" />
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Pick your indulgence</h3>
              <div className="space-y-2">
                {VICE_CATEGORIES.map((cat) => (
                  <div key={cat.id} className="overflow-hidden rounded-xl border border-stone-900/10 bg-white/60">
                    {/* Category row — first level of disclosure */}
                    <button
                      onClick={() => setOpenCat(openCat === cat.id ? "" : cat.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-stone-900/5"
                    >
                      <span className="text-amber-600">{cat.icon}</span>
                      <span className="flex-1 text-left text-sm font-semibold text-stone-800">{cat.label}</span>
                      <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform duration-200 ${openCat === cat.id ? "rotate-180" : ""}`} />
                    </button>
                    {/* Vice rows — second level, shown only for the open category */}
                    {openCat === cat.id && (
                      <div className="border-t border-stone-900/5">
                        {cat.vices.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => selectVice(v.id)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 transition-colors hover:bg-stone-900/5"
                          >
                            <span className="text-stone-400">{v.icon}</span>
                            <span className="flex-1 text-left text-[13px] text-stone-700">{v.label}</span>
                            <span className="text-[10px] text-stone-400">{fmt(v.me)} mi</span>
                            {viceId === v.id && <Check className="h-3.5 w-3.5 text-emerald-600" />}
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
