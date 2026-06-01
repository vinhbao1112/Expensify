"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArchiveRestore, Download, FileUp, HardDrive, RefreshCcw } from "lucide-react"
import { Transaction } from "@/lib/types"
import {
  BackupSnapshot,
  buildBackupSnapshot,
  exportBackupFile,
  loadBackupSnapshot,
  readBackupFile,
  saveBackupSnapshot,
} from "@/lib/backup"

interface BackupCenterProps {
  spreadsheetId: string
  monthYear: string
  transactions: Transaction[]
  onRestore: (snapshot: BackupSnapshot) => Promise<void> | void
}

export function BackupCenter({
  spreadsheetId,
  monthYear,
  transactions,
  onRestore,
}: BackupCenterProps) {
  const [notes, setNotes] = useState("")
  const [lastBackup, setLastBackup] = useState<BackupSnapshot | null>(null)
  const [status, setStatus] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLastBackup(loadBackupSnapshot(spreadsheetId))
  }, [spreadsheetId])

  const currentSnapshot = useMemo(
    () => buildBackupSnapshot(spreadsheetId, monthYear, transactions, notes),
    [monthYear, notes, spreadsheetId, transactions],
  )

  const handleCreateBackup = () => {
    saveBackupSnapshot(currentSnapshot)
    exportBackupFile(currentSnapshot)
    setLastBackup(currentSnapshot)
    setStatus("Đã tạo backup cục bộ và tải file xuống.")
  }

  const handleImportBackup = async (file: File) => {
    try {
      const snapshot = await readBackupFile(file)
      saveBackupSnapshot(snapshot)
      setLastBackup(snapshot)
      setStatus("Đã nhập backup và lưu vào máy.")
    } catch (error) {
      console.error("Error importing backup:", error)
      setStatus("Không đọc được file backup.")
    }
  }

  const handleRestoreBackup = async () => {
    const snapshot = lastBackup || loadBackupSnapshot(spreadsheetId)
    if (!snapshot) {
      setStatus("Chưa có backup nào để khôi phục.")
      return
    }

    await onRestore(snapshot)
    setStatus("Đang khôi phục dữ liệu từ backup.")
  }

  return (
    <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 md:p-6 shadow-xl space-y-5">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-500">
          <HardDrive className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            Backup & Cache
          </p>
          <h3 className="text-lg font-black tracking-tight">Sao lưu cục bộ và khôi phục</h3>
        </div>
      </div>

      <label className="block space-y-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
          Ghi chú backup
        </span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ví dụ: backup trước khi đổi tháng"
          className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none"
        />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={handleCreateBackup}
          className="rounded-2xl bg-blue-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white flex items-center justify-center gap-2"
        >
          <Download className="h-4 w-4" />
          Xuất backup
        </button>
        <button
          type="button"
          onClick={handleRestoreBackup}
          className="rounded-2xl border border-[var(--border-color)] px-4 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
        >
          <ArchiveRestore className="h-4 w-4" />
          Khôi phục
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-2xl border border-[var(--border-color)] px-4 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
        >
          <FileUp className="h-4 w-4" />
          Nhập file
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          await handleImportBackup(file)
          e.currentTarget.value = ""
        }}
      />

      <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-4 space-y-2 text-sm font-medium text-[var(--text-muted)]">
        <div className="flex items-center justify-between gap-3">
          <span>Backup gần nhất</span>
          <span className="font-black text-[var(--text-main)]">
            {lastBackup ? new Date(lastBackup.createdAt).toLocaleString("vi-VN") : "Chưa có"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Số giao dịch</span>
          <span className="font-black text-[var(--text-main)]">{currentSnapshot.transactions.length}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Trạng thái</span>
          <span className="font-black text-blue-600">{status || "Sẵn sàng"}</span>
        </div>
      </div>

      <p className="text-[11px] font-medium text-[var(--text-muted)]">
        Backup được lưu cục bộ trong trình duyệt và có thể tải lại sau. Khi khôi phục, dữ liệu sẽ được đẩy trở lại Google Sheets theo từng giao dịch.
      </p>
    </div>
  )
}
