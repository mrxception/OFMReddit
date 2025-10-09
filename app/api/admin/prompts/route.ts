import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyAdminToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const prompts = await query("SELECT * FROM prompts")

    
    const promptsWithDocs = await Promise.all(
      prompts.map(async (prompt: any) => {
        const documents = await query(
          `SELECT id, filename, original_filename as originalFilename, 
           cloudinary_url as cloudinaryUrl, file_type as fileType, 
           file_size as fileSize, created_at as createdAt 
           FROM documents WHERE prompt_id = ?`,
          [prompt.id],
        )
        return {
          ...prompt,
          documents: documents || [],
        }
      }),
    )

    return NextResponse.json({ prompts: promptsWithDocs })
  } catch (error: any) {
    console.error("Error fetching prompts:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyAdminToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { name, promptText, description } = body

    if (!name || !promptText) {
      return NextResponse.json({ error: "Name and prompt text are required" }, { status: 400 })
    }

    await query("UPDATE prompts SET prompt_text = ?, description = ?, updated_at = NOW() WHERE name = ?", [
      promptText,
      description || null,
      name,
    ])

    const updatedPrompt = await queryOne("SELECT * FROM prompts WHERE name = ?", [name])

    return NextResponse.json({ prompt: updatedPrompt })
  } catch (error: any) {
    console.error("Error updating prompt:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
