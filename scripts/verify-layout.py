"""Opens the built app in headless Chromium, takes screenshots, and measures alignment."""
import json, sys
from playwright.sync_api import sync_playwright

URL = 'http://localhost:4173/'
SIZES = [('desktop', 1440, 900), ('laptop', 1024, 768), ('phone', 390, 844)]

CHECKS = """() => {
  const r = (el) => el.getBoundingClientRect();
  const out = [];
  const near = (a, b, tol = 0.6) => Math.abs(a - b) <= tol;
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth) out.push(`page scrolls sideways (${de.scrollWidth} > ${de.clientWidth})`);

  const cols = [...document.querySelectorAll('.col')];
  const wraps = cols.map((c) => r(c.querySelector('.barwrap')));
  if (!wraps.every((w) => near(w.bottom, wraps[0].bottom))) out.push('bar baselines differ');
  cols.forEach((c, i) => {
    const cr = r(c), bar = r(c.querySelector('.bar')), rail = r(c.querySelector('.rail'));
    if (!near(bar.left, cr.left) || !near(bar.width, cr.width)) out.push(`bar ${i} not column-width`);
    if (!near(rail.left, cr.left) || !near(rail.width, cr.width)) out.push(`rail ${i} misaligned`);
    c.querySelectorAll('.mark i').forEach((m) => {
      const mr = r(m); if (!near(mr.left + mr.width / 2, cr.left + cr.width / 2)) out.push(`marker ${i} off-centre`);
    });
  });
  const widths = cols.map((c) => r(c).width);
  if (Math.max(...widths) - Math.min(...widths) > 0.01) out.push('column widths uneven');
  if (!widths.every((w) => Number.isInteger(w))) out.push('column width is fractional: ' + widths[0]);
  const gaps = cols.slice(1).map((c, i) => r(c).left - r(cols[i]).right);
  if (Math.max(...gaps) - Math.min(...gaps) > 0.01) out.push('gaps between bars uneven');
  const st = r(document.querySelector('.cols').parentElement), cr = r(document.querySelector('.cols'));
  if (!near(cr.left - st.left, st.right - cr.right, 1)) out.push('bars not centred in stage');

  const tabs = [...document.querySelectorAll('.tab')].map(r);
  const rows = [...new Set(tabs.map((t) => Math.round(t.top)))];
  rows.forEach((top) => {
    const row = tabs.filter((t) => Math.round(t.top) === top);
    if (!row.every((t) => near(t.height, row[0].height))) out.push('tab heights differ');
  });

  const t = document.querySelector('.transport');
  const cy = (el) => r(el).top + r(el).height / 2;
  const btns = [...t.querySelectorAll('.btn')];
  if (window.innerWidth >= 640 && !btns.every((b) => near(r(b).height, 44) && near(r(b).width, 44))) out.push('transport buttons differ in size');
  if (window.innerWidth >= 640) {
    const ys = [...btns, t.querySelector('.scrub'), t.querySelector('.stepout')].map(cy);
    if (!ys.every((y) => near(y, ys[0], 1))) out.push('transport items not on one centre line');
  }

  const side = r(document.querySelector('.side'));
  document.querySelectorAll('.kv').forEach((kv) => kv.querySelectorAll('dd').forEach((d) => { if (!near(r(d).right, r(kv).right, 1)) out.push('value not flush right: ' + d.textContent); }));
  document.querySelectorAll('.fl').forEach((f) => { if (f.children.length === 2 && !near(r(f.children[1]).right, side.right, 1)) out.push('slider value not flush right'); });
  document.querySelectorAll('.side input, .side select, .side .wide').forEach((d) => {
    if (!near(r(d).left, side.left, 1) || !near(r(d).right, side.right, 1)) out.push('sidebar control not full width');
  });

  const mainKids = ['.tabs', '.stage', '.nowrow', '.transport', '.note'].map((s) => r(document.querySelector(s)));
  for (let i = 1; i < mainKids.length; i++) if (mainKids[i].top < mainKids[i - 1].bottom - 0.5) out.push('main blocks overlap');
  if (window.innerWidth > 900 && !near(r(document.querySelector('.tabs')).top, side.top, 1)) out.push('sidebar top not aligned with tabs');

  document.querySelectorAll('.tab, .stepout, .legend li, .kv dt, .kv dd, .fl span, button, h1, h2, h3, .about, .cmp th, .cmp td, .counts dt, .counts dd').forEach((e) => {
    if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).display !== 'inline') out.push('text clipped: ' + e.textContent.slice(0, 30));
  });
  // Code panel: equal line heights, line numbers flush right, nothing clipped or scrolling.
  const code = document.querySelector('.code'), lns = [...code.querySelectorAll('.ln')];
  if (!lns.every((l) => near(r(l).height, 22))) out.push('code line heights differ');
  const nums = lns.map((l) => r(l.querySelector('b')).right);
  if (!nums.every((x) => near(x, nums[0]))) out.push('code line numbers not aligned');
  const txt = lns.map((l) => r(l.querySelector('span')).left);
  if (!txt.every((x) => near(x, txt[0]))) out.push('code text not aligned');
  if (code.scrollWidth > code.clientWidth + 1) out.push('code needs horizontal scroll');
  if (lns.filter((l) => l.classList.contains('on')).length > 1) out.push('more than one code line highlighted');
  const on = code.querySelector('.ln.on');
  if (on && !near(r(on).width, r(code).width - 2, 1.5)) out.push('highlight band not full width');

  // Analysis row lines up with the columns above it.
  const lowl = r(document.querySelector('.lowl')), lowr = r(document.querySelector('.lowr')), mainR = r(document.querySelector('.main'));
  if (innerWidth > 900) {
    if (!near(lowl.left, mainR.left, 1)) out.push('analysis left edge not aligned with main');
    if (!near(lowr.left, side.left, 1) || !near(lowr.right, side.right, 1)) out.push('table column not aligned with sidebar');
  }
  const table = document.querySelector('.cmp');
  for (const col of [2, 3]) {
    const cells = [...table.querySelectorAll(`tr > :nth-child(${col})`)].map((c) => r(c).right);
    if (!cells.every((x) => near(x, cells[0]))) out.push('table column ' + col + ' not flush right');
  }
  if (r(table).right > lowr.right + 1) out.push('table overflows its column');
  if ([...document.querySelectorAll('.cmp tr[aria-current]')].length !== 1) out.push('current algorithm row not marked exactly once');
  const now = document.querySelector('.now');
  if (now.scrollWidth > now.clientWidth + 1) out.push('narration truncated');
  document.querySelectorAll('body *').forEach((e) => {
    const b = r(e); if (b.width && b.right > innerWidth + 1) out.push('outside viewport: ' + e.className);
  });
  return [...new Set(out)];
}"""

