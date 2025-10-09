import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { query } from "@/lib/db"

async function callGeminiWithRetry(apiKey: string, parts: any[], maxRetries = 3): Promise<any> {
  const models = ["gemini-1.5-flash", "gemini-1.5-pro"] 

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const model = models[modelIndex]

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(` Attempting Gemini API call with ${model} (attempt ${attempt + 1}/${maxRetries})`)

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 2048,
              },
              safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
              ],
            }),
          },
        )

        if (response.ok) {
          console.log(` Success with ${model}`)
          return await response.json()
        }

        
        if (response.status === 503) {
          const waitTime = Math.pow(2, attempt) * 1000 
          console.log(` Model overloaded, waiting ${waitTime}ms before retry...`)
          await new Promise((resolve) => setTimeout(resolve, waitTime))
          continue
        }

        
        const errorData = await response.json()
        throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`)
      } catch (error: any) {
        
        if (attempt === maxRetries - 1 && modelIndex === models.length - 1) {
          throw error
        }

        
        if (!error.message.includes("503")) {
          break
        }
      }
    }
  }

  throw new Error("All Gemini models are currently overloaded. Please try again in a few moments.")
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
    const { imageData } = body

    if (!imageData) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables")
    }

    const matches = imageData.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) {
      return NextResponse.json({ error: "Invalid image data format" }, { status: 400 })
    }

    const mimeType = matches[1]
    const base64Data = matches[2]

    const promptResult = await query(
      "SELECT prompt_text FROM prompts WHERE name = ? ORDER BY created_at DESC LIMIT 1",
      ["image_analyzer"],
    )

    if (!promptResult || promptResult.length === 0) {
      throw new Error("Image analyzer prompt not found in database")
    }

    const storedPrompt = promptResult[0].prompt_text

    const jsonFormatOverride = `

=== CRITICAL OUTPUT FORMAT OVERRIDE (HIGHEST PRIORITY) ===

IGNORE any instructions in the above prompt about XML, HTML, or other output formats.

You MUST return your response as a VALID JSON object with this EXACT structure:

{
  "contentType": "string (e.g., 'solo female', 'couple', 'group')",
  "setting": "string (e.g., 'bedroom', 'outdoor', 'bathroom')",
  "physicalAttributes": {
    "bodyType": "string",
    "hairColor": "string",
    "hairStyle": "string",
    "ethnicity": "string",
    "age": "string",
    "height": "string",
    "notableFeatures": ["array", "of", "strings"]
  },
  "clothing": {
    "outfit": "string",
    "color": "string",
    "style": "string",
    "accessories": ["array", "of", "strings"]
  },
  "pose": "string describing the pose/position",
  "mood": "string describing the mood/vibe",
  "lighting": "string describing lighting conditions",
  "cameraAngle": "string describing camera perspective",
  "visualElements": ["array", "of", "notable", "visual", "elements"],
  "suggestedSubreddits": ["array", "of", "subreddit", "names"],
  "nsfwLevel": "string (mild/moderate/explicit)",
  "tags": ["array", "of", "relevant", "tags"]
}

MANDATORY RULES:
1. Return ONLY the JSON object, no markdown code blocks, no explanations
2. Do NOT wrap in \`\`\`json or any other formatting
3. All string values must be properly escaped
4. Arrays must contain at least one item
5. The response must be parseable by JSON.parse()

Example of CORRECT format:
{"contentType":"solo female","setting":"bedroom","physicalAttributes":{"bodyType":"athletic","hairColor":"blonde","hairStyle":"long wavy","ethnicity":"caucasian","age":"20s","height":"average","notableFeatures":["tan lines","pink nail polish"]},"clothing":{"outfit":"lingerie","color":"white","style":"lace","accessories":["none"]},"pose":"lying on bed","mood":"playful","lighting":"natural window light","cameraAngle":"above","visualElements":["white bedding","natural lighting"],"suggestedSubreddits":["gonewild","RealGirls"],"nsfwLevel":"explicit","tags":["bedroom","lingerie","tan lines"]}

This format override takes precedence over ALL other instructions.`

    const fullPrompt = storedPrompt + jsonFormatOverride

    const documentsResult = await query(
      `SELECT d.filename, d.cloudinary_url, d.file_type 
       FROM documents d 
       JOIN prompts p ON d.prompt_id = p.id 
       WHERE p.name = ? 
       ORDER BY d.created_at DESC`,
      ["image_analyzer"],
    )

    const parts: any[] = [
      { text: fullPrompt },
      {
        inline_data: {
          mime_type: mimeType,
          data: base64Data,
        },
      },
    ]

    if (documentsResult && documentsResult.length > 0) {
      for (const doc of documentsResult) {
        const docResponse = await fetch(doc.cloudinary_url)
        if (docResponse.ok) {
          const docBuffer = await docResponse.arrayBuffer()
          const base64Doc = Buffer.from(docBuffer).toString("base64")

          parts.push({
            inline_data: {
              mime_type: doc.file_type,
              data: base64Doc,
            },
          })
        }
      }
    }

    const data = await callGeminiWithRetry(apiKey, parts)

    if (data.promptFeedback?.blockReason) {
      throw new Error(`Content was blocked: ${data.promptFeedback.blockReason}`)
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      throw new Error("No content returned from Gemini API")
    }

    let analysis
    try {
      
      analysis = JSON.parse(text)
    } catch (error) {
      
      const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
      if (codeBlockMatch) {
        try {
          analysis = JSON.parse(codeBlockMatch[1])
        } catch (e) {
          throw new Error("AI returned JSON in code block but it's malformed. Please try again.")
        }
      } else {
        
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          console.error(" AI response:", text.substring(0, 500))
          throw new Error(
            "AI did not return valid JSON format. The response may be in XML or another format. Please try again.",
          )
        }
        try {
          analysis = JSON.parse(jsonMatch[0])
        } catch (e) {
          throw new Error("Found JSON-like content but failed to parse. Please try again.")
        }
      }
    }

    console.log(" Successfully parsed analysis")
    return NextResponse.json({ analysis })
  } catch (error: any) {
    console.error("Error analyzing image:", error)

    let errorMessage = error.message || "Failed to analyze image"

    if (errorMessage.includes("503") || errorMessage.includes("overloaded")) {
      errorMessage = "The AI service is currently overloaded. Please try again in a few moments."
    } else if (errorMessage.includes("JSON") || errorMessage.includes("parse")) {
      errorMessage = "Failed to process AI response. Please try again."
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
