export interface Transaction {
  id: string;
  type: "DEPOSIT" | "WITHDRAW";
  amount: number;
  date: string;
  status: "Completed" | "Pending";
}

export interface Trade {
  id: string;
  type: "BUY" | "SELL";
  lot: number;
  entryPrice: number;
  symbol: string;
  openDate: string;
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
}

export interface UserData {
  name: string;
  email: string;
  phone: string;
}
