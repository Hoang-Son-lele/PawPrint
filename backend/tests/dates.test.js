const test = require("node:test");
const assert = require("node:assert/strict");
const { todayInTimeZone, daysSince } = require("../src/utils/dates");
const { isDate, isUuid } = require("../src/utils/validation");

test("ngày hiện tại theo múi giờ, độc lập UTC", () => {
  const instant = new Date("2026-10-20T18:00:00.000Z");
  assert.equal(todayInTimeZone("Asia/Ho_Chi_Minh", instant), "2026-10-21");
  assert.equal(todayInTimeZone("UTC", instant), "2026-10-20");
});
test("cùng ngày đón về = 0 ngày, trước 100 ngày", () => {
  assert.equal(
    daysSince(
      "2026-10-21",
      "Asia/Ho_Chi_Minh",
      new Date("2026-10-20T18:00:00Z"),
    ),
    0,
  );
  assert.equal(
    daysSince(
      "2026-10-20",
      "Asia/Ho_Chi_Minh",
      new Date("2026-10-20T18:00:00Z"),
    ),
    1,
  );
});
test("kiểm tra ngày không có thật", () => {
  assert.equal(isDate("2026-02-29"), false);
  assert.equal(isDate("2024-02-29"), true);
});
test("validate UUID", () => {
  assert.equal(isUuid("5cbbeb0b-6fd6-4bf2-a3b0-d579b72a797f"), true);
  assert.equal(isUuid("invalid"), false);
});
