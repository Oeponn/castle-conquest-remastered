// Fires a calibrated mid-power shot at the enemy castle and verifies the
// sleeping pieces wake up and take damage.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  await page.goto('http://localhost:5175/');
  await page.waitForTimeout(800);
  await page.click('button[aria-label="Start Game"]');
  await page.waitForTimeout(300);
  await page.click('.castle-card:not(.locked)');
  await page.waitForTimeout(1500);
  // ~85% meter -> thrust ~1719 -> range ~430: direct hit on the castle front
  await page.evaluate(() => {
    const e = window.__engine;
    e.firePressed(); // start meter
    e.meterOscDist = 0.5 * e.meterContainerH;
    e.firePressed(); // throw at 50% meter (thrust 1530, range ~435)
  });
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(100);
    const s = await page.evaluate(() => window.__engine.state);
    if (s !== 'ballInPlay') break;
  }
  const out = await page.evaluate(() => {
    const e = window.__engine;
    const moved = e.player2Pieces.filter((p, i) => {
      const d = e.p2Default[i];
      const b = p.body.position;
      return Math.hypot(b.x - d.x, b.y - d.y, b.z - d.z) > 5;
    }).length;
    const awake = e.player2Pieces.filter((p) => p.body.sleepState !== 2).length;
    const flags = e.player2Pieces.filter((p) => p.isFlag).map((p) => {
      const t = e.gw.tiltDegrees(p);
      return `${t.x.toFixed(0)}/${t.y.toFixed(0)}`;
    });
    return { state: e.state, thrust: e.lastThrust.toFixed(0), moved, awake, flags };
  });
  console.log(out);
  await browser.close();
})();
