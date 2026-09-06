import type { TwinState } from '../../../src/core/types.js';

export interface InspectorActionHandler {
  (action: 'isolate' | 'deluge' | 'blowdown' | 'cool', assetId: string): void;
}

export class TwinInspector {
  private panel: HTMLElement;
  private actionHandler?: InspectorActionHandler;

  constructor(targetContainer?: HTMLElement, actionHandler?: InspectorActionHandler) {
    this.actionHandler = actionHandler;
    if (targetContainer) {
      this.panel = targetContainer;
    } else {
      this.panel = document.createElement('div');
      this.panel.style.cssText =
        'position:fixed;right:18px;top:88px;width:340px;color:#eef8ff;background:linear-gradient(145deg,rgba(15,27,38,.92),rgba(4,10,15,.88));border:1px solid rgba(122,175,204,.25);border-radius:14px;padding:16px;font:12px/1.4 Inter,ui-sans-serif,system-ui;z-index:18;display:none;backdrop-filter:blur(18px);box-shadow:0 18px 50px rgba(0,0,0,.5)';
      document.body.appendChild(this.panel);
    }
  }

  setActionHandler(handler: InspectorActionHandler) {
    this.actionHandler = handler;
  }

  show(t?: TwinState) {
    if (!t) {
      this.panel.innerHTML =
        '<div class="hl-kicker" style="padding:12px 6px;text-align:center">SELECT ANY ASSET IN THE 3D SCENE TO INSPECT LIVE TELEMETRY</div>';
      return;
    }

    const tempC = (t.temperatureK - 273.15).toFixed(1);
    const integrityPct = (Math.max(0, Math.min(1, t.integrity)) * 100).toFixed(0);
    const integrityColor = t.integrity > 0.75 ? '#5fe3a1' : t.integrity > 0.4 ? '#ff9b47' : '#ff5f56';
    const kindLabel = t.kind.toUpperCase().replace('-', ' ');
    const tag = String(t.metadata.pAndIdTag ?? t.id);
    const zone = String(t.metadata.zone ?? 'Process Area');
    const chemical = String(t.metadata.chemical ?? 'None');
    const pressure = t.metadata.pressureBar != null ? `${Number(t.metadata.pressureBar).toFixed(1)} bar` : 'Atmospheric';
    const lel = t.metadata.lelPct != null ? `${t.metadata.lelPct}% LEL` : null;

    let extraTelemetryHtml = '';
    if (lel) {
      const lelColor = Number(t.metadata.lelPct) >= 50 ? '#ff5f56' : Number(t.metadata.lelPct) >= 20 ? '#ff9b47' : '#5fe3a1';
      extraTelemetryHtml += `<div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:#8ea6b6">Vapor Concentration:</span><b style="color:${lelColor}">${lel}</b></div>`;
    }
    if (t.metadata.inventoryKg != null) {
      extraTelemetryHtml += `<div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:#8ea6b6">Hydrocarbon Inventory:</span><b>${Number(t.metadata.inventoryKg).toLocaleString()} kg</b></div>`;
    }
    if (t.metadata.delugeActive != null) {
      extraTelemetryHtml += `<div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:#8ea6b6">NFPA 15 Deluge Spray:</span><b style="color:${t.metadata.delugeActive ? '#55d7ff' : '#8ea6b6'}">${t.metadata.delugeActive ? 'ACTIVE (COOLING)' : 'STANDBY'}</b></div>`;
    }
    if (t.metadata.flameDetected != null) {
      extraTelemetryHtml += `<div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:#8ea6b6">Optical UV/IR State:</span><b style="color:${t.metadata.flameDetected ? '#ff5f56' : '#5fe3a1'}">${t.metadata.flameDetected ? 'FLAME CONFIRMED' : 'CLEAR'}</b></div>`;
    }

    const connections = String(t.metadata.connections ?? '');

    this.panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(122,175,204,.18);padding-bottom:10px;margin-bottom:10px">
        <div>
          <div style="font-size:16px;font-weight:900;letter-spacing:.04em;color:#eef8ff">${tag}</div>
          <div class="hl-kicker" style="color:#55d7ff;font-weight:700">${kindLabel} TWIN</div>
        </div>
        <div style="text-align:right">
          <span style="border-radius:999px;padding:3px 8px;font-size:9px;font-weight:800;background:${t.active ? 'rgba(95,227,161,.16)' : 'rgba(255,95,86,.18)'};color:${t.active ? '#5fe3a1' : '#ff5f56'}">
            ${t.active ? 'OPERATIONAL' : 'DEGRADED / TRIPPED'}
          </span>
        </div>
      </div>

      <div style="font-size:11px;display:grid;gap:4px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:#8ea6b6">Process Zone:</span><b>${zone}</b></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:#8ea6b6">Contained Chemical:</span><b style="color:#ffb766">${chemical.toUpperCase()}</b></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:#8ea6b6">Operating Pressure:</span><b>${pressure}</b></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:#8ea6b6">Skin Temperature:</span><b>${tempC} °C (${t.temperatureK.toFixed(0)} K)</b></div>
        ${extraTelemetryHtml}
      </div>

      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:4px">
          <span style="color:#8ea6b6;text-transform:uppercase;letter-spacing:.08em">Structural Integrity</span>
          <b style="color:${integrityColor}">${integrityPct}%</b>
        </div>
        <div style="width:100%;height:6px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden">
          <div style="width:${integrityPct}%;height:100%;background:${integrityColor};transition:width .2s ease"></div>
        </div>
      </div>

      ${connections ? `
        <div style="margin-bottom:12px">
          <div class="hl-kicker" style="margin-bottom:4px">TOPOLOGICAL CONNECTIONS</div>
          <div style="font-size:10px;color:#bfd3de;background:rgba(5,13,20,.6);padding:6px 8px;border-radius:8px;border:1px solid rgba(122,175,204,.14)">
            ${connections.split(',').map(c => `<span style="display:inline-block;padding:2px 6px;margin:2px;background:rgba(85,215,255,.12);border-radius:4px;color:#cdeffd">${c.trim()}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px">
        <button id="hl-inspect-isolate" class="hl-btn hl-btn-cyan" style="font-size:10px;padding:6px 8px;min-height:30px">ISOLATE</button>
        <button id="hl-inspect-deluge" class="hl-btn hl-btn-green" style="font-size:10px;padding:6px 8px;min-height:30px">COOL / DELUGE</button>
      </div>
    `;

    // Bind action buttons
    const isolateBtn = this.panel.querySelector('#hl-inspect-isolate');
    if (isolateBtn) {
      isolateBtn.addEventListener('click', () => {
        this.actionHandler?.('isolate', t.id);
      });
    }
    const delugeBtn = this.panel.querySelector('#hl-inspect-deluge');
    if (delugeBtn) {
      delugeBtn.addEventListener('click', () => {
        this.actionHandler?.('deluge', t.id);
      });
    }
  }
}
