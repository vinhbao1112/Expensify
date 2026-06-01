import { Suspense } from "react"
import { ReportContent } from "./report-content"

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-sm font-medium text-[var(--text-muted)] shadow-2xl">
            Đang tải báo cáo...
          </div>
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  )
}
