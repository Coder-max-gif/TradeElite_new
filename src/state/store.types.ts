export interface Transaction {
  id: string;
  type: "DEPOSIT" | "WITHDRAW";
  amount: number;
  date: string;
  status: "Completed" | "Pending";
}

/** Why a position left the book — mirrors the MT5 deal reason. */
export type CloseReason = "MANUAL" | "SL" | "TP";

export interface Trade {
  id: string;
  type: "BUY" | "SELL";
  lot: number;
  entryPrice: number;
  symbol: string;
  openDate: string;
  /** Stop loss / take profit in absolute price. Undefined = not set. */
  sl?: number;
  tp?: number;
}

export interface ClosedTrade {
  id: string;
  type: "BUY" | "SELL";
  lot: number;
  entryPrice: number;
  exitPrice: number;
  symbol: string;
  openDate: string;
  closeDate: string;
  sl?: number;
  tp?: number;
  closeReason?: CloseReason;
}

export interface UserData {
  name: string;
  email: string;
  phone: string;
}

/** The slice of account state that survives a page refresh. */
export interface PersistedAccount {
  version: number;
  balance: number;
  trades: Trade[];
  closedTrades: ClosedTrade[];
  transactions: Transaction[];
}
