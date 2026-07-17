"use client";

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
import type { DailyStat } from "@/lib/stats";
import { formatNumber, formatPercent } from "@/lib/stats";

interface DashboardProps {
  daily: DailyStat[];
  lastUpdated: string | null;
}

function tooltipFormatter(value: number, name: string) {
  if (name.includes("增长率")) {
    return [formatPercent(value), name];
  }
  return [formatNumber(value), name];
}

export default function Dashboard({ daily, lastUpdated }: DashboardProps) {
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));

  const volumeData = sorted.map((d) => ({
    date: d.date.slice(5),
    fullDate: d.date,
    repos: d.repos,
    users: d.users,
  }));

  const growthData = sorted
    .filter((d) => d.repoGrowthRate !== null || d.userGrowthRate !== null)
    .map((d) => ({
      date: d.date.slice(5),
      fullDate: d.date,
      repoGrowthRate: d.repoGrowthRate ?? 0,
      userGrowthRate: d.userGrowthRate ?? 0,
    }));

  const latest = sorted.at(-1);
  const previous = sorted.at(-2);

  return (
    <div className="page">
      <header className="hero">
        <div className="eyebrow">GitHub Public Activity</div>
        <h1>GitHub 每日仓库与用户增长监控</h1>
        <p>
          基于 GitHub Search API 统计每日新建的公开仓库与公开用户账号数量，并计算日环比增长率。
          数据由 GitHub Actions 每日自动更新。
        </p>
      </header>

      <section className="cards">
        <div className="card">
          <div className="card-label">最新日期</div>
          <div className="card-value">{latest?.date ?? "—"}</div>
          <div className="card-sub">最后更新：{lastUpdated ?? "—"}</div>
        </div>
        <div className="card">
          <div className="card-label">当日新建仓库</div>
          <div className="card-value" style={{ color: "var(--accent-repo)" }}>
            {latest ? formatNumber(latest.repos) : "—"}
          </div>
          <div className="card-sub">
            日环比{" "}
            <span className={(latest?.repoGrowthRate ?? 0) >= 0 ? "positive" : "negative"}>
              {formatPercent(latest?.repoGrowthRate ?? null)}
            </span>
          </div>
        </div>
        <div className="card">
          <div className="card-label">当日新建用户</div>
          <div className="card-value" style={{ color: "var(--accent-user)" }}>
            {latest ? formatNumber(latest.users) : "—"}
          </div>
          <div className="card-sub">
            日环比{" "}
            <span className={(latest?.userGrowthRate ?? 0) >= 0 ? "positive" : "negative"}>
              {formatPercent(latest?.userGrowthRate ?? null)}
            </span>
          </div>
        </div>
        <div className="card">
          <div className="card-label">前一日对比</div>
          <div className="card-value" style={{ fontSize: "18px", lineHeight: 1.5 }}>
            {previous ? (
              <>
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
        <h2>每日创建量趋势</h2>
        <p className="panel-desc">公开仓库与用户账号的每日新建数量</p>
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
              <XAxis dataKey="date" stroke="#93a0bd" tick={{ fill: "#93a0bd", fontSize: 12 }} />
              <YAxis
                stroke="#93a0bd"
                tick={{ fill: "#93a0bd", fontSize: 12 }}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                formatter={tooltipFormatter}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ""}
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
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="users"
                name="新建用户"
                stroke="var(--accent-user)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <h2>日环比增长率</h2>
        <p className="panel-desc">相对前一天的百分比变化（第一天无增长率）</p>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={growthData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="#93a0bd" tick={{ fill: "#93a0bd", fontSize: 12 }} />
              <YAxis
                stroke="#93a0bd"
                tick={{ fill: "#93a0bd", fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={tooltipFormatter}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ""}
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
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="userGrowthRate"
                name="用户增长率"
                stroke="#bc8cff"
                strokeWidth={2.5}
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
                <th>日期</th>
                <th>新建仓库</th>
                <th>新建用户</th>
                <th>仓库增长率</th>
                <th>用户增长率</th>
              </tr>
            </thead>
            <tbody>
              {[...sorted].reverse().map((row) => (
                <tr key={row.date}>
                  <td>{row.date}</td>
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
        API 速率限制：未认证约 10 次/分钟，认证后约 30 次/分钟。
      </footer>
    </div>
  );
}
