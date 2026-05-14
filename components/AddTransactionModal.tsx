"use client"
import { Transaction, Category } from "@/lib/types"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useRef } from "react"
import { 
  X, Calendar, Tag, CreditCard, AlignLeft, Check,
  Utensils, Coffee, Zap, ShoppingBag, Gamepad2, 
  WashingMachine, Plane, HeartPulse, GraduationCap, 
  Banknote, MoreHorizontal, ChevronDown, Plus, Image as ImageIcon, Upload, Settings,
  Home, Car, Smartphone, Gift, Briefcase, Camera, Music, Pizza, Beer, Scissors, Train,
  Pencil
} from "lucide-react"

import { LucideIcon } from "lucide-react"

export const ICON_MAP: Record<string, LucideIcon> = {
  Utensils, Coffee, Zap, ShoppingBag, Gamepad2, 
  WashingMachine, Plane, HeartPulse, GraduationCap, 
  Banknote, MoreHorizontal, Home, Car, Smartphone, 
  Gift, Briefcase, Camera, Music, Pizza, Beer, Scissors, Train
}

const PREDEFINED_ICONS = [
  "Utensils", "Coffee", "Zap", "ShoppingBag", "Gamepad2", 
  "WashingMachine", "Plane", "HeartPulse", "GraduationCap", 
  "Banknote", "Home", "Car", "Smartphone", "Gift", 
  "Briefcase", "Camera", "Music", "Pizza", "Beer", "Scissors", "Train"
]

export const DEFAULT_CATEGORIES = [
  { name: "Ăn uống", icon: "Utensils", color: "text-orange-500" },
  { name: "Cafe", icon: "Coffee", color: "text-amber-600" },
  { name: "Điện nước", icon: "Zap", color: "text-yellow-500" },
  { name: "Mua sắm", icon: "ShoppingBag", color: "text-pink-500" },
  { name: "Giải trí", icon: "Gamepad2", color: "text-indigo-500" },
  { name: "Giặt là", icon: "WashingMachine", color: "text-blue-400" },
  { name: "Di chuyển", icon: "Plane", color: "text-sky-500" },
  { name: "Sức khỏe", icon: "HeartPulse", color: "text-rose-500" },
  { name: "Giáo dục", icon: "GraduationCap", color: "text-emerald-500" },
  { name: "Lương", icon: "Banknote", color: "text-green-500" },
]

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: Transaction | null
  isEditing: boolean
  monthYear: string
  spreadsheetId: string
}

