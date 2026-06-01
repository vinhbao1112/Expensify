import type { Transaction } from "./types"

export type PeriodKind = "week" | "month" | "quarter" | "year"

export type ExpenseBucket = "fixed" | "flexible" | "savings"

export interface PeriodSeries {
  labels: string[]
  income: number[]
  expense: number[]
  totalIncome: number
  totalExpense: number
}

export interface PeriodComparison {
  currentIncome: number
  currentExpense: number
  previousIncome: number
  previousExpense: number
  incomeDelta: number
  expenseDelta: number
  balanceDelta: number
}

const vietnameseMonths = [
  "Thg 1",
  "Thg 2",
  "Thg 3",
  "Thg 4",
  "Thg 5",
  "Thg 6",
  "Thg 7",
  "Thg 8",
  "Thg 9",
  "Thg 10",
  "Thg 11",
  "Thg 12",
]

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

export function parseTransactionDate(dateStr: string) {
  if (!dateStr) return null
  const parsed = new Date(`${dateStr}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatCurrency(value: number) {
  return value.toLocaleString("vi-VN")
}

export function getLatestTransactionDate(transactions: Transaction[]) {
  const dates = transactions
    .map((tx) => parseTransactionDate(tx.date))
    .filter((date): date is Date => !!date)

  if (dates.length === 0) return new Date()
  return new Date(Math.max(...dates.map((date) => date.getTime())))
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function startOfQuarter(date: Date) {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3
  return new Date(date.getFullYear(), quarterStartMonth, 1)
}

function endOfQuarter(date: Date) {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3
  return new Date(date.getFullYear(), quarterStartMonth + 3, 0)
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1)
}

function endOfYear(date: Date) {
  return new Date(date.getFullYear(), 11, 31)
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function getQuarterKey(date: Date) {
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`
}

function getYearKey(date: Date) {
  return `${date.getFullYear()}`
}

function inRange(date: Date, start: Date, end: Date) {
  return date >= start && date <= end
}

function buildBuckets(kind: PeriodKind, anchor: Date) {
  if (kind === "week") {
    const end = anchor
    const start = addDays(end, -6)
    const buckets = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index)
      return {
        key: date.toISOString().slice(0, 10),
        label: new Intl.DateTimeFormat("vi-VN", {
          weekday: "short",
          day: "2-digit",
        }).format(date),
        date,
      }
    })
    return { start, end, buckets }
  }

  if (kind === "month") {
    const start = startOfMonth(anchor)
    const end = endOfMonth(anchor)
    const days = end.getDate()
    const buckets = Array.from({ length: days }, (_, index) => {
      const date = new Date(anchor.getFullYear(), anchor.getMonth(), index + 1)
      return {
        key: date.toISOString().slice(0, 10),
        label: String(index + 1),
        date,
      }
    })
    return { start, end, buckets }
  }

  if (kind === "quarter") {
    const start = startOfQuarter(anchor)
    const end = endOfQuarter(anchor)
    const buckets = Array.from({ length: 3 }, (_, index) => {
      const monthDate = new Date(start.getFullYear(), start.getMonth() + index, 1)
      return {
        key: getMonthKey(monthDate),
        label: vietnameseMonths[monthDate.getMonth()],
        date: monthDate,
      }
    })
    return { start, end, buckets }
  }

  const start = startOfYear(anchor)
  const end = endOfYear(anchor)
  const buckets = Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(anchor.getFullYear(), index, 1)
    return {
      key: getMonthKey(monthDate),
      label: vietnameseMonths[index],
      date: monthDate,
    }
  })
  return { start, end, buckets }
}

export function getPeriodWindow(kind: PeriodKind, anchor: Date = new Date()) {
  return buildBuckets(kind, anchor)
}

