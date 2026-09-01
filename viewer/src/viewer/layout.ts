const css = `
  .hl-ops-rail { right: 16px !important; left: auto !important; width: min(392px, calc(100vw - 32px)) !important; top: 86px !important; bottom: 16px !important; }
  .hl-ops-rail .hl-scroll { padding-left: 0 !important; padding-right: 2px !important; }
  .hl-ops-rail .hl-card { flex: 0 0 auto !important; }
  .hl-ops-rail .hl-summary { min-height: 42px !important; padding: 9px 11px !important; }
  .hl-ops-rail .hl-body { padding: 0 11px 11px !important; }
  .hl-ops-rail .hl-control { padding: 7px 8px !important; min-height: 32px; font-size: 11px; border-radius: 9px; }
  .hl-ops-rail .hl-grid2, .hl-ops-rail .hl-grid3 { gap: 6px !important; }
  .hl-ops-rail .hl-btn { min-height: 32px !important; padding: 7px 7px !important; font-size: 10px !important; line-height: 1.1 !important; border-radius: 9px !important; }
  .hl-ops-rail .hl-btn-primary { min-height: 34px !important; font-size: 10.5px !important; }
  .hl-stream-window { max-height: 300px; overflow-y: auto; overflow-x: hidden; padding-right: 3px; scrollbar-width: thin; }
  .hl-stream-window::-webkit-scrollbar { width: 5px; }
  .hl-stream-window::-webkit-scrollbar-thumb { background: rgba(85,215,255,.28); border-radius: 999px; }
  .hl-stream-window::-webkit-scrollbar-track { background: transparent; }
  .hl-ops-rail .hl-log { grid-template-columns: 43px 70px minmax(0,1fr) !important; font-size: 9.5px !important; gap: 6px !important; }
  .hl-ops-rail .hl-kicker { font-size: 9px !important; }
  .hl-metrics { left: 18px !important; right: 420px !important; }
  @media (max-width: 980px) {
    .hl-ops-rail { width: 330px !important; }
    .hl-metrics { left: 18px !important; right: 348px !important; }
  }
  @media (max-width: 720px) {
    .hl-ops-rail { left: 10px !important; right: 10px !important; width: auto !important; top: 228px !important; }
    .hl-metrics { left: 10px !important; right: 10px !important; top: 82px !important; }
  }
`;
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

const leftRail = document.querySelector<HTMLElement>('div[style*="left:18px;top:88px"]');
const rightRail = document.querySelector<HTMLElement>('div[style*="right:18px;top:88px"]');
const rightInner = rightRail?.querySelector<HTMLElement>('.hl-scroll');

if (leftRail && rightRail && rightInner) {
  const leftInner = leftRail.querySelector<HTMLElement>('.hl-scroll');
  const cards = leftInner ? Array.from(leftInner.querySelectorAll<HTMLElement>(':scope > .hl-card')) : [];
  rightRail.classList.add('hl-ops-rail');
  for (const card of cards) rightInner.appendChild(card);
  leftRail.remove();

  const feedCard = Array.from(rightInner.querySelectorAll<HTMLElement>(':scope > .hl-card')).find(card =>
    card.textContent?.includes('Live Event Stream')
  );
  const feedBody = feedCard?.querySelector<HTMLElement>('.hl-body');
  const eventFeed = feedBody?.querySelector<HTMLElement>('.hl-feed');
  if (eventFeed && feedBody) {
    eventFeed.classList.add('hl-stream-window');
    feedBody.style.paddingBottom = '10px';
  }

  const recentPolicy = document.createElement('div');
  recentPolicy.className = 'hl-kicker';
  recentPolicy.style.cssText = 'padding:7px 2px 1px;opacity:.8';
  recentPolicy.textContent = 'LIVE · newest events appear at top';
  if (eventFeed) eventFeed.parentElement?.insertBefore(recentPolicy, eventFeed);
}
