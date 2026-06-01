"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Brain,
  Keyboard,
  PlayCircle,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react"
import { Transaction } from "@/lib/types"
import {
  AutomationRule,
  createDemoTransactions,
  detectAnomalies,
  detectRecurringPatterns,
  forecastMonth,
  loadAutomationRules,
  markOnboardingSeen,
  saveAutomationRules,
} from "@/lib/automation"
import { formatCurrency } from "@/lib/analytics"
import { DEFAULT_CATEGORIES } from "./AddTransactionModal"

interface ExperienceHubProps {
  transactions: Transaction[]
  monthYear: string
  spreadsheetId: string
  demoMode: boolean
  showSampleData: boolean
  hasRealData: boolean
  hasSampleData: boolean
  isLoadingMonthData: boolean
  isSeedingDemoData: boolean
  onEnableDemoMode: () => void
  onDisableDemoMode: () => void
  onSeedDemoData: () => Promise<boolean | void> | boolean | void
  onToggleShowSampleData: () => void
  onDeleteSampleData: () => Promise<void> | void
  canAdmin: boolean
  onOpenAddTransaction: () => void
  onFocusSearch: () => void
}

const shortcutItems = [
  { key: "Ctrl/⌘ + K", label: "Tìm kiếm nhanh" },
  { key: "N", label: "Thêm giao dịch" },
  { key: "Esc", label: "Đóng cửa sổ đang mở" },
  { key: "Ctrl/⌘ + Enter", label: "Lưu giao dịch" },
]

