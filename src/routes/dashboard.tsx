import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CandlestickChart, ClipboardList, Layers, History as HistoryIcon } from "lucide-react";
import { useStore } from "@/state/store";
import { Navbar } from "@/components/trading/Navbar";
import { MarketWatch } from "@/components/trading/MarketWatch";
import { TradingChart } from "@/components/trading/TradingChart";
import { ActiveTrade } from "@/components/trading/ActiveTrade";
import { OrderPanel } from "@/components/trading/OrderPanel";
import { TradeHistory } from "@/components/trading/TradeHistory";
import { PerformanceCards } from "@/components/trading/PerformanceCards";
import { DEFAULT_SYMBOL } from "@/lib/symbols";
import { useIsDesktop } from "@/hooks/useMediaQuery";

export const Route = createFileRoute("/dashboard")({
  component: DashboardContent,
  head: () => ({
    meta: [
      { title: "TradeElite — Premium Funded Trader Dashboard" },
      { name: "description", content: "Professional funded trading dashboard with live Gold Futures (GC) charts, real-time P&L tracking, and account management." },
    ],
  }),
});

/**
 * Phone layout shows one pane at a time behind a bottom tab bar, the way MT5
 * and every other mobile terminal does it: three desktop columns side by side
 * would each be about a hundred pixels wide. From `lg` up the real three-column
 * desk takes over and the tabs disappear.
 */
const TABS = [
  { id: "chart", label: "Chart", icon: CandlestickChart },
  { id: "trade", label: "Trade", icon: ClipboardList },
  { id: "positions", label: "Positions", icon: Layers },
  { id: "history", label: "History", icon: HistoryIcon },
] as const;

type TabId = (typeof TABS)[number]["id"];

function DashboardContent() {
  const { isAuthenticated, trades } = useStore();
  const navigate = useNavigate();
  const [selectedSymbol, setSelectedSymbol] = useState(DEFAULT_SYMBOL.id);
  const [tab, setTab] = useState<TabId>("chart");
  // Branch on a real media query rather than rendering both layouts and hiding
  // one: TradingChart holds a chart instance, 4000 candles of history and a
  // live subscription, so mounting it twice would double all of that on the
  // device least able to afford it.
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  // Picking an instrument from the mobile strip is a request to look at it.
  const selectSymbol = (id: string) => {
    setSelectedSymbol(id);
    setTab("chart");
  };

  return (
    // A fixed 100dvh, not min-h: the tab bar is pinned to the bottom of the
    // shell, so the shell must not grow past the viewport — with min-h the
    // pane's content pushes the bar off the bottom of the screen. dvh rather
    // than vh because iOS counts its collapsing toolbar into 100vh.
    <div className="h-[100dvh] overflow-hidden bg-background flex flex-col">
      <Navbar />

      {/* ---------- Phone and small tablet: one pane at a time ---------- */}
      {!isDesktop && (
      <div className="flex-1 flex flex-col min-h-0">
        <main className="flex-1 min-h-0 overflow-auto touch-scroll scrollbar-thin px-3 pt-3 pb-3">
          {tab === "chart" && (
            // min-h-full + flex-1 on the chart makes it absorb whatever space
            // the strip and the stat row leave over, so it fills the pane on a
            // tall phone and still keeps its axes on a short landscape one. A
            // fixed height cannot do both: sized for portrait it overflows
            // landscape and the time axis ends up under the tab bar.
            <div className="flex flex-col gap-3 min-h-full">
              <MarketWatch
                variant="strip"
                selected={selectedSymbol}
                onSelect={selectSymbol}
              />
              {/* A definite height, not flex-1: TradingChart sizes itself with
                  h-full, and a percentage height only resolves against a parent
                  whose own height is definite. A flex-1 box has a used height
                  but an indefinite one, so h-full there collapses the chart to
                  its header. vh keeps it proportional across devices; the floor
                  keeps the candles readable on a short landscape screen. */}
              <div className="h-[46vh] min-h-[240px]">
                <TradingChart symbol={selectedSymbol} />
              </div>
              <PerformanceCards />
            </div>
          )}

          {tab === "trade" && <OrderPanel symbol={selectedSymbol} />}
          {tab === "positions" && <ActiveTrade />}
          {tab === "history" && <TradeHistory />}
        </main>

        <nav className="shrink-0 glass-panel border-t border-border grid grid-cols-4 pb-safe px-safe">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={active ? "page" : undefined}
                // 56px of height keeps every tab inside Apple's 44pt minimum
                // touch target with room to spare.
                className={`relative flex flex-col items-center justify-center gap-1 h-14 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <span className="absolute top-0 inset-x-3 h-0.5 rounded-full bg-primary" />
                )}
                <span className="relative">
                  <Icon className="w-[18px] h-[18px]" />
                  {id === "positions" && trades.length > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 grid place-items-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold tabular-nums">
                      {trades.length}
                    </span>
                  )}
                </span>
                {label}
              </button>
            );
          })}
        </nav>
      </div>
      )}

      {/* ---------- Desktop: the full three-column desk ---------- */}
      {isDesktop && (
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-60 shrink-0 p-3 flex flex-col gap-3 overflow-auto scrollbar-thin">
          <MarketWatch selected={selectedSymbol} onSelect={setSelectedSymbol} />
        </aside>

        <main className="flex-1 flex flex-col gap-3 p-3 min-w-0 overflow-auto scrollbar-thin">
          <div className="flex-1 min-h-[400px]">
            <TradingChart symbol={selectedSymbol} />
          </div>
          <PerformanceCards />
        </main>

        <aside className="w-72 shrink-0 p-3 flex flex-col gap-3 overflow-auto scrollbar-thin">
          <ActiveTrade />
          <OrderPanel symbol={selectedSymbol} />
          <TradeHistory />
        </aside>
      </div>
      )}
    </div>
  );
}
