import { isBirthdayWindow } from '../../src/render/birthday';

test('birthday window is July 5–19 inclusive (month is 0-indexed)', () => {
  expect(isBirthdayWindow(new Date(2026, 6, 12))).toBe(true); // Jul 12
  expect(isBirthdayWindow(new Date(2026, 6, 5))).toBe(true);  // Jul 5
  expect(isBirthdayWindow(new Date(2026, 6, 19))).toBe(true); // Jul 19
  expect(isBirthdayWindow(new Date(2026, 6, 4))).toBe(false); // Jul 4
  expect(isBirthdayWindow(new Date(2026, 6, 20))).toBe(false); // Jul 20
  expect(isBirthdayWindow(new Date(2026, 5, 12))).toBe(false); // Jun 12
  expect(isBirthdayWindow(new Date(2027, 6, 12))).toBe(true);  // recurs yearly
});
