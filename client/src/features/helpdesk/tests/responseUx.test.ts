import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AssistantMarkdown } from "../components/AssistantMarkdown";
import { validateHelpdeskResponse } from "../services/phpHelpdeskAdapter";

test("assistant Markdown renders Vietnamese headings, lists, bold and safe links", () => {
  const html = renderToStaticMarkup(createElement(AssistantMarkdown, { text: "## Thông tin phòng\n\n**Studio**\n\n- Tiện ích\n- Ánh sáng\n\n1. Đặt phòng\n\n[Chi tiết](/rooms/12)\n\n[Nguồn](https://example.com)" }));
  for (const tag of ["h2", "strong", "ul", "ol", "li"]) assert.match(html, new RegExp(`<${tag}[ >]`));
  assert.match(html, /Thông tin phòng/);
  assert.match(html, /href="\/rooms\/12"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("Markdown rejects raw HTML, active embeds and unsafe protocols", () => {
  const html = renderToStaticMarkup(createElement(AssistantMarkdown, { text: '<script>alert(1)</script>\n\n<iframe src="https://evil.test"></iframe>\n\n<img src=x onerror=alert(1)>\n\n[x](javascript:alert%281%29) [x](data:text/html,hi) [x](//evil.test) [x](mailto:fake@example.com) ![tracking](https://evil.test/pixel)' }));
  assert.doesNotMatch(html, /<script|<iframe|<img|href=|onerror=/);
});

test("long Vietnamese text and URLs retain all content", () => {
  const text = "Tên Studio rất dài ".repeat(200) + "https://example.com/" + "a".repeat(500);
  assert.ok(renderToStaticMarkup(createElement(AssistantMarkdown, { text })).includes(text));
});

const base = { text: "Liên hệ Studio", mode: "connected", state: "answered", sources: [] };
const contact = { reason: "explicit_contact_request", status: "available", studioId: 3, studioName: "Studio công khai", roomId: 12, publicPhone: "+84901234567", publicEmail: null };
test("contact contract handles phone/email/both/missing/ambiguous", () => {
  for (const c of [contact, { ...contact, publicPhone: null, publicEmail: "hello@example.test" },
    { ...contact, publicEmail: "hello@example.test" }, { ...contact, status: "missing", publicPhone: null },
    { ...contact, status: "ambiguous", studioId: null, studioName: null, roomId: null, publicPhone: null }]) {
    assert.deepEqual(validateHelpdeskResponse({ ...base, contactFallback: c }).contactFallback, c);
  }
});
test("contact contract rejects injected links, invalid IDs and ambiguous contacts", () => {
  for (const c of [{ ...contact, publicPhone: "javascript:alert(1)" }, { ...contact, publicEmail: "a@b.test?subject=x" },
    { ...contact, roomId: -1 }, { ...contact, studioId: null }, { ...contact, status: "ambiguous" },
    { ...contact, status: "missing" }, { ...contact, publicPhone: null }]) {
    assert.throws(() => validateHelpdeskResponse({ ...base, contactFallback: c }));
  }
});
