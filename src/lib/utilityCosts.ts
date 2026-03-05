import type { UtilityType } from './overpass';

interface CostBracket {
  max: number;
  label: string;
  status: 'green' | 'yellow' | 'red';
}

const COST_BRACKETS: Record<UtilityType, CostBracket[]> = {
  power: [
    { max: 50, label: '~3 000 PLN', status: 'green' },
    { max: 200, label: '~8 000 PLN', status: 'green' },
    { max: 500, label: '~25 000 PLN', status: 'yellow' },
    { max: 9999, label: '~50 000+ PLN', status: 'red' },
  ],
  water: [
    { max: 50, label: '~5 000 PLN', status: 'green' },
    { max: 300, label: '~15 000 PLN', status: 'yellow' },
    { max: 9999, label: 'studnia ~20 000 PLN', status: 'red' },
  ],
  gas: [
    { max: 100, label: '~4 000 PLN', status: 'green' },
    { max: 300, label: '~25 000 PLN', status: 'yellow' },
    { max: 9999, label: 'brak / LPG', status: 'red' },
  ],
  sewage: [
    { max: 100, label: '~8 000 PLN', status: 'green' },
    { max: 9999, label: 'szambo ~12 000 PLN', status: 'red' },
  ],
  internet: [
    { max: 500, label: '~2 000 PLN', status: 'green' },
    { max: 9999, label: '~5 000+ PLN', status: 'yellow' },
  ],
};

export function getUtilityCost(
  type: UtilityType,
  distance_m: number
): { label: string; status: 'green' | 'yellow' | 'red' } {
  const brackets = COST_BRACKETS[type];
  if (!brackets || distance_m < 0) return { label: '—', status: 'red' };

  for (const bracket of brackets) {
    if (distance_m <= bracket.max) {
      return { label: bracket.label, status: bracket.status };
    }
  }
  return { label: '—', status: 'red' };
}
