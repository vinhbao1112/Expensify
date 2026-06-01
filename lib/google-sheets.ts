import { google, sheets_v4, drive_v3 } from "googleapis"
import { OAuth2Client } from "google-auth-library"
import { Transaction } from "./types"

export class GoogleSheetsService {
  private auth: OAuth2Client
  private sheets: sheets_v4.Sheets
  private drive: drive_v3.Drive
  private spreadsheetCache = new Map<string, Promise<any>>()

  constructor(accessToken: string) {
    this.auth = new google.auth.OAuth2()
    this.auth.setCredentials({ access_token: accessToken })
    this.sheets = google.sheets({ version: "v4", auth: this.auth })
    this.drive = google.drive({ version: "v3", auth: this.auth })
  }

  async getSpreadsheet(spreadsheetId: string) {
    const cached = this.spreadsheetCache.get(spreadsheetId)
    if (cached) return cached

    const request = this.sheets.spreadsheets.get({ spreadsheetId })
    this.spreadsheetCache.set(spreadsheetId, request)
    return request
  }

  async batchUpdate(
    spreadsheetId: string,
    requestBody: sheets_v4.Schema$BatchUpdateSpreadsheetRequest,
  ) {
    const response = await this.sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody })
    this.spreadsheetCache.delete(spreadsheetId)
    return response
  }

  async valuesGet(spreadsheetId: string, range: string) {
    return this.sheets.spreadsheets.values.get({ spreadsheetId, range })
  }

  async valuesUpdate(
    spreadsheetId: string,
    range: string,
    values: unknown[][],
    valueInputOption: "RAW" | "USER_ENTERED" = "USER_ENTERED",
  ) {
    return this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption,
      requestBody: { values },
    })
  }

  async valuesClear(spreadsheetId: string, range: string) {
    return this.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
      requestBody: {},
    })
  }

  private isSampleValue(value: unknown) {
    const normalized = String(value ?? "").trim().toLowerCase()
    return normalized === "có" || normalized === "co" || normalized === "true" || normalized === "1"
  }

  /**
   * Find the Expensify spreadsheet or create it
   */
  async getOrCreateSpreadsheet() {
    const fileName = "Expensify Management Data"

    const response = await this.drive.files.list({
      q: `name = '${fileName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
      fields: "files(id, name)",
      pageSize: 1,
    })

    const files = response.data.files
    if (files && files.length > 0) {
      return files[0].id
    }

    const spreadsheet = await this.sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: fileName,
        },
      },
    })

    return spreadsheet.data.spreadsheetId
  }

  /**
   * Ensure a month tab exists
   */
  async ensureMonthSheet(spreadsheetId: string, monthYear: string) {
    const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId })
    const sheetExists = spreadsheet.data.sheets?.some(
      (s) => s.properties?.title === monthYear,
    )

    if (!sheetExists) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: monthYear },
              },
            },
          ],
        },
      })

      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${monthYear}!A1:L1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            "ID",
            "NgÃ y",
            "Loáº¡i",
            "Danh má»¥c",
            "Sá»‘ tiá»n",
            "Má»¥c Ä‘Ã­ch",
            "Ghi chÃº",
            "Thá»i gian táº¡o",
            "ÄÃ­nh kÃ¨m",
            "NgÆ°á»i táº¡o",
            "NgÆ°á»i sá»­a",
            "Dá»¯ liá»‡u máº«u",
          ]],
        },
      })
    }
  }

  async appendTransaction(
    spreadsheetId: string,
    monthYear: string,
    transaction: Transaction,
  ) {
    const transactionId = transaction.id || Date.now().toString()
    const savedTransaction: Transaction = {
      ...transaction,
      id: transactionId,
      createdAt: transaction.createdAt || new Date().toISOString(),
      rowIndex: 1,
    }

    await this.ensureMonthSheet(spreadsheetId, monthYear)

    const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId })
    const sheetId = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === monthYear,
    )?.properties?.sheetId

    if (sheetId === undefined || sheetId === null) {
      throw new Error(`Sheet for ${monthYear} not found`)
    }

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: 1,
                endIndex: 2,
              },
              inheritFromBefore: false,
            },
          },
        ],
      },
    })

    const range = `${monthYear}!A2:L2`
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          savedTransaction.id,
          savedTransaction.date,
          savedTransaction.type,
          savedTransaction.category,
          savedTransaction.amount,
          savedTransaction.purpose,
          savedTransaction.note,
          savedTransaction.createdAt,
          savedTransaction.attachment || "",
          savedTransaction.createdBy || "",
          savedTransaction.updatedBy || "",
          savedTransaction.isSample ? "Có" : "",
        ]],
      },
    })

    return savedTransaction
  }

  private parseAmount(raw: unknown): number {
    if (raw === null || raw === undefined || raw === "") return 0
    const cleaned = raw.toString().replace(/\./g, "").replace(/,/g, "").trim()
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }

  async getTransactions(spreadsheetId: string, monthYear: string) {
    try {
      await this.ensureMonthSheet(spreadsheetId, monthYear)

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${monthYear}'!A:L`,
      })

      const rows = response.data.values || []
      if (rows.length <= 1) return []

      return rows.slice(1).map((row, index) => ({
        id: row[0] ?? "",
        date: row[1] ?? "",
        type: row[2] as "income" | "expense",
        category: row[3] ?? "KhÃ¡c",
        amount: this.parseAmount(row[4]),
        purpose: row[5] ?? "",
        note: row[6] ?? "",
        createdAt: row[7] ?? "",
        attachment: row[8] ?? "",
        createdBy: row[9] ?? "",
        updatedBy: row[10] ?? "",
        isSample: row[11] === "Có" || row[11] === "true" || row[11] === "1",
        rowIndex: index + 1,
      })) as Transaction[]
    } catch (error) {
      console.error("Error fetching transactions:", error)
      return []
    }
  }

  async deleteTransaction(spreadsheetId: string, monthYear: string, rowIndex: number) {
    const actualRowIndex = rowIndex + 1

    const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId })
    const sheetId = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === monthYear,
    )?.properties?.sheetId

    if (sheetId === undefined || sheetId === null) {
      throw new Error(`Sheet for ${monthYear} not found`)
    }

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: actualRowIndex,
                endIndex: actualRowIndex + 1,
              },
            },
          },
        ],
      },
    })
  }

  async deleteSampleTransactions(spreadsheetId: string) {
    const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId })
    const sheets = spreadsheet.data.sheets || []

    for (const sheet of sheets) {
      const title = sheet.properties?.title
      const sheetId = sheet.properties?.sheetId
      if (!title || sheetId === undefined || sheetId === null) continue

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${title}'!A:L`,
      })

      const rows = response.data.values || []
      if (rows.length <= 1) continue

      const sampleRowIndexes = rows
        .slice(1)
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => this.isSampleValue(row[11]))
        .map(({ index }) => index)
        .sort((left, right) => right - left)

      for (const dataRowIndex of sampleRowIndexes) {
        const actualRowIndex = dataRowIndex + 1
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId,
                    dimension: "ROWS",
                    startIndex: actualRowIndex,
                    endIndex: actualRowIndex + 1,
                  },
                },
              },
            ],
          },
        })
      }
    }
  }

  async updateTransaction(
    spreadsheetId: string,
    monthYear: string,
    rowIndex: number,
    transaction: Transaction,
  ) {
    const actualRowIndex = rowIndex + 1
    const range = `'${monthYear}'!A${actualRowIndex}:K${actualRowIndex}`
    const savedTransaction: Transaction = {
      ...transaction,
      createdAt: transaction.createdAt || new Date().toISOString(),
      rowIndex,
    }

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          savedTransaction.id,
          savedTransaction.date,
          savedTransaction.type,
          savedTransaction.category,
          savedTransaction.amount,
          savedTransaction.purpose,
          savedTransaction.note,
          savedTransaction.createdAt,
          savedTransaction.attachment || "",
          savedTransaction.createdBy || "",
          savedTransaction.updatedBy || "",
          savedTransaction.isSample ? "Có" : "",
        ]],
      },
    })

    return savedTransaction
  }

  async getAllTimeTotals(spreadsheetId: string) {
    try {
      const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId })
      const sheetTitles =
        (spreadsheet.data.sheets?.map((s) => s.properties?.title).filter(Boolean) as string[]) ||
        []

      let totalIncome = 0
      let totalExpense = 0

      const response = await this.sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: sheetTitles.map((title) => `'${title}'!A:E`),
      })

      const valueRanges = response.data.valueRanges || []
      valueRanges.forEach((range) => {
        const rows = range.values || []
        if (rows.length <= 1) return

        rows.slice(1).forEach((row) => {
          const type = row[2]
          const amount = this.parseAmount(row[4])
          if (type === "income") totalIncome += amount
          else if (type === "expense") totalExpense += amount
        })
      })

      return { income: totalIncome, expense: totalExpense }
    } catch (error) {
      console.error("Error calculating all time totals:", error)
      return { income: 0, expense: 0 }
    }
  }

  async getAllTransactions(spreadsheetId: string) {
    try {
      const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId })
      const sheetTitles =
        (spreadsheet.data.sheets?.map((s) => s.properties?.title).filter(Boolean) as string[]) ||
        []

      if (sheetTitles.length === 0) return []

      const response = await this.sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: sheetTitles.map((title) => `'${title}'!A:L`),
      })

      const valueRanges = response.data.valueRanges || []
      const allTransactions: Transaction[] = []

      valueRanges.forEach((range) => {
        const rows = range.values || []
        if (rows.length <= 1) return

        rows.slice(1).forEach((row, rowIndex) => {
          allTransactions.push({
            id: row[0] ?? "",
            date: row[1] ?? "",
            type: row[2] as "income" | "expense",
            category: row[3] ?? "Khác",
            amount: this.parseAmount(row[4]),
            purpose: row[5] ?? "",
            note: row[6] ?? "",
            createdAt: row[7] ?? "",
            attachment: row[8] ?? "",
            createdBy: row[9] ?? "",
            updatedBy: row[10] ?? "",
            isSample: row[11] === "Có" || row[11] === "true" || row[11] === "1",
            rowIndex: rowIndex + 1,
          })
        })
      })

      return allTransactions
    } catch (error) {
      console.error("Error fetching all transactions:", error)
      return []
    }
  }

  async clearMonthData(spreadsheetId: string, monthYear: string) {
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${monthYear}'!A2:Z`,
      requestBody: {},
    })
  }

  async clearAllData(spreadsheetId: string) {
    const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId })
    const sheetTitles =
      (spreadsheet.data.sheets?.map((s) => s.properties?.title).filter(Boolean) as string[]) ||
      []

    for (const title of sheetTitles) {
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `'${title}'!A2:Z`,
        requestBody: {},
      })
    }
  }
}
