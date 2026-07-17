#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "..", "public", "data", "stats.json");

const GITHUB_API = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseArgs() {
  const args = process.argv.slice(2);
  let backfillDays = 0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--backfill" && args[i + 1]) {
      backfillDays = Number.parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { backfillDays };
}

function loadStats() {
  if (!fs.existsSync(DATA_PATH)) {
    return { lastUpdated: null, daily: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
}

function saveStats(stats) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(stats, null, 2) + "\n");
}

function computeGrowthRates(daily) {
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));

  return sorted.map((entry, index) => {
    const prev = index > 0 ? sorted[index - 1] : null;
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

async function fetchCount(endpoint, date, retries = 5) {
  const url = `${GITHUB_API}${endpoint}?q=created:${date}&per_page=1`;

  for (let attempt = 0; attempt < retries; attempt++) {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "github-growth-dashboard",
    };

    if (TOKEN) {
      headers.Authorization = `Bearer ${TOKEN}`;
    }

    const response = await fetch(url, { headers });

    if (response.status === 403 || response.status === 429) {
      const resetHeader = response.headers.get("x-ratelimit-reset");
      const resetAt = resetHeader ? Number.parseInt(resetHeader, 10) * 1000 : Date.now() + 60000;
      const waitMs = Math.max(resetAt - Date.now() + 1000, 5000);
      console.warn(`Rate limited on ${date}, waiting ${Math.ceil(waitMs / 1000)}s...`);
      await sleep(waitMs);
      continue;
    }

    if (!response.ok) {
      throw new Error(`GitHub API error ${response.status} for ${date}: ${await response.text()}`);
    }

    const data = await response.json();
    return {
      count: data.total_count ?? 0,
      incomplete: Boolean(data.incomplete_results),
    };
  }

  throw new Error(`Failed to fetch ${date} after ${retries} retries`);
}

async function collectForDate(date) {
  const delayMs = TOKEN ? 800 : 6500;

  console.log(`Collecting ${date}...`);
  const repos = await fetchCount("/search/repositories", date);
  await sleep(delayMs);
  const users = await fetchCount("/search/users", date);

  return {
    date,
    repos: repos.count,
    users: users.count,
    repoIncomplete: repos.incomplete,
    userIncomplete: users.incomplete,
  };
}

function getDateRange(backfillDays) {
  const dates = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let i = backfillDays; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(formatDate(d));
  }

  return dates;
}

async function main() {
  const { backfillDays } = parseArgs();
  const stats = loadStats();
  const existingDates = new Set(stats.daily.map((d) => d.date));

  const dates =
    backfillDays > 0
      ? getDateRange(backfillDays).filter((d) => !existingDates.has(d))
      : [formatDate(new Date())];

  if (dates.length === 0) {
    console.log("All dates already collected.");
    stats.daily = computeGrowthRates(stats.daily);
    stats.lastUpdated = formatDate(new Date());
    saveStats(stats);
    return;
  }

  console.log(`Collecting ${dates.length} day(s)...`);

  for (const date of dates) {
    try {
      const entry = await collectForDate(date);
      const index = stats.daily.findIndex((d) => d.date === date);
      if (index >= 0) {
        stats.daily[index] = entry;
      } else {
        stats.daily.push(entry);
      }
      console.log(`  ${date}: repos=${entry.repos}, users=${entry.users}`);
    } catch (error) {
      console.error(`  ${date}: failed - ${error.message}`);
    }

    if (date !== dates[dates.length - 1]) {
      await sleep(TOKEN ? 800 : 6500);
    }
  }

  stats.daily = computeGrowthRates(stats.daily);
  stats.lastUpdated = formatDate(new Date());
  saveStats(stats);
  console.log(`Saved to ${DATA_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
