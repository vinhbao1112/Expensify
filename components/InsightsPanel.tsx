"use client"

import { useEffect, useState } from "react"
import {
  AlertTriangle,
  BarChart3,
  Banknote,
  CircleDollarSign,
  Coins,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Target,
  Wallet,
  Layers3,
} from "lucide-react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js"
import { Bar, Doughnut, Line } from "react-chartjs-2"
import { Transaction } from "@/lib/types"
import {
  buildPeriodSeries,
  comparePeriods,
  formatCurrency,
  getCategoryBudgetWarnings,
  getLatestTransactionDate,
  getPeriodWindow,
  getRangeForMonth,
  groupExpenseByCategory,
  groupIncomeByCategory,
  sumExpenseBuckets,
  type PeriodKind,
} from "@/lib/analytics"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
)

interface PhaseOneSettings {
  monthlyBudget: number
  savingsGoalMonthly: number
  savingsGoalYearly: number
  categoryBudgets: Record<string, number>
}

interface InsightsPanelProps {
  transactions: Transaction[]
  monthYear: string
  spreadsheetId: string
}

const defaultSettings: PhaseOneSettings = {
  monthlyBudget: 0,
  savingsGoalMonthly: 0,
  savingsGoalYearly: 0,
  categoryBudgets: {},
}

const periodLabel: Record<PeriodKind, string> = {
  week: "Tuần",
  month: "Tháng",
  quarter: "Quý",
  year: "Năm",
}

const chartColors = {
  income: "rgba(16, 185, 129, 0.95)",
  incomeFill: "rgba(16, 185, 129, 0.15)",
  expense: "rgba(37, 99, 235, 0.95)",
  expenseFill: "rgba(37, 99, 235, 0.15)",
}

