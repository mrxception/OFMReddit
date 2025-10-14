import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  filename: string,
  folder = "admin-documents",
  accessMode: "public" | "authenticated" = "public",
): Promise<{ url: string; publicId: string }> {
  console.log(`[Cloudinary] Starting upload for ${filename}`)
  console.log(`[Cloudinary] Buffer size: ${fileBuffer.length} bytes`)
  console.log(`[Cloudinary] Folder: ${folder}, Access: ${accessMode}`)

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "raw",
        public_id: filename.replace(/\.[^/.]+$/, ""),
        use_filename: true,
        unique_filename: false,
        type: "upload",
        access_mode: accessMode,
      },
      (error, result) => {
        if (error) {
          console.error("[Cloudinary] Upload error:", error)
          reject(error)
        } else if (result) {
          console.log("[Cloudinary] Upload successful!")
          console.log("[Cloudinary] URL:", result.secure_url)
          console.log("[Cloudinary] Public ID:", result.public_id)
          console.log("[Cloudinary] Format:", result.format)
          console.log("[Cloudinary] Resource type:", result.resource_type)

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          })
        } else {
          reject(new Error("Upload failed: No result returned"))
        }
      },
    )

    uploadStream.on("error", (streamError) => {
      console.error("[Cloudinary] Stream error:", streamError)
      reject(streamError)
    })

    uploadStream.end(fileBuffer)
  })
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: "raw" })
}

export function generateSignedUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    resource_type: "raw",
    type: "upload",
    sign_url: true,
    secure: true,
  })
}

export { cloudinary }
