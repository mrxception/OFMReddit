import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/auth"
import { query } from "@/lib/db"
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary"

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyAdminToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const promptName = formData.get("promptName") as string

    if (!file || !promptName) {
      return NextResponse.json({ error: "File and prompt name are required" }, { status: 400 })
    }

    
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only PDF and DOC/DOCX files are allowed" }, { status: 400 })
    }

    
    const promptResult = await query<{ id: number }>("SELECT id FROM prompts WHERE name = ?", [promptName])
    if (promptResult.length === 0) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 })
    }
    const promptId = promptResult[0].id

    
    const buffer = Buffer.from(await file.arrayBuffer())
    const { url, publicId } = await uploadToCloudinary(buffer, file.name)

    
    const result = await query(
      `INSERT INTO documents (prompt_id, filename, original_filename, cloudinary_url, cloudinary_public_id, file_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [promptId, file.name, file.name, url, publicId, file.type, file.size],
    )

    const document = {
      id: (result as any).insertId,
      promptId,
      filename: file.name,
      originalFilename: file.name,
      cloudinaryUrl: url,
      cloudinaryPublicId: publicId,
      fileType: file.type,
      fileSize: file.size,
    }

    return NextResponse.json({ document })
  } catch (error: any) {
    console.error("Error uploading document:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyAdminToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get("id")

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    
    const docs = await query<{ cloudinary_public_id: string }>(
      "SELECT cloudinary_public_id FROM documents WHERE id = ?",
      [documentId],
    )

    if (docs.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    
    await deleteFromCloudinary(docs[0].cloudinary_public_id)

    
    await query("DELETE FROM documents WHERE id = ?", [documentId])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting document:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
