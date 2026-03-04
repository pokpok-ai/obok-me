/**
 * Demographics scoring — ZipSmart-style letter grades for Warsaw metrics.
 * Benchmarks based on Polish city averages (GUS national data).
 */

export type Grade = "A" | "B" | "C" | "D" | "F";

export interface GradeResult {
  grade: Grade;
  color: string;
  bgColor: string;
}

const GRADE_COLORS: Record<Grade, { color: string; bgColor: string }> = {
  A: { color: "#16a34a", bgColor: "#f0fdf4" },
  B: { color: "#65a30d", bgColor: "#f7fee7" },
  C: { color: "#ca8a04", bgColor: "#fefce8" },
  D: { color: "#ea580c", bgColor: "#fff7ed" },
  F: { color: "#dc2626", bgColor: "#fef2f2" },
};

function makeGrade(grade: Grade): GradeResult {
  return { grade, ...GRADE_COLORS[grade] };
}

/**
 * Crime rate per 1,000 residents (GUS provides this directly).
 * Lower is better. Warsaw ~27. Poland avg ~28.
 * Best cities (Rzeszow) ~12. Worst (Lodz) ~45.
 */
export function gradeCrimeRate(crimesPer1000: number): GradeResult {
  if (crimesPer1000 < 15) return makeGrade("A");
  if (crimesPer1000 < 20) return makeGrade("B");
  if (crimesPer1000 < 30) return makeGrade("C");
  if (crimesPer1000 < 40) return makeGrade("D");
  return makeGrade("F");
}

/**
 * Average gross salary (PLN/month).
 * Higher is better. Warsaw ~10,700 (2024). Poland avg ~8,500.
 */
export function gradeSalary(salaryPLN: number): GradeResult {
  if (salaryPLN > 9000) return makeGrade("A");
  if (salaryPLN > 7500) return makeGrade("B");
  if (salaryPLN > 6000) return makeGrade("C");
  if (salaryPLN > 5000) return makeGrade("D");
  return makeGrade("F");
}

/**
 * Unemployment rate (%).
 * Lower is better. Warsaw ~1.4%. Poland avg ~5%.
 */
export function gradeUnemployment(ratePct: number): GradeResult {
  if (ratePct < 3) return makeGrade("A");
  if (ratePct < 5) return makeGrade("B");
  if (ratePct < 8) return makeGrade("C");
  if (ratePct < 12) return makeGrade("D");
  return makeGrade("F");
}

/**
 * Price-to-income ratio (years of gross salary to buy avg 50m² flat).
 * Lower is better. Warsaw ~9x. Krakow ~10x.
 */
export function gradePriceToIncome(ratio: number): GradeResult {
  if (ratio < 6) return makeGrade("A");
  if (ratio < 8) return makeGrade("B");
  if (ratio < 10) return makeGrade("C");
  if (ratio < 12) return makeGrade("D");
  return makeGrade("F");
}

/**
 * Compute price-to-income ratio (years of salary for 50m² flat).
 */
export function computePriceToIncome(
  avgPricePerSqm: number,
  monthlySalary: number,
  areaSqm: number = 50
): number {
  if (monthlySalary <= 0) return 0;
  const flatPrice = avgPricePerSqm * areaSqm;
  const yearlySalary = monthlySalary * 12;
  return parseFloat((flatPrice / yearlySalary).toFixed(1));
}

/**
 * Compute monthly mortgage payment (annuity).
 */
export function computeMonthlyMortgage(
  price: number,
  downPaymentPct: number = 0.2,
  annualRate: number,
  years: number = 25
): number {
  const principal = price * (1 - downPaymentPct);
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;

  if (monthlyRate === 0) return principal / numPayments;

  return (
    principal *
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  );
}
