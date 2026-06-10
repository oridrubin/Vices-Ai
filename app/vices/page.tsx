"use client";

import { useState, useEffect } from "react";
import { Plus, Minus, ChevronLeft } from "lucide-react";

// ── Internal calorie math (never shown to user) ───────────────────────────────

const CAL = {
  activities: [
    { id: "run",     emoji: "🏃",  label: "Miles run",           sub: "Running",           calPer: 100, inputType: "number"  as const, unit: "mi" },
    { id: "lift",    emoji: "🏋️",  label: "Minutes lifting",     sub: "Weights",           calPer: 5,   inputType: "number"  as const, unit: "min" },
    { id: "cycle",   emoji: "🚴",  label: "Miles cycled",        sub: "Cycling",           calPer: 50,  inputType: "number"  as const, unit: "mi" },
    { id: "swim",    emoji: "🏊",  label: "Minutes swimming",    sub: "Swimming",          calPer: 8,   inputType: "number"  as const, unit: "min" },
    { id: "walk",    emoji: "🚶",  label: "Miles walked",        sub: "Walking",           calPer: 40,  inputType: "number"  as const, unit: "mi" },
    { id: "yoga",    emoji: "🧘",  label: "Minutes of yoga",     sub: "Yoga / stretching", calPer: 3,   inputType: "number"  as const, unit: "min" },
    { id: "salad",   emoji: "🥗",  label: "Ate clean",           sub: "Healthy meal",      calPer: 400, inputType: "check"   as const, unit: "" },
    { id: "water",   emoji: "💧",  label: "Glasses of water",    sub: "Hydration",         calPer: 25,  inputType: "counter" as const, unit: "glasses" },
    { id: "sleep",   emoji: "😴",  label: "Got solid sleep",     sub: "8+ hours",          calPer: 150, inputType: "check"   as const, unit: "" },
    { id: "cold",    emoji: "🧊",  label: "Cold shower",         sub: "Recovery",          calPer: 100, inputType: "check"   as const, unit: "" },
    { id: "meditate",emoji: "🧘‍♂️", label: "Minutes meditating", sub: "Mindfulness",       calPer: 2,   inputType: "number"  as const, unit: "min" },
    { id: "vitamins",emoji: "💊",  label: "Took vitamins",       sub: "Supplements",       calPer: 50,  inputType: "check"   as const, unit: "" },
  ],
  vices: [
    { id: "cig",    emoji: "🚬", label: "Cigarettes",    singular: "cigarette", plural: "cigarettes", cal: 50  },
    { id: "ipa",    emoji: "🍺", label: "IPAs",          singular: "IPA",       plural: "IPAs",       cal: 200 },
    { id: "shot",   emoji: "🥃", label: "Shots",         singular: "shot",      plural: "shots",      cal: 70  },
    { id: "edible", emoji: "🍬", label: "Edibles",       singular: "edible",    plural: "edibles",    cal: 100 },
  ],
};

type ViceId = "cig" | "ipa" | "shot" | "edible";

// Convert raw calories to vice count for the active vice
function toVice(cal: number, viceId: ViceId) {
  const v = CAL.vices.find(v => v.id === viceId)!;
  return cal / v.cal;
}

function formatCount(n: number) {
  if (n === 0) return "0";
  if (n < 0.1) return "<0.1";
  return n % 1 === 0 ? n.toString() : n.toFixed(1);
}

function rand<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }

const ROASTS = [
  "Logged. No notes.",
  "Balance updated. Proceed with zero guilt.",
  "Confirmed. The math checks out. Barely.",
  "Done. Science said it's fine. Allegedly.",
  "Logged. Your vice is now a lifestyle.",
  "Processed. Your doctor remains unaware.",
];

const EARN_MSGS = [
  "Banked. You've earned the audacity.",
  "Logged. Converting virtue to vices now.",
  "Stored. Ready for responsible irresponsibility.",
  "Added. Your future self is mildly impressed.",
];

interface Entry {
  id: string;
  type: "earn" | "spend";
  label: string;
  cal: number;
  ts: number;
}

// ── Home ──────────────────────────────────────────────────────────────────────

