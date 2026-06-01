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
import { InsightsPanel } from "./InsightsPanel";
import { ReportingCenter } from "./ReportingCenter";
import { ExperienceHub } from "./ExperienceHub";
import { BackupCenter } from "./BackupCenter";
import { AccessControlPanel } from "./AccessControlPanel";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { WeatherWidget } from "./WeatherWidget";
import {
  advanceRecurringTemplate,
  loadRecurringTemplates,
  saveRecurringTemplates,
} from "@/lib/recurring";
import {
  createDemoTransactions,
  loadDemoMode,
  saveDemoMode,
} from "@/lib/automation";
import {
  buildBackupSnapshot,
  type BackupSnapshot,
  loadCache,
  saveBackupSnapshot,
  saveCache,
} from "@/lib/backup";

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

type HistoryAction =
  | {
      kind: "create" | "delete"
      transaction: Transaction
    }
  | {
      kind: "edit"
      before: Transaction
      after: Transaction
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
  const [copyTransaction, setCopyTransaction] = useState<Transaction | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [statsMode, setStatsMode] = useState<"day" | "month" | "all">("month");
  const [balanceMode, setBalanceMode] = useState<"day" | "month" | "all">("all");
  const [todayStr, setTodayStr] = useState("");
  const [allTimeTotals, setAllTimeTotals] = useState({ income: 0, expense: 0 });
  const [loadingAllTime, setLoadingAllTime] = useState(false);
  const [analyticsTransactions, setAnalyticsTransactions] = useState<Transaction[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [isLoadingMonthData, setIsLoadingMonthData] = useState(false);
  const [isSeedingDemoData, setIsSeedingDemoData] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "history">(
    "overview",
  );
  const [recentLimit, setRecentLimit] = useState(5);
  const [historyStack, setHistoryStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showSampleData, setShowSampleData] = useState(true);
  const [accessRole, setAccessRole] = useState<"viewer" | "editor" | "admin" | null>(null);
  const spreadsheetIdRef = useRef(spreadsheetId);
  const refreshKeyRef = useRef("");
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const recurringProcessedDateRef = useRef<string>("");

  useEffect(() => {
    spreadsheetIdRef.current = spreadsheetId;
  }, [spreadsheetId]);

  useEffect(() => {
    setTodayStr(new Date().toLocaleDateString("sv-SE"));
  }, []);

  useEffect(() => {
    setIsDemoMode(loadDemoMode())
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = localStorage.getItem("expensify_show_sample_data")
    if (raw === null) return
    setShowSampleData(raw !== "0")
  }, []);

  useEffect(() => {
    if (!spreadsheetId || status !== "authenticated") return

    const loadAccess = async () => {
      try {
        const res = await fetch(`/api/access?spreadsheetId=${spreadsheetId}`)
        if (!res.ok) return
        const data = await res.json()
        setAccessRole(data.role || null)
      } catch (error) {
        console.error("Error loading access role:", error)
      }
    }

    void loadAccess()
  }, [spreadsheetId, status])

  const loadData = useCallback(
      async (targetId?: string) => {
        if (status !== "authenticated") return;

        try {
          const idToUse =
            targetId !== undefined ? targetId : spreadsheetIdRef.current;
          const cached = idToUse ? loadCache(idToUse) : null;
          if (cached?.transactions?.length && transactions.length === 0) {
            setTransactions(cached.transactions);
            if (cached.allTimeTotals) {
              setAllTimeTotals(cached.allTimeTotals);
            }
          }

          // 1. Fetch Transactions (and discover Spreadsheet ID if missing)
          const [year, month] = monthYear.split("-");
          const formattedMonthYear = `${month}-${year}`;

        let fetchUrl = `/api/transactions?monthYear=${formattedMonthYear}`;
        if (idToUse) fetchUrl += `&spreadsheetId=${idToUse}`;

        const res = await fetch(fetchUrl);
          if (!res.ok) {
            if (res.status === 403 || res.status === 404) {
              if (idToUse) {
                setSpreadsheetId("");
                if (session?.user?.email)
                  localStorage.removeItem(`expensify_id_${session?.user?.email}`);
              }
            } else if (res.status === 429 || res.status >= 500) {
              console.warn("Google API tạm thời gặp lỗi, đang dùng cache nếu có.")
              const cached = idToUse ? loadCache(idToUse) : null
              if (cached?.transactions) {
                setTransactions(cached.transactions)
                if (cached.allTimeTotals) {
                  setAllTimeTotals(cached.allTimeTotals)
                }
              }
            }
            return;
          }

        const data = await res.json();
        const nextTransactions = data.transactions || [];
        setTransactions(nextTransactions);

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

        if (currentId) {
          const snapshot = buildBackupSnapshot(currentId, monthYear, nextTransactions)
          saveBackupSnapshot(snapshot)
          saveCache({
            savedAt: new Date().toISOString(),
            spreadsheetId: currentId,
            monthYear,
            transactions: nextTransactions,
          })
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
              saveCache({
                savedAt: new Date().toISOString(),
                spreadsheetId: currentId,
                monthYear,
                transactions: nextTransactions,
                allTimeTotals: totalsData,
              });
            }
          } finally {
            setLoadingAllTime(false);
          }
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        const fallbackId = targetId !== undefined ? targetId : spreadsheetIdRef.current;
        const cached = fallbackId ? loadCache(fallbackId) : null;
        if (cached?.transactions) {
          setTransactions(cached.transactions);
          if (cached.allTimeTotals) {
            setAllTimeTotals(cached.allTimeTotals);
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthYear, status, session],
  );

  const loadAnalytics = useCallback(
    async (targetId?: string) => {
      if (status !== "authenticated") return;

      const idToUse =
        targetId !== undefined ? targetId : spreadsheetIdRef.current;
      if (!idToUse) return;

      try {
        setLoadingAnalytics(true);
        const res = await fetch(`/api/analytics?spreadsheetId=${idToUse}`);
        if (!res.ok) return;

        const data = await res.json();
        setAnalyticsTransactions(data.transactions || []);
      } catch (error) {
        console.error("Error loading analytics data:", error);
      } finally {
        setLoadingAnalytics(false);
      }
    },
    [status],
  );

  const refreshCurrentData = useCallback(async () => {
    const currentSpreadsheetId = spreadsheetIdRef.current
    if (!currentSpreadsheetId) return
    const currentKey = `${currentSpreadsheetId}:${monthYear}`

    if (refreshPromiseRef.current && refreshKeyRef.current === currentKey) {
      return refreshPromiseRef.current
    }

    const nextRefresh = (async () => {
      await loadData(currentSpreadsheetId)
      await loadAnalytics(currentSpreadsheetId)
    })()

    refreshKeyRef.current = currentKey
    refreshPromiseRef.current = nextRefresh

    try {
      await nextRefresh
    } finally {
      if (refreshPromiseRef.current === nextRefresh) {
        refreshPromiseRef.current = null
        refreshKeyRef.current = ""
      }
    }
  }, [loadAnalytics, loadData, monthYear])

  // Initialize spreadsheetId from localStorage once session is ready
  useEffect(() => {
    if (status === "authenticated" && session?.user?.email && !spreadsheetId) {
      const saved = localStorage.getItem(
        `expensify_id_${session?.user?.email}`,
      );
      if (saved) {
        setSpreadsheetId(saved);
      } else {
        loadData(); // No saved ID, discover one
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  useEffect(() => {
    if (status !== "authenticated" || !spreadsheetId) return

    const handleRefresh = () => {
      void refreshCurrentData()
    };

    let cancelled = false
    setTransactions([])
    setAnalyticsTransactions([])

    const run = async () => {
      setIsLoadingMonthData(true)
      try {
        await refreshCurrentData()
      } finally {
        if (!cancelled) setIsLoadingMonthData(false)
      }
    }

    void run()
    window.addEventListener("transaction-added", handleRefresh);
    return () => {
      cancelled = true
      window.removeEventListener("transaction-added", handleRefresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthYear, refreshCurrentData, spreadsheetId, status])

  const pushHistoryAction = useCallback((action: HistoryAction) => {
    setHistoryStack((current) => [action, ...current].slice(0, 10))
    setRedoStack([])
  }, [])

  const findCurrentTransaction = useCallback(
    (id: string) => transactions.find((tx) => tx.id === id),
    [transactions],
  )

  const handleUseDemoMode = useCallback(() => {
    saveDemoMode(true)
    setIsDemoMode(true)
  }, [])

  const handleDisableDemoMode = useCallback(() => {
    saveDemoMode(false)
    setIsDemoMode(false)
  }, [])

  const handleToggleShowSampleData = useCallback(() => {
    setShowSampleData((current) => {
      const next = !current
      localStorage.setItem("expensify_show_sample_data", next ? "1" : "0")
      return next
    })
  }, [])

  const handleSeedDemoData = useCallback(async () => {
    if (!spreadsheetIdRef.current) return
    if (isSeedingDemoData) return false
    if (transactions.some((tx) => tx.isSample)) {
      return true
    }
    if (!window.confirm("Thêm dữ liệu mẫu vào Excel để có thể sửa/xóa riêng từng dòng?")) return

    setIsSeedingDemoData(true)
    const demoRows = createDemoTransactions(monthYear)
    const requests = demoRows.map((transaction) =>
      fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...transaction,
          spreadsheetId: spreadsheetIdRef.current,
          isSample: true,
        }),
      }),
    )

    try {
      const results = await Promise.all(requests)
      const allOk = results.every((response) => response.ok)
      if (!allOk) {
        alert("Có một số dòng dữ liệu mẫu chưa được ghi thành công.")
      } else {
        alert("Đã nạp dữ liệu mẫu vào Excel.")
      }
      await refreshCurrentData()
      return true
    } catch (error) {
      console.error("Error seeding demo data:", error)
      alert("Không thể nạp dữ liệu mẫu vào Excel.")
      return false
    } finally {
      setIsSeedingDemoData(false)
    }
  }, [isSeedingDemoData, monthYear, refreshCurrentData, transactions])

  const handleDeleteSampleData = useCallback(async () => {
    if (!spreadsheetIdRef.current) return
    if (accessRole !== "admin") {
      alert("Chỉ admin mới được xóa dữ liệu mẫu khỏi Excel.")
      return
    }
    if (!window.confirm("Xóa toàn bộ dữ liệu mẫu khỏi Excel?")) return

    try {
      const res = await fetch("/api/transactions/delete-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId: spreadsheetIdRef.current }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || "Không thể xóa dữ liệu mẫu.")
        return
      }
      await refreshCurrentData()
      alert("Đã xóa toàn bộ dữ liệu mẫu khỏi Excel.")
    } catch (error) {
      console.error("Error deleting sample data:", error)
      alert("Không thể xóa dữ liệu mẫu.")
    }
  }, [accessRole, refreshCurrentData])

  const openAddTransaction = useCallback(() => {
    if (accessRole === "viewer") return
    setEditingTransaction(null)
    setCopyTransaction(null)
    setIsModalOpen(true)
  }, [accessRole])

  const focusTransactionSearch = useCallback(() => {
    window.dispatchEvent(new Event("focus-transaction-search"))
    setActiveTab("history")
  }, [])

  const undoLastAction = useCallback(async () => {
    const action = historyStack[0]
    if (!action || !spreadsheetIdRef.current) return

    const [year, month] = monthYear.split("-")
    const formattedMonthYear = `${month}-${year}`

      try {
      if (action.kind === "create") {
        const current = findCurrentTransaction(action.transaction.id)
        if (!current?.rowIndex) return
        const response = await fetch(
          `/api/transactions?monthYear=${formattedMonthYear}&rowIndex=${current.rowIndex}&spreadsheetId=${spreadsheetIdRef.current}`,
          { method: "DELETE" },
        )
        if (!response.ok) throw new Error("Undo create failed")
      } else if (action.kind === "delete") {
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...action.transaction,
            spreadsheetId: spreadsheetIdRef.current,
          }),
        })
        if (!response.ok) throw new Error("Undo delete failed")
      } else if (action.kind === "edit") {
        const current = findCurrentTransaction(action.after.id)
        if (!current?.rowIndex) return
        const response = await fetch("/api/transactions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monthYear: formattedMonthYear,
            rowIndex: current.rowIndex,
            spreadsheetId: spreadsheetIdRef.current,
            transaction: action.before,
          }),
        })
        if (!response.ok) throw new Error("Undo edit failed")
      }

      setHistoryStack((current) => current.slice(1))
      setRedoStack((current) => [action, ...current].slice(0, 10))
      await refreshCurrentData()
    } catch (error) {
      console.error("Undo failed:", error)
    }
  }, [findCurrentTransaction, historyStack, monthYear, refreshCurrentData])

  const redoLastAction = useCallback(async () => {
    const action = redoStack[0]
    if (!action || !spreadsheetIdRef.current) return

    const [year, month] = monthYear.split("-")
    const formattedMonthYear = `${month}-${year}`

    try {
      if (action.kind === "create") {
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...action.transaction,
            spreadsheetId: spreadsheetIdRef.current,
          }),
        })
        if (!response.ok) throw new Error("Redo create failed")
      } else if (action.kind === "delete") {
        const current = findCurrentTransaction(action.transaction.id)
        if (!current?.rowIndex) return
        const response = await fetch(
          `/api/transactions?monthYear=${formattedMonthYear}&rowIndex=${current.rowIndex}&spreadsheetId=${spreadsheetIdRef.current}`,
          { method: "DELETE" },
        )
        if (!response.ok) throw new Error("Redo delete failed")
      } else if (action.kind === "edit") {
        const current = findCurrentTransaction(action.after.id)
        if (!current?.rowIndex) return
        const response = await fetch("/api/transactions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monthYear: formattedMonthYear,
            rowIndex: current.rowIndex,
            spreadsheetId: spreadsheetIdRef.current,
            transaction: action.after,
          }),
        })
        if (!response.ok) throw new Error("Redo edit failed")
      }

      setRedoStack((current) => current.slice(1))
      setHistoryStack((current) => [action, ...current].slice(0, 10))
      await refreshCurrentData()
    } catch (error) {
      console.error("Redo failed:", error)
    }
  }, [findCurrentTransaction, monthYear, redoStack, refreshCurrentData])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable

      if (event.key === "Escape" && isModalOpen) {
        setIsModalOpen(false)
        setEditingTransaction(null)
        setCopyTransaction(null)
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        focusTransactionSearch()
        return
      }

      if (!isTyping && !isModalOpen && event.key.toLowerCase() === "n") {
        event.preventDefault()
        openAddTransaction()
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault()
        void undoLastAction()
        return
      }

      if (
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z")
      ) {
        event.preventDefault()
        void redoLastAction()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [focusTransactionSearch, isModalOpen, openAddTransaction, redoLastAction, undoLastAction])

  useEffect(() => {
    if (!spreadsheetId || !todayStr) return
    if (recurringProcessedDateRef.current === todayStr) return

    const templates = loadRecurringTemplates(spreadsheetId)
    const dueTemplates = templates.filter(
      (template) =>
        template.enabled &&
        template.nextRunDate <= todayStr &&
        template.lastGeneratedDate !== todayStr,
    )

    if (dueTemplates.length === 0) {
      recurringProcessedDateRef.current = todayStr
      return
    }

    const run = async () => {
      let changed = false
      let nextTemplates = [...templates]

      for (const template of dueTemplates) {
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...template.transaction,
            spreadsheetId,
          }),
        })

        if (response.ok) {
          changed = true
          const index = nextTemplates.findIndex((item) => item.id === template.id)
          if (index >= 0) {
            nextTemplates[index] = advanceRecurringTemplate({
              ...template,
              lastGeneratedDate: todayStr,
            })
          }
        }
      }

      if (changed) {
        saveRecurringTemplates(spreadsheetId, nextTemplates)
        await refreshCurrentData()
      }

      recurringProcessedDateRef.current = todayStr
    }

    void run()
  }, [todayStr, spreadsheetId, refreshCurrentData]);

  useEffect(() => {
    if (!spreadsheetId || status !== "authenticated") return

    const sync = () => {
      void refreshCurrentData()
    }

    const interval = window.setInterval(sync, 5 * 60 * 1000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sync()
      }
    }

    window.addEventListener("focus", sync)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", sync)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [refreshCurrentData, spreadsheetId, status])

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
        await refreshCurrentData();
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
        await refreshCurrentData();
      } else {
        const errorData = await res.json();
        alert(`Có lỗi xảy ra khi xóa dữ liệu: ${errorData.error || "Lỗi không xác định"}`);
      }
    } catch (error) {
      console.error("Error clearing all data:", error);
      alert("Lỗi kết nối server.");
    }
  };

  const demoTransactions = createDemoTransactions(monthYear)
  const effectiveTransactions = transactions

  const canWrite = accessRole !== "viewer"
  const canAdmin = accessRole === "admin"
  const visibleTransactions = showSampleData
    ? effectiveTransactions
    : effectiveTransactions.filter((tx) => !tx.isSample)
  const visibleAnalyticsTransactions = showSampleData
    ? analyticsTransactions
    : analyticsTransactions.filter((tx) => !tx.isSample)
  const visibleCurrentTotals = visibleTransactions.reduce(
    (acc, curr) => {
      const amt =
        typeof curr.amount === "number" && !isNaN(curr.amount)
          ? curr.amount
          : 0
      if (curr.type === "income") acc.income += amt
      else if (curr.type === "expense") acc.expense += amt
      return acc
    },
    { income: 0, expense: 0 },
  )
  const visibleDailyTotals = visibleTransactions.reduce(
    (acc, curr) => {
      if (curr.date === todayStr) {
        const amt =
          typeof curr.amount === "number" && !isNaN(curr.amount)
            ? curr.amount
            : 0
        if (curr.type === "income") acc.income += amt
        else if (curr.type === "expense") acc.expense += amt
      }
      return acc
    },
    { income: 0, expense: 0 },
  )
  const visibleCategoryExpenses = visibleTransactions
    .filter(
      (tx) =>
        tx.type === "expense" &&
        tx.category &&
        typeof tx.amount === "number" &&
        !isNaN(tx.amount),
    )
    .reduce(
      (acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount
        return acc
      },
      {} as Record<string, number>,
    )
  const visibleAllTimeTotals = visibleAnalyticsTransactions.reduce(
    (acc, curr) => {
      const amt =
        typeof curr.amount === "number" && !isNaN(curr.amount)
          ? curr.amount
          : 0
      if (curr.type === "income") acc.income += amt
      else if (curr.type === "expense") acc.expense += amt
      return acc
    },
    { income: 0, expense: 0 },
  )
  const displayAllTimeTotals =
    transactions.length > 0
      ? visibleAllTimeTotals
      : { income: visibleCurrentTotals.income, expense: visibleCurrentTotals.expense }

  useEffect(() => {
    if (!spreadsheetId || visibleTransactions.length === 0) return

    const timer = window.setInterval(() => {
      const snapshot = buildBackupSnapshot(spreadsheetId, monthYear, visibleTransactions)
      saveBackupSnapshot(snapshot)
    }, 10 * 60 * 1000)

    return () => window.clearInterval(timer)
  }, [monthYear, spreadsheetId, visibleTransactions])

  const handleTransactionSaved = useCallback(
    (result: { mode: "create" | "edit"; transaction: Transaction; previous?: Transaction }) => {
      if (result.mode === "create") {
        pushHistoryAction({ kind: "create", transaction: result.transaction })
        return
      }

      if (result.previous) {
        pushHistoryAction({
          kind: "edit",
          before: result.previous,
          after: result.transaction,
        })
      }
    },
    [pushHistoryAction],
  )

  const handleTransactionDelete = useCallback(
    async (tx: Transaction) => {
      if (!spreadsheetIdRef.current || tx.rowIndex === undefined) return
      const [year, month] = monthYear.split("-")
      const formattedMonthYear = `${month}-${year}`
      const res = await fetch(
        `/api/transactions?monthYear=${formattedMonthYear}&rowIndex=${tx.rowIndex}&spreadsheetId=${spreadsheetIdRef.current}`,
        { method: "DELETE" },
      )

      if (res.ok) {
        pushHistoryAction({ kind: "delete", transaction: tx })
        await refreshCurrentData()
      }
    },
    [monthYear, pushHistoryAction, refreshCurrentData],
  )

  const handleRestoreBackup = useCallback(
    async (snapshot: BackupSnapshot) => {
      if (!spreadsheetIdRef.current) return
      const [year, month] = snapshot.monthYear.split("-")
      const formattedMonthYear = `${month}-${year}`

      try {
        await fetch("/api/transactions/clear-month", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spreadsheetId: spreadsheetIdRef.current,
            monthYear: formattedMonthYear,
          }),
        })

        for (const transaction of snapshot.transactions) {
          const response = await fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...transaction,
              spreadsheetId: spreadsheetIdRef.current,
            }),
          })

          if (!response.ok) {
            throw new Error(`Restore failed for ${transaction.purpose}`)
          }
        }

        setMonthYear(snapshot.monthYear)
        saveBackupSnapshot(snapshot)
        await refreshCurrentData()
      } catch (error) {
        console.error("Restore backup failed:", error)
      }
    },
    [refreshCurrentData],
  )

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
                    disabled={!spreadsheetId || transactions.length === 0 || !canAdmin}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-500/20 transition-all disabled:opacity-30 disabled:pointer-events-none"
                    title="Xóa dữ liệu tháng này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Xóa tháng</span>
                  </button>
                  <button
                    onClick={handleClearAll}
                    disabled={!spreadsheetId || !canAdmin}
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
            <div className="relative flex-initial">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={transactions.length === 0}
                className="px-3 sm:px-4 md:px-6 py-3 md:py-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs md:text-sm font-black flex items-center justify-center gap-1.5 md:gap-3 shadow-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all h-[48px] md:h-[54px]"
              >
                <Download className="w-4 h-4 md:w-5 md:h-5 text-blue-500 shrink-0" />
                <span className="hidden sm:inline">Xuất</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform shrink-0 ${showExportMenu ? "rotate-180" : ""}`}
                />
              </motion.button>
              <AnimatePresence>
                {showExportMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute top-full left-0 sm:left-auto sm:right-0 mt-4 p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl z-[110] w-56 shadow-2xl backdrop-blur-xl"
                  >
                    <button
                      onClick={() => {
                        handleExportCSV();
                        setShowExportMenu(false);
                      }}
                      className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left text-xs font-black uppercase tracking-widest text-[var(--text-main)]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                        CSV
                      </div>
                      <span>Tải file CSV</span>
                    </button>
                    <button
                      onClick={() => {
                        handleExportExcel();
                        setShowExportMenu(false);
                      }}
                      className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left text-xs font-black uppercase tracking-widest text-[var(--text-main)]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                        XLS
                      </div>
                      <span>Tải file Excel</span>
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
              onClick={() => {
                if (!canWrite) return
                setEditingTransaction(null)
                setCopyTransaction(null)
                setIsModalOpen(true)
              }}
              disabled={!canWrite}
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
                onClick={() => setStatsMode("day")}
                className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${statsMode === "day" ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20" : "text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              >
                Ngày
              </button>
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
                title={
                  statsMode === "day"
                    ? "Thu nhập ngày"
                    : statsMode === "month"
                    ? "Thu nhập tháng"
                    : "Tổng thu nhập"
                }
                amount={
                  statsMode === "day"
                    ? visibleDailyTotals.income
                    : statsMode === "month"
                    ? visibleCurrentTotals.income
                    : displayAllTimeTotals.income
                }
              icon={TrendingUp}
              color="emerald"
            />
            <StatsCard
                title={
                  statsMode === "day"
                    ? "Chi tiêu ngày"
                    : statsMode === "month"
                    ? "Chi tiêu tháng"
                    : "Tổng chi tiêu"
                }
                amount={
                  statsMode === "day"
                    ? visibleDailyTotals.expense
                    : statsMode === "month"
                    ? visibleCurrentTotals.expense
                    : displayAllTimeTotals.expense
                }
              icon={TrendingDown}
              color="rose"
            />
          </div>

          {/* Group 2: Balance */}
          <div className="relative pt-10 md:pt-0">
            <div className="absolute top-0 md:-top-14 right-0 sm:right-2 flex bg-[var(--bg-card)] p-1 rounded-2xl border border-[var(--border-color)] shadow-sm backdrop-blur-xl scale-90 origin-right">
              <button
                onClick={() => setBalanceMode("day")}
                className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${balanceMode === "day" ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20" : "text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              >
                Ngày
              </button>
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
                balanceMode === "day"
                  ? "Dư ngày hôm nay"
                  : balanceMode === "month"
                  ? "Dư tháng này"
                  : "Số dư hiện tại"
              }
              amount={
                balanceMode === "day"
                  ? visibleDailyTotals.income - visibleDailyTotals.expense
                  : balanceMode === "month"
                  ? visibleCurrentTotals.income - visibleCurrentTotals.expense
                  : displayAllTimeTotals.income - displayAllTimeTotals.expense
              }
              icon={Wallet}
              color="primary"
            />
          </div>
        </div>
      </div>

      {(loadingAnalytics || analyticsTransactions.length > 0) && (
        <section className="pt-2">
          <InsightsPanel
            transactions={
              visibleAnalyticsTransactions.length > 0
                ? visibleAnalyticsTransactions
                : visibleTransactions
            }
            monthYear={monthYear}
            spreadsheetId={spreadsheetId}
          />
        </section>
      )}

      <section className="pt-2">
        <ReportingCenter transactions={visibleTransactions} monthYear={monthYear} />
      </section>

      <section className="pt-2">
        <ExperienceHub
          transactions={visibleTransactions}
          monthYear={monthYear}
          spreadsheetId={spreadsheetId}
          demoMode={isDemoMode}
          showSampleData={showSampleData}
          hasRealData={transactions.length > 0}
          hasSampleData={transactions.some((tx) => tx.isSample)}
          isLoadingMonthData={isLoadingMonthData}
          isSeedingDemoData={isSeedingDemoData}
          onEnableDemoMode={handleUseDemoMode}
          onDisableDemoMode={handleDisableDemoMode}
          onSeedDemoData={handleSeedDemoData}
          onToggleShowSampleData={handleToggleShowSampleData}
          onDeleteSampleData={handleDeleteSampleData}
          canAdmin={canAdmin}
          onOpenAddTransaction={openAddTransaction}
          onFocusSearch={focusTransactionSearch}
        />
      </section>

      <section className="pt-2">
        <AccessControlPanel spreadsheetId={spreadsheetId} />
      </section>

      <section className="pt-2">
        <BackupCenter
          spreadsheetId={spreadsheetId}
          monthYear={monthYear}
          transactions={visibleTransactions}
          onRestore={handleRestoreBackup}
        />
      </section>

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
            transactions={visibleTransactions}
            monthYear={monthYear}
            onEdit={
              canWrite
                ? (tx: Transaction) => {
                    setEditingTransaction(tx);
                    setCopyTransaction(null);
                    setIsModalOpen(true);
                  }
                : () => {}
            }
            onDuplicate={
              canWrite
                ? (tx: Transaction) => {
                    setCopyTransaction({
                      ...tx,
                      id: "",
                      rowIndex: undefined,
                      date: new Date().toISOString().slice(0, 10),
                    })
                    setIsModalOpen(true)
                  }
                : undefined
            }
            onDelete={canWrite ? handleTransactionDelete : undefined}
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
                transactions={visibleTransactions}
                monthYear={monthYear}
                onEdit={
                  canWrite
                    ? (tx: Transaction) => {
                        setEditingTransaction(tx);
                        setCopyTransaction(null);
                        setIsModalOpen(true);
                      }
                    : () => {}
                }
                onDuplicate={
                  canWrite
                    ? (tx: Transaction) => {
                        setCopyTransaction({
                          ...tx,
                          id: "",
                          rowIndex: undefined,
                          date: new Date().toISOString().slice(0, 10),
                        })
                        setIsModalOpen(true)
                      }
                    : undefined
                }
                onDelete={canWrite ? handleTransactionDelete : undefined}
                spreadsheetId={spreadsheetId}
                limit={recentLimit}
                showFilters={false}
              />
            </div>

            {/* Desktop: Full Transaction List */}
            <div className="hidden lg:block">
              <TransactionList
                transactions={visibleTransactions}
                monthYear={monthYear}
                onEdit={
                  canWrite
                    ? (tx: Transaction) => {
                        setEditingTransaction(tx);
                        setCopyTransaction(null);
                        setIsModalOpen(true);
                      }
                    : () => {}
                }
                onDuplicate={
                  canWrite
                    ? (tx: Transaction) => {
                        setCopyTransaction({
                          ...tx,
                          id: "",
                          rowIndex: undefined,
                          date: new Date().toISOString().slice(0, 10),
                        })
                        setIsModalOpen(true)
                      }
                    : undefined
                }
                onDelete={canWrite ? handleTransactionDelete : undefined}
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
              {visibleCurrentTotals.expense > 0 && (
                <p className="text-xs text-[var(--text-muted)] font-bold mb-6">
                  Tổng tháng: {visibleCurrentTotals.expense.toLocaleString("vi-VN")}đ
                </p>
              )}

              {Object.keys(visibleCategoryExpenses).length === 0 ? (
                <p className="text-sm font-bold text-[var(--text-muted)] text-center py-10">
                  Chưa có dữ liệu chi tiêu
                </p>
              ) : (
                <>
                  {/* Column Chart */}
                  <div className="flex items-end justify-around gap-2 h-44 mb-3 px-1">
                    {Object.entries(visibleCategoryExpenses)
                        .sort(([, a], [, b]) => b - a)
                        .map(([cat, amt], idx) => {
                          const pct =
                          visibleCurrentTotals.expense > 0 ? (amt / visibleCurrentTotals.expense) * 100 : 0;
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
                    {Object.entries(visibleCategoryExpenses)
                        .sort(([, a], [, b]) => b - a)
                        .map(([cat, amt], idx) => {
                          const pct =
                          visibleCurrentTotals.expense > 0 ? (amt / visibleCurrentTotals.expense) * 100 : 0;
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

      {(historyStack.length > 0 || redoStack.length > 0) && (
        <div className="fixed bottom-4 left-4 z-[120] flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 shadow-2xl backdrop-blur-xl">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            Lịch sử thao tác
          </span>
          <button
            type="button"
            onClick={() => void undoLastAction()}
            disabled={historyStack.length === 0}
            className="rounded-xl bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-40"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => void redoLastAction()}
            disabled={redoStack.length === 0}
            className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
          >
            Redo
          </button>
        </div>
      )}

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
          setCopyTransaction(null);
        }}
        initialData={editingTransaction || copyTransaction}
        isEditing={!!editingTransaction}
        monthYear={monthYear}
        spreadsheetId={spreadsheetId}
        transactions={visibleTransactions}
        onSaved={handleTransactionSaved}
      />
    </div>
  );

  function handleExportCSV() {
    const headers = ["Ngày", "Loại", "Danh mục", "Số tiền", "Mục đích", "Ghi chú", "Dữ liệu mẫu"];
    const csvContent = [
      headers.join(","),
      ...visibleTransactions.map((tx) =>
        [
          tx.date,
          tx.type === "income" ? "Thu nhập" : "Chi tiêu",
          tx.category,
          tx.amount,
          tx.purpose,
          tx.note || "",
          tx.isSample ? "Có" : "",
        ].join(","), 
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

  function handleExportExcel() {
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Báo cáo chi tiêu</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; width: 100%; font-family: sans-serif; }
          th { background-color: #2563eb; color: white; font-weight: bold; font-size: 13px; }
          td, th { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 12px; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .income { color: #10b981; font-weight: bold; }
          .expense { color: #ef4444; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2 style="font-family: sans-serif; color: #1e3a8a;">Báo cáo thu chi - Tháng ${monthYear}</h2>
        <table>
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Loại</th>
              <th>Danh mục</th>
              <th>Số tiền</th>
              <th>Mục đích</th>
              <th>Ghi chú</th>
              <th>Dữ liệu mẫu</th>
            </tr>
          </thead>
          <tbody>
            ${visibleTransactions
              .map(
                (tx) => `
              <tr>
                <td>${tx.date}</td>
                <td class="${tx.type}">${tx.type === "income" ? "Thu nhập" : "Chi tiêu"}</td>
                <td>${tx.category}</td>
                <td>${tx.amount.toLocaleString("vi-VN")}đ</td>
                <td>${tx.purpose}</td>
                <td>${tx.note || ""}</td>
                <td>${tx.isSample ? "Có" : ""}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bao-cao-${monthYear}.xls`;
    link.click();
  }
}
