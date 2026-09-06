# HazardLens

**HazardLens** is an emergent industrial-disaster digital-twin platform for **DER-02: Threat-Zone Estimation for Industrial Fire and Explosion Response**.

Unlike traditional scripted scenario simulators, HazardLens models the **fundamental physics, chemical properties, and assets that cause, propagate, and mitigate industrial catastrophes**. Process equipment, storage vessels, piping networks, safety instrumented systems (SIS), meteorological conditions, gas detectors, fire protection systems, and personnel are modeled as autonomous digital twins. State transitions propagate deterministically through an event fabric, allowing loss-of-containment leaks, vapor cloud dispersion, delayed flash ignition, BLEVE (Boiling Liquid Expanding Vapor Explosion) fireballs, thermal radiation escalation, structural damage, secondary ruptures, and response mitigation to emerge naturally from the facility's live state.

---

## Core Principles

1. **No Fixed Catastrophe Scripts:** Operators or scenarios inject an initial disturbance; all downstream cascading consequences emerge from twin physical state and thermodynamic interaction models.
2. **Asset-Level Twins Own Their State:** Tanks, columns, pipes, valves, and detectors maintain local mass inventories, pressures, skin temperatures, and integrity. The 3D renderer visualizes world state without dictating physics.
3. **Event Fabric Connects Twins:** Thermal radiation flux ($kW/m^2$), blast overpressure ($kPa$), gas concentration ($\% \text{ LEL}$), structural stress, and executive commands (deluge, blowdown, isolation) are first-class causal events.
4. **DER-02 Threat-Zone Estimation:** Automated continuous calculation and 3D visual contour rendering of ISO-radiant thermal exposure zones ($37.5$, $12.5$, $4.7$, and $1.6 \text{ kW/m}^2$) and Lower Explosive Limit ($\text{LEL}$) vapor cloud boundaries.
5. **Counterfactual Intervention & Branching:** Digital twin state can be cloned in real time to simulate candidate emergency response tactics (e.g., fixed water spray deluge vs. emergency flare blowdown) before executing in the field.
6. **Model Provenance & Engineering Standards:** Consequence correlations align with CCPS, TNO Yellow Book, API 520/521, and NFPA 15/69 standards.

---

## Architectural Overview

```text
       ┌─────────────────────────────────────────────────────────┐
       │                 Industrial Twin Library                 │
       │  • Process Units (Distillation Column, Exchangers)     │
       │  • High-Pressure Storage (Horton Sphere, Bullets)      │
       │  • Safety Instrumented Systems (Gas/Flame Detectors)   │
       │  • Active Protection (NFPA 15 Deluge, Flare Header)    │
       │  • Life Safety (Muster Station, Siren, Workers)         │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │                   Causal Event Fabric                   │
       │  • Loss of Containment        • Thermal Exposure        │
       │  • Vapor Cloud Dispersion     • Blast Overpressure      │
       │  • Delayed Vapor Ignition     • Secondary Rupture       │
       │  • BLEVE Fireball             • Safety Executive Trips  │
       └──────────────┬───────────────────────────┬──────────────┘
                      │                           │
                      ▼                           ▼
       ┌─────────────────────────────┐ ┌─────────────────────────┐
       │   Physics & Consequence     │ │   Facility Topology     │
       │  • TNO / CCPS Fireball      │ │  • Process P&ID Streams │
       │  • Point-Source Radiation   │ │  • Containment Bunds    │
       │  • Multi-Substance Database │ │  • Instrumented SIS     │
       └──────────────┬──────────────┘ └──────────┬──────────────┘
                      │                           │
                      └─────────────┬─────────────┘
                                    ▼
                         ┌────────────────────┐
                         │    World State     │
                         └──────────┬─────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 ▼                                     ▼
     Interactive 3D Digital Twin           Counterfactual Decision Support
     • Procedural Industrial Assets        • Branching Simulation
     • DER-02 Threat-Zone Decals           • Response Evaluation
     • Live SCADA Telemetry & Alarms       • Emergency Intervention Matrix
```

---

## Expanded Industrial Digital Twin Library

