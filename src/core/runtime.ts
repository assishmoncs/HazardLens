import { SimEvent, Twin, TwinContext, WorldSnapshot } from "./types.js";
import { FireTwin, ReleaseTwin } from "../twins/hazards.js";

export interface SnapshotOptions {
  eventLimit?: number;
  significantOnly?: boolean;
}

export class SimulationRuntime {
  private readonly registry = new Map<string, Twin>();
  private readonly queue: SimEvent[] = [];
  private readonly history: SimEvent[] = [];
  private sequence = 0;
  private processedEvents = 0;
  time = 0;
  readonly historyLimit = 20000;

  constructor(twins: Twin[] = []) {
    for (const twin of twins) this.add(twin);
  }

  add(twin: Twin): void {
    if (this.registry.has(twin.state.id)) throw new Error(`Duplicate twin ${twin.state.id}`);
    this.registry.set(twin.state.id, twin);
  }

  get(id: string): Twin | undefined {
    return this.registry.get(id);
  }

  emit<T extends Record<string, unknown>>(event: Omit<SimEvent<T>, "id" | "time">): string {
    const id = `evt-${++this.sequence}`;
    this.queue.push(structuredClone({ ...event, id, time: this.time }));
    return id;
  }

  step(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(this.time + dt)) {
      throw new Error("dt must be finite and positive");
    }
    this.drainEvents();
    const context = this.context();
    for (const twin of [...this.registry.values()]) if (twin.state.active) twin.tick(dt, context);
    this.time += dt;
    this.drainEvents();
  }

  run(duration: number, dt = .25): void {
    if (!Number.isFinite(duration) || duration < 0 || !Number.isFinite(dt) || dt <= 0 || !Number.isFinite(this.time + duration)) {
      throw new Error("Invalid simulation duration or timestep");
    }
    const end = this.time + duration;
    while (this.time + 1e-9 < end) this.step(Math.min(dt, end - this.time));
  }

  snapshot(options: SnapshotOptions = {}): WorldSnapshot {
    const eventLimit = options.eventLimit ?? this.historyLimit;
    if (!Number.isInteger(eventLimit) || eventLimit < 0) throw new Error("Invalid event limit");
    const selectedHistory = options.significantOnly
      ? this.history.filter(event => event.type !== "thermal.exposure")
      : this.history;
    const events = eventLimit === 0 ? [] : selectedHistory.slice(-eventLimit);
    return {
      time: this.time,
      twins: [...this.registry.values()].map(twin => structuredClone(twin.state)),
      events: structuredClone(events),
      totalEvents: this.processedEvents,
      historyTruncated: this.processedEvents > events.length,
    };
  }

  clone(): SimulationRuntime {
    const copy = new SimulationRuntime([...this.registry.values()].map(twin => {
      const cloned = twin.clone();
      if (twin.metadata && cloned.metadata) Object.assign(cloned.metadata, structuredClone(twin.metadata));
      return cloned;
    }));
    copy.time = this.time;
    copy.sequence = this.sequence;
    copy.processedEvents = this.processedEvents;
    copy.history.push(...structuredClone(this.history));
    copy.queue.push(...structuredClone(this.queue));
    return copy;
  }

  private context(): TwinContext {
    return { now: this.time, get: id => this.registry.get(id), twins: () => [...this.registry.values()], emit: event => this.emit(event) };
  }

  private materialize(event: SimEvent): void {
    if (event.type !== "release.created" && event.type !== "fire.created") return;
    const payload = event.payload;
    const origin = payload.origin as { x: number; y: number; z: number } | undefined;
    if (!origin || ![origin.x, origin.y, origin.z].every(Number.isFinite)) throw new Error("Hazard requires a finite origin");

    if (event.type === "release.created") {
      const rate = Number(payload.rateKgS);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error("Invalid release rate");
      const existing = [...this.registry.values()].find(twin =>
        twin instanceof ReleaseTwin && twin.sourceId === event.sourceId && twin.state.active,
      ) as ReleaseTwin | undefined;
      if (existing) { existing.rateKgS = rate; return; }
      this.add(new ReleaseTwin(`release-${event.id}`, origin, event.sourceId, rate));
      return;
    }

    const intensity = Number(payload.intensityMw);
    if (!Number.isFinite(intensity) || intensity <= 0) throw new Error("Invalid fire intensity");
    // Current FireTwin derives its own downstream source behavior from its intensity;
    // preserve the initiating event in the event fabric rather than adding a duplicate source field.
    this.add(new FireTwin(`fire-${event.id}`, origin, intensity));
  }

  private drainEvents(): void {
    let guard = 0;
    while (this.queue.length) {
      if (++guard > 10000) throw new Error("Event cascade exceeded safety limit");
      const event = this.queue.shift()!;
      this.history.push(event);
      this.processedEvents += 1;
      this.materialize(event);
      const context = this.context();
      if (event.targetId) this.registry.get(event.targetId)?.onEvent(event, context);
      else for (const twin of [...this.registry.values()]) twin.onEvent(event, context);
    }
    if (this.history.length > this.historyLimit) this.history.splice(0, this.history.length - this.historyLimit);
  }
}
