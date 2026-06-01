import { GoogleSheetsService } from "./google-sheets"

export type AccessRole = "viewer" | "editor" | "admin"

export interface AccessMember {
  email: string
  role: AccessRole
  addedAt?: string
  updatedAt?: string
}

const ACL_SHEET_TITLE = "Expensify_ACL"
const ROLE_ORDER: Record<AccessRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function compareAccessRole(left: AccessRole, right: AccessRole) {
  return ROLE_ORDER[left] - ROLE_ORDER[right]
}

export async function ensureAccessSheet(spreadsheetId: string, service: GoogleSheetsService) {
  const spreadsheet: any = await service.getSpreadsheet(spreadsheetId)
  const exists = spreadsheet.data.sheets?.some((sheet: any) => sheet.properties?.title === ACL_SHEET_TITLE)

  if (!exists) {
    await service.batchUpdate(spreadsheetId, {
      requests: [
        {
          addSheet: {
            properties: { title: ACL_SHEET_TITLE },
          },
        },
      ],
    })

    await service.valuesUpdate(spreadsheetId, `${ACL_SHEET_TITLE}!A1:C1`, [["Email", "Role", "Added At"]])
  }
}

export async function loadAccessMembers(spreadsheetId: string, service: GoogleSheetsService) {
  await ensureAccessSheet(spreadsheetId, service)

  const response = await service.valuesGet(spreadsheetId, `${ACL_SHEET_TITLE}!A:C`)

  const rows = response.data.values || []
  if (rows.length <= 1) return [] as AccessMember[]

  return rows.slice(1).map((row) => ({
    email: normalizeEmail(row[0] ?? ""),
    role: (row[1] ?? "viewer") as AccessRole,
    addedAt: row[2] ?? "",
  })) as AccessMember[]
}

export async function saveAccessMembers(
  spreadsheetId: string,
  service: GoogleSheetsService,
  members: AccessMember[],
) {
  await ensureAccessSheet(spreadsheetId, service)
  await service.valuesClear(spreadsheetId, `${ACL_SHEET_TITLE}!A:C`)

  const values = [
    ["Email", "Role", "Added At"],
    ...members.map((member) => [
      normalizeEmail(member.email),
      member.role,
      member.addedAt || new Date().toISOString(),
    ]),
  ]

  await service.valuesUpdate(spreadsheetId, `${ACL_SHEET_TITLE}!A1:C${values.length}`, values)
}

export async function ensureCurrentUserAdmin(
  spreadsheetId: string,
  service: GoogleSheetsService,
  email: string,
) {
  const members = await loadAccessMembers(spreadsheetId, service)
  const normalizedEmail = normalizeEmail(email)
  const existing = members.find((member) => member.email === normalizedEmail)

  if (!existing && members.length === 0) {
    const nextMembers: AccessMember[] = [
      {
        email: normalizedEmail,
        role: "admin",
        addedAt: new Date().toISOString(),
      },
    ]
    await saveAccessMembers(spreadsheetId, service, nextMembers)
    return { members: nextMembers, role: "admin" as AccessRole }
  }

  return {
    members,
    role: existing?.role || null,
  }
}

export async function getCurrentUserRole(
  spreadsheetId: string,
  service: GoogleSheetsService,
  email: string,
) {
  const bootstrap = await ensureCurrentUserAdmin(spreadsheetId, service, email)
  return bootstrap.role
}

export async function requireAccess(
  spreadsheetId: string,
  service: GoogleSheetsService,
  email: string,
  minimumRole: AccessRole = "viewer",
) {
  const role = await getCurrentUserRole(spreadsheetId, service, email)
  if (!role) return null

  if (compareAccessRole(role, minimumRole) < 0) {
    return null
  }

  return role
}

export async function upsertAccessMember(
  spreadsheetId: string,
  service: GoogleSheetsService,
  member: AccessMember,
) {
  const members = await loadAccessMembers(spreadsheetId, service)
  const normalizedEmail = normalizeEmail(member.email)
  const nextMembers = members.filter((item) => item.email !== normalizedEmail)

  nextMembers.push({
    email: normalizedEmail,
    role: member.role,
    addedAt: member.addedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  await saveAccessMembers(spreadsheetId, service, nextMembers)
  return nextMembers
}

export async function removeAccessMember(
  spreadsheetId: string,
  service: GoogleSheetsService,
  email: string,
) {
  const members = await loadAccessMembers(spreadsheetId, service)
  const normalizedEmail = normalizeEmail(email)
  const nextMembers = members.filter((item) => item.email !== normalizedEmail)
  await saveAccessMembers(spreadsheetId, service, nextMembers)
  return nextMembers
}
