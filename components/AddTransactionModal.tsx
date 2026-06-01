"use client"

import { Transaction } from "@/lib/types"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import {
  X,
  Calendar,
  CreditCard,
  AlignLeft,
  Check,
  Utensils,
  Coffee,
  Zap,
  ShoppingBag,
  Gamepad2,
  WashingMachine,
  Plane,
  HeartPulse,
  GraduationCap,
  Banknote,
  MoreHorizontal,
  ChevronDown,
  Plus,
  Upload,
  Settings,
  Home,
  Car,
  Smartphone,
  Gift,
  Briefcase,
  Camera,
  Music,
  Pizza,
  Beer,
  Scissors,
  Train,
  Pencil,
  EyeOff,
  Eye,
  GitMerge,
  GripVertical,
  Sparkles,
  Repeat,
} from "lucide-react"
import { LucideIcon } from "lucide-react"
import {
  CategoryMeta,
  getAllCategoriesIncludingHidden,
  getCategoryByName,
  mergeCategoryMetadata,
  normalizeCategoryList,
  normalizeCategoryMeta,
  resolveCategoryName,
  sortCategories,
  suggestCategoryFromText,
  suggestHistoryPhrases,
} from "@/lib/category-tools"
import {
  RecurringTemplate,
  loadRecurringTemplates,
  saveRecurringTemplates,
} from "@/lib/recurring"
import { AutomationRule, loadAutomationRules } from "@/lib/automation"

export const ICON_MAP: Record<string, LucideIcon> = {
  Utensils,
  Coffee,
  Zap,
  ShoppingBag,
  Gamepad2,
  WashingMachine,
  Plane,
  HeartPulse,
  GraduationCap,
  Banknote,
  MoreHorizontal,
  Home,
  Car,
  Smartphone,
  Gift,
  Briefcase,
  Camera,
  Music,
  Pizza,
  Beer,
  Scissors,
  Train,
}

const PREDEFINED_ICONS = [
  "Utensils",
  "Coffee",
  "Zap",
  "ShoppingBag",
  "Gamepad2",
  "WashingMachine",
  "Plane",
  "HeartPulse",
  "GraduationCap",
  "Banknote",
  "Home",
  "Car",
  "Smartphone",
  "Gift",
  "Briefcase",
  "Camera",
  "Music",
  "Pizza",
  "Beer",
  "Scissors",
  "Train",
]

export const DEFAULT_CATEGORIES: CategoryMeta[] = [
  { name: "Ăn uống", icon: "Utensils", color: "text-orange-500", order: 0 },
  { name: "Cafe", icon: "Coffee", color: "text-amber-600", order: 1 },
  { name: "Điện nước", icon: "Zap", color: "text-yellow-500", order: 2 },
  { name: "Mua sắm", icon: "ShoppingBag", color: "text-pink-500", order: 3 },
  { name: "Giải trí", icon: "Gamepad2", color: "text-indigo-500", order: 4 },
  { name: "Giặt là", icon: "WashingMachine", color: "text-blue-400", order: 5 },
  { name: "Di chuyển", icon: "Plane", color: "text-sky-500", order: 6 },
  { name: "Sức khỏe", icon: "HeartPulse", color: "text-rose-500", order: 7 },
  { name: "Giáo dục", icon: "GraduationCap", color: "text-emerald-500", order: 8 },
  { name: "Lương", icon: "Banknote", color: "text-green-500", order: 9 },
]

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: Transaction | null
  isEditing: boolean
  monthYear: string
  spreadsheetId: string
  transactions: Transaction[]
  onSaved?: (result: { mode: "create" | "edit"; transaction: Transaction; previous?: Transaction }) => void
}

type DraftCategory = CategoryMeta

