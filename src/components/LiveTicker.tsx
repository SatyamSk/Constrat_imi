import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface TickerItem {
  text: string;
}

const FALLBACK: TickerItem[] = [
  { text: "Daily case drops at 06:00 IST" },
  { text: "GD brief generator: 3 free / day" },
  { text: "McKinsey case methodology updated" },
  { text: "Photo analysis: snap your case structure, get an AI score in seconds" },
  { text: "Pro plan: ₹99/mo · cancel anytime" },
];

/**
 * Scrolling news ticker, Bloomberg-style. Pulls latest headlines from
 * Supabase if available, otherwise shows static teasers.
 */
export function LiveTicker({ dark = false }: { dark?: boolean }) {
  const [items, setItems] = useState<TickerItem[]>(FALLBACK);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("news")
        .select("title")
        .order("published_at", { ascending: false })
        .limit(8);
      if (cancelled || !data?.length) return;
      setItems(data.map((r: any) => ({ text: r.title.slice(0, 110) })));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Render the list twice for a seamless loop.
  const doubled = [...items, ...items];

  return (
    <div
      className={`relative w-full overflow-hidden h-12 flex items-center ${
        dark ? "bg-[#0a1628]" : "bg-white"
      }`}
      style={{
        borderTop: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0",
        borderBottom: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0",
      }}
    >
      {/* Pulse dot on the left */}
      <div className="flex items-center gap-2 px-4 shrink-0 z-10 relative"
           style={{ background: dark ? "#0a1628" : "#ffffff" }}>
        <span className="pulse-dot" />
        <span className={`text-[10px] uppercase tracking-[0.12em] font-bold ${
          dark ? "text-white" : "text-[#0a1628]"
        }`}>
          Live
        </span>
      </div>

      <div className="ticker-track">
        {doubled.map((it, i) => (
          <span
            key={i}
            className={`text-[11px] whitespace-nowrap font-light ${
              dark ? "text-white/70" : "text-[#4a5d76]"
            }`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            <span className="text-[#e8490f] mr-2">·</span>
            {it.text}
          </span>
        ))}
      </div>

      {/* Right fade so text disappears cleanly */}
      <div
        className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none"
        style={{
          background: dark
            ? "linear-gradient(to right, transparent, #0a1628)"
            : "linear-gradient(to right, transparent, #ffffff)",
        }}
      />
    </div>
  );
}
