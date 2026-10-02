const WEEKLY_KEY = "bannerClosedWeekly";

export function isSeasonalNoticeDismissed(today: Date): boolean {
  try {
    const forever = localStorage.getItem(`bannerClosedForever_${today.getFullYear()}`) === "true";
    const weekly = localStorage.getItem(WEEKLY_KEY);
    const weeklyActive = weekly ? today.getTime() - new Date(weekly).getTime() <= 7 * 24 * 60 * 60 * 1000 : false;
    return forever || weeklyActive;
  } catch {
    return false;
  }
}

export function dismissSeasonalNoticeForWeek(): void {
  try { localStorage.setItem(WEEKLY_KEY, new Date().toISOString()); } catch { /* no-op */ }
}
