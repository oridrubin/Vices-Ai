"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Beer,
  Cigarette,
  Leaf,
  Wine,
  Candy,
  Flame,
  CupSoda,
  PartyPopper,
  Footprints,
  Dumbbell,
  Salad,
  Droplets,
  Scale,
  X,
  ChevronDown,
  Sparkles,
  Plus,
  Minus,
  Trash2,
  Zap,
  Moon,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════════════════════

type Mode = "allowance" | "debt" | "tonight";

type HabitId = "run" | "gym" | "salad" | "water";
type ViceId = "beer" | "shot" | "cig" | "joint" | "edible" | "dab" | "drink" | "night";

/** A selectable item (habit or vice) with its mile-equivalent exchange rate. */
interface BarterItem<Id extends string> {
  id: Id;
  label: string;
  /** Short plural used in result cards, e.g. "Beers". */
  plural: string;
  unit: string;
  /** Mile-equivalents per unit — the canonical currency of the engine. */
  me: number;
  min: number;
  max: number;
  step: number;
  def: number;
  icon: React.ReactNode;
}

interface LedgerEntry {
  id: number;
  label: string;
  qty: number;
  unit: string;
  /** Signed mile-equivalents: positive = earned, negative = owed. */
  me: number;
  time: string;
}

/** Live yes/no check for the bottom row — always computed from current balance. */
interface LiveCheck {
  id: ViceId;
  question: string;
  cost: number;
  icon: React.ReactNode;
}

interface CheckResult {
  question: string;
  verdict: string;
  net: number;
}

interface QuickLog {
  label: string;
  entryLabel: string;
  qty: number;
  unit: string;
  me: number;
  icon: React.ReactNode;
}

// ════════════════════════════════════════════════════════════════════════════
//  EXCHANGE-RATE TABLES (canonical currency: run-mile equivalents)
//  Habits: 1 mi run = 1 · gym = 2 · salad = 1.5 · gallon water = 1
//  Vices: beer 1.5 · shot 1 · cigarette 0.5 · joint 2 · edible 1.5 · dab 2.5
//         weed drink 1 · heavy night out 6
// ════════════════════════════════════════════════════════════════════════════

const HABITS: BarterItem<HabitId>[] = [
  { id: "run",   label: "Running",          plural: "Miles",    unit: "miles",    me: 1,   min: 0.5, max: 10, step: 0.5, def: 3, icon: <Footprints className="w-4 h-4" /> },
  { id: "gym",   label: "Gym Workout",      plural: "Workouts", unit: "sessions", me: 2,   min: 1,   max: 4,  step: 1,   def: 1, icon: <Dumbbell className="w-4 h-4" /> },
  { id: "salad", label: "Eating Clean",     plural: "Salads",   unit: "salads",   me: 1.5, min: 1,   max: 6,  step: 1,   def: 2, icon: <Salad className="w-4 h-4" /> },
  { id: "water", label: "Proper Hydration", plural: "Gallons",  unit: "gallons",  me: 1,   min: 0.5, max: 3,  step: 0.5, def: 1, icon: <Droplets className="w-4 h-4" /> },
];

const VICES: BarterItem<ViceId>[] = [
  { id: "beer",   label: "Beer",            plural: "Beers",       unit: "beers",   me: 1.5, min: 1, max: 12, step: 1, def: 2, icon: <Beer className="w-4 h-4" /> },
  { id: "shot",   label: "Shot of Liquor",  plural: "Shots",       unit: "shots",   me: 1,   min: 1, max: 12, step: 1, def: 2, icon: <Wine className="w-4 h-4" /> },
  { id: "cig",    label: "Cigarette",       plural: "Cigarettes",  unit: "cigs",    me: 0.5, min: 1, max: 20, step: 1, def: 4, icon: <Cigarette className="w-4 h-4" /> },
  { id: "joint",  label: "Joint",           plural: "Joints",      unit: "joints",  me: 2,   min: 1, max: 6,  step: 1, def: 1, icon: <Leaf className="w-4 h-4" /> },
  { id: "edible", label: "Edible",          plural: "Edibles",     unit: "edibles", me: 1.5, min: 1, max: 6,  step: 1, def: 1, icon: <Candy className="w-4 h-4" /> },
  { id: "dab",    label: "Dab",             plural: "Dabs",        unit: "dabs",    me: 2.5, min: 1, max: 6,  step: 1, def: 1, icon: <Flame className="w-4 h-4" /> },
  { id: "drink",  label: "Weed Drink",      plural: "Weed Drinks", unit: "drinks",  me: 1,   min: 1, max: 8,  step: 1, def: 1, icon: <CupSoda className="w-4 h-4" /> },
  { id: "night",  label: "Heavy Night Out", plural: "Nights",      unit: "nights",  me: 6,   min: 1, max: 3,  step: 1, def: 1, icon: <PartyPopper className="w-4 h-4" /> },
];

