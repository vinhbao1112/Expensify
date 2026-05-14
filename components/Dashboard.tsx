"use client";
import { Transaction } from "@/lib/types";

import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Download,
  ChevronDown,
  LayoutGrid,
  History,
  Trash2,
  Eraser,
} from "lucide-react";
import { StatsCard } from "./StatsCard";
import { TransactionList } from "./TransactionList";
import { AddTransactionModal } from "./AddTransactionModal";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { WeatherWidget } from "./WeatherWidget";

function TypewriterText({ text }: { text: string }) {
  const characters = Array.from(text);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setKey((prev) => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-flex overflow-hidden" key={key}>
      {characters.map((char, index) => (
        <motion.span
          key={`${key}-${index}`}
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          transition={{
            duration: 0.1,
            delay: index * 0.1,
            ease: "easeOut",
          }}
          className="whitespace-pre"
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}

export function Dashboard() {
  const { data: session, status } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthYear, setMonthYear] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [statsMode, setStatsMode] = useState<"month" | "all">("month");
  const [balanceMode, setBalanceMode] = useState<"month" | "all">("all");
  const [allTimeTotals, setAllTimeTotals] = useState({ income: 0, expense: 0 });
  const [loadingAllTime, setLoadingAllTime] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "history">(
    "overview",
  );
  const [recentLimit, setRecentLimit] = useState(5);
  const spreadsheetIdRef = useRef(spreadsheetId);

  useEffect(() => {
    spreadsheetIdRef.current = spreadsheetId;
  }, [spreadsheetId]);

  const loadData = useCallback(
    async (targetId?: string) => {
      if (status !== "authenticated") return;

      try {
        const idToUse =
          targetId !== undefined ? targetId : spreadsheetIdRef.current;

        // 1. Fetch Transactions (and discover Spreadsheet ID if missing)
        const [year, month] = monthYear.split("-");
        const formattedMonthYear = `${month}-${year}`;

        let fetchUrl = `/api/transactions?monthYear=${formattedMonthYear}`;
        if (idToUse) fetchUrl += `&spreadsheetId=${idToUse}`;

        const res = await fetch(fetchUrl);
        if (!res.ok) {
          if (res.status === 403 || res.status === 404 || res.status === 500) {
            if (idToUse) {
              setSpreadsheetId("");
              if (session?.user?.email)
                localStorage.removeItem(`expensify_id_${session?.user?.email}`);
            }
          }
          return;
        }

        const data = await res.json();
        setTransactions(data.transactions || []);

        let currentId = idToUse;
        // Update ID if backend found/created a new one
        if (data.spreadsheetId && data.spreadsheetId !== idToUse) {
          currentId = data.spreadsheetId;
          setSpreadsheetId(currentId);
          if (session?.user?.email) {
            localStorage.setItem(
              `expensify_id_${session?.user?.email}`,
              currentId,
            );
          }
        }

        // 2. Fetch All-Time Totals if we have an ID
        if (currentId) {
          setLoadingAllTime(true);
          try {
            const totalsRes = await fetch(
              `/api/totals?spreadsheetId=${currentId}`,
            );
            if (totalsRes.ok) {
              const totalsData = await totalsRes.json();
              setAllTimeTotals(totalsData);
            }
          } finally {
            setLoadingAllTime(false);
          }
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthYear, status, session],
  );

  // Initialize spreadsheetId from localStorage once session is ready
  useEffect(() => {
    if (status === "authenticated" && session?.user?.email && !spreadsheetId) {
      const saved = localStorage.getItem(
        `expensify_id_${session?.user?.email}`,
      );
      if (saved) {
        setSpreadsheetId(saved);
        loadData(saved); // Load immediately with the saved ID
      } else {
        loadData(); // No saved ID, discover one
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  useEffect(() => {
    // Only load if we have a spreadsheetId (to avoid double discovery)
    if (spreadsheetId) {
      loadData(spreadsheetId);
    }

    const handleRefresh = () => loadData(spreadsheetIdRef.current);
    window.addEventListener("transaction-added", handleRefresh);
    return () => window.removeEventListener("transaction-added", handleRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData, spreadsheetId]);

  const handleClearMonth = async () => {
    if (!spreadsheetId) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa TẤT CẢ giao dịch trong tháng ${monthYear} không? Hành động này không thể hoàn tác!`)) return;

    try {
      const [year, month] = monthYear.split("-");
      const formattedMonthYear = `${month}-${year}`;
      
      const res = await fetch("/api/transactions/clear-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId, monthYear: formattedMonthYear }),
      });

      if (res.ok) {
        alert("Đã xóa dữ liệu tháng thành công!");
        loadData(spreadsheetId);
      } else {
        const errorData = await res.json();
        alert(`Có lỗi xảy ra khi xóa dữ liệu: ${errorData.error || "Lỗi không xác định"}`);
      }
    } catch (error) {
      console.error("Error clearing month data:", error);
      alert("Lỗi kết nối server.");
    }
  };

  const handleClearAll = async () => {
    if (!spreadsheetId) return;
    if (!window.confirm("CẢNH BÁO: Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu trong Spreadsheet không? Mọi giao dịch từ trước đến nay sẽ bị xóa sạch!")) return;

    try {
      const res = await fetch("/api/transactions/clear-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      });

      if (res.ok) {
        alert("Đã xóa toàn bộ dữ liệu thành công!");
        loadData(spreadsheetId);
      } else {
        const errorData = await res.json();
        alert(`Có lỗi xảy ra khi xóa dữ liệu: ${errorData.error || "Lỗi không xác định"}`);
      }
    } catch (error) {
      console.error("Error clearing all data:", error);
      alert("Lỗi kết nối server.");
    }
  };

  const totals = transactions.reduce(
    (acc, curr) => {
      const amt =
        typeof curr.amount === "number" && !isNaN(curr.amount)
          ? curr.amount
          : 0;
      if (curr.type === "income") acc.income += amt;
      else if (curr.type === "expense") acc.expense += amt;
      return acc;
    },
    { income: 0, expense: 0 },
  );

  const categoryExpenses = transactions
    .filter(
      (tx) =>
        tx.type === "expense" &&
        tx.category &&
        typeof tx.amount === "number" &&
        !isNaN(tx.amount),
    )
    .reduce(
      (acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-10 md:space-y-16">
      <header className="flex flex-col gap-6 md:gap-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 md:gap-8">
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl md:text-6xl font-black tracking-tighter leading-tight bg-gradient-to-r from-blue-600 via-purple-500 to-blue-600 bg-[length:200%_auto] animate-gradient-text bg-clip-text text-transparent">
                  Chào, 
                  <TypewriterText text={session?.user?.name || "Bảo"} /> 
                  👋
                </span>
              </div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                className="text-[var(--text-muted)] text-lg md:text-2xl font-bold tracking-normal"
              >
                Hôm nay bạn thế nào?
              </motion.p>
            </motion.div>
            <div className="flex items-center gap-4 pt-1 md:pt-2">
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                  Spreadsheet ID
                </span>
                <input
                  type="text"
                  value={spreadsheetId}
                  onChange={(e) => {
                    const val = e.target.value.trim().replace(/;+$/, "");
                    setSpreadsheetId(val);
                    if (session?.user?.email) {
                      localStorage.setItem(
                        `expensify_id_${session?.user?.email}`,
                        val,
                      );
                    }
                  }}
                  placeholder={
                    status === "authenticated"
                      ? "Đang tìm file dữ liệu..."
                      : "Dán ID Spreadsheet vào đây"
                  }
                  className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl px-4 py-2 text-[10px] font-mono w-full sm:w-64 outline-none focus:border-blue-500 transition-all text-[var(--text-main)]"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleClearMonth}
                    disabled={!spreadsheetId || transactions.length === 0}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-500/20 transition-all disabled:opacity-30 disabled:pointer-events-none"
                    title="Xóa dữ liệu tháng này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Xóa tháng</span>
                  </button>
                  <button
                    onClick={handleClearAll}
                    disabled={!spreadsheetId}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white border border-orange-500/20 transition-all disabled:opacity-30 disabled:pointer-events-none"
                    title="Xóa tất cả dữ liệu"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Xóa tất cả</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div>
            <WeatherWidget />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 md:gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={transactions.length === 0}
                className="w-full px-4 md:px-6 py-3 md:py-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs md:text-sm font-black flex items-center justify-center sm:justify-start gap-3 shadow-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
              >
                <Download className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                <span>Xuất</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showExportMenu ? "rotate-180" : ""}`}
                />
              </motion.button>
              <AnimatePresence>
                {showExportMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute top-full right-0 mt-4 p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl z-[110] w-56 shadow-2xl backdrop-blur-xl"
                  >
                    <button
                      onClick={() => {
                        handleExportCSV();
                        setShowExportMenu(false);
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-black/5 transition-all text-left text-xs font-black uppercase tracking-widest"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        CSV
                      </div>
                      <span>Tải file CSV</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <input
              type="month"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              className="flex-1 sm:flex-initial bg-[var(--bg-input)] border border-[var(--border-color)] px-4 md:px-6 py-3 md:py-3.5 rounded-2xl font-black text-xs md:text-sm outline-none focus:border-blue-500 transition-all h-[48px] md:h-[54px] text-[var(--text-main)]"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(59, 130, 246, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-3.5 rounded-2xl bg-blue-600 text-white font-black text-xs md:text-sm shadow-2xl shadow-blue-500/40 hover:bg-blue-700 transition-all h-[48px] md:h-[54px] flex items-center justify-center gap-3 animate-float"
          >
            <Plus className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
            <span>Thêm mới</span>
          </motion.button>
        </div>
      </header>

      <div className="flex flex-col gap-6 md:gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-blue-600 rounded-full animate-pulse" />
            <h2 className="text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-[var(--text-main)] via-blue-500 to-[var(--text-main)] bg-[length:200%_auto] animate-gradient-text bg-clip-text text-transparent">
              Tài chính của tôi
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Group 1: Income & Expense */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 relative pt-10 md:pt-0">
            <div className="absolute top-0 md:-top-14 right-0 sm:right-2 flex bg-[var(--bg-card)] p-1 rounded-2xl border border-[var(--border-color)] shadow-sm backdrop-blur-xl scale-90 origin-right">
              <button
                onClick={() => setStatsMode("month")}
                className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${statsMode === "month" ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20" : "text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              >
                Tháng
              </button>
              <button
                onClick={() => setStatsMode("all")}
                className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${statsMode === "all" ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20" : "text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              >
                Tất cả
              </button>
            </div>

            <StatsCard
              title={statsMode === "month" ? "Thu nhập tháng" : "Tổng thu nhập"}
              amount={
                statsMode === "month" ? totals.income : allTimeTotals.income
              }
              icon={TrendingUp}
              color="emerald"
            />
            <StatsCard
              title={statsMode === "month" ? "Chi tiêu tháng" : "Tổng chi tiêu"}
              amount={
                statsMode === "month" ? totals.expense : allTimeTotals.expense
              }
              icon={TrendingDown}
              color="rose"
            />
          </div>

          {/* Group 2: Balance */}
          <div className="relative pt-10 md:pt-0">
            <div className="absolute top-0 md:-top-14 right-0 sm:right-2 flex bg-[var(--bg-card)] p-1 rounded-2xl border border-[var(--border-color)] shadow-sm backdrop-blur-xl scale-90 origin-right">
              <button
                onClick={() => setBalanceMode("month")}
                className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${balanceMode === "month" ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20" : "text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              >
                Tháng
              </button>
              <button
                onClick={() => setBalanceMode("all")}
                className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${balanceMode === "all" ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20" : "text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              >
                Số dư
              </button>
            </div>

            <StatsCard
              title={
                balanceMode === "month" ? "Dư tháng này" : "Số dư hiện tại"
              }
              amount={
                balanceMode === "month"
                  ? totals.income - totals.expense
                  : allTimeTotals.income - allTimeTotals.expense
              }
              icon={Wallet}
              color="primary"
            />
          </div>
        </div>
      </div>

      {/* Tab Switcher — hiển thị cả mobile lẫn desktop */}
      <div className="flex bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border-color)] shadow-lg sticky top-4 z-[100] backdrop-blur-xl">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "overview" ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20" : "text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Tổng quan</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "history" ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20" : "text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
        >
          <History className="w-4 h-4" />
          <span>Lịch sử giao dịch</span>
        </button>
      </div>

      {/* HISTORY TAB — Full width, cả desktop lẫn mobile */}
      {activeTab === "history" && (
        <div className="pt-4">
          <TransactionList
            transactions={transactions}
            monthYear={monthYear}
            onEdit={(tx: Transaction) => {
              setEditingTransaction(tx);
              setIsModalOpen(true);
            }}
            spreadsheetId={spreadsheetId}
          />
        </div>
      )}

      {/* OVERVIEW TAB — Grid layout */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-16 pt-4 md:pt-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-12">
            {/* Recent Transactions (Mobile only) */}
            <div className="lg:hidden space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight">
                      Gần đây
                    </h2>
                    <input
                      type="number"
                      value={recentLimit}
                      onChange={(e) =>
                        setRecentLimit(
                          Math.max(1, parseInt(e.target.value) || 1),
                        )
                      }
                      className="w-12 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[10px] font-black text-center outline-none focus:border-blue-500"
                      title="Số lượng giao dịch hiển thị"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("history")}
                  className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline"
                >
                  Xem tất cả
                </button>
              </div>
              <TransactionList
                transactions={transactions}
                monthYear={monthYear}
                onEdit={(tx: Transaction) => {
                  setEditingTransaction(tx);
                  setIsModalOpen(true);
                }}
                spreadsheetId={spreadsheetId}
                limit={recentLimit}
                showFilters={false}
              />
            </div>

            {/* Desktop: Full Transaction List */}
            <div className="hidden lg:block">
              <TransactionList
                transactions={transactions}
                monthYear={monthYear}
                onEdit={(tx: Transaction) => {
                  setEditingTransaction(tx);
                  setIsModalOpen(true);
                }}
                spreadsheetId={spreadsheetId}
              />
            </div>
          </div>

          {/* Right Column: Phân bổ chi tiêu */}
          <div className="space-y-8">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-xl">
              <h3 className="text-xl md:text-2xl font-black mb-1 tracking-tight">
                Phân bổ chi tiêu
              </h3>
              {totals.expense > 0 && (
                <p className="text-xs text-[var(--text-muted)] font-bold mb-6">
                  Tổng tháng: {totals.expense.toLocaleString("vi-VN")}đ
                </p>
              )}

              {Object.keys(categoryExpenses).length === 0 ? (
                <p className="text-sm font-bold text-[var(--text-muted)] text-center py-10">
                  Chưa có dữ liệu chi tiêu
                </p>
              ) : (
                <>
                  {/* Column Chart */}
                  <div className="flex items-end justify-around gap-2 h-44 mb-3 px-1">
                    {Object.entries(categoryExpenses)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, amt], idx) => {
                        const pct =
                          totals.expense > 0 ? (amt / totals.expense) * 100 : 0;
                        const pctDisplay =
                          pct === 0 ? "0%" : `${parseFloat(pct.toFixed(1))}%`;
                        const solidColors = [
                          "#3b82f6",
                          "#a855f7",
                          "#f43f5e",
                          "#f59e0b",
                          "#10b981",
                          "#06b6d4",
                          "#ec4899",
                          "#6366f1",
                        ];
                        const bgColors = [
                          "rgba(59,130,246,0.12)",
                          "rgba(168,85,247,0.12)",
                          "rgba(244,63,94,0.12)",
                          "rgba(245,158,11,0.12)",
                          "rgba(16,185,129,0.12)",
                          "rgba(6,182,212,0.12)",
                          "rgba(236,72,153,0.12)",
                          "rgba(99,102,241,0.12)",
                        ];
                        const color = solidColors[idx % solidColors.length];
                        const bgColor = bgColors[idx % bgColors.length];
                        // min bar height 4px for non-zero values
                        const barHeight = pct > 0 ? Math.max(pct, 3) : 0;

                        return (
                          <div
                            key={cat}
                            className="flex flex-col items-center justify-end gap-1 flex-1 h-full group"
                            title={`${cat}: ${amt.toLocaleString("vi-VN")}đ (${pctDisplay})`}
                          >
                            {/* % label on top of the bar */}
                            <span
                              className="text-[9px] font-black mb-1 transition-all group-hover:scale-110"
                              style={{ color }}
                            >
                              {pctDisplay}
                            </span>
                            {/* Bar */}
                            <motion.div
                              initial={{ height: 0 }}
                              whileInView={{ height: `${pct}%` }}
                              viewport={{ once: false }}
                              transition={{ 
                                type: "spring", 
                                stiffness: 100, 
                                damping: 15,
                                delay: idx * 0.05 
                              }}
                              className="w-full rounded-t-xl relative cursor-pointer"
                              style={{
                                background: `linear-gradient(to top, ${color}, ${color}cc)`,
                                boxShadow: `0 4px 15px ${bgColor}`,
                                minHeight: pct > 0 ? "4px" : "0",
                              }}
                            >
                              {/* Tooltip on hover */}
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[9px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                {amt.toLocaleString("vi-VN")}đ
                              </div>
                            </motion.div>
                          </div>
                        );
                      })}
                  </div>

                  {/* X-axis labels */}
                  <div className="flex justify-around gap-2 px-1 border-t border-[var(--border-color)] pt-3">
                    {Object.entries(categoryExpenses)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, amt], idx) => {
                        const pct =
                          totals.expense > 0 ? (amt / totals.expense) * 100 : 0;
                        const pctDisplay =
                          pct === 0 ? "0%" : `${parseFloat(pct.toFixed(1))}%`;
                        const solidColors = [
                          "#3b82f6",
                          "#a855f7",
                          "#f43f5e",
                          "#f59e0b",
                          "#10b981",
                          "#06b6d4",
                          "#ec4899",
                          "#6366f1",
                        ];
                        const color = solidColors[idx % solidColors.length];
                        return (
                          <div
                            key={cat}
                            className="flex-1 flex flex-col items-center gap-0.5"
                          >
                            <span className="text-[8px] font-black uppercase tracking-wide text-center leading-tight text-[var(--text-muted)] line-clamp-2">
                              {cat}
                            </span>
                            <span
                              className="text-[9px] font-black"
                              style={{ color }}
                            >
                              {pctDisplay}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        initialData={editingTransaction}
        isEditing={!!editingTransaction}
        monthYear={monthYear}
        spreadsheetId={spreadsheetId}
      />
    </div>
  );

  function handleExportCSV() {
    const headers = ["Ngày", "Loại", "Danh mục", "Số tiền", "Mục đích"];
    const csvContent = [
      headers.join(","),
      ...transactions.map((tx) =>
        [tx.date, tx.type, tx.category, tx.amount, tx.purpose].join(","),
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bao-cao-${monthYear}.csv`;
    link.click();
  }
}
