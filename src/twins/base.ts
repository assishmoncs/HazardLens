import { SimEvent, Twin, TwinContext, TwinState, TwinMetadata, BehaviorModel } from "../core/types.js";

export abstract class BaseTwin implements Twin {
  public readonly metadata: TwinMetadata;
  public readonly behavior?: BehaviorModel;

  constructor(
    public readonly state: TwinState,
    metadata: TwinMetadata = {},
    behavior?: BehaviorModel,
  ) {
    this.metadata = {
      physicalProfile: metadata.physicalProfile,
      relationships: metadata.relationships ?? [],
      history: metadata.history ?? [],
    };
    this.behavior = behavior;
  }

  protected record(event: SimEvent, summary: string): void {
    this.metadata.history?.push({
      time: event.time,
      eventType: event.type,
      summary,
    });
  }

  abstract onEvent(event: SimEvent, context: TwinContext): void;

  tick(dt: number, context: TwinContext): void {
    this.behavior?.update(this.state, dt, context);
  }

  abstract clone(): Twin;

  protected distanceTo(other: Twin): number {
    const a = this.state.position, b = other.state.position;
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  }
}
