"use client"

import { motion, useSpring, useTransform, animate } from "framer-motion"
import { LucideIcon, Eye, EyeOff } from "lucide-react"
import { useState, useEffect, useRef } from "react"

function Counter({ value }: { value: number }) {
  const count = useSpring(0, { stiffness: 100, damping: 30 })
  const displayCount = useTransform(count, (latest) => 
    Math.floor(latest).toLocaleString("vi-VN")
  )

  useEffect(() => {
    count.set(value)
  }, [value, count])

  return <motion.span>{displayCount}</motion.span>
}

interface StatsCardProps {
  title: string
  amount: number
  icon: LucideIcon
  color: "emerald" | "rose" | "primary"
}

export function StatsCard({ title, amount, icon: Icon, color }: StatsCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const colorMap = {
    emerald: "bg-emerald-500/10 text-emerald-500",
    rose: "bg-rose-500/10 text-rose-500",
    primary: "bg-blue-500/10 text-blue-500",
  }

  const textColorMap = {
    emerald: "text-emerald-500",
    rose: "text-rose-500",
    primary: "text-[var(--text-main)]",
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -10,
        scale: 1.02,
        rotateX: 2,
        rotateY: -2,
        transition: { type: "spring", stiffness: 400, damping: 10 }
      }}
      style={{ perspective: 1000 }}
      className={`bg-[var(--bg-card)] border border-[var(--border-color)] p-5 md:p-7 rounded-[2rem] md:rounded-[2.5rem] flex items-center gap-4 md:gap-6 shadow-xl shadow-black/5 dark:shadow-none transition-all group hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10 ${isVisible ? 'animate-glow' : ''}`}
    >
      <div className={`w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-[10deg] ${colorMap[color]}`}>
        <Icon className="w-6 h-6 md:w-8 md:h-8" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">{title}</p>
        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-1 flex-1 min-w-0">
            <h3 className={`text-xl md:text-3xl font-black tracking-tighter ${textColorMap[color]} truncate`}>
              {isVisible ? <Counter value={amount} /> : "••••••"}
            </h3>
            <span className="text-xs md:text-sm font-bold text-[var(--text-muted)]">đ</span>
          </div>
          <button 
            onClick={() => setIsVisible(!isVisible)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--bg-input)] transition-all text-[var(--text-muted)] hover:text-primary shrink-0"
            title={isVisible ? "Ẩn số dư" : "Hiện số dư"}
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