export function buildPeriodSeries(
  transactions: Transaction[],
  kind: PeriodKind,
  anchorDate = getLatestTransactionDate(transactions),
): PeriodSeries {
  const { start, end, buckets } = buildBuckets(kind, anchorDate)
  const income = buckets.map(() => 0)
  const expense = buckets.map(() => 0)

  const addToBucket = (txDate: Date, amount: number, type: Transaction["type"]) => {
    let index = -1

    if (kind === "week" || kind === "month") {
      index = buckets.findIndex((bucket) => isSameDay(bucket.date, txDate))
    } else if (kind === "quarter" || kind === "year") {
      index = buckets.findIndex(
        (bucket) =>
          bucket.date.getFullYear() === txDate.getFullYear() &&
          bucket.date.getMonth() === txDate.getMonth(),
      )
    }

    if (index === -1) return
    if (type === "income") income[index] += amount
    else expense[index] += amount
  }

  transactions.forEach((tx) => {
    const txDate = parseTransactionDate(tx.date)
    const amount =
      typeof tx.amount === "number" && !Number.isNaN(tx.amount) ? tx.amount : 0
    if (!txDate || !inRange(txDate, start, end) || amount <= 0) return
    addToBucket(txDate, amount, tx.type)
  })

  return {
    labels: buckets.map((bucket) => bucket.label),
    income,
    expense,
    totalIncome: income.reduce((sum, value) => sum + value, 0),
    totalExpense: expense.reduce((sum, value) => sum + value, 0),
  }
}

function getPreviousRange(kind: PeriodKind, anchor: Date) {
  if (kind === "week") {
    const end = addDays(anchor, -7)
    const start = addDays(end, -6)
    return { start, end }
  }
  if (kind === "month") {
    const previous = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1)
    return { start: startOfMonth(previous), end: endOfMonth(previous) }
  }
  if (kind === "quarter") {
    const previous = new Date(anchor.getFullYear(), anchor.getMonth() - 3, 1)
    return { start: startOfQuarter(previous), end: endOfQuarter(previous) }
  }
  const previous = new Date(anchor.getFullYear() - 1, 0, 1)
  return { start: startOfYear(previous), end: endOfYear(previous) }
}

function sumRange(transactions: Transaction[], start: Date, end: Date) {
  return transactions.reduce(
    (acc, tx) => {
      const txDate = parseTransactionDate(tx.date)
      const amount =
        typeof tx.amount === "number" && !Number.isNaN(tx.amount) ? tx.amount : 0

      if (!txDate || amount <= 0 || !inRange(txDate, start, end)) return acc
      if (tx.type === "income") acc.income += amount
      else acc.expense += amount
      return acc
    },
    { income: 0, expense: 0 },
  )
}

export function comparePeriods(transactions: Transaction[], kind: PeriodKind): PeriodComparison {
  const anchor = getLatestTransactionDate(transactions)
  const currentRange = getPeriodWindow(kind, anchor)
  const previousRange = getPreviousRange(kind, anchor)

  const current = sumRange(transactions, currentRange.start, currentRange.end)
  const previous = sumRange(transactions, previousRange.start, previousRange.end)

  return {
    currentIncome: current.income,
    currentExpense: current.expense,
    previousIncome: previous.income,
    previousExpense: previous.expense,
    incomeDelta: current.income - previous.income,
    expenseDelta: current.expense - previous.expense,
    balanceDelta: (current.income - current.expense) - (previous.income - previous.expense),
  }
}

export function groupExpenseByCategory(
  transactions: Transaction[],
  categories = 8,
  range?: { start: Date; end: Date },
) {
  const totals = transactions.reduce((acc, tx) => {
    const txDate = parseTransactionDate(tx.date)
    const amount =
      typeof tx.amount === "number" && !Number.isNaN(tx.amount) ? tx.amount : 0
    if (
      !txDate ||
      amount <= 0 ||
      tx.type !== "expense" ||
      (range && !inRange(txDate, range.start, range.end))
    ) {
      return acc
    }

    const key = tx.category || "Khác"
    acc[key] = (acc[key] || 0) + amount
    return acc
  }, {} as Record<string, number>)

  return Object.entries(totals)
    .sort(([, left], [, right]) => right - left)
    .slice(0, categories)
}

