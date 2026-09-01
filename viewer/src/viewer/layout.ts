const css = `
  .hl-ops-rail {
    right: 12px !important;
    left: auto !important;
    width: min(336px, calc(100vw - 24px)) !important;
    top: 78px !important;
    bottom: 12px !important;
  }

  .hl-ops-rail .hl-scroll {
    gap: 7px !important;
    padding: 0 1px 4px 0 !important;
  }

  .hl-ops-rail .hl-card {
    flex: 0 0 auto !important;
    border-radius: 10px !important;
  }

  .hl-ops-rail .hl-summary {
    min-height: 36px !important;
    padding: 7px 9px !important;
    font-size: 10px !important;
    line-height: 1.15 !important;
  }

  .hl-ops-rail .hl-body {
    padding: 0 9px 9px !important;
    font-size: 9.5px !important;
    line-height: 1.25 !important;
  }

  .hl-ops-rail .hl-control {
    min-height: 28px !important;
    padding: 5px 7px !important;
    font-size: 9px !important;
    line-height: 1.1 !important;
    border-radius: 7px !important;
  }

  .hl-ops-rail .hl-grid2,
  .hl-ops-rail .hl-grid3 {
    gap: 5px !important;
  }

  .hl-ops-rail .hl-btn {
    min-height: 28px !important;
    min-width: 0 !important;
    padding: 5px 6px !important;
    font-size: 9px !important;
    line-height: 1.05 !important;
    border-radius: 7px !important;
    white-space: nowrap !important;
  }

  .hl-ops-rail .hl-btn-primary {
    min-height: 30px !important;
    padding: 6px 7px !important;
    font-size: 9.5px !important;
  }

  .hl-ops-rail .hl-kicker {
    font-size: 8px !important;
    line-height: 1.1 !important;
  }

  .hl-ops-rail .hl-log {
    grid-template-columns: 36px 58px minmax(0,1fr) !important;
    gap: 4px !important;
    font-size: 8.5px !important;
    line-height: 1.15 !important;
  }

  .hl-stream-window {
    max-height: 235px !important;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 2px;
    scrollbar-width: thin;
  }

  .hl-stream-window::-webkit-scrollbar { width: 4px; }
  .hl-stream-window::-webkit-scrollbar-thumb { background: rgba(85,215,255,.28); border-radius: 999px; }
  .hl-stream-window::-webkit-scrollbar-track { background: transparent; }

  .hl-ops-rail .hl-metric,
  .hl-ops-rail .hl-stat {
    min-height: 0 !important;
  }

  .hl-metrics {
    left: 14px !important;
    right: 350px !important;
  }

  @media (max-width: 980px) {
    .hl-ops-rail {
      width: 300px !important;
      right: 10px !important;
    }
    .hl-metrics {
      left: 12px !important;
      right: 312px !important;
    }
  }

  @media (max-width: 720px) {
    .hl-ops-rail {
      left: 8px !important;
      right: 8px !important;
      width: auto !important;
      top: 210px !important;
    }
    .hl-metrics {
      left: 8px !important;
      right: 8px !important;
      top: 74px !important;
    }
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
    feedBody.style.paddingBottom = '8px';
  }

  const recentPolicy = document.createElement('div');
  recentPolicy.className = 'hl-kicker';
  recentPolicy.style.cssText = 'padding:5px 1px 1px;opacity:.8';
  recentPolicy.textContent = 'LIVE · newest events appear at top';
  if (eventFeed) eventFeed.parentElement?.insertBefore(recentPolicy, eventFeed);
}
