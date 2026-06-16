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
  RotateCcw,
  Salad,
  Scale,
  Settings,
  Share2,
  ShoppingBag,
  Skull,
  Smartphone,
  Snowflake,
  Star,
  ThermometerSun,
  Trash2,
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
      { id: "rave",   label: "Rave / Festival", plural: "Raves",        unit: "raves",   unitOne: "rave",   me: 70, min: 1, max: 3, step: 1, def: 1, icon: <Zap className="w-4 h-4" /> },
      { id: "bender", label: "Full Bender",     plural: "Benders",      unit: "benders", unitOne: "bender", me: 90, min: 1, max: 2, step: 1, def: 1, icon: <Flame className="w-4 h-4" /> },
    ],
  },
];

const ALL_VICES: BarterItem<ViceId>[] = VICE_CATEGORIES.flatMap((c) => c.vices);

/** Store colour identity per vice category — each aisle gets its own energy so
 *  the shelf reads like a candy store, not a spreadsheet. Full literal class
 *  strings (no interpolation) so Tailwind keeps them. */
interface StoreTheme { label: string; tile: string; face: string; shadow: string; }
const STORE_THEME: Record<string, StoreTheme> = {
  drinks:  { label: "text-[#E6B65A]",   tile: "bg-gold",        face: "border-[#2A2F36] bg-[#1C1F24] hover:bg-[#23272E]", shadow: "" },
  smoke:   { label: "text-[#5FD08A]", tile: "bg-[#2FB85C]", face: "border-[#2A2F36] bg-[#1C1F24] hover:bg-[#23272E]", shadow: "" },
  digital: { label: "text-[#6FC0CC]",   tile: "bg-ocean",       face: "border-[#2A2F36] bg-[#1C1F24] hover:bg-[#23272E]", shadow: "" },
  nights:  { label: "text-[#C98AB0]",   tile: "bg-plum",        face: "border-[#2A2F36] bg-[#1C1F24] hover:bg-[#23272E]", shadow: "" },
};

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
    id: "quiet", title: "Quiet week", body: "You barely logged anything this week. Try to log a few things next week.",
    icon: <Hourglass className="h-7 w-7" />, grad: "bg-[#23272E]0", text: "text-[#AEB4BC]",
  },
  dork: {
    id: "dork", title: "Dork week", body: "You earned a lot and spent almost none of it. It's fine to spend some.",
    icon: <TrendingUp className="h-7 w-7" />, grad: "bg-gold", text: "text-[#E6B65A]",
  },
  balanced: {
    id: "balanced", title: "Balanced week", body: "You earned and spent about the same amount. That's the goal.",
    icon: <Scale className="h-7 w-7" />, grad: "bg-[#1FD173]", text: "text-[#3BE08C]",
  },
  degen: {
    id: "degen", title: "Degen week", body: "You spent more than you earned and went on the tab. Earn it back next week.",
    icon: <Skull className="h-7 w-7" />, grad: "bg-[#F0524B]", text: "text-[#FF6B66]",
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
  pts > 2.5 ? "bg-[#1FD173]" : pts < -2.5 ? "bg-[#F0524B]" : "bg-[#565B62]";

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
    tagline: "Spent about what you earned. The closer to even, the higher the score.",
    unit: "balance",
    icon: <Scale className="w-4 h-4" />,
    score: (f) => Math.round(moderationOf(f) * 100 * engagement(f)),
    text: "text-[#3BE08C]",
    chipOn: "border-[#1FD173] bg-[#1FD173] text-white",
    glow: "",
  },
  {
    id: "degen",
    label: "Degen",
    tagline: "Spent more than they earned and leaned on the tab.",
    unit: "degen",
    icon: <Skull className="w-4 h-4" />,
    score: (f) => Math.round(Math.min(spendRatio(f) / 2, 1) * 100 * engagement(f)),
    text: "text-[#FF6B66]",
    chipOn: "border-[#F0524B] bg-[#F0524B] text-white",
    glow: "",
  },
  {
    id: "dork",
    label: "Dork",
    tagline: "Earned a lot and spent little. Disciplined to a fault.",
    unit: "grind",
    icon: <TrendingUp className="w-4 h-4" />,
    score: (f) => Math.round(Math.max(0, 1 - spendRatio(f)) * 100 * engagement(f)),
    text: "text-[#E6B65A]",
    chipOn: "border-gold bg-gold text-white",
    glow: "",
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
    "Nothing logged yet. Add a workout or a meal to start earning points.",
    "You have no points yet. Log something healthy to get going.",
    "Empty for now. Earn a few points before you spend.",
  ],
  dork: [
    "You've earned a lot and spent almost nothing. It's fine to spend some.",
    "Plenty of points banked. Go enjoy one of your vices.",
    "You're well ahead. Spending a little is the whole idea.",
  ],
  balanced: [
    "You've spent about what you earned. That's the goal.",
    "Earned and spent are close to even. Good balance.",
    "Nicely balanced this week.",
  ],
  tab: [
    "You're on the tab. Earn points back before the interest grows.",
    "You spent more than you earned. Log a workout to pay it down.",
    "You owe points. Earn some back soon.",
  ],
  loose: [
    "You're spending faster than you earn. Ease up or earn more.",
    "Spending is outpacing earning. Add a healthy habit.",
    "Slow down, or bank some points back first.",
  ],
  neutral: [
    "Quiet so far. Earn or spend to move your balance.",
    "Not much logged. Add a habit or a vice.",
    "Log something to update your balance.",
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
  start: "bg-[#1FD173]/15 text-[#3BE08C]",
  dork: "bg-gold/10 text-[#E6B65A]",
  balanced: "bg-[#1FD173]/15 text-[#3BE08C]",
  tab: "bg-[#F0524B]/15 text-[#FF6B66]",
  loose: "bg-[#F0524B]/15 text-[#FF6B66]",
  neutral: "bg-[#252A30] text-[#AEB4BC]",
};

