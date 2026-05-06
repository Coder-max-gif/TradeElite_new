import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useStore } from "@/state/store";
import { Navbar } from "@/components/trading/Navbar";
import { MarketWatch } from "@/components/trading/MarketWatch";
import { TradingChart } from "@/components/trading/TradingChart";
import { ActiveTrade } from "@/components/trading/ActiveTrade";
import { OrderPanel } from "@/components/trading/OrderPanel";
import { TradeHistory } from "@/components/trading/TradeHistory";
import { PerformanceCards } from "@/components/trading/PerformanceCards";

export const Route = createFileRoute("/dashboard")({
  component: DashboardContent,
  head: () => ({
    meta: [
      { title: "TradeElite — Premium Funded Trader Dashboard" },
      { name: "description", content: "Professional funded trading dashboard with live Gold Futures (GC) charts, real-time P&L tracking, and account management." },
    ],
  }),
});

function DashboardContent() {
  const { isAuthenticated } = useStore();
  const navigate = useNavigate();
  const [selectedSymbol, setSelectedSymbol] = useState("OANDA:XAUUSD");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
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
          <OrderPanel />
          <TradeHistory />
        </aside>
      </div>
    </div>
  );
}
