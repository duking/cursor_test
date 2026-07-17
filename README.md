# GitHub 每日增长监控

基于 GitHub Search API 的公开仓库与用户每日创建量监控面板，展示创建量趋势与日环比增长率曲线。

## 功能

- 每日统计 GitHub 公开新建仓库数量
- 每日统计 GitHub 公开新建用户数量
- 计算日环比增长率
- 可视化趋势图与数据表格
- GitHub Actions 每日自动采集并更新数据

## 本地开发

```bash
npm install
npm run collect:backfill   # 回填最近 30 天数据（受 API 速率限制，约需 3-6 分钟）
npm run dev                # 启动开发服务器
npm run build              # 构建静态站点
```

## 部署到 Vercel

1. 将仓库导入 [Vercel](https://vercel.com/new)
2. Framework Preset 选择 **Next.js**
3. 无需额外环境变量（数据采集在 GitHub Actions 中完成）
4. 每次 `public/data/stats.json` 更新后，Vercel 会自动重新部署

## 数据说明

- 数据来源：GitHub Search API (`created:YYYY-MM-DD`)
- 仅统计**公开**仓库与用户
- 私有资源不在统计范围内

## 项目结构

```
├── app/                    # Next.js 页面
├── components/             # 图表组件
├── lib/                    # 工具函数
├── public/data/stats.json  # 统计数据
├── scripts/collect-stats.mjs  # 数据采集脚本
└── .github/workflows/      # 自动采集工作流
```
