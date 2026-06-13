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
  // meter starts at perc=1, so two quick spaces = near max power
  await page.keyboard.press(' ');
  await page.waitForTimeout(30);
  await page.keyboard.press(' ');
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
    if (s.state !== lastState) { console.log(`t=${(i*0.1).toFixed(1)}s state=${s.state} p1turn=${s.p1} ball=(${s.x}, z=${s.z})`); lastState = s.state; }
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
