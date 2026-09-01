export type VisualCondition = "healthy" | "warning" | "damaged" | "critical" | "destroyed";

export function getVisualCondition(integrity: number): VisualCondition {
  if (integrity <= 0) return "destroyed";
  if (integrity < 0.2) return "critical";
  if (integrity < 0.5) return "damaged";
  if (integrity < 0.8) return "warning";
  return "healthy";
}

export interface TwinVisualState {
  id: string;
  condition: VisualCondition;
  emissive?: boolean;
  smoke?: boolean;
}