/** Vices selectable in the Tonight planner (single events, not the whole night). */
const TONIGHT_IDS: ViceId[] = ["beer", "shot", "cig", "joint", "edible", "dab", "drink"];

/** One-tap rapid logging. */
const QUICK_LOGS: QuickLog[] = [
  { label: "+1 Mile",  entryLabel: "Running",      qty: 1, unit: "miles",  me: 1,    icon: <Footprints className="w-3.5 h-3.5" /> },
  { label: "+1 Salad", entryLabel: "Eating Clean", qty: 1, unit: "salads", me: 1.5,  icon: <Salad className="w-3.5 h-3.5" /> },
  { label: "+1 Beer",  entryLabel: "Beer",         qty: 1, unit: "beers",  me: -1.5, icon: <Beer className="w-3.5 h-3.5" /> },
  { label: "+1 Smoke", entryLabel: "Cigarette",    qty: 1, unit: "cigs",   me: -0.5, icon: <Cigarette className="w-3.5 h-3.5" /> },
];

/** Bottom-row questions — verdicts are always computed live from the balance. */
const LIVE_CHECKS: LiveCheck[] = [
  { id: "beer",  question: "Can I have a beer right now?",   cost: 1.5, icon: <Beer className="w-4 h-4" /> },
  { id: "shot",  question: "Can I take a shot?",             cost: 1,   icon: <Wine className="w-4 h-4" /> },
  { id: "cig",   question: "Can I smoke a cigarette?",       cost: 0.5, icon: <Cigarette className="w-4 h-4" /> },
  { id: "joint", question: "Can I light a joint?",           cost: 2,   icon: <Leaf className="w-4 h-4" /> },
];

const STORAGE_KEY = "this-is-ai-ledger";

