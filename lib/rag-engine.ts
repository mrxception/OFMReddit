import { query } from "@/lib/db";
import { downloadAndParseDocument } from "@/lib/lazy-document-parser";

interface IndexedPage {
  id: number;
  document_id: number;
  page_number: number;
  content: string;
  word_count: number;
  document_filename?: string;
}

interface Document {
  id: number;
  cloudinary_url: string;
  file_type: string;
  filename: string;
}

interface RAGResult {
  documentName: string;
  pageNumber: number;
  content: string;
  relevanceScore: number;
  matchedTerms: string[];
}

export class RAGEngine {
  private stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "has",
    "he",
    "in",
    "is",
    "it",
    "its",
    "of",
    "on",
    "that",
    "the",
    "to",
    "was",
    "will",
    "with",
  ]);

  async ensureDocumentIndexed(documentId: number): Promise<void> {
    const existingPages = await query<IndexedPage>("SELECT id FROM document_pages WHERE document_id = ? LIMIT 1", [
      documentId,
    ]);

    if (existingPages.length > 0) {
      console.log(`[RAG Engine] Document ${documentId} already indexed`);
      return;
    }

    console.log(`[RAG Engine] Document ${documentId} not indexed, parsing now...`);

    const docs = await query<Document>("SELECT id, cloudinary_url, file_type, filename FROM documents WHERE id = ?", [
      documentId,
    ]);

    if (docs.length === 0) {
      throw new Error(`Document ${documentId} not found`);
    }

    const doc = docs[0];

    const pages = await downloadAndParseDocument(doc.cloudinary_url, doc.file_type);

    console.log(`[RAG Engine] Parsed ${pages.length} pages from ${doc.filename}`);

    for (const page of pages) {
      const wordCount = page.content.split(/\s+/).length;

      await query(
        `INSERT INTO document_pages (document_id, page_number, content, word_count)
         VALUES (?, ?, ?, ?)`,
        [documentId, page.pageNumber, page.content, wordCount],
      );
    }

    console.log(`[RAG Engine] Successfully indexed ${pages.length} pages for document ${documentId}`);
  }

  private extractPhrasesAndWords(userInput: {
    physicalFeatures?: string;
    gender?: string;
    subredditType?: string;
    visualContext?: string;
    captionMood?: string;
    creativeStyle?: string;
    contentType?: string;
    subredditName?: string;
  }): { phrases: string[]; words: string[] } {
    const phrases: string[] = [];
    const words: string[] = [];

    if (userInput.physicalFeatures) {
      const featurePhrases = userInput.physicalFeatures.split(',').map(p => p.trim().toLowerCase());
      phrases.push(...featurePhrases);
      featurePhrases.forEach(phrase => {
        phrase.split(/\s+/).forEach(word => {
          if (word.length > 2 && !this.stopWords.has(word)) {
            words.push(word);
          }
        });
      });
    }

    const otherFields = [
      userInput.gender,
      userInput.subredditType,
      userInput.visualContext,
      userInput.captionMood,
      userInput.creativeStyle,
      userInput.contentType,
      userInput.subredditName,
    ].filter(Boolean).map(f => f!.toLowerCase());

    phrases.push(...otherFields);
    otherFields.forEach(phrase => {
      phrase.split(/\s+/).forEach(word => {
        if (word.length > 2 && !this.stopWords.has(word)) {
          words.push(word);
        }
      });
    });

    return {
      phrases: Array.from(new Set(phrases)),
      words: Array.from(new Set(words)),
    };
  }

  private calculateRelevance(term: string, isPhrase: boolean, documentContent: string, allDocuments: string[]): number {
    const termLower = term.toLowerCase();
    const docLower = documentContent.toLowerCase();

    let baseScore = 0;

    if (docLower.includes(termLower)) {
      const occurrences = (docLower.match(new RegExp(termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g")) || []).length;
      baseScore = occurrences * (isPhrase ? 50 : 10) * (term.split(/\s+/).length);
    }

    const documentsContainingTerm = allDocuments.filter((doc: string) => doc.toLowerCase().includes(termLower)).length;
    const idf = Math.log(allDocuments.length / (documentsContainingTerm + 1)) + 1;

    return baseScore * idf;
  }

  async search(userInput: {
    physicalFeatures?: string;
    gender?: string;
    subredditType?: string;
    visualContext?: string;
    captionMood?: string;
    creativeStyle?: string;
    contentType?: string;
    subredditName?: string;
  }): Promise<RAGResult[]> {
    console.log("[RAG Engine] Starting document search");
    console.log("[RAG Engine] User input:", JSON.stringify(userInput, null, 2));

    const documents = await query<Document>("SELECT id, cloudinary_url, file_type, filename FROM documents");

    console.log(`[RAG Engine] Database query returned ${documents.length} documents`);

    if (documents.length === 0) {
      console.log("[RAG Engine] No documents found in database - please upload documents in admin panel");
      return [];
    }

    console.log(`[RAG Engine] Found ${documents.length} documents:`);
    documents.forEach((doc: Document) => {
      console.log(`  - ID: ${doc.id}, Filename: ${doc.filename}, Type: ${doc.file_type}`);
    });

    console.log(`[RAG Engine] Ensuring all documents are indexed...`);

    for (const doc of documents) {
      try {
        await this.ensureDocumentIndexed(doc.id);
      } catch (error) {
        console.error(`[RAG Engine] Failed to index document ${doc.id} (${doc.filename}):`, error);
      }
    }

    const pages = await query<IndexedPage>(
      `SELECT dp.*, d.filename as document_filename
       FROM document_pages dp
       JOIN documents d ON dp.document_id = d.id
       ORDER BY dp.document_id, dp.page_number`,
    );

    console.log(`[RAG Engine] Found ${pages.length} indexed pages in database`);

    if (pages.length === 0) {
      console.log("[RAG Engine] No indexed pages found - documents may have failed to parse");
      return [];
    }

    console.log(`[RAG Engine] Searching through ${pages.length} indexed pages`);

    const { phrases, words } = this.extractPhrasesAndWords(userInput);
    console.log(`[RAG Engine] Extracted phrases: ${phrases.join(", ")}`);
    console.log(`[RAG Engine] Extracted words: ${words.join(", ")}`);

    const allContents = pages.map((p: IndexedPage) => p.content);

    const results: RAGResult[] = [];

    for (const page of pages) {
      let score = 0;
      const matchedTerms: Set<string> = new Set();
      const pageLower = page.content.toLowerCase();

      for (const phrase of phrases) {
        const phraseScore = this.calculateRelevance(phrase, true, page.content, allContents);
        score += phraseScore;
        if (phraseScore > 0) {
          matchedTerms.add(phrase);
        }
      }

      for (const word of words) {
        const wordScore = this.calculateRelevance(word, false, page.content, allContents);
        score += wordScore;
        if (wordScore > 0) {
          matchedTerms.add(word);
        }
      }

      const importantTerms = [
        "kaomoji",
        "emoji",
        "caption",
        "example",
        "template",
        "format",
        "style",
        "guideline",
        "rule",
        "instruction",
        "failed",
        "success",
        "correct",
        "incorrect",
        "must",
        "should",
        "avoid",
      ];

      for (const term of importantTerms) {
        if (pageLower.includes(term)) {
          score += 50;
          matchedTerms.add(term);
        }
      }

      if (score > 100) { 
        results.push({
          documentName: page.document_filename || "Unknown",
          pageNumber: page.page_number,
          content: page.content,
          relevanceScore: score,
          matchedTerms: Array.from(matchedTerms),
        });

        console.log(
          `[RAG Engine] Page ${page.page_number} of "${page.document_filename}" - Score: ${score.toFixed(2)} - Matched: ${Array.from(matchedTerms).join(", ")}`,
        );
      }
    }

    results.sort((a: RAGResult, b: RAGResult) => b.relevanceScore - a.relevanceScore);

    const topResults = results.slice(0, 5);

    console.log(`[RAG Engine] Found ${results.length} relevant pages, returning top ${topResults.length}`);

    return topResults;
  }
}

export const ragEngine = new RAGEngine();

export async function searchRelevantPages(
  userQuery: string,
  promptName: string,
): Promise<{
  relevantPages: Array<{
    documentName: string;
    pageNumber: number;
    content: string;
    score: number;
    matchedTerms: string[];
  }>;
}> {
  console.log(`[RAG] Searching for relevant pages for prompt: ${promptName}`);
  console.log(`[RAG] User query: ${userQuery}`);

  const results = await ragEngine.search({
    physicalFeatures: userQuery,
    visualContext: userQuery,
    captionMood: userQuery,
  });

  return {
    relevantPages: results.map((result) => ({
      documentName: result.documentName,
      pageNumber: result.pageNumber,
      content: result.content,
      score: result.relevanceScore,
      matchedTerms: result.matchedTerms,
    })),
  };
}