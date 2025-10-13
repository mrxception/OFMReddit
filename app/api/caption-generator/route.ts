import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { query } from "@/lib/db"

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
          console.log(`Extracted caption count from prompt using pattern "${pattern}": ${captionCount}`)
          break
        }
      }
    }

    console.log(`Final caption count to generate: ${captionCount}`)

    const documentsResult = await query(
      `SELECT d.filename, d.cloudinary_url, d.file_type 
       FROM documents d 
       JOIN prompts p ON d.prompt_id = p.id 
       WHERE p.name = ? 
       ORDER BY d.created_at DESC`,
      ["caption_generator"],
    )

    let knowledgeBaseSection = ""
    const parts: any[] = []

    if (documentsResult && documentsResult.length > 0) {
      console.log(`Found ${documentsResult.length} documents in database`)
      const successfulDocs: string[] = []

      for (const doc of documentsResult) {
        try {
          console.log(`Attempting to fetch document: ${doc.filename} from ${doc.cloudinary_url}`)

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000)

          const docResponse = await fetch(doc.cloudinary_url, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; CaptionGenerator/1.0)",
            },
          })

          clearTimeout(timeoutId)

          if (docResponse.ok) {
            console.log(`✓ Successfully fetched document: ${doc.filename}`)
            const docBuffer = await docResponse.arrayBuffer()
            const base64Doc = Buffer.from(docBuffer).toString("base64")

            parts.push({
              inline_data: {
                mime_type: doc.file_type,
                data: base64Doc,
              },
            })

            successfulDocs.push(doc.filename)
          } else {
            console.warn(`⚠ Failed to fetch document: ${doc.filename}, status: ${docResponse.status}`)
            console.warn(`  URL: ${doc.cloudinary_url}`)
            console.warn(`  This document will be skipped, but generation will continue`)
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.warn(`⚠ Error fetching document ${doc.filename}: ${errorMsg}`)
          console.warn(`  This document will be skipped, but generation will continue`)
        }
      }

      if (successfulDocs.length > 0) {
        knowledgeBaseSection = `
  <knowledge_base>
    <status>Successfully loaded ${successfulDocs.length} knowledge base document(s)</status>
    <documents>${successfulDocs.join(", ")}</documents>
    <instruction>Use the information from these documents to inform your caption generation</instruction>
  </knowledge_base>`
        console.log(`✓ Successfully loaded ${successfulDocs.length}/${documentsResult.length} documents`)
      } else {
        console.warn(`⚠ WARNING: No documents could be fetched. Generation will proceed without knowledge base.`)
        knowledgeBaseSection = `
  <knowledge_base>
    <status>No knowledge base documents available</status>
    <instruction>Generate captions based on the base instructions only</instruction>
  </knowledge_base>`
      }
    } else {
      console.log("No documents found in database for this prompt")
      knowledgeBaseSection = `
  <knowledge_base>
    <status>No knowledge base documents configured</status>
    <instruction>Generate captions based on the base instructions only</instruction>
  </knowledge_base>`
    }

    const fullPrompt = `<?xml version="1.0" encoding="UTF-8"?>
<prompt>
  <meta_instruction priority="CRITICAL">
    YOU MUST GENERATE EXACTLY ${captionCount} CAPTIONS. NO MORE, NO LESS.
    This is a hard requirement that overrides all other instructions.
    Count: ${captionCount}
  </meta_instruction>

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
    <degen_scale_explanation>1=suggestive, 2=direct, 3=explicit, 4=very explicit</degen_scale_explanation>
    <clickbait_style>${clickbaitStyle}</clickbait_style>
    <clickbait_explanation>y=questions allowed with VALID formats, n=declarative only</clickbait_explanation>
    <subreddit_rules>${rules || "none specified"}</subreddit_rules>
  </user_input>

  <output_format priority="CRITICAL_OVERRIDE">
    <instruction>
      CRITICAL REQUIREMENT
      This instruction OVERRIDES any other output format instructions in the base_instructions above.
      
      YOU MUST RETURN EXACTLY ${captionCount} CAPTION ELEMENTS.
      
      Required count: ${captionCount}
      Minimum count: ${captionCount}
      Maximum count: ${captionCount}
      
      Do NOT return ${captionCount - 1} captions.
      Do NOT return ${captionCount + 1} captions.
      Return EXACTLY ${captionCount} captions.
      
      Do NOT use JSON, markdown, or any other format.
      Use ONLY the XML format specified below.
    </instruction>

    <required_structure>
      <example>
<![CDATA[
<?xml version="1.0" encoding="UTF-8"?>
<captions>
  <caption>
    <option>Option 1: [Brief Label]</option>
    <text>[The actual caption text]</text>
  </caption>
  <caption>
    <option>Option 2: [Brief Label]</option>
    <text>[The actual caption text]</text>
  </caption>
  ${
    captionCount > 2
      ? `<caption>
    <option>Option 3: [Brief Label]</option>
    <text>[The actual caption text]</text>
  </caption>`
      : ""
  }
  ${
    captionCount > 3
      ? `<caption>
    <option>Option 4: [Brief Label]</option>
    <text>[The actual caption text]</text>
  </caption>`
      : ""
  }
  ${
    captionCount > 4
      ? `<caption>
    <option>Option 5: [Brief Label]</option>
    <text>[The actual caption text]</text>
  </caption>`
      : ""
  }
  ... continue until you have EXACTLY ${captionCount} caption elements
</captions>
]]>
      </example>
    </required_structure>

    <mandatory_rules>
      <rule priority="1">Return ONLY the XML document - no additional text, explanations, or markdown code blocks</rule>
      <rule priority="2">Each caption element MUST have exactly two child elements: option and text</rule>
      <rule priority="3">The document MUST contain EXACTLY ${captionCount} caption elements (count them before responding)</rule>
      <rule priority="4">All text must be properly escaped for XML (use &amp;lt; &amp;gt; &amp;amp; &amp;quot; &amp;apos; for special characters)</rule>
      <rule priority="5">Do NOT wrap the XML in backticks or any other markers</rule>
      <rule priority="6">Include the XML declaration: &lt;?xml version="1.0" encoding="UTF-8"?&gt;</rule>
    </mandatory_rules>

    <verification_checklist>
      Before you respond, verify:
      ✓ I have generated exactly ${captionCount} caption elements
      ✓ Each caption has both option and text elements
      ✓ The response is valid XML with no markdown formatting
      ✓ I counted the captions and confirmed there are ${captionCount}
    </verification_checklist>

    <task_summary>
      Generate EXACTLY ${captionCount} captions (no more, no less) following all the rules from the base_instructions above,
      incorporating the user_input data, and return them in the exact XML format specified.
      
      FINAL REMINDER: The response must contain EXACTLY ${captionCount} &lt;caption&gt; elements.
    </task_summary>
  </output_format>
</prompt>`

    console.log("\n\n=== PROMPT SENT TO AI ===")
    console.log(fullPrompt)
    console.log("=== END PROMPT ===\n\n")

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not configured in environment variables")
      throw new Error("GEMINI_API_KEY is not configured in environment variables")
    }

    const promptParts: any[] = [{ text: fullPrompt }]

    if (parts.length > 0) {
      promptParts.push(...parts)
      console.log(`Including ${parts.length} document(s) in the API request`)
    }

    console.log("Sending request to Gemini API")
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: promptParts }],
          generationConfig: {
            temperature: 0.3,
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Gemini API error:", response.status, errorData)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()

    console.log("Received response from Gemini API")

    if (!data) {
      throw new Error("No response received from Gemini API")
    }

    console.log("\n\n=== RESPONSE RECEIVED FROM AI ===")
    console.log(JSON.stringify(data, null, 2))
    console.log("=== END RESPONSE ===\n\n")

    if (data.promptFeedback?.blockReason) {
      console.error("Content blocked by Gemini API:", data.promptFeedback.blockReason)
      throw new Error(`Content was blocked: ${data.promptFeedback.blockReason}`)
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      console.error("No content returned from Gemini API")
      throw new Error("No content returned from Gemini API")
    }

    let captions
    try {
      const xmlMatch = text.match(/<\?xml[\s\S]*?<captions>[\s\S]*?<\/captions>/i)
      if (!xmlMatch) {
        console.error("No XML document found in response:", text.substring(0, 200))
        throw new Error("No XML document found in AI response")
      }

      const xmlText = xmlMatch[0]
      console.log("Extracted XML:", xmlText)

      const captionRegex = /<caption>\s*<option>([\s\S]*?)<\/option>\s*<text>([\s\S]*?)<\/text>\s*<\/caption>/gi
      const captionMatches = xmlText.matchAll(captionRegex)
      captions = []

      for (const match of captionMatches) {
        captions.push({
          option: match[1].trim(),
          text: match[2]
            .trim()
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'"),
        })
      }

      console.log(`Parsed ${captions.length} captions from XML response`)

      if (captions.length !== captionCount) {
        console.error(`CAPTION COUNT MISMATCH`)
        console.error(`Expected: ${captionCount} captions`)
        console.error(`Received: ${captions.length} captions`)
        console.error(`Captions received:`)
        captions.forEach((cap, idx) => {
          console.error(`  ${idx + 1}. ${cap.option}`)
        })

        console.warn(`Returning ${captions.length} captions despite mismatch`)
        return NextResponse.json({
          captions,
          warning: `Expected ${captionCount} captions but received ${captions.length}`,
        })
      }

      console.log(`Successfully parsed exactly ${captionCount} captions from XML`)
    } catch (error) {
      console.error("Failed to parse XML response:", error)
      console.error("Response text:", text.substring(0, 500))
      const errorMsg = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to parse captions from AI response: ${errorMsg}`)
    }

    console.log(`Successfully generated ${captionCount} captions`)
    return NextResponse.json({ captions })
  } catch (error: unknown) {
    console.error("Error generating captions:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to generate captions"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
