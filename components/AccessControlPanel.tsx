"use client"

import { useEffect, useState } from "react"
import { ShieldCheck, UserPlus, Users, Trash2 } from "lucide-react"
import type { AccessMember, AccessRole } from "@/lib/access-control"

interface AccessControlPanelProps {
  spreadsheetId: string
}

export function AccessControlPanel({ spreadsheetId }: AccessControlPanelProps) {
  const [role, setRole] = useState<AccessRole | null>(null)
  const [members, setMembers] = useState<AccessMember[]>([])
  const [email, setEmail] = useState("")
  const [memberRole, setMemberRole] = useState<AccessRole>("viewer")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!spreadsheetId) return

    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/access?spreadsheetId=${spreadsheetId}`)
        if (!res.ok) return
        const data = await res.json()
        setMembers(data.members || [])
        setRole(data.role || null)
      } catch (error) {
        console.error("Error loading access control:", error)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [spreadsheetId])

  const refresh = async () => {
    const res = await fetch(`/api/access?spreadsheetId=${spreadsheetId}`)
    if (!res.ok) return
    const data = await res.json()
    setMembers(data.members || [])
    setRole(data.role || null)
  }

  const handleSave = async () => {
    if (!email.trim()) return
    setLoading(true)
    setMessage("")
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId,
          member: {
            email: email.trim(),
            role: memberRole,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || "Không thể cập nhật quyền.")
        return
      }
      setMembers(data.members || [])
      setEmail("")
      setMemberRole("viewer")
      setMessage("Đã cập nhật quyền thành viên.")
    } catch (error) {
      console.error("Error saving access:", error)
      setMessage("Lỗi khi cập nhật quyền.")
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (targetEmail: string) => {
    if (!confirm(`Xóa quyền của ${targetEmail}?`)) return
    setLoading(true)
    setMessage("")
    try {
      const res = await fetch(
        `/api/access?spreadsheetId=${spreadsheetId}&email=${encodeURIComponent(targetEmail)}`,
        { method: "DELETE" },
      )
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || "Không thể xóa thành viên.")
        return
      }
      setMembers(data.members || [])
      setMessage("Đã xóa thành viên.")
    } catch (error) {
      console.error("Error removing access:", error)
      setMessage("Lỗi khi xóa thành viên.")
    } finally {
      setLoading(false)
    }
  }

  if (!spreadsheetId) return null

  return (
    <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 md:p-6 shadow-xl space-y-5">
      <div className="flex items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-500">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              Phân quyền
            </p>
            <h3 className="text-lg font-black tracking-tight">Nhóm dùng chung</h3>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border-color)] px-3 py-2 text-[10px] font-black uppercase tracking-widest">
          {role ? `Vai trò: ${role}` : "Đang tải"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_0.7fr_auto] gap-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email thành viên"
          className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none"
          disabled={role !== "admin"}
        />
        <select
          value={memberRole}
          onChange={(e) => setMemberRole(e.target.value as AccessRole)}
          className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] px-4 py-3 text-sm font-bold outline-none"
          disabled={role !== "admin"}
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || role !== "admin"}
          className="rounded-2xl bg-blue-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Thêm
        </button>
      </div>

      {message ? (
        <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-3 text-sm font-medium text-[var(--text-muted)]">
          {message}
        </div>
      ) : null}

      <div className="space-y-2">
        {members.length === 0 ? (
          <p className="text-sm font-medium text-[var(--text-muted)]">Chưa có thành viên nào.</p>
        ) : (
          members.map((member) => (
            <div
              key={member.email}
              className="flex items-center justify-between gap-3 rounded-2xl bg-black/5 dark:bg-white/5 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-black">{member.email}</p>
                  <p className="text-[11px] font-medium text-[var(--text-muted)]">
                    {member.role} {member.addedAt ? `• ${new Date(member.addedAt).toLocaleDateString("vi-VN")}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleRemove(member.email)}
                disabled={loading || role !== "admin"}
                className="rounded-xl p-2 text-rose-500 hover:bg-rose-500/10 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {role !== "admin" ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-color)] p-4 text-[11px] font-medium text-[var(--text-muted)]">
          Bạn chỉ có quyền xem. Hãy nhờ admin thêm hoặc nâng quyền nếu cần chỉnh sửa.
        </div>
      ) : null}
    </div>
  )
}
