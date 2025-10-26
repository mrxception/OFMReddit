/**
 * RAG Engine for semantic search through indexed documents
 * Improved with better relevance scoring and semantic matching
 */

export interface RAGSearchParams {
  physicalFeatures?: string
  gender?: string
  subredditType?: string
  visualContext?: string
  captionMood?: string
  creativeStyle?: string
  contentType?: string
  subredditName?: string
}

export interface RAGResult {
  documentName: string
  pageNumber: number
  relevanceScore: number
  matchedTerms: string[]
  content: string
}

interface StoredDocument {
  name: string
  pageNumber: number
  content: string
  tokens: string[]
}

class RAGEngine {
  private documents: StoredDocument[] = []
  private semanticSimilarityMap: Map<string, string[]> = new Map()

  constructor() {
    this.initializeSemanticMap()
  }

  /**
   * Initialize semantic similarity map for better matching
   * Maps keywords to semantically related terms
   */
  private initializeSemanticMap(): void {
    this.semanticSimilarityMap.set("garden", [
      "flowers",
      "plants",
      "outdoor",
      "nature",
      "green",
      "bloom",
      "roses",
      "landscape",
    ])
    this.semanticSimilarityMap.set("in the garden", ["outdoor", "nature", "flowers", "plants", "landscape", "bloom"])
    this.semanticSimilarityMap.set("don't start", [
      "avoid starting",
      "don't begin",
      "never start",
      "refrain from starting",
    ])
    this.semanticSimilarityMap.set("just", ["only", "merely", "simply", "solely"])
    this.semanticSimilarityMap.set("don't start with just", [
      "avoid starting with only",
      "don't begin with merely",
      "never start with simply",
    ])
    this.semanticSimilarityMap.set("asian", ["japanese", "korean", "chinese", "thai", "vietnamese", "east asian"])
    this.semanticSimilarityMap.set("cute", ["adorable", "pretty", "beautiful", "sweet", "innocent", "delicate"])
    this.semanticSimilarityMap.set("shy", ["bashful", "timid", "reserved", "modest", "innocent", "demure"])
    this.semanticSimilarityMap.set("japanese", ["asian", "japan", "tokyo", "culture", "anime", "kawaii"])
    this.semanticSimilarityMap.set("girl", ["woman", "female", "lady", "she", "her"])
    this.semanticSimilarityMap.set("playful", ["fun", "teasing", "flirty", "cheeky", "lighthearted"])
    this.semanticSimilarityMap.set("fantasy", ["scenario", "roleplay", "imagine", "pretend", "story"])
  }

  /**
   * Initialize RAG engine with documents
   */
  public async initialize(documentsPath?: string): Promise<void> {
    console.log("[RAG] Initializing RAG Engine with semantic search...")
  }

  /**
   * Add document to RAG engine with tokenization
   */
  public async addDocument(documentName: string, content: string, pageNumber = 1): Promise<void> {
    const tokens = this.tokenizeContent(content)
    const document: StoredDocument = {
      name: documentName,
      pageNumber,
      content,
      tokens,
    }
    this.documents.push(document)
    console.log(`[RAG] Added document: ${documentName} (Page ${pageNumber}) with ${tokens.length} tokens`)
  }

  /**
   * Improved search with semantic matching and better relevance scoring
   */
  public async search(params: RAGSearchParams): Promise<RAGResult[]> {
    if (this.documents.length === 0) {
      console.log("[RAG] No documents indexed. Returning empty results.")
      return []
    }

    const searchTerms = this.extractSearchTerms(params)
    const expandedTerms = this.expandSearchTerms(searchTerms)
    const results: RAGResult[] = []

    const phraseMatches = this.findPhraseMatches(searchTerms)

    // Search through all documents
    for (const doc of this.documents) {
      const relevanceScore = this.calculateAdvancedRelevance(
        doc.content,
        doc.tokens,
        searchTerms,
        expandedTerms,
        phraseMatches,
      )

      if (relevanceScore > 0.15) {
        const matchedTerms = this.findMatchedTerms(doc.content, searchTerms, expandedTerms)
        results.push({
          documentName: doc.name,
          pageNumber: doc.pageNumber,
          relevanceScore,
          matchedTerms,
          content: doc.content.substring(0, 1500),
        })
      }
    }

    // Sort by relevance score descending
    results.sort((a, b) => b.relevanceScore - a.relevanceScore)

    console.log(`[RAG] Search found ${results.length} relevant documents`)
    results.forEach((r, i) => {
      console.log(
        `  ${i + 1}. ${r.documentName} (Page ${r.pageNumber}) - Score: ${r.relevanceScore.toFixed(3)} - Matched: ${r.matchedTerms.join(", ")}`,
      )
    })

    // Return top 5 results
    return results.slice(0, 5)
  }

