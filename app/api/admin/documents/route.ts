import { type NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { query } from "@/lib/db";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAdminToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const promptName = formData.get("promptName") as string;

    if (!file || !promptName) {
      return NextResponse.json({ error: "File and prompt name are required" }, { status: 400 });
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only PDF and DOC/DOCX files are allowed" }, { status: 400 });
    }

    console.log(`[Document Upload] File: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes`);

    const promptResult = await query<{ id: number }>("SELECT id FROM prompts WHERE name = ?", [promptName]);
    if (promptResult.length === 0) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }
    const promptId = promptResult[0].id;

    console.log(`[Document Upload] Prompt ID: ${promptId}`);

    const buffer = Buffer.from(await file.arrayBuffer());

    console.log(`[Document Upload] Uploading to Cloudinary...`);

    const { url, publicId } = await uploadToCloudinary(buffer, file.name, "admin-documents", "public");

    console.log(`[Document Upload] Cloudinary URL: ${url}`);
    console.log(`[Document Upload] Cloudinary Public ID: ${publicId}`);

    console.log(`[Document Upload] Inserting into database...`);

    const result = await query(
      `INSERT INTO documents (prompt_id, filename, original_filename, cloudinary_url, cloudinary_public_id, file_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [promptId, file.name, file.name, url, publicId, file.type, file.size],
    );

    const documentId = (result as any).insertId;

    console.log(`[Document Upload] Document ID: ${documentId}`);

    const verifyResult = await query("SELECT * FROM documents WHERE id = ?", [documentId]);
    console.log(`[Document Upload] Verification - Document in DB:`, verifyResult);

    const document = {
      id: documentId,
      promptId,
      filename: file.name,
      originalFilename: file.name,
      cloudinaryUrl: url,
      cloudinaryPublicId: publicId,
      fileType: file.type,
      fileSize: file.size,
    };

    console.log(`[Document Upload] Successfully uploaded ${file.name} with ID ${documentId}`);

    return NextResponse.json({ document });
  } catch (error: any) {
    console.error("Error uploading document:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAdminToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    const docs = await query<{ cloudinary_public_id: string }>(
      "SELECT cloudinary_public_id FROM documents WHERE id = ?",
      [documentId],
    );

    if (docs.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await deleteFromCloudinary(docs[0].cloudinary_public_id);

    await query("DELETE FROM document_pages WHERE document_id = ?", [documentId]);

    await query("DELETE FROM documents WHERE id = ?", [documentId]);

    console.log(`[Document Delete] Deleted document ${documentId} and its indexed pages`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}