/** Integers stay whole, fractions get one decimal. */
const fmt = (n: number): string =>
  Math.abs(n % 1) < 0.05 ? Math.round(n).toString() : n.toFixed(1);

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
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [check, setCheck] = useState<CheckResult | null>(null);

  // ── Splash screen ───────────────────────────────────────────────────────
  const [booting, setBooting] = useState<boolean>(true);
  const [splashGone, setSplashGone] = useState<boolean>(false);
  useEffect(() => {
    const t1 = setTimeout(() => setBooting(false), 1800);
    const t2 = setTimeout(() => setSplashGone(true), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const isAllowance = mode === "allowance";
  const isDebt = mode === "debt";
  const isTonight = mode === "tonight";

  // ── Ledger persistence (localStorage, hydration-safe) ───────────────────
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLedger(JSON.parse(raw) as LedgerEntry[]);
    } catch { /* corrupted storage — start fresh */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
  }, [ledger, hydrated]);

  // ── Current selection + reactive math ───────────────────────────────────
  const habit = HABITS.find((h) => h.id === habitId) as BarterItem<HabitId>;
  const vice = VICES.find((v) => v.id === viceId) as BarterItem<ViceId>;

  const item = isAllowance ? habit : vice;
  const qty = isAllowance ? habitQty : viceQty;
  const setQty = isAllowance ? setHabitQty : setViceQty;

  const totalME = useMemo(() => qty * item.me, [qty, item]);

  /** Allowance mode: what the current selection buys, across the vice catalog. */
  const allowanceGrid = useMemo(
    () =>
      VICES.filter((v) => v.id !== "night").slice(0, 6).map((v) => ({
        label: v.plural,
        icon: v.icon,
        value: totalME / v.me,
      })),
    [totalME]
  );

  /** Debt mode: real-world payback options ("pick one"). */
  const paybackGrid = useMemo(
    () => [
      { label: "Mile Run",     icon: <Footprints className="w-4 h-4" />, value: totalME / 1 },
      { label: "Clean Salads", icon: <Salad className="w-4 h-4" />,      value: totalME / 1.5 },
      { label: "Gym Workouts", icon: <Dumbbell className="w-4 h-4" />,   value: totalME / 2 },
    ],
    [totalME]
  );

  /** Net ledger balance, signed mile-equivalents. */
  const netME = useMemo(() => ledger.reduce((sum, e) => sum + e.me, 0), [ledger]);
  const inGreen = netME >= 0;

  /** Tonight planner: split today's earned balance across the selected vices. */
  const tonightBudget = Math.max(netME, 0);
  const tonightGrid = useMemo(() => {
    if (tonightPicks.length === 0) return [];
    const share = tonightBudget / tonightPicks.length;
    return tonightPicks.map((id) => {
      const v = VICES.find((x) => x.id === id) as BarterItem<ViceId>;
      return { label: v.plural, icon: v.icon, value: share / v.me };
    });
  }, [tonightPicks, tonightBudget]);

  const status = netME > 0.25 ? "In the Green" : netME < -0.25 ? "In the Red" : "In Equilibrium";
  const statusDot = netME > 0.25 ? "bg-emerald-500" : netME < -0.25 ? "bg-rose-500" : "bg-zinc-400";

  /** Smart suggestion under the gauge. */
  const suggestion = useMemo(() => {
    if (netME < -0.05) {
      const owe = -netME;
      return `Fastest path to even: ${fmt(owe)} mi run · ${fmt(owe / 1.5)} salads · ${fmt(owe / 2)} workouts`;
    }
    if (netME > 0.05) {
      return `You're covered for ${fmt(netME / 1.5)} beers · ${fmt(netME / 1)} shots · ${fmt(netME / 0.5)} cigarettes`;
    }
    return "Perfect equilibrium. Every sin accounted for.";
  }, [netME]);

  // ── Gauge geometry ──────────────────────────────────────────────────────
  const RADIUS = 64;
  const CIRC = 2 * Math.PI * RADIUS;
  const gaugeRatio = Math.min(Math.abs(netME) / 10, 1);
  const gaugeOffset = CIRC * (1 - gaugeRatio);

  // ── Actions ─────────────────────────────────────────────────────────────
  const pushEntry = (label: string, q: number, unit: string, me: number): void => {
    const entry: LedgerEntry = {
      id: Date.now() + Math.random(),
      label,
      qty: q,
      unit,
      me,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setLedger((prev) => [entry, ...prev]);
  };

  const logToLedger = (): void =>
    pushEntry(item.label, qty, item.unit, isAllowance ? totalME : -totalME);

  const quickLog = (q: QuickLog): void => pushEntry(q.entryLabel, q.qty, q.unit, q.me);
  const deleteEntry = (id: number): void => setLedger((prev) => prev.filter((e) => e.id !== id));
  const clearLedger = (): void => setLedger([]);

  const togglePick = (id: ViceId): void =>
    setTonightPicks((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );

  const selectItem = (value: string): void => {
    if (isAllowance) {
      const next = HABITS.find((h) => h.id === value);
      if (next) { setHabitId(next.id); setHabitQty(next.def); }
    } else {
      const next = VICES.find((v) => v.id === value);
      if (next) { setViceId(next.id); setViceQty(next.def); }
    }
  };

  const stepQty = (dir: 1 | -1): void => {
    const next = Math.min(item.max, Math.max(item.min, qty + dir * item.step));
    setQty(Number(next.toFixed(1)));
  };

  /** Live bottom-row check → verdict from the actual current balance. */
  const runCheck = (c: LiveCheck): void => {
    const after = netME - c.cost;
    const verdict =
      after >= -0.001
        ? after < 0.05
          ? "Yes — and it puts you exactly at even. Enjoy."
          : `Yes — go for it. You'll still be ${fmt(after)} mi ahead.`
        : `Not yet — you're ${fmt(-after)} mi short. Run ${fmt(-after)} mi or eat ${fmt(-after / 1.5)} salads first.`;
    setCheck({ question: c.question, verdict, net: after });
  };

  // ── Mode-dependent accents (light theme) ────────────────────────────────
  const accent = isAllowance
    ? {
        text: "text-emerald-700",
        chip: "text-emerald-600",
        btn: "bg-emerald-600 hover:bg-emerald-500 shadow-[0_4px_16px_rgba(5,150,105,0.25)]",
        thumb: "[&::-webkit-slider-thumb]:bg-emerald-600",
        panelBorder: "border-emerald-600/15",
        seg: "bg-emerald-600 shadow-[0_2px_10px_rgba(5,150,105,0.35)]",
      }
    : isDebt
      ? {
          text: "text-rose-600",
          chip: "text-rose-500",
          btn: "bg-rose-500 hover:bg-rose-400 shadow-[0_4px_16px_rgba(244,63,94,0.25)]",
          thumb: "[&::-webkit-slider-thumb]:bg-rose-500",
          panelBorder: "border-rose-500/15",
          seg: "bg-rose-500 shadow-[0_2px_10px_rgba(244,63,94,0.35)]",
        }
      : {
          text: "text-indigo-600",
          chip: "text-indigo-500",
          btn: "bg-indigo-500 hover:bg-indigo-400 shadow-[0_4px_16px_rgba(99,102,241,0.25)]",
          thumb: "[&::-webkit-slider-thumb]:bg-indigo-500",
          panelBorder: "border-indigo-500/15",
          seg: "bg-indigo-500 shadow-[0_2px_10px_rgba(99,102,241,0.35)]",
        };

  const segIndex = isAllowance ? 0 : isDebt ? 1 : 2;

  const card =
    "rounded-2xl bg-white/80 backdrop-blur-sm border border-[#E7E2D9] shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.04)]";

  // ══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="relative min-h-screen lg:h-screen lg:overflow-hidden w-full bg-[#F7F4EF] text-[#1A1A1A] antialiased">
      <style>{`@keyframes loadbar { 0% { width: 0% } 100% { width: 100% } }`}</style>

      {/* ── Soft ambient backdrop + dot-grid texture ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 w-[560px] h-[560px] rounded-full bg-emerald-200/35 blur-[130px]" />
        <div className="absolute bottom-[-200px] right-[-120px] w-[560px] h-[560px] rounded-full bg-sky-200/35 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-amber-100/40 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-50"
          style={{ backgroundImage: "radial-gradient(#DAD4C8 1px, transparent 1px)", backgroundSize: "26px 26px" }}
        />
      </div>

      {/* ─────────────── SPLASH / LOADING SCREEN ─────────────── */}
      {!splashGone && (
        <div
          className={`fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#F7F4EF] transition-opacity duration-700 ${
            booting ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -left-32 w-[560px] h-[560px] rounded-full bg-emerald-200/40 blur-[130px]" />
            <div className="absolute bottom-[-200px] right-[-120px] w-[560px] h-[560px] rounded-full bg-sky-200/40 blur-[140px]" />
          </div>
          <div className="relative flex flex-col items-center">
            <div className="w-20 h-20 rounded-3xl bg-[#1A1A1A] flex items-center justify-center shadow-xl mb-6">
              <Scale className="w-10 h-10 text-[#F7F4EF]" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              Vices<span className="text-emerald-600">.ai</span>
            </h1>
            <p className="text-lg text-zinc-500 mt-2">Earn your vices the easy way.</p>
            <div className="mt-8 w-44 h-1 rounded-full bg-[#E7E2D9] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                style={{ animation: "loadbar 1.6s ease-out forwards" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── App shell ── */}
      <div className="relative z-10 flex flex-col min-h-screen lg:h-full w-full px-5 lg:px-10 py-5 gap-4">

        {/* ─────────────── HEADER ─────────────── */}
        <header className="flex flex-wrap items-center justify-between flex-shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#1A1A1A] flex items-center justify-center shadow-md">
              <Scale className="w-5.5 h-5.5 text-[#F7F4EF]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight leading-none">
                Vices<span className="text-emerald-600">.ai</span>
              </h1>
              <p className="text-xs text-zinc-400 tracking-[0.14em] uppercase mt-1">Earn your vices the easy way</p>
            </div>
          </div>

          <div className={`hidden md:flex items-center gap-2 ${card} px-4 py-2`}>
            <span className={`w-2 h-2 rounded-full ${statusDot}`} />
            <span className="text-[15px] font-medium text-zinc-700">{status}</span>
          </div>

          {/* Sliding 3-way segmented toggle */}
          <div className={`relative flex ${card} p-1 w-full sm:w-[360px] select-none`}>
            <div
              className={`absolute top-1 bottom-1 rounded-xl transition-all duration-300 ease-out ${accent.seg}`}
              style={{ width: "calc(33.333% - 5px)", left: `calc(${segIndex} * 33.333% + 4px)` }}
            />
            {([["allowance", "Allowance"], ["debt", "Debt"], ["tonight", "Tonight"]] as [Mode, string][]).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`relative z-10 flex-1 py-2.5 text-[15px] font-semibold transition-colors duration-300 ${
                  mode === m ? "text-white" : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {/* ─────────────── MAIN SPLIT-PANEL ─────────────── */}
        <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5">

          {/* ── LEFT: interactive controls ── */}
          <section className={`lg:col-span-4 ${card} ${accent.panelBorder} p-6 flex flex-col gap-4 justify-between`}>
            <div>
              <h2 className={`text-xl font-bold ${accent.text}`}>
                {isAllowance ? "Earned Allowance" : isDebt ? "Debt Recovery" : "Tonight's Plan"}
              </h2>
              <p className="text-[15px] text-zinc-500 mt-1">
                {isAllowance
                  ? "Log the good work — see what it buys."
                  : isDebt
                    ? "Confess it — see what it costs."
                    : "Pick your poisons — split today's earnings."}
              </p>
            </div>

            {isTonight ? (
              <>
                {/* Tonight: multi-select vice chips */}
                <div>
                  <label className="block text-xs uppercase tracking-[0.15em] text-zinc-400 font-semibold mb-2">
                    What are we having tonight?
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {TONIGHT_IDS.map((id) => {
                      const v = VICES.find((x) => x.id === id) as BarterItem<ViceId>;
                      const active = tonightPicks.includes(id);
                      return (
                        <button
                          key={id}
                          onClick={() => togglePick(id)}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-95 ${
                            active
                              ? "bg-indigo-500 border-indigo-500 text-white shadow-[0_2px_10px_rgba(99,102,241,0.3)]"
                              : "bg-white border-[#E0DBD0] text-zinc-600 hover:bg-zinc-50"
                          }`}
                        >
                          {v.icon} {v.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tonight budget readout */}
                <div className="rounded-xl bg-[#FBF9F5] border border-[#EAE5DB] px-4 py-3 flex items-center gap-2.5">
                  <Moon className="w-4 h-4 flex-shrink-0 text-indigo-500" />
                  <p className="text-[15px] text-zinc-600 leading-snug">
                    Tonight&apos;s budget: <span className="font-bold text-indigo-600">{fmt(tonightBudget)} run-miles</span> — earned from today&apos;s logged exercise.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Item dropdown */}
                <div>
                  <label className="block text-xs uppercase tracking-[0.15em] text-zinc-400 font-semibold mb-2">
                    {isAllowance ? "Healthy Habit" : "Indulgence"}
                  </label>
                  <div className="relative">
                    <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${accent.chip}`}>{item.icon}</span>
                    <select
                      value={item.id}
                      onChange={(e) => selectItem(e.target.value)}
                      className="w-full appearance-none rounded-xl bg-white border border-[#E0DBD0] pl-10 pr-10 py-3.5 text-base font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-300 cursor-pointer"
                    >
                      {(isAllowance ? HABITS : VICES).map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* Quantity: slider + precision steppers */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs uppercase tracking-[0.15em] text-zinc-400 font-semibold">Quantity</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => stepQty(-1)}
                        className="w-7 h-7 rounded-md bg-white border border-[#E0DBD0] flex items-center justify-center text-zinc-500 hover:bg-zinc-50 active:scale-95 transition"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className={`text-lg font-bold tabular-nums min-w-[88px] text-center ${accent.text}`}>
                        {fmt(qty)} {item.unit}
                      </span>
                      <button
                        onClick={() => stepQty(1)}
                        className="w-7 h-7 rounded-md bg-white border border-[#E0DBD0] flex items-center justify-center text-zinc-500 hover:bg-zinc-50 active:scale-95 transition"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={item.min}
                    max={item.max}
                    step={item.step}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className={`w-full h-2 rounded-full appearance-none bg-[#E7E2D9] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md ${accent.thumb}`}
                  />
                  <div className="flex justify-between mt-1.5 text-xs text-zinc-400">
                    <span>{item.min}</span>
                    <span>{item.max}</span>
                  </div>
                </div>

                {/* Live readout */}
                <div className="rounded-xl bg-[#FBF9F5] border border-[#EAE5DB] px-4 py-3 flex items-center gap-2.5">
                  <Sparkles className={`w-4 h-4 flex-shrink-0 ${accent.chip}`} />
                  <p className="text-[15px] text-zinc-600 leading-snug">
                    {isAllowance
                      ? <>Banking <span className={`font-bold ${accent.text}`}>{fmt(qty)} {item.unit}</span> into your balance.</>
                      : <>Costs <span className={`font-bold ${accent.text}`}>{fmt(totalME)} run-miles</span> of payback.</>}
                  </p>
                </div>

                {/* Log button */}
                <button
                  onClick={logToLedger}
                  className={`w-full rounded-xl py-3.5 text-base font-bold text-white transition-all duration-200 active:scale-[0.98] ${accent.btn}`}
                >
                  Log to Ledger
                </button>
              </>
            )}

            {/* Quick-log chips — always available */}
            <div className="pt-1 border-t border-[#EFEAE1]">
              <p className="text-xs uppercase tracking-[0.15em] text-zinc-400 font-semibold mb-2 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> Quick Log
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {QUICK_LOGS.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => quickLog(q)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-95 ${
                      q.me >= 0
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                        : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                    }`}
                  >
                    {q.icon} {q.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── RIGHT: balance gauge + conversion metrics ── */}
          <section className={`lg:col-span-8 ${card} p-6 lg:p-8 flex flex-col sm:flex-row items-center justify-evenly gap-6 lg:gap-10 min-h-0`}>

            {/* Ring gauge */}
            <div className="flex flex-col items-center gap-4 flex-shrink-0">
              <div className="relative w-56 h-56 xl:w-64 xl:h-64">
                <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
                  <defs>
                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={inGreen ? "#059669" : "#f43f5e"} />
                      <stop offset="100%" stopColor={inGreen ? "#14b8a6" : "#f59e0b"} />
                    </linearGradient>
                  </defs>
                  <circle cx="90" cy="90" r="78" fill="none" stroke="#EFEAE1" strokeWidth="2" />
                  <circle cx="90" cy="90" r={RADIUS} fill="none" stroke="#EAE5DB" strokeWidth="11" />
                  <circle
                    cx="90" cy="90" r={RADIUS} fill="none"
                    stroke="url(#ringGrad)" strokeWidth="11" strokeLinecap="round"
                    strokeDasharray={CIRC} strokeDashoffset={gaugeOffset}
                    style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5">
                  <span className={`text-5xl font-bold tabular-nums leading-none ${inGreen ? "text-emerald-600" : "text-rose-500"}`}>
                    {inGreen ? `+${fmt(netME)}` : fmt(Math.abs(netME))}
                  </span>
                  <span className="text-xs uppercase tracking-[0.12em] text-zinc-400 mt-2 font-semibold">
                    {inGreen ? "Miles Banked" : "Miles Owed"}
                  </span>
                </div>
              </div>
              <p className="text-sm text-zinc-500 text-center max-w-[260px] leading-relaxed">{suggestion}</p>
            </div>

            {/* Conversion metrics */}
            <div className="flex-1 w-full min-w-0 max-w-2xl">
              <h3 className={`text-lg font-bold mb-4 ${accent.text}`}>
                {isAllowance
                  ? "This lets you have"
                  : isDebt
                    ? "Penance & Payback — pick one"
                    : "Tonight you can have"}
              </h3>

              {isAllowance && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                  {allowanceGrid.map((g) => (
                    <div key={g.label} className="rounded-xl bg-[#FBF9F5] border border-[#EAE5DB] px-4 py-4 flex items-center gap-3">
                      <span className="text-emerald-600 [&>svg]:w-5 [&>svg]:h-5">{g.icon}</span>
                      <div className="min-w-0">
                        <p className="text-2xl font-bold tabular-nums text-zinc-800 leading-none">{fmt(g.value)}</p>
                        <p className="text-xs text-zinc-400 uppercase tracking-wide mt-1.5 font-medium truncate">{g.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isDebt && (
                <div className="space-y-3">
                  {paybackGrid.map((g, i) => (
                    <div key={g.label} className="rounded-xl bg-[#FBF9F5] border border-rose-200/60 px-5 py-4 flex items-center gap-4">
                      <span className="text-rose-500 [&>svg]:w-5 [&>svg]:h-5">{g.icon}</span>
                      <p className="text-2xl font-bold tabular-nums text-zinc-800 leading-none">
                        {fmt(g.value)}
                        <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wide ml-2">{g.label}</span>
                      </p>
                      {i < 2 && <span className="ml-auto text-[11px] uppercase tracking-widest text-zinc-300 font-bold">or</span>}
                    </div>
                  ))}
                  {viceId === "night" && (
                    <p className="text-sm text-zinc-400 flex items-center gap-1.5 pl-1">
                      <Droplets className="w-4 h-4" /> Salad route also requires 1 gallon of water per night.
                    </p>
                  )}
                </div>
              )}

              {isTonight && (
                tonightPicks.length === 0 ? (
                  <p className="text-[15px] text-zinc-400 italic">Select at least one vice on the left to build tonight&apos;s plan.</p>
                ) : tonightBudget <= 0 ? (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 px-5 py-4">
                    <p className="text-[15px] font-semibold text-rose-600 mb-1">You haven&apos;t earned tonight yet.</p>
                    <p className="text-sm text-zinc-500">
                      {netME < 0
                        ? `You're ${fmt(-netME)} mi in the red. Clear the debt first, then earn your budget.`
                        : "Log a run, workout, or clean meal in Allowance mode to build tonight's budget."}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                      {tonightGrid.map((g) => (
                        <div key={g.label} className="rounded-xl bg-[#FBF9F5] border border-indigo-200/60 px-4 py-4 flex items-center gap-3">
                          <span className="text-indigo-500 [&>svg]:w-5 [&>svg]:h-5">{g.icon}</span>
                          <div className="min-w-0">
                            <p className="text-2xl font-bold tabular-nums text-zinc-800 leading-none">{fmt(g.value)}</p>
                            <p className="text-xs text-zinc-400 uppercase tracking-wide mt-1.5 font-medium truncate">{g.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-zinc-400 mt-3">
                      Even split of <span className="font-semibold text-indigo-600">+{fmt(tonightBudget)} mi</span> across {tonightPicks.length} pick{tonightPicks.length > 1 ? "s" : ""} — mix &amp; match as long as the total stays inside the budget.
                    </p>
                  </>
                )
              )}
            </div>
          </section>
        </main>

        {/* ─────────────── BOTTOM: live checks + ledger ─────────────── */}
        <footer className="flex-shrink-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5">

          {/* Live check matrix — verdicts always reflect the current balance */}
          <div className="lg:col-span-7 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {LIVE_CHECKS.map((c) => {
              const yes = netME - c.cost >= -0.001;
              return (
                <button
                  key={c.id}
                  onClick={() => runCheck(c)}
                  className={`${card} px-4 py-3.5 text-left hover:bg-white transition-colors duration-150 group`}
                >
                  <p className="text-sm font-semibold text-zinc-700 leading-snug group-hover:text-zinc-900 flex items-center gap-1.5">
                    <span className={yes ? "text-emerald-600" : "text-rose-500"}>{c.icon}</span>
                    {c.question}
                  </p>
                  <p className={`text-[11px] mt-1.5 uppercase tracking-wide font-bold ${yes ? "text-emerald-600" : "text-rose-500"}`}>
                    {yes ? "Yes" : "Not yet"} · costs {fmt(c.cost)} mi
                  </p>
                </button>
              );
            })}
          </div>

          {/* Compact Ledger with delete + clear */}
          <div className={`lg:col-span-5 ${card} px-4 py-3`}>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-xs uppercase tracking-[0.15em] text-zinc-400 font-semibold">Recent Ledger</h3>
              {ledger.length > 0 && (
                <button
                  onClick={clearLedger}
                  className="text-xs text-zinc-400 hover:text-rose-500 font-medium transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear all
                </button>
              )}
            </div>
            {ledger.length === 0 ? (
              <p className="text-sm text-zinc-400 italic">Nothing logged yet — your slate is clean.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {ledger.slice(0, 4).map((e) => (
                    <tr key={e.id} className="text-zinc-600 group">
                      <td className="py-0.5 pr-2 text-zinc-400 tabular-nums whitespace-nowrap">{e.time}</td>
                      <td className="py-0.5 pr-2 font-medium text-zinc-700">{e.label}</td>
                      <td className="py-0.5 pr-2 tabular-nums whitespace-nowrap">{fmt(e.qty)} {e.unit}</td>
                      <td className={`py-0.5 text-right font-bold tabular-nums whitespace-nowrap ${e.me >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                        {e.me >= 0 ? "+" : ""}{fmt(e.me)} mi
                      </td>
                      <td className="py-0.5 pl-2 w-5">
                        <button
                          onClick={() => deleteEntry(e.id)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-rose-500 transition-all"
                          aria-label={`Delete ${e.label} entry`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {ledger.length > 4 && (
              <p className="text-[11px] text-zinc-400 mt-1">+ {ledger.length - 4} earlier entries counted in balance</p>
            )}
          </div>
        </footer>
      </div>

      {/* ─────────────── LIVE CHECK VERDICT MODAL ─────────────── */}
      {check && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/30 backdrop-blur-sm" onClick={() => setCheck(null)} />
          <div className={`relative w-full max-w-md ${card} p-7 text-center`}>
            <button
              onClick={() => setCheck(null)}
              className="absolute top-3.5 right-3.5 text-zinc-300 hover:text-zinc-600 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
              check.net >= -0.001
                ? "bg-emerald-50 border border-emerald-200"
                : "bg-rose-50 border border-rose-200"
            }`}>
              <Scale className={`w-6 h-6 ${check.net >= -0.001 ? "text-emerald-600" : "text-rose-500"}`} />
            </div>
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-400 font-semibold mb-2">{check.question}</p>
            <h4 className="text-xl font-bold text-zinc-800 leading-snug mb-3">{check.verdict}</h4>
            <span className={`inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
              check.net >= -0.001
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-600 border border-rose-200"
            }`}>
              Balance after: {check.net >= 0 ? "+" : ""}{fmt(check.net)} miles
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
