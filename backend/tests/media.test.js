const { test } = require("node:test");
const assert = require("node:assert/strict");
const { imageFormat } = require("../src/services/media.service");
test("inspect image bytes instead of trusting the file extension", () => {
  assert.equal(imageFormat(Buffer.from([255, 216, 255, 0])), "jpg");
  assert.equal(
    imageFormat(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "png",
  );
  assert.equal(imageFormat(Buffer.from("RIFFxxxxWEBP")), "webp");
  assert.throws(
    () => imageFormat(Buffer.from("<script>not an image</script>")),
    { status: 400 },
  );
});
