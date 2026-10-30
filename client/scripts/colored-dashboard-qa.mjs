import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
const output = '.impeccable/review/colored-dashboard';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const errors = []; let checks = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, locale: 'vi-VN', reducedMotion: 'reduce' });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/rooms');
  await page.locator('.demo-toggle').click();
  await page.locator('.demo-panel select').first().selectOption('host');
  await page.locator('.demo-toggle').click();
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem('studiohub.demo.v1')));
  const before = process.env.BEFORE_ONLY === '1';
  for (const motion of before ? ['reduce'] : ['reduce', 'no-preference']) {
    await page.emulateMedia({ reducedMotion: motion });
    for (const width of before ? [1440, 390] : [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1050 });
      for (const route of ['host', 'host/reports', 'host/rates']) {
        await page.goto('http://localhost:3000/' + route);
        await expect(page.locator('.ops-shell')).toBeVisible();
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); checks++;
        if (!before && route !== 'host/rates') {
          await expect(page.locator('.dashboard-kpi')).toHaveCount(4);
          const colors = await page.locator('.dashboard-kpi').evaluateAll(nodes => nodes.map(n => getComputedStyle(n).backgroundColor));
          expect(new Set(colors).size).toBe(4); checks++;
        }
        if ([390,1440].includes(width)) await page.screenshot({ path: `${output}/${before ? 'before' : 'after'}-${route.replaceAll('/', '-')}-${motion}-${width}.png`, fullPage: true });
      }
      await page.getByRole('button', { name: 'Chỉnh sửa bảng giá Daylight Studio', exact: true }).click();
      const modal = page.locator('.host-pricing-modal');
      for (const label of ['Giá nền', 'Gói thuê & ekip', 'Gói nổi bật', 'Xem trước']) {
        await modal.getByRole('tab', { name: label, exact: true }).click();
        await expect(modal.getByRole('button', { name: 'Lưu thay đổi', exact: true })).toBeInViewport();
        expect(await modal.evaluate(n => n.scrollWidth <= n.clientWidth + 1)).toBe(true);
        if (!before) expect(await modal.locator('label').evaluateAll(nodes => nodes.filter(n => n.getClientRects().length).every(n => parseFloat(getComputedStyle(n).fontSize) >= 15))).toBe(true);
        checks += 2;
        if ([390,1440].includes(width)) await page.screenshot({ path: `${output}/${before ? 'before' : 'after'}-editor-${['Giá nền','Gói thuê & ekip','Gói nổi bật','Xem trước'].indexOf(label)}-${motion}-${width}.png` });
      }
      await page.keyboard.press('Escape');
      await expect(modal).toHaveCount(0);
    }
  }
  await page.setViewportSize({ width: 360, height: 700 });
  await page.goto('http://localhost:3000/host/rates');
  const edit = page.getByRole('button', { name: 'Chỉnh sửa bảng giá Daylight Studio', exact: true });
  await edit.click();
  const modal = page.locator('.host-pricing-modal');
  await modal.getByRole('tab', { name: 'Giá nền', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(modal.getByRole('tab', { name: 'Gói thuê & ekip', exact: true })).toBeFocused();
  await expect(modal.getByRole('tab', { name: 'Gói thuê & ekip', exact: true })).toHaveAttribute('aria-selected', 'true');
  await modal.locator('.host-editor-content').evaluate(n => n.scrollTop = n.scrollHeight);
  await expect(modal.getByRole('button', { name: 'Lưu thay đổi', exact: true })).toBeInViewport();
  const geometry = await modal.evaluate(n => ({ content: n.querySelector('.host-editor-content').getBoundingClientRect().bottom, footer: n.querySelector('.host-editor-footer').getBoundingClientRect().top }));
  expect(geometry.content).toBeLessThanOrEqual(geometry.footer + 1);
  await modal.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(edit).toBeFocused(); checks += 5;
  for (const motion of ['reduce', 'no-preference']) {
    await page.emulateMedia({ reducedMotion: motion });
    await edit.hover();
    await expect(edit).toHaveCSS('border-top-width', '2px');
    await expect(edit).toHaveCSS('transform', motion === 'reduce' ? 'none' : 'matrix(1, 0, 0, 1, -1, -1)');
    await page.mouse.down();
    await expect(edit).toHaveCSS('transform', motion === 'reduce' ? 'none' : 'matrix(1, 0, 0, 1, 3, 3)');
    await page.mouse.move(0,0); await page.mouse.up(); checks += 3;
  }
  const final = await page.evaluate(() => JSON.parse(localStorage.getItem('studiohub.demo.v1')));
  expect(final).toEqual(original); checks++;
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ checks, errors, before }));
} finally { await browser.close(); }
