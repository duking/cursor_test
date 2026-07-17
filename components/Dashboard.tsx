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
import type { DailyStat, TimeDimension } from "@/lib/stats";
import { formatNumber, formatPercent, getPeriodStats } from "@/lib/stats";

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

export default function Dashboard({ daily, lastUpdated }: DashboardProps) {
  const [dimension, setDimension] = useState<TimeDimension>("day");

  const periods = useMemo(() => getPeriodStats(daily, dimension), [daily, dimension]);
  const isWeekly = dimension === "week";
  const growthLabel = isWeekly ? "周环比" : "日环比";
  const periodLabel = isWeekly ? "周期" : "日期";
  const latestLabel = isWeekly ? "最新周期" : "最新日期";
  const previousLabel = isWeekly ? "上周对比" : "前一日对比";
  const currentPeriodLabel = isWeekly ? "本周新建仓库" : "当日新建仓库";
  const currentUserLabel = isWeekly ? "本周新建用户" : "当日新建用户";

  const volumeData = periods.map((item) => ({
    date: isWeekly ? item.label : item.periodStart.slice(5),
    fullLabel: isWeekly ? `${item.periodStart} ~ ${item.periodEnd}` : item.periodStart,
    repos: item.repos,
    users: item.users,
    dayCount: item.dayCount,
  }));

  const growthData = periods
    .filter((item) => item.repoGrowthRate !== null || item.userGrowthRate !== null)
    .map((item) => ({
      date: isWeekly ? item.label : item.periodStart.slice(5),
      fullLabel: isWeekly ? `${item.periodStart} ~ ${item.periodEnd}` : item.periodStart,
      repoGrowthRate: item.repoGrowthRate ?? 0,
      userGrowthRate: item.userGrowthRate ?? 0,
    }));

  const latest = periods.at(-1);
  const previous = periods.at(-2);

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-top">
          <div>
            <div className="eyebrow">GitHub Public Activity</div>
            <h1>GitHub 仓库与用户增长监控</h1>
            <p>
              基于 GitHub Search API 统计公开仓库与公开用户的新建数量，支持按日或按周查看创建量趋势与环比增长率。
              数据由 GitHub Actions 每日自动更新。
            </p>
          </div>
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
      </header>

      <section className="cards">
        <div className="card">
          <div className="card-label">{latestLabel}</div>
          <div className="card-value">{latest?.label ?? "—"}</div>
          <div className="card-sub">
            最后更新：{lastUpdated ?? "—"}
            {latest && isWeekly ? ` · ${latest.dayCount} 天` : ""}
          </div>
        </div>
        <div className="card">
          <div className="card-label">{currentPeriodLabel}</div>
          <div className="card-value" style={{ color: "var(--accent-repo)" }}>
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
          <div className="card-value" style={{ color: "var(--accent-user)" }}>
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
          <div className="card-value" style={{ fontSize: "18px", lineHeight: 1.5 }}>
            {previous ? (
              <>
                {previous.label}
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
        <div style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer>
            <LineChart data={volumeData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#93a0bd"
                tick={{ fill: "#93a0bd", fontSize: isWeekly ? 11 : 12 }}
                interval={isWeekly ? 0 : "preserveStartEnd"}
                angle={isWeekly ? -18 : 0}
                textAnchor={isWeekly ? "end" : "middle"}
                height={isWeekly ? 56 : 30}
              />
              <YAxis
                stroke="#93a0bd"
                tick={{ fill: "#93a0bd", fontSize: 12 }}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
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
                strokeWidth={2.5}
                dot={isWeekly}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="users"
                name="新建用户"
                stroke="var(--accent-user)"
                strokeWidth={2.5}
                dot={isWeekly}
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
            ? "相对上一自然周的百分比变化（第一周无增长率）"
            : "相对前一天的百分比变化（第一天无增长率）"}
        </p>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={growthData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#93a0bd"
                tick={{ fill: "#93a0bd", fontSize: isWeekly ? 11 : 12 }}
                interval={isWeekly ? 0 : "preserveStartEnd"}
                angle={isWeekly ? -18 : 0}
                textAnchor={isWeekly ? "end" : "middle"}
                height={isWeekly ? 56 : 30}
              />
              <YAxis
                stroke="#93a0bd"
                tick={{ fill: "#93a0bd", fontSize: 12 }}
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
                strokeWidth={2.5}
                dot={isWeekly}
              />
              <Line
                type="monotone"
                dataKey="userGrowthRate"
                name="用户增长率"
                stroke="#bc8cff"
                strokeWidth={2.5}
                dot={isWeekly}
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
                  <td>{row.label}</td>
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

      <footer className="footer">
        数据来源：GitHub Search API（`created:YYYY-MM-DD`）。仅统计公开仓库与公开用户账号，私有资源不在统计范围内。
        {isWeekly ? " 按周统计以周一为起始日，当前未结束的周仅包含已有数据天数。" : ""}
      </footer>
    </div>
  );
}
