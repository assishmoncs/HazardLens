# HazardLens

**HazardLens** is an emergent industrial-disaster digital-twin platform for DER-02: Threat-Zone Estimation for Industrial Fire and Explosion Response.

The core idea is deliberately different from a scripted scenario simulator: HazardLens models the **things that cause disasters**. Tanks, pipes, valves, structures, weather, hazards, workers, and response systems are represented as independent twins. Their state changes propagate through an event fabric, allowing leaks, ignition, fire spread, thermal escalation, structural damage, secondary releases, explosions, evacuation changes, and mitigation outcomes to emerge from the current facility state.

## Core principles

1. **No fixed catastrophe scripts.** The operator injects an initial disturbance; downstream effects come from twin state and interaction models.
2. **Asset-level twins own their state.** The renderer never decides physical outcomes.
3. **Events connect twins.** Thermal exposure, overpressure, flow loss, rupture, ignition, geometry changes, and intervention actions are first-class events.
4. **3D is a view of world state.** Damage, fire, plume, evacuation, and suppression visuals reflect simulation state rather than drive it.
5. **Adaptive fidelity.** Expensive models are activated around risk; stable assets remain lightweight.
6. **Counterfactual intervention.** A live state can be cloned and candidate response plans simulated before selection.
7. **Model provenance and uncertainty are visible.** HazardLens is decision-support simulation, not a claim of exact future prediction.

## Architecture

```text
Twin Library ──→ Event Fabric ──→ Physics / Consequence Models
      │                                │
      └──────────────→ World State ←───┘
                            │
                 ┌──────────┴──────────┐
                 ↓                     ↓
             3D Renderer        Forecast / Intervention
```

## Running locally

### Requirements

- Node.js 22+
- npm

### Install dependencies

```bash
npm install
```

### Run simulation tests

```bash
npm test
```

### Run the headless simulation demo

```bash
npm run demo
```

### Start the 3D viewer

```bash
npm run viewer
```

Then open the local Vite URL shown in the terminal.

### Build everything

```bash
npm run build:all
```

## Current status

The project currently contains:

- deterministic event-driven twin runtime
- emergent hazard propagation
- thermal exposure and secondary failure modelling
- counterfactual intervention foundation
- Three.js digital twin viewer
- interactive twin inspection

The next development phases focus on higher-fidelity industrial assets, consequence models, and expanded response simulation.
