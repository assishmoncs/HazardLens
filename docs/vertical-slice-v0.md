# Vertical Slice v0 — Emergent Domino Proof

## Goal

Prove that HazardLens can create a non-scripted cascade from independent twins before investing in photorealistic 3D effects.

## Facility

- `TankTwin T-01` — pressurized LPG vessel
- `ValveTwin V-01` — upstream isolation
- `PipeTwin P-01` — process line
- `IgnitionSourceTwin I-01` — pump/electrical source
- `TankTwin T-02` — neighboring vessel
- `WallTwin W-01` — structural barrier
- `WorkerTwin Group-A`
- `RouteTwin R-A`, `RouteTwin R-B`
- `SuppressionTwin D-01` — fixed deluge/cooling coverage
- `WeatherTwin WX-01`

## User-controlled disturbances

- introduce a leak at `P-01`
- change `V-01` opening
- enable/disable `I-01`
- alter wind vector
- fail cooling on `T-02`

## Required emergent chain

The engine must be capable of producing this chain when the physical/model conditions permit it, without scenario timestamps:

```text
P-01 leak
  → ReleaseTwin created
  → concentration/flammable field evolves with WX-01
  → field intersects active I-01
  → FireTwin created
  → thermal exposure reaches T-02 and W-01
  → T-02 shell/pressure risk evolves
  → W-01 damage state evolves
  → if a secondary component fails, a new hazard twin is instantiated
  → risk field invalidates or reprices evacuation routes
```

Different wind or ignition state must be able to terminate or materially change the chain.

## Intervention proof

At any recorded world state, clone the state into at least three branches:

1. No action
2. Isolate `V-01`
3. Isolate `V-01` + activate `D-01`

All branches must run through the same twin/event engine. Compare at minimum:

- active hazard count
- peak exposed asset risk
- number of failed assets
- worker cumulative exposure proxy
- evacuation completion time
- cascade termination time

## 3D contract

The first renderer only needs enough quality to prove spatial causality:

- clickable tanks, pipe, wall, pump, workers, exits
- visible leak/release field
- fire/smoke representation
- heat/threat overlay
- persistent damage state
- route visualization
- intervention preview
- timeline/replay

Photorealistic destruction comes after the simulation state is trustworthy.

## Acceptance criteria

- No scenario ID is used to trigger downstream events.
- Same initial fault produces a different outcome after changing wind/ignition/facility state.
- Every major event is traceable in the Simulation Inspector.
- Reset + replay is deterministic under a fixed random seed.
- Intervention branches are reproducible and compared with measured outputs.
