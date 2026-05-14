"use client"

import { ThemeToggle } from "./ThemeToggle"
import { motion, AnimatePresence } from "framer-motion"
import { Wallet, LogOut, User } from "lucide-react"
import { signIn, signOut, useSession } from "next-auth/react"
import Image from "next/image"

import { InstallPWA } from "./InstallPWA"

export function Header() {
  const { data: session, status } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--bg-card)] border-b border-[var(--border-color)] backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <Wallet className="w-6 h-6 stroke-[2.5px]" />
          </div>
          <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 bg-[length:200%_auto] animate-gradient-text bg-clip-text text-transparent">
            Expensify
          </span>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <InstallPWA />
          <ThemeToggle />
          
          <AnimatePresence mode="wait">
            {status === "loading" ? (
              <div key="loading" className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            ) : session ? (
              <motion.div 
                key="user"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-4"
              >
                <div className="flex flex-col items-end">
                  <span className="hidden sm:block text-xs font-black tracking-tight leading-none uppercase text-zinc-900 dark:text-white">
                    {session.user?.name?.split(' ')[0]}
                  </span>
                  <button 
                    onClick={() => signOut()}
                    className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:opacity-70 mt-1 transition-all"
                  >
                    <LogOut className="w-3 h-3 sm:hidden" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
                {session.user?.image ? (
                  <div className="w-9 h-9 rounded-full border border-blue-500/20 p-0.5 shadow-sm">
                    <Image 
                      src={session.user.image} 
                      alt="Avatar" 
                      width={36} 
                      height={36} 
                      className="rounded-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </motion.div>
            ) : (
              <button
                onClick={() => signIn("google")}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
              >
                Đăng nhập
              </button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
