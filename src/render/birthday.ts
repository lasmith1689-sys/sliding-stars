/**
 * Zena's birthday window: July 5–19 (the week before through the week after
 * July 12), any year. Month is 0-indexed in JS Date, so July is 6.
 */
export function isBirthdayWindow(now: Date = new Date()): boolean {
  return now.getMonth() === 6 && now.getDate() >= 5 && now.getDate() <= 19;
}
