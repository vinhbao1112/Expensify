export interface Category {
  name: string
  icon: string
  color?: string
  image?: string
}

export interface Transaction {
  id: string
  date: string
  type: "income" | "expense"
  category: string
  amount: number
  purpose: string
  note: string
  createdAt?: string
  rowIndex?: number
}
