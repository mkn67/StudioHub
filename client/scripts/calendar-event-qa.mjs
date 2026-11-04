import { chromium, expect } from '@playwright/test';
import { initialState } from '../src/data/fixtures.ts';
import { calendarEventLanes } from '../src/features/dashboard/calendar-event-layout.ts';
import fs from 'node:fs';

const base = process.env.CALENDAR_QA_URL ?? 'http://localhost:3000';
const output = '.impeccable/review/calendar-events';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const errors = [];
let checks = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  const state = initialState();
  state.sessionId = 'host';
  const day = Date.parse('2026-10-28T00:00:00+07:00');
  const definitions = [
    ['two', 'a101', 600, 720, 'confirmed'], ['one', 'a102', 600, 660, 'pending'],
    ['half', 'b101', 630, 690, 'checked_in'], ['thirty', 'b102', 600, 630, 'awaiting_payment'],
    ['tiny', 'c101', 600, 615, 'confirmed'], ['minute', 'c101', 615, 620, 'confirmed'],
    ['adjacent', 'b102', 630, 690, 'confirmed'], ['overlap', 'a101', 630, 690, 'pending'],
    ['overnight', 'a101', 1410, 1470, 'confirmed'],
  ];
  state.bookings = definitions.map(([id, roomId, start, end, status]) => ({ ...state.bookings[0], id: `event-${id}`, roomId, start: day + start * 60000, end: day + end * 60000, status }));
  const expectedLanes = calendarEventLanes(state.bookings.filter(booking => booking.roomId === 'a101'));
  expect(expectedLanes.get('event-two')).toEqual({ lane: 0, lanes: 2 });
  expect(calendarEventLanes(state.bookings.filter(booking => booking.roomId === 'b102')).get('event-adjacent')).toEqual({ lane: 0, lanes: 1 });
  await page.goto(base + '/rooms');
  await page.evaluate(state => localStorage.setItem('studiohub.demo.v1', JSON.stringify(state)), state);
  const open = async () => {
    await page.goto(base + '/host/calendar');
    await page.locator('.host-calendar').waitFor({ state: 'visible', timeout: 15000 }).catch(async error => {
      await page.screenshot({ path: `${output}/loaded.png`, fullPage: true });
      console.error(await page.locator('body').innerText(), await page.evaluate(() => JSON.parse(localStorage.getItem('studiohub.demo.v1'))?.sessionId));
      throw error;
    });
    await page.getByLabel('Chế độ lịch').selectOption('day');
    await page.getByLabel('Ngày xem lịch', { exact: true }).fill('2026-10-28');
    await page.evaluate(async () => { await document.fonts.ready; });
  };
  await open();
  for (const [id, roomId, start, end] of definitions) {
    const event = page.locator(`[data-booking-id="event-${id}"]`);
    await expect(event).toHaveCSS('top', `${start * .8}px`);
    await expect(event).toHaveCSS('height', `${(Math.min(end, 1440) - start) * .8}px`);
    expect(await event.evaluate(node => node.closest('[data-calendar-room]').dataset.calendarRoom)).toBe(roomId);
    const face = event.locator('.host-event-face');
    await expect(face).toHaveCSS('border-top-width', '2px');
    await expect(face).toHaveCSS('border-top-color', 'rgb(32, 50, 62)');
    const shadow = id === 'minute' ? 0 : 2;
    await expect(face).toHaveCSS('box-shadow', shadow ? 'rgb(32, 50, 62) 2px 2px 0px 0px' : 'none');
    // Face and its shadow stay entirely inside the exact clickable time interval.
    const eventBox = await event.boundingBox(), faceBox = await face.boundingBox();
    expect(faceBox.y + faceBox.height + shadow).toBeLessThanOrEqual(eventBox.y + eventBox.height + .1);
    expect(faceBox.x + faceBox.width + shadow).toBeLessThanOrEqual(eventBox.x + eventBox.width + .1);
    const clipping = await face.evaluate(node => [...node.children].map(child => ({ height: child.clientHeight, scroll: child.scrollHeight })));
    for (const child of clipping) expect(child.scroll).toBeLessThanOrEqual(child.height + 1);
    checks++;
  }
  await expect(page.locator('[data-booking-id="event-one"] .host-event-time')).toBeVisible();
  await expect(page.locator('[data-booking-id="event-thirty"] .host-event-time')).toHaveCount(0);
  await expect(page.locator('[data-booking-id="event-minute"] .host-event-code')).toHaveCount(0);
  const two = page.locator('[data-booking-id="event-two"]');
  await expect(two.locator('.host-event-status')).toHaveText('Đã xác nhận');
  await expect(two.locator('.host-event-code')).toHaveCSS('font-family', '"Be Vietnam Pro", sans-serif');
  for (const [status, color] of [['confirmed', 'rgb(223, 234, 253)'], ['pending', 'rgb(255, 240, 212)'], ['checked_in', 'rgb(216, 243, 242)']]) {
    await expect(page.locator(`.host-calendar-event.${status} .host-event-face`).first()).toHaveCSS('background-color', color);
  }
  // Inactive statuses stay excluded by the existing calendar filter. Probe their
  // presentation tokens without altering booking state or filter behavior.
  for (const [status, color] of [['completed', 'rgb(221, 242, 229)'], ['cancelled', 'rgb(253, 230, 227)'], ['expired', 'rgb(233, 238, 243)']]) {
    await two.evaluate((node, status) => { node.className = `host-calendar-event ${status}`; }, status);
    await expect(two.locator('.host-event-face')).toHaveCSS('background-color', color);
  }
  await two.evaluate(node => { node.className = 'host-calendar-event confirmed'; });
  const overlapping = await page.locator('[data-booking-id="event-overlap"]').boundingBox();
  const first = await two.boundingBox();
  expect(first.x + first.width).toBeLessThanOrEqual(overlapping.x);
  const buffer = page.locator('[data-buffer-for="event-thirty"]');
  await expect(buffer).toHaveCSS('top', '504px');
  await expect(buffer).toHaveCSS('height', '24px');
  expect(await buffer.evaluate(node => node.tagName)).toBe('DIV');
  await expect(buffer).not.toHaveAttribute('tabindex');
  for (const activate of ['click', 'Enter', 'Space']) {
    if (activate === 'click') await two.click();
    else { await two.focus(); await two.press(activate); }
    await expect(page).toHaveURL(base + '/host/bookings/event-two');
    await open();
    checks++;
  }
  await two.focus();
  await expect(two).toHaveCSS('outline-style', 'solid');
  await two.hover();
  await page.mouse.down();
  await expect(two.locator('.host-event-face')).toHaveCSS('box-shadow', 'rgb(32, 50, 62) 1px 1px 0px 0px');
  await page.mouse.move(0, 0);
  await page.mouse.up();
  for (const motion of ['reduce', 'no-preference']) {
    await page.emulateMedia({ reducedMotion: motion });
    for (const view of ['day', 'week']) {
      await page.getByLabel('Chế độ lịch').selectOption(view);
      for (const width of [360, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await two.hover();
        await expect(two).toHaveCSS('transform', 'none');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await two.focus();
        await page.screenshot({ path: `${output}/${view}-${motion}-${width}.png`, fullPage: true });
        checks++;
      }
    }
  }
  await page.getByLabel('Chế độ lịch').selectOption('day');
  await page.getByRole('button', { name: 'Buổi sáng', exact: true }).click();
  await expect(two).toHaveCSS('top', '240px');
  await page.getByRole('button', { name: 'Cả ngày', exact: true }).click();
  await page.getByLabel('Ngày xem lịch', { exact: true }).fill('2026-10-29');
  await expect(page.locator('[data-booking-id="event-overnight"]')).toHaveCSS('top', '0px');
  await expect(page.locator('[data-booking-id="event-overnight"]')).toHaveCSS('height', '24px');
  await expect(page.locator('[data-buffer-for="event-overnight"]')).toHaveCSS('top', '24px');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('studiohub.demo.v1')).bookings)).toEqual(state.bookings);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ checks, errors, output }));
} finally { await browser.close(); }
