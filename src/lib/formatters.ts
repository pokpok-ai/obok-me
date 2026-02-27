const plnFormatter = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const plnPerSqmFormatter = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatPLN(amount: number): string {
  return plnFormatter.format(amount);
}

export function formatPricePerSqm(amount: number): string {
  return `${plnPerSqmFormatter.format(amount)} zl/m\u00B2`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatArea(sqm: number): string {
  return `${sqm.toFixed(1)} m\u00B2`;
}

const propertyTypeLabels: Record<string, string> = {
  apartment: "Mieszkanie",
  house: "Dom",
  plot: "Dzialka",
  commercial: "Lokal uzytkowy",
};

export function propertyTypeLabel(type: string): string {
  return propertyTypeLabels[type] || type;
}
