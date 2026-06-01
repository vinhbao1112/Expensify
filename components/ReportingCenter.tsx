"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Bell,
  CalendarDays,
  Copy,
  FileText,
  Mail,
  Megaphone,
  Printer,
  Share2,
  Sparkles,
  TimerReset,
} from "lucide-react"
import { Transaction } from "@/lib/types"
import {
  buildMailtoLink,
  createReportSnapshot,
  encodeReportSnapshot,
  getTemplateTitle,
  type ReportTemplate,
  type ReportSnapshot,
} from "@/lib/report"
import { formatCurrency } from "@/lib/analytics"

interface ReminderSettings {
  enabled: boolean
  dailyReminderHour: number
  budgetWarningThreshold: number
  billReminderDays: number
}

interface ReportingCenterProps {
  transactions: Transaction[]
  monthYear: string
}

const defaultReminderSettings: ReminderSettings = {
  enabled: false,
  dailyReminderHour: 20,
  budgetWarningThreshold: 80,
  billReminderDays: 3,
}

const templates: Array<{ id: ReportTemplate; title: string; desc: string }> = [
  { id: "summary", title: "Tổng hợp", desc: "Tổng quan nhanh, phù hợp gửi xem nhanh" },
  { id: "detailed", title: "Chi tiết", desc: "Có danh sách giao dịch gần đây" },
  { id: "budget", title: "Ngân sách", desc: "Tập trung vào ngân sách và cảnh báo" },
  { id: "timeline", title: "Timeline", desc: "Bố cục dạng dòng thời gian" },
]

function buildReportUrl(snapshot: ReportSnapshot) {
  const encoded = encodeReportSnapshot(snapshot)
  return `${window.location.origin}/report?data=${encoded}`
}

