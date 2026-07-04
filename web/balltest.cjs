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
  // Player shot at the AI's own calibration point: 30° launch (ballAngleY 45
  // for player 1), meter 0.566 -> thrust 1566 (87% power) -> range 447, which
  // lands on the enemy castle face. Three-tap flow with a perfect accuracy tap.
  await page.evaluate(() => {
    const e = window.__engine;
    e.ballAngleY = 45;
    e.firePressed();
    e.oscVal = Math.PI - Math.asin(1 - 0.566); // meter fill = 0.566
    e.oscPerc = 1 - 0.566;
    e.firePressed();
    e.oscPerc = 1 - 31 / 146; // park the sweep on the fixed accuracy marker (perfect tap)
    e.firePressed();
  });
  // track ball for both player and AI shots over 40s
  let lastState = '';
  let maxX = -999, aiMinX = 999;
  for (let i = 0; i < 400; i++) {
    const s = await page.evaluate(() => {
      const e = window.__engine;
      return { state: e.state, p1: e.player1Turn,
        x: +e.ballBody.position.x.toFixed(1), z: +e.ballBody.position.z.toFixed(1),
        thrust: e.lastThrust };
    });
    if (s.state !== lastState) { console.log(`t=${(i*0.1).toFixed(1)}s state=${s.state} p1turn=${s.p1} ball=(${s.x}, z=${s.z}) thrust=${s.thrust.toFixed(0)}`); lastState = s.state; }
    if (s.state === 'ballInPlay') {
      if (s.p1 && s.x > maxX) maxX = s.x;
      if (!s.p1 && s.x < aiMinX) aiMinX = s.x;
    }
    await page.waitForTimeout(100);
    if (lastState === 'tallyScore') break;
  }
  console.log('player ball max x reached:', maxX, '(enemy castle ~ +200..230)');
  console.log('AI ball min x reached:', aiMinX, '(player castle ~ -200..-230)');
  await browser.close();
})();
