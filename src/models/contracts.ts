import type { TwinContext, TwinState } from "../core/types.js";

export interface ModelProvenance {
  id: string;
  name: string;
  version: string;
  source: string;
  assumptions: string[];
}

export interface ModelResult {
  value: number;
  unit?: string;
  confidence?: number;
  provenance: ModelProvenance;
}

export interface StateModel {
  readonly id: string;
  readonly provenance: ModelProvenance;
  evaluate(state: TwinState, context: TwinContext): ModelResult;
}
