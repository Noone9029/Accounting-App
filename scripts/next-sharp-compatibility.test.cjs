"use strict";

const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const path = require("node:path");
const test = require("node:test");

const webRequire = createRequire(path.join(__dirname, "..", "apps", "web", "package.json"));
const nextPackagePath = webRequire.resolve("next/package.json");
const nextRequire = createRequire(nextPackagePath);
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test("Next image optimizer remains compatible with the audited Sharp override", async () => {
  const sharp = nextRequire("sharp");
  const { detectContentType, optimizeImage } = webRequire("next/dist/server/image-optimizer");

  assert.equal(sharp.versions.sharp, "0.35.3");
  const optimized = await optimizeImage({
    buffer: ONE_PIXEL_PNG,
    contentType: "image/png",
    quality: 75,
    width: 1,
    timeoutInSeconds: 5,
  });

  assert.equal(Buffer.isBuffer(optimized), true);
  assert.equal(await detectContentType(optimized), "image/png");
  assert.ok(optimized.length > 0);
});