  /**
   * Expand search terms using semantic similarity
   */
  private expandSearchTerms(terms: string[]): string[] {
    const expanded = new Set<string>(terms)

    for (const term of terms) {
      const termLower = term.toLowerCase()
      if (this.semanticSimilarityMap.has(termLower)) {
        const relatedTerms = this.semanticSimilarityMap.get(termLower) || []
        relatedTerms.forEach((t) => expanded.add(t))
      }
    }

    return Array.from(expanded)
  }

  /**
   * Extract search terms from parameters
   */
  private extractSearchTerms(params: RAGSearchParams): string[] {
    const terms: string[] = []

    if (params.physicalFeatures) terms.push(...params.physicalFeatures.split(/\s+/))
    if (params.gender) terms.push(params.gender)
    if (params.subredditType) terms.push(params.subredditType)
    if (params.visualContext) {
      // Keep multi-word phrases intact
      terms.push(params.visualContext)
      terms.push(...params.visualContext.split(/\s+/))
    }
    if (params.captionMood) terms.push(params.captionMood)
    if (params.creativeStyle) terms.push(...params.creativeStyle.split(/\s+/))
    if (params.contentType) terms.push(params.contentType)
    if (params.subredditName) terms.push(params.subredditName)

    return terms.filter((term) => term.length > 2)
  }

  /**
   * Find phrase matches across all documents
   */
  private findPhraseMatches(searchTerms: string[]): Map<string, number> {
    const phraseMatches = new Map<string, number>()

    for (const term of searchTerms) {
      if (term.includes(" ")) {
        // Multi-word phrase - highest priority
        phraseMatches.set(term, 2)

        // Also add partial phrases
        const words = term.split(" ")
        for (let i = 0; i < words.length - 1; i++) {
          const partialPhrase = words.slice(i, i + 2).join(" ")
          phraseMatches.set(partialPhrase, 1.5)
        }
      }
    }

    return phraseMatches
  }

  /**
   * Advanced relevance calculation with multiple scoring factors
   */
  private calculateAdvancedRelevance(
    content: string,
    tokens: string[],
    searchTerms: string[],
    expandedTerms: string[],
    phraseMatches: Map<string, number>,
  ): number {
    if (searchTerms.length === 0) return 0

    const contentLower = content.toLowerCase()
    let score = 0

    for (const [phrase, weight] of phraseMatches.entries()) {
      const phraseMatches = (contentLower.match(new RegExp(phrase.toLowerCase(), "g")) || []).length
      score += phraseMatches * weight * 5
    }

    // Exact phrase matching (highest weight)
    for (const term of searchTerms) {
      const termLower = term.toLowerCase()
      if (termLower.length > 3) {
        const phraseMatches = (contentLower.match(new RegExp(termLower, "g")) || []).length
        score += phraseMatches * 3
      }
    }

    // Word boundary matching (medium weight)
    for (const term of expandedTerms) {
      const termLower = term.toLowerCase()
      if (termLower.length > 2) {
        const regex = new RegExp(`\\b${termLower}\\b`, "gi")
        const wordMatches = (contentLower.match(regex) || []).length
        score += wordMatches * 1.5
      }
    }

    // Partial matching (lower weight)
    for (const term of searchTerms) {
      const termLower = term.toLowerCase()
      if (termLower.length > 3) {
        const partialMatches = (contentLower.match(new RegExp(termLower.substring(0, 3), "g")) || []).length
        score += partialMatches * 0.5
      }
    }

    // Normalize score
    const maxPossibleScore = searchTerms.length * 5
    const normalizedScore = Math.min(score / maxPossibleScore, 1)

    return normalizedScore
  }

  /**
   * Tokenize content into searchable tokens
   */
  private tokenizeContent(content: string): string[] {
    return content
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 2)
  }

  /**
   * Find matched terms with semantic awareness
   */
  private findMatchedTerms(content: string, searchTerms: string[], expandedTerms: string[]): string[] {
    const contentLower = content.toLowerCase()
    const matched = new Set<string>()

    // Check exact search terms
    for (const term of searchTerms) {
      const termLower = term.toLowerCase()
      if (contentLower.includes(termLower)) {
        matched.add(term)
      }
    }

    // Check expanded terms
    for (const term of expandedTerms) {
      const termLower = term.toLowerCase()
      if (contentLower.includes(termLower) && !searchTerms.includes(term)) {
        matched.add(`${term} (related)`)
      }
    }

    return Array.from(matched)
  }
}

// Export singleton instance
export const ragEngine = new RAGEngine()
