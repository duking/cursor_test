"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyStat, TimeDimension, TimeRange } from "@/lib/stats";
import {
  DEFAULT_TIME_RANGE,
  TIME_RANGE_OPTIONS,
  formatNumber,
  formatPercent,
  getChartTickInterval,
  getChartTickLabel,
  getPeriodStats,
  getRangeLabel,
  filterDailyByRange,
} from "@/lib/stats";

interface DashboardProps {
  daily: DailyStat[];
  lastUpdated: string | null;
}

const DIMENSION_OPTIONS: { value: TimeDimension; label: string }[] = [
  { value: "day", label: "按日" },
  { value: "week", label: "按周" },
];

function tooltipFormatter(value: number, name: string) {
  if (name.includes("增长率")) {
    return [formatPercent(value), name];
  }
  return [formatNumber(value), name];
}

function formatPeriodCardLabel(label: string, isWeekly: boolean): string {
  if (!isWeekly) return label;
  return label.replace(" ~ ", "\n~ ");
}

export default function Dashboard({ daily, lastUpdated }: DashboardProps) {
  const [dimension, setDimension] = useState<TimeDimension>("day");
  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);

  const filteredDaily = useMemo(
    () => filterDailyByRange(daily, timeRange),
    [daily, timeRange],
  );

  const periods = useMemo(
    () => getPeriodStats(filteredDaily, dimension),
    [filteredDaily, dimension],
  );

  const isWeekly = dimension === "week";
  const growthLabel = isWeekly ? "周环比" : "日环比";
  const periodLabel = isWeekly ? "周期" : "日期";
  const latestLabel = isWeekly ? "最新周期" : "最新日期";
  const previousLabel = isWeekly ? "上周对比" : "前一日对比";
  const currentPeriodLabel = isWeekly ? "本周新建仓库" : "当日新建仓库";
  const currentUserLabel = isWeekly ? "本周新建用户" : "当日新建用户";
  const rangeLabel = getRangeLabel(timeRange, daily);
  const tickInterval = getChartTickInterval(periods.length);

  const volumeData = periods.map((item) => ({
    date: getChartTickLabel(item.periodStart, periods.length),
    fullLabel: isWeekly ? `${item.periodStart} ~ ${item.periodEnd}` : item.periodStart,
    repos: item.repos,
    users: item.users,
    dayCount: item.dayCount,
  }));

  const growthData = periods
    .filter((item) => item.repoGrowthRate !== null || item.userGrowthRate !== null)
    .map((item) => ({
      date: getChartTickLabel(item.periodStart, periods.length),
      fullLabel: isWeekly ? `${item.periodStart} ~ ${item.periodEnd}` : item.periodStart,
      repoGrowthRate: item.repoGrowthRate ?? 0,
      userGrowthRate: item.userGrowthRate ?? 0,
    }));

  const latest = periods.at(-1);
  const previous = periods.at(-2);
  const chartBottomMargin = isWeekly || periods.length > 60 ? 20 : 8;

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-top">
          <div className="hero-copy">
            <div className="eyebrow">GitHub Public Activity</div>
            <h1>GitHub 仓库与用户增长监控</h1>
            <p>
              基于 GitHub Search API 统计公开仓库与公开用户的新建数量，默认展示近 2 年趋势，可按时间范围与统计维度自由切换。
            </p>
          </div>
          <div className="controls">
            <div className="control-group">
              <span className="control-label">时间范围</span>
              <div className="range-switch" role="group" aria-label="时间范围">
                {TIME_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`range-btn ${timeRange === option.value ? "active" : ""}`}
                    onClick={() => setTimeRange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="control-group">
              <span className="control-label">统计维度</span>
              <div className="dimension-switch" role="group" aria-label="统计维度">
                {DIMENSION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`dimension-btn ${dimension === option.value ? "active" : ""}`}
                    onClick={() => setDimension(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="range-meta">
          <span>当前区间：{rangeLabel}</span>
          <span>数据点：{periods.length} {isWeekly ? "周" : "天"}</span>
          <span>最后更新：{lastUpdated ?? "—"}</span>
        </div>
      </header>

      {!filteredDaily.length ? (
        <section className="panel empty-panel">
          <h2>所选时间范围内暂无数据</h2>
          <p className="panel-desc">请尝试选择更短的时间范围，或等待历史数据回填完成。</p>
        </section>
      ) : (
        <>
          <section className="cards">
            <div className="card">
              <div className="card-label">{latestLabel}</div>
              <div className={`card-value ${isWeekly ? "card-value-compact" : ""}`}>
                {latest ? formatPeriodCardLabel(latest.label, isWeekly) : "—"}
              </div>
              <div className="card-sub">
                {isWeekly && latest ? `${latest.dayCount} 天` : `区间：${rangeLabel}`}
              </div>
            </div>
            <div className="card">
              <div className="card-label">{currentPeriodLabel}</div>
              <div className="card-value card-value-number" style={{ color: "var(--accent-repo)" }}>
                {latest ? formatNumber(latest.repos) : "—"}
              </div>
              <div className="card-sub">
                {growthLabel}{" "}
                <span className={(latest?.repoGrowthRate ?? 0) >= 0 ? "positive" : "negative"}>
                  {formatPercent(latest?.repoGrowthRate ?? null)}
                </span>
              </div>
            </div>
            <div className="card">
              <div className="card-label">{currentUserLabel}</div>
              <div className="card-value card-value-number" style={{ color: "var(--accent-user)" }}>
                {latest ? formatNumber(latest.users) : "—"}
              </div>
              <div className="card-sub">
                {growthLabel}{" "}
                <span className={(latest?.userGrowthRate ?? 0) >= 0 ? "positive" : "negative"}>
                  {formatPercent(latest?.userGrowthRate ?? null)}
                </span>
              </div>
            </div>
            <div className="card">
              <div className="card-label">{previousLabel}</div>
              <div className="card-value card-value-compact">
                {previous ? (
                  <>
                    {formatPeriodCardLabel(previous.label, isWeekly)}
                    <br />
                    仓库 {formatNumber(previous.repos)}
                    <br />
                    用户 {formatNumber(previous.users)}
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </section>

          <section className="panel">
            <h2>{isWeekly ? "每周创建量趋势" : "每日创建量趋势"}</h2>
            <p className="panel-desc">
              {isWeekly
                ? "按自然周（周一至周日）汇总公开仓库与用户账号的新建数量"
                : "公开仓库与用户账号的每日新建数量"}
            </p>
            <div className="legend">
              <span className="legend-item">
                <span className="legend-dot" style={{ background: "var(--accent-repo)" }} />
                新建仓库
              </span>
              <span className="legend-item">
                <span className="legend-dot" style={{ background: "var(--accent-user)" }} />
                新建用户
              </span>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={volumeData}
                  margin={{ top: 8, right: 12, left: 4, bottom: chartBottomMargin }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#93a0bd"
                    tick={{ fill: "#93a0bd", fontSize: 11 }}
                    interval={tickInterval}
                    minTickGap={18}
                  />
                  <YAxis
                    stroke="#93a0bd"
                    tick={{ fill: "#93a0bd", fontSize: 12 }}
                    width={56}
                    tickFormatter={(v) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(1)}M`
                        : `${Math.round(v / 1000)}k`
                    }
                  />
                  <Tooltip
                    formatter={tooltipFormatter}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      if (!item) return "";
                      return isWeekly
                        ? `${item.fullLabel}（${item.dayCount} 天）`
                        : item.fullLabel;
                    }}
                    contentStyle={{
                      background: "#121a31",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="repos"
                    name="新建仓库"
                    stroke="var(--accent-repo)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    name="新建用户"
                    stroke="var(--accent-user)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="panel">
            <h2>{isWeekly ? "周环比增长率" : "日环比增长率"}</h2>
            <p className="panel-desc">
              {isWeekly
                ? "相对上一自然周的百分比变化（所选区间内第一周无增长率）"
                : "相对前一天的百分比变化（所选区间内第一天无增长率）"}
            </p>
            <div className="chart-wrap chart-wrap-short">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={growthData}
                  margin={{ top: 8, right: 12, left: 4, bottom: chartBottomMargin }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#93a0bd"
                    tick={{ fill: "#93a0bd", fontSize: 11 }}
                    interval={tickInterval}
                    minTickGap={18}
                  />
                  <YAxis
                    stroke="#93a0bd"
                    tick={{ fill: "#93a0bd", fontSize: 12 }}
                    width={56}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    formatter={tooltipFormatter}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ""}
                    contentStyle={{
                      background: "#121a31",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="repoGrowthRate"
                    name="仓库增长率"
                    stroke="var(--accent-growth)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="userGrowthRate"
                    name="用户增长率"
                    stroke="#bc8cff"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="panel">
            <h2>数据明细</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{periodLabel}</th>
                    {isWeekly && <th>天数</th>}
                    <th>新建仓库</th>
                    <th>新建用户</th>
                    <th>仓库增长率</th>
                    <th>用户增长率</th>
                  </tr>
                </thead>
                <tbody>
                  {[...periods].reverse().map((row) => (
                    <tr key={row.key}>
                      <td className="period-cell">{row.label}</td>
                      {isWeekly && <td className="number">{row.dayCount}</td>}
                      <td className="number">{formatNumber(row.repos)}</td>
                      <td className="number">{formatNumber(row.users)}</td>
                      <td className={`number ${(row.repoGrowthRate ?? 0) >= 0 ? "positive" : "negative"}`}>
                        {formatPercent(row.repoGrowthRate)}
                      </td>
                      <td className={`number ${(row.userGrowthRate ?? 0) >= 0 ? "positive" : "negative"}`}>
                        {formatPercent(row.userGrowthRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <footer className="footer">
        数据来源：GitHub Search API（`created:YYYY-MM-DD`）。仅统计公开仓库与公开用户账号。
        {isWeekly ? " 按周统计以周一为起始日。" : ""}
        默认展示近 2 年数据，可通过上方按钮切换时间范围。
      </footer>
    </div>
  );
}
