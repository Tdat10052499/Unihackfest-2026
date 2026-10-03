export type AmountInput = { display: string; normalized: string };

/** Keeps the user's decimal separator while exposing a dot-normalized value for calculations. */
export function sanitizeAmountInput(value: string, decimals: number): AmountInput {
  let display = '';
  let separator: ',' | '.' | null = null;
  let fractionDigits = 0;
  for (const char of value) {
    if (/\d/.test(char)) {
      if (separator && fractionDigits >= decimals) continue;
      display += char;
      if (separator) fractionDigits += 1;
      continue;
    }
    if ((char === ',' || char === '.') && !separator) {
      separator = char;
      display += char;
    }
  }
  return { display, normalized: display.replace(',', '.') };
}

export function amountNumber(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}
