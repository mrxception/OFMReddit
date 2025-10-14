import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";
import { DOMParser } from "@xmldom/xmldom";
import { ragEngine } from "@/lib/rag-engine";

function sanitizeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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
      return NextResponse.json({ error: "Missing required fields: mode and gender are required" }, { status: 400 });
    }

    const clickbaitStyle = isInteractive ? "y" : "n";

    const promptResult = await query(
      "SELECT prompt_text FROM prompts WHERE name = ? ORDER BY created_at DESC LIMIT 1",
      ["caption_generator"],
    );

    if (!promptResult || promptResult.length === 0) {
      throw new Error("Caption generator prompt not found in database");
    }

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

    console.log("\n========================================");
    console.log("RAG RESEARCH ASSISTANT - STARTING SEARCH");
    console.log("========================================\n");

    const ragResults = await ragEngine.search({
      physicalFeatures,
      gender,
      subredditType,
      visualContext,
      captionMood,
      creativeStyle,
      contentType,
      subredditName,
    });

    let knowledgeBaseSection = "";
    const ragLogDetails: any[] = [];

    if (ragResults.length > 0) {
      console.log(`\n[RAG] Found ${ragResults.length} relevant pages from indexed documents`);

      ragResults.forEach((result, index) => {
        console.log(`\n--- Result ${index + 1} ---`);
        console.log(`Document: ${result.documentName}`);
        console.log(`Page Number: ${result.pageNumber}`);
        console.log(`Relevance Score: ${result.relevanceScore.toFixed(2)}`);
        console.log(`Matched Terms: ${result.matchedTerms.join(", ")}`);
        console.log(`Content Preview: ${result.content.substring(0, 200)}...`);

        ragLogDetails.push({
          document: result.documentName,
          page: result.pageNumber,
          score: result.relevanceScore.toFixed(2),
          matchedTerms: result.matchedTerms,
          contentPreview: result.content.substring(0, 300),
        });

        knowledgeBaseSection += `
<document name="${result.documentName}" page="${result.pageNumber}" relevance_score="${result.relevanceScore.toFixed(2)}">
<matched_terms>${result.matchedTerms.join(", ")}</matched_terms>
<content>
${result.content}
</content>
</document>
`;
      });

      knowledgeBaseSection = `
<knowledge_base>
  <status>Successfully retrieved ${ragResults.length} relevant pages from indexed documents</status>
  <instruction>
    These pages were selected by the RAG Research Assistant based on semantic relevance to the user's input.
    Use the information, examples, templates, and guidelines from these pages to generate accurate captions.
    Pay special attention to rules about what makes captions successful or failed.
  </instruction>
${knowledgeBaseSection}
</knowledge_base>`;
    } else {
      console.log("\n[RAG] No relevant pages found in indexed documents");
      knowledgeBaseSection = `
<knowledge_base>
  <status>No relevant pages found in indexed documents</status>
  <instruction>Generate captions based on base instructions only</instruction>
</knowledge_base>`;
    }

    console.log("\n========================================");
    console.log("RAG RESEARCH ASSISTANT - SEARCH COMPLETE");
    console.log("========================================\n");

    const fullPrompt = `<?xml version="1.0" encoding="UTF-8"?>
<prompt>
  <meta_instruction priority="CRITICAL">
    YOU MUST GENERATE EXACTLY ${captionCount} CAPTIONS. NO MORE, NO LESS.
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
    <clickbait_style>${clickbaitStyle}</clickbait_style>
    <subreddit_rules>${rules || "none specified"}</subreddit_rules>
  </user_input>

  <output_format priority="CRITICAL">
    <instruction>
      YOU MUST RETURN EXACTLY ${captionCount} CAPTION ELEMENTS.
      Use ONLY the XML format specified below.
    </instruction>

    <required_structure>
      <example>
<![CDATA[
<?xml version="1.0" encoding="UTF-8"?>
<caption_results>
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

    console.log("\n========================================");
    console.log("FULL PROMPT SENT TO AI");
    console.log("========================================\n");
    console.log(fullPrompt);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    let response;
    let data;
    let text;
    let captions: { option: string; text: string }[] = [];
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: {
              temperature: 1.5,
              maxOutputTokens: 8192,
            },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            ],
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Gemini API error:", response.status, errorData);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      data = await response.json();

      if (data.promptFeedback?.blockReason) {
        throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
      }

      text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("No content returned from AI");
      }

      console.log("[AI Response] Raw response length:", text.length);
      console.log("[AI Response] Full response:", text);

      const xmlMatches = text.match(/<\?xml[\s\S]*?<caption_results>[\s\S]*?<\/caption_results>/gi);
      if (!xmlMatches || xmlMatches.length === 0) {
        console.error("[AI Response] Full response:", text);
        throw new Error("No valid XML found in AI response. Check logs for full response.");
      }

      let parsedCaptions = [];
      for (const xmlText of xmlMatches) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "application/xml");

        const errorNode = xmlDoc.getElementsByTagName("parsererror");
        if (errorNode.length > 0) {
          console.warn("XML parsing warning:", errorNode[0].textContent);
          continue;
        }

        const postElements = xmlDoc.getElementsByTagName("post");
        if (postElements.length > 0) {
          const captionElements = postElements[0].getElementsByTagName("caption");
          for (let i = 0; i < captionElements.length; i++) {
            const captionElement = captionElements[i];
            const optionElement = captionElement.getElementsByTagName("option")[0];
            const textElement = captionElement.getElementsByTagName("text")[0];

            if (optionElement && textElement) {
              parsedCaptions.push({
                option: optionElement.textContent?.trim() || "",
                text: sanitizeText(textElement.textContent?.trim() || ""), 
              });
            }
          }
        }
      }

      captions = parsedCaptions;
      if (captions.length === captionCount) {
        break;
      } else {
        console.warn(
          `[AI Response] Attempt ${attempt + 1}: Expected ${captionCount} captions, received ${captions.length}. Retrying...`,
        );
        captions = [];
        attempt++;
      }
    }

    if (captions.length !== captionCount) {
      throw new Error(`Failed to generate exactly ${captionCount} captions after ${maxAttempts} attempts`);
    }

    return NextResponse.json({
      captions,
      ragLog: ragLogDetails,
    });
  } catch (error: unknown) {
    console.error("Error generating captions:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate captions";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}