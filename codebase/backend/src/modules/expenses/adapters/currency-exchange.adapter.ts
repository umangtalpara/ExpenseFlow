import { Injectable } from '@nestjs/common';

@Injectable()
export class CurrencyExchangeAdapter {
  private readonly rates: Record<string, number> = {
    'EUR_USD': 1.1,
    'USD_EUR': 0.9,
    'INR_USD': 0.012,
    'USD_INR': 83.0,
    'GBP_USD': 1.3,
    'USD_GBP': 0.77,
    'EUR_INR': 91.0,
    'INR_EUR': 0.011,
    'GBP_INR': 107.0,
    'INR_GBP': 0.0093,
  };

  convert(amount: number, from: string, to: string): { exchangeRate: number; convertedAmount: number } {
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();

    if (fromUpper === toUpper) {
      return { exchangeRate: 1, convertedAmount: amount };
    }

    const key = `${fromUpper}_${toUpper}`;
    const rate = this.rates[key];

    if (rate) {
      return { exchangeRate: rate, convertedAmount: Math.round(amount * rate * 100) / 100 };
    }

    // Default fallback if rate is not registered
    return { exchangeRate: 1, convertedAmount: Math.round(amount * 100) / 100 };
  }
}
