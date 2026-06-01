import type { Transaction } from "./types"
import { normalizeText } from "./analytics"

export interface AutomationRule {
  id: string
  pattern: string
  category: string
  type: Transaction["type"] | "both"
}

export interface RecurringPattern {
  key: string
  category: string
  type: Transaction["type"]
  purpose: string
  amount: number
  count: number
  intervalDays: number
  nextExpectedDate: string
}

export interface AnomalyAlert {
  id: string
  severity: "warning" | "danger"
  title: string
  description: string
  transaction: Transaction
}

export interface MonthForecast {
  monthYear: string
  isCurrentMonth: boolean
  daysElapsed: number
  daysInMonth: number
  income: number
  expense: number
  balance: number
  projectedExpense: number
  projectedBalance: number
  averageDailyExpense: number
  averageDailyIncome: number
  burnRate: number
  actualSavings: number
  estimatedSavings: number
}

const AUTOMATION_RULES_PREFIX = "expensify_automation_rules_"
const DEMO_MODE_KEY = "expensify_demo_mode"
const ONBOARDING_KEY = "expensify_onboarding_seen"

export function automationRulesKey(spreadsheetId: string) {
  return `${AUTOMATION_RULES_PREFIX}${spreadsheetId || "default"}`
}

export function loadAutomationRules(spreadsheetId: string) {
  if (typeof window === "undefined") return [] as AutomationRule[]
  try {
    const raw = localStorage.getItem(automationRulesKey(spreadsheetId))
    if (!raw) return []
    return JSON.parse(raw) as AutomationRule[]
  } catch (error) {
    console.error("Error loading automation rules:", error)
    return []
  }
}