function Home({ cal, setTab, history }: { cal: number; setTab: (t: string) => void; history: Entry[] }) {
  const [activeVice, setActiveVice] = useState<ViceId>("ipa");
  const vice = CAL.vices.find(v => v.id === activeVice)!;
  const count = toVice(Math.max(0, cal), activeVice);
  const inDebt = cal < 0;
  const debtCount = toVice(Math.abs(cal), activeVice);

  return (
    <div className="flex flex-col min-h-full">
      <div className="absolute top-10 right-6 z-10">
        <div className="bg-[#1A1A1A] text-white text-[11px] font-semibold tracking-wider px-3 py-1.5 rounded-full uppercase">
          Vices AI
        </div>
      </div>

      {/* Hero */}
      <div className="px-6 pt-10 pb-6">
        <p className="text-xs font-medium tracking-widest text-black/30 uppercase mb-3">You've earned</p>
        {inDebt ? (
          <div>
            <div className="text-6xl font-black tracking-tighter leading-none text-[#FF3B30] mb-1">
              {formatCount(debtCount)}
              <span className="text-xl font-medium ml-2">{debtCount === 1 ? vice.singular : vice.plural}</span>
            </div>
            <p className="text-[#FF3B30] text-sm font-medium mt-2">in debt. Go earn it back.</p>
          </div>
        ) : (
          <div className="text-6xl font-black tracking-tighter leading-none text-[#1A1A1A]">
            {formatCount(count)}
            <span className="text-xl font-medium text-black/30 ml-2">{count === 1 ? vice.singular : vice.plural}</span>
          </div>
        )}
      </div>

      {/* Vice selector */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-xs font-medium tracking-widest text-black/30 uppercase mb-4">Show me in</p>
          <div className="grid grid-cols-2 gap-2">
            {CAL.vices.map(v => (
              <button
                key={v.id}
                onClick={() => setActiveVice(v.id as ViceId)}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium transition-all text-left ${
                  activeVice === v.id
                    ? "bg-[#1A1A1A] text-white"
                    : "bg-black/5 text-black/50 hover:bg-black/8"
                }`}
              >
                <span className="text-lg">{v.emoji}</span>
                <div>
                  <div>{v.label}</div>
                  <div className={`text-[11px] font-normal ${activeVice === v.id ? "text-white/50" : "text-black/30"}`}>
                    {formatCount(toVice(Math.max(0, cal), v.id as ViceId))} available
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 grid grid-cols-2 gap-3 mb-8">
        <button
          onClick={() => setTab("earn")}
          className="bg-[#1A1A1A] text-white rounded-2xl py-4 font-semibold text-sm hover:bg-black transition-colors"
        >
          + Earn
        </button>
        <button
          onClick={() => setTab("spend")}
          className="bg-white text-[#1A1A1A] rounded-2xl py-4 font-semibold text-sm shadow-sm hover:bg-black/5 transition-colors"
        >
          − Spend
        </button>
      </div>

      {/* Activity feed */}
      {history.length > 0 ? (
        <div className="px-6">
          <p className="text-xs font-medium tracking-widest text-black/30 uppercase mb-4">Recent</p>
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            {history.slice(0, 8).map((h, i) => {
              const equiv = toVice(h.cal, activeVice);
              return (
                <div key={h.id} className={`flex items-center justify-between px-5 py-4 ${i < Math.min(history.length, 8) - 1 ? "border-b border-black/5" : ""}`}>
                  <span className="text-sm text-black/70">{h.label}</span>
                  <span className={`text-sm font-semibold ${h.type === "earn" ? "text-[#34C759]" : "text-[#FF3B30]"}`}>
                    {h.type === "earn" ? "+" : "−"}{formatCount(equiv)} {vice.plural}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 text-center">
          <p className="text-4xl mb-3">🤷</p>
          <p className="text-black/30 text-sm">Nothing logged yet.<br />Go do something healthy.</p>
        </div>
      )}

      <div className="h-10" />
    </div>
  );
}

// ── Earn ──────────────────────────────────────────────────────────────────────

function Earn({ onBack, onLog }: { onBack: () => void; onLog: (cal: number, label: string) => void }) {
  const [vals, setVals] = useState<Record<string, number>>({});
  const [previewVice, setPreviewVice] = useState<ViceId>("ipa");
  const [toast, setToast] = useState("");

  const totalCal = CAL.activities.reduce((s, a) => s + (vals[a.id] || 0) * a.calPer, 0);
  const preview = toVice(totalCal, previewVice);
  const vice = CAL.vices.find(v => v.id === previewVice)!;

  const submit = () => {
    if (!totalCal) return;
    const parts = CAL.activities.filter(a => vals[a.id]).map(a =>
      a.inputType === "check" ? a.sub : `${vals[a.id]}${a.unit} ${a.sub.toLowerCase()}`
    );
    onLog(totalCal, parts.join(", "));
    setToast(rand(EARN_MSGS));
    setVals({});
    setTimeout(() => { setToast(""); onBack(); }, 1600);
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center gap-4 px-6 pt-10 pb-4">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-xl font-bold">Log a good deed</h2>
      </div>

      {/* Live preview */}
      {totalCal > 0 && (
        <div className="mx-6 mb-4 bg-[#1A1A1A] text-white rounded-2xl px-5 py-4">
          <p className="text-white/40 text-xs mb-1">This earns you</p>
          <p className="text-2xl font-black tracking-tight">
            {formatCount(preview)} {preview === 1 ? vice.singular : vice.plural}
            <span className="text-lg"> {vice.emoji}</span>
          </p>
          <div className="flex gap-2 mt-3 flex-wrap">
            {CAL.vices.map(v => (
              <button key={v.id} onClick={() => setPreviewVice(v.id as ViceId)}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${previewVice === v.id ? "bg-white text-black" : "bg-white/10 text-white/50"}`}>
                {v.emoji} {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div className="mx-6 mb-4 bg-[#34C759] text-white rounded-2xl px-4 py-3 text-sm font-medium text-center">{toast}</div>
      )}

      <div className="px-6 space-y-2 flex-1">
        {CAL.activities.map(a => (
          <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">{a.emoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm">{a.label}</p>
                <p className="text-xs text-black/30">{a.sub}</p>
              </div>
            </div>

            {a.inputType === "check" && (
              <button
                onClick={() => setVals(v => ({ ...v, [a.id]: v[a.id] ? 0 : 1 }))}
                className={`w-full rounded-xl py-2.5 text-sm font-medium transition-all ${vals[a.id] ? "bg-[#34C759] text-white" : "bg-black/5 text-black/40"}`}
              >
                {vals[a.id] ? "✓ Logged" : "Tap to log"}
              </button>
            )}

            {a.inputType === "number" && (
              <div className="flex items-center gap-3">
                <input
                  type="number" min="0" placeholder="0"
                  value={vals[a.id] || ""}
                  onChange={e => setVals(v => ({ ...v, [a.id]: parseFloat(e.target.value) || 0 }))}
                  className="w-20 rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-sm font-medium focus:outline-none focus:border-black/30 text-center"
                />
                <span className="text-black/40 text-sm">{a.unit}</span>
              </div>
            )}

            {a.inputType === "counter" && (
              <div className="flex items-center gap-4">
                <button onClick={() => setVals(v => ({ ...v, [a.id]: Math.max(0, (v[a.id] || 0) - 1) }))}
                  className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-2xl font-bold w-8 text-center tabular-nums">{vals[a.id] || 0}</span>
                <button onClick={() => setVals(v => ({ ...v, [a.id]: (v[a.id] || 0) + 1 }))}
                  className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span className="text-black/40 text-sm">{a.unit}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-6 py-6">
        <button onClick={submit} disabled={!totalCal}
          className="w-full bg-[#1A1A1A] text-white rounded-2xl py-4 font-semibold disabled:opacity-30 transition-opacity">
          {totalCal ? `Bank ${formatCount(preview)} ${vice.plural}` : "Log something first"}
        </button>
      </div>
    </div>
  );
}

// ── Spend ─────────────────────────────────────────────────────────────────────

function Spend({ cal, onBack, onSpend }: { cal: number; onBack: () => void; onSpend: (cal: number, label: string) => void }) {
  const [qtys, setQtys] = useState<Record<ViceId, number>>({ cig: 0, ipa: 0, shot: 0, edible: 0 });
  const [toast, setToast] = useState("");

  const totalCal = CAL.vices.reduce((s, v) => s + qtys[v.id as ViceId] * v.cal, 0);
  const remaining = cal - totalCal;

  const submit = () => {
    if (!totalCal) return;
    const parts = CAL.vices.filter(v => qtys[v.id as ViceId] > 0)
      .map(v => `${qtys[v.id as ViceId]}× ${v.label}`);
    onSpend(totalCal, parts.join(", "));
    setToast(rand(ROASTS));
    setQtys({ cig: 0, ipa: 0, shot: 0, edible: 0 });
    setTimeout(() => { setToast(""); onBack(); }, 1800);
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center gap-4 px-6 pt-10 pb-6">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-xl font-bold">Cash out</h2>
      </div>

      {toast && (
        <div className="mx-6 mb-4 bg-[#1A1A1A] text-white rounded-2xl px-4 py-3 text-sm font-medium text-center">{toast}</div>
      )}

      <div className="px-6 space-y-3 flex-1">
        {CAL.vices.map(v => {
          const qty = qtys[v.id as ViceId];
          const available = Math.floor(cal / v.cal);
          return (
            <div key={v.id} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{v.emoji}</span>
                  <div>
                    <p className="font-semibold">{v.label}</p>
                    <p className="text-xs text-black/30">{available > 0 ? `${available} available` : "not enough earned"}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setQtys(q => ({ ...q, [v.id]: Math.max(0, q[v.id as ViceId] - 1) }))}
                  className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-3xl font-black w-10 text-center tabular-nums">{qty}</span>
                <button onClick={() => setQtys(q => ({ ...q, [v.id]: q[v.id as ViceId] + 1 }))}
                  className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
                {qty > 0 && (
                  <span className="text-[#FF3B30] text-sm font-medium ml-auto">−{qty} {qty === 1 ? v.singular : v.plural}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalCal > 0 && (
        <div className="px-6 pt-4">
          <p className={`text-sm font-medium text-center mb-2 ${remaining < 0 ? "text-[#FF3B30]" : "text-black/40"}`}>
            {remaining < 0 ? "You'll go into debt. Bold move." : "Looking good."}
          </p>
        </div>
      )}

      <div className="px-6 py-6">
        <button onClick={submit} disabled={!totalCal}
          className="w-full bg-[#1A1A1A] text-white rounded-2xl py-4 font-semibold disabled:opacity-30 transition-opacity">
          {totalCal ? "Confirm & spend" : "Select something"}
        </button>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function VicesApp() {
  const [tab, setTab] = useState("home");
  const [cal, setCal] = useState(0);
  const [history, setHistory] = useState<Entry[]>([]);

  useEffect(() => {
    const s = localStorage.getItem("vices-v3");
    if (s) { const p = JSON.parse(s); setCal(p.cal ?? 0); setHistory(p.history ?? []); }
  }, []);

  useEffect(() => {
    localStorage.setItem("vices-v3", JSON.stringify({ cal, history }));
  }, [cal, history]);

  const addEntry = (type: "earn" | "spend", amount: number, label: string) => {
    const e: Entry = { id: Math.random().toString(36).slice(2), type, label, cal: amount, ts: Date.now() };
    setHistory(h => [e, ...h].slice(0, 50));
    setCal(c => type === "earn" ? c + amount : c - amount);
  };

  return (
    <div className="min-h-screen bg-[#F5F2EE]">
      <div className="max-w-md mx-auto min-h-screen flex flex-col bg-[#F5F2EE] relative">
        <div className="flex-1 overflow-y-auto">
          {tab === "home"  && <Home  cal={cal} setTab={setTab} history={history} />}
          {tab === "earn"  && <Earn  onBack={() => setTab("home")} onLog={(c,l) => addEntry("earn", c, l)} />}
          {tab === "spend" && <Spend cal={cal} onBack={() => setTab("home")} onSpend={(c,l) => addEntry("spend", c, l)} />}
        </div>
      </div>
    </div>
  );
}