export function ExperienceHub({
  transactions,
  monthYear,
  spreadsheetId,
  demoMode,
  showSampleData,
  hasRealData,
  hasSampleData,
  isLoadingMonthData,
  isSeedingDemoData,
  onEnableDemoMode,
  onDisableDemoMode,
  onSeedDemoData,
  onToggleShowSampleData,
  onDeleteSampleData,
  canAdmin,
  onOpenAddTransaction,
  onFocusSearch,
}: ExperienceHubProps) {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [pattern, setPattern] = useState("")
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]?.name || "Ăn uống")
  const [type, setType] = useState<AutomationRule["type"]>("expense")
  const [onboardingSeen, setOnboardingSeen] = useState(true)

  useEffect(() => {
    setRules(loadAutomationRules(spreadsheetId))
    setOnboardingSeen(typeof window !== "undefined" ? localStorage.getItem("expensify_onboarding_seen") === "1" : true)
  }, [spreadsheetId])

  const forecast = useMemo(() => forecastMonth(transactions, monthYear), [monthYear, transactions])
  const recurringPatterns = useMemo(() => detectRecurringPatterns(transactions).slice(0, 3), [transactions])
  const anomalies = useMemo(() => detectAnomalies(transactions).slice(0, 3), [transactions])
  const demoTransactions = useMemo(() => createDemoTransactions(monthYear), [monthYear])
  const shouldShowOnboarding = !hasRealData && !onboardingSeen

  const handleSaveRule = () => {
    if (!pattern.trim() || !category.trim()) return
    const next = [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        pattern: pattern.trim(),
        category: category.trim(),
        type,
      },
      ...rules,
    ]
    setRules(next)
    saveAutomationRules(spreadsheetId, next)
    setPattern("")
  }

  const handleRemoveRule = (ruleId: string) => {
    const next = rules.filter((rule) => rule.id !== ruleId)
    setRules(next)
    saveAutomationRules(spreadsheetId, next)
  }

  const handleDismissOnboarding = () => {
    markOnboardingSeen()
    setOnboardingSeen(true)
  }

  return (
    <div className="space-y-6">
      {shouldShowOnboarding && (
        <div className="rounded-[2rem] border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-5 md:p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-600">
                <Sparkles className="h-5 w-5" />
                <p className="text-[10px] font-black uppercase tracking-widest">Onboarding</p>
              </div>
              <h3 className="text-xl font-black tracking-tight">Bắt đầu nhanh trong 3 bước</h3>
              <ol className="space-y-1 text-sm font-medium text-[var(--text-muted)] list-decimal pl-5">
                <li>Thử dữ liệu mẫu để xem app hoạt động ngay.</li>
                <li>Nhấn `N` để mở form thêm giao dịch và `Ctrl+K` để tìm nhanh.</li>
                <li>Tạo quy tắc tự động để app tự đoán danh mục cho bạn.</li>
              </ol>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onEnableDemoMode}
                className="rounded-2xl bg-blue-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
              >
                Dùng dữ liệu mẫu
              </button>
                <button
                  type="button"
                  onClick={async () => {
                    const seeded = await onSeedDemoData()
                    if (seeded !== false) onEnableDemoMode()
                  }}
                disabled={isSeedingDemoData || hasSampleData}
                className="rounded-2xl border border-[var(--border-color)] px-4 py-3 text-[10px] font-black uppercase tracking-widest"
              >
                {isSeedingDemoData
                  ? "Đang nạp..."
                  : hasSampleData
                    ? "Đã có mẫu"
                    : "Nạp mẫu vào Excel"}
              </button>
              <button
                type="button"
                onClick={onToggleShowSampleData}
                className="rounded-2xl border border-[var(--border-color)] px-4 py-3 text-[10px] font-black uppercase tracking-widest"
              >
                {showSampleData ? "Ẩn dữ liệu mẫu" : "Hiện dữ liệu mẫu"}
              </button>
              <button
                type="button"
                onClick={() => void onDeleteSampleData()}
                disabled={!canAdmin}
                className="rounded-2xl border border-rose-500/30 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-600"
              >
                Xóa mẫu khỏi Excel
              </button>
              <button
                type="button"
                onClick={handleDismissOnboarding}
                className="rounded-2xl border border-[var(--border-color)] px-4 py-3 text-[10px] font-black uppercase tracking-widest"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 md:p-6 shadow-xl">
            <div className="flex items-center gap-3 justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-600">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Dự báo tháng</p>
                  <h3 className="text-lg font-black tracking-tight">Số dư dự kiến cuối tháng</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenAddTransaction}
                className="rounded-2xl bg-blue-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
              >
                Thêm giao dịch
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Chi dự kiến</p>
                <p className="mt-2 text-base font-black text-rose-500">{formatCurrency(forecast.projectedExpense)}đ</p>
              </div>
              <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Dư dự kiến</p>
                <p className={`mt-2 text-base font-black ${forecast.projectedBalance >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {formatCurrency(forecast.projectedBalance)}đ
                </p>
              </div>
              <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Tiêu trung bình/ngày</p>
                <p className="mt-2 text-base font-black text-blue-600">{formatCurrency(forecast.burnRate)}đ</p>
              </div>
              <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Tiết kiệm thực tế</p>
                <p className="mt-2 text-base font-black text-emerald-500">{formatCurrency(forecast.actualSavings)}đ</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-color)] p-4 text-sm font-medium text-[var(--text-muted)]">
              App đang dựa trên {forecast.daysElapsed}/{forecast.daysInMonth} ngày của tháng {monthYear} để ước tính. Nếu tháng này đã kết thúc thì dự báo sẽ trùng với số liệu thực.
            </div>
            {isLoadingMonthData ? (
              <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm font-medium text-blue-600">
                Đang tải dữ liệu của tháng {monthYear}...
              </div>
            ) : null}
            {demoMode && !hasRealData ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-blue-500/10 p-4">
                <div>
                  <p className="text-sm font-black">Đang xem dữ liệu mẫu</p>
                  <p className="text-[11px] font-medium text-[var(--text-muted)]">Có thể tắt để quay về dữ liệu thật.</p>
                </div>
                <button
                  type="button"
                  onClick={onDisableDemoMode}
                  className="rounded-2xl border border-[var(--border-color)] px-4 py-3 text-[10px] font-black uppercase tracking-widest"
                >
                  Tắt mẫu
                </button>
              </div>
            ) : null}
            {!showSampleData ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-color)] p-4 text-sm font-medium text-[var(--text-muted)]">
                Dữ liệu mẫu đang được ẩn khỏi bảng, báo cáo và xuất file. Bật lại nếu muốn xem hoặc chỉnh sửa.
              </div>
            ) : null}
          </div>

          <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 md:p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-500">
                <WandSparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Tự động phân loại</p>
                <h3 className="text-lg font-black tracking-tight">Quy tắc nhanh</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_0.9fr_0.5fr_auto] gap-3">
              <input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="Từ khóa, ví dụ: grab, điện, shopee..."
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none"
              >
                {DEFAULT_CATEGORIES.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AutomationRule["type"])}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none"
              >
                <option value="expense">Chi tiêu</option>
                <option value="income">Thu nhập</option>
                <option value="both">Cả hai</option>
              </select>
              <button
                type="button"
                onClick={handleSaveRule}
                className="rounded-2xl bg-blue-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
              >
                Thêm
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {rules.length === 0 ? (
                <p className="text-sm font-medium text-[var(--text-muted)]">
                  Chưa có quy tắc nào. Thêm vài từ khóa để app tự đoán danh mục.
                </p>
              ) : (
                rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-black/5 dark:bg-white/5 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-black">{rule.pattern}</p>
                      <p className="text-[11px] font-medium text-[var(--text-muted)]">
                        → {rule.category} • {rule.type === "both" ? "Cả hai" : rule.type === "income" ? "Thu nhập" : "Chi tiêu"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(rule.id)}
                      className="rounded-xl p-2 text-rose-500 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 md:p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-500">
                <Keyboard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Phím tắt</p>
                <h3 className="text-lg font-black tracking-tight">Tìm nhanh và thao tác nhanh hơn</h3>
              </div>
            </div>
            <div className="space-y-2">
              {shortcutItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.label === "Tìm kiếm nhanh" ? onFocusSearch : onOpenAddTransaction}
                  className="flex w-full items-center justify-between rounded-2xl bg-black/5 dark:bg-white/5 px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-black">{item.label}</p>
                    <p className="text-[11px] font-medium text-[var(--text-muted)]">Nhấn để thử thao tác liên quan</p>
                  </div>
                  <span className="rounded-xl border border-[var(--border-color)] px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                    {item.key}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 md:p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-500">
                <PlayCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Xem thử</p>
                <h3 className="text-lg font-black tracking-tight">Dữ liệu mẫu có sẵn</h3>
              </div>
            </div>
            <p className="text-sm font-medium text-[var(--text-muted)]">
              Khi chưa có giao dịch thật, app có thể hiển thị sẵn một bộ dữ liệu mẫu để bạn xem dashboard, biểu đồ và dự báo trước khi nhập dữ liệu.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {demoTransactions.slice(0, 4).map((tx) => (
                <div key={tx.id} className="rounded-2xl bg-black/5 dark:bg-white/5 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{tx.category}</p>
                  <p className="mt-1 text-sm font-black">{tx.purpose}</p>
                  <p className={`mt-1 text-xs font-black ${tx.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}đ
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 md:p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-2xl bg-rose-500/10 p-3 text-rose-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Cảnh báo thông minh</p>
                <h3 className="text-lg font-black tracking-tight">Bất thường và giao dịch lặp lại</h3>
              </div>
            </div>

            <div className="space-y-3">
              {anomalies.length === 0 ? (
                <p className="text-sm font-medium text-[var(--text-muted)]">Chưa phát hiện giao dịch bất thường.</p>
              ) : (
                anomalies.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                    <p className="text-sm font-black text-rose-500">{item.title}</p>
                    <p className="mt-1 text-[11px] font-medium text-[var(--text-muted)]">{item.description}</p>
                  </div>
                ))
              )}

              {recurringPatterns.length === 0 ? (
                <p className="text-sm font-medium text-[var(--text-muted)]">Chưa đủ dữ liệu để nhận diện mẫu lặp lại.</p>
              ) : (
                recurringPatterns.map((item) => (
                  <div key={item.key} className="rounded-2xl border border-[var(--border-color)] bg-black/5 dark:bg-white/5 p-4">
                    <p className="text-sm font-black">{item.purpose}</p>
                    <p className="mt-1 text-[11px] font-medium text-[var(--text-muted)]">
                      {item.category} • {item.count} lần • chu kỳ ~{item.intervalDays} ngày • lần tiếp theo: {item.nextExpectedDate}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
