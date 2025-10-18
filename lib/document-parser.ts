import type { DocumentSection } from "./types";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function parsePDF(buffer: Buffer): Promise<DocumentSection[]> {
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;

  const sections: DocumentSection[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageText = textContent.items.map((item: any) => item.str).join(" ");

    if (pageText.trim()) {
      sections.push({
        pageNumber: pageNum,
        content: pageText.trim(),
        relevanceScore: 0,
      });
    }
  }

  return sections;
}

export async function parseDOCX(buffer: Buffer): Promise<DocumentSection[]> {
  const result = await mammoth.extractRawText({ buffer });

  const paragraphs = result.value.split("\n\n").filter((p: string) => p.trim());

  const sections: DocumentSection[] = [];
  let currentPage = 1;
  let currentContent = "";
  const paragraphsPerPage = 5;

  paragraphs.forEach((paragraph: string, index: number) => {
    currentContent += paragraph + "\n\n";

    if ((index + 1) % paragraphsPerPage === 0 || index === paragraphs.length - 1) {
      sections.push({
        pageNumber: currentPage,
        content: currentContent.trim(),
        relevanceScore: 0,
      });
      currentPage++;
      currentContent = "";
    }
  });

  return sections;
}

export function calculateRelevanceScore(
  section: string,
  userInput: {
    physicalFeatures?: string;
    gender?: string;
    subredditType?: string;
    visualContext?: string;
    captionMood?: string;
    creativeStyle?: string;
    contentType?: string;
  },
): number {
  let score = 0;
  const sectionLower = section.toLowerCase();

  const keywords = [
    userInput.physicalFeatures,
    userInput.gender,
    userInput.subredditType,
    userInput.visualContext,
    userInput.captionMood,
    userInput.creativeStyle,
    userInput.contentType,
  ]
    .filter(Boolean)
    .map((k: string | undefined) => k!.toLowerCase());

  keywords.forEach((keyword: string) => {
    const words = keyword.split(" ");
    words.forEach((word: string) => {
      if (word.length > 2) {
        const occurrences = (sectionLower.match(new RegExp(word, "g")) || []).length;
        score += occurrences * 10;
      }
    });
  });

  const importantPhrases = [
    "kaomoji",
    "emoji",
    "caption",
    "style",
    "mood",
    "format",
    "example",
    "template",
    "guideline",
    "rule",
    "instruction",
  ];

  importantPhrases.forEach((phrase: string) => {
    if (sectionLower.includes(phrase)) {
      score += 5;
    }
  });

  return score;
}

export function selectRelevantSections(sections: DocumentSection[], maxSections = 3): DocumentSection[] {
  const sortedSections = sections
    .filter((s: DocumentSection) => s.relevanceScore > 0)
    .sort((a: DocumentSection, b: DocumentSection) => b.relevanceScore - a.relevanceScore);

  return sortedSections.slice(0, maxSections);
}