export type Currency = "ALGO" | "USDC";

/**
 * USDC on Algorand is an ASA. Defaults to the Circle TestNet asset id.
 * Override with NEXT_PUBLIC_USDC_ASSET_ID (e.g. 31566704 for MainNet).
 */
export const USDC_ASSET_ID = Number(
  process.env.NEXT_PUBLIC_USDC_ASSET_ID ?? 10458941,
);

/** Both ALGO and (Algorand) USDC use 6 decimals. */
const DECIMALS: Record<Currency, number> = { ALGO: 6, USDC: 6 };

export const CURRENCIES: Currency[] = ["ALGO", "USDC"];

/** Convert a human price into base units (microAlgos / microUSDC). */
export function toBaseUnits(amount: number, currency: Currency): bigint {
  return BigInt(Math.round(amount * 10 ** DECIMALS[currency]));
}

export function formatPrice(amount: number, currency: Currency): string {
  const fixed = currency === "USDC" ? amount.toFixed(2) : String(amount);
  return `${fixed} ${currency}`;
}