/** First-run onboarding — four quick cards, skippable at any point. */
const ONBOARD: { icon: React.ReactNode; title: string; body: string }[] = [
  { icon: <Scale className="h-7 w-7" />,       title: "Welcome to Vices.ai", body: "Do healthy things, bank points, then spend them on your vices — guilt-free." },
  { icon: <Dumbbell className="h-7 w-7" />,    title: "Earn your allowance", body: "Log a run, a workout, a sauna — every healthy move banks points toward your weekly goal." },
  { icon: <ShoppingBag className="h-7 w-7" />, title: "Spend in the Store",  body: "Cash your points in on the good stuff. A beer, a night out — you earned it." },
  { icon: <Users className="h-7 w-7" />,       title: "Stay balanced",       body: "Too much grind or too much vice both cost you. Keep it even and climb the leaderboard." },
];

/** Confetti palettes for the log-entry burst. */
const CONFETTI_GOOD = ["#1FD173", "#34d399", "#0ea5e9", "#a3e635"];
const CONFETTI_BAD = ["#f59e0b", "#fb923c", "#3B82F6", "#facc15"];

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

  /** A vice tapped in the Store that would push you into debt — awaits a yes/no. */
  const [pendingBuy, setPendingBuy] = useState<BarterItem<ViceId> | null>(null);

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

  /** Settings sheet + a two-tap arm so a reset can't fire by accident. */
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [confirmReset, setConfirmReset] = useState<string | null>(null);

  /** The tab: when set, you owe money and the 36-hour clock is running. */
  const [loanDueAt, setLoanDueAt] = useState<number | null>(null);
  /** Ticks once a second while the tab is open so the countdown stays live. */
  const [now, setNow] = useState<number>(() => Date.now());

  /** Monday recap modal — set on load when a finished week is detected. */
  const [recap, setRecap] = useState<WeekRecord | null>(null);

  /** Shareable "Your Week, Wrapped" card — openable any time from the dashboard. */
  const [wrappedOpen, setWrappedOpen] = useState<boolean>(false);

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
      ? { label: "Ahead",  dot: "bg-[#1FD173]", text: "text-[#3BE08C]", glow: "" }
      : netME < -2.5
      ? { label: "Behind", dot: "bg-[#F0524B]",    text: "text-[#FF6B66]",    glow: "" }
      : { label: "Even",   dot: "bg-[#7B818A]",   text: "text-[#8B9099]",   glow: "" };

  // ── Dashboard rings (Apple-Fitness style) ───────────────────────────────
  //  Outer ring = progress toward this week's earn goal; inner = how much of
  //  what you earned has already been spent.
  const goalProgress = Math.min(earnedME / WEEKLY_GOAL, 1);
  const burnProgress = earnedME > 0 ? Math.min(spentME / earnedME, 1) : 0;


  // ── Actions ─────────────────────────────────────────────────────────────
  /** Shower of particles off whatever just got tapped (green = earn, warm = spend). */
  // Confetti removed — flat, plain interface.
  const fireBurst = (_good: boolean): void => {};

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

  /** Share a week's recap — native share sheet where supported, clipboard otherwise.
   *  Powers both the always-on Wrapped card and the Monday recap. */
  const shareWeek = async (earned: number, spent: number): Promise<void> => {
    const vd = VERDICTS[weekVerdict(earned, spent)];
    const text = `My Vices.ai week — ${vd.title}. Earned ${fmt(earned)} points, spent ${fmt(spent)}${streak > 0 ? `, ${streak}-day streak` : ""}. vices.ai`;
    try {
      const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { share?: (d: { title: string; text: string }) => Promise<void> }) : undefined;
      if (nav?.share) {
        await nav.share({ title: "My Vices.ai Week", text });
      } else if (nav?.clipboard) {
        await nav.clipboard.writeText(text);
        const id = Date.now();
        setToast({ id, text: "Copied — paste it anywhere", pts: 0 });
        window.setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 1800);
      }
    } catch { /* user dismissed the share sheet */ }
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

  /** Store tap: buy outright if you can afford it, otherwise ask before the tab. */
  const requestBuy = (v: BarterItem<ViceId>): void => {
    if (spentME + v.me > earnedME) setPendingBuy(v);
    else buyVice(v);
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

  // ── Resets (Settings) ───────────────────────────────────────────────────
  /** Wipe this week's ledger — points, tab, last move — keep all-time history. */
  const resetWeek = (): void => { setEarnedME(0); setSpentME(0); setLastEntry(null); setLoanDueAt(null); };
  /** Set the daily streak back to zero. */
  const resetStreak = (): void => { setStreak(0); setLastLogDay(null); };
  /** Erase lifetime tallies and every archived week. */
  const resetHistory = (): void => { setHistory({}); setLifeEarned(0); setLifeSpent(0); setWeeks([]); };
  /** Full wipe — like a fresh install (friends fall back to the demo cohort). */
  const resetAll = (): void => { resetWeek(); resetStreak(); resetHistory(); setFriends(SEED_FRIENDS); setRecap(null); setCoachIdx(0); };

  /** Two-tap guard: first tap arms a reset, second within 3s runs it. */
  const armOrRun = (id: string, fn: () => void): void => {
    if (confirmReset === id) {
      fn();
      setConfirmReset(null);
      setSettingsOpen(false);
      const tid = Date.now();
      setToast({ id: tid, text: "Reset done", pts: 0 });
      window.setTimeout(() => setToast((t) => (t && t.id === tid ? null : t)), 1400);
    } else {
      setConfirmReset(id);
      window.setTimeout(() => setConfirmReset((c) => (c === id ? null : c)), 3000);
    }
  };

  // ── Mode-dependent accent classes (vibrant on eggshell) ─────────────────
  const accent = {
    text: "text-[#3BE08C]",
    slider: "",
    chip: "border-[#1FD173] bg-[#1FD173]/15 text-[#3BE08C]",
    btn: "bg-[#1FD173] hover:bg-[#16B863]",
  };

  const glass = "rounded-xl border border-[#2A2F36] bg-[#1C1F24]";

  // ══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="relative min-h-dvh w-full bg-[#0E1013] font-sans text-white antialiased lg:flex lg:items-center lg:justify-center lg:p-8">
      {/* Scoped styles: scrollbars, sliders, splash loader, interaction FX */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .vslider { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 9999px; background: #3A3F46; outline: none; }
        .vslider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 9999px; cursor: pointer; background: #1FD173; }
        .vslider::-moz-range-thumb { width: 18px; height: 18px; border: none; border-radius: 9999px; cursor: pointer; background: #1FD173; }
        .press { transition: transform .12s ease; }
        .press:active { transform: scale(0.97); }
        @keyframes loadbar { from { width: 0%; } to { width: 100%; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes pop { 0% { transform: scale(.9); } 100% { transform: scale(1); } }
        @keyframes toastIn { 0% { opacity: 0; transform: translate(-50%, 12px); } 12% { opacity: 1; transform: translate(-50%, 0); } 88% { opacity: 1; transform: translate(-50%, 0); } 100% { opacity: 0; transform: translate(-50%, -8px); } }
      `}</style>

      {/* ─────────────── PHONE FRAME ───────────────
          Mobile: fills the native viewport edge-to-edge.
          Desktop: centered device mock-up with a plain bezel. */}
      <div className="relative h-dvh w-full overflow-hidden bg-[#121417] lg:h-[844px] lg:max-h-[94vh] lg:w-[390px] lg:rounded-[48px] lg:ring-[10px] lg:ring-stone-900 lg:shadow-[0_30px_70px_-25px_rgba(0,0,0,0.45)]">

        {/* Notch — desktop mock-up only */}
        <div className="absolute left-1/2 top-3.5 z-40 hidden h-7 w-32 -translate-x-1/2 rounded-full bg-black lg:block" />

        {/* ─────────────── SPLASH / LOADING SCREEN ─────────────── */}
        {!splashGone && (
          <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#121417] transition-opacity duration-500 ${splashFading ? "opacity-0" : "opacity-100"}`}>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1FD173]">
              <Scale className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-white">
              Vices<span className="text-[#3BE08C]">.ai</span>
            </h1>
            <p className="mt-2 text-sm text-[#8B9099]">Earn your vices.</p>
            <div className="mt-7 h-1 w-36 overflow-hidden rounded-full bg-[#2A2F36]">
              <div className="h-full rounded-full bg-[#1FD173]" style={{ animation: "loadbar 2.2s ease-out forwards" }} />
            </div>
          </div>
        )}

        {/* ─────────────── FIRST-RUN TUTORIAL (4 steps, skip anytime) ─────────────── */}
        {splashGone && onboardStep >= 0 && onboardStep < ONBOARD.length && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
            {/* Tap the backdrop to dismiss */}
            <div className="absolute inset-0 bg-black/65" onClick={dismissOnboard} />
            <div
              key={onboardStep}
              className="relative w-full max-w-[300px] rounded-3xl border border-white/10 bg-[#FAF8F4] p-6 shadow-2xl"
              style={{ animation: "fadeUp .3s ease" }}
            >
              <button
                onClick={dismissOnboard}
                className="absolute right-4 top-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B818A] transition-colors hover:text-[#C7CCD3]"
              >
                Skip
              </button>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1FD173] text-white">
                {ONBOARD[onboardStep].icon}
              </div>
              <h3 className="mt-4 text-lg font-black leading-tight text-white">{ONBOARD[onboardStep].title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#8B9099]">{ONBOARD[onboardStep].body}</p>
              <div className="mt-5 flex items-center gap-1.5">
                {ONBOARD.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-all ${i === onboardStep ? "w-5 bg-[#1FD173]" : "w-1.5 bg-white/15"}`} />
                ))}
              </div>
              <button
                onClick={() => (onboardStep === ONBOARD.length - 1 ? dismissOnboard() : setOnboardStep((s) => s + 1))}
                className="press mt-5 w-full rounded-xl bg-[#1FD173] py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#16B863]"
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
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1FD173]">
                <Scale className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-lg font-black leading-none tracking-tight text-white">
                Vices<span className="text-[#3BE08C]">.ai</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {streak > 0 && (
                <div className="flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-1" title={`${streak}-day streak`}>
                  <Flame className="h-3.5 w-3.5 text-[#E6B65A]" />
                  <span className="text-[12px] font-bold tabular-nums text-[#E6B65A]">{streak}</span>
                </div>
              )}
              <div className="flex flex-col items-end gap-1">
                <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#7B818A]">Life Balance</span>
                <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#1C1F24] px-2.5 py-1">
                  <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${status.dot} ${status.glow}`} />
                  <span className={`text-[10px] font-semibold ${status.text}`}>{status.label}</span>
                  <span className={`text-[11px] font-black tabular-nums ${status.text}`}>
                    {netME >= 0 ? "+" : ""}{fmt(netME)} pts
                  </span>
                </div>
                <span className="text-[7px] font-semibold uppercase tracking-[0.2em] text-[#6E747C]/80">resets every monday</span>
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
                    <p className="text-[11px] font-semibold text-[#7B818A]">{greeting()}</p>
                    <h2 className="text-lg font-black leading-tight text-white">Here&apos;s your balance</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWrappedOpen(true)}
                      className="press flex h-9 w-9 items-center justify-center rounded-full border border-[#2A2F36] bg-[#1C1F24] text-[#AEB4BC] transition-colors hover:bg-[#23272E]"
                      aria-label="Weekly Wrapped"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setHistoryOpen(true)}
                      className="press flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#1C1F24] text-[#8B9099] shadow-sm transition-colors hover:text-white"
                      aria-label="History"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setConfirmReset(null); setSettingsOpen(true); }}
                      className="press flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#1C1F24] text-[#8B9099] shadow-sm transition-colors hover:text-white"
                      aria-label="Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setMode("allowance")}
                      className="press flex items-center gap-1 rounded-full bg-[#1FD173] px-3.5 py-2 text-[11px] font-semibold text-white hover:bg-[#16B863]"
                    >
                      <Zap className="h-3.5 w-3.5" /> Log
                    </button>
                  </div>
                </div>

                {/* The tab — live countdown while you owe against future effort */}
                {onTab && (
                  <button
                    onClick={() => setMode("allowance")}
                    className={`press relative flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-[#F0524B] p-4 text-left text-white`}
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
                <div className="rounded-3xl border border-white/10 bg-[#1C1F24] p-5 shadow-sm">
                  <div className="flex items-center gap-5">
                    <div className="relative h-[132px] w-[132px] flex-shrink-0">
                      <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
                        <circle cx="66" cy="66" r="58" fill="none" stroke="rgba(31,209,115,0.22)" strokeWidth="11" />
                        <circle cx="66" cy="66" r="44" fill="none" stroke="rgba(59,130,246,0.20)" strokeWidth="11" />
                        <circle
                          cx="66" cy="66" r="58" fill="none" stroke="#1FD173" strokeWidth="11" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 58} strokeDashoffset={2 * Math.PI * 58 * (1 - goalProgress)}
                          style={{ transition: "stroke-dashoffset .6s ease" }}
                        />
                        <circle
                          cx="66" cy="66" r="44" fill="none" stroke="#3B82F6" strokeWidth="11" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 44} strokeDashoffset={2 * Math.PI * 44 * (1 - burnProgress)}
                          style={{ transition: "stroke-dashoffset .6s ease" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span key={wallet} className="text-3xl font-black leading-none tabular-nums text-white" style={{ animation: "pop .25s ease" }}>{fmt(wallet)}</span>
                        <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#7B818A]">to spend</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-[#1FD173]" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7B818A]">Earned</span>
                        </div>
                        <p className="text-xl font-black tabular-nums text-[#3BE08C]">{fmt(earnedME)} <span className="text-xs font-semibold text-[#7B818A]">/ {WEEKLY_GOAL}</span></p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-[#3B82F6]" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7B818A]">Spent</span>
                        </div>
                        <p className="text-xl font-black tabular-nums text-[#6BA5FF]">{fmt(spentME)} <span className="text-xs font-semibold text-[#7B818A]">pts</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* The coach — a foul-mouthed read on how you're playing. Tap to reroll. */}
                <button
                  onClick={() => setCoachIdx((i) => i + 1)}
                  className="press flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1C1F24] px-4 py-3 text-left"
                  aria-label="Coach says — tap for another"
                >
                  <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${COACH_TINT[coachMood]}`}>
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <p key={`${coachMood}-${coachIdx}`} className="flex-1 text-[12.5px] font-semibold leading-snug text-[#C7CCD3]" style={{ animation: "fadeUp .3s ease" }}>
                    {coachLine}
                  </p>
                </button>

                {/* Weekly goal bar (Duolingo progression) */}
                <div className="rounded-2xl border border-white/10 bg-[#23272E] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B9099]"><TrendingUp className="h-3.5 w-3.5" /> Weekly goal</span>
                    <span className="text-[11px] font-bold tabular-nums text-[#8B9099]">{fmt(earnedME)} / {WEEKLY_GOAL}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#1FD173]" style={{ width: `${goalProgress * 100}%`, transition: "width .6s ease" }} />
                  </div>
                  <p className="mt-2 text-[10px] text-[#7B818A]">
                    {goalProgress >= 1 ? "Goal smashed — you've earned the weekend." : `${fmt(WEEKLY_GOAL - earnedME)} pts to hit this week's goal.`}
                  </p>
                </div>


                {/* Last move */}
                <div className="mt-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-[#23272E] px-4 py-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/5 text-[#8B9099]"><Activity className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#7B818A]">Last move</p>
                    <p className="truncate text-[12px] font-semibold text-[#C7CCD3]">{lastEntry ?? "Nothing yet — log your first habit."}</p>
                  </div>
                </div>
              </>
            ) : isFriends ? (
              <>
                {/* Leaderboard: one squad, four ways to judge it */}
                <div>
                  <h2 className={`text-xs font-bold uppercase tracking-[0.18em] ${accent.text}`}>Leaderboard</h2>
                  <p className="mt-1 text-[11px] italic text-[#7B818A]">Your circle, ranked. Pick the lens.</p>
                </div>
                <div className="flex gap-2">
                  <input
                    value={newFriend}
                    onChange={(e) => setNewFriend(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addFriend()}
                    placeholder="Add a friend by name"
                    className="min-w-0 flex-1 rounded-xl border border-white/12 bg-[#1C1F24] px-3.5 py-2.5 text-sm text-white placeholder:text-[#7B818A] focus:border-white/20 focus:outline-none"
                  />
                  <button
                    onClick={addFriend}
                    className="press flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#1FD173] text-white transition-colors hover:bg-[#16B863]"
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
                        className={`press flex flex-col items-center gap-1 rounded-xl border py-2 transition-colors ${on ? m.chipOn : "border-white/10 bg-[#23272E] text-[#7B818A] hover:text-[#AEB4BC]"}`}
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
                  <p className="text-[10px] italic leading-relaxed text-[#7B818A]" style={{ animation: "fadeUp .3s ease" }}>
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
                          className={`relative flex flex-col items-center gap-0.5 rounded-2xl border px-1.5 text-center ${first ? "border-white/12 bg-[#1C1F24] pb-3.5 pt-5 shadow-xl" : "border-white/10 bg-[#1C1F24] py-3"} ${f.you ? "ring-2 ring-[#1FD173]/60" : ""}`}
                          style={
                            first
                              ? ({ animation: "fadeUp .45s ease both" } as React.CSSProperties)
                              : { animation: `fadeUp .4s ease ${ci * 80}ms both` }
                          }
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1FD173] text-[9px] font-bold text-white">{rank}</span>
                          <p className="w-full truncate text-[11px] font-bold text-white">{f.name}</p>
                          <p className={`text-lg font-black leading-none tabular-nums ${activeMetric.text}`}>{fmt(activeMetric.score(f))}</p>
                          <p className="text-[7px] uppercase tracking-wider text-[#7B818A]">{activeMetric.unit}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Everyone off the podium */}
                  {restRows.map((f, i) => (
                    <div
                      key={f.name}
                      className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${f.you ? "border-white/20 bg-[#1C1F24] shadow-sm" : "border-white/10 bg-[#1C1F24]"}`}
                      style={{ animation: `fadeUp .35s ease ${200 + i * 70}ms both` }}
                    >
                      <span className="w-4 flex-shrink-0 text-xs font-bold tabular-nums text-[#7B818A]">{i + 4}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-white">{f.name}</p>
                        <p className="truncate text-[10px] text-[#7B818A]">{f.last}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className={`text-base font-bold leading-none tabular-nums ${activeMetric.text}`}>{fmt(activeMetric.score(f))}</p>
                        <p className="mt-0.5 text-[8px] uppercase tracking-wider text-[#7B818A]">{activeMetric.unit}</p>
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
                <div className={`relative flex flex-shrink-0 items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5 text-white ${onTab ? "bg-[#F0524B]" : "bg-[#1FD173]"}`}>
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
                  {VICE_CATEGORIES.map((cat) => {
                    const th = STORE_THEME[cat.id];
                    return (
                    <div key={cat.id}>
                      <div className={`mb-1.5 flex items-center gap-1.5 ${th.label}`}>
                        {cat.icon}
                        <span className="text-[10px] font-black uppercase tracking-[0.18em]">{cat.label}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {cat.vices.map((v, vi) => {
                          const afford = netME >= v.me;
                          return (
                            <button
                              key={v.id}
                              onClick={() => requestBuy(v)}
                              style={{ animation: `fadeUp .25s ease ${vi * 30}ms both` }}
                              className={`press relative flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${afford ? `${th.face} ${th.shadow} hover:shadow-md` : "border-white/10 bg-[#23272E] hover:bg-[#22262C]"}`}
                            >
                              <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg shadow-sm ${afford ? `${th.tile} text-white` : "bg-white/5 text-[#7B818A]"}`}>
                                {v.icon}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className={`block truncate text-[12px] font-semibold ${afford ? "text-white" : "text-[#7B818A]"}`}>{v.label}</span>
                                <span className={`block text-[10px] font-bold tabular-nums ${afford ? th.label : "text-[#7B818A]"}`}>
                                  {afford ? `${fmt(v.me)} pts` : `${fmt(v.me)} pts · on tab`}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* ── EARNED ALLOWANCE: pick → set amount → log. One clean flow. ── */}
                <h2 className={`text-xs font-bold uppercase tracking-[0.18em] ${accent.text}`}>Earned Allowance</h2>

                {/* Activity selector — opens the habit bottom-sheet */}
                <button
                  onClick={openHabitSheet}
                  className="press flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#1C1F24] px-4 py-3.5 text-left shadow-sm transition-colors hover:bg-[#22262C]"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#1FD173]/10 text-[#3BE08C]">
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7B818A]">Activity</span>
                    <span className="block truncate text-sm font-bold text-white">{item.label}</span>
                  </span>
                  <span className="flex-shrink-0 text-[10px] tabular-nums text-[#7B818A]">{fmt(item.me)} pts each</span>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-[#7B818A]" />
                </button>

                {/* Quantity — hero number + slider */}
                <div className="rounded-2xl border border-white/10 bg-[#23272E] p-4">
                  <div className="flex items-end justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7B818A]">How many</span>
                    <span className={`flex items-baseline gap-1.5 font-black tabular-nums ${accent.text}`}>
                      <span key={qty} className="text-3xl leading-none" style={{ animation: "pop .2s ease" }}>{fmt(qty)}</span>
                      <span className="text-xs font-semibold text-[#7B818A]">{qty === 1 ? item.unitOne : item.unit}</span>
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
                <div className="rounded-2xl border border-white/10 bg-[#23272E] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7B818A]">That effort buys — take your pick</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {spendSingles.map(({ v, n }, i) => (
                      <div
                        key={v.id}
                        className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-[#1C1F24] py-2.5"
                        style={{ animation: `fadeUp .25s ease ${i * 50}ms both` }}
                      >
                        <span className={accent.text}>{v.icon}</span>
                        <span className="text-xl font-black leading-none tabular-nums text-white">{n}</span>
                        <span className="text-[8px] uppercase tracking-wider text-[#7B818A]">{n === 1 ? v.unitOne : v.unit}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 border-t border-white/8 pt-2.5 text-[11px] text-[#8B9099]">
                    or mix it: <span className={`font-bold ${accent.text}`}>{comboLine}</span>
                  </p>
                </div>

                {/* This week — compact progress toward the weekly goal */}
                <div className="mt-auto rounded-2xl border border-white/10 bg-[#23272E] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7B818A]">This week</span>
                    <span className="text-[10px] tabular-nums">
                      <span className="font-bold text-[#3BE08C]">+{fmt(earnedME)}</span> earned&nbsp;·&nbsp;
                      <span className="font-bold text-[#6BA5FF]">−{fmt(spentME)}</span> spent
                    </span>
                  </div>
                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#1FD173]" style={{ width: `${goalProgress * 100}%`, transition: "width .6s ease" }} />
                  </div>
                  <p className="mt-1.5 text-[9px] text-[#7B818A]">
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
          <nav className="flex flex-shrink-0 rounded-2xl border border-[#2A2F36] bg-[#252A30] p-1">
            {TABS.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`press flex flex-1 flex-col items-center gap-1 rounded-xl py-2 transition-colors ${mode === id ? "bg-[#1FD173] text-white" : "text-[#7B818A] hover:text-[#AEB4BC]"}`}
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
            className="pointer-events-none absolute bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#252A30] border border-white/10 px-4 py-2 text-white"
            style={{ animation: "toastIn 1.8s ease forwards" }}
          >
            <ShoppingBag className="h-3.5 w-3.5 text-white" />
            <span className="text-[12px] font-semibold">{toast.text}</span>
            {toast.pts !== 0 && (
              <span className="text-[12px] font-black tabular-nums text-white">{toast.pts < 0 ? "−" : "+"}{fmt(Math.abs(toast.pts))} pts</span>
            )}
          </div>
        )}

        {/* ─────────────── CATEGORIZED HABIT PICKER (bottom sheet) ─────────────── */}
        {habitPickerOpen && (
          <div className="absolute inset-0 z-30">
            <div className="absolute inset-0 bg-black/60" onClick={() => setHabitPickerOpen(false)} />
            <div className="no-scrollbar absolute inset-x-0 bottom-0 max-h-[75%] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#121417] p-5" style={{ animation: "fadeUp .3s ease" }}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/12" />
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#8B9099]">What did you do?</h3>
              <div className="space-y-2">
                {HABIT_CATS.map((cat) => {
                  // Single-option categories (Water) select straight from the row.
                  const single = cat.options.length === 1;
                  const open = openHabitCat === cat.id;
                  return (
                    <div key={cat.id} className="overflow-hidden rounded-xl border border-white/10 bg-[#1C1F24]">
                      <button
                        onClick={() => (single ? selectHabit(cat.options[0]) : setOpenHabitCat(open ? "" : cat.id))}
                        className="press flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-[#22262C]/5"
                      >
                        <span className="text-[#3BE08C]">{cat.icon}</span>
                        <span className="flex-1 text-left text-sm font-semibold text-white">{cat.label}</span>
                        {single ? (
                          <>
                            <span className="text-[10px] text-[#7B818A]">{fmt(cat.options[0].me)} pts</span>
                            {habitId === cat.options[0].id && <Check className="h-3.5 w-3.5 text-[#3BE08C]" />}
                          </>
                        ) : (
                          <ChevronDown className={`h-4 w-4 text-[#7B818A] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                        )}
                      </button>
                      {!single && open && (
                        <div className="border-t border-white/8">
                          {cat.options.map((h, hi) => (
                            <button
                              key={h.id}
                              onClick={() => selectHabit(h)}
                              className="press flex w-full items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#22262C]/5"
                              style={{ animation: `fadeUp .25s ease ${hi * 40}ms both` }}
                            >
                              <span className="text-[#7B818A]">{h.icon}</span>
                              <span className="flex-1 text-left text-[13px] text-[#C7CCD3]">{h.label}</span>
                              <span className="text-[10px] text-[#7B818A]">{fmt(h.me)} pts</span>
                              {habitId === h.id && <Check className="h-3.5 w-3.5 text-[#3BE08C]" />}
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
            <div className="absolute inset-0 bg-black/60" onClick={() => setHistoryOpen(false)} />
            <div className="no-scrollbar absolute inset-x-0 bottom-0 max-h-[82%] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#121417] p-5" style={{ animation: "fadeUp .3s ease" }}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/12" />
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#8B9099]">Your history · all time</h3>

              {/* All-time totals */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  { label: "Earned", value: lifeEarned, cls: "text-[#3BE08C]" },
                  { label: "Spent", value: lifeSpent, cls: "text-[#6BA5FF]" },
                  { label: "Net", value: round2(lifeEarned - lifeSpent), cls: "text-white" },
                ] as const).map((s) => (
                  <div key={s.label} className="rounded-xl border border-white/10 bg-[#1C1F24] px-3 py-2.5 text-center">
                    <p className={`text-lg font-black leading-none tabular-nums ${s.cls}`}>{fmt(s.value)}</p>
                    <p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-[#7B818A]">{s.label} pts</p>
                  </div>
                ))}
              </div>

              {/* Past weeks */}
              {weeks.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7B818A]">Past weeks</p>
                  <div className="space-y-1.5">
                    {weeks.slice(0, 6).map((w) => {
                      const vd = VERDICTS[w.verdict];
                      return (
                        <div key={w.week} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1C1F24] px-3.5 py-2">
                          <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${vd.grad} text-white`}>
                            {React.cloneElement(vd.icon as React.ReactElement, { className: "h-3.5 w-3.5" })}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-bold text-white">{vd.title}</p>
                            <p className="text-[9px] text-[#7B818A]">Week of {w.week}</p>
                          </div>
                          <p className="flex-shrink-0 text-[10px] tabular-nums text-[#7B818A]">+{fmt(w.earned)} · −{fmt(w.spent)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lifetime tallies per item */}
              {([
                { title: "Healthy logged", items: ALL_HABITS.filter((h) => (history[h.id] ?? 0) > 0), tint: "text-[#3BE08C]" },
                { title: "Vices enjoyed", items: ALL_VICES.filter((v) => (history[v.id] ?? 0) > 0), tint: "text-[#6BA5FF]" },
              ] as const).map((sec) => sec.items.length > 0 && (
                <div key={sec.title} className="mt-4">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7B818A]">{sec.title}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {sec.items.map((it) => (
                      <div key={it.id} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#1C1F24] px-3 py-2">
                        <span className={sec.tint}>{it.icon}</span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-black leading-none tabular-nums text-white">{fmt(history[it.id])}</p>
                          <p className="truncate text-[8px] uppercase tracking-wider text-[#7B818A]">{(history[it.id] ?? 0) === 1 ? it.unitOne : it.unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {lifeEarned === 0 && lifeSpent === 0 && (
                <p className="mt-6 mb-2 text-center text-[12px] italic text-[#7B818A]">No history yet — log a habit or grab a vice to start your tally.</p>
              )}
            </div>
          </div>
        )}

        {/* ─────────────── SETTINGS SHEET (resets) ─────────────── */}
        {settingsOpen && (
          <div className="absolute inset-0 z-40">
            <div className="absolute inset-0 bg-black/60" onClick={() => { setSettingsOpen(false); setConfirmReset(null); }} />
            <div className="no-scrollbar absolute inset-x-0 bottom-0 max-h-[82%] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#121417] p-5" style={{ animation: "fadeUp .3s ease" }}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/12" />
              <div className="mb-1 flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#8B9099]" />
                <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B9099]">Settings</h3>
              </div>
              <p className="mb-3 text-[11px] italic text-[#7B818A]">Restart your progress. Tap a reset twice to confirm.</p>
              <div className="space-y-2">
                {([
                  { id: "week",    icon: <RotateCcw className="h-4 w-4" />,    label: "Reset this week",      sub: "Clear this week's points, tab & last move. Keeps all-time history.", danger: false, fn: resetWeek },
                  { id: "streak",  icon: <Flame className="h-4 w-4" />,        label: "Reset day streak",     sub: `Set your ${streak}-day streak back to zero.`, danger: false, fn: resetStreak },
                  { id: "history", icon: <Trash2 className="h-4 w-4" />,       label: "Clear all-time history", sub: "Wipe lifetime tallies and every past week.", danger: true, fn: resetHistory },
                  { id: "all",     icon: <Trash2 className="h-4 w-4" />,       label: "Reset everything",     sub: "Full wipe — like a brand-new install.", danger: true, fn: resetAll },
                ] as const).map((r) => {
                  const armed = confirmReset === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => armOrRun(r.id, r.fn)}
                      className={`press flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${armed ? "border-[#F0524B] bg-[#F0524B]/10" : "border-white/10 bg-[#1C1F24] hover:bg-[#22262C]"}`}
                    >
                      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${armed ? "bg-[#F0524B] text-white" : r.danger ? "bg-[#F0524B]/15 text-[#FF6B66]" : "bg-[#252A30] text-[#AEB4BC]"}`}>
                        {r.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[13px] font-bold ${armed ? "text-[#FF6B66]" : "text-white"}`}>{armed ? "Tap again to confirm" : r.label}</span>
                        <span className="block text-[10px] text-[#7B818A]">{armed ? "This can't be undone." : r.sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-center text-[10px] text-[#7B818A]">Vices.ai · resets every Monday on its own, too.</p>
            </div>
          </div>
        )}

        {/* ─────────────── GOING-INTO-DEBT CONFIRM (Store) ─────────────── */}
        {pendingBuy && (() => {
          const v = pendingBuy;
          const newDebt = round2(v.me - netME);              // what you'd owe after this
          const due = loanDueAt ?? (Date.now() + LOAN_WINDOW_MS);
          const interest = loanInterest(newDebt, due, Date.now());
          return (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
              <div className="absolute inset-0 bg-black/65" onClick={() => setPendingBuy(null)} />
              <div className="relative w-full max-w-[300px] overflow-hidden rounded-3xl border border-white/10 bg-[#FAF8F4] shadow-2xl" style={{ animation: "fadeUp .3s ease" }}>
                <div className="flex flex-col items-center bg-[#F0524B] px-6 pb-5 pt-7 text-center text-white">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20" style={{ animation: "pop .5s ease" }}>
                    <Receipt className="h-7 w-7" />
                  </div>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Going on the tab</p>
                  <h3 className="text-2xl font-black leading-tight">Hold up.</h3>
                </div>
                <div className="p-6 text-center">
                  <p className="text-[13px] leading-relaxed text-[#AEB4BC]">
                    You don&apos;t have the points for a <span className="font-bold text-white">{v.label.toLowerCase()}</span>. Put it on the tab and you&apos;ll owe <span className="font-black text-[#FF6B66]">{fmt(newDebt + interest)} pts</span> within <span className="font-bold">36 hours</span>.
                  </p>
                  <p className="mt-2 text-[11px] text-[#7B818A]">{fmt(newDebt)} borrowed + {fmt(interest)} interest · interest climbs if you&apos;re late.</p>
                  <div className="mt-5 flex flex-col gap-2">
                    <button
                      onClick={() => { buyVice(v); setPendingBuy(null); }}
                      className="press w-full rounded-xl bg-[#F0524B] py-3 text-[13px] font-semibold text-white hover:opacity-90"
                    >
                      Send it — put it on the tab
                    </button>
                    <button
                      onClick={() => setPendingBuy(null)}
                      className="press w-full rounded-xl border border-white/10 bg-[#1C1F24] py-3 text-[13px] font-bold text-[#C7CCD3] transition-colors hover:bg-[#23272E]"
                    >
                      Nope, I&apos;ll earn it first
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─────────────── MONDAY RECAP (verdict on the week that just ended) ─────────────── */}
        {splashGone && recap && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/65" onClick={() => setRecap(null)} />
            <div className="relative w-full max-w-[300px] overflow-hidden rounded-3xl border border-white/10 bg-[#FAF8F4] shadow-2xl" style={{ animation: "fadeUp .3s ease" }}>
              <div className={`flex flex-col items-center ${VERDICTS[recap.verdict].grad} px-6 pb-5 pt-7 text-center text-white`}>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20" style={{ animation: "pop .5s ease" }}>
                  {VERDICTS[recap.verdict].icon}
                </div>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Last week&apos;s verdict</p>
                <h3 className="text-2xl font-black leading-tight">{VERDICTS[recap.verdict].title}</h3>
              </div>
              <div className="p-6 text-center">
                <p className="text-[13px] leading-relaxed text-[#AEB4BC]">{VERDICTS[recap.verdict].body}</p>
                <div className="mt-4 flex justify-center gap-4 text-center">
                  <div>
                    <p className="text-lg font-black tabular-nums text-[#3BE08C]">{fmt(recap.earned)}</p>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-[#7B818A]">Earned</p>
                  </div>
                  <div>
                    <p className="text-lg font-black tabular-nums text-[#6BA5FF]">{fmt(recap.spent)}</p>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-[#7B818A]">Spent</p>
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => shareWeek(recap.earned, recap.spent)}
                    className="press flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1FD173] py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#16B863]"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                  <button
                    onClick={() => setRecap(null)}
                    className="press flex-1 rounded-xl border border-white/10 bg-[#1C1F24] py-3 text-[13px] font-bold text-[#C7CCD3] transition-colors hover:bg-[#23272E]"
                  >
                    Start fresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────── YOUR WEEK, WRAPPED (shareable card · Idea 3) ─────────────── */}
        {splashGone && wrappedOpen && (() => {
          const vd = VERDICTS[weekVerdict(earnedME, spentME)];
          const bal = Math.round(moderationOf({ earned: earnedME, spent: spentME }) * 100);
          return (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-5">
              <div className="absolute inset-0 bg-black/70" onClick={() => setWrappedOpen(false)} />
              <div className="relative w-full max-w-[320px] overflow-hidden rounded-[28px] shadow-2xl" style={{ animation: "pop .35s ease" }}>
                {/* Gradient poster — built to be screenshotted */}
                <div className={`relative ${vd.grad} p-6 text-white`}>
                  <div className="pointer-events-none absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_82%_8%,#fff,transparent_40%),radial-gradient(circle_at_8%_92%,#fff,transparent_35%)]" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em]"><Scale className="h-3.5 w-3.5" /> Vices.ai</span>
                      <button onClick={() => setWrappedOpen(false)} className="press flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm font-black leading-none" aria-label="Close">×</button>
                    </div>
                    <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">Your week, wrapped</p>
                    <h3 className="text-3xl font-black leading-none">{vd.title}</h3>
                    <div className="mt-5 grid grid-cols-2 gap-2.5">
                      {([
                        { v: `${fmt(earnedME)}`, l: "Earned" },
                        { v: `${fmt(spentME)}`, l: "Spent" },
                        { v: `${bal}`, l: "Balance", suf: "/100" },
                      ] as const).map((s) => (
                        <div key={s.l} className="rounded-2xl bg-white/15 p-3">
                          <p className="text-2xl font-black leading-none tabular-nums">{s.v}{"suf" in s && <span className="text-sm">{s.suf}</span>}</p>
                          <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/80">{s.l}</p>
                        </div>
                      ))}
                      <div className="rounded-2xl bg-white/15 p-3">
                        <p className="flex items-center gap-1 text-2xl font-black leading-none tabular-nums">{streak} <Flame className="h-5 w-5" /></p>
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/80">Day streak</p>
                      </div>
                    </div>
                    <p className="mt-4 text-[12.5px] font-semibold leading-snug text-white/90">{vd.body}</p>
                  </div>
                </div>
                {/* Footer actions on white */}
                <div className="flex gap-2 bg-[#1C1F24] p-4">
                  <button
                    onClick={() => shareWeek(earnedME, spentME)}
                    className="press flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1FD173] py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#16B863]"
                  >
                    <Share2 className="h-4 w-4" /> Share my week
                  </button>
                  <button
                    onClick={() => setWrappedOpen(false)}
                    className="press rounded-xl border border-white/10 bg-[#1C1F24] px-4 py-3 text-[13px] font-bold text-[#AEB4BC] transition-colors hover:bg-[#23272E]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
