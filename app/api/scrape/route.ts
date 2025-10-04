import { type NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import crypto from "crypto"

const sessions = new Map<
  string,
  {
    phase: string
    fetched: number
    total: number
    done: boolean
  }
>()

const files = new Map<
  string,
  {
    buffer: Buffer
    filename: string
    createdAt: number
  }
>()

setInterval(() => {
  const now = Date.now()
  for (const [id, file] of files.entries()) {
    if (now - file.createdAt > 10 * 60 * 1000) {
      files.delete(id)
    }
  }
}, 60 * 1000)

interface RedditPost {
  data: {
    subreddit: string
    score: number
    num_comments: number
    created_utc: number
    title: string
  }
}

interface SubredditStats {
  subreddit: string
  totalPosts: number
  totalUpvotes: number
  totalComments: number
  posts: Array<{
    score: number
    comments: number
    created: number
  }>
  lastPostDate: number
}

interface RedditTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

interface RedditApiResponse {
  data: {
    children: RedditPost[]
    after: string | null
  }
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.REDDIT_CLIENT_ID
  const clientSecret = process.env.REDDIT_CLIENT_SECRET
  const refreshToken = process.env.REDDIT_REFRESH_TOKEN
  const userAgent = process.env.REDDIT_USER_AGENT

  if (!clientId || !clientSecret || !refreshToken || !userAgent) {
    throw new Error("Missing Reddit API credentials in .env file")
  }

  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authString}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  })

  if (!response.ok) {
    throw new Error(`Failed to obtain access token: ${response.statusText}`)
  }

  const data = (await response.json()) as RedditTokenResponse
  if (!data.access_token) {
    throw new Error("No access token received from Reddit API")
  }

  return data.access_token
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sid = searchParams.get("sid")
  const progress = searchParams.get("progress")
  const fileId = searchParams.get("id")

  if (sid && progress) {
    const session = sessions.get(sid)
    if (!session) {
      return NextResponse.json({
        phase: "Idle",
        fetched: 0,
        total: 0,
        done: false,
      })
    }
    return NextResponse.json(session)
  }

  if (fileId) {
    const file = files.get(fileId)
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${file.filename}"`,
      },
    })
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      username,
      limit = 1000,
      inclSubs = 0,
      inclVote = 0,
      inclComm = 0,
      inclPER = 0,
      inclExtraFreq = 0,
      inclMed = 0,
      format = "xlsx",
      sid,
    } = body

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    if (!sid) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    sessions.set(sid, {
      phase: "Fetching posts…",
      fetched: 0,
      total: limit,
      done: false,
    })

    let accessToken: string
    try {
      accessToken = await getAccessToken()
    } catch (error: any) {
      sessions.delete(sid)
      return NextResponse.json({ error: "Failed to authenticate with Reddit API" }, { status: 500 })
    }

    const posts: RedditPost[] = []
    let after: string | null = null
    const maxLimit = Math.min(limit, 1000)

    try {
      while (posts.length < maxLimit) {
        const batchSize = Math.min(100, maxLimit - posts.length)
        const url = `https://oauth.reddit.com/user/${username}/submitted.json?limit=${batchSize}${after ? `&after=${after}` : ""}`

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": process.env.REDDIT_USER_AGENT || "SubredditAnalyzer/1.0",
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            accessToken = await getAccessToken()
            const retryResponse = await fetch(url, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": process.env.REDDIT_USER_AGENT || "SubredditAnalyzer/1.0",
              },
            })
            if (!retryResponse.ok) {
              throw new Error(`Reddit API error after retry: ${retryResponse.statusText}`)
            }
            const retryData = (await retryResponse.json()) as RedditApiResponse
            const children = retryData?.data?.children || []

            if (children.length === 0) break

            posts.push(...children)

            sessions.set(sid, {
              phase: "Fetching posts…",
              fetched: posts.length,
              total: maxLimit,
              done: false,
            })

            after = retryData?.data?.after
            if (!after) break

            await new Promise((resolve) => setTimeout(resolve, 1000))
            continue
          } else if (response.status === 404) {
            throw new Error("User not found")
          } else {
            throw new Error(`Reddit API error: ${response.statusText} (${response.status})`)
          }
        }

        const data = (await response.json()) as RedditApiResponse
        const children = data?.data?.children || []

        if (children.length === 0) break

        posts.push(...children)

        sessions.set(sid, {
          phase: "Fetching posts…",
          fetched: posts.length,
          total: maxLimit,
          done: false,
        })

        after = data?.data?.after
        if (!after) break

        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    } catch (error: any) {
      sessions.delete(sid)
      return NextResponse.json({ error: error.message || "Failed to fetch Reddit data" }, { status: 500 })
    }

    sessions.set(sid, {
      phase: "Processing data…",
      fetched: posts.length,
      total: posts.length,
      done: false,
    })

    const subredditMap = new Map<string, SubredditStats>()

    for (const post of posts) {
      const subreddit = post.data.subreddit
      if (!subredditMap.has(subreddit)) {
        subredditMap.set(subreddit, {
          subreddit,
          totalPosts: 0,
          totalUpvotes: 0,
          totalComments: 0,
          posts: [],
          lastPostDate: 0,
        })
      }

      const stats = subredditMap.get(subreddit)!
      stats.totalPosts++
      stats.totalUpvotes += post.data.score
      stats.totalComments += post.data.num_comments
      stats.posts.push({
        score: post.data.score,
        comments: post.data.num_comments,
        created: post.data.created_utc,
      })
      stats.lastPostDate = Math.max(stats.lastPostDate, post.data.created_utc)
    }

    const subredditStats = Array.from(subredditMap.values()).map((stats) => {
      const avgUpvotes = stats.totalPosts > 0 ? stats.totalUpvotes / stats.totalPosts : 0
      const avgComments = stats.totalPosts > 0 ? stats.totalComments / stats.totalPosts : 0

      const sortedScores = stats.posts.map((p) => p.score).sort((a, b) => a - b)
      const medianUpvotes =
        sortedScores.length > 0
          ? sortedScores.length % 2 === 0
            ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
            : sortedScores[Math.floor(sortedScores.length / 2)]
          : 0

      return {
        Subreddit: stats.subreddit,
        Total_Posts: stats.totalPosts,
        Avg_Upvotes_Per_Post: Math.round(avgUpvotes * 100) / 100,
        Avg_Comments_Per_Post: Math.round(avgComments * 100) / 100,
        Median_Upvotes: Math.round(medianUpvotes * 100) / 100,
        Total_Upvotes: stats.totalUpvotes,
        Total_Comments: stats.totalComments,
        LastDateTimeUTC: new Date(stats.lastPostDate * 1000).toISOString(),
      }
    })

    subredditStats.sort((a, b) => b.Avg_Upvotes_Per_Post - a.Avg_Upvotes_Per_Post)

    const allDates = posts.map((p) => p.data.created_utc)
    const minDate = Math.min(...allDates)
    const maxDate = Math.max(...allDates)
    const datasetSpanDays = Math.ceil((maxDate - minDate) / (60 * 60 * 24))

    const previewTop10 = subredditStats.slice(0, 10) 

    sessions.set(sid, {
      phase: "Generating Excel file…",
      fetched: posts.length,
      total: posts.length,
      done: false,
    })

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Subreddit Analysis")

    const columns: any[] = [
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

    worksheet.columns = columns

    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    }

    subredditStats.forEach((stat) => {
      worksheet.addRow(stat)
    })

    const buffer = await workbook.xlsx.writeBuffer()

    const fileId = crypto.randomUUID()
    const filename = `${username}_subreddit_analysis.xlsx`

    files.set(fileId, {
      buffer: Buffer.from(buffer),
      filename,
      createdAt: Date.now(),
    })

    sessions.set(sid, {
      phase: "Complete",
      fetched: posts.length,
      total: posts.length,
      done: true,
    })

    return NextResponse.json({
      datasetSpanDays,
      previewTop10, 
      preview: subredditStats, 
      files: [{ id: fileId, filename }],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sid = searchParams.get("sid")
  const fileId = searchParams.get("id")

  if (sid) {
    sessions.delete(sid)
    return NextResponse.json({ success: true })
  }

  if (fileId) {
    files.delete(fileId)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 })
}