problems = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, w, h in SIZES:
        pg = b.new_page(viewport={'width': w, 'height': h})
        pg.goto(URL); pg.wait_for_selector('.col')
        pg.evaluate('document.fonts.ready')
        pg.screenshot(path=f'/tmp/shots/{name}-1-start.png', full_page=True)
        problems[f'{name}/start'] = pg.evaluate(CHECKS)
        # Run at top speed for a moment, then pause mid-run.
        pg.fill('.side input[type=range] >> nth=0', '100') if False else None
        pg.evaluate("""() => { const s = document.querySelector('.side input[type=range]');
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(s, '75');
          s.dispatchEvent(new Event('input', { bubbles: true })); }""")
        pg.click('[aria-label=Play]'); pg.wait_for_timeout(700); pg.click('[aria-label=Pause]')
        pg.screenshot(path=f'/tmp/shots/{name}-2-mid.png', full_page=True)
        problems[f'{name}/mid'] = pg.evaluate(CHECKS)
        pg.click('[aria-label="Jump to end"]')
        pg.screenshot(path=f'/tmp/shots/{name}-3-end.png', full_page=True)
        problems[f'{name}/end'] = pg.evaluate(CHECKS)
        # Every algorithm: after one step a code line must be lit, and the layout must hold.
        pg.click('[aria-label="Back to start"]')
        for tab in ['Bubble', 'Selection', 'Insertion', 'Merge', 'Quick', 'Heap']:
            pg.click(f'.tab:text-is("{tab}")')
            for i in range(1, 6):
                pg.click('[aria-label="Step forward"]')
                lit = pg.evaluate("document.querySelectorAll('.ln.on').length")
                if lit > 1: problems.setdefault(f'{name}/{tab}', []).append(f'{lit} lines lit')
            pg.click('[aria-label="Step forward"]')
            problems[f'{name}/{tab}-code'] = pg.evaluate(CHECKS)
            pg.screenshot(path=f'/tmp/shots/{name}-5-{tab}.png', full_page=True)
        # Stress cases: biggest array on each algorithm.
        for tab in ['Bubble', 'Merge', 'Heap']:
            pg.click(f'.tab:text-is("{tab}")')
            pg.evaluate("""() => { const s = document.querySelectorAll('.side input[type=range]')[1];
              Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(s, '120');
              s.dispatchEvent(new Event('input', { bubbles: true })); }""")
            pg.click('[aria-label="Step forward"]'); pg.click('[aria-label="Step forward"]')
            problems[f'{name}/{tab}-n120'] = pg.evaluate(CHECKS)
        pg.screenshot(path=f'/tmp/shots/{name}-4-n120.png', full_page=True)
        pg.close()
    b.close()

bad = {k: v for k, v in problems.items() if v}
print(json.dumps(bad, indent=1) if bad else f'{len(problems)} layout checks passed, 0 problems')
