/** Philippine cash denominations, in centavos, matching the checkout algorithm. */
const denominations = [100_000, 50_000, 20_000, 10_000, 5_000, 2_000, 1_000, 500, 100, 25, 10, 5, 1] as const;

export type PosChangeLine = { denominationCentavos: number; count: number };

/** Build a live display preview; checkout still returns the authoritative breakdown. */
export function previewPosChangeBreakdown(changeCentavos: number): PosChangeLine[] {
  let remaining = Math.max(0, Math.floor(changeCentavos));
  const lines: PosChangeLine[] = [];

  for (const denominationCentavos of denominations) {
    const count = Math.floor(remaining / denominationCentavos);
    if (count > 0) {
      lines.push({ denominationCentavos, count });
      remaining -= denominationCentavos * count;
    }
  }

  return lines;
}

export function formatPosDenomination(denominationCentavos: number) {
  return denominationCentavos >= 100
    ? `₱${(denominationCentavos / 100).toLocaleString('en-PH')}`
    : `${denominationCentavos}¢`;
}
