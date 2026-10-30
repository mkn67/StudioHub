import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import { initialState } from '../src/data/fixtures.ts';

const base = process.env.TYPOGRAPHY_QA_URL ?? 'http://127.0.0.1:3000';
const output = '.impeccable/review/dashboard-typography';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const fontFailures = [];
let screens = 0;
try {
  const page = await browser.newPage({ locale: 'vi-VN', reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (/\.woff2?(\?|$)/.test(response.url()) && !response.ok()) fontFailures.push(response.url());
  });
  await page.goto(base + '/rooms');
  const customerFont = await page.locator('body').evaluate(node => getComputedStyle(node).fontFamily);
  expect(customerFont).toContain('Bricolage');
  await page.evaluate(state => localStorage.setItem('studiohub.demo.v1', JSON.stringify(state)), initialState());
  // Seed only this browser's demo state with long references and Vietnamese names.
  const bookingId = 'SH-1792893600000-4';
  await page.evaluate(id => {
    const state = JSON.parse(localStorage.getItem('studiohub.demo.v1'));
    const booking = state.bookings[0];
    state.users.find(user => user.id === booking.customerId).name = 'Nguyễn Minh Anh';
    state.bookings = ['pending', 'confirmed', 'checked_in', 'completed'].map((status, index) => ({
      ...booking, id: index ? `${id}-${index}` : id, status, payment: 'paid', paidAt: state.now,
    }));
    localStorage.setItem('studiohub.demo.v1', JSON.stringify(state));
  }, bookingId);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const checkFonts = async () => {
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const weight of [400, 500, 600, 700]) {
        await document.fonts.load(`${weight} 14px "Be Vietnam Pro"`, 'Nguyễn Đặng ă â ê ô ơ ư ấ ề ộ ự ỷ ₫ SH-123');
      }
    });
    const unexpected = await page.locator('.ops-shell').evaluate(shell => [...shell.querySelectorAll('*')]
      .filter(node => node.getClientRects().length && [...node.childNodes].some(child => child.nodeType === 3 && child.textContent.trim()))
      .filter(node => !getComputedStyle(node).fontFamily.startsWith('"Be Vietnam Pro"'))
      .map(node => ({ tag: node.tagName, class: node.getAttribute('class'), font: getComputedStyle(node).fontFamily })));
    expect(unexpected).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  };
  for (const role of ['host', 'admin']) {
    await page.evaluate(role => {
      const state = JSON.parse(localStorage.getItem('studiohub.demo.v1'));
      state.sessionId = role;
      localStorage.setItem('studiohub.demo.v1', JSON.stringify(state));
    }, role);
    const routes = role === 'host'
      ? ['', '/bookings', `/bookings/${bookingId}`, '/calendar', '/rates', '/reports', '/rooms', '/settings']
      : ['', '/users', '/host-requests', '/audit-logs'];
    for (const route of routes) {
      await page.goto(`${base}/${role}${route}`);
      await expect(page.locator('.ops-shell')).toHaveAttribute('data-role', role);
      for (const width of [360, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await checkFonts();
        if (route === '/bookings') {
          const card = page.locator('.kanban-card').first();
          for (const [selector, size, weight] of [
            ['.kanban-reference', '13px', '500'], ['h3', '16px', '700'],
            ['.kanban-customer', '14px', '500'], ['.kanban-rental-time', '14px', '500'],
            ['.line-item strong', '15px', '600'], ['.ops-deadline .mono', '14px', '500'],
          ]) {
            await expect(card.locator(selector)).toHaveCSS('font-size', size);
            await expect(card.locator(selector)).toHaveCSS('font-weight', weight);
            expect(await card.locator(selector).evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
          }
          await expect(card.locator('.kanban-reference')).toHaveCSS('font-variant-numeric', 'tabular-nums');
          const { root } = await cdp.send('DOM.getDocument');
          const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.kanban-customer' });
          const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
          expect(fonts.length).toBeGreaterThan(0);
          expect(fonts.every(font => font.isCustomFont && font.familyName.startsWith('Be Vietnam Pro')), JSON.stringify(fonts)).toBe(true);
        }
        if (route === '/rates') {
          await page.getByRole('button', { name: /Chỉnh sửa bảng giá/ }).first().click();
          await expect(page.locator('.host-pricing-modal')).toBeVisible();
          await checkFonts();
          await expect(page.locator('.host-pricing-modal input').first()).toBeVisible();
          await page.screenshot({ path: `${output}/pricing-${width}.png`, fullPage: true });
          await page.keyboard.press('Escape');
          await expect(page.locator('.host-pricing-modal')).toHaveCount(0);
        }
        if ([390, 1440].includes(width)) await page.screenshot({ path: `${output}/${role}-${route.replaceAll('/', '-') || 'overview'}-${width}.png`, fullPage: true });
        screens++;
      }
    }
  }
  await page.goto(base + '/rooms');
  expect(await page.locator('body').evaluate(node => getComputedStyle(node).fontFamily)).toBe(customerFont);
  expect(errors).toEqual([]);
  expect(fontFailures).toEqual([]);
  console.log(JSON.stringify({ screens, errors, fontFailures, customerFont, output }));
} finally {
  await browser.close();
}
