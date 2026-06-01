import type { Transaction } from "./types"

export interface RecurringTemplate {
  id: string
  name: string
  intervalDays: number
  nextRunDate: string
  transaction: Omit<Transaction, "id" | "rowIndex" | "createdAt">
  lastGeneratedDate?: string
  enabled: boolean
}

export function recurringStorageKey(spreadsheetId: string) {
  return `expensify_recurring_templates_${spreadsheetId || "default"}`
}

export function loadRecurringTemplates(spreadsheetId: string) {
  if (typeof window === "undefined") return [] as RecurringTemplate[]
  try {
    const raw = localStorage.getItem(recurringStorageKey(spreadsheetId))
    if (!raw) return []
    return JSON.parse(raw) as RecurringTemplate[]
  } catch (error) {
    console.error("Error loading recurring templates:", error)
    return []
  }
}

export function saveRecurringTemplates(spreadsheetId: string, templates: RecurringTemplate[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(recurringStorageKey(spreadsheetId), JSON.stringify(templates))
}

export function advanceRecurringTemplate(template: RecurringTemplate) {
  const next = new Date(`${template.nextRunDate}T00:00:00`)
  next.setDate(next.getDate() + template.intervalDays)
  return {
    ...template,
    lastGeneratedDate: template.nextRunDate,
    nextRunDate: next.toISOString().slice(0, 10),
  }
}

