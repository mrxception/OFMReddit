import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { DOMParser } from "@xmldom/xmldom"

const API_KEY = process.env.GOOGLE_API_KEY ?? process.env.API_KEY;
if (!API_KEY) {
  console.warn("Missing GOOGLE_API_KEY / API_KEY env var for Gemini.");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 1.5,
    maxOutputTokens: 8192,
  },
});

function sanitizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchDocuments(urls: string[]): Promise<{ name: string; content: string }[]> {
  return urls.map((url, i) => ({
    name: `Document ${i + 1}`,
    content: `Fetched content from ${url.substring(0, 50)}...`,
  }));
}

function detectAttachedFiles(body: any): { hasFiles: boolean; files: string[] } {
  return { hasFiles: false, files: [] };
}

function verifyToken(token: string): any {
  return token ? { valid: true } : null;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();

    body.documentUrls = [
      "https://res.cloudinary.com/defkzzqcs/raw/upload/v1760423100/admin-documents/I",
      "https://res.cloudinary.com/defkzzqcs/raw/upload/v1760423139/admin-documents/IV",
      "https://res.cloudinary.com/defkzzqcs/raw/upload/v1760423141/admin-documents/III",
      "https://res.cloudinary.com/defkzzqcs/raw/upload/v1760435485/admin-documents/II",
    ];

    const documents = await fetchDocuments(body.documentUrls);
    const fileAttachmentInfo = detectAttachedFiles(body);

    console.log("FILE ATTACHMENT DETECTION:", {
      filesAttached: fileAttachmentInfo.hasFiles,
      attachedFiles: fileAttachmentInfo.files,
    });

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
    } = body;

    if (!mode || !gender) {
      return NextResponse.json(
        { error: "Missing required fields: mode and gender are required" },
        { status: 400 }
      );
    }

    const clickbaitStyle = isInteractive ? "y" : "n";

    const promptResult = [{ prompt_text: "Generate creative, engaging captions for Reddit posts..." }];
    const basePrompt = promptResult[0].prompt_text;

    let captionCount = 5;
    const patterns = [
      /YOU MUST GENERATE EXACTLY\s+(\d+)\s+CAPTIONS/i,
      /generate\s+(\d+)\s+captions/i,
      /(\d+)\s+captions/i,
      /exactly\s+(\d+)/i,
      /must\s+(?:be|have|contain)\s+(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = basePrompt.match(pattern);
      if (match) {
        const extracted = Number.parseInt(match[1], 10);
        if (Number.isInteger(extracted) && extracted >= 1 && extracted <= 20) {
          captionCount = extracted;
          break;
        }
      }
    }

    let knowledgeBaseSection = "";
    const documentLog: any[] = [];

    const fileAttachmentStatus = fileAttachmentInfo.hasFiles
      ? `Files are attached. List of attached files: ${fileAttachmentInfo.files.join(", ")}`
      : "No files are attached.";

    if (documents.length > 0) {
      documents.forEach((doc, index) => {
        documentLog.push({
          document: doc.name,
          contentPreview: doc.content.substring(0, 300),
        });

        knowledgeBaseSection += `
<document name="${doc.name}" index="${index + 1}">
<content>
${sanitizeText(doc.content)}
</content>
</document>
`;
      });

      knowledgeBaseSection = `
<knowledge_base>
  <status>Successfully retrieved ${documents.length} documents</status>
  <instruction>
    Use the provided document content to inform caption generation. The documents contain relevant guidelines, examples, and rules from the Project Apex knowledge base. Ensure captions align with the provided content and user input. CRITICAL: Do NOT start any caption with the word "just" as per the rules in the Project Apex documents.
  </instruction>
${knowledgeBaseSection}
</knowledge_base>`;
    } else {
      knowledgeBaseSection = `
<knowledge_base>
  <status>No documents retrieved</status>
  <instruction>Generate captions based on base instructions only. CRITICAL: Do NOT start any caption with the word "just".</instruction>
</knowledge_base>`;
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
</prompt>`;

    console.log("FULL PROMPT SENT TO GEMINI:", fullPrompt);

    let captions: { option: string; text: string }[] = [];
    let attachmentStatus = "";
    let attempt = 0;
    const maxAttempts = 3;
    let maxOutputTokens = 8192;

    while (attempt < maxAttempts) {
      try {
        const result = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [{ text: fullPrompt }],
            },
          ],
          systemInstruction: {
            role: "system",
            parts: [
              {
                text: "You are an expert caption generator. Always respond with valid XML format as specified. Use the provided document content to inform caption generation, acting as the retrieval system to select relevant information. Include file attachment status as instructed. CRITICAL: Do NOT start any caption with the word 'just'.",
              },
            ],
          },
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                caption_results: {
                  type: SchemaType.OBJECT,
                  properties: {
                    file_attachment_status: { type: SchemaType.STRING },
                    post: {
                      type: SchemaType.OBJECT,
                      properties: {
                        caption: {
                          type: SchemaType.ARRAY,
                          items: {
                            type: SchemaType.OBJECT,
                            properties: {
                              option: { type: SchemaType.STRING },
                              text: { type: SchemaType.STRING },
                            },
                            required: ["option", "text"],
                          },
                          minItems: captionCount,
                          maxItems: captionCount,
                        },
                      },
                      required: ["caption"],
                    },
                  },
                  required: ["file_attachment_status", "post"],
                },
              },
              required: ["caption_results"],
            },
            maxOutputTokens,
            temperature: 1.5,
          },
        });

        let responseText = result.response.text().trim();

        console.log("GEMINI RAW RESPONSE:", responseText);

        if (responseText.startsWith("```json") || responseText.startsWith("```")) {
          responseText = responseText.replace(/^```[\w]*\s*|\s*```$/g, "").trim();
        }

        const responseJson = JSON.parse(responseText);
        const captionResults = responseJson.caption_results;

        if (!captionResults) {
          throw new Error("Invalid JSON structure: missing caption_results");
        }

        attachmentStatus = captionResults.file_attachment_status || "";

        const captionArray = captionResults.post?.caption || [];
        if (captionArray.length !== captionCount) {
          throw new Error(`Expected ${captionCount} captions, got ${captionArray.length}`);
        }

        const parsed: { option: string; text: string }[] = captionArray.map((cap: any) => ({
          option: cap.option || "",
          text: sanitizeText(cap.text || ""),
        }));

        captions = parsed;

        break; 
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        if (attempt < maxAttempts - 1) {
          maxOutputTokens = Math.floor(maxOutputTokens * 0.8);
          attempt++;
          continue;
        }
        throw error;
      }
    }

    if (captions.length !== captionCount) {
      throw new Error(`Failed to generate exactly ${captionCount} captions after ${maxAttempts} attempts`);
    }

    console.log("DOCUMENT CONTENT PREVIEWS:", documentLog);

    return NextResponse.json({
      captions,
      fileAttachmentStatus: attachmentStatus,
      documentLog,
      filesAttached: fileAttachmentInfo.hasFiles,
      attachedFiles: fileAttachmentInfo.files,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to generate captions";
    console.error("ERROR:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}