function StatMiniCard({
  title,
  value,
  icon: Icon,
  accent,
  detail,
}: {
  title: string
  value: string
  icon: typeof BarChart3
  accent: string
  detail?: string
}) {
  return (
    <div className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            {title}
          </p>
          <p className={`mt-2 text-2xl font-black tracking-tight ${accent}`}>
            {value}
          </p>
          {detail ? (
            <p className="mt-1 text-[10px] font-bold text-[var(--text-muted)]">
              {detail}
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function ProgressRow({
  label,
  current,
  target,
  colorClass,
}: {
  label: string
  current: number
  target: number
  colorClass: string
}) {
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
        <span>{label}</span>
        <span>{target > 0 ? `${progress.toFixed(0)}%` : "Chưa đặt"}</span>
      </div>
      <div className="h-3 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)]">
        <span>{formatCurrency(current)}đ</span>
        <span>{target > 0 ? `${formatCurrency(target)}đ` : "Chưa cấu hình"}</span>
      </div>
    </div>
  )
}

export function InsightsPanel({
  transactions,
  monthYear,
  spreadsheetId,
}: InsightsPanelProps) {
  const [periodKind, setPeriodKind] = useState<PeriodKind>("month")
  const [settings, setSettings] = useState<PhaseOneSettings>(defaultSettings)
  const [settingsReady, setSettingsReady] = useState(false)

  const storageKey = spreadsheetId
    ? `expensify_phase1_${spreadsheetId}`
    : "expensify_phase1_default"

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PhaseOneSettings>
        setSettings({
          monthlyBudget: parsed.monthlyBudget || 0,
          savingsGoalMonthly: parsed.savingsGoalMonthly || 0,
          savingsGoalYearly: parsed.savingsGoalYearly || 0,
          categoryBudgets: parsed.categoryBudgets || {},
        })
      } else {
        setSettings(defaultSettings)
      }
    } catch (error) {
      console.error("Error loading phase 1 settings:", error)
      setSettings(defaultSettings)
    } finally {
      setSettingsReady(true)
    }
  }, [storageKey])

  useEffect(() => {
    if (!settingsReady) return
    localStorage.setItem(storageKey, JSON.stringify(settings))
  }, [settings, settingsReady, storageKey])

  const latestDate = getLatestTransactionDate(transactions)
  const selectedWindow = getPeriodWindow(periodKind, latestDate)
  const periodSeries = buildPeriodSeries(transactions, periodKind, latestDate)
  const currentMonthRange = getRangeForMonth(monthYear)
  const currentMonthTransactions = transactions.filter((tx) => {
    const date = new Date(`${tx.date}T00:00:00`)
    return date >= currentMonthRange.start && date <= currentMonthRange.end
  })
  const currentMonthSeries = buildPeriodSeries(
    currentMonthTransactions,
    "month",
    getLatestTransactionDate(currentMonthTransactions),
  )
  const currentMonthComparison = comparePeriods(transactions, "month")
  const currentQuarterComparison = comparePeriods(transactions, "quarter")
  const currentYearComparison = comparePeriods(transactions, "year")
  const currentWeekComparison = comparePeriods(transactions, "week")
  const yearSeries = buildPeriodSeries(transactions, "year", latestDate)

  const monthExpenseBuckets = sumExpenseBuckets(currentMonthTransactions, currentMonthRange)
  const selectedExpenseBuckets = sumExpenseBuckets(transactions, selectedWindow)
  const selectedExpensesByCategory = groupExpenseByCategory(
    transactions,
    6,
    selectedWindow,
  )
  const selectedIncomeByCategory = groupIncomeByCategory(
    transactions,
    6,
    selectedWindow,
  )
  const monthCategoryExpenseTotals = groupExpenseByCategory(currentMonthTransactions, 8)
  const monthIncomeTotals = groupIncomeByCategory(currentMonthTransactions, 8)
  const budgetWarnings = getCategoryBudgetWarnings(
    currentMonthTransactions,
    settings.categoryBudgets,
    currentMonthRange,
  )

  const monthIncome = currentMonthSeries.totalIncome
  const monthExpense = currentMonthSeries.totalExpense
  const monthBalance = monthIncome - monthExpense
  const savingsRate = monthIncome > 0 ? Math.max(monthBalance / monthIncome, 0) : 0

  const fixedShare =
    selectedExpenseBuckets.total > 0
      ? (selectedExpenseBuckets.fixed / selectedExpenseBuckets.total) * 100
      : 0
  const flexibleShare =
    selectedExpenseBuckets.total > 0
      ? (selectedExpenseBuckets.flexible / selectedExpenseBuckets.total) * 100
      : 0
  const savingsShare =
    selectedExpenseBuckets.total > 0
      ? (selectedExpenseBuckets.savings / selectedExpenseBuckets.total) * 100
      : 0

  const selectedChartData = {
    labels: periodSeries.labels,
    datasets: [
      {
        label: "Thu nhập",
        data: periodSeries.income,
        borderColor: chartColors.income,
        backgroundColor: chartColors.incomeFill,
        tension: 0.4,
        fill: true,
      },
      {
        label: "Chi tiêu",
        data: periodSeries.expense,
        borderColor: chartColors.expense,
        backgroundColor: chartColors.expenseFill,
        tension: 0.4,
        fill: true,
      },
    ],
  }

  const expenseCategoryChart = {
    labels: selectedExpensesByCategory.map(([category]) => category),
    datasets: [
      {
        label: "Chi tiêu",
        data: selectedExpensesByCategory.map(([, amount]) => amount),
        backgroundColor: [
          "rgba(37, 99, 235, 0.85)",
          "rgba(14, 165, 233, 0.85)",
          "rgba(16, 185, 129, 0.85)",
          "rgba(245, 158, 11, 0.85)",
          "rgba(244, 63, 94, 0.85)",
          "rgba(168, 85, 247, 0.85)",
        ],
        borderRadius: 14,
      },
    ],
  }

  const incomeCategoryChart = {
    labels: selectedIncomeByCategory.map(([category]) => category),
    datasets: [
      {
        label: "Thu nhập",
        data: selectedIncomeByCategory.map(([, amount]) => amount),
        backgroundColor: [
          "rgba(16, 185, 129, 0.88)",
          "rgba(34, 197, 94, 0.88)",
          "rgba(59, 130, 246, 0.88)",
          "rgba(14, 165, 233, 0.88)",
          "rgba(20, 184, 166, 0.88)",
          "rgba(132, 204, 22, 0.88)",
        ],
        borderWidth: 0,
      },
    ],
  }

  const selectedComparison =
    periodKind === "week"
      ? currentWeekComparison
      : periodKind === "month"
      ? currentMonthComparison
      : periodKind === "quarter"
      ? currentQuarterComparison
      : currentYearComparison

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatMiniCard
          title="Thu nhập tháng"
          value={`${formatCurrency(monthIncome)}đ`}
          icon={TrendingUp}
          accent="text-emerald-500"
          detail="Từ dữ liệu tháng hiện tại"
        />
        <StatMiniCard
          title="Chi tiêu tháng"
          value={`${formatCurrency(monthExpense)}đ`}
          icon={TrendingDown}
          accent="text-blue-600"
          detail="Từ dữ liệu tháng hiện tại"
        />
        <StatMiniCard
          title="Số dư tháng"
          value={`${formatCurrency(monthBalance)}đ`}
          icon={Wallet}
          accent={monthBalance >= 0 ? "text-emerald-500" : "text-rose-500"}
          detail={`Tỷ lệ tiết kiệm ${(savingsRate * 100).toFixed(1)}%`}
        />
        <StatMiniCard
          title="Ngân sách tháng"
          value={
            settings.monthlyBudget > 0
              ? `${formatCurrency(settings.monthlyBudget)}đ`
              : "Chưa đặt"
          }
          icon={CircleDollarSign}
          accent="text-amber-500"
          detail={
            settings.monthlyBudget > 0
              ? `${formatCurrency(Math.max(settings.monthlyBudget - monthExpense, 0))}đ còn lại`
              : "Đặt ngân sách để có cảnh báo"
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-6">
        <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 md:p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">
                Phân tích dòng tiền
              </p>
              <h3 className="text-xl md:text-2xl font-black tracking-tight mt-1">
                Theo {periodLabel[periodKind].toLowerCase()}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["week", "month", "quarter", "year"] as PeriodKind[]).map((kind) => (
                <button
                  key={kind}
                  onClick={() => setPeriodKind(kind)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    periodKind === kind
                      ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20"
                      : "bg-transparent text-[var(--text-muted)] border-[var(--border-color)] hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {periodLabel[kind]}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[320px]">
            <Line
              data={selectedChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "top",
                    labels: {
                      usePointStyle: true,
                    },
                  },
                },
                scales: {
                  x: {
                    grid: { display: false },
                  },
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: "rgba(148, 163, 184, 0.15)",
                    },
                    ticks: {
                      callback: (value) => `${value}`,
                    },
                  },
                },
              }}
            />
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <StatMiniCard
              title="Kỳ hiện tại"
              value={`${formatCurrency(
                selectedComparison.currentIncome - selectedComparison.currentExpense,
              )}đ`}
              icon={BarChart3}
              accent="text-blue-600"
              detail={`${selectedComparison.currentIncome > 0 ? formatCurrency(selectedComparison.currentIncome) : 0}đ thu nhập`}
            />
            <StatMiniCard
              title="Kỳ trước"
              value={`${formatCurrency(
                selectedComparison.previousIncome - selectedComparison.previousExpense,
              )}đ`}
              icon={BarChart3}
              accent="text-[var(--text-main)]"
              detail={`${selectedComparison.previousIncome > 0 ? formatCurrency(selectedComparison.previousIncome) : 0}đ thu nhập`}
            />
            <StatMiniCard
              title="Chênh lệch thu"
              value={`${formatCurrency(selectedComparison.incomeDelta)}đ`}
              icon={TrendingUp}
              accent={selectedComparison.incomeDelta >= 0 ? "text-emerald-500" : "text-rose-500"}
              detail="So với kỳ trước"
            />
            <StatMiniCard
              title="Chênh lệch chi"
              value={`${formatCurrency(selectedComparison.expenseDelta)}đ`}
              icon={TrendingDown}
              accent={selectedComparison.expenseDelta <= 0 ? "text-emerald-500" : "text-rose-500"}
              detail="So với kỳ trước"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-600">
                <Layers3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  Chia theo nhóm chi tiêu
                </p>
                <h3 className="text-lg font-black">Cố định, linh hoạt, tiết kiệm</h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm font-black">
                  <span>Cố định</span>
                  <span>{formatCurrency(selectedExpenseBuckets.fixed)}đ</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-black/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${fixedShare}%` }}
                  />
                </div>
              </div>
              <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm font-black">
                  <span>Linh hoạt</span>
                  <span>{formatCurrency(selectedExpenseBuckets.flexible)}đ</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-black/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${flexibleShare}%` }}
                  />
                </div>
              </div>
              <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm font-black">
                  <span>Tiết kiệm</span>
                  <span>{formatCurrency(selectedExpenseBuckets.savings)}đ</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-black/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${savingsShare}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600">
                <PiggyBank className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  Mục tiêu tiết kiệm
                </p>
                <h3 className="text-lg font-black">Theo tháng và theo năm</h3>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  Mục tiêu tiết kiệm tháng
                </label>
                <input
                  type="number"
                  min={0}
                  value={settings.savingsGoalMonthly}
                  onChange={(e) =>
                    setSettings((current) => ({
                      ...current,
                      savingsGoalMonthly: Math.max(
                        0,
                        Number.parseFloat(e.target.value) || 0,
                      ),
                    }))
                  }
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                  placeholder="Nhập mục tiêu tháng"
                />
                <div className="mt-3">
                  <ProgressRow
                    label="Tiến độ tháng"
                    current={Math.max(monthBalance, 0)}
                    target={settings.savingsGoalMonthly}
                    colorClass="bg-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  Mục tiêu tiết kiệm năm
                </label>
                <input
                  type="number"
                  min={0}
                  value={settings.savingsGoalYearly}
                  onChange={(e) =>
                    setSettings((current) => ({
                      ...current,
                      savingsGoalYearly: Math.max(
                        0,
                        Number.parseFloat(e.target.value) || 0,
                      ),
                    }))
                  }
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                  placeholder="Nhập mục tiêu năm"
                />
                <div className="mt-3">
                  <ProgressRow
                    label="Tiến độ năm"
                    current={Math.max(yearSeries.totalIncome - yearSeries.totalExpense, 0)}
                    target={settings.savingsGoalYearly}
                    colorClass="bg-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Danh mục chi tiêu nhiều nhất
              </p>
              <h3 className="text-lg font-black">Trong tháng hiện tại</h3>
            </div>
          </div>
          <div className="h-[280px]">
            {monthCategoryExpenseTotals.length > 0 ? (
              <Bar
                data={expenseCategoryChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: "y",
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                      grid: { color: "rgba(148, 163, 184, 0.15)" },
                    },
                    y: {
                      grid: { display: false },
                    },
                  },
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-[var(--border-color)] text-sm font-bold text-[var(--text-muted)]">
                Chưa có dữ liệu chi tiêu trong tháng
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Nguồn thu nhập
              </p>
              <h3 className="text-lg font-black">Trong tháng hiện tại</h3>
            </div>
          </div>
          <div className="h-[280px]">
            {monthIncomeTotals.length > 0 ? (
              <Doughnut
                data={incomeCategoryChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: {
                        usePointStyle: true,
                      },
                    },
                  },
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-[var(--border-color)] text-sm font-bold text-[var(--text-muted)]">
                Chưa có dữ liệu thu nhập trong tháng
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-600">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Cảnh báo ngân sách
              </p>
              <h3 className="text-lg font-black">Danh mục vượt mức</h3>
            </div>
          </div>

          {settings.monthlyBudget > 0 ? (
            <div className="mb-4 rounded-2xl bg-black/5 dark:bg-white/5 p-4">
              <div className="flex items-center justify-between text-sm font-black">
                <span>Ngân sách tháng</span>
                <span
                  className={
                    monthExpense > settings.monthlyBudget
                      ? "text-rose-500"
                      : "text-emerald-500"
                  }
                >
                  {formatCurrency(Math.max(settings.monthlyBudget - monthExpense, 0))}đ còn lại
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-black/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    monthExpense > settings.monthlyBudget
                      ? "bg-rose-500"
                      : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.min((monthExpense / settings.monthlyBudget) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
            {budgetWarnings.length > 0 ? (
              budgetWarnings.map((item) => (
                <div
                  key={item.category}
                  className={`rounded-2xl border p-4 ${
                    item.exceeded
                      ? "border-rose-500/20 bg-rose-500/5"
                      : "border-[var(--border-color)] bg-black/5 dark:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black">{item.category}</p>
                      <p className="text-[11px] font-bold text-[var(--text-muted)]">
                        {formatCurrency(item.spent)}đ / {formatCurrency(item.budget)}đ
                      </p>
                    </div>
                    {item.exceeded ? (
                      <AlertTriangle className="h-5 w-5 text-rose-500" />
                    ) : (
                      <Coins className="h-5 w-5 text-emerald-500" />
                    )}
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-black/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.exceeded ? "bg-rose-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(item.progress, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border-color)] p-5 text-center text-sm font-bold text-[var(--text-muted)]">
                Chưa có danh mục nào vượt ngân sách hoặc chưa cấu hình ngân sách
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 md:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Ngân sách theo danh mục
            </p>
            <h3 className="text-xl font-black tracking-tight">Cấu hình chi tiêu chi tiết</h3>
          </div>
          <div className="text-[11px] font-bold text-[var(--text-muted)]">
            Áp dụng cho tháng hiện tại và lưu theo spreadsheet
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[0.7fr_1.3fr] gap-6">
          <div className="space-y-4">
            <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-4 space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Ngân sách tháng
              </label>
              <input
                type="number"
                min={0}
                value={settings.monthlyBudget}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    monthlyBudget: Math.max(
                      0,
                      Number.parseFloat(e.target.value) || 0,
                    ),
                  }))
                }
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                placeholder="Nhập ngân sách tháng"
              />
              <p className="text-[11px] font-bold text-[var(--text-muted)]">
                Dùng để cảnh báo tổng chi tiêu vượt mức.
              </p>
            </div>

            <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-4 space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Mẹo triển khai
              </label>
              <ul className="space-y-2 text-[12px] font-medium text-[var(--text-muted)]">
                <li>• Ưu tiên thêm ngân sách cho các danh mục lớn nhất trước.</li>
                <li>• Các danh mục mới phát sinh sẽ tự xuất hiện trong bảng.</li>
                <li>• Dữ liệu được lưu cục bộ, không làm ảnh hưởng sheet.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            {Array.from(
              new Set(
                [...monthCategoryExpenseTotals, ...selectedExpensesByCategory].map(
                  ([category]) => category,
                ),
              ),
            ).length > 0 ? (
              Array.from(
                new Set(
                  [...monthCategoryExpenseTotals, ...selectedExpensesByCategory].map(
                    ([category]) => category,
                  ),
                ),
              ).map((category) => {
                const spent =
                  currentMonthTransactions
                    .filter((tx) => tx.type === "expense" && tx.category === category)
                    .reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0
                const budget = settings.categoryBudgets[category] || 0
                const progress = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0

                return (
                  <div
                    key={category}
                    className="rounded-2xl border border-[var(--border-color)] p-4 bg-black/5 dark:bg-white/5"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-black">{category}</p>
                        <p className="text-[11px] font-bold text-[var(--text-muted)]">
                          Đã chi {formatCurrency(spent)}đ
                        </p>
                      </div>
                      <div className="w-full md:w-[260px]">
                        <input
                          type="number"
                          min={0}
                          value={budget}
                          onChange={(e) => {
                            const nextBudget = Math.max(
                              0,
                              Number.parseFloat(e.target.value) || 0,
                            )
                            setSettings((current) => ({
                              ...current,
                              categoryBudgets: {
                                ...current.categoryBudgets,
                                [category]: nextBudget,
                              },
                            }))
                          }}
                          className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                          placeholder="Ngân sách danh mục"
                        />
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-black/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          progress >= 100 ? "bg-rose-500" : "bg-blue-600"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)]">
                      <span>{budget > 0 ? `${formatCurrency(budget)}đ` : "Chưa đặt"}</span>
                      <span>{progress >= 100 ? "Vượt ngân sách" : "Còn trong mức cho phép"}</span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border-color)] p-6 text-center text-sm font-bold text-[var(--text-muted)]">
                Chưa có danh mục chi tiêu nào để đặt ngân sách
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
