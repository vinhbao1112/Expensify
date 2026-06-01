import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { GoogleSheetsService } from "@/lib/google-sheets"
import {
  AccessMember,
  loadAccessMembers,
  removeAccessMember,
  requireAccess,
  upsertAccessMember,
} from "@/lib/access-control"

function getEmail(session: unknown) {
  const user = (session as { user?: { email?: string | null } })?.user
  return user?.email || null
}

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions)) as any
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const spreadsheetId = searchParams.get("spreadsheetId")
  const email = getEmail(session)

  if (!spreadsheetId) {
    return NextResponse.json({ error: "Missing spreadsheetId" }, { status: 400 })
  }
  if (!email) {
    return NextResponse.json({ error: "Missing user email" }, { status: 401 })
  }

  const service = new GoogleSheetsService(session.accessToken)

  try {
    const role = await requireAccess(spreadsheetId, service, email, "viewer")
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const members = await loadAccessMembers(spreadsheetId, service)
    return NextResponse.json({ members, role })
  } catch (error: any) {
    console.error("ACCESS GET ERROR:", error.response?.data || error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions)) as any
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { spreadsheetId, member } = body as {
    spreadsheetId?: string
    member?: AccessMember
  }
  const email = getEmail(session)

  if (!spreadsheetId || !member) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }
  if (!email) {
    return NextResponse.json({ error: "Missing user email" }, { status: 401 })
  }

  const service = new GoogleSheetsService(session.accessToken)

  try {
    const role = await requireAccess(spreadsheetId, service, email, "admin")
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const members = await upsertAccessMember(spreadsheetId, service, member)
    return NextResponse.json({ success: true, members })
  } catch (error: any) {
    console.error("ACCESS POST ERROR:", error.response?.data || error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = (await getServerSession(authOptions)) as any
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const spreadsheetId = searchParams.get("spreadsheetId")
  const targetEmail = searchParams.get("email")
  const email = getEmail(session)

  if (!spreadsheetId || !targetEmail) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }
  if (!email) {
    return NextResponse.json({ error: "Missing user email" }, { status: 401 })
  }

  const service = new GoogleSheetsService(session.accessToken)

  try {
    const role = await requireAccess(spreadsheetId, service, email, "admin")
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const members = await removeAccessMember(spreadsheetId, service, targetEmail)
    return NextResponse.json({ success: true, members })
  } catch (error: any) {
    console.error("ACCESS DELETE ERROR:", error.response?.data || error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
