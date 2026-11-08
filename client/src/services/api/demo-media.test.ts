import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
test("every sample room has three reachable local images with unique content and provenance", () => {
  const dataset = JSON.parse(readFileSync(path.resolve("../server/database/demo/catalog.v2.json"), "utf8"));
  const hashes = new Set<string>();
  assert.equal(dataset.rooms.length, 22);
  assert.equal(dataset.rooms.filter((r: { new?: boolean }) => r.new).length, 5);
  for (const room of dataset.rooms) {
    assert.equal(room.photos.length, 3, room.name);
    for (const photo of room.photos) {
      assert.match(photo.url, /^\/images\/demo-rooms\/[0-9]+\.jpg$/);
      assert.match(photo.source, /^https:\/\/www\.pexels\.com\/photo\/[0-9]+\/$/);
      const file = readFileSync(path.resolve(`public${photo.url}`));
      assert.equal(file.readUInt16BE(0), 0xffd8);
      const hash = createHash("sha256").update(file).digest("hex");
      assert.ok(!hashes.has(hash), `Repeated gallery content: ${photo.url}`); hashes.add(hash);
    }
  }
  assert.equal(hashes.size, 66);
  assert.equal(dataset.rooms.find((r: { name: string }) => r.name === "Zenith Black Box Theatre").type_name, "Acoustic Soundstage");
});
