import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"
import { GoogleSheetsService } from "@/lib/google-sheets"
import { authOptions } from "@/lib/auth"
import { requireAccess } from "@/lib/access-control"

function getEmail(session: unknown) {
  const user = (session as { user?: { name?: string | null; email?: string | null } })?.user
  return user?.email || null
}

export async function GET(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getServerSession(authOptions) as any
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const monthYear = searchParams.get("monthYear") || new Date().toLocaleString('en-GB', { month: '2-digit', year: 'numeric' }).replace('/', '-')
  const customSpreadsheetId = searchParams.get("spreadsheetId")
  const email = getEmail(session)
  if (!email) {
    return NextResponse.json({ error: "Missing user email" }, { status: 401 })
  }

  const service = new GoogleSheetsService(session.accessToken)
  
  try {
    const spreadsheetId = customSpreadsheetId || await service.getOrCreateSpreadsheet()
    const role = await requireAccess(spreadsheetId!, service, email, "viewer")
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const transactions = await service.getTransactions(spreadsheetId!, monthYear)
    return NextResponse.json({ transactions, spreadsheetId })
  } catch (error: any) {
    console.error("GOOGLE API GET ERROR:", error.response?.data || error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getServerSession(authOptions) as any
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { spreadsheetId: customSpreadsheetId } = body
  const email = getEmail(session)
  if (!email) {
    return NextResponse.json({ error: "Missing user email" }, { status: 401 })
  }
  const service = new GoogleSheetsService(session.accessToken)
  
  try {
    const spreadsheetId = customSpreadsheetId || await service.getOrCreateSpreadsheet()
    console.log("Using Spreadsheet ID:", spreadsheetId)
    const role = await requireAccess(spreadsheetId!, service, email, "editor")
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    
    const date = new Date(body.date)
    const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
    const actor = email
    
    const savedTransaction = await service.appendTransaction(spreadsheetId!, monthYear, {
      ...body,
      createdBy: actor,
      updatedBy: actor,
    })
    return NextResponse.json({ success: true, transaction: savedTransaction })
  } catch (error: any) {
    console.error("GOOGLE API POST ERROR:", error.response?.data || error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getServerSession(authOptions) as any
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { monthYear, rowIndex, transaction, spreadsheetId: customSpreadsheetId } = body
  const email = getEmail(session)
  if (!email) {
    return NextResponse.json({ error: "Missing user email" }, { status: 401 })
  }

  if (!monthYear || isNaN(rowIndex) || !transaction) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
  }

  const service = new GoogleSheetsService(session.accessToken)
  
  try {
    const spreadsheetId = customSpreadsheetId || await service.getOrCreateSpreadsheet()
    const role = await requireAccess(spreadsheetId!, service, email, "editor")
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const actor = email
    const savedTransaction = await service.updateTransaction(spreadsheetId!, monthYear, rowIndex, {
      ...transaction,
      updatedBy: actor,
      createdBy: transaction.createdBy || actor,
    })
    return NextResponse.json({ success: true, transaction: savedTransaction })
  } catch (error: any) {
    console.error("GOOGLE API PUT ERROR:", error.response?.data || error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getServerSession(authOptions) as any
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const monthYear = searchParams.get("monthYear")
  const rowIndex = parseInt(searchParams.get("rowIndex") || "")
  const customSpreadsheetId = searchParams.get("spreadsheetId")
  const email = getEmail(session)
  if (!email) {
    return NextResponse.json({ error: "Missing user email" }, { status: 401 })
  }

  if (!monthYear || isNaN(rowIndex)) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
  }

  const service = new GoogleSheetsService(session.accessToken)
  
  try {
    const spreadsheetId = customSpreadsheetId || await service.getOrCreateSpreadsheet()
    const role = await requireAccess(spreadsheetId!, service, email, "editor")
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await service.deleteTransaction(spreadsheetId!, monthYear, rowIndex)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("GOOGLE API DELETE ERROR:", error.response?.data || error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
