import test from "node:test";
import assert from "node:assert/strict";
import { ValveTwin, PumpTwin, PressureVesselTwin, ReactorTwin, HeatExchangerTwin, PipeJunctionTwin, ColumnTwin, WindowTwin, DoorTwin, BuildingTwin, HydrantTwin, FireMonitorTwin, EmergencyShutdownTwin, WorkerTwin, VehicleTwin, SensorTwin, RouteTwin } from "../src/twins/infrastructure.js";

const p = { x: 0, y: 0, z: 0 };

test("phase 1 asset library creates typed twins with provenance", () => {
  const twins = [
    new ValveTwin("V-1", p), new PumpTwin("P-1", p), new PressureVesselTwin("PV-1", p),
    new ReactorTwin("R-1", p), new HeatExchangerTwin("HX-1", p), new PipeJunctionTwin("J-1", p),
    new ColumnTwin("C-1", p), new WindowTwin("W-1", p), new DoorTwin("D-1", p),
    new BuildingTwin("B-1", p), new HydrantTwin("H-1", p), new FireMonitorTwin("FM-1", p),
    new EmergencyShutdownTwin("ESD-1", p), new WorkerTwin("WK-1", p), new VehicleTwin("VH-1", p),
    new SensorTwin("S-1", p), new RouteTwin("RT-1", p),
  ];
  assert.equal(new Set(twins.map(t => t.state.kind)).size, twins.length);
  for (const twin of twins) {
    assert.ok((twin.metadata?.modelIds ?? []).length > 0, `${twin.state.id} should expose model provenance`);
    assert.ok(twin.clone().state.id === twin.state.id);
  }
});

test("valve command changes valve state without mutating unrelated assets", () => {
  const valve = new ValveTwin("V-1", p);
  const pump = new PumpTwin("P-1", { x: 5, y: 0, z: 0 });
  const events: any[] = [];
  const context: any = { now: 0, get: (id: string) => id === valve.state.id ? valve : pump, twins: () => [valve, pump], emit: (e: any) => events.push(e) };
  valve.onEvent({ id: "e1", type: "valve.command", time: 0, sourceId: "operator", targetId: "V-1", payload: { action: "close" } }, context);
  assert.equal(valve.state.metadata.open, false);
  assert.equal(pump.state.active, true);
  assert.equal(events.length, 0);
});
