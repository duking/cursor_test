import Dashboard from "@/components/Dashboard";
import type { StatsData } from "@/lib/stats";
import statsData from "@/public/data/stats.json";

export default function HomePage() {
  const stats = statsData as StatsData;

  if (!stats.daily.length) {
    return (
      <div className="page">
        <div className="empty">
          <h1>暂无数据</h1>
          <p>请先运行 <code>npm run collect:backfill</code> 采集历史数据。</p>
        </div>
      </div>
    );
  }

  return <Dashboard daily={stats.daily} lastUpdated={stats.lastUpdated} />;
}
