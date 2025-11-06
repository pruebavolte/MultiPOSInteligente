import type { CurrencyCode, ExchangeRate } from "@shared/schema";

// Cache exchange rates for 1 hour
const cache: { data: ExchangeRate | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export async function getExchangeRates(baseCurrency: CurrencyCode = "MXN"): Promise<ExchangeRate> {
  const now = Date.now();

  // Return cached data if still valid
  if (cache.data && cache.data.base === baseCurrency && now - cache.timestamp < CACHE_DURATION) {
    return cache.data;
  }

  try {
    // Use exchangerate-api.com free tier
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rates");
    }

    const data = await response.json();

    const rates: ExchangeRate = {
      base: baseCurrency,
      rates: {
        MXN: data.rates.MXN || 1,
        USD: data.rates.USD || 0.05,
        EUR: data.rates.EUR || 0.045,
        GBP: data.rates.GBP || 0.038,
        CNY: data.rates.CNY || 0.35,
        JPY: data.rates.JPY || 5.5,
      },
      timestamp: now,
    };

    // Update cache
    cache.data = rates;
    cache.timestamp = now;

    return rates;
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    
    // Return default rates if API fails
    return {
      base: baseCurrency,
      rates: {
        MXN: 1,
        USD: 0.05,
        EUR: 0.045,
        GBP: 0.038,
        CNY: 0.35,
        JPY: 5.5,
      },
      timestamp: now,
    };
  }
}

export async function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): Promise<number> {
  if (from === to) return amount;

  const rates = await getExchangeRates(from);
  const rate = rates.rates[to];

  return amount * rate;
}