export function AddTransactionModal({
  isOpen,
  onClose,
  initialData,
  isEditing,
  monthYear,
  spreadsheetId,
  transactions,
  onSaved,
}: AddTransactionModalProps) {
  const [loading, setLoading] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showHiddenCategories, setShowHiddenCategories] = useState(false)
  const [showRecurringPanel, setShowRecurringPanel] = useState(false)
  const [editingCatName, setEditingCatName] = useState<string | null>(null)
  const [manualCategoryChosen, setManualCategoryChosen] = useState(false)
  const [saveAsRecurring, setSaveAsRecurring] = useState(false)
  const [recurringIntervalDays, setRecurringIntervalDays] = useState(30)
  const [categorySuggestion, setCategorySuggestion] = useState("")
  const [purposeSuggestions, setPurposeSuggestions] = useState<string[]>([])
  const [noteSuggestions, setNoteSuggestions] = useState<string[]>([])
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTemplate[]>([])
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([])
  const [mergeSource, setMergeSource] = useState("")
  const [mergeTarget, setMergeTarget] = useState("")

  const [categories, setCategories] = useState<DraftCategory[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("expensify_all_categories")
      if (saved) return normalizeCategoryList(JSON.parse(saved))
      const oldCustom = localStorage.getItem("expensify_custom_categories")
      if (oldCustom) return normalizeCategoryList([...DEFAULT_CATEGORIES, ...JSON.parse(oldCustom)])
    }
    return normalizeCategoryList(DEFAULT_CATEGORIES)
  })

  const [newCat, setNewCat] = useState<DraftCategory>({
    name: "",
    image: "",
    icon: "Tag",
    color: "text-[var(--text-main)]",
    parent: "",
    hidden: false,
    order: 0,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    category: "Ăn uống",
    purpose: "",
    note: "",
    attachment: "",
    type: "expense" as "income" | "expense",
  })

  const visibleCategories = useMemo(() => sortCategories(categories), [categories])
  const hiddenCategories = useMemo(
    () => getAllCategoriesIncludingHidden(categories).filter((category) => category.hidden),
    [categories],
  )

  const persistCategories = (next: DraftCategory[]) => {
    const normalized = normalizeCategoryList(next)
    setCategories(normalized)
    localStorage.setItem("expensify_all_categories", JSON.stringify(normalized))
    window.dispatchEvent(new Event("categories-updated"))
  }

  const resetForm = () => {
    if (initialData) {
      setFormData({
        amount: initialData.amount.toString(),
        date: initialData.date,
        category: resolveCategoryName(initialData.category, categories),
        purpose: initialData.purpose,
        note: initialData.note || "",
        attachment: initialData.attachment || "",
        type: initialData.type,
      })
    } else {
      setFormData({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        category: "Ăn uống",
        purpose: "",
        note: "",
        attachment: "",
        type: "expense",
      })
    }
    setManualCategoryChosen(false)
    setSaveAsRecurring(false)
    setRecurringIntervalDays(30)
    setCategorySuggestion("")
    setPurposeSuggestions([])
    setNoteSuggestions([])
  }

  useEffect(() => {
    if (!isOpen) return

    const timer = setTimeout(() => {
      resetForm()
      setRecurringTemplates(loadRecurringTemplates(spreadsheetId))
      setAutomationRules(loadAutomationRules(spreadsheetId))
      setMergeSource("")
      setMergeTarget("")
    }, 0)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, isOpen, spreadsheetId])

  useEffect(() => {
    if (!isOpen) return

    const sourceText = `${formData.purpose} ${formData.note}`
    const suggestion = suggestCategoryFromText(sourceText, categories, formData.type, automationRules)
    setCategorySuggestion(suggestion)

    if (!isEditing && !manualCategoryChosen && suggestion && suggestion !== formData.category) {
      setFormData((current) => ({ ...current, category: suggestion }))
    }

    const history = suggestHistoryPhrases(transactions, formData.category, formData.type, 4)
    setPurposeSuggestions(history.purposes)
    setNoteSuggestions(history.notes)
  }, [
    categories,
    formData.category,
    formData.note,
    formData.purpose,
    formData.type,
    isOpen,
    manualCategoryChosen,
    automationRules,
    transactions,
  ])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        const form = document.querySelector("form")
        form?.requestSubmit()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  const handleCompressedImage = (
    file: File,
    onDone: (dataUrl: string) => void,
  ) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const MAX_SIZE = 1280
        let width = img.width
        let height = img.height

        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width
          width = MAX_SIZE
        } else if (height >= width && height > MAX_SIZE) {
          width *= MAX_SIZE / height
          height = MAX_SIZE
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img, 0, 0, width, height)
        onDone(canvas.toDataURL("image/jpeg", 0.82))
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleCategoryImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    handleCompressedImage(file, (dataUrl) => {
      setNewCat((current) => ({ ...current, image: dataUrl, icon: "" }))
    })
  }

  const handleAttachmentUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    handleCompressedImage(file, (dataUrl) => {
      setFormData((current) => ({ ...current, attachment: dataUrl }))
    })
  }

  const handleAddCategory = () => {
    if (!newCat.name) return

    const normalized = normalizeCategoryMeta(newCat, categories.length)
    let updated: DraftCategory[]
    if (editingCatName) {
      updated = categories.map((category) =>
        category.name === editingCatName ? { ...category, ...normalized } : category,
      )
      if (formData.category === editingCatName) {
        setFormData((current) => ({ ...current, category: normalized.name }))
      }
    } else {
      updated = [...categories, normalized]
      setFormData((current) => ({ ...current, category: normalized.name }))
    }

    persistCategories(updated)
    setShowAddCategory(false)
    setEditingCatName(null)
    setNewCat({
      name: "",
      image: "",
      icon: "Tag",
      color: "text-[var(--text-main)]",
      parent: "",
      hidden: false,
      order: categories.length,
    })
  }

  const handleDeleteCategory = (e: React.MouseEvent, catName: string) => {
    e.stopPropagation()
    if (!confirm(`Xóa danh mục "${catName}"?`)) return
    const updated = categories.filter((category) => category.name !== catName)
    persistCategories(updated)
    if (formData.category === catName) {
      setFormData((current) => ({
        ...current,
        category: updated[0]?.name || "Ăn uống",
      }))
    }
  }

  const toggleHiddenCategory = (catName: string) => {
    const updated = categories.map((category) =>
      category.name === catName
        ? { ...category, hidden: !category.hidden }
        : category,
    )
    persistCategories(updated)
  }

  const moveCategory = (catName: string, direction: "up" | "down") => {
    const ordered = [...categories].sort(
      (left, right) => (left.order || 0) - (right.order || 0),
    )
    const index = ordered.findIndex((category) => category.name === catName)
    if (index < 0) return

    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= ordered.length) return

    const current = ordered[index]
    const next = ordered[swapIndex]
    ordered[index] = { ...current, order: next.order || swapIndex }
    ordered[swapIndex] = { ...next, order: current.order || index }
    persistCategories(ordered)
  }

  const handleEditCategory = (e: React.MouseEvent, cat: DraftCategory) => {
    e.stopPropagation()
    setNewCat({
      name: cat.name,
      image: cat.image || "",
      icon: cat.icon || "Tag",
      color: cat.color || "text-[var(--text-main)]",
      parent: cat.parent || "",
      hidden: Boolean(cat.hidden),
      order: typeof cat.order === "number" ? cat.order : categories.length,
    })
    setEditingCatName(cat.name)
    setShowAddCategory(true)
  }

  const handleMergeCategories = () => {
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) return
    const updated = mergeCategoryMetadata(categories, mergeSource, mergeTarget)
    persistCategories(updated)
    if (formData.category === mergeSource) {
      setFormData((current) => ({ ...current, category: mergeTarget }))
    }
    setMergeSource("")
    setMergeTarget("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEditing && !initialData) return
      const [year, month] = monthYear.split("-")
      const formattedMonthYear = `${month}-${year}`
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        spreadsheetId,
        isSample: initialData?.isSample || false,
      }

      const body = isEditing
        ? {
            monthYear: formattedMonthYear,
            rowIndex: initialData?.rowIndex,
            spreadsheetId,
            transaction: { ...payload, id: initialData?.id },
          }
        : payload

      const res = await fetch("/api/transactions", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json().catch(() => null)
        const savedTransaction: Transaction =
          data?.transaction || {
            ...payload,
            id: initialData?.id || Date.now().toString(),
            createdAt: initialData?.createdAt || new Date().toISOString(),
            rowIndex: initialData?.rowIndex,
          }

        if (!isEditing && saveAsRecurring && recurringIntervalDays > 0) {
          const templates = loadRecurringTemplates(spreadsheetId)
          const nextRunDate = formData.date || new Date().toISOString().slice(0, 10)
          const template: RecurringTemplate = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: `${formData.purpose} - ${formData.category}`,
            intervalDays: recurringIntervalDays,
            nextRunDate,
            enabled: true,
            transaction: {
              date: formData.date,
              type: formData.type,
              category: formData.category,
              amount: parseFloat(formData.amount) || 0,
              purpose: formData.purpose,
              note: formData.note,
              attachment: formData.attachment || "",
            },
          }
          saveRecurringTemplates(spreadsheetId, [template, ...templates])
        }
        onSaved?.({
          mode: isEditing ? "edit" : "create",
          transaction: savedTransaction,
          previous: initialData || undefined,
        })
        window.dispatchEvent(new Event("transaction-added"))
        onClose()
      }
    } catch (error) {
      console.error("Error saving:", error)
    } finally {
      setLoading(false)
    }
  }

  const renderIcon = (cat: DraftCategory, size = "w-6 h-6") => {
    if (cat?.image) {
      return (
        <img
          src={cat.image}
          alt={cat.name}
          className={`${size} rounded-full object-cover`}
        />
      )
    }
    const IconComponent = ICON_MAP[cat?.icon || "MoreHorizontal"] || MoreHorizontal
    return <IconComponent className={`${size} ${cat?.color || "text-primary"} stroke-[2.5px]`} />
  }

  const selectedCategory = getCategoryByName(formData.category, categories) || categories[0]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            className="relative w-full max-w-3xl z-[101]"
          >
            <div className="p-0 overflow-hidden rounded-[2.5rem] md:rounded-[3rem] bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl backdrop-blur-3xl">
              <div className="p-5 md:p-8 border-b border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">
                    {isEditing ? "Sửa" : "Thêm"} giao dịch
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mt-1 italic">
                    Dữ liệu được đồng bộ với Sheets
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-3 rounded-full bg-black/5 dark:bg-white/5 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-6 md:space-y-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="flex p-1 rounded-2xl md:rounded-3xl bg-black/5 dark:bg-white/5 border border-[var(--border-color)]">
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: "expense" })}
                        className={`flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-black transition-all uppercase tracking-widest ${formData.type === "expense" ? "bg-rose-500 text-white shadow-xl shadow-rose-500/30" : "opacity-40"}`}
                      >
                        Chi tiêu
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: "income" })}
                        className={`flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-black transition-all uppercase tracking-widest ${formData.type === "income" ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/30" : "opacity-40"}`}
                      >
                        Thu nhập
                      </motion.button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                      <div className="space-y-2 md:space-y-3">
                        <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">
                          Số tiền
                        </label>
                        <div className="relative group">
                          <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-primary group-focus-within:scale-110 transition-transform" />
                          <input
                            type="number"
                            placeholder="0"
                            required
                            className="w-full pl-14 pr-6 py-4 md:py-5 rounded-2xl md:rounded-3xl bg-[var(--bg-input)] border border-[var(--border-color)] outline-none font-black text-xl md:text-2xl focus:ring-4 focus:ring-primary/10 transition-all"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2 md:space-y-3">
                        <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">
                          Ngày tháng
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-primary" />
                          <input
                            type="date"
                            required
                            className="w-full pl-14 pr-6 py-4 md:py-5 rounded-2xl md:rounded-3xl bg-[var(--bg-input)] border border-[var(--border-color)] outline-none text-xs md:text-sm font-black uppercase focus:ring-4 focus:ring-primary/10 transition-all"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 md:space-y-3 relative">
                      <div className="flex items-center justify-between px-2">
                        <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-30">
                          Danh mục
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                          className="text-[9px] md:text-[10px] font-black text-primary flex items-center gap-2 hover:opacity-70"
                        >
                          <Settings className="w-3 h-3" /> Tùy chỉnh
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                        className="w-full flex items-center justify-between pl-6 pr-6 py-4 md:py-5 rounded-2xl md:rounded-3xl bg-[var(--bg-input)] border border-[var(--border-color)] outline-none group"
                      >
                        <div className="flex items-center gap-4">
                          {renderIcon(selectedCategory, "w-5 h-5 md:w-6 md:h-6")}
                          <span className="font-black text-base md:text-lg tracking-tight">
                            {formData.category}
                          </span>
                          {categorySuggestion && categorySuggestion === formData.category ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-600">
                              <Sparkles className="h-3 w-3" />
                              Gợi ý
                            </span>
                          ) : null}
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-500 ${showCategoryMenu ? "rotate-180 text-primary" : ""}`}
                        />
                      </button>

                      {categorySuggestion && categorySuggestion !== formData.category ? (
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm">
                          <div className="flex items-center gap-2 font-bold text-[var(--text-main)]">
                            <Sparkles className="h-4 w-4 text-blue-600" />
                            Gợi ý danh mục: <span className="text-blue-600">{categorySuggestion}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((current) => ({ ...current, category: categorySuggestion }))
                              setManualCategoryChosen(true)
                            }}
                            className="rounded-xl bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white"
                          >
                            Dùng gợi ý
                          </button>
                        </div>
                      ) : null}

                      <AnimatePresence>
                        {showCategoryMenu && (
                          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              onClick={() => setShowCategoryMenu(false)}
                              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 20 }}
                              className="relative w-full max-w-3xl p-6 md:p-8 rounded-[3rem] bg-[var(--bg-card)] border border-[var(--border-color)] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] backdrop-blur-3xl overflow-hidden"
                            >
                              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-color)]">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                  <span className="text-xs font-black uppercase tracking-widest opacity-50">
                                    Lựa chọn danh mục
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowCategoryMenu(false)}
                                  className="p-3 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg"
                                >
                                  <X className="w-5 h-5 stroke-[3px]" />
                                </button>
                              </div>

                              <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
                                <div className="max-h-[520px] overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                                  <div className="flex items-center justify-between">
                                    <button
                                      type="button"
                                      onClick={() => setShowAddCategory(true)}
                                      className="inline-flex items-center gap-2 rounded-2xl bg-primary/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/20 transition-all"
                                    >
                                      <Plus className="w-4 h-4 stroke-[3px]" />
                                      Thêm danh mục
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setShowHiddenCategories((current) => !current)}
                                      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-color)] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]"
                                    >
                                      {showHiddenCategories ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                      {showHiddenCategories ? "Ẩn mục ẩn" : "Hiện mục ẩn"}
                                    </button>
                                  </div>

                                  {showAddCategory && (
                                    <div className="space-y-4 p-4 rounded-[2rem] bg-black/5 dark:bg-white/5 border border-[var(--border-color)]">
                                      <input
                                        type="text"
                                        placeholder="Tên danh mục..."
                                        className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-black outline-none focus:border-blue-600 transition-all text-[var(--text-main)]"
                                        value={newCat.name}
                                        onChange={(e) =>
                                          setNewCat({ ...newCat, name: e.target.value })
                                        }
                                      />

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <input
                                          type="text"
                                          placeholder="Danh mục cha"
                                          className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none"
                                          value={newCat.parent || ""}
                                          onChange={(e) =>
                                            setNewCat({ ...newCat, parent: e.target.value })
                                          }
                                        />
                                        <input
                                          type="number"
                                          placeholder="Thứ tự"
                                          className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none"
                                          value={newCat.order ?? 0}
                                          onChange={(e) =>
                                            setNewCat({
                                              ...newCat,
                                              order: Number.parseInt(e.target.value) || 0,
                                            })
                                          }
                                        />
                                      </div>

                                      <div className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] px-4 py-3">
                                        <div>
                                          <p className="text-xs font-black uppercase tracking-widest">
                                            Trạng thái
                                          </p>
                                          <p className="text-[11px] text-[var(--text-muted)] font-bold">
                                            Ẩn danh mục khỏi danh sách chọn
                                          </p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setNewCat({ ...newCat, hidden: !newCat.hidden })
                                          }
                                          className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest ${
                                            newCat.hidden
                                              ? "bg-rose-500 text-white"
                                              : "bg-black/5 dark:bg-white/5 text-[var(--text-muted)]"
                                          }`}
                                        >
                                          {newCat.hidden ? "Đang ẩn" : "Hiện"}
                                        </button>
                                      </div>

                                      <div className="space-y-3">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-30">
                                          Chọn biểu tượng hoặc tải ảnh
                                        </p>
                                        <div className="grid grid-cols-6 gap-2">
                                          {PREDEFINED_ICONS.map((iconName) => {
                                            const IconComp = ICON_MAP[iconName]
                                            return (
                                              <button
                                                key={iconName}
                                                type="button"
                                                onClick={() =>
                                                  setNewCat({ ...newCat, icon: iconName, image: "" })
                                                }
                                                className={`p-2.5 rounded-xl border transition-all ${newCat.icon === iconName && !newCat.image ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-110" : "bg-black/5 dark:bg-white/5 border-transparent text-[var(--text-muted)] hover:border-[var(--border-color)]"}`}
                                              >
                                                <IconComp className="w-4 h-4" />
                                              </button>
                                            )
                                          })}
                                          <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`p-2.5 rounded-xl border transition-all ${newCat.image ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-110" : "bg-black/5 dark:bg-white/5 border-transparent text-[var(--text-muted)] hover:border-[var(--border-color)]"}`}
                                          >
                                            {newCat.image ? (
                                              <img
                                                src={newCat.image}
                                                alt="category"
                                                className="w-4 h-4 rounded-full object-cover"
                                              />
                                            ) : (
                                              <Upload className="w-4 h-4" />
                                            )}
                                          </button>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-end gap-3 pt-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setShowAddCategory(false)
                                            setEditingCatName(null)
                                            setNewCat({
                                              name: "",
                                              image: "",
                                              icon: "Tag",
                                              color: "text-[var(--text-main)]",
                                              parent: "",
                                              hidden: false,
                                              order: categories.length,
                                            })
                                          }}
                                          className="px-5 py-2 text-[10px] font-black opacity-30 uppercase tracking-widest hover:opacity-100 transition-all"
                                        >
                                          Hủy
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleAddCategory}
                                          className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all"
                                        >
                                          {editingCatName ? "Cập nhật" : "Thêm danh mục"}
                                        </button>
                                      </div>

                                      <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleCategoryImageUpload}
                                      />
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {visibleCategories.map((cat) => (
                                      <div
                                        key={cat.name}
                                        className="relative group/cat"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setFormData({ ...formData, category: cat.name })
                                            setManualCategoryChosen(true)
                                            setShowCategoryMenu(false)
                                          }}
                                          className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${formData.category === cat.name ? "bg-blue-600 text-white font-bold shadow-xl shadow-blue-500/20 scale-[1.02]" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
                                        >
                                          {renderIcon(cat, "w-5 h-5")}
                                          <span className="text-xs font-black truncate">
                                            {cat.name}
                                          </span>
                                        </button>
                                        <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 group-hover/cat:opacity-100 transition-all">
                                          <button
                                            type="button"
                                            onClick={(e) => handleEditCategory(e, cat)}
                                            className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg scale-75 hover:scale-100"
                                          >
                                            <Pencil className="w-3 h-3 stroke-[3px]" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => handleDeleteCategory(e, cat.name)}
                                            className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg scale-75 hover:scale-100"
                                          >
                                            <X className="w-3 h-3 stroke-[3px]" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {showHiddenCategories && hiddenCategories.length > 0 ? (
                                    <div className="space-y-3 rounded-[2rem] border border-[var(--border-color)] p-4">
                                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                        <EyeOff className="h-4 w-4" />
                                        Danh mục ẩn
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {hiddenCategories.map((cat) => (
                                          <button
                                            key={cat.name}
                                            type="button"
                                            onClick={() => toggleHiddenCategory(cat.name)}
                                            className="flex items-center justify-between rounded-2xl border border-dashed border-[var(--border-color)] px-4 py-3 text-left"
                                          >
                                            <div className="flex items-center gap-3">
                                              {renderIcon(cat, "w-5 h-5")}
                                              <div>
                                                <p className="text-sm font-black">{cat.name}</p>
                                                <p className="text-[11px] text-[var(--text-muted)] font-bold">
                                                  Nhấn để hiện lại
                                                </p>
                                              </div>
                                            </div>
                                            <Eye className="h-4 w-4 text-emerald-500" />
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>

                                <div className="space-y-4">
                                  <div className="rounded-[2rem] bg-black/5 dark:bg-white/5 border border-[var(--border-color)] p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                      <GitMerge className="h-4 w-4" />
                                      Gộp danh mục
                                    </div>
                                    <select
                                      value={mergeSource}
                                      onChange={(e) => setMergeSource(e.target.value)}
                                      className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none"
                                    >
                                      <option value="">Chọn danh mục nguồn</option>
                                      {visibleCategories.map((cat) => (
                                        <option key={cat.name} value={cat.name}>
                                          {cat.name}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      value={mergeTarget}
                                      onChange={(e) => setMergeTarget(e.target.value)}
                                      className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none"
                                    >
                                      <option value="">Chọn danh mục đích</option>
                                      {visibleCategories.map((cat) => (
                                        <option key={cat.name} value={cat.name}>
                                          {cat.name}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={handleMergeCategories}
                                      disabled={!mergeSource || !mergeTarget || mergeSource === mergeTarget}
                                      className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-40"
                                    >
                                      Gộp và ẩn danh mục nguồn
                                    </button>
                                  </div>

                                  <div className="rounded-[2rem] bg-black/5 dark:bg-white/5 border border-[var(--border-color)] p-4 space-y-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                      <Repeat className="h-4 w-4" />
                                      Mẫu giao dịch lặp lại
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setShowRecurringPanel((current) => !current)}
                                      className="w-full rounded-2xl border border-[var(--border-color)] px-4 py-3 text-left text-sm font-black"
                                    >
                                      {showRecurringPanel ? "Ẩn mẫu lặp lại" : "Hiện mẫu lặp lại"}
                                    </button>
                                    {showRecurringPanel && (
                                      <div className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <label className="space-y-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                              Chu kỳ
                                            </span>
                                            <select
                                              value={recurringIntervalDays}
                                              onChange={(e) =>
                                                setRecurringIntervalDays(Number.parseInt(e.target.value) || 30)
                                              }
                                              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none"
                                            >
                                              <option value={7}>Mỗi 7 ngày</option>
                                              <option value={14}>Mỗi 14 ngày</option>
                                              <option value={30}>Mỗi 30 ngày</option>
                                              <option value={90}>Mỗi 90 ngày</option>
                                            </select>
                                          </label>
                                          <div className="flex items-end">
                                            <label className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-color)] px-4 py-3">
                                              <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest">
                                                  Lưu làm mẫu
                                                </p>
                                                <p className="text-[11px] text-[var(--text-muted)] font-bold">
                                                  Tạo tự động các lần sau
                                                </p>
                                              </div>
                                              <input
                                                type="checkbox"
                                                checked={saveAsRecurring}
                                                onChange={(e) => setSaveAsRecurring(e.target.checked)}
                                                className="h-4 w-4"
                                              />
                                            </label>
                                          </div>
                                        </div>

                                        {recurringTemplates.length > 0 && (
                                          <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                              Mẫu đã lưu
                                            </p>
                                            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                                              {recurringTemplates.map((template) => (
                                                <button
                                                  key={template.id}
                                                  type="button"
                                                  onClick={() => {
                                                    setFormData({
                                                      amount: template.transaction.amount.toString(),
                                                      date: template.transaction.date,
                                                      category: template.transaction.category,
                                                      purpose: template.transaction.purpose,
                                                      note: template.transaction.note || "",
                                                      attachment: template.transaction.attachment || "",
                                                      type: template.transaction.type,
                                                    })
                                                    setManualCategoryChosen(false)
                                                  }}
                                                  className="w-full rounded-2xl border border-[var(--border-color)] px-4 py-3 text-left"
                                                >
                                                  <div className="flex items-center justify-between gap-2">
                                                    <div>
                                                      <p className="text-sm font-black">{template.name}</p>
                                                      <p className="text-[11px] text-[var(--text-muted)] font-bold">
                                                        Mỗi {template.intervalDays} ngày - đến {template.nextRunDate}
                                                      </p>
                                                    </div>
                                                    <Repeat className="h-4 w-4 text-blue-600" />
                                                  </div>
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-2 md:space-y-3">
                      <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">
                        Mục đích
                      </label>
                      <div className="space-y-2">
                        <div className="relative group">
                          <AlignLeft className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-primary" />
                          <input
                            type="text"
                            placeholder="Mục đích..."
                            required
                            className="w-full pl-14 pr-6 py-4 md:py-5 rounded-2xl md:rounded-3xl bg-[var(--bg-input)] border border-[var(--border-color)] outline-none text-xs md:text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all text-[var(--text-main)]"
                            value={formData.purpose}
                            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                          />
                        </div>
                        {purposeSuggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {purposeSuggestions.map((value) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setFormData({ ...formData, purpose: value })}
                                className="rounded-full border border-[var(--border-color)] bg-black/5 dark:bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                              >
                                {value}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 md:space-y-3">
                      <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">
                        Ghi chú
                      </label>
                      <div className="space-y-2">
                        <div className="relative group">
                          <AlignLeft className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-primary" />
                          <input
                            type="text"
                            placeholder="Ghi chú thêm..."
                            className="w-full pl-14 pr-6 py-4 md:py-5 rounded-2xl md:rounded-3xl bg-[var(--bg-input)] border border-[var(--border-color)] outline-none text-xs md:text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all text-[var(--text-main)]"
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                          />
                        </div>
                        {noteSuggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {noteSuggestions.map((value) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setFormData({ ...formData, note: value })}
                                className="rounded-full border border-[var(--border-color)] bg-black/5 dark:bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                              >
                                {value}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-[2rem] border border-[var(--border-color)] bg-black/5 dark:bg-white/5 p-4 space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                        <Upload className="h-4 w-4" />
                        Đính kèm hóa đơn
                      </div>
                      <input
                        ref={attachmentInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAttachmentUpload}
                      />
                      <button
                        type="button"
                        onClick={() => attachmentInputRef.current?.click()}
                        className="w-full rounded-2xl border border-dashed border-[var(--border-color)] px-4 py-4 text-sm font-black"
                      >
                        {formData.attachment ? "Đổi ảnh đính kèm" : "Tải ảnh hóa đơn"}
                      </button>
                      {formData.attachment ? (
                        <img
                          src={formData.attachment}
                          alt="attachment"
                          className="w-full rounded-[1.5rem] border border-[var(--border-color)] object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="rounded-[2rem] border border-[var(--border-color)] bg-black/5 dark:bg-white/5 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                        <Sparkles className="h-4 w-4" />
                        Gợi ý thông minh
                      </div>
                      <div className="space-y-2 text-sm font-bold">
                        <div className="flex items-center justify-between rounded-2xl bg-[var(--bg-input)] px-4 py-3">
                          <span>Danh mục tự động</span>
                          <span className="text-blue-600">{categorySuggestion || "Chưa có"}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-[var(--bg-input)] px-4 py-3">
                          <span>Mẫu lặp lại</span>
                          <span className={saveAsRecurring ? "text-emerald-600" : "text-[var(--text-muted)]"}>
                            {saveAsRecurring ? `Mỗi ${recurringIntervalDays} ngày` : "Tắt"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[2rem] border border-[var(--border-color)] bg-black/5 dark:bg-white/5 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                        <GripVertical className="h-4 w-4" />
                        Mẹo dùng nhanh
                      </div>
                      <ul className="space-y-2 text-[12px] font-medium text-[var(--text-muted)]">
                        <li>• Gõ mục đích hoặc ghi chú để app gợi ý danh mục.</li>
                        <li>• Chọn danh mục cha, thứ tự và trạng thái ẩn trong phần tùy chỉnh.</li>
                        <li>• Mẫu lặp lại sẽ được lưu local theo spreadsheet hiện tại.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 md:py-6 rounded-2xl md:rounded-[2rem] bg-gradient-to-r from-primary to-blue-600 text-white font-black text-lg md:text-xl shadow-[0_20px_50px_-10px_rgba(59,130,246,0.5)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-6 h-6 md:w-7 md:h-7 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-6 h-6 md:w-8 md:h-8 stroke-[4px]" />
                  )}
                  <span>{loading ? "ĐANG LƯU..." : "XÁC NHẬN NGAY"}</span>
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
