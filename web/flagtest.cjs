const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  await page.goto('http://localhost:5175/');
  await page.waitForTimeout(800);
  await page.click('button[aria-label="Start Game"]');
  await page.waitForTimeout(300);
  await page.click('.castle-card:not(.locked)');
  for (const t of [2, 5, 10]) {
    await page.waitForTimeout(t === 2 ? 2000 : 3000 + (t===10?2000:0));
    const tilts = await page.evaluate(() => {
      const e = window.__engine;
      const f = (list) => list.filter(p => p.isFlag).map(p => {
        const t = e.gw.tiltDegrees(p);
        return `x=${t.x.toFixed(1)},y=${t.y.toFixed(1)}`;
      });
      return { p1: f(e.player1Pieces), p2: f(e.player2Pieces) };
    });
    console.log(`t=${t}s p1 flags:`, tilts.p1.join(' | '));
    console.log(`t=${t}s p2 flags:`, tilts.p2.join(' | '));
  }
  await browser.close();
})();
