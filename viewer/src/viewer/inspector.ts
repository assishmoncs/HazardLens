import type { TwinState } from '../../../src/core/types.js';

export class TwinInspector {
  private panel=document.createElement('div');
  constructor(){
    this.panel.style.cssText='position:fixed;right:18px;top:18px;width:290px;color:#eef7ff;background:#071019e8;border:1px solid #263746;border-radius:14px;padding:16px;font:13px system-ui;z-index:8;display:none;backdrop-filter:blur(12px)';
    document.body.appendChild(this.panel);
  }
  show(t?:TwinState){
    if(!t){this.panel.style.display='none';return;}
    this.panel.style.display='block';
    this.panel.innerHTML=`<b style="font-size:18px">${t.id}</b><br/><span style="opacity:.7">${t.kind.toUpperCase()} TWIN</span><hr/><div>Integrity: ${(t.integrity*100).toFixed(1)}%</div><div>Temperature: ${t.temperatureK.toFixed(1)} K</div><div>Fidelity: F${t.fidelity}</div><br/><b>Metadata</b><pre style="white-space:pre-wrap">${JSON.stringify(t.metadata,null,2)}</pre>`;
  }
}
