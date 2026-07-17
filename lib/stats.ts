export type TimeDimension = "day" | "week";

export type TimeRange = "30d" | "90d" | "180d" | "365d" | "730d" | "all";

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string; days: number | null }[] = [
  { value: "30d", label: "近 30 天", days: 30 },
  { value: "90d", label: "近 90 天", days: 90 },
  { value: "180d", label: "近 6 个月", days: 180 },
  { value: "365d", label: "近 1 年", days: 365 },
  { value: "730d", label: "近 2 年", days: 730 },
  { value: "all", label: "全部", days: null },
];

export const DEFAULT_TIME_RANGE: TimeRange = "730d";

export interface DailyStat {
  date: string;
  repos: number;
  users: number;
  repoGrowthRate: number | null;
  userGrowthRate: number | null;
  repoIncomplete?: boolean;
  userIncomplete?: boolean;
}

export interface PeriodStat {
  key: string;
  label: string;
  periodStart: string;
  periodEnd: string;
  repos: number;
  users: number;
  repoGrowthRate: number | null;
  userGrowthRate: number | null;
  dayCount: number;
}

export interface StatsData {
  lastUpdated: string | null;
  daily: DailyStat[];
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getWeekStart(date: string): string {
  const current = parseDate(date);
  const day = current.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return formatDate(addDays(current, diff));
}

function computeGrowthRates<T extends { repos: number; users: number }>(
  periods: T[],
): Array<
  T & {
    repoGrowthRate: number | null;
    userGrowthRate: number | null;
  }
> {
  return periods.map((entry, index) => {
    const prev = index > 0 ? periods[index - 1] : null;
    const repoGrowthRate =
      prev && prev.repos > 0
        ? Number((((entry.repos - prev.repos) / prev.repos) * 100).toFixed(2))
        : null;
    const userGrowthRate =
      prev && prev.users > 0
        ? Number((((entry.users - prev.users) / prev.users) * 100).toFixed(2))
        : null;

    return {
      ...entry,
      repoGrowthRate,
      userGrowthRate,
    };
  });
}

export function dailyToPeriodStats(daily: DailyStat[]): PeriodStat[] {
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));

  return computeGrowthRates(
    sorted.map((entry) => ({
      key: entry.date,
      label: entry.date,
      periodStart: entry.date,
      periodEnd: entry.date,
      repos: entry.repos,
      users: entry.users,
      dayCount: 1,
    })),
  );
}

export function aggregateWeekly(daily: DailyStat[]): PeriodStat[] {
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  const weekMap = new Map<
    string,
    {
      periodStart: string;
      periodEnd: string;
      repos: number;
      users: number;
      dayCount: number;
    }
  >();

  for (const entry of sorted) {
    const weekStart = getWeekStart(entry.date);
    const weekEnd = formatDate(addDays(parseDate(weekStart), 6));
    const existing = weekMap.get(weekStart);

    if (existing) {
      existing.repos += entry.repos;
      existing.users += entry.users;
      existing.periodEnd = entry.date > existing.periodEnd ? entry.date : existing.periodEnd;
      existing.dayCount += 1;
    } else {
      weekMap.set(weekStart, {
        periodStart: weekStart,
        periodEnd: entry.date < weekEnd ? entry.date : weekEnd,
        repos: entry.repos,
        users: entry.users,
        dayCount: 1,
      });
    }
  }

  const weeks = [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, value]) => ({
      key: weekStart,
      label: `${value.periodStart.slice(5)} ~ ${value.periodEnd.slice(5)}`,
      ...value,
    }));

  return computeGrowthRates(weeks);
}

export function getPeriodStats(daily: DailyStat[], dimension: TimeDimension): PeriodStat[] {
  return dimension === "week" ? aggregateWeekly(daily) : dailyToPeriodStats(daily);
}

export function filterDailyByRange(daily: DailyStat[], range: TimeRange): DailyStat[] {
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) return [];

  const option = TIME_RANGE_OPTIONS.find((item) => item.value === range);
  if (!option?.days) return sorted;

  const latest = parseDate(sorted.at(-1)!.date);
  const cutoff = addDays(latest, -(option.days - 1));

  return sorted.filter((entry) => parseDate(entry.date) >= cutoff);
}

export function getRangeLabel(range: TimeRange, daily: DailyStat[]): string {
  const filtered = filterDailyByRange(daily, range);
  if (!filtered.length) return "无数据";

  const start = filtered[0].date;
  const end = filtered.at(-1)!.date;
  if (start === end) return start;
  return `${start} ~ ${end}`;
}

export function getChartTickLabel(date: string, totalPoints: number): string {
  if (totalPoints > 180) return date.slice(2, 7);
  if (totalPoints > 60) return date.slice(5);
  return date.slice(5);
}

export function getChartTickInterval(totalPoints: number): number | "preserveStartEnd" {
  if (totalPoints <= 14) return 0;
  if (totalPoints <= 31) return 2;
  if (totalPoints <= 90) return 6;
  if (totalPoints <= 180) return 14;
  if (totalPoints <= 365) return 30;
  return Math.max(Math.floor(totalPoints / 12), 30);
}

export function getSummary(daily: DailyStat[]) {
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted.at(-1);
  const previous = sorted.at(-2);

  return {
    latest,
    previous,
    avgRepoGrowth:
      sorted.filter((d) => d.repoGrowthRate !== null).length > 0
        ? sorted
            .filter((d) => d.repoGrowthRate !== null)
            .reduce((sum, d) => sum + (d.repoGrowthRate ?? 0), 0) /
          sorted.filter((d) => d.repoGrowthRate !== null).length
        : null,
    avgUserGrowth:
      sorted.filter((d) => d.userGrowthRate !== null).length > 0
        ? sorted
            .filter((d) => d.userGrowthRate !== null)
            .reduce((sum, d) => sum + (d.userGrowthRate ?? 0), 0) /
          sorted.filter((d) => d.userGrowthRate !== null).length
        : null,
  };
}