export function saveAutomationRules(spreadsheetId: string, rules: AutomationRule[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(automationRulesKey(spreadsheetId), JSON.stringify(rules))
}

export function loadDemoMode() {
  if (typeof window === "undefined") return false
  return localStorage.getItem(DEMO_MODE_KEY) === "1"
}

export function saveDemoMode(enabled: boolean) {
  if (typeof window === "undefined") return
  localStorage.setItem(DEMO_MODE_KEY, enabled ? "1" : "0")
}

export function loadOnboardingSeen() {
  if (typeof window === "undefined") return false
  return localStorage.getItem(ONBOARDING_KEY) === "1"
}

export function markOnboardingSeen() {
  if (typeof window === "undefined") return
  localStorage.setItem(ONBOARDING_KEY, "1")
}

export function createDemoTransactions(monthYear: string): Transaction[] {
  const [year, month] = monthYear.split("-").map((value) => Number.parseInt(value, 10))
  const baseYear = Number.isFinite(year) ? year : new Date().getFullYear()
  const baseMonth = Number.isFinite(month) ? month : new Date().getMonth() + 1
  const day = (offset: number) =>
    `${String(baseYear).padStart(4, "0")}-${String(baseMonth).padStart(2, "0")}-${String(Math.max(1, Math.min(28, offset))).padStart(2, "0")}`

  const items: Array<Omit<Transaction, "id">> = [
    {
      date: day(1),
      type: "income",
      category: "Lương",
      amount: 18000000,
      purpose: "Lương tháng",
      note: "Dữ liệu mẫu",
      attachment: "",
      isSample: true,
    },
    {
      date: day(2),
      type: "expense",
      category: "Ăn uống",
      amount: 85000,
      purpose: "Bữa trưa",
      note: "Dữ liệu mẫu",
      attachment: "",
      isSample: true,
    },
    {
      date: day(3),
      type: "expense",
      category: "Cafe",
      amount: 45000,
      purpose: "Cafe sáng",
      note: "Dữ liệu mẫu",
      attachment: "",
      isSample: true,
    },
    {
      date: day(5),
      type: "expense",
      category: "Di chuyển",
      amount: 120000,
      purpose: "Grab đi làm",
      note: "Dữ liệu mẫu",
      attachment: "",
      isSample: true,
    },
    {
      date: day(8),
      type: "expense",
      category: "Mua sắm",
      amount: 560000,
      purpose: "Mua đồ gia dụng",
      note: "Dữ liệu mẫu",
      attachment: "",
      isSample: true,
    },
    {
      date: day(10),
      type: "income",
      category: "Tiết kiệm",
      amount: 1500000,
      purpose: "Gửi tiết kiệm",
      note: "Dữ liệu mẫu",
      attachment: "",
      isSample: true,
    },
    {
      date: day(12),
      type: "expense",
      category: "Giải trí",
      amount: 99000,
      purpose: "Xem phim",
      note: "Dữ liệu mẫu",
      attachment: "",
      isSample: true,
    },
    {
      date: day(15),
      type: "expense",
      category: "Điện nước",
      amount: 430000,
      purpose: "Thanh toán điện nước",
      note: "Dữ liệu mẫu",
      attachment: "",
      isSample: true,
    },
  ]

  return items.map((item, index) => ({
    ...item,
    id: `demo-${baseYear}${String(baseMonth).padStart(2, "0")}-${index + 1}`,
    createdAt: new Date().toISOString(),
  }))
}

export function detectRecurringPatterns(transactions: Transaction[]) {
  const groups = new Map<string, Transaction[]>()

  transactions.forEach((tx) => {
    const key = [
      tx.type,
      normalizeText(tx.category),
      normalizeText(tx.purpose),
      Math.round(tx.amount || 0),
    ].join("|")

    const bucket = groups.get(key) || []
    bucket.push(tx)
    groups.set(key, bucket)
  })

  return [...groups.entries()]
    .map(([key, bucket]) => {
      const sorted = [...bucket].sort((left, right) => left.date.localeCompare(right.date))
      if (sorted.length < 3) return null

      const intervals: number[] = []
      for (let index = 1; index < sorted.length; index += 1) {
        const previous = new Date(sorted[index - 1].date)
        const current = new Date(sorted[index].date)
        const diffDays = Math.round((current.getTime() - previous.getTime()) / 86_400_000)
        if (Number.isFinite(diffDays) && diffDays > 0) intervals.push(diffDays)
      }

      if (intervals.length === 0) return null

      const averageInterval = Math.round(intervals.reduce((sum, value) => sum + value, 0) / intervals.length)
      const last = sorted[sorted.length - 1]
      const nextExpectedDate = new Date(last.date)
      nextExpectedDate.setDate(nextExpectedDate.getDate() + averageInterval)

      return {
        key,
        category: last.category,
        type: last.type,
        purpose: last.purpose,
        amount: last.amount,
        count: sorted.length,
        intervalDays: averageInterval,
        nextExpectedDate: nextExpectedDate.toISOString().slice(0, 10),
      } satisfies RecurringPattern
    })
    .filter(Boolean) as RecurringPattern[]
}

export function detectAnomalies(transactions: Transaction[]) {
  const expenseTransactions = transactions.filter((tx) => tx.type === "expense" && tx.amount > 0)
  const categoryStats = new Map<string, { count: number; total: number }>()

  expenseTransactions.forEach((tx) => {
    const key = normalizeText(tx.category)
    const current = categoryStats.get(key) || { count: 0, total: 0 }
    current.count += 1
    current.total += tx.amount
    categoryStats.set(key, current)
  })

  return expenseTransactions
    .map((tx) => {
      const stats = categoryStats.get(normalizeText(tx.category))
      if (!stats || stats.count < 3) return null
      const average = stats.total / stats.count
      if (tx.amount < average * 2.5) return null

      return {
        id: `anomaly-${tx.id}`,
        severity: tx.amount >= average * 4 ? "danger" : "warning",
        title: `Giao dịch lớn bất thường: ${tx.category}`,
        description: `${tx.purpose} cao hơn mức trung bình cùng danh mục khoảng ${Math.round((tx.amount / average) * 100)}%.`,
        transaction: tx,
      } satisfies AnomalyAlert
    })
    .filter(Boolean) as AnomalyAlert[]
}

export function forecastMonth(transactions: Transaction[], monthYear: string): MonthForecast {
  const [yearPart, monthPart] = monthYear.split("-").map((value) => Number.parseInt(value, 10))
  const year = Number.isFinite(yearPart) ? yearPart : new Date().getFullYear()
  const month = Number.isFinite(monthPart) ? monthPart : new Date().getMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  const current = new Date()
  const isCurrentMonth =
    current.getFullYear() === year && current.getMonth() + 1 === month
  const daysElapsed = isCurrentMonth ? current.getDate() : daysInMonth

  const totals = transactions.reduce(
    (acc, tx) => {
      const amount = typeof tx.amount === "number" && !Number.isNaN(tx.amount) ? tx.amount : 0
      if (tx.type === "income") acc.income += amount
      if (tx.type === "expense") acc.expense += amount
      return acc
    },
    { income: 0, expense: 0 },
  )

  const averageDailyExpense = totals.expense / Math.max(1, daysElapsed)
  const averageDailyIncome = totals.income / Math.max(1, daysElapsed)
  const projectedExpense = isCurrentMonth ? averageDailyExpense * daysInMonth : totals.expense
  const projectedBalance = totals.income - projectedExpense

  return {
    monthYear,
    isCurrentMonth,
    daysElapsed,
    daysInMonth,
    income: totals.income,
    expense: totals.expense,
    balance: totals.income - totals.expense,
    projectedExpense,
    projectedBalance,
    averageDailyExpense,
    averageDailyIncome,
    burnRate: averageDailyExpense,
    actualSavings: totals.income - totals.expense,
    estimatedSavings: Math.max(totals.income - projectedExpense, 0),
  }
}

export function applyAutomationRules(
  text: string,
  type: Transaction["type"],
  rules: AutomationRule[],
) {
  const normalized = normalizeText(text)
  if (!normalized) return ""

  const match = rules.find((rule) => {
    if (rule.type !== "both" && rule.type !== type) return false
    return normalized.includes(normalizeText(rule.pattern))
  })

  return match?.category || ""
}
