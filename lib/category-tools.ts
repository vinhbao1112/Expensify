import type { Category, Transaction } from "./types"
import type { AutomationRule } from "./automation"
import { normalizeText } from "./analytics"

export interface CategoryMeta extends Category {
  parent?: string
  hidden?: boolean
  order?: number
  aliases?: string[]
}

const keywordMap: Array<{ keywords: string[]; category: string }> = [
  { keywords: ["an", "bua", "com", "food", "restaurant", "quan an", "do an"], category: "Ăn uống" },
  { keywords: ["cafe", "coffee", "tra sua"], category: "Cafe" },
  { keywords: ["dien", "nuoc", "internet", "wifi"], category: "Điện nước" },
  { keywords: ["mua sam", "shopping", "shopee", "lazada", "tiki", "mall"], category: "Mua sắm" },
  { keywords: ["giai tri", "game", "movie", "phim", "netflix", "spotify"], category: "Giải trí" },
  { keywords: ["di chuyen", "grab", "taxi", "xang", "xeh", "bus", "train"], category: "Di chuyển" },
  { keywords: ["suc khoe", "benh vien", "thuoc", "kham"], category: "Sức khỏe" },
  { keywords: ["hoc phi", "hoc", "sach", "khoa hoc", "education"], category: "Giáo dục" },
  { keywords: ["luong", "salary", "thu nhap", "bonus", "commission"], category: "Lương" },
  { keywords: ["tiet kiem", "saving", "quy", "dau tu", "invest"], category: "Tiết kiệm" },
]

export function normalizeCategoryMeta(category: CategoryMeta, index = 0): CategoryMeta {
  return {
    ...category,
    color: category.color || "text-[var(--text-main)]",
    icon: category.icon || "MoreHorizontal",
    order: typeof category.order === "number" ? category.order : index,
    hidden: Boolean(category.hidden),
    parent: category.parent || "",
    aliases: category.aliases || [],
  }
}

export function normalizeCategoryList(categories: CategoryMeta[]): CategoryMeta[] {
  return categories.map((category, index) => normalizeCategoryMeta(category, index))
}

export function sortCategories(categories: CategoryMeta[]) {
  return [...normalizeCategoryList(categories)]
    .filter((category) => !category.hidden)
    .sort((left, right) => {
      const orderDelta = (left.order || 0) - (right.order || 0)
      if (orderDelta !== 0) return orderDelta
      return left.name.localeCompare(right.name, "vi")
    })
}

export function getAllCategoriesIncludingHidden(categories: CategoryMeta[]) {
  return [...normalizeCategoryList(categories)].sort((left, right) => {
    const orderDelta = (left.order || 0) - (right.order || 0)
    if (orderDelta !== 0) return orderDelta
    return left.name.localeCompare(right.name, "vi")
  })
}

export function resolveCategoryName(name: string, categories: CategoryMeta[]) {
  const normalizedTarget = normalizeText(name)
  const target = normalizeCategoryList(categories).find((category) => {
    const aliasMatches = (category.aliases || []).some(
      (alias) => normalizeText(alias) === normalizedTarget,
    )
    return normalizeText(category.name) === normalizedTarget || aliasMatches
  })

  return target?.name || name
}

export function getCategoryByName(name: string, categories: CategoryMeta[]) {
  const normalizedTarget = normalizeText(name)
  return normalizeCategoryList(categories).find((category) => {
    const aliasMatches = (category.aliases || []).some(
      (alias) => normalizeText(alias) === normalizedTarget,
    )
    return normalizeText(category.name) === normalizedTarget || aliasMatches
  })
}

export function suggestCategoryFromText(
  text: string,
  categories: CategoryMeta[],
  type: Transaction["type"] = "expense",
  rules: AutomationRule[] = [],
) {
  const normalized = normalizeText(text)
  if (!normalized) return ""

  const ruleMatch = rules.find((rule) => {
    if (rule.type !== "both" && rule.type !== type) return false
    return normalized.includes(normalizeText(rule.pattern))
  })
  if (ruleMatch) return ruleMatch.category

  const nameMatch = normalizeCategoryList(categories).find((category) => {
    const aliasMatches = (category.aliases || []).some(
      (alias) => normalized.includes(normalizeText(alias)),
    )
    return normalized.includes(normalizeText(category.name)) || aliasMatches
  })

  if (nameMatch) return nameMatch.name

  const keywordMatch = keywordMap.find((entry) => {
    if (type === "income" && entry.category !== "Lương" && entry.category !== "Tiết kiệm") {
      return false
    }
    return entry.keywords.some((keyword) => normalized.includes(keyword))
  })

  if (!keywordMatch) return ""

  const category = getCategoryByName(keywordMatch.category, categories)
  return category?.name || keywordMatch.category
}

export function suggestHistoryPhrases(
  transactions: Transaction[],
  category: string,
  type: Transaction["type"],
  limit = 3,
) {
  const normalizedCategory = normalizeText(category)
  const phrases = transactions
    .filter((tx) => tx.type === type && normalizeText(tx.category) === normalizedCategory)
    .map((tx) => ({
      purpose: tx.purpose.trim(),
      note: (tx.note || "").trim(),
    }))
    .filter((entry) => entry.purpose.length > 0 || entry.note.length > 0)

  const purposeCounts = new Map<string, number>()
  const noteCounts = new Map<string, number>()

  phrases.forEach(({ purpose, note }) => {
    if (purpose) purposeCounts.set(purpose, (purposeCounts.get(purpose) || 0) + 1)
    if (note) noteCounts.set(note, (noteCounts.get(note) || 0) + 1)
  })

  return {
    purposes: [...purposeCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, limit)
      .map(([value]) => value),
    notes: [...noteCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, limit)
      .map(([value]) => value),
  }
}

export function mergeCategoryMetadata(
  categories: CategoryMeta[],
  sourceName: string,
  targetName: string,
) {
  const normalizedSource = normalizeText(sourceName)
  const normalizedTarget = normalizeText(targetName)
  const normalizedList = normalizeCategoryList(categories)
  const source = normalizedList.find((category) => normalizeText(category.name) === normalizedSource)
  const target = normalizedList.find((category) => normalizeText(category.name) === normalizedTarget)

  if (!source || !target || source.name === target.name) return normalizedList

  const updated = normalizedList
    .map((category) => {
      if (category.name === source.name) {
        return { ...category, hidden: true }
      }
      if (category.name === target.name) {
        const aliases = Array.from(new Set([...(category.aliases || []), source.name]))
        return { ...category, aliases }
      }
      return category
    })

  return updated
}
