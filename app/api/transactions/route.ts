import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"
import { GoogleSheetsService } from "@/lib/google-sheets"
import { authOptions } from "@/lib/auth"

export async function GET(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getServerSession(authOptions) as any
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const monthYear = searchParams.get("monthYear") || new Date().toLocaleString('en-GB', { month: '2-digit', year: 'numeric' }).replace('/', '-')
  const customSpreadsheetId = searchParams.get("spreadsheetId")

  const service = new GoogleSheetsService(session.accessToken)
  
  try {
    const spreadsheetId = customSpreadsheetId || await service.getOrCreateSpreadsheet()
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
  const service = new GoogleSheetsService(session.accessToken)
  
  try {
    const spreadsheetId = customSpreadsheetId || await service.getOrCreateSpreadsheet()
    console.log("Using Spreadsheet ID:", spreadsheetId)
    
    const date = new Date(body.date)
    const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
    
    await service.appendTransaction(spreadsheetId!, monthYear, body)
    return NextResponse.json({ success: true })
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

  if (!monthYear || isNaN(rowIndex) || !transaction) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
  }

  const service = new GoogleSheetsService(session.accessToken)
  
  try {
    const spreadsheetId = customSpreadsheetId || await service.getOrCreateSpreadsheet()
    await service.updateTransaction(spreadsheetId!, monthYear, rowIndex, transaction)
    return NextResponse.json({ success: true })
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

  if (!monthYear || isNaN(rowIndex)) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
  }

  const service = new GoogleSheetsService(session.accessToken)
  
  try {
    const spreadsheetId = customSpreadsheetId || await service.getOrCreateSpreadsheet()
    await service.deleteTransaction(spreadsheetId!, monthYear, rowIndex)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("GOOGLE API DELETE ERROR:", error.response?.data || error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
