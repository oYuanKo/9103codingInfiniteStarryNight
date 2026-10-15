const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const fixturePath = path.join(__dirname, 'fixtures', 'refactor-pixels-baseline.json');
const baseline = process.argv.includes('--baseline');
const original = process.argv.includes('--original');
if (baseline && !original) throw Error('Create baselines only from --original archived runtime');
const seeds = [12, 89, 205], depths = [.2, .6, .8];
const archivedFiles = ['sketch.js', 'debug_gui.js', 'perlin_mechanic.js', 'input_mechanic.js'];
const sourceHashes = Object.fromEntries(archivedFiles.map(name => {
  // Git may check these files out with LF or CRLF; source identity is unchanged.
  const text = fs.readFileSync(path.join(root, 'legacy', name), 'utf8').replace(/\r\n/g, '\n');
  return ['legacy/' + name, createHash('sha256').update(text).digest('hex')];
}));
let fixture;
if (!baseline) {
  fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(fixture.provenance.runtime, 'legacy/sketch.js');
  assert.deepEqual(fixture.provenance.sourceHashes, sourceHashes, 'Archived sources changed; review and regenerate the original fixture');
  assert.deepEqual(fixture.seeds, seeds);
  assert.deepEqual(fixture.portalDepths, depths);
  for (const name of [...seeds, ...depths.map(p => 'portal' + p)]) {
    assert.match(fixture.hashes[name], /^[a-f0-9]{64}$/, 'Missing/invalid reference hash: ' + name);
  }
}
(async () => {
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, req.url === '/' ? 'index.html' : req.url.split('?')[0].slice(1));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    if (original && file.endsWith('index.html')) {
      let html = fs.readFileSync(file, 'utf8');
      // Fail closed if the application's script wiring changes.
      for (const name of ['app_controller.js', 'input_controller.js', 'sketch.js']) {
        assert(html.includes('<script src="' + name + '"></script>'), 'Missing script substitution: ' + name);
      }
      html = html.replace('<script src="app_controller.js"></script>', archivedFiles.slice(1).map(name => '<script src="legacy/' + name + '"></script>').join(''))
        .replace('<script src="input_controller.js"></script>', '')
        .replace('src="sketch.js"', 'src="legacy/sketch.js"');
      res.end(html);
    } else res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => typeof v2Camera !== 'undefined' && v2Camera && brushFlowMap);
    if (original) assert(await page.evaluate(() => typeof setupPaintingAppV2 === 'undefined' && typeof InputMechanic === 'function' && BRUSH_V2_PREVIEW === true), 'Fixture must boot the archived original');
    await page.evaluate(() => {
      noLoop(); cosmicThresholdSettingsV2.enabled = false; brushFlowSettings.paused = true; brushFlowSettings.enabled = false; brushFlowSettings.cursorEnabled = false;
      window.snapshotHash = async () => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', drawingContext.getImageData(0, 0, width, height).data))).map(n => n.toString(16).padStart(2, '0')).join('');
      window.settleSnapshot = async () => {
        for (let n = 0; n < 1600; n++) {
          draw(); await new Promise(r => setTimeout(r, 4));
          if (!brushDetailV2.job) { draw(); if (!brushDetailV2.job) break; }
          if (n === 1599) throw Error('atlas timeout');
        }
        await new Promise(r => setTimeout(r, 180)); draw();
      };
    });
    const archived = fs.readFileSync(path.join(root, 'legacy/sketch.js'), 'utf8');
    const start = archived.indexOf('function draw()'), end = archived.indexOf('// Placeholder scenes');
    assert(start >= 0 && end > start, 'Archived draw extraction boundaries changed');
    const drawReference = archived.slice(start, end).replace('function draw()', 'function drawLegacyReference()').replace('if (BRUSH_V2_PREVIEW)', 'if (true)');
    await page.addScriptTag({ content: drawReference });
    // Hard regression gate: exact pixels, same browser/context/assets, no tolerances.
    async function compareLive(name) {
      return page.evaluate(async name => {
        drawLegacyReference(); const reference = await snapshotHash();
        draw(); const actual = await snapshotHash();
        if (reference !== actual) throw Error('Same-resource old/new pixels changed: ' + name);
        return actual;
      }, name);
    }
    const hashes = {};
    const screenshot = name => page.locator('canvas').first().screenshot({ path: path.join(__dirname, 'step8-' + (baseline ? 'before' : 'after') + '-' + name + '.png') });
    for (const [index, seed] of seeds.entries()) {
      await page.keyboard.press(['q', 'w', 'e'][index]);
      assert.equal(await page.evaluate(() => universeSeed), seed);
      await page.evaluate(() => draw());
      hashes[seed] = await compareLive('seed ' + seed);
      await screenshot(seed);
    }
    await page.keyboard.press('q');
    await page.evaluate(async () => {
      const star = brushV2.stars[0];
      Object.assign(v2Camera, stillCameraV2(3, Math.max(width * (1 - 3), Math.min(0, width / 2 - star.x * 3)), Math.max(height * (1 - 3), Math.min(0, height / 2 - star.y * 3))));
      requestPortalV2(childEdgeV2(star), 'in', -100);
      while (nestedV2.pending || nestedV2.preload) { updateChildPreloadV2(); await new Promise(requestAnimationFrame); }
    });
    for (const p of depths) {
      await page.evaluate(async p => { nestedV2.transition.progress = nestedV2.transition.targetProgress = p; await settleSnapshot(); }, p);
      hashes['portal' + p] = await compareLive('portal ' + p);
      await screenshot('portal-' + p);
    }
    assert.deepEqual(errors, []);
    if (baseline) {
      fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
      fs.writeFileSync(fixturePath, JSON.stringify({ schemaVersion: 1,
        provenance: { runtime: 'legacy/sketch.js', sourceHashes, browser: browser.version(), p5: await page.evaluate(() => p5.VERSION) },
        seeds, portalDepths: depths, hashes }, null, 2) + '\n');
      console.log('SAVED original-only JSON fixture:', fixturePath);
    } else {
      const different = Object.keys(hashes).filter(name => hashes[name] !== fixture.hashes[name]);
      if (different.length) console.log('Reference hash differences (informational; cross-run/browser/GPU rasterisation may vary):', different);
      console.log('PASS six exact same-environment old/new pixel comparisons; fixture schema and archived-source provenance verified');
    }
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
