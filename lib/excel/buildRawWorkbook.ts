import ExcelJS from "exceljs"

export interface RawPostRow {
  Subreddit: string
  Upvotes: number
  Comments: number
  LastDate: Date
}

export async function buildRawWorkbook(
  rows: RawPostRow[],
  username: string
): Promise<{ buffer: Buffer; filename: string }> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Raw Subreddit Data")

  worksheet.columns = [
    { header: "Subreddit", key: "Subreddit", width: 25 },
    { header: "Upvotes", key: "Upvotes", width: 12 },
    { header: "Comments", key: "Comments", width: 12 },
    { header: "Last Post Date (UTC)", key: "LastDate", width: 24 },
  ] as any

  worksheet.getColumn("LastDate").numFmt = "yyyy-mm-dd hh:mm:ss"
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }

  rows.forEach((r) => worksheet.addRow(r))

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const filename = `${username}_subreddit_rawdata.xlsx`

  return { buffer, filename }
}
