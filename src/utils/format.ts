const currencyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PRICE_DECIMALS = 2;
const LOT_DECIMALS = 2;

export function formatCurrency(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${currencyFormatter.format(Math.abs(value))}`;
}

export function formatSignedCurrency(value: number): string {
  return `${value >= 0 ? "+" : "-"}$${currencyFormatter.format(Math.abs(value))}`;
}

export function formatPrice(value: number): string {
  return value.toFixed(PRICE_DECIMALS);
}

export function formatLots(value: number): string {
  return value.toFixed(LOT_DECIMALS);
}

export function formatDate(date: string | number | Date): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