| Category | Twin Class | Description | Physical & Safety Logic |
| :--- | :--- | :--- | :--- |
| **Separation & Process** | `DistillationColumnTwin` | Multi-tray hydrocarbon fractionation column | Tray differential pressure, bottom reboiler duty, overhead vapor line, and column buckling under thermal exposure. |
| **High-Pressure Storage** | `SphereTankTwin` | Pressurized Horton Sphere for LPG / Propane | Models liquid inventory, unwetted shell overheating, relief valve venting, and catastrophic **BLEVE fireball** consequence. |
| **Emergency Relief** | `FlareStackTwin` | Lattice derrick flare stack with pilot burner | Safely burns hydrocarbon inventory during emergency blowdown and unit depressurization. |
| **Fire Protection** | `DelugeSystemTwin` | NFPA 15 fixed water spray cooling system | Automated or manual high-volume water curtain ($3800 \text{ L/min}$) that reduces incident heat flux by 75% and cools vessel skin. |
| **Gas Detection** | `GasDetectorTwin` | Catalytic bead / IR Lower Explosive Limit sensor | Monitors real-time local $\% \text{ LEL}$; triggers `LOW_ALARM` at 20% LEL and executive `HIGH_HIGH_ALARM` at 50% LEL to trip emergency shutdowns. |
| **Optical Flame Detection** | `FlameDetectorTwin` | Multi-spectrum UV/IR optical flame detector | Line-of-sight optical detection ($120^\circ \text{ FOV}$, $35 \text{ m}$) that detects open flames and automatically trips alarms. |
| **Containment** | `BundWallTwin` | Reinforced concrete secondary containment dike | Encloses tank batteries, retains liquid spill volume, and bounds pool fire surface area. |
| **Rotating Equipment** | `PumpTwin` / `CompressorTwin` | Hydrocarbon feed pumps and gas compressors | Running RPM, thermal generation, mechanical seal failure, and emergency trips. |
| **Critical Process** | `PressureVesselTwin` / `ReactorTwin` | High-pressure ammonia / chemical vessels | Rupture disk mechanics, internal pressure buildup, and runaway reactions. |
| **Life Safety** | `MusterStationTwin` / `AlarmSirenTwin` | Designated emergency evacuation assembly point | Real-time worker muster accountability, audible evacuation siren, and safe staging verification. |
| **Power Distribution** | `GeneratorTwin` | Standby emergency diesel generator | Automatic start upon substation blackout to maintain power to critical safety instrumented systems. |

---

## DER-02 Threat-Zone Estimation

HazardLens implements physical consequence correlations for industrial threat-zone estimation:

1. **Thermal Radiation Threat Thresholds (API 521 / NFPA):**
   - **Zone 1 ($37.5 \text{ kW/m}^2$ - Red):** Immediate fatality in seconds, catastrophic damage to process equipment and structural steel.
   - **Zone 2 ($12.5 \text{ kW/m}^2$ - Orange):** Extreme pain and first-degree burns within 10 seconds; wood ignition threshold.
   - **Zone 3 ($4.7 \text{ kW/m}^2$ - Yellow):** Maximum escape threshold for personnel in protective equipment ($30 \text{ s}$ limit).
   - **Zone 4 ($1.6 \text{ kW/m}^2$ - Blue):** Safe continuous exposure limit for general public and emergency command posts.

2. **BLEVE Fireball Physics (TNO Yellow Book / CCPS):**
   - Fireball diameter: $D = 5.8 \times M^{1/3} \quad (\text{m})$
   - Fireball duration: $t = 0.45 \times M^{1/3} \quad (\text{s})$
   - Center height: $H = 0.75 \times D \quad (\text{m})$
   - Blast overpressure propagation via equivalent TNT mass scaling.

3. **Multi-Substance Chemical Database:**
   - Propane ($C_3H_8$), Methane ($CH_4$), Anhydrous Ammonia ($NH_3$ - toxic ERPG-2), Hydrogen ($H_2$), and Crude Oil.

---

## Running Locally

### Requirements

- Node.js 22+
- npm

### Installation

```bash
npm install
```

### Run Automated Tests

HazardLens includes comprehensive unit and cascade integration tests:

```bash
npm test
```

### Run the Headless Simulation Demo

```bash
npm run demo
```

### Launch the 3D Digital Twin Viewer

```bash
npm run viewer
```

Navigate to the local Vite URL displayed in your terminal (typically `http://localhost:5173`).

### Build for Production

```bash
npm run build:all
```

---

## License

Private repository. All rights reserved.