export function groupIncomeByCategory(
  transactions: Transaction[],
  categories = 8,
  range?: { start: Date; end: Date },
) {
  const totals = transactions.reduce((acc, tx) => {
    const txDate = parseTransactionDate(tx.date)
    const amount =
      typeof tx.amount === "number" && !Number.isNaN(tx.amount) ? tx.amount : 0
    if (
      !txDate ||
      amount <= 0 ||
      tx.type !== "income" ||
      (range && !inRange(txDate, range.start, range.end))
    ) {
      return acc
    }

    const key = tx.category || "Khác"
    acc[key] = (acc[key] || 0) + amount
    return acc
  }, {} as Record<string, number>)

  return Object.entries(totals)
    .sort(([, left], [, right]) => right - left)
    .slice(0, categories)
}

export function classifyExpenseBucket(category: string): ExpenseBucket {
  const normalized = normalizeText(category)

  const savingsKeywords = [
    "tiet kiem",
    "dau tu",
    "dau tu",
    "saving",
    "quy",
    "du phong",
    "bao hiem",
    "tra no",
  ]
  const fixedKeywords = [
    "nha",
    "thue",
    "rent",
    "dien",
    "nuoc",
    "internet",
    "wifi",
    "hoc phi",
    "trong tre",
    "bao hiem",
    "tra gop",
    "subscription",
    "dien thoai",
    "cuoc",
  ]

  if (savingsKeywords.some((keyword) => normalized.includes(keyword))) return "savings"
  if (fixedKeywords.some((keyword) => normalized.includes(keyword))) return "fixed"
  return "flexible"
}

export function getBucketLabel(bucket: ExpenseBucket) {
  switch (bucket) {
    case "fixed":
      return "Cố định"
    case "flexible":
      return "Linh hoạt"
    case "savings":
      return "Tiết kiệm"
  }
}

export function sumExpenseBuckets(transactions: Transaction[], range?: { start: Date; end: Date }) {
  return transactions.reduce(
    (acc, tx) => {
      const txDate = parseTransactionDate(tx.date)
      const amount =
        typeof tx.amount === "number" && !Number.isNaN(tx.amount) ? tx.amount : 0
      if (
        !txDate ||
        amount <= 0 ||
        tx.type !== "expense" ||
        (range && !inRange(txDate, range.start, range.end))
      ) {
        return acc
      }

      const bucket = classifyExpenseBucket(tx.category)
      acc[bucket] += amount
      acc.total += amount
      return acc
    },
    { fixed: 0, flexible: 0, savings: 0, total: 0 },
  )
}

export function getRangeForMonth(monthYear: string) {
  const [year, month] = monthYear.split("-").map((value) => Number.parseInt(value, 10))
  const start = new Date(year, month - 1, 1)
  const end = endOfMonth(start)
  return { start, end }
}

export function getCategoryBudgetWarnings(
  transactions: Transaction[],
  budgets: Record<string, number>,
  range?: { start: Date; end: Date },
) {
  const categoryTotals = transactions.reduce((acc, tx) => {
    const txDate = parseTransactionDate(tx.date)
    const amount =
      typeof tx.amount === "number" && !Number.isNaN(tx.amount) ? tx.amount : 0
    if (
      !txDate ||
      amount <= 0 ||
      tx.type !== "expense" ||
      (range && !inRange(txDate, range.start, range.end))
    ) {
      return acc
    }

    const key = tx.category || "Khác"
    acc[key] = (acc[key] || 0) + amount
    return acc
  }, {} as Record<string, number>)

  return Object.entries(budgets)
    .filter(([, budget]) => budget > 0)
    .map(([category, budget]) => {
      const spent = categoryTotals[category] || 0
      const progress = budget > 0 ? Math.min((spent / budget) * 100, 999) : 0
      return {
        category,
        budget,
        spent,
        progress,
        exceeded: spent > budget,
      }
    })
    .sort((left, right) => right.spent - left.spent)
}
