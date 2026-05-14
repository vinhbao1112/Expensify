import { google, sheets_v4, drive_v3 } from "googleapis"
import { OAuth2Client } from "google-auth-library"
import { Transaction } from "./types"

export class GoogleSheetsService {
  private auth: OAuth2Client;
  private sheets: sheets_v4.Sheets;
  private drive: drive_v3.Drive;

  constructor(accessToken: string) {
    this.auth = new google.auth.OAuth2()
    this.auth.setCredentials({ access_token: accessToken })
    this.sheets = google.sheets({ version: "v4", auth: this.auth })
    this.drive = google.drive({ version: "v3", auth: this.auth })
  }

  /**
   * Find the Expensify spreadsheet or create it
   */
  async getOrCreateSpreadsheet() {
    const fileName = "Expensify Management Data"
    
    // 1. Search for existing file
    const response = await this.drive.files.list({
      q: `name = '${fileName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
      fields: "files(id, name)",
      pageSize: 1
    })

    const files = response.data.files
    if (files && files.length > 0) {
      return files[0].id
    }

    // 2. Create new spreadsheet if not found
    const spreadsheet = await this.sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: fileName
        }
      }
    })

    return spreadsheet.data.spreadsheetId
  }

  /**
   * Ensure a month tab exists
   */
  async ensureMonthSheet(spreadsheetId: string, monthYear: string) {
    const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId })
    const sheetExists = spreadsheet.data.sheets?.some(
      s => s.properties?.title === monthYear
    )

    if (!sheetExists) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: monthYear }
              }
            }
          ]
        }
      })

      // Add Headers to new sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${monthYear}!A1:H1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [["ID", "Ngày", "Loại", "Danh mục", "Số tiền", "Mục đích", "Ghi chú", "Thời gian tạo"]]
        }
      })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async appendTransaction(spreadsheetId: string, monthYear: string, transaction: Transaction) {
    await this.ensureMonthSheet(spreadsheetId, monthYear)
    
    const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId })
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === monthYear)?.properties?.sheetId

    if (sheetId === undefined || sheetId === null) {
      throw new Error(`Sheet for ${monthYear} not found`)
    }

    // Insert an empty row at index 1 (Row 2) to keep newest at top
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
                endIndex: 2
              },
              inheritFromBefore: false
            }
          }
        ]
      }
    })

    const range = `${monthYear}!A2:H2`
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          Date.now().toString(),
          transaction.date,
          transaction.type,
          transaction.category,
          transaction.amount,
          transaction.purpose,
          transaction.note,
          new Date().toISOString()
        ]]
      }
    })
  }

  private parseAmount(raw: unknown): number {
    if (raw === null || raw === undefined || raw === "") return 0
    const cleaned = raw.toString().replace(/\./g, "").replace(/,/g, "").trim()
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }

  async getTransactions(spreadsheetId: string, monthYear: string) {
    try {
      // Ensure the sheet for this month exists before trying to read it
      await this.ensureMonthSheet(spreadsheetId, monthYear)

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${monthYear}'!A:H`
      })
      
      const rows = response.data.values || []
      if (rows.length <= 1) return [] // Only headers

      return rows.slice(1).map((row, index) => ({
        id: row[0] ?? "",
        date: row[1] ?? "",
        type: row[2] as "income" | "expense",
        category: row[3] ?? "Khác",
        amount: this.parseAmount(row[4]),
        purpose: row[5] ?? "",
        note: row[6] ?? "",
        createdAt: row[7] ?? "",
        rowIndex: index + 1
      })) as Transaction[]
    } catch (error) {
      console.error("Error fetching transactions:", error)
      return []
    }
  }

  async deleteTransaction(spreadsheetId: string, monthYear: string, rowIndex: number) {
    // Note: rowIndex here is relative to the data (0-based after header)
    // In Google Sheets, rows are 1-based.
    // Header is row 1. First data is row 2.
    const actualRowIndex = rowIndex + 1 

    const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId })
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === monthYear)?.properties?.sheetId

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
                endIndex: actualRowIndex + 1
              }
            }
          }
        ]
      }
    })
  }

  async updateTransaction(spreadsheetId: string, monthYear: string, rowIndex: number, transaction: Transaction) {
    const actualRowIndex = rowIndex + 1
    const range = `'${monthYear}'!A${actualRowIndex}:G${actualRowIndex}` 
    
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          transaction.id,
          transaction.date,
          transaction.type,
          transaction.category,
          transaction.amount,
          transaction.purpose,
          transaction.note
        ]]
      }
    })
  }

  async getAllTimeTotals(spreadsheetId: string) {
    try {
      const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId })
      const sheetTitles = spreadsheet.data.sheets?.map(s => s.properties?.title).filter(Boolean) as string[] || []
      
      let totalIncome = 0
      let totalExpense = 0

      // We can fetch multiple ranges at once using batchGet
      const response = await this.sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: sheetTitles.map(title => `'${title}'!A:E`) 
      })

      const valueRanges = response.data.valueRanges || []
      valueRanges.forEach((range) => {
        const rows = range.values || []
        if (rows.length <= 1) return // Only headers or empty

        rows.slice(1).forEach(row => {
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

  async clearMonthData(spreadsheetId: string, monthYear: string) {
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${monthYear}'!A2:Z`,
      requestBody: {},
    })
  }

  async clearAllData(spreadsheetId: string) {
    const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId })
    const sheetTitles = spreadsheet.data.sheets?.map(s => s.properties?.title).filter(Boolean) as string[] || []

    for (const title of sheetTitles) {
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `'${title}'!A2:Z`,
        requestBody: {},
      })
    }
  }
}
