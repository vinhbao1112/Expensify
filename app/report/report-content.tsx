"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Printer, Share2 } from "lucide-react"
import { decodeReportSnapshot, getTemplateTitle } from "@/lib/report"
import { formatCurrency } from "@/lib/analytics"

export function ReportContent() {
  const searchParams = useSearchParams()
  const snapshot = useMemo(() => {
    const encoded = searchParams.get("data") || ""
    return decodeReportSnapshot(encoded)
  }, [searchParams])

  if (!snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-center shadow-2xl">
          <h1 className="text-2xl font-black">Không đọc được báo cáo</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Link báo cáo không hợp lệ hoặc đã bị hỏng.
          </p>
        </div>
      </div>
    )
  }

  const handlePrint = () => window.print()
  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href)
    alert("Đã sao chép link báo cáo")
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Báo cáo chia sẻ
            </p>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              {getTemplateTitle(snapshot.template)} - {snapshot.monthYear}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3 text-sm font-black"
            >
              <Share2 className="h-4 w-4" />
              Copy link
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white"
            >
              <Printer className="h-4 w-4" />
              In / PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Thu nhập</p>
            <p className="mt-2 text-3xl font-black text-emerald-500">{formatCurrency(snapshot.totals.income)}đ</p>
          </div>
          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Chi tiêu</p>
            <p className="mt-2 text-3xl font-black text-rose-500">{formatCurrency(snapshot.totals.expense)}đ</p>
          </div>
          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Số dư</p>
            <p className="mt-2 text-3xl font-black text-blue-600">{formatCurrency(snapshot.totals.balance)}đ</p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black">Tổng quan theo mẫu</h2>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              {new Date(snapshot.generatedAt).toLocaleString("vi-VN")}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                Top chi tiêu
              </h3>
              <div className="space-y-2">
                {snapshot.topExpenses.slice(0, 5).map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between rounded-2xl bg-black/5 dark:bg-white/5 px-4 py-3">
                    <span className="font-bold">{category}</span>
                    <span className="font-black text-rose-500">{formatCurrency(amount)}đ</span>
                  </div>
                ))}
              </div>
            </div>

            {snapshot.template === "detailed" && (
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Giao dịch gần đây
                </h3>
                <div className="space-y-2">
                  {snapshot.transactions.slice(0, 20).map((tx) => (
                    <div key={tx.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-2xl bg-black/5 dark:bg-white/5 px-4 py-3">
                      <div>
                        <p className="font-black">{tx.purpose}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{tx.date} · {tx.category}</p>
                      </div>
                      <span className={`font-black ${tx.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}đ
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="no-print rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-muted)]">
          Dùng nút <strong>In / PDF</strong> để mở hộp thoại in của trình duyệt và lưu thành PDF.
        </div>
      </div>
    </div>
  )
}
