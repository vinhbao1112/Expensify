"use client"

import { Transaction, Category } from "@/lib/types"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Trash2,
  Pencil,
  MoreHorizontal,
  Copy,
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import {
  DEFAULT_CATEGORIES,
  ICON_MAP,
} from "./AddTransactionModal"
import {
  getAllCategoriesIncludingHidden,
  getCategoryByName,
  resolveCategoryName,
} from "@/lib/category-tools"

interface TransactionListProps {
  transactions: Transaction[]
  monthYear: string
  onEdit: (tx: Transaction) => void
  onDuplicate?: (tx: Transaction) => void
  onDelete?: (tx: Transaction) => Promise<void> | void
  spreadsheetId: string
  limit?: number
  showFilters?: boolean
}

export function TransactionList({
  transactions,
  monthYear,
  onEdit,
  onDuplicate,
  onDelete,
  spreadsheetId,
  limit,
  showFilters = true,
}: TransactionListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [allCategories, setAllCategories] = useState<Category[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("expensify_all_categories")
        if (saved) return getAllCategoriesIncludingHidden(JSON.parse(saved))
        const oldCustom = localStorage.getItem("expensify_custom_categories")
        if (oldCustom) return getAllCategoriesIncludingHidden([...DEFAULT_CATEGORIES, ...JSON.parse(oldCustom)])
      } catch (e) {
        console.error("Error loading categories:", e)
      }
    }
    return getAllCategoriesIncludingHidden(DEFAULT_CATEGORIES)
  })

  useEffect(() => {
    const focusSearch = () => searchInputRef.current?.focus()
    const syncCategories = () => {
      try {
        const saved = localStorage.getItem("expensify_all_categories")
        if (saved) setAllCategories(getAllCategoriesIncludingHidden(JSON.parse(saved)))
      } catch (e) {
        console.error("Error syncing categories:", e)
      }
    }

    window.addEventListener("storage", syncCategories)
    window.addEventListener("categories-updated", syncCategories)
    window.addEventListener("focus-transaction-search", focusSearch)
    syncCategories()

    return () => {
      window.removeEventListener("storage", syncCategories)
      window.removeEventListener("categories-updated", syncCategories)
      window.removeEventListener("focus-transaction-search", focusSearch)
    }
  }, [transactions])

  const renderCategoryIcon = (category: string, size = "w-6 h-6") => {
    const resolvedName = resolveCategoryName(category, allCategories)
    const cat = getCategoryByName(resolvedName, allCategories)

    if (cat?.image) {
      return <img src={cat.image} alt={category} className={`${size} rounded-full object-cover shadow-sm`} />
    }

    const IconComponent = ICON_MAP[cat?.icon || "MoreHorizontal"] || MoreHorizontal
    const colorClass =
      cat?.color || (category.toLowerCase() === "ăn uống" ? "text-orange-500" : "text-blue-500")

    return <IconComponent className={`${size} ${colorClass} stroke-[2.5px]`} />
  }

  const filteredTransactions = (transactions || []).filter((tx: Transaction) => {
    const matchesSearch =
      (tx.purpose || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.category || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDate = filterDate ? tx.date === filterDate : true
    return matchesSearch && matchesDate
  })

  const displayedTransactions = limit
    ? filteredTransactions.slice(0, limit)
    : filteredTransactions

  const handleDelete = async (tx: Transaction) => {
    if (!onDelete) return
    if (!confirm("Bạn có chắc chắn muốn xóa giao dịch này?")) return
    setDeletingId(tx.id)
    try {
      await onDelete(tx)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6 md:space-y-10">
      {showFilters && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <h2 className="text-xl md:text-3xl font-black tracking-tight">Lịch sử giao dịch</h2>
          <div className="flex items-center gap-3">
            <div className="relative group flex-1 sm:flex-initial">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 transition-all" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                ref={searchInputRef}
                className="bg-[var(--bg-input)] border border-[var(--border-color)] pl-11 pr-4 py-3 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all w-full sm:w-56 text-[var(--text-main)]"
              />
            </div>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-[var(--bg-input)] border border-[var(--border-color)] px-4 py-3 rounded-2xl text-xs font-black outline-none focus:border-blue-500 transition-all h-[44px] text-[var(--text-main)]"
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {displayedTransactions.map((tx: Transaction, i: number) => {
            const isIncome = tx.type === "income"
            const categoryName = resolveCategoryName(tx.category, allCategories)
            return (
              <motion.div
                key={tx.id || i}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: false, margin: "-50px" }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: (i % 10) * 0.05,
                }}
                className={`p-4 md:p-5 rounded-[2rem] md:rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between group hover:scale-[1.01] transition-all shadow-lg ${deletingId === tx.id ? "opacity-50 pointer-events-none" : ""}`}
              >
                <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto">
                  <div className={`w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-inner ${isIncome ? "bg-emerald-500/10" : "bg-black/5 dark:bg-white/5"}`}>
                    {renderCategoryIcon(categoryName, "w-6 h-6 md:w-7 md:h-7")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-base md:text-lg tracking-tight leading-none truncate">
                        {tx.purpose}
                      </p>
                      {isIncome ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 md:mt-2.5">
                      <span className={`text-[9px] md:text-[10px] px-2 md:px-3 py-1 rounded-lg font-black uppercase tracking-widest ${isIncome ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                        {categoryName}
                      </span>
                      <span className="text-[9px] md:text-[10px] font-bold opacity-30 tracking-widest uppercase">
                        {tx.date}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-8 shrink-0 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-[var(--border-color)]">
                  <div className="flex flex-col items-start sm:items-end">
                    <p className={`text-xl md:text-2xl font-black ${isIncome ? "text-emerald-500" : "text-rose-500"}`}>
                      {isIncome ? "+" : "-"}
                      {(tx.amount || 0).toLocaleString()}đ
                    </p>
                    {tx.note && (
                      <p className="text-[9px] md:text-[10px] font-bold opacity-20 italic mt-0.5 max-w-[120px] md:max-w-[150px] truncate">
                        {tx.note}
                      </p>
                    )}
                    {(tx.createdBy || tx.updatedBy) && (
                      <p className="text-[9px] md:text-[10px] font-bold text-[var(--text-muted)] mt-0.5 max-w-[160px] md:max-w-[220px] truncate">
                        {tx.createdBy ? `Tạo bởi: ${tx.createdBy}` : ""}
                        {tx.createdBy && tx.updatedBy ? " • " : ""}
                        {tx.updatedBy ? `Sửa bởi: ${tx.updatedBy}` : ""}
                      </p>
                    )}
                    {tx.attachment && (
                      <span className="mt-1 text-[9px] font-black uppercase tracking-widest text-blue-600">
                        Có đính kèm
                      </span>
                    )}
                    {tx.isSample && (
                      <span className="mt-1 inline-flex w-fit rounded-full bg-amber-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-600">
                        Dữ liệu mẫu
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300">
                    {onDuplicate && (
                      <button
                        onClick={() => onDuplicate(tx)}
                        className="p-2.5 md:p-3 rounded-xl hover:bg-emerald-500/10 transition-all text-emerald-500"
                        title="Nhân bản"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(tx)}
                      className="p-2.5 md:p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-blue-500"
                      title="Sửa"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tx)}
                      className="p-2.5 md:p-3 rounded-xl hover:bg-rose-500/10 transition-all text-rose-500"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
          {filteredTransactions.length === 0 && (
            <div className="py-24 text-center">
              <p className="text-lg font-bold text-[var(--text-muted)]">Không tìm thấy giao dịch nào</p>
              <p className="text-sm text-zinc-500 mt-1">Hãy thử tìm kiếm với từ khóa khác</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
