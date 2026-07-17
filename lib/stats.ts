export interface DailyStat {
  date: string;
  repos: number;
  users: number;
  repoGrowthRate: number | null;
  userGrowthRate: number | null;
  repoIncomplete?: boolean;
  userIncomplete?: boolean;
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
