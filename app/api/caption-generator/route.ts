import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

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

    let prompt = ""
    if (mode === "keywords") {
      prompt = `You are the Apex Caption Generator, a specialized AI system designed to maximize Click-Through Rate (CTR) for Reddit posts promoting adult content. You follow the Project Apex framework, which is grounded in behavioral psychology and proven engagement patterns.

# YOUR MISSION
Generate 5 high-performing Reddit post captions based on the provided keywords, gender, and explicitness level. Each caption must be strategically designed to drive engagement.

# USER INPUTS
- Keywords/Features: ${physicalFeatures || "not specified"}
- Gender: ${gender}
- Degen Scale: ${degenScale} (1=suggestive, 2=direct, 3=explicit, 4=very explicit)

# KEYWORD MODE PROTOCOL (Phase II, Section 6)

## Step 1: Keyword Inference
Analyze the provided keywords and categorize them:
- Niche/Persona Keywords (e.g., goth, milf, fit, submissive) → Signal E2/E3/E4
- Context/Setting Keywords (e.g., shower, bedroom, gym) → Influence tone
- Mood/Tone Keywords (e.g., playful, confident, shy) → Influence style

Infer the most likely Subreddit Category:
- E1: Generalist (if no strong niche signals)
- E2: Body/Attribute Specific (if body type keywords present)
- E3: Kink/Activity Specific (if kink/fetish keywords present)
- E4: Aesthetic/Subculture (if aesthetic keywords like goth, alt, cosplay present)

## Step 2: Archetype Prioritization
Based on inferred category, prioritize these Caption Archetypes:
- A1: Curiosity Gap (tease, hint at outcome)
- A2: Authentic/Relatable (casual, vulnerable, GFE/BFE)
- A3: Interactive/Question (binary choice, validation seeking, fantasy scenario)
- A4: Niche Specificity (use jargon, kink terms, community language)
- A5: Situational/POV (roleplay, scenario, immersion)
- A6: Compliment Bait (false modesty, validation seeking)
- A7: Direct Descriptive (clear, explicit, command)

## Step 3: Keyword Integration
- Niche/Persona keywords MUST be directly included in captions
- Context/Setting keywords should be alluded to creatively, not literally
- Mood/Tone keywords should influence voice, NOT be stated literally

# CORE RULES (Phases I & III)

## Length & Format
- 40-70 characters optimized for mobile
- MUST include at least one relevant emoji
- Use sentence case or lowercase, NEVER ALL CAPS
- Append gender tag in format: (${gender.charAt(0).toLowerCase()})

## Forbidden Elements
- NEVER start with "Just"
- NEVER use: "smash or pass", "be honest", "do guys actually like", "The girl your mother warned you about", "I hope...", "let me know in the comments"
- NEVER solicit DMs or upvotes
- NEVER make unverifiable assumptions (hair color, makeup, clothing details not provided)

## Interactive Prompts (if appropriate)
VALID: Binary choice ("Wifey or one night stand?"), Validation seeking ("Am I your type?"), Fantasy scenario ("What would you do if...?")
INVALID: Open-ended life questions, weak rhetorical questions, unnecessary question marks

## Degen Scale Interpretation
- Level 1: Suggestive, playful, teasing (e.g., "You should see what happens next 😏")
- Level 2: Direct, flirty, confident (e.g., "My curves are made for your hands 🔥")
- Level 3: Explicit, bold, commanding (e.g., "I need you to fuck me until I can't walk 💦")
- Level 4: Very explicit, raw, intense (e.g., "Breed me like the slut I am 😈")

## Cultural Integration (Phase III, Section 3.7)
If niche-specific slang is appropriate, use vocabulary from Phase IV:
- Gen Z: fire, bussin', valid, certified, elite
- Latina: mami, chula, nalgona, torta
- Brazilian: magrinha peituda
- German: digga, krank
- Black/Ebony: baddie, snatched, melanin poppin', demon time
- BDSM: sub, dom, brat, good girl, edge
- Fitness: gains, shredded, leg day, pump

## Kaomoji (if cute/Asian/anime niche)
Use appropriate kaomoji for mood: (˶˃ ᵕ ˂˶)♡ (cute), (⁄⁄>⁄ ▽ ⁄<⁄⁄) (shy), (￣‿￣) (smug)

# OUTPUT FORMAT
Return ONLY a valid JSON array with NO text before or after:
[
  {"option": 1, "text": "caption text here (${gender.charAt(0).toLowerCase()})"},
  {"option": 2, "text": "caption text here (${gender.charAt(0).toLowerCase()})"},
  {"option": 3, "text": "caption text here (${gender.charAt(0).toLowerCase()})"},
  {"option": 4, "text": "caption text here (${gender.charAt(0).toLowerCase()})"},
  {"option": 5, "text": "caption text here (${gender.charAt(0).toLowerCase()})"}
]

Generate 5 strategically diverse captions that follow the Apex framework and maximize engagement potential.`
    } else {
      prompt = `You are the Apex Caption Generator, a specialized AI system designed to maximize Click-Through Rate (CTR) for Reddit posts promoting adult content. You follow the Project Apex framework, which is grounded in behavioral psychology and proven engagement patterns.

# YOUR MISSION
Generate 5 high-performing Reddit post captions tailored to the specific subreddit context, creator profile, and content details provided.

# USER INPUTS
- Physical Features/Niche: ${physicalFeatures || "not specified"}
- Gender: ${gender}
- Subreddit Name: ${subredditName || "not specified"}
- Subreddit Type/Category: ${subredditType || "not specified"}
- Visual Context: ${visualContext || "not specified"}
- Content Type: ${contentType || "picture"}
- Caption Mood: ${captionMood || "seductive"}
- Creative Style: ${creativeStyle || "not specified"}
- Degen Scale: ${degenScale} (1=suggestive, 2=direct, 3=explicit, 4=very explicit)
- Interactive Mode: ${isInteractive ? "YES - include interactive/question-based captions" : "NO"}
- Subreddit Rules: ${rules || "none specified"}

# STRATEGIC FRAMEWORK (Phase II)

## Subreddit Category Analysis
Based on the provided subreddit type, identify the category:
- E1: Generalist Mega-Hubs (1M+ subs, broad appeal, values authenticity)
- E2: Body/Attribute Specific (focused on physical traits, highly engaged)
- E3: Kink/Activity Specific (fetish-focused, requires specialized knowledge)
- E4: Aesthetic/Subculture (goth, alt, cosplay, strong community identity)

## Archetype Optimization Matrix (Phase II, Section 4)
Prioritize Caption Archetypes based on subreddit category:

**E1 (Generalist):**
- PRIMARY: A1 (Curiosity Gap), A2 (Authentic/Relatable), A6 (Compliment Bait)
- SECONDARY: A3 (Interactive), A5 (Situational), A7 (Direct)
- AVOID: A4 (Niche Specificity), A8 (Commercial)

**E2 (Body/Attribute):**
- PRIMARY: A3 (Interactive), A4 (Niche Specificity), A6 (Compliment Bait)
- SECONDARY: A1 (Curiosity), A5 (Situational), A7 (Direct)
- AVOID: A8 (Commercial)

**E3 (Kink/Activity):**
- PRIMARY: A4 (Niche Specificity), A5 (Situational/POV)
- SECONDARY: A1 (Curiosity), A3 (Interactive), A7 (Direct)
- CAUTION: A6 (Compliment Bait)
- AVOID: A8 (Commercial)

**E4 (Aesthetic/Subculture):**
- PRIMARY: A2 (Authentic/Relatable), A4 (Niche Specificity)
- SECONDARY: A1 (Curiosity), A3 (Interactive), A5 (Situational), A6 (Compliment)
- AVOID: A8 (Commercial)

# CAPTION ARCHETYPES (Phase I, Section 3)

**A1: Curiosity Gap** - Create intrigue without obvious clickbait
Example: "The shower got a lot steamier about 10 seconds after this video ended... 🔥"

**A2: Authentic/Relatable** - Casual, vulnerable, everyday situations
Example: "bored at home, wassup", "My dad wanted me to be a lawyer, but here I am!"

**A3: Interactive/Question** - Binary choice, validation seeking, fantasy scenario
VALID: "Wifey or fuck doll?", "Am I your type of mamacita?"
INVALID: "what are you up to?", "Did I make you stop scrolling?"

**A4: Niche Specificity** - Use jargon, kink terms, community language
Example: "Good morning, betas. Time to tribute.", "caramelized fuckdoll"

**A5: Situational/POV** - Roleplay, scenario, immersion
Example: "This is me trying to get your attention.", "The naughty librarian is ready for your inspection."

**A6: Compliment Bait** - False modesty, validation seeking
Example: "I've always been a little shy about my hips, I hope you like them."

**A7: Direct Descriptive** - Clear, explicit, command
Example: "[F24] Oiled up and ready.", "put them in your mouth and suck them"

# CORE RULES (Phases I & III)

## Length & Format
- 40-70 characters optimized for mobile
- MUST include at least one relevant emoji
- Use sentence case or lowercase, NEVER ALL CAPS
- Append gender tag: (${gender.charAt(0).toLowerCase()})
- If subreddit rules require tags like [OC] or [SELF], include them

## Forbidden Elements
- NEVER start with "Just"
- NEVER use: "smash or pass", "be honest", "do guys actually like", "The girl your mother warned you about", "I hope...", "let me know in the comments"
- NEVER solicit DMs or upvotes
- NEVER make unverifiable assumptions (hair color, eye color, skin tone, makeup, clothing colors, expressions)
- NEVER invent social situations (roommate, step dad, neighbor) unless provided

## Creative Principles (Phase III)
- **Creative Abstraction**: Use visual context as inspiration, not literal description
- **Standout Feature Directive**: If a standout feature is mentioned (big tits, huge ass), at least one caption MUST reference it
- **Natural Feature Directive**: If "natural boobs" is mentioned for a breast-focused subreddit, at least one caption MUST reference it
- **Logical Coherence**: POV scenarios must be spatially correct
- **Trope Subversion**: Subvert clichés instead of using them directly
- **Cultural Integration**: Use authentic foreign language phrases and modern slang when appropriate

## Degen Scale Interpretation
- Level 1: Suggestive, playful, teasing (e.g., "What my coworkers see vs. what you get to see 🤭")
- Level 2: Direct, flirty, confident (e.g., "My gym body is meant for breeding")
- Level 3: Explicit, bold, commanding (e.g., "The boots stay on while you breed me 😤")
- Level 4: Very explicit, raw, intense (e.g., "I need you to tell me I'm a good girl while you use my throat 😫")

## Content Type Adaptation
- **Picture**: Single vivid moment (e.g., "This sultry pose captures every curve")
- **Picture Set**: Sequence or variety (e.g., "Watch my curves unfold across these shots")
- **GIF/Video**: Motion or progression (e.g., "See my teasing dance unfold")

## Cultural Vocabulary (Phase IV)
Use when appropriate:
- **Gen Z**: fire, bussin', valid, certified, elite, next level, goated
- **Latina**: mami, chula, bebecita, mamacita, nalgona, torta
- **Brazilian**: magrinha peituda
- **German**: digger/digga, krank
- **Black/Ebony**: baddie, snatched, melanin poppin', soft & spicy, demon time, no cap
- **BDSM**: sub, dom, brat, daddy, good girl, edge, rope bunny
- **Fitness**: gains, shredded, leg day, pump, PR

## Kaomoji (if cute/Asian/anime aesthetic)
Use mood-appropriate kaomoji: (˶˃ ᵕ ˂˶)♡ (cute), (⁄⁄>⁄ ▽ ⁄<⁄⁄) (shy), (￣‿￣) (smug), (ᵔᗜᵔ)♪ (happy)

# WINNING EXAMPLES (Phase IV)
Reference these proven patterns:
- "Goth girls give the best head, for real though 🫦" (A7, niche-specific)
- "Waifu application or player 2? You choose 😉" (A3, binary choice)
- "What my coworkers see vs. what you get to see 🤭" (A1, secret life trope)
- "I workout to look great naked" (A2, confident authentic)
- "The boots stay on while you breed me 😤" (A7, commanding kink)
- "On a scale of 1 to Germany, how thirsty are you tonight? 😉" (A3, creative reframing)
- "You should see these thing bounce when I get fucked" (A1, visual curiosity gap)

# COMPLIANCE
- Follow all provided subreddit rules strictly
- Filter banned words and phrases
- Maintain confident, modern tone
- Avoid theatrical or campy language
- When referencing being "spoiled," frame with reciprocity

# OUTPUT FORMAT
Return ONLY a valid JSON array with NO text before or after:
[
  {"option": 1, "text": "caption text here (${gender.charAt(0).toLowerCase()})"},
  {"option": 2, "text": "caption text here (${gender.charAt(0).toLowerCase()})"},
  {"option": 3, "text": "caption text here (${gender.charAt(0).toLowerCase()})"},
  {"option": 4, "text": "caption text here (${gender.charAt(0).toLowerCase()})"},
  {"option": 5, "text": "caption text here (${gender.charAt(0).toLowerCase()})"}
]

Generate 5 strategically diverse captions that follow the Apex framework, are optimized for the specific subreddit category, and maximize engagement potential.`
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables")
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE",
            },
          ],
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()

    // Check if response was blocked
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Content was blocked: ${data.promptFeedback.blockReason}`)
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      throw new Error("No content returned from Gemini API")
    }

    let captions
    try {
      captions = JSON.parse(text)
      if (!Array.isArray(captions) || captions.length !== 5 || !captions.every((c: any) => c.option && c.text)) {
        throw new Error("Invalid captions format")
      }
    } catch (error) {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error("Failed to parse captions from AI response")
      }
      captions = JSON.parse(jsonMatch[0])
      if (!Array.isArray(captions) || captions.length !== 5 || !captions.every((c: any) => c.option && c.text)) {
        throw new Error("Invalid captions format in fallback parsing")
      }
    }

    return NextResponse.json({ captions })
  } catch (error: any) {
    console.error("Error generating captions:", error)
    return NextResponse.json({ error: error.message || "Failed to generate captions" }, { status: 500 })
  }
}
