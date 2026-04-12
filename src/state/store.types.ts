export interface Transaction {
  id: string;
  type: "DEPOSIT" | "WITHDRAW";
  amount: number;
  date: string;
  status: "Completed" | "Pending";
}

export interface ActiveTradeData {
  asset: string;
  direction: "BUY" | "SELL";
  lotSize: number;
  multiplier: number;
  entryPrice: number;
  currentPrice: number;
  profit: number;
}

export interface UserData {
  name: string;
  email: string;
  phone: string;
}
