// Pocket Town smoke test.
// Usage: NODE_PATH=<dir>/node_modules node smoke-test.cjs [url]
// url defaults to the live site; a file:///.../index.html URL tests a local copy.
// Exits with code 1 if any check fails or the page throws an error.
const { chromium } = require('playwright');

const target = process.argv[2] || 'https://birr1979.github.io/Home_game/';

(async () => {
  let browser;
  try { browser = await chromium.launch({ channel: 'msedge' }); } catch (_) { browser = await chromium.launch(); }
  // 3000 x 700 shows the whole world at scale 1, so every room is on screen.
  const ctx = await browser.newContext({ viewport: { width: 3000, height: 700 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__audio = [];
    const A = window.Audio;
    window.Audio = function (src) { const el = new A(src); window.__audio.push(el); return el; };
  });

  const results = [];
  const check = (name, ok, note = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${note ? `  (${note})` : ''}`);
  const box = async (sel) => page.locator(sel).boundingBox();

  await page.goto(target, { waitUntil: 'load' });
  check('title screen shows Play', await page.isVisible('#playBtn'));

  // How-to guide: walk to the last step, whose button starts the game.
  await page.click('#howBtn');
  let steps = 1;
  while (steps < 20 && !/play/i.test(await page.textContent('#stepNext'))) { await page.click('#stepNext'); steps++; }
  check('guide reaches "Let\'s play!"', steps > 1 && steps < 20, `${steps} steps`);
  await page.click('#stepNext');
  await page.waitForTimeout(800);
  check('guide starts the game', await page.evaluate(() => document.getElementById('intro').hidden && document.getElementById('howto').hidden));

  const ents = await page.locator('.ent').count();
  check('default town has 13 things', ents === 13, `found ${ents}`);

  // Feed the apple (id 8) to Mo (id 7): drop it on Mo's mouth.
  const apple = await box('.ent[data-id="8"]'), mo = await box('.ent[data-id="7"]');
  if (apple && mo) {
    await page.mouse.move(apple.x + apple.width / 2, apple.y + apple.height / 2);
    await page.mouse.down();
    await page.mouse.move(mo.x + mo.width / 2, mo.y + mo.height * (88 / 220), { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(700);
    check('feeding a friend', (await page.locator('.ent[data-id="8"]').count()) === 0);
  } else check('feeding a friend', false, 'apple or Mo not found');

  // The fridge makes food.
  const before = await page.locator('.item').count();
  const fridge = await box('[data-f="fridge"]');
  await page.mouse.click(fridge.x + fridge.width / 2, fridge.y + fridge.height * 0.7);
  await page.waitForTimeout(400);
  check('fridge spawns food', (await page.locator('.item').count()) === before + 1);

  // The bedroom lamp turns the lights off.
  const lamp = await box('[data-f="lamp0"]');
  await page.mouse.click(lamp.x + lamp.width / 2, lamp.y + lamp.height * 0.7);
  await page.waitForTimeout(200);
  check('lamp makes the bedroom dark', await page.evaluate(() => document.getElementById('shade0').classList.contains('on')));

  // Music: the rendered playlist exists and is playing.
  await page.waitForFunction(() => window.__audio.some((e) => e.duration > 10), null, { timeout: 20000 }).catch(() => {});
  const music = await page.evaluate(() => {
    const el = window.__audio.find((e) => e.duration > 10);
    return el ? { playing: !el.paused, seconds: Math.round(el.duration) } : null;
  });
  check('music is playing', !!(music && music.playing), music ? `${music.seconds}s track` : 'no music track');
  await page.click('#music');
  check('🎵 turns music off', await page.evaluate(() => { const el = window.__audio.find((e) => e.duration > 10); return !el || el.paused; }));
  await page.click('#music');

  // The ? button reopens the guide.
  await page.click('#help');
  check('? opens the guide', await page.isVisible('#howto'));
  await page.click('#howClose');

  // Saving.
  await page.waitForTimeout(600);
  check('town is saved', await page.evaluate(() => !!localStorage.getItem('pocket-town-save-v1')));

  // Service worker cache version (http/https only).
  if (/^https?:/.test(target)) {
    const sw = await page.evaluate(async () => (await (await fetch('sw.js', { cache: 'no-store' })).text()).match(/CACHE = '([^']+)'/));
    check('service worker reachable', !!sw, sw ? sw[1] : '');
  }

  await browser.close();
  console.log(`Pocket Town smoke test: ${target}`);
  console.log(results.join('\n'));
  if (errors.length) console.log('PAGE ERRORS:\n  ' + errors.join('\n  '));
  const failed = results.some((r) => r.startsWith('FAIL')) || errors.length > 0;
  console.log(failed ? 'RESULT: FAILED' : 'RESULT: ALL PASSED');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('Smoke test crashed:', e.message); process.exit(1); });
