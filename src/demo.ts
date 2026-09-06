import { SimulationRuntime } from "./core/runtime.js";
import {
  DistillationColumnTwin,
  IgnitionSourceTwin,
  PipeTwin,
  SphereTankTwin,
  TankTwin,
  WeatherTwin
} from "./twins/process.js";
import {
  DelugeSystemTwin,
  EmergencyShutdownTwin,
  FlameDetectorTwin,
  GasDetectorTwin,
  MusterStationTwin,
  ValveTwin
} from "./twins/infrastructure.js";
import { calculateBleveOutcome, estimateThermalThreatZones } from "./models/threatZones.js";

console.log("========================================================================");
console.log("       HAZARDLENS · DER-02 INDUSTRIAL DISASTER DIGITAL TWIN DEMO        ");
console.log("========================================================================\n");

// Initialize Industrial Digital Twin Facility
const sim = new SimulationRuntime([
  new WeatherTwin("WEATHER", 3.0, 0),
  new DistillationColumnTwin("C-01", { x: -15, y: 0, z: -8 }, "crude_oil"),
  new PipeTwin("P-17", { x: -4, y: 1, z: 0 }, "propane"),
  new ValveTwin("V-17", { x: 0, y: 1, z: 0 }),
  new GasDetectorTwin("GD-01", { x: 4, y: 1.2, z: 0 }, "propane"),
  new IgnitionSourceTwin("M-04", { x: 8, y: 1, z: 0 }),
  new SphereTankTwin("S-01", { x: 18, y: 0, z: -4 }, "propane"),
  new DelugeSystemTwin("DEL-01", { x: 18, y: 1, z: -4 }, "S-01", 3800),
  new FlameDetectorTwin("FD-01", { x: 12, y: 2, z: 2 }),
  new EmergencyShutdownTwin("ESD-01", { x: 2, y: 1, z: 20 }),
  new MusterStationTwin("MUSTER-01", { x: 28, y: 0, z: 24 })
]);

console.log("1. Digital Twin Assets Instantiated:");
sim.snapshot().twins.forEach(t => {
  console.log(`   • [${t.kind.padEnd(20)}] ID: ${t.id.padEnd(10)} Pos: (${t.position.x}, ${t.position.y}, ${t.position.z})`);
});

console.log("\n2. Injecting Loss-of-Containment Fault on Pipe P-17 (0.95 kg/s Propane)...");
sim.emit({
  type: "fault.pipe_leak",
  sourceId: "operator",
  targetId: "P-17",
  payload: { rateKgS: 0.95, leakAreaMm2: 24, chemical: "propane" }
});

console.log("3. Stepping simulation through physical consequence cascade (T = 0s to 12s)...");
sim.run(12, 0.25);

const snap = sim.snapshot();
console.log(`\nSimulation Clock: ${snap.time.toFixed(1)}s | Total Events: ${snap.totalEvents}`);

console.log("\n4. Consequence Propagation Events:");
snap.events
  .filter(e => e.type !== "thermal.exposure")
  .forEach(e => {
    console.log(`   [${e.time.toFixed(2)}s] ${e.type.padEnd(22)} Source: ${e.sourceId.padEnd(12)} Target: ${e.targetId ?? 'ALL'}`);
  });

console.log("\n5. DER-02 Threat-Zone Estimation for High-Pressure LPG Sphere S-01:");
const sphere = snap.twins.find(t => t.id === "S-01")!;
console.log(`   • Sphere Temperature: ${sphere.temperatureK.toFixed(1)} K (${(sphere.temperatureK - 273.15).toFixed(1)} °C)`);
console.log(`   • Operating Pressure: ${Number(sphere.metadata.pressureBar).toFixed(1)} bar (Max Design: ${sphere.metadata.maxPressureBar} bar)`);
console.log(`   • Cumulative Thermal Dose: ${Number(sphere.metadata.thermalDose).toFixed(1)} kW·s/m²`);
console.log(`   • BLEVE Risk Index: ${(Number(sphere.metadata.bleveRisk ?? 0) * 100).toFixed(1)}%`);

const bleve = calculateBleveOutcome({ massKg: 15000, chemicalId: "propane" });
console.log(`\n   Worst-Case BLEVE Fireball Projection:`);
console.log(`     - Maximum Fireball Diameter: ${bleve.fireballDiameterM.toFixed(1)} m`);
console.log(`     - Fireball Duration:         ${bleve.fireballDurationS.toFixed(1)} s`);
console.log(`     - Peak Radiative Heat Power: ${bleve.totalRadiativePowerMw.toFixed(1)} MW`);
console.log(`     - 37.5 kW/m² Fatal Zone:     Radius ≤ ${bleve.threatDistances.zone37_5KwM2.toFixed(1)} m`);
console.log(`     - 12.5 kW/m² Burn Zone:      Radius ≤ ${bleve.threatDistances.zone12_5KwM2.toFixed(1)} m`);
console.log(`     - 4.7 kW/m² Injury Limit:    Radius ≤ ${bleve.threatDistances.zone4_7KwM2.toFixed(1)} m`);
console.log(`     - 21 kPa Heavy Blast Radius: Radius ≤ ${bleve.blastRadiiKpa.zone21Kpa.toFixed(1)} m`);

console.log("\n========================================================================");
console.log("                  DEMO COMPLETED SUCCESSFULLY                           ");
console.log("========================================================================\n");
