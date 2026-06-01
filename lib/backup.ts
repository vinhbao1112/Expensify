import type { Transaction } from "./types"

export interface BackupSnapshot {
  version: 1
  createdAt: string
  spreadsheetId: string
  monthYear: string
  transactions: Transaction[]
  notes?: string
}

export interface CachedTransactions {
  savedAt: string
  spreadsheetId: string
  monthYear: string
  transactions: Transaction[]
  allTimeTotals?: {
    income: number
    expense: number
  }
}

const BACKUP_PREFIX = "expensify_backup_"
const CACHE_PREFIX = "expensify_cache_"

export function backupStorageKey(spreadsheetId: string) {
  return `${BACKUP_PREFIX}${spreadsheetId || "default"}`
}

export function cacheStorageKey(spreadsheetId: string) {
  return `${CACHE_PREFIX}${spreadsheetId || "default"}`
}

export function buildBackupSnapshot(
  spreadsheetId: string,
  monthYear: string,
  transactions: Transaction[],
  notes = "",
): BackupSnapshot {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    spreadsheetId,
    monthYear,
    transactions: [...transactions],
    notes: notes.trim() || undefined,
  }
}

export function saveBackupSnapshot(snapshot: BackupSnapshot) {
  if (typeof window === "undefined") return
  localStorage.setItem(backupStorageKey(snapshot.spreadsheetId), JSON.stringify(snapshot))
}

export function loadBackupSnapshot(spreadsheetId: string) {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(backupStorageKey(spreadsheetId))
    if (!raw) return null
    return JSON.parse(raw) as BackupSnapshot
  } catch (error) {
    console.error("Error loading backup snapshot:", error)
    return null
  }
}

export function saveCache(snapshot: CachedTransactions) {
  if (typeof window === "undefined") return
  localStorage.setItem(cacheStorageKey(snapshot.spreadsheetId), JSON.stringify(snapshot))
}

export function loadCache(spreadsheetId: string) {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(cacheStorageKey(spreadsheetId))
    if (!raw) return null
    return JSON.parse(raw) as CachedTransactions
  } catch (error) {
    console.error("Error loading transaction cache:", error)
    return null
  }
}

export function exportBackupFile(snapshot: BackupSnapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `expensify-backup-${snapshot.monthYear}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export async function readBackupFile(file: File) {
  const text = await file.text()
  return JSON.parse(text) as BackupSnapshot
}