export function ReportingCenter({ transactions, monthYear }: ReportingCenterProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>("summary")
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(defaultReminderSettings)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  )

  const snapshot = useMemo(
    () => createReportSnapshot(transactions, monthYear, selectedTemplate),
    [monthYear, selectedTemplate, transactions],
  )

  const reportUrl = useMemo(() => {
    if (typeof window === "undefined") return ""
    return buildReportUrl(snapshot)
  }, [snapshot])

  useEffect(() => {
    try {
      const raw = localStorage.getItem("expensify_reminders")
      if (raw) setReminderSettings({ ...defaultReminderSettings, ...JSON.parse(raw) })
    } catch (error) {
      console.error("Error loading reminder settings:", error)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("expensify_reminders", JSON.stringify(reminderSettings))
  }, [reminderSettings])

  useEffect(() => {
    if (!reminderSettings.enabled) return

    const tick = () => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return

      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const shouldDailyReminder =
        currentHour === reminderSettings.dailyReminderHour && currentMinute === 0

      if (shouldDailyReminder) {
        new Notification("Nhắc nhập chi tiêu", {
          body: `Đến giờ cập nhật giao dịch cho tháng ${monthYear}.`,
        })
      }

      const budgetSpent = transactions
        .filter((tx) => tx.type === "expense")
        .reduce((sum, tx) => sum + (tx.amount || 0), 0)
      const incomeSpent = transactions
        .filter((tx) => tx.type === "income")
        .reduce((sum, tx) => sum + (tx.amount || 0), 0)
      const budgetThreshold =
        incomeSpent > 0 ? (budgetSpent / incomeSpent) * 100 : 0

      if (
        reminderSettings.budgetWarningThreshold > 0 &&
        budgetThreshold >= reminderSettings.budgetWarningThreshold
      ) {
        new Notification("Cảnh báo ngân sách", {
          body: `Chi tiêu đã đạt ${budgetThreshold.toFixed(0)}% so với thu nhập trong tháng.`,
        })
      }
    }

    const timer = window.setInterval(tick, 60_000)
    tick()
    return () => window.clearInterval(timer)
  }, [monthYear, reminderSettings, transactions])

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(reportUrl)
    alert("Đã sao chép link báo cáo.")
  }

  const handleOpenPrint = () => {
    window.open(reportUrl, "_blank", "noopener,noreferrer")
  }

  const handleShareEmail = () => {
    window.location.href = buildMailtoLink(snapshot)
  }

  const handlePrintPdf = () => {
    window.open(reportUrl, "_blank", "noopener,noreferrer")
  }

  const handleEnableNotifications = async () => {
    if (typeof Notification === "undefined") return
    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
  }

  return (
    <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 md:p-6 shadow-xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-600">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            Xuất báo cáo & nhắc nhở
          </p>
          <h3 className="text-xl font-black tracking-tight">Giai đoạn 3</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-6">
        <div className="space-y-4">
          <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              <Printer className="h-4 w-4" />
              Mẫu báo cáo
            </div>
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                    selectedTemplate === template.id
                      ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : "border-[var(--border-color)] hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black">{template.title}</p>
                      <p className="text-[11px] font-medium opacity-80">{template.desc}</p>
                    </div>
                    {selectedTemplate === template.id ? <Sparkles className="h-4 w-4" /> : null}
                  </div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={handlePrintPdf}
                className="rounded-2xl bg-blue-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
              >
                Xuất PDF
              </button>
              <button
                type="button"
                onClick={handleOpenPrint}
                className="rounded-2xl border border-[var(--border-color)] px-4 py-3 text-[10px] font-black uppercase tracking-widest"
              >
                Mở bản in
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              <Share2 className="h-4 w-4" />
              Chia sẻ
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full rounded-2xl border border-[var(--border-color)] px-4 py-3 text-left text-sm font-black"
            >
              Sao chép link báo cáo
            </button>
            <button
              type="button"
              onClick={handleShareEmail}
              className="w-full rounded-2xl border border-[var(--border-color)] px-4 py-3 text-left text-sm font-black"
            >
              Gửi qua email
            </button>
            <div className="rounded-2xl bg-[var(--bg-input)] px-4 py-3 text-[11px] font-bold text-[var(--text-muted)] break-all">
              {reportUrl}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-4 space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              <Bell className="h-4 w-4" />
              Thông báo & nhắc việc
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] px-4 py-3">
              <div>
                <p className="text-sm font-black">Quyền thông báo</p>
                <p className="text-[11px] font-bold text-[var(--text-muted)]">
                  Trạng thái hiện tại: {notificationPermission}
                </p>
              </div>
              <button
                type="button"
                onClick={handleEnableNotifications}
                className="rounded-xl bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white"
              >
                Bật
              </button>
            </div>

            <label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Giờ nhắc nhập chi tiêu
              </span>
              <input
                type="number"
                min={0}
                max={23}
                value={reminderSettings.dailyReminderHour}
                onChange={(e) =>
                  setReminderSettings((current) => ({
                    ...current,
                    dailyReminderHour: Math.max(0, Math.min(23, Number.parseInt(e.target.value) || 0)),
                  }))
                }
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Cảnh báo khi chi tiêu đạt %
              </span>
              <input
                type="number"
                min={0}
                max={200}
                value={reminderSettings.budgetWarningThreshold}
                onChange={(e) =>
                  setReminderSettings((current) => ({
                    ...current,
                    budgetWarningThreshold: Math.max(
                      0,
                      Math.min(200, Number.parseInt(e.target.value) || 0),
                    ),
                  }))
                }
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Nhắc hóa đơn trước bao nhiêu ngày
              </span>
              <input
                type="number"
                min={1}
                max={30}
                value={reminderSettings.billReminderDays}
                onChange={(e) =>
                  setReminderSettings((current) => ({
                    ...current,
                    billReminderDays: Math.max(
                      1,
                      Math.min(30, Number.parseInt(e.target.value) || 1),
                    ),
                  }))
                }
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
              />
            </label>
          </div>

          <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              <TimerReset className="h-4 w-4" />
              Tóm tắt báo cáo
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-[var(--bg-input)] px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Thu</p>
                <p className="mt-1 text-sm font-black text-emerald-500">
                  {formatCurrency(snapshot.totals.income)}đ
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--bg-input)] px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Chi</p>
                <p className="mt-1 text-sm font-black text-rose-500">
                  {formatCurrency(snapshot.totals.expense)}đ
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--bg-input)] px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Dư</p>
                <p className="mt-1 text-sm font-black text-blue-600">
                  {formatCurrency(snapshot.totals.balance)}đ
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-[var(--border-color)] p-4 text-[11px] font-medium text-[var(--text-muted)]">
              Giai đoạn 3 hiện đã có báo cáo in/print, chia sẻ snapshot và nhắc việc bằng Notification API. Nếu cần email tự động thật, phải thêm scheduler/server job riêng.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

