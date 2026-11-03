const { test } = require("node:test");
const assert = require("node:assert/strict");
const { quantity, pagination, text, uuid } = require("../src/utils/features");
test("reject invalid quantities, identifiers and unbounded pagination", () => {
  for (const n of [0, -1, 100, 1.2, "2", null, NaN])
    assert.throws(() => quantity(n), { status: 400 });
  for (const query of [
    { page: -1 },
    { limit: 101 },
    { page: "1;DROP" },
    { limit: 1.5 },
  ])
    assert.throws(() => pagination(query), { status: 400 });
  assert.throws(() => uuid("bad"), { status: 400 });
  assert.deepEqual(pagination({ page: "2", limit: "20" }), {
    page: 2,
    limit: 20,
    offset: 20,
  });
  assert.equal(quantity(99), 99);
});
test("validate required and optional content without truncating silently", () => {
  assert.throws(() => text("  ", 100), { status: 400 });
  assert.throws(() => text("abc", 2), { status: 400 });
  assert.equal(text(null, 100, false), null);
  assert.equal(text("  hello  ", 100), "hello");
});
