import type { Transaction } from "./types"
import { formatCurrency, groupExpenseByCategory, groupIncomeByCategory } from "./analytics"

export type ReportTemplate = "summary" | "detailed" | "budget" | "timeline"

export interface ReportSnapshot {
  monthYear: string
  template: ReportTemplate
  generatedAt: string
  transactions: Transaction[]
  totals: {
    income: number
    expense: number
    balance: number
  }
  topExpenses: Array<[string, number]>
  topIncome: Array<[string, number]>
}

export function createReportSnapshot(
  transactions: Transaction[],
  monthYear: string,
  template: ReportTemplate,
): ReportSnapshot {
  const totals = transactions.reduce(
    (acc, tx) => {
      const amount =
        typeof tx.amount === "number" && !Number.isNaN(tx.amount) ? tx.amount : 0
      if (tx.type === "income") acc.income += amount
      else if (tx.type === "expense") acc.expense += amount
      return acc
    },
    { income: 0, expense: 0 },
  )

  return {
    monthYear,
    template,
    generatedAt: new Date().toISOString(),
    transactions: [...transactions].sort(
      (left, right) => right.date.localeCompare(left.date),
    ),
    totals: {
      income: totals.income,
      expense: totals.expense,
      balance: totals.income - totals.expense,
    },
    topExpenses: groupExpenseByCategory(transactions, 8),
    topIncome: groupIncomeByCategory(transactions, 8),
  }
}

export function encodeReportSnapshot(snapshot: ReportSnapshot) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(snapshot))))
}

export function decodeReportSnapshot(encoded: string) {
  try {
    const json = decodeURIComponent(escape(atob(encoded)))
    return JSON.parse(json) as ReportSnapshot
  } catch (error) {
    console.error("Error decoding report snapshot:", error)
    return null
  }
}

export function getTemplateTitle(template: ReportTemplate) {
  switch (template) {
    case "summary":
      return "Tổng hợp"
    case "detailed":
      return "Chi tiết"
    case "budget":
      return "Ngân sách"
    case "timeline":
      return "Dòng thời gian"
  }
}

export function buildMailtoLink(snapshot: ReportSnapshot) {
  const subject = encodeURIComponent(`Báo cáo chi tiêu ${snapshot.monthYear} - ${getTemplateTitle(snapshot.template)}`)
  const body = encodeURIComponent(
    `Báo cáo ${snapshot.monthYear}\n` +
      `Thu: ${formatCurrency(snapshot.totals.income)}đ\n` +
      `Chi: ${formatCurrency(snapshot.totals.expense)}đ\n` +
      `Số dư: ${formatCurrency(snapshot.totals.balance)}đ\n\n` +
      `Xem báo cáo chi tiết: ${window.location.origin}/report?data=${encodeReportSnapshot(snapshot)}`,
  )
  return `mailto:?subject=${subject}&body=${body}`
}