export function AddTransactionModal({ isOpen, onClose, initialData, isEditing, monthYear, spreadsheetId }: AddTransactionModalProps) {
  const [loading, setLoading] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editingCatName, setEditingCatName] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("expensify_all_categories")
      if (saved) return JSON.parse(saved)
      const oldCustom = localStorage.getItem("expensify_custom_categories")
      if (oldCustom) return [...DEFAULT_CATEGORIES, ...JSON.parse(oldCustom)]
    }
    return DEFAULT_CATEGORIES
  })
  const [newCat, setNewCat] = useState<Category>({ name: "", image: "", icon: "Tag" })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    category: "Ăn uống",
    purpose: "",
    note: "",
    type: "expense" as "income" | "expense"
  })


  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (initialData) {
          setFormData({ amount: initialData.amount.toString(), date: initialData.date, category: initialData.category, purpose: initialData.purpose, note: initialData.note || "", type: initialData.type })
        } else {
          setFormData({ amount: "", date: new Date().toISOString().split("T")[0], category: "Ăn uống", purpose: "", note: "", type: "expense" })
        }
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [initialData, isOpen])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const MAX_SIZE = 128
          let width = img.width
          let height = img.height
          
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width
              width = MAX_SIZE
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height
              height = MAX_SIZE
            }
          }
          
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")
          ctx?.drawImage(img, 0, 0, width, height)
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7) // Compress to JPEG with 70% quality
          setNewCat({ ...newCat, image: dataUrl, icon: "" })
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddCategory = () => {
    if (!newCat.name) return
    
    let updated: Category[]
    if (editingCatName) {
      updated = categories.map(c => c.name === editingCatName ? { ...c, ...newCat } : c)
      if (formData.category === editingCatName) setFormData({ ...formData, category: newCat.name })
    } else {
      updated = [...categories, newCat]
      setFormData({ ...formData, category: newCat.name })
    }

    setCategories(updated)
    localStorage.setItem("expensify_all_categories", JSON.stringify(updated))
    window.dispatchEvent(new Event("categories-updated"))
    setShowAddCategory(false)
    setEditingCatName(null)
    setNewCat({ name: "", image: "", icon: "Tag" })
  }

  const handleDeleteCategory = (e: React.MouseEvent, catName: string) => {
    e.stopPropagation()
    if (!confirm(`Xóa danh mục "${catName}"?`)) return
    const updated = categories.filter(c => c.name !== catName)
    setCategories(updated)
    localStorage.setItem("expensify_all_categories", JSON.stringify(updated))
    window.dispatchEvent(new Event("categories-updated"))
    if (formData.category === catName) setFormData({ ...formData, category: categories.find(c => c.name !== catName)?.name || "" })
  }

  const handleEditCategory = (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation()
    setNewCat({ name: cat.name, image: cat.image || "", icon: cat.icon || "Tag" })
    setEditingCatName(cat.name)
    setShowAddCategory(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEditing && !initialData) return
      const [year, month] = monthYear.split("-")
      const formattedMonthYear = `${month}-${year}`
      const body = isEditing 
        ? { monthYear: formattedMonthYear, rowIndex: initialData?.rowIndex, spreadsheetId, transaction: { ...formData, amount: parseFloat(formData.amount), id: initialData?.id } } 
        : { ...formData, spreadsheetId }
      const res = await fetch("/api/transactions", { method: isEditing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (res.ok) { window.dispatchEvent(new Event("transaction-added")); onClose(); }
    } catch (error) { console.error("Error saving:", error) } finally { setLoading(false) }
  }

  const renderIcon = (cat: Category, size = "w-6 h-6") => {
    if (cat?.image) return <img src={cat.image} alt={cat.name} className={`${size} rounded-full object-cover`} />
    const IconComponent = ICON_MAP[cat?.icon || "MoreHorizontal"] || MoreHorizontal
    return <IconComponent className={`${size} ${cat?.color || "text-primary"} stroke-[2.5px]`} />
  }

  const selectedCategory = categories.find(c => c.name === formData.category) || categories[0]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} className="relative w-full max-w-xl z-[101]">
            <div className="p-0 overflow-hidden rounded-[2.5rem] md:rounded-[3rem] bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl backdrop-blur-3xl">
              <div className="p-5 md:p-8 border-b border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{isEditing ? "Sửa" : "Thêm"} giao dịch</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mt-1 italic">Dữ liệu được đồng bộ với Sheets</p>
                </div>
                <button onClick={onClose} className="p-3 rounded-full bg-black/5 dark:bg-white/5 hover:bg-rose-500/10 hover:text-rose-500 transition-all"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-6 md:space-y-10">
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
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">Số tiền</label>
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
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">Ngày tháng</label>
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
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-30">Danh mục</label>
                    <button type="button" onClick={() => setShowCategoryMenu(!showCategoryMenu)} className="text-[9px] md:text-[10px] font-black text-primary flex items-center gap-2 hover:opacity-70"><Settings className="w-3 h-3" /> TÙY CHỈNH</button>
                  </div>
                  <button type="button" onClick={() => setShowCategoryMenu(!showCategoryMenu)} className="w-full flex items-center justify-between pl-6 pr-6 py-4 md:py-5 rounded-2xl md:rounded-3xl bg-[var(--bg-input)] border border-[var(--border-color)] outline-none group">
                    <div className="flex items-center gap-4">{renderIcon(selectedCategory, "w-5 h-5 md:w-6 md:h-6")}<span className="font-black text-base md:text-lg tracking-tight">{formData.category}</span></div>
                    <ChevronDown className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-500 ${showCategoryMenu ? "rotate-180 text-primary" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {showCategoryMenu && (
                      <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCategoryMenu(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-lg p-8 rounded-[3rem] bg-[var(--bg-card)] border border-[var(--border-color)] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] backdrop-blur-3xl overflow-hidden">
                          <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--border-color)]">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                              <span className="text-xs font-black uppercase tracking-widest opacity-50">Lựa chọn danh mục</span>
                            </div>
                            <button type="button" onClick={() => setShowCategoryMenu(false)} className="p-3 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg"><X className="w-5 h-5 stroke-[3px]" /></button>
                          </div>
                          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                            <div className="p-4 bg-black/5 dark:bg-white/5 rounded-[2rem] border border-[var(--border-color)]">
                              {!showAddCategory ? (
                                <button type="button" onClick={() => setShowAddCategory(true)} className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-primary/10 text-primary text-[11px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"><Plus className="w-5 h-5 stroke-[3px]" />Thêm danh mục</button>
                              ) : (
                                <div className="space-y-4 p-3">
                                  <input type="text" placeholder="Tên danh mục..." className="w-full bg-transparent border-b-2 border-[var(--border-color)] py-2 text-sm font-black outline-none focus:border-blue-600 transition-all text-[var(--text-main)]" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
                                  <div className="space-y-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Chọn biểu tượng hoặc tải ảnh</p>
                                    <div className="grid grid-cols-6 gap-2">
                                      {PREDEFINED_ICONS.map((iconName) => {
                                        const IconComp = ICON_MAP[iconName]
                                        return (
                                          <button 
                                            key={iconName}
                                            type="button" 
                                            onClick={() => setNewCat({ ...newCat, icon: iconName, image: "" })} 
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
                                        {newCat.image ? <img src={newCat.image} className="w-4 h-4 rounded-full object-cover" /> : <Upload className="w-4 h-4" />}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => { setShowAddCategory(false); setEditingCatName(null); setNewCat({ name: "", image: "", icon: "Tag" }); }} className="px-5 py-2 text-[10px] font-black opacity-30 uppercase tracking-widest hover:opacity-100 transition-all">Hủy</button>
                                    <button type="button" onClick={handleAddCategory} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all">{editingCatName ? "Cập nhật" : "Thêm danh mục"}</button>
                                  </div>
                                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {categories.map((cat) => {
                                return (
                                  <div key={cat.name} className="relative group/cat">
                                    <button type="button" onClick={() => { setFormData({ ...formData, category: cat.name }); setShowCategoryMenu(false); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${formData.category === cat.name ? "bg-blue-600 text-white font-bold shadow-xl shadow-blue-500/20 scale-[1.02]" : "hover:bg-black/5 dark:hover:bg-white/5"}`}>
                                      {renderIcon(cat, "w-5 h-5")}
                                      <span className="text-xs font-black truncate">{cat.name}</span>
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
                                )
                              })}
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                  <div className="space-y-2 md:space-y-3">
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">Mục đích</label>
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
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">Ghi chú</label>
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
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-5 md:py-6 rounded-2xl md:rounded-[2rem] bg-gradient-to-r from-primary to-blue-600 text-white font-black text-lg md:text-xl shadow-[0_20px_50px_-10px_rgba(59,130,246,0.5)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                  {loading ? <div className="w-6 h-6 md:w-7 md:h-7 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-6 h-6 md:w-8 md:h-8 stroke-[4px]" />}
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
