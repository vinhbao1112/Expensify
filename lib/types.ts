export interface Category {
  name: string
  icon: string
  color?: string
  image?: string
  parent?: string
  hidden?: boolean
  order?: number
  aliases?: string[]
}

export interface Transaction {
  id: string
  date: string
  type: "income" | "expense"
  category: string
  amount: number
  purpose: string
  note: string
  attachment?: string
  createdBy?: string
  updatedBy?: string
  isSample?: boolean
  createdAt?: string
  rowIndex?: number
}
