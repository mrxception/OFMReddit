import ExcelJS from "exceljs"

export interface SubredditRow {
  Subreddit: string
  Total_Posts: number
  Avg_Upvotes_Per_Post: number
  Avg_Comments_Per_Post: number
  Median_Upvotes?: number
  Total_Upvotes?: number
  Total_Comments?: number
  LastDateTimeUTC: string
}

export interface BuildWorkbookOptions {
  username: string
  inclMed?: number | boolean
  inclVote?: number | boolean
  inclComm?: number | boolean
}

export async function buildWorkbook(
  rows: SubredditRow[],
  { username, inclMed = 0, inclVote = 0, inclComm = 0 }: BuildWorkbookOptions
): Promise<{ buffer: Buffer; filename: string }> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Subreddit Analysis")

  const columns: Array<{ header: string; key: keyof SubredditRow | string; width: number }> = [
    { header: "Subreddit", key: "Subreddit", width: 25 },
    { header: "Total Posts", key: "Total_Posts", width: 15 },
    { header: "Avg Upvotes Per Post", key: "Avg_Upvotes_Per_Post", width: 20 },
    { header: "Avg Comments Per Post", key: "Avg_Comments_Per_Post", width: 22 },
  ]

  if (inclMed) {
    columns.push({ header: "Median Upvotes", key: "Median_Upvotes", width: 18 })
  }
  if (inclVote) {
    columns.push({ header: "Total Upvotes", key: "Total_Upvotes", width: 18 })
  }
  if (inclComm) {
    columns.push({ header: "Total Comments", key: "Total_Comments", width: 18 })
  }

  columns.push({ header: "Last Post Date (UTC)", key: "LastDateTimeUTC", width: 22 })
  worksheet.columns = columns as any

  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }

  rows.forEach((r) => worksheet.addRow(r))

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const filename = `${username}_subreddit_analysis.xlsx`

  return { buffer, filename }
}
