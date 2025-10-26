import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { query } from "@/lib/db"
import { DOMParser } from "@xmldom/xmldom"

function detectAttachedFiles(body: any): { hasFiles: boolean; files: string[] } {
  const files: string[] = []

  if (body.attachments && Array.isArray(body.attachments)) {
    body.attachments.forEach((attachment: any) => {
      if (attachment.name) {
        files.push(attachment.name)
      }
    })
  }

  if (body.documents && Array.isArray(body.documents)) {
    body.documents.forEach((doc: any) => {
      if (doc.filename || doc.name) {
        files.push(doc.filename || doc.name)
      }
    })
  }

  if (body.documentUrls && Array.isArray(body.documentUrls)) {
    body.documentUrls.forEach((url: string) => {
      const filename = url.split("/").pop() || url
      files.push(filename)
    })
  }

  return {
    hasFiles: files.length > 0,
    files: files,
  }
}

async function fetchDocuments(documentUrls: string[]): Promise<{ name: string; content: string }[]> {
  if (!documentUrls || documentUrls.length === 0) {
    return []
  }

  const documents: { name: string; content: string }[] = []

  for (const url of documentUrls) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (!response.ok) {
        continue
      }
      const { default: pdfParse } = await import("pdf-parse")
      const arrayBuffer = await response.arrayBuffer()
      const pdfData = await pdfParse(Buffer.from(arrayBuffer))
      const text = pdfData.text
      const filename = url.split("/").pop() || `document-${Date.now()}`
      documents.push({ name: filename, content: text.slice(0, 1000) })
    } catch (error) {
      console.log("DOCUMENT FETCH ERROR:", error)
    }
  }

  return documents
}

function sanitizeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = await request.json()

    body.documentUrls = [
      "https://res.cloudinary.com/defkzzqcs/raw/upload/v1760423100/admin-documents/I",
      "https://res.cloudinary.com/defkzzqcs/raw/upload/v1760423139/admin-documents/IV",
      "https://res.cloudinary.com/defkzzqcs/raw/upload/v1760423141/admin-documents/III",
      "https://res.cloudinary.com/defkzzqcs/raw/upload/v1760435485/admin-documents/II",
    ]

    const documents = await fetchDocuments(body.documentUrls)
    const fileAttachmentInfo = detectAttachedFiles(body)
    console.log("FILE ATTACHMENT DETECTION:", {
      filesAttached: fileAttachmentInfo.hasFiles,
      attachedFiles: fileAttachmentInfo.files,
    })

    const {
      mode,
      physicalFeatures,
      gender,
      subredditType,
      visualContext,
      degenScale,
      captionMood,
      rules,
      creativeStyle,
      isInteractive,
      contentType,
      subredditName,
    } = body

    if (!mode || !gender) {
      return NextResponse.json({ error: "Missing required fields: mode and gender are required" }, { status: 400 })
    }

    const clickbaitStyle = isInteractive ? "y" : "n"

    const promptResult = await query(
      "SELECT prompt_text FROM prompts WHERE name = ? ORDER BY created_at DESC LIMIT 1",
      ["caption_generator"],
    )

    if (!promptResult || promptResult.length === 0) {
      throw new Error("Caption generator prompt not found in database")
    }

    const basePrompt = promptResult[0].prompt_text

    let captionCount = 5

    const patterns = [
      /YOU MUST GENERATE EXACTLY\s+(\d+)\s+CAPTIONS/i,
      /generate\s+(\d+)\s+captions/i,
      /(\d+)\s+captions/i,
      /exactly\s+(\d+)/i,
      /must\s+(?:be|have|contain)\s+(\d+)/i,
    ]

    for (const pattern of patterns) {
      const match = basePrompt.match(pattern)
      if (match) {
        const extracted = Number.parseInt(match[1], 10)
        if (Number.isInteger(extracted) && extracted >= 1 && extracted <= 20) {
          captionCount = extracted
          break
        }
      }
    }

    let knowledgeBaseSection = ""
    const documentLog: any[] = []

    const fileAttachmentStatus = fileAttachmentInfo.hasFiles
      ? `Files are attached. List of attached files: ${fileAttachmentInfo.files.join(", ")}`
      : "No files are attached."

    if (documents.length > 0) {
      documents.forEach((doc, index) => {
        documentLog.push({
          document: doc.name,
          contentPreview: doc.content.substring(0, 300),
        })

        knowledgeBaseSection += `
<document name="${doc.name}" index="${index + 1}">
<content>
${sanitizeText(doc.content)}
</content>
</document>
`
      })

      knowledgeBaseSection = `
<knowledge_base>
  <status>Successfully retrieved ${documents.length} documents</status>
  <instruction>
    Use the provided document content to inform caption generation. The documents contain relevant guidelines, examples, and rules from the Project Apex knowledge base. Ensure captions align with the provided content and user input. CRITICAL: Do NOT start any caption with the word "just" as per the rules in the Project Apex documents.
  </instruction>
${knowledgeBaseSection}
</knowledge_base>`
    } else {
      knowledgeBaseSection = `
<knowledge_base>
  <status>No documents retrieved</status>
  <instruction>Generate captions based on base instructions only. CRITICAL: Do NOT start any caption with the word "just".</instruction>
</knowledge_base>`
    }

    const fullPrompt = `<?xml version="1.0" encoding="UTF-8"?>
<prompt>
  <meta_instruction priority="CRITICAL">
    YOU MUST GENERATE EXACTLY ${captionCount} CAPTIONS. NO MORE, NO LESS.
    Count: ${captionCount}
    CRITICAL: Do NOT start any caption with the word "just".
  </meta_instruction>

  <file_attachment_instruction>
    Before generating captions, confirm whether files are attached and list them. Include the following statement in your response, before the captions:
    <file_attachment_status>${sanitizeText(fileAttachmentStatus)}</file_attachment_status>
  </file_attachment_instruction>

  <base_instructions>
${basePrompt}
  </base_instructions>
${knowledgeBaseSection}

  <user_input>
    <physical_features>${physicalFeatures || "not specified"}</physical_features>
    <gender>${gender || "female"}</gender>
    <subreddit_name>${subredditName || "not specified"}</subreddit_name>
    <subreddit_type>${subredditType || "not specified"}</subreddit_type>
    <visual_context>${visualContext || "not specified"}</visual_context>
    <content_type>${contentType || "picture"}</content_type>
    <caption_mood>${captionMood || "seductive"}</caption_mood>
    <creative_style>${creativeStyle || "not specified"}</creative_style>
    <degen_scale>${degenScale}</degen_scale>
    <clickbait_style>${clickbaitStyle}</clickbait_style>
    <subreddit_rules>${rules || "none specified"}</subreddit_rules>
  </user_input>

  <output_format priority="CRITICAL">
    <instruction>
      YOU MUST RETURN EXACTLY ${captionCount} CAPTION ELEMENTS.
      Use ONLY the XML format specified below. Include the <file_attachment_status> tag before the <post> element.
    </instruction>

    <required_structure>
      <example>
<![CDATA[
<?xml version="1.0" encoding="UTF-8"?>
<caption_results>
  <file_attachment_status>[Status of file attachments]</file_attachment_status>
  <post id="1">
    <caption>
      <option>Option 1: [Brief Label]</option>
      <text>[The actual caption text]</text>
    </caption>
    <caption>
      <option>Option 2: [Brief Label]</option>
      <text>[The actual caption text]</text>
    </caption>
  </post>
</caption_results>
]]>
      </example>
    </required_structure>
  </output_format>
</prompt>`

    console.log("FULL PROMPT SENT TO AI:", fullPrompt)

    const apiUrl = "https://router.huggingface.co/novita/v3/openai/chat/completions"
    const apiKey = process.env.AI_API_KEY

    if (!apiKey) {
      throw new Error("HUGGINGFACE_API_KEY is not configured")
    }

    let response
    let data
    let text
    let captions: { option: string; text: string }[] = []
    let attachmentStatus = ""
    let attempt = 0
    const maxAttempts = 3
    const timeoutMs = 15000

    while (attempt < maxAttempts) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      const requestBody = {
        messages: [
          {
            role: "system",
            content: "You are an expert caption generator. Always respond with valid XML format as specified. Use the provided document content to inform caption generation, acting as the retrieval system to select relevant information. Include file attachment status as instructed. CRITICAL: Do NOT start any caption with the word 'just'.",
          },
          {
            role: "user",
            content: fullPrompt,
          },
        ],
        model: "deepseek/deepseek-v3-0324",
        temperature: 1.5,
        max_tokens: 8192,
        stream: false,
      }

      try {
        const startTime = Date.now()
        response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        const responseTime = Date.now() - startTime

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`DeepSeek API error: ${response.status} - ${JSON.stringify(errorData)} - Request: ${JSON.stringify(requestBody)} - Response time: ${responseTime}ms`)
        }

        data = await response.json()

        text = data.choices?.[0]?.message?.content
        if (!text) {
          throw new Error(`No content returned from AI - Response time: ${responseTime}ms`)
        }

        console.log("AI RAW RESPONSE:", text)

        const xmlMatches = text.match(/<\?xml[\s\S]*?<caption_results>[\s\S]*?<\/caption_results>/gi)
        if (!xmlMatches || xmlMatches.length === 0) {
          throw new Error(`No valid XML found in AI response - Response time: ${responseTime}ms`)
        }

        const parsedCaptions = []
        for (const xmlText of xmlMatches) {
          const parser = new DOMParser()
          const xmlDoc = parser.parseFromString(xmlText, "application/xml")

          const errorNode = xmlDoc.getElementsByTagName("parsererror")
          if (errorNode.length > 0) {
            continue
          }

          const statusElements = xmlDoc.getElementsByTagName("file_attachment_status")
          if (statusElements.length > 0) {
            attachmentStatus = statusElements[0].textContent?.trim() || ""
            console.log("AI FILE ATTACHMENT STATUS:", attachmentStatus)
          }

          const postElements = xmlDoc.getElementsByTagName("post")
          if (postElements.length > 0) {
            const captionElements = postElements[0].getElementsByTagName("caption")
            for (let i = 0; i < captionElements.length; i++) {
              const captionElement = captionElements[i]
              const optionElement = captionElement.getElementsByTagName("option")[0]
              const textElement = captionElement.getElementsByTagName("text")[0]

              if (optionElement && textElement) {
                parsedCaptions.push({
                  option: optionElement.textContent?.trim() || "",
                  text: sanitizeText(textElement.textContent?.trim() || ""),
                })
              }
            }
          }
        }

        captions = parsedCaptions
        if (captions.length === captionCount) {
          break
        }
        captions = []
        attempt++
        requestBody.max_tokens = Math.floor(requestBody.max_tokens * 0.8)
      } catch (error) {
        clearTimeout(timeoutId)
        if (attempt < maxAttempts - 1) {
          continue
        }
        throw error
      }
    }

    if (captions.length !== captionCount) {
      throw new Error(`Failed to generate exactly ${captionCount} captions after ${maxAttempts} attempts`)
    }

    console.log("DOCUMENT CONTENT PREVIEWS:", documentLog)

    return NextResponse.json({
      captions,
      fileAttachmentStatus: attachmentStatus,
      documentLog,
      filesAttached: fileAttachmentInfo.hasFiles,
      attachedFiles: fileAttachmentInfo.files,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to generate captions"
    console.log("ERROR:", errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}