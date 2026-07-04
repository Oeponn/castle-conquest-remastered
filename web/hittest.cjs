// Fires a calibrated mid-power shot at the enemy castle and verifies the
// sleeping pieces wake up and take damage. Drives the real three-tap flow
// (power -> accuracy -> throw); the taps run inside one evaluate so no logic
// tick advances the meter in between, and the sweep is parked on the fixed
// accuracy marker before the third tap so the miss is exactly 0.
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
  // ballAngleY 45 = a 30° launch for player 1; 50% meter -> thrust 1530 ->
  // range (2.234*1530/22)^2 * sin(60°)/49 ≈ 427: direct hit on the castle front
  await page.evaluate(() => {
    const e = window.__engine;
    e.ballAngleY = 45;
    e.firePressed(); // start power sweep
    e.oscVal = Math.PI - Math.asin(0.5); // meter fill = 1-|sin| = 0.5
    e.oscPerc = 0.5;
    e.firePressed(); // set power (thrust 1530), start accuracy sweep
    e.oscPerc = 1 - 31 / 146; // park the sweep on the fixed accuracy marker
    e.firePressed(); // perfect accuracy tap -> throw
  });
  for (let i = 0; i < 150; i++) {
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
