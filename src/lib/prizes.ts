export interface Prize {
  id: string;
  name: string;
  tierLabel: string;
  tierColor: string;
  stock: number | null; // null = unlimited
  weight: number;
  active: boolean;
  sortOrder: number;
}

export interface PrizeRow {
  id: string;
  name: string;
  tier_label: string;
  tier_color: string;
  stock: number | null;
  weight: number;
  active: boolean;
  sort_order: number;
}

export const prizeFromRow = (r: PrizeRow): Prize => ({
  id: r.id,
  name: r.name,
  tierLabel: r.tier_label,
  tierColor: r.tier_color,
  stock: r.stock,
  weight: r.weight,
  active: r.active,
  sortOrder: r.sort_order,
});

export const prizeToRow = (p: Omit<Prize, "id">) => ({
  name: p.name,
  tier_label: p.tierLabel,
  tier_color: p.tierColor,
  stock: p.stock,
  weight: p.weight,
  active: p.active,
  sort_order: p.sortOrder,
});

// A prize can be won right now.
export const isLive = (p: Prize) => p.active && p.weight > 0 && (p.stock === null || p.stock > 0);

// Real current chance of each prize: weight / total weight of live prizes.
export function probabilities(prizes: Prize[]): Map<string, number> {
  const live = prizes.filter(isLive);
  const total = live.reduce((s, p) => s + p.weight, 0);
  return new Map(prizes.map((p) => [p.id, isLive(p) && total > 0 ? p.weight / total : 0]));
}
