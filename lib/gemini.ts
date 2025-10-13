export async function callGeminiWithRetry(
  apiKey: string,
  parts: any[],
  config: {
    temperature?: number
    maxOutputTokens?: number
    maxRetries?: number
  } = {},
): Promise<any> {
  const { temperature = 0.7, maxOutputTokens = 2048, maxRetries = 5 } = config

  // Try multiple models in order of preference
  const models = ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"]

  let lastError: Error | null = null

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const model = models[modelIndex]
    console.log(`\n🤖 Trying model: ${model}`)

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt + 1}/${maxRetries} with ${model}`)

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
                temperature,
                maxOutputTokens,
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
          console.log(`✅ Success with ${model} on attempt ${attempt + 1}`)
          return await response.json()
        }

        // Handle rate limiting (429) and service overload (503)
        if (response.status === 429 || response.status === 503) {
          // Exponential backoff with jitter: 2s, 5s, 10s, 20s, 40s
          const baseDelay = Math.min(2000 * Math.pow(2, attempt), 40000)
          const jitter = Math.random() * 1000 // Add up to 1 second of random jitter
          const waitTime = baseDelay + jitter

          console.log(
            `⏳ ${response.status === 429 ? "Rate limited" : "Service overloaded"}, waiting ${Math.round(waitTime / 1000)}s before retry...`,
          )

          await new Promise((resolve) => setTimeout(resolve, waitTime))
          continue
        }

        // Handle 404 (model not found) - try next model immediately
        if (response.status === 404) {
          console.log(`⚠️ Model ${model} not found, trying next model...`)
          break
        }

        // Other errors - log and retry
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        lastError = new Error(`API error ${response.status}: ${JSON.stringify(errorData)}`)
        console.error(`❌ ${lastError.message}`)

        // If it's not a retryable error, try next model
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          console.log(`⚠️ Non-retryable error, trying next model...`)
          break
        }
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.error(`❌ Request failed: ${lastError.message}`)

        // If this is the last attempt with the last model, throw
        if (attempt === maxRetries - 1 && modelIndex === models.length - 1) {
          throw lastError
        }

        // Wait before retry
        const waitTime = Math.min(2000 * Math.pow(2, attempt), 40000)
        console.log(`⏳ Waiting ${Math.round(waitTime / 1000)}s before retry...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }

  // If we've exhausted all models and retries
  throw new Error(
    `All Gemini models failed after ${maxRetries} attempts each. ${lastError ? `Last error: ${lastError.message}` : "Please try again later."}`,
  )
}
