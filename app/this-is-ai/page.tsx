"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Apple,
  Beef,
  Beer,
  Bike,
  Candy,
  ChevronDown,
  ChevronRight,
  Check,
  Cigarette,
  Crown,
  CupSoda,
  Droplets,
  Dumbbell,
  EyeOff,
  Flame,
  Footprints,
  Gift,
  History,
  Hourglass,
  Leaf,
  Martini,
  MessageCircle,
  PersonStanding,
  Receipt,
  Salad,
  Scale,
  ShoppingBag,
  Skull,
  Smartphone,
  Snowflake,
  Sparkles,
  Star,
  ThermometerSun,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Utensils,
  Wallet,
  Wine,
  Zap,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════════════════════

type Mode = "home" | "allowance" | "store" | "friends";

type HabitCatId = "workout" | "meal" | "water" | "wellness";
type HabitId =
  | "run" | "lift" | "hiit" | "cardio" | "sport" | "yoga"
  | "salad" | "balanced" | "protein" | "cleanswap"
  | "water" | "sauna" | "cold";
type ViceId =
  | "beer" | "wine" | "shot" | "drink"
  | "cig" | "joint" | "edible" | "dab"
  | "porn" | "scroll"
  | "crawl" | "night" | "rave" | "bender";

/** A selectable item (habit or vice) with its mile-equivalent exchange rate. */
interface BarterItem<Id extends string> {
  id: Id;
  label: string;
  /** Short chip label (habits only). */
  short?: string;
  plural: string;
  /** Unit label for the slider readout, e.g. "miles", "beers". */
  unit: string;
  /** Singular unit, e.g. "mile", "beer" — used when the count is exactly 1. */
  unitOne: string;
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

/** Habits are grouped too: a top-row chip opens a sub-picker of its options.
 *  Single-option categories (water, cold) skip the sub-row and go straight to
 *  the slider. */
interface HabitCategory {
  id: HabitCatId;
  label: string;
  short: string;
  icon: React.ReactNode;
  options: BarterItem<HabitId>[];
}

// ════════════════════════════════════════════════════════════════════════════
//  EXCHANGE-RATE TABLES (canonical currency: POINTS — harder effort earns more,
//  bigger indulgences cost more. Same currency the leaderboard ranks on.)
//
//  Earn (habits) — Workout: run 10/mi · lift 20 · hiit 20 · cardio 15 · sport 15 · yoga 10
//           Meal (modest — eating well is table stakes): salad/home/clean 5 · protein 8
//           Water 1/glass (easy, so cheap) · Cold plunge 5 each
//  Spend (vices): beer 10 · shot 10 · weed drink 15 · cigarette 15 · joint 30
//           edible 25 · dab 30 · porn 30 · scroll 10 · big nights 50–90
//
//  Anchors the user set:
//  · 1 Beer            = 10 pts
//  · Run 3 mi (30 pts) = 3 beers · 2 cigs · 1 joint   (single-vice maxes)
//  · 2 lift sessions   = one 4 mi run                 (both 40 pts)
//  · 6 glasses water   = 6 pts                          (deliberately small)
// ════════════════════════════════════════════════════════════════════════════

const HABIT_CATS: HabitCategory[] = [
  {
    id: "workout",
    label: "Workout",
    short: "Workout",
    icon: <Dumbbell className="w-4 h-4" />,
    options: [
      { id: "run",    label: "Run",             plural: "Miles",    unit: "miles",    unitOne: "mile",    me: 10, min: 0.5, max: 10, step: 0.5, def: 3, icon: <Footprints className="w-4 h-4" /> },
      { id: "lift",   label: "Lifting",         plural: "Sessions", unit: "sessions", unitOne: "session", me: 20, min: 1,   max: 3,  step: 1,   def: 1, icon: <Dumbbell className="w-4 h-4" /> },
      { id: "hiit",   label: "HIIT",            plural: "Sessions", unit: "sessions", unitOne: "session", me: 20, min: 1,   max: 3,  step: 1,   def: 1, icon: <Zap className="w-4 h-4" /> },
      { id: "cardio", label: "Cardio",          plural: "Sessions", unit: "sessions", unitOne: "session", me: 15, min: 1,   max: 3,  step: 1,   def: 1, icon: <Bike className="w-4 h-4" /> },
      { id: "sport",  label: "Team Sport",      plural: "Matches",  unit: "matches",  unitOne: "match",   me: 15, min: 1,   max: 3,  step: 1,   def: 1, icon: <Trophy className="w-4 h-4" /> },
      { id: "yoga",   label: "Yoga / Mobility", plural: "Sessions", unit: "sessions", unitOne: "session", me: 10, min: 1,   max: 3,  step: 1,   def: 1, icon: <PersonStanding className="w-4 h-4" /> },
    ],
  },
  {
    id: "meal",
    label: "Meal",
    short: "Meal",
    icon: <Salad className="w-4 h-4" />,
    options: [
      { id: "salad",     label: "Salad / Greens", plural: "Meals", unit: "meals", unitOne: "meal", me: 5, min: 1, max: 6, step: 1, def: 1, icon: <Salad className="w-4 h-4" /> },
      { id: "balanced",  label: "Home-cooked",    plural: "Meals", unit: "meals", unitOne: "meal", me: 5, min: 1, max: 6, step: 1, def: 1, icon: <Utensils className="w-4 h-4" /> },
      { id: "protein",   label: "High-protein",   plural: "Meals", unit: "meals", unitOne: "meal", me: 8, min: 1, max: 6, step: 1, def: 1, icon: <Beef className="w-4 h-4" /> },
      { id: "cleanswap", label: "Clean Swap",     plural: "Meals", unit: "meals", unitOne: "meal", me: 5, min: 1, max: 6, step: 1, def: 1, icon: <Apple className="w-4 h-4" /> },
    ],
  },
  {
    id: "water",
    label: "Hydration",
    short: "Water",
    icon: <Droplets className="w-4 h-4" />,
    options: [
      { id: "water", label: "Hydration", plural: "Glasses", unit: "glasses", unitOne: "glass", me: 1, min: 1, max: 12, step: 1, def: 6, icon: <Droplets className="w-4 h-4" /> },
    ],
  },
  {
    id: "wellness",
    label: "Wellness",
    short: "Wellness",
    icon: <ThermometerSun className="w-4 h-4" />,
    options: [
      { id: "sauna", label: "Sauna",       plural: "Sessions", unit: "sessions", unitOne: "session", me: 5, min: 1, max: 4, step: 1, def: 1, icon: <ThermometerSun className="w-4 h-4" /> },
      { id: "cold",  label: "Cold Plunge", plural: "Plunges",  unit: "plunges",  unitOne: "plunge",  me: 5, min: 1, max: 4, step: 1, def: 1, icon: <Snowflake className="w-4 h-4" /> },
    ],
  },
];

/** Flattened habit options for direct id lookup. */
const ALL_HABITS: BarterItem<HabitId>[] = HABIT_CATS.flatMap((c) => c.options);

/** Which category a given habit option belongs to. */
const catOf = (id: HabitId): HabitCatId =>
  HABIT_CATS.find((c) => c.options.some((o) => o.id === id))?.id ?? "workout";

const VICE_CATEGORIES: ViceCategory[] = [
  {
    id: "drinks",
    label: "Drinks & Liquor",
    icon: <Beer className="w-4 h-4" />,
    vices: [
      { id: "beer",  label: "Beer",           plural: "Beers",       unit: "beers",  unitOne: "beer",  me: 10, min: 1, max: 12, step: 1, def: 2, icon: <Beer className="w-4 h-4" /> },
      { id: "wine",  label: "Glass of Wine",  plural: "Glasses",     unit: "glasses", unitOne: "glass", me: 10, min: 1, max: 8, step: 1, def: 2, icon: <Wine className="w-4 h-4" /> },
      { id: "shot",  label: "Shot of Liquor", plural: "Shots",       unit: "shots",  unitOne: "shot",  me: 10, min: 1, max: 10, step: 1, def: 2, icon: <Martini className="w-4 h-4" /> },
      { id: "drink", label: "Weed Drink",     plural: "Weed Drinks", unit: "drinks", unitOne: "drink", me: 15, min: 1, max: 8,  step: 1, def: 1, icon: <CupSoda className="w-4 h-4" /> },
    ],
  },
  {
    id: "smoke",
    label: "Smoke & Herb",
    icon: <Leaf className="w-4 h-4" />,
    vices: [
      { id: "cig",    label: "Cigarette", plural: "Cigarettes", unit: "cigarettes", unitOne: "cigarette", me: 15, min: 1, max: 10, step: 1, def: 2, icon: <Cigarette className="w-4 h-4" /> },
      { id: "joint",  label: "Joint",     plural: "Joints",     unit: "joints",     unitOne: "joint",     me: 30, min: 1, max: 6,  step: 1, def: 1, icon: <Leaf className="w-4 h-4" /> },
      { id: "edible", label: "Edible",    plural: "Edibles",    unit: "edibles",    unitOne: "edible",    me: 25, min: 1, max: 8,  step: 1, def: 1, icon: <Candy className="w-4 h-4" /> },
      { id: "dab",    label: "Dab",       plural: "Dabs",       unit: "dabs",       unitOne: "dab",       me: 30, min: 1, max: 6,  step: 1, def: 1, icon: <Flame className="w-4 h-4" /> },
    ],
  },
  {
    id: "digital",
    label: "Digital Dopamine",
    icon: <Smartphone className="w-4 h-4" />,
    vices: [
      { id: "porn",   label: "Porn Session",            plural: "Porn Sessions",   unit: "sessions", unitOne: "session", me: 30, min: 1, max: 6, step: 1, def: 1, icon: <EyeOff className="w-4 h-4" /> },
      { id: "scroll", label: "Scroll Session (30 min)", plural: "Scroll Sessions", unit: "sessions", unitOne: "session", me: 10, min: 1, max: 8, step: 1, def: 1, icon: <Smartphone className="w-4 h-4" /> },
    ],
  },
  {
    id: "nights",
    label: "Big Nights",
    icon: <Martini className="w-4 h-4" />,
    vices: [
      { id: "crawl",  label: "Bar Crawl",       plural: "Bar Crawls",   unit: "crawls",  unitOne: "crawl",  me: 50, min: 1, max: 3, step: 1, def: 1, icon: <Beer className="w-4 h-4" /> },
      { id: "night",  label: "Heavy Night Out", plural: "Heavy Nights", unit: "nights",  unitOne: "night",  me: 60, min: 1, max: 3, step: 1, def: 1, icon: <Martini className="w-4 h-4" /> },
      { id: "rave",   label: "Rave / Festival", plural: "Raves",        unit: "raves",   unitOne: "rave",   me: 70, min: 1, max: 3, step: 1, def: 1, icon: <Sparkles className="w-4 h-4" /> },
      { id: "bender", label: "Full Bender",     plural: "Benders",      unit: "benders", unitOne: "bender", me: 90, min: 1, max: 2, step: 1, def: 1, icon: <Flame className="w-4 h-4" /> },
    ],
  },
];

const ALL_VICES: BarterItem<ViceId>[] = VICE_CATEGORIES.flatMap((c) => c.vices);

/** Format a number cleanly: integers stay whole, fractions get one decimal. */
const fmt = (n: number): string =>
  Math.abs(n % 1) < 0.05 ? Math.round(n).toString() : n.toFixed(1);

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Single source of truth for scenario math — never hardcode a rate twice. */
const viceME = (id: ViceId): number => ALL_VICES.find((v) => v.id === id)?.me ?? 1;
const habitME = (id: HabitId): number => ALL_HABITS.find((h) => h.id === id)?.me ?? 1;
const viceBy = (id: ViceId): BarterItem<ViceId> => ALL_VICES.find((v) => v.id === id) as BarterItem<ViceId>;

/** How many WHOLE units a point budget buys — always rounded down, never up.
 *  You only get what you've fully banked: 15 pts = 1 beer, not 1.5. */
const buys = (points: number, rate: number): number => Math.max(0, Math.floor(points / rate));

/** "1 beer" vs "2 beers" — picks the singular noun only at exactly one. */
const plur = (n: number, one: string, many: string): string =>
  `${fmt(n)} ${Math.abs(n) === 1 ? one : many}`;

/** A realistic mixed spend for a budget: lean on beers, top up with cigs.
 *  Answers "or you could mix it: a beer and a couple cigs." */
const comboFor = (budget: number): string => {
  const beerR = viceME("beer");
  const cigR = viceME("cig");
  const beers = Math.floor((budget * 0.6) / beerR);
  const rest = budget - beers * beerR;
  const cigs = Math.floor(rest / cigR);
  const parts: string[] = [];
  if (beers > 0) parts.push(plur(beers, "beer", "beers"));
  if (cigs > 0) parts.push(plur(cigs, "cig", "cigs"));
  if (parts.length > 0) return parts.join(" + ");
  if (budget >= beerR) return plur(1, "beer", "beers");
  if (budget >= cigR) return plur(1, "cig", "cigs");
  return "nothing yet — keep earning";
};

/** ISO date of this week's Monday. The ledger lives one week, then resets. */
const weekOf = (): string => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

// ════════════════════════════════════════════════════════════════════════════
//  THE TAB (borrow against future effort)
//  Spend more than you've banked and you go on the tab: a 36-hour window to earn
//  it back, plus interest that starts at 10% and climbs once you blow the clock.
// ════════════════════════════════════════════════════════════════════════════

const LOAN_WINDOW_MS = 36 * 3600 * 1000;

/** Interest rate on the tab: 10% flat, then +5%/hr once overdue (caps at 50%). */
const loanRate = (dueAt: number, now: number): number => {
  const lateHrs = Math.max(0, (now - dueAt) / 3600000);
  return Math.min(0.5, 0.1 + 0.05 * lateHrs);
};

/** Interest owed on a principal, rounded up to a whole point. */
const loanInterest = (principal: number, dueAt: number, now: number): number =>
  Math.ceil(principal * loanRate(dueAt, now));

/** "12h 30m 05s" — the live countdown on the tab banner. Always shows seconds so
 *  you can watch the clock actually move. */
const fmtCountdown = (dueAt: number, now: number): string => {
  const ms = Math.abs(dueAt - now);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}h ${pad(m)}m ${pad(s)}s` : `${m}m ${pad(s)}s`;
};

// ════════════════════════════════════════════════════════════════════════════
//  WEEKLY VERDICT (every Monday, a recap of the week that just ended)
// ════════════════════════════════════════════════════════════════════════════

type VerdictId = "quiet" | "dork" | "balanced" | "degen";

interface Verdict {
  id: VerdictId;
  title: string;
  body: string;
  icon: React.ReactNode;
  grad: string;
  text: string;
}

const VERDICTS: Record<VerdictId, Verdict> = {
  quiet: {
    id: "quiet", title: "Quiet Week", body: "Barely logged a thing. No grind, no vice — show up next week.",
    icon: <Hourglass className="h-7 w-7" />, grad: "from-stone-500 to-stone-700", text: "text-stone-600",
  },
  dork: {
    id: "dork", title: "Super Dork Week", body: "You earned a mountain and spent jack. Drink a beer, you absolute dork.",
    icon: <Sparkles className="h-7 w-7" />, grad: "from-sky-500 to-indigo-500", text: "text-sky-600",
  },
  balanced: {
    id: "balanced", title: "Balanced Week", body: "Earned hard, spent smart, stayed even. This is the whole point.",
    icon: <Scale className="h-7 w-7" />, grad: "from-emerald-500 to-teal-500", text: "text-emerald-600",
  },
  degen: {
    id: "degen", title: "Degen Week", body: "You spent more than you earned and dipped into the tab. Iconic. Concerning.",
    icon: <Skull className="h-7 w-7" />, grad: "from-rose-500 to-amber-500", text: "text-rose-600",
  },
};

/** Grade a finished week by how close spending landed to break-even (spent ≈
 *  earned). Earn 100 and spend ~60–140 → Balanced; hoard most of it → Dork;
 *  blow past what you banked → Degen. */
const weekVerdict = (earned: number, spent: number): VerdictId => {
  if (earned + spent < 20) return "quiet";
  const r = earned > 0 ? spent / earned : (spent > 0 ? 2 : 0);
  if (Math.abs(r - 1) <= 0.4) return "balanced";
  return r < 1 ? "dork" : "degen";
};

/** One archived week, kept forever in the History sheet. */
interface WeekRecord {
  week: string;
  earned: number;
  spent: number;
  verdict: VerdictId;
}

// ════════════════════════════════════════════════════════════════════════════
//  FRIENDS / LEADERBOARD
//  Every player carries weekly earned (habit) and spent (vice) mile totals, so
//  the board can rank the group through whatever lens the metric chips select.
// ════════════════════════════════════════════════════════════════════════════

interface Friend {
  name: string;
  /** Habit-miles banked this week. */
  earned: number;
  /** Vice-miles burned this week. */
  spent: number;
  last: string;
  you?: boolean;
}

/** A friend with their net balance precomputed for metric scoring. */
type Ranked = Friend & { net: number };

/** Local demo friends. The tab lets you overspend, so the cohort now spans pure
 *  grind (banked it all) through break-even to a deep degen on the tab. */
const SEED_FRIENDS: Friend[] = [
  { name: "Jake", earned: 100, spent: 15, last: "Running · 8 miles · +80 pts" },      // dork — hoards it
  { name: "Ori",  earned: 72,  spent: 70, last: "Gym Workout · 1 session · +20 pts" }, // balanced — dead even
  { name: "Maya", earned: 48,  spent: 30, last: "Lifting · 1 session · +20 pts" },     // mild grind
  { name: "Zoe",  earned: 30,  spent: 85, last: "Heavy Night Out · 1 night · -60 pts" }, // degen — on the tab
];

/** Spend ratio: spent ÷ earned. 1.0 means you spent exactly what you banked. Now
 *  that the tab allows overspending it can exceed 1; 0 means you hoarded it all. */
const spendRatio = (f: { earned: number; spent: number }): number =>
  f.earned > 0 ? f.spent / f.earned : (f.spent > 0 ? 2 : 0);

/** Moderation, 0…1: how close you landed to break-even (spent ≈ earned). Peaks
 *  at 1.0 when r = 1, fading linearly to 0 once you've hoarded everything (r = 0)
 *  or spent double what you banked (r = 2). Earn 100, spend ~80–120 → ~0.8–1.0. */
const moderationOf = (f: { earned: number; spent: number }): number =>
  Math.max(0, 1 - Math.abs(spendRatio(f) - 1));

/** How active someone was this week, 0…1. A quiet week can't top any board —
 *  you have to actually live to win, in either direction. */
const engagement = (f: { earned: number; spent: number }): number =>
  Math.min((f.earned + f.spent) / 40, 1);

/** Status dot colour for any balance — yours or a friend's. */
const dotFor = (pts: number): string =>
  pts > 2.5 ? "bg-emerald-500" : pts < -2.5 ? "bg-amber-400" : "bg-stone-300";

type MetricId = "balanced" | "degen" | "dork";

/** One lens on the leaderboard — its own scoring, colour, and trash talk. */
interface Metric {
  id: MetricId;
  label: string;
  tagline: string;
  unit: string;
  icon: React.ReactNode;
  score: (f: Ranked) => number;
  text: string;
  chipOn: string;
  /** rgba colour feeding the champion card's pulsing glow. */
  glow: string;
}

const METRICS: Metric[] = [
  {
    id: "balanced",
    label: "Balanced",
    tagline: "Spent just about what you earned — banked it, then enjoyed it. Peak moderation.",
    unit: "balance",
    icon: <Scale className="w-4 h-4" />,
    score: (f) => Math.round(moderationOf(f) * 100 * engagement(f)),
    text: "text-emerald-600",
    chipOn: "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30",
    glow: "rgba(16,185,129,0.45)",
  },
  {
    id: "degen",
    label: "Degen",
    tagline: "Spent more than you banked and leaned on the tab. Iconic. Concerning.",
    unit: "degen",
    icon: <Skull className="w-4 h-4" />,
    score: (f) => Math.round(Math.min(spendRatio(f) / 2, 1) * 100 * engagement(f)),
    text: "text-rose-600",
    chipOn: "border-rose-500 bg-rose-500 text-white shadow-lg shadow-rose-500/30",
    glow: "rgba(244,63,94,0.45)",
  },
  {
    id: "dork",
    label: "Dork",
    tagline: "Earned a pile and barely spent it. Insufferably disciplined.",
    unit: "grind",
    icon: <Sparkles className="w-4 h-4" />,
    score: (f) => Math.round(Math.max(0, 1 - spendRatio(f)) * 100 * engagement(f)),
    text: "text-sky-600",
    chipOn: "border-sky-500 bg-sky-500 text-white shadow-lg shadow-sky-500/30",
    glow: "rgba(14,165,233,0.45)",
  },
];

/** Bottom navigation tabs. */
const TABS: { id: Mode; label: string; icon: React.ReactNode }[] = [
  { id: "home",      label: "Home",    icon: <Activity className="w-4 h-4" /> },
  { id: "allowance", label: "Earn",    icon: <Dumbbell className="w-4 h-4" /> },
  { id: "store",     label: "Store",   icon: <ShoppingBag className="w-4 h-4" /> },
  { id: "friends",   label: "Friends", icon: <Users className="w-4 h-4" /> },
];

/** Duolingo-style weekly earn goal — the dashboard ring + bar fill toward this. */
const WEEKLY_GOAL = 150;

/** A Spotify / Uber-Eats style "For You" recommendation card on the dashboard. */
interface Rec {
  key: string;
  tag: string;
  title: string;
  sub: string;
  icon: React.ReactNode;
  /** Tailwind gradient classes for the card face. */
  grad: string;
  cta: string;
  onTap: () => void;
}

/** Time-of-day greeting for the dashboard header. */
const greeting = (): string => {
  const h = new Date().getHours();
  return h < 5 ? "Late night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

// ════════════════════════════════════════════════════════════════════════════
//  THE COACH — a foul-mouthed little voice that reacts to how you're playing.
//  Grind too hard with nothing spent and it tells you to drink a beer, dork.
// ════════════════════════════════════════════════════════════════════════════

type CoachBucket = "start" | "dork" | "balanced" | "tab" | "loose" | "neutral";

const COACH: Record<CoachBucket, string[]> = {
  start: [
    "You haven't done shit. Move your ass before you earn anything.",
    "Zero logged. Get off your ass and sweat, you lazy fuck.",
    "Empty. Do something good or fuck off and come back later.",
  ],
  dork: [
    "You're doing too much — drink a beer, you fucking dork.",
    "Sitting on a pile of points doing fuck-all. Spend it, dipshit.",
    "Stop grinding and have a damn drink. Nobody's impressed, dork.",
    "This is a vices app, not a fucking monastery. Go ruin yourself.",
    "All this discipline and zero fun. You're insufferable. Drink something.",
  ],
  balanced: [
    "Spent what you earned. Annoyingly balanced, you smug bastard.",
    "Dead even. Disgusting. Don't get cocky, dickhead.",
    "Earned it, blew it, balanced as hell. Show-off prick.",
  ],
  tab: [
    "You're on the fucking tab, genius. Earn it back before it eats you.",
    "Spending money you don't have like a true idiot. Run it off.",
    "Broke and reckless. Clock's ticking, dumbass — go sweat.",
    "You overdid it, champ. Pay your damn debts before they bite.",
  ],
  loose: [
    "Slow the fuck down, you animal. Log a salad before you die.",
    "Your liver's writing its will. Go earn some shit back.",
    "Spending like you've got a death wish. Easy, killer.",
  ],
  neutral: [
    "Eh. Earn more or sin more — do something, you bore.",
    "Coasting like a coward. Pick a lane, dork.",
    "Mediocre. Go be great or go be bad. Your call, champ.",
  ],
};

/** Pick the coach's mood from how you're playing right now. */
const coachBucket = (earned: number, spent: number, onTab: boolean): CoachBucket => {
  if (onTab) return "tab";
  if (earned < 10 && spent < 10) return "start";
  const r = earned > 0 ? spent / earned : 0;
  if (earned >= 40 && r < 0.3) return "dork";
  if (Math.abs(r - 1) <= 0.35 && earned >= 20) return "balanced";
  if (r > 1.2) return "loose";
  return "neutral";
};

/** Icon-bubble tint per coach mood. */
const COACH_TINT: Record<CoachBucket, string> = {
  start: "bg-emerald-500/10 text-emerald-600",
  dork: "bg-sky-500/10 text-sky-600",
  balanced: "bg-emerald-500/10 text-emerald-600",
  tab: "bg-amber-500/10 text-amber-600",
  loose: "bg-rose-500/10 text-rose-600",
  neutral: "bg-stone-900/5 text-stone-500",
};

/** First-run onboarding — four quick cards, skippable at any point. */
const ONBOARD: { icon: React.ReactNode; title: string; body: string }[] = [
  { icon: <Scale className="h-7 w-7" />,       title: "Welcome to Vices.ai", body: "Do healthy things, bank points, then spend them on your vices — guilt-free." },
  { icon: <Dumbbell className="h-7 w-7" />,    title: "Earn your allowance", body: "Log a run, a workout, a sauna — every healthy move banks points toward your weekly goal." },
  { icon: <ShoppingBag className="h-7 w-7" />, title: "Spend in the Store",  body: "Cash your points in on the good stuff. A beer, a night out — you earned it." },
  { icon: <Users className="h-7 w-7" />,       title: "Stay balanced",       body: "Too much grind or too much vice both cost you. Keep it even and climb the leaderboard." },
];

/** Confetti palettes for the log-entry burst. */
const CONFETTI_GOOD = ["#10b981", "#34d399", "#0ea5e9", "#a3e635"];
const CONFETTI_BAD = ["#f59e0b", "#fb923c", "#f43f5e", "#facc15"];

/** One in-flight log celebration: a particle shower off the log button. */
interface Burst {
  id: number;
  parts: { k: string; dx: string; dy: string; c: string; d: string }[];
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export default function VicesAiPage() {
  // ── Core state ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("home");
  const [habitId, setHabitId] = useState<HabitId>("run");
  const [habitQty, setHabitQty] = useState<number>(3);
  const [friends, setFriends] = useState<Friend[]>(SEED_FRIENDS);
  const [newFriend, setNewFriend] = useState<string>("");
  const [metric, setMetric] = useState<MetricId>("balanced");

  /** Duolingo-style daily streak — consecutive days with a logged habit. Unlike
   *  the weekly point ledger, the streak carries across weeks. */
  const [streak, setStreak] = useState<number>(0);
  const [lastLogDay, setLastLogDay] = useState<string | null>(null);

  /** First-run tutorial: current step, or -1 once finished/skipped. */
  const [onboardStep, setOnboardStep] = useState<number>(-1);

  /** Store: a transient toast after a purchase or a tab payoff (pts is signed). */
  const [toast, setToast] = useState<{ id: number; text: string; pts: number } | null>(null);

  /** Which coach line to show — bumped on every log/buy and on tap to reroll. */
  const [coachIdx, setCoachIdx] = useState<number>(0);

  /** Weekly point totals — earned by habits, spent on vices. Net is derived. */
  const [earnedME, setEarnedME] = useState<number>(0);
  const [spentME, setSpentME] = useState<number>(0);
  const [lastEntry, setLastEntry] = useState<string | null>(null);
  const netME = round2(earnedME - spentME);

  /** Lifetime tallies (never reset): per-item counts + all-time point totals. */
  const [history, setHistory] = useState<Record<string, number>>({});
  const [lifeEarned, setLifeEarned] = useState<number>(0);
  const [lifeSpent, setLifeSpent] = useState<number>(0);
  const [weeks, setWeeks] = useState<WeekRecord[]>([]);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);

  /** The tab: when set, you owe money and the 36-hour clock is running. */
  const [loanDueAt, setLoanDueAt] = useState<number | null>(null);
  /** Ticks once a second while the tab is open so the countdown stays live. */
  const [now, setNow] = useState<number>(() => Date.now());

  /** Monday recap modal — set on load when a finished week is detected. */
  const [recap, setRecap] = useState<WeekRecord | null>(null);

  /** In-flight log celebration (confetti + floating delta). */
  const [burst, setBurst] = useState<Burst | null>(null);

  // ── Habit picker (same sheet pattern: trigger → category → genre/type) ──
  const [habitPickerOpen, setHabitPickerOpen] = useState<boolean>(false);
  const [openHabitCat, setOpenHabitCat] = useState<string>("workout");

  // ── Splash screen ───────────────────────────────────────────────────────
  const [splashFading, setSplashFading] = useState<boolean>(false);
  const [splashGone, setSplashGone] = useState<boolean>(false);
  useEffect(() => {
    const t1 = setTimeout(() => setSplashFading(true), 1800);
    const t2 = setTimeout(() => setSplashGone(true), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // ── Persistence (ledger auto-resets every Monday — stale weeks are ignored) ──
  //  `hydrated` gates the save effects until the load effects have run, so the
  //  initial empty state never clobbers a balance stored on a previous visit.
  const hydrated = useRef<boolean>(false);
  useEffect(() => {
    // Lifetime history (never resets).
    try {
      const raw = localStorage.getItem("vices-history-v1");
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === "object") {
          setHistory(p.history ?? {});
          setLifeEarned(p.lifeEarned ?? 0);
          setLifeSpent(p.lifeSpent ?? 0);
        }
      }
    } catch { /* no history yet */ }
    // Archived weekly recaps (never reset).
    let archived: WeekRecord[] = [];
    try {
      const raw = localStorage.getItem("vices-weeks-v1");
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) archived = p; }
    } catch { /* no archive yet */ }

    try {
      const raw = localStorage.getItem("vices-ledger-v2");
      if (raw) {
        const p = JSON.parse(raw);
        if (p.week === weekOf()) {
          if (typeof p.earned === "number") {
            setEarnedME(p.earned);
            setSpentME(p.spent ?? 0);
          } else {
            // Pre-split ledger stored only the net — recover what we can.
            const n: number = p.netME ?? 0;
            setEarnedME(Math.max(n, 0));
            setSpentME(Math.max(-n, 0));
          }
          setLastEntry(p.lastEntry ?? null);
          setLoanDueAt(typeof p.loanDueAt === "number" ? p.loanDueAt : null);
        } else if (typeof p.earned === "number" && (p.earned + (p.spent ?? 0)) > 0 && p.week) {
          // A finished week — grade it, archive it, and queue the Monday recap.
          const rec: WeekRecord = { week: p.week, earned: p.earned, spent: p.spent ?? 0, verdict: weekVerdict(p.earned, p.spent ?? 0) };
          if (!archived.some((w) => w.week === rec.week)) archived = [rec, ...archived];
          setRecap(rec);
        }
      }
    } catch { /* corrupted storage — start clean */ }
    setWeeks(archived);
    try {
      const raw = localStorage.getItem("vices-friends-v3");
      if (raw) {
        const p = JSON.parse(raw);
        if (p && Array.isArray(p.friends)) {
          if (p.week === weekOf()) {
            setFriends(p.friends);
          } else {
            // New week — the leaderboard resets with the ledger. Refresh the demo
            // cohort to its seed so there's still a board to climb; zero out the
            // weekly stats of anyone you added yourself.
            setFriends(p.friends.map((f: Friend) => {
              const seed = SEED_FRIENDS.find((s) => s.name === f.name);
              return seed ? { ...seed } : { ...f, earned: 0, spent: 0, last: "No logs yet" };
            }));
          }
        }
      }
    } catch { /* corrupted storage — keep seeds */ }
    try {
      const raw = localStorage.getItem("vices-streak-v1");
      if (raw) {
        const p = JSON.parse(raw);
        // A streak survives only if you logged today or yesterday; older = broken.
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const last = p.lastLogDay ? new Date(p.lastLogDay) : null;
        const days = last ? Math.round((today.getTime() - last.getTime()) / 86400000) : 99;
        setStreak(days <= 1 ? (p.streak ?? 0) : 0);
        setLastLogDay(p.lastLogDay ?? null);
      }
    } catch { /* corrupted storage — no streak */ }
  }, []);
  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem("vices-ledger-v2", JSON.stringify({ week: weekOf(), earned: earnedME, spent: spentME, lastEntry, loanDueAt }));
  }, [earnedME, spentME, lastEntry, loanDueAt]);
  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem("vices-streak-v1", JSON.stringify({ streak, lastLogDay }));
  }, [streak, lastLogDay]);
  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem("vices-history-v1", JSON.stringify({ history, lifeEarned, lifeSpent }));
  }, [history, lifeEarned, lifeSpent]);
  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem("vices-weeks-v1", JSON.stringify(weeks));
  }, [weeks]);
  // Keep the tab countdown live — tick once a second only while a tab is open.
  useEffect(() => {
    if (loanDueAt === null) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [loanDueAt]);
  // Show the tutorial once, ever — first run with no stored flag.
  useEffect(() => {
    try {
      if (!localStorage.getItem("vices-onboarded-v1")) setOnboardStep(0);
    } catch { /* ignore — just skip onboarding */ }
  }, []);
  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem("vices-friends-v3", JSON.stringify({ week: weekOf(), friends }));
  }, [friends]);
  // Declared last so it runs after the first pass of the save effects above —
  // they skip while false, then persist normally once the loaded state lands.
  useEffect(() => { hydrated.current = true; }, []);

  // ── Current selection + reactive math ───────────────────────────────────
  const habit = ALL_HABITS.find((h) => h.id === habitId) as BarterItem<HabitId>;

  const isHome = mode === "home";
  const isAllowance = mode === "allowance";
  const isStore = mode === "store";
  const isFriends = mode === "friends";

  // Allowance always works on the selected habit.
  const item = habit;
  const qty = habitQty;
  const setQty = setHabitQty;
  const totalME = qty * item.me;

  /** Points available to spend in the Store (never negative on the banner). */
  const wallet = Math.max(netME, 0);

  // ── The tab (live, ticks with `now`) ────────────────────────────────────
  const onTab = loanDueAt !== null;
  const debt = Math.max(-netME, 0);
  const tabInterest = onTab ? loanInterest(debt, loanDueAt as number, now) : 0;
  const tabOwed = debt + tabInterest;
  const tabOverdue = onTab && now > (loanDueAt as number);

  // ── The coach (reacts to how you're playing) ────────────────────────────
  const coachMood = coachBucket(earnedME, spentME, onTab);
  const coachLine = COACH[coachMood][coachIdx % COACH[coachMood].length];

  /** What the effort you're about to log buys — three single-vice maxes plus a
   *  realistic mix. The headline "either 3 beers, 2 cigs, or 1 joint" answer. */
  const spendSingles = useMemo(
    () => (["beer", "cig", "joint"] as ViceId[]).map((id) => {
      const v = viceBy(id);
      return { v, n: buys(totalME, v.me) };
    }),
    [totalME],
  );
  const comboLine = comboFor(totalME);

  /** Leaderboard: you + friends, ranked through the active metric's lens. */
  const activeMetric = METRICS.find((m) => m.id === metric) as Metric;
  const board = useMemo<Ranked[]>(() => {
    const rows: Ranked[] = [
      ...friends.map((f) => ({ ...f, net: round2(f.earned - f.spent) })),
      { name: "You", earned: earnedME, spent: spentME, net: netME, last: lastEntry ?? "No logs yet", you: true },
    ];
    return rows.sort((a, b) => activeMetric.score(b) - activeMetric.score(a));
  }, [friends, earnedME, spentME, netME, lastEntry, activeMetric]);

  /** Podium columns rendered silver · gold · bronze; the rest go in rows. */
  const podium = [board[1], board[0], board[2]];
  const restRows = board.slice(3);

  const addFriend = (): void => {
    const name = newFriend.trim();
    if (!name || friends.some((f) => f.name.toLowerCase() === name.toLowerCase())) return;
    setFriends((prev) => [...prev, { name, earned: 0, spent: 0, last: "No logs yet" }]);
    setNewFriend("");
  };

  // ── Life Balance status (three glowing-dot states) ──────────────────────
  const status =
    netME > 2.5
      ? { label: "Vitality Surplus", dot: "bg-emerald-500", text: "text-emerald-600", glow: "shadow-[0_0_8px_rgba(16,185,129,0.5)]" }
      : netME < -2.5
      ? { label: "Karma Deficit",    dot: "bg-amber-400",   text: "text-amber-600",   glow: "shadow-[0_0_8px_rgba(251,191,36,0.5)]" }
      : { label: "Neutral Zone",     dot: "bg-stone-300",   text: "text-stone-500",   glow: "shadow-[0_0_8px_rgba(214,211,209,0.6)]" };

  // ── Dashboard rings (Apple-Fitness style) ───────────────────────────────
  //  Outer ring = progress toward this week's earn goal; inner = how much of
  //  what you earned has already been spent.
  const goalProgress = Math.min(earnedME / WEEKLY_GOAL, 1);
  const burnProgress = earnedME > 0 ? Math.min(spentME / earnedME, 1) : 0;

  // ── "For You" recommendations (Spotify / Uber-Eats reward cards) ─────────
  const recs = useMemo<Rec[]>(() => {
    const out: Rec[] = [];
    // Best reward you can claim right now — the Uber-Eats "claim it" moment.
    const affordable = ALL_VICES.filter((v) => wallet >= v.me).sort((a, b) => b.me - a.me);
    if (affordable.length) {
      const v = affordable[0];
      out.push({
        key: `claim-${v.id}`, tag: "Ready to claim", title: v.label, sub: `${fmt(v.me)} pts · you earned this`,
        icon: v.icon, grad: "from-rose-500 to-amber-500", cta: "Claim it", onTap: () => setMode("store"),
      });
    }
    // The next reward just out of reach — the carrot that pulls you back to Earn.
    const locked = ALL_VICES.filter((v) => wallet < v.me).sort((a, b) => a.me - b.me);
    if (locked.length) {
      const v = locked[0];
      out.push({
        key: `almost-${v.id}`, tag: "Almost there", title: v.label, sub: `${fmt(v.me - wallet)} pts to unlock`,
        icon: v.icon, grad: "from-violet-500 to-indigo-500", cta: "Earn it", onTap: () => setMode("allowance"),
      });
    }
    // Streak nudge — Duolingo's "don't break the chain."
    out.push({
      key: "streak",
      tag: streak > 0 ? `${streak}-day streak` : "Start a streak",
      title: streak > 0 ? "Keep it alive" : "Log today",
      sub: streak > 0 ? "Earn to extend it" : "One habit starts it",
      icon: <Flame className="h-4 w-4" />, grad: "from-orange-500 to-rose-500", cta: "Earn", onTap: () => setMode("allowance"),
    });
    // Quick win — a one-tap top-up suggestion.
    out.push({
      key: "topup", tag: "Quick win", title: "Hit the sauna", sub: "+5 pts in one tap",
      icon: <ThermometerSun className="h-4 w-4" />, grad: "from-emerald-500 to-teal-500", cta: "Log it",
      onTap: () => { setHabitId("sauna"); setHabitQty(1); setMode("allowance"); },
    });
    return out;
  }, [wallet, streak]);

  // ── Actions ─────────────────────────────────────────────────────────────
  /** Shower of particles off whatever just got tapped (green = earn, warm = spend). */
  const fireBurst = (good: boolean): void => {
    const palette = good ? CONFETTI_GOOD : CONFETTI_BAD;
    const id = Date.now();
    setBurst({
      id,
      parts: Array.from({ length: 14 }, (_, i) => ({
        k: `${id}-${i}`,
        dx: `${Math.round((Math.random() * 2 - 1) * 130)}px`,
        dy: `${Math.round(-30 - Math.random() * 110)}px`,
        c: palette[i % palette.length],
        d: `${Math.round(Math.random() * 120)}ms`,
      })),
    });
    window.setTimeout(() => setBurst((b) => (b && b.id === id ? null : b)), 950);
  };

  /** Bank points for any habit + quantity. Shared by the main Log button and the
   *  one-tap Quick Add chips. Also pays off the tab (with interest) when the
   *  fresh points clear what you owed. */
  const bankHabit = (h: BarterItem<HabitId>, n: number): void => {
    const pts = round2(n * h.me);
    const newEarned = round2(earnedME + pts);
    // Settle the tab if this earning gets you back to (or above) even.
    if (loanDueAt !== null && newEarned - spentME >= 0) {
      const principal = Math.max(spentME - earnedME, 0);
      const interest = loanInterest(principal, loanDueAt, Date.now());
      const newSpent = round2(spentME + interest);
      setSpentME(newSpent);
      setLoanDueAt(newEarned - newSpent >= 0 ? null : Date.now() + LOAN_WINDOW_MS);
      const tid = Date.now() + 1;
      setToast({ id: tid, text: interest > 0 ? `Tab cleared · ${fmt(interest)} pts interest` : "Tab cleared", pts: -interest });
      window.setTimeout(() => setToast((t) => (t && t.id === tid ? null : t)), 1800);
    }
    setEarnedME(newEarned);
    setLifeEarned((prev) => round2(prev + pts));
    setCoachIdx((i) => i + 1);
    setHistory((prev) => ({ ...prev, [h.id]: round2((prev[h.id] ?? 0) + n) }));
    setLastEntry(
      `${h.label} · ${plur(n, h.unitOne, h.unit)} · +${fmt(pts)} pts · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    );
    // Advance the streak: +1 if yesterday was the last log, reset to 1 if a gap,
    // unchanged if you already logged today.
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    if (lastLogDay !== todayStr) {
      const last = lastLogDay ? new Date(lastLogDay) : null;
      const gap = last ? Math.round((today.getTime() - last.getTime()) / 86400000) : 99;
      setStreak((s) => (gap === 1 ? s + 1 : 1));
      setLastLogDay(todayStr);
    }
    fireBurst(true);
  };

  const logEntry = (): void => bankHabit(item, qty);

  /** Close the tutorial and remember it so it never shows again. */
  const dismissOnboard = (): void => {
    setOnboardStep(-1);
    try { localStorage.setItem("vices-onboarded-v1", "1"); } catch { /* ignore */ }
  };

  // ── Swipe between tabs (touch) ──────────────────────────────────────────
  //  A horizontal flick moves to the next/previous tab. Regions marked
  //  data-noswipe (the slider, the "For You" carousel) keep their own gesture.
  const swipeX = useRef<number | null>(null);
  const swipeY = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent): void => {
    if (habitPickerOpen || onboardStep >= 0 || (e.target as HTMLElement).closest("[data-noswipe]")) {
      swipeX.current = null;
      return;
    }
    swipeX.current = e.touches[0].clientX;
    swipeY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent): void => {
    if (swipeX.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeX.current;
    const dy = e.changedTouches[0].clientY - (swipeY.current ?? 0);
    swipeX.current = null;
    // Only a clear, mostly-horizontal flick counts.
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const order = TABS.map((t) => t.id);
    const i = order.indexOf(mode);
    if (dx < 0 && i < order.length - 1) setMode(order[i + 1]);
    else if (dx > 0 && i > 0) setMode(order[i - 1]);
  };

  /** Store: spend points on a vice. You can overspend — that opens the tab, a
   *  36-hour loan against future effort. */
  const buyVice = (v: BarterItem<ViceId>): void => {
    const borrowed = spentME + v.me > earnedME; // pushes you below zero?
    setSpentME((prev) => round2(prev + v.me));
    setLifeSpent((prev) => round2(prev + v.me));
    setCoachIdx((i) => i + 1);
    setHistory((prev) => ({ ...prev, [v.id]: (prev[v.id] ?? 0) + 1 }));
    setLastEntry(
      `${v.label} · 1 ${v.unitOne} · -${fmt(v.me)} pts · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    );
    // Open the tab the moment a purchase takes you negative (clock starts now).
    if (loanDueAt === null && borrowed) setLoanDueAt(Date.now() + LOAN_WINDOW_MS);
    const id = Date.now();
    setToast({ id, text: borrowed ? `${v.label} · on the tab` : `Enjoy your ${v.label.toLowerCase()}`, pts: -v.me });
    window.setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 1600);
    fireBurst(false);
  };

  /** Pick a specific habit from the sheet → set it and close. */
  const selectHabit = (h: BarterItem<HabitId>): void => {
    setHabitId(h.id);
    setHabitQty(h.def);
    setHabitPickerOpen(false);
  };

  /** Open the habit sheet expanded on whatever category is active. */
  const openHabitSheet = (): void => {
    setOpenHabitCat(catOf(habitId));
    setHabitPickerOpen(true);
  };

  // ── Mode-dependent accent classes (vibrant on eggshell) ─────────────────
  const accent = isAllowance
    ? { text: "text-emerald-600", slider: "vslider-emerald", chip: "bg-emerald-500/10 border-emerald-500/40 text-emerald-700", btn: "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/30" }
    : isStore
    ? { text: "text-rose-600",    slider: "vslider-amber",   chip: "bg-rose-500/10 border-rose-500/40 text-rose-700",          btn: "bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 shadow-lg shadow-rose-500/30" }
    : { text: "text-stone-600",   slider: "vslider-sky",     chip: "bg-stone-900/10 border-stone-900/20 text-stone-700",       btn: "bg-stone-900 hover:bg-stone-700 shadow-lg shadow-stone-900/20" };

  const glass = "rounded-2xl border border-stone-900/10 bg-white/60 backdrop-blur-md shadow-sm";

  // ══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="relative min-h-dvh w-full bg-[#EDE9E1] font-sans text-stone-800 antialiased lg:flex lg:items-center lg:justify-center lg:p-8">
      {/* Scoped styles: scrollbars, sliders, splash loader, interaction FX */}
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
        .press { transition: transform .15s ease; }
        .press:active { transform: scale(0.92); }
        .shine { background-size: 200% auto; animation: shine 4s linear infinite; }
        .floaty { background-size: 200% 200%; animation: floaty 14s ease infinite; }
        @keyframes loadbar { from { width: 0%; } to { width: 100%; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes pop { 0% { transform: scale(.82); } 60% { transform: scale(1.08); } 100% { transform: scale(1); } }
        @keyframes bob { 0%, 100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -4px); } }
        @keyframes glowPulse { 0%, 100% { box-shadow: 0 0 16px var(--glow); } 50% { box-shadow: 0 0 36px var(--glow); } }
        @keyframes burstP { 0% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(.2); opacity: 0; } }
        @keyframes shine { to { background-position: 200% center; } }
        @keyframes floaty { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes toastIn { 0% { opacity: 0; transform: translate(-50%, 16px) scale(.9); } 12% { opacity: 1; transform: translate(-50%, 0) scale(1); } 88% { opacity: 1; transform: translate(-50%, 0) scale(1); } 100% { opacity: 0; transform: translate(-50%, -8px) scale(.98); } }
      `}</style>

      {/* Desktop-only ambient backdrop behind the phone frame */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block bg-[radial-gradient(ellipse_at_top_left,#FFFFFF_0%,transparent_55%),radial-gradient(ellipse_at_bottom_right,#D7F0E4_0%,transparent_55%),radial-gradient(ellipse_at_top_right,#FBE3D6_0%,transparent_50%)]" />

      {/* ─────────────── PHONE FRAME ───────────────
          Mobile: fills the native viewport edge-to-edge.
          Desktop: centered, cropped device mock-up with rounded bezel. */}
      <div className="relative h-dvh w-full overflow-hidden bg-gradient-to-b from-[#FAF8F4] to-[#F1EDE5] lg:h-[844px] lg:max-h-[94vh] lg:w-[390px] lg:rounded-[48px] lg:border lg:border-stone-700/60 lg:ring-[10px] lg:ring-stone-900 lg:shadow-[0_50px_140px_-20px_rgba(28,25,23,0.55)]">

        {/* Soft animated mesh wash on the screen itself — keeps it from feeling flat */}
        <div className="floaty pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_15%_10%,rgba(16,185,129,0.10),transparent_45%),radial-gradient(circle_at_85%_15%,rgba(244,63,94,0.08),transparent_45%),radial-gradient(circle_at_50%_100%,rgba(14,165,233,0.08),transparent_50%)]" />

        {/* Notch — desktop mock-up only */}
        <div className="absolute left-1/2 top-3.5 z-40 hidden h-7 w-32 -translate-x-1/2 rounded-full bg-stone-900 lg:block" />

        {/* ─────────────── SPLASH / LOADING SCREEN ─────────────── */}
        {!splashGone && (
          <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF8F4] transition-opacity duration-700 ${splashFading ? "opacity-0" : "opacity-100"}`}>
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-stone-900 to-stone-700 shadow-xl shadow-stone-900/25" style={{ animation: "pop .5s ease" }}>
              <Scale className="h-9 w-9 text-[#FAF8F4]" />
            </div>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-stone-900">
              Vices<span className="shine bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 bg-clip-text text-transparent">.ai</span>
            </h1>
            <p className="mt-2 text-sm text-stone-500">Earn your vices the easy way.</p>
            <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-stone-900/10">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ animation: "loadbar 2.2s ease-out forwards" }} />
            </div>
          </div>
        )}

        {/* ─────────────── FIRST-RUN TUTORIAL (4 steps, skip anytime) ─────────────── */}
        {splashGone && onboardStep >= 0 && onboardStep < ONBOARD.length && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
            {/* Tap the backdrop to dismiss */}
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={dismissOnboard} />
            <div
              key={onboardStep}
              className="relative w-full max-w-[300px] rounded-3xl border border-stone-900/10 bg-[#FAF8F4] p-6 shadow-2xl"
              style={{ animation: "fadeUp .3s ease" }}
            >
              <button
                onClick={dismissOnboard}
                className="absolute right-4 top-4 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400 transition-colors hover:text-stone-700"
              >
                Skip
              </button>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 text-[#FAF8F4] shadow-md shadow-stone-900/20">
                {ONBOARD[onboardStep].icon}
              </div>
              <h3 className="mt-4 text-lg font-black leading-tight text-stone-900">{ONBOARD[onboardStep].title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-stone-500">{ONBOARD[onboardStep].body}</p>
              <div className="mt-5 flex items-center gap-1.5">
                {ONBOARD.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-all ${i === onboardStep ? "w-5 bg-stone-900" : "w-1.5 bg-stone-900/20"}`} />
                ))}
              </div>
              <button
                onClick={() => (onboardStep === ONBOARD.length - 1 ? dismissOnboard() : setOnboardStep((s) => s + 1))}
                className="press mt-5 w-full rounded-xl bg-stone-900 py-3 text-[13px] font-bold text-white transition-colors hover:bg-stone-700"
              >
                {onboardStep === ONBOARD.length - 1 ? "Let's go" : "Next"}
              </button>
            </div>
          </div>
        )}

        {/* ─────────────── SINGLE-SCREEN APP SHELL (zero scroll) ─────────────── */}
        <div className="flex h-full flex-col justify-between gap-3 overflow-hidden p-6 lg:pt-12" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

          {/* ── HEADER: brand + live balance pill ── */}
          <header className="flex flex-shrink-0 items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 shadow-md shadow-stone-900/20">
                <Scale className="h-4 w-4 text-[#FAF8F4]" />
              </div>
              <h1 className="text-lg font-bold leading-none tracking-tight text-stone-900">
                Vices<span className="text-emerald-500">.ai</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {streak > 0 && (
                <div className="flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-1" title={`${streak}-day streak`}>
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-[12px] font-black tabular-nums text-orange-600">{streak}</span>
                </div>
              )}
              <div className="flex flex-col items-end gap-1">
                <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-stone-400">Life Balance</span>
                <div className="flex items-center gap-1.5 rounded-full border border-stone-900/10 bg-white/70 px-2.5 py-1">
                  <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${status.dot} ${status.glow}`} />
                  <span className={`text-[10px] font-semibold ${status.text}`}>{status.label}</span>
                  <span className={`text-[11px] font-black tabular-nums ${status.text}`}>
                    {netME >= 0 ? "+" : ""}{fmt(netME)} pts
                  </span>
                </div>
                <span className="text-[7px] font-semibold uppercase tracking-[0.2em] text-stone-400/80">resets every monday</span>
              </div>
            </div>
          </header>

          {/* ── MAIN PANEL (the only region allowed to flex) ── */}
          <main className={`no-scrollbar min-h-0 flex-1 overflow-y-auto ${glass} p-5`}>
            <div className="flex min-h-full flex-col gap-4">
            {isHome ? (
              <>
                {/* ── HOME DASHBOARD: rings, goal, and reward recommendations ── */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-stone-400">{greeting()}</p>
                    <h2 className="text-lg font-black leading-tight text-stone-900">Here&apos;s your balance</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHistoryOpen(true)}
                      className="press flex h-9 w-9 items-center justify-center rounded-full border border-stone-900/10 bg-white/70 text-stone-500 shadow-sm transition-colors hover:text-stone-900"
                      aria-label="History"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setMode("allowance")}
                      className="press flex items-center gap-1 rounded-full bg-stone-900 px-3.5 py-2 text-[11px] font-bold text-white shadow-md shadow-stone-900/20"
                    >
                      <Zap className="h-3.5 w-3.5" /> Log
                    </button>
                  </div>
                </div>

                {/* The tab — live countdown while you owe against future effort */}
                {onTab && (
                  <button
                    onClick={() => setMode("allowance")}
                    className={`press relative flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r p-4 text-left text-white shadow-lg ${tabOverdue ? "from-rose-600 to-red-600 shadow-rose-600/30" : "from-amber-500 to-rose-500 shadow-amber-500/25"}`}
                    style={{ animation: "fadeUp .3s ease" }}
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
                      <Receipt className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/80">{tabOverdue ? "Tab overdue" : "On the tab"}</p>
                      <p className="text-lg font-black leading-tight">You owe {fmt(tabOwed)} pts</p>
                      <p className="text-[10px] text-white/85">
                        {fmt(debt)} borrowed + {fmt(tabInterest)} interest · {tabOverdue ? `overdue ${fmtCountdown(loanDueAt as number, now)}` : `${fmtCountdown(loanDueAt as number, now)} left`}
                      </p>
                    </div>
                    <span className="flex flex-shrink-0 items-center gap-0.5 rounded-full bg-white/20 px-2.5 py-1.5 text-[10px] font-bold">
                      Earn it back <ChevronRight className="h-3 w-3" />
                    </span>
                  </button>
                )}

                {/* Apple-Fitness style dual ring */}
                <div className="rounded-3xl border border-stone-900/10 bg-white/70 p-5 shadow-sm">
                  <div className="flex items-center gap-5">
                    <div className="relative h-[132px] w-[132px] flex-shrink-0">
                      <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
                        <circle cx="66" cy="66" r="58" fill="none" stroke="rgba(16,185,129,0.12)" strokeWidth="11" />
                        <circle cx="66" cy="66" r="44" fill="none" stroke="rgba(244,63,94,0.12)" strokeWidth="11" />
                        <circle
                          cx="66" cy="66" r="58" fill="none" stroke="#10b981" strokeWidth="11" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 58} strokeDashoffset={2 * Math.PI * 58 * (1 - goalProgress)}
                          style={{ transition: "stroke-dashoffset .6s ease" }}
                        />
                        <circle
                          cx="66" cy="66" r="44" fill="none" stroke="#f43f5e" strokeWidth="11" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 44} strokeDashoffset={2 * Math.PI * 44 * (1 - burnProgress)}
                          style={{ transition: "stroke-dashoffset .6s ease" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span key={wallet} className="text-3xl font-black leading-none tabular-nums text-stone-900" style={{ animation: "pop .25s ease" }}>{fmt(wallet)}</span>
                        <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-stone-400">to spend</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Earned</span>
                        </div>
                        <p className="text-xl font-black tabular-nums text-stone-900">{fmt(earnedME)} <span className="text-xs font-semibold text-stone-400">/ {WEEKLY_GOAL}</span></p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Spent</span>
                        </div>
                        <p className="text-xl font-black tabular-nums text-stone-900">{fmt(spentME)} <span className="text-xs font-semibold text-stone-400">pts</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* The coach — a foul-mouthed read on how you're playing. Tap to reroll. */}
                <button
                  onClick={() => setCoachIdx((i) => i + 1)}
                  className="press flex items-center gap-3 rounded-2xl border border-stone-900/10 bg-white/60 px-4 py-3 text-left"
                  aria-label="Coach says — tap for another"
                >
                  <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${COACH_TINT[coachMood]}`}>
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <p key={`${coachMood}-${coachIdx}`} className="flex-1 text-[12.5px] font-semibold leading-snug text-stone-700" style={{ animation: "fadeUp .3s ease" }}>
                    {coachLine}
                  </p>
                </button>

                {/* Weekly goal bar (Duolingo progression) */}
                <div className="rounded-2xl border border-stone-900/10 bg-white/40 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500"><TrendingUp className="h-3.5 w-3.5" /> Weekly goal</span>
                    <span className="text-[11px] font-bold tabular-nums text-stone-500">{fmt(earnedME)} / {WEEKLY_GOAL}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-stone-900/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${goalProgress * 100}%`, transition: "width .6s ease" }} />
                  </div>
                  <p className="mt-2 text-[10px] text-stone-400">
                    {goalProgress >= 1 ? "Goal smashed — you've earned the weekend." : `${fmt(WEEKLY_GOAL - earnedME)} pts to hit this week's goal.`}
                  </p>
                </div>

                {/* For You — recommendation cards (Spotify + Uber Eats) */}
                <div>
                  <span className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500"><Sparkles className="h-3.5 w-3.5" /> For you</span>
                  <div data-noswipe className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                    {recs.map((r, i) => (
                      <button
                        key={r.key}
                        onClick={r.onTap}
                        style={{ animation: `fadeUp .3s ease ${i * 60}ms both` }}
                        className={`press relative flex h-[126px] w-[152px] flex-shrink-0 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br ${r.grad} p-3.5 text-left text-white shadow-lg`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">{r.icon}</span>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-white/80">{r.tag}</span>
                        </div>
                        <div>
                          <p className="text-sm font-black leading-tight">{r.title}</p>
                          <p className="text-[10px] text-white/80">{r.sub}</p>
                        </div>
                        <span className="flex items-center gap-0.5 text-[10px] font-bold">{r.cta}<ChevronRight className="h-3 w-3" /></span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Last move */}
                <div className="mt-auto flex items-center gap-3 rounded-2xl border border-stone-900/10 bg-white/40 px-4 py-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-stone-900/5 text-stone-500"><Activity className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400">Last move</p>
                    <p className="truncate text-[12px] font-semibold text-stone-700">{lastEntry ?? "Nothing yet — log your first habit."}</p>
                  </div>
                </div>
              </>
            ) : isFriends ? (
              <>
                {/* Leaderboard: one squad, four ways to judge it */}
                <div>
                  <h2 className={`text-xs font-bold uppercase tracking-[0.18em] ${accent.text}`}>Leaderboard</h2>
                  <p className="mt-1 text-[11px] italic text-stone-400">Your circle, ranked. Pick the lens.</p>
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
                    className="press flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-stone-900 text-[#FAF8F4] transition-colors hover:bg-stone-700"
                    aria-label="Add friend"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                </div>

                {/* Metric lenses */}
                <div className="grid grid-cols-3 gap-1.5">
                  {METRICS.map((m) => {
                    const on = metric === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setMetric(m.id)}
                        className={`press flex flex-col items-center gap-1 rounded-xl border py-2 transition-colors ${on ? m.chipOn : "border-stone-900/10 bg-white/40 text-stone-400 hover:text-stone-600"}`}
                        style={on ? { animation: "pop .3s ease" } : undefined}
                      >
                        {m.icon}
                        <span className="text-[9px] font-bold">{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Re-keyed by metric so every switch replays the entrances */}
                <div key={metric} className="flex flex-col gap-2">
                  <p className="text-[10px] italic leading-relaxed text-stone-400" style={{ animation: "fadeUp .3s ease" }}>
                    {activeMetric.tagline}
                  </p>

                  {/* Podium: silver · gold · bronze */}
                  <div className="grid grid-cols-3 items-end gap-2">
                    {podium.map((f, ci) => {
                      if (!f) return <div key={ci} />;
                      const first = ci === 1;
                      const rank = first ? 1 : ci === 0 ? 2 : 3;
                      return (
                        <div
                          key={f.name}
                          className={`relative flex flex-col items-center gap-0.5 rounded-2xl border px-1.5 text-center ${first ? "border-stone-900/15 bg-white pb-3.5 pt-5 shadow-xl" : "border-stone-900/10 bg-white/60 py-3"} ${f.you ? "ring-2 ring-stone-900/25" : ""}`}
                          style={
                            first
                              ? ({ "--glow": activeMetric.glow, animation: "fadeUp .45s ease both, glowPulse 2.4s ease-in-out .45s infinite" } as React.CSSProperties)
                              : { animation: `fadeUp .4s ease ${ci * 80}ms both` }
                          }
                        >
                          {first && (
                            <Crown className="absolute -top-3 left-1/2 h-5 w-5 text-amber-500" style={{ animation: "bob 1.6s ease-in-out infinite" }} />
                          )}
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-[9px] font-black text-white">{rank}</span>
                          <p className="w-full truncate text-[11px] font-bold text-stone-900">{f.name}</p>
                          <p className={`text-lg font-black leading-none tabular-nums ${activeMetric.text}`}>{fmt(activeMetric.score(f))}</p>
                          <p className="text-[7px] uppercase tracking-wider text-stone-400">{activeMetric.unit}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Everyone off the podium */}
                  {restRows.map((f, i) => (
                    <div
                      key={f.name}
                      className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${f.you ? "border-stone-900/30 bg-white shadow-sm" : "border-stone-900/10 bg-white/50"}`}
                      style={{ animation: `fadeUp .35s ease ${200 + i * 70}ms both` }}
                    >
                      <span className="w-4 flex-shrink-0 text-xs font-bold tabular-nums text-stone-400">{i + 4}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-stone-900">{f.name}</p>
                        <p className="truncate text-[10px] text-stone-400">{f.last}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className={`text-base font-bold leading-none tabular-nums ${activeMetric.text}`}>{fmt(activeMetric.score(f))}</p>
                        <p className="mt-0.5 text-[8px] uppercase tracking-wider text-stone-400">{activeMetric.unit}</p>
                      </div>
                      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotFor(f.net)}`} />
                    </div>
                  ))}
                </div>
              </>
            ) : isStore ? (
              <>
                {/* ── VICES STORE: spend your hard-earned points ── */}
                <h2 className={`text-xs font-bold uppercase tracking-[0.18em] ${accent.text}`}>Vices Store</h2>

                {/* Wallet banner — spendable balance, or the live tab when you owe */}
                <div className={`relative flex flex-shrink-0 items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br px-4 py-3.5 text-white shadow-lg ${onTab ? (tabOverdue ? "from-rose-600 to-red-600 shadow-rose-600/30" : "from-amber-500 to-rose-500 shadow-amber-500/25") : "from-rose-500 to-amber-500 shadow-rose-500/25"}`}>
                  {burst && (
                    <div className="pointer-events-none absolute inset-0 z-10">
                      {burst.parts.map((p) => (
                        <span
                          key={p.k}
                          className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
                          style={{ background: p.c, animation: `burstP .8s ease-out ${p.d} both`, "--dx": p.dx, "--dy": p.dy } as React.CSSProperties}
                        />
                      ))}
                    </div>
                  )}
                  {onTab ? <Receipt className="h-6 w-6 flex-shrink-0" /> : <Wallet className="h-6 w-6 flex-shrink-0" />}
                  <div className="flex-1">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/80">{onTab ? `On the tab · ${fmtCountdown(loanDueAt as number, now)} ${tabOverdue ? "overdue" : "left"}` : "Points to spend"}</p>
                    <p key={onTab ? tabOwed : wallet} className="text-2xl font-black leading-none tabular-nums" style={{ animation: "pop .25s ease" }}>{onTab ? `−${fmt(tabOwed)}` : fmt(wallet)} pts</p>
                  </div>
                  <ShoppingBag className="h-5 w-5 flex-shrink-0 text-white/70" />
                </div>

                {/* Catalogue — tap an affordable item to buy it, locked ones show the gap */}
                <div className="flex flex-col gap-3">
                  {VICE_CATEGORIES.map((cat) => (
                    <div key={cat.id}>
                      <div className="mb-1.5 flex items-center gap-1.5 text-stone-500">
                        <span className={accent.text}>{cat.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{cat.label}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {cat.vices.map((v, vi) => {
                          const afford = netME >= v.me;
                          return (
                            <button
                              key={v.id}
                              onClick={() => buyVice(v)}
                              style={{ animation: `fadeUp .25s ease ${vi * 30}ms both` }}
                              className={`press relative flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${afford ? "border-stone-900/10 bg-white/70 hover:bg-white hover:shadow-md" : "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"}`}
                            >
                              <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${afford ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/15 text-amber-600"}`}>
                                {v.icon}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[12px] font-semibold text-stone-800">{v.label}</span>
                                <span className={`block text-[10px] font-bold tabular-nums ${afford ? "text-rose-600" : "text-amber-600"}`}>
                                  {afford ? `${fmt(v.me)} pts` : `${fmt(v.me)} pts · on tab`}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* ── EARNED ALLOWANCE: pick → set amount → log. One clean flow. ── */}
                <h2 className={`text-xs font-bold uppercase tracking-[0.18em] ${accent.text}`}>Earned Allowance</h2>

                {/* Activity selector — opens the habit bottom-sheet */}
                <button
                  onClick={openHabitSheet}
                  className="press flex w-full items-center gap-3 rounded-2xl border border-stone-900/10 bg-white/70 px-4 py-3.5 text-left shadow-sm transition-colors hover:bg-white"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-stone-400">Activity</span>
                    <span className="block truncate text-sm font-bold text-stone-900">{item.label}</span>
                  </span>
                  <span className="flex-shrink-0 text-[10px] tabular-nums text-stone-400">{fmt(item.me)} pts each</span>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-stone-400" />
                </button>

                {/* Quantity — hero number + slider */}
                <div className="rounded-2xl border border-stone-900/10 bg-white/40 p-4">
                  <div className="flex items-end justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-stone-400">How many</span>
                    <span className={`flex items-baseline gap-1.5 font-black tabular-nums ${accent.text}`}>
                      <span key={qty} className="text-3xl leading-none" style={{ animation: "pop .2s ease" }}>{fmt(qty)}</span>
                      <span className="text-xs font-semibold text-stone-400">{qty === 1 ? item.unitOne : item.unit}</span>
                    </span>
                  </div>
                  <input
                    data-noswipe
                    type="range"
                    min={item.min}
                    max={item.max}
                    step={item.step}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className={`vslider ${accent.slider} mt-3.5`}
                  />
                </div>

                {/* What that effort buys */}
                <div className="rounded-2xl border border-stone-900/10 bg-white/40 p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-stone-400">That effort buys — take your pick</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {spendSingles.map(({ v, n }, i) => (
                      <div
                        key={v.id}
                        className="flex flex-col items-center gap-1 rounded-xl border border-stone-900/10 bg-white/60 py-2.5"
                        style={{ animation: `fadeUp .25s ease ${i * 50}ms both` }}
                      >
                        <span className={accent.text}>{v.icon}</span>
                        <span className="text-xl font-black leading-none tabular-nums text-stone-900">{n}</span>
                        <span className="text-[8px] uppercase tracking-wider text-stone-400">{n === 1 ? v.unitOne : v.unit}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 border-t border-stone-900/5 pt-2.5 text-[11px] text-stone-500">
                    or mix it: <span className={`font-bold ${accent.text}`}>{comboLine}</span>
                  </p>
                </div>

                {/* This week — compact progress toward the weekly goal */}
                <div className="mt-auto rounded-2xl border border-stone-900/10 bg-white/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-stone-400">This week</span>
                    <span className="text-[10px] tabular-nums">
                      <span className="font-bold text-emerald-600">+{fmt(earnedME)}</span> earned&nbsp;·&nbsp;
                      <span className="font-bold text-amber-600">−{fmt(spentME)}</span> spent
                    </span>
                  </div>
                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-stone-900/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${goalProgress * 100}%`, transition: "width .6s ease" }} />
                  </div>
                  <p className="mt-1.5 text-[9px] text-stone-400">
                    {goalProgress >= 1 ? "Weekly goal smashed — enjoy yourself." : `${fmt(WEEKLY_GOAL - earnedME)} pts to your weekly goal.`}
                  </p>
                </div>

                {/* Log button with confetti burst on click */}
                <div className="relative mt-auto flex-shrink-0">
                  {burst && (
                    <div className="pointer-events-none absolute inset-x-0 -top-2 bottom-0 z-10">
                      {burst.parts.map((p) => (
                        <span
                          key={p.k}
                          className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
                          style={{ background: p.c, animation: `burstP .8s ease-out ${p.d} both`, "--dx": p.dx, "--dy": p.dy } as React.CSSProperties}
                        />
                      ))}
                    </div>
                  )}
                  <button
                    onClick={logEntry}
                    className={`press w-full rounded-2xl py-4 text-sm font-bold text-white ${accent.btn}`}
                  >
                    Log {item.label}
                  </button>
                </div>
              </>
            )}
            </div>
          </main>

          {/* ── BOTTOM TAB BAR ── */}
          <nav className="flex flex-shrink-0 rounded-2xl border border-stone-900/10 bg-stone-900/5 p-1">
            {TABS.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`press flex flex-1 flex-col items-center gap-1 rounded-xl py-2 transition-colors ${mode === id ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-600"}`}
              >
                <span style={mode === id ? { animation: "pop .3s ease" } : undefined}>{icon}</span>
                <span className="text-[9px] font-semibold">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* ─────────────── ACTION TOAST (purchase / tab payoff) ─────────────── */}
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-none absolute bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-white shadow-xl shadow-stone-900/30"
            style={{ animation: "toastIn 1.8s ease forwards" }}
          >
            <ShoppingBag className="h-3.5 w-3.5 text-rose-300" />
            <span className="text-[12px] font-semibold">{toast.text}</span>
            {toast.pts !== 0 && (
              <span className="text-[12px] font-black tabular-nums text-rose-300">{toast.pts < 0 ? "−" : "+"}{fmt(Math.abs(toast.pts))} pts</span>
            )}
          </div>
        )}

        {/* ─────────────── CATEGORIZED HABIT PICKER (bottom sheet) ─────────────── */}
        {habitPickerOpen && (
          <div className="absolute inset-0 z-30">
            <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm" onClick={() => setHabitPickerOpen(false)} />
            <div className="no-scrollbar absolute inset-x-0 bottom-0 max-h-[75%] overflow-y-auto rounded-t-3xl border-t border-stone-900/10 bg-[#FAF8F4]/95 p-5 backdrop-blur-xl" style={{ animation: "fadeUp .3s ease" }}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-900/15" />
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">What did you do?</h3>
              <div className="space-y-2">
                {HABIT_CATS.map((cat) => {
                  // Single-option categories (Water) select straight from the row.
                  const single = cat.options.length === 1;
                  const open = openHabitCat === cat.id;
                  return (
                    <div key={cat.id} className="overflow-hidden rounded-xl border border-stone-900/10 bg-white/60">
                      <button
                        onClick={() => (single ? selectHabit(cat.options[0]) : setOpenHabitCat(open ? "" : cat.id))}
                        className="press flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-stone-900/5"
                      >
                        <span className="text-emerald-600">{cat.icon}</span>
                        <span className="flex-1 text-left text-sm font-semibold text-stone-800">{cat.label}</span>
                        {single ? (
                          <>
                            <span className="text-[10px] text-stone-400">{fmt(cat.options[0].me)} pts</span>
                            {habitId === cat.options[0].id && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                          </>
                        ) : (
                          <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                        )}
                      </button>
                      {!single && open && (
                        <div className="border-t border-stone-900/5">
                          {cat.options.map((h, hi) => (
                            <button
                              key={h.id}
                              onClick={() => selectHabit(h)}
                              className="press flex w-full items-center gap-3 px-4 py-2.5 transition-colors hover:bg-stone-900/5"
                              style={{ animation: `fadeUp .25s ease ${hi * 40}ms both` }}
                            >
                              <span className="text-stone-400">{h.icon}</span>
                              <span className="flex-1 text-left text-[13px] text-stone-700">{h.label}</span>
                              <span className="text-[10px] text-stone-400">{fmt(h.me)} pts</span>
                              {habitId === h.id && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────── HISTORY SHEET (lifetime tallies) ─────────────── */}
        {historyOpen && (
          <div className="absolute inset-0 z-40">
            <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
            <div className="no-scrollbar absolute inset-x-0 bottom-0 max-h-[82%] overflow-y-auto rounded-t-3xl border-t border-stone-900/10 bg-[#FAF8F4]/95 p-5 backdrop-blur-xl" style={{ animation: "fadeUp .3s ease" }}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-900/15" />
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Your history · all time</h3>

              {/* All-time totals */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  { label: "Earned", value: lifeEarned, cls: "text-emerald-600" },
                  { label: "Spent", value: lifeSpent, cls: "text-rose-600" },
                  { label: "Net", value: round2(lifeEarned - lifeSpent), cls: "text-stone-900" },
                ] as const).map((s) => (
                  <div key={s.label} className="rounded-xl border border-stone-900/10 bg-white/70 px-3 py-2.5 text-center">
                    <p className={`text-lg font-black leading-none tabular-nums ${s.cls}`}>{fmt(s.value)}</p>
                    <p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-stone-400">{s.label} pts</p>
                  </div>
                ))}
              </div>

              {/* Past weeks */}
              {weeks.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Past weeks</p>
                  <div className="space-y-1.5">
                    {weeks.slice(0, 6).map((w) => {
                      const vd = VERDICTS[w.verdict];
                      return (
                        <div key={w.week} className="flex items-center gap-3 rounded-xl border border-stone-900/10 bg-white/60 px-3.5 py-2">
                          <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${vd.grad} text-white`}>
                            {React.cloneElement(vd.icon as React.ReactElement, { className: "h-3.5 w-3.5" })}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-bold text-stone-800">{vd.title}</p>
                            <p className="text-[9px] text-stone-400">Week of {w.week}</p>
                          </div>
                          <p className="flex-shrink-0 text-[10px] tabular-nums text-stone-400">+{fmt(w.earned)} · −{fmt(w.spent)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lifetime tallies per item */}
              {([
                { title: "Healthy logged", items: ALL_HABITS.filter((h) => (history[h.id] ?? 0) > 0), tint: "text-emerald-600" },
                { title: "Vices enjoyed", items: ALL_VICES.filter((v) => (history[v.id] ?? 0) > 0), tint: "text-rose-600" },
              ] as const).map((sec) => sec.items.length > 0 && (
                <div key={sec.title} className="mt-4">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">{sec.title}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {sec.items.map((it) => (
                      <div key={it.id} className="flex items-center gap-2.5 rounded-xl border border-stone-900/10 bg-white/60 px-3 py-2">
                        <span className={sec.tint}>{it.icon}</span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-black leading-none tabular-nums text-stone-900">{fmt(history[it.id])}</p>
                          <p className="truncate text-[8px] uppercase tracking-wider text-stone-400">{(history[it.id] ?? 0) === 1 ? it.unitOne : it.unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {lifeEarned === 0 && lifeSpent === 0 && (
                <p className="mt-6 mb-2 text-center text-[12px] italic text-stone-400">No history yet — log a habit or grab a vice to start your tally.</p>
              )}
            </div>
          </div>
        )}

        {/* ─────────────── MONDAY RECAP (verdict on the week that just ended) ─────────────── */}
        {splashGone && recap && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setRecap(null)} />
            <div className="relative w-full max-w-[300px] overflow-hidden rounded-3xl border border-stone-900/10 bg-[#FAF8F4] shadow-2xl" style={{ animation: "fadeUp .3s ease" }}>
              <div className={`flex flex-col items-center bg-gradient-to-br ${VERDICTS[recap.verdict].grad} px-6 pb-5 pt-7 text-center text-white`}>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20" style={{ animation: "pop .5s ease" }}>
                  {VERDICTS[recap.verdict].icon}
                </div>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Last week&apos;s verdict</p>
                <h3 className="text-2xl font-black leading-tight">{VERDICTS[recap.verdict].title}</h3>
              </div>
              <div className="p-6 text-center">
                <p className="text-[13px] leading-relaxed text-stone-600">{VERDICTS[recap.verdict].body}</p>
                <div className="mt-4 flex justify-center gap-4 text-center">
                  <div>
                    <p className="text-lg font-black tabular-nums text-emerald-600">{fmt(recap.earned)}</p>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-stone-400">Earned</p>
                  </div>
                  <div>
                    <p className="text-lg font-black tabular-nums text-rose-600">{fmt(recap.spent)}</p>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-stone-400">Spent</p>
                  </div>
                </div>
                <button
                  onClick={() => setRecap(null)}
                  className="press mt-5 w-full rounded-xl bg-stone-900 py-3 text-[13px] font-bold text-white transition-colors hover:bg-stone-700"
                >
                  Start the week fresh
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
