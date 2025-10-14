import mammoth from "mammoth";
import { Buffer } from "buffer";
import PDFParser from "pdf2json";

export async function parsePDFPages(buffer: Buffer): Promise<{ pageNumber: number; content: string }[]> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData: any) => {
      console.error("[PDF Parser] Error:", errData.parserError);
      reject(new Error(errData.parserError));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        const pages: { pageNumber: number; content: string }[] = [];

        if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
          pdfData.Pages.forEach((page: any, index: number) => {
            let pageText = "";

            if (page.Texts && Array.isArray(page.Texts)) {
              page.Texts.forEach((text: any) => {
                if (text.R && Array.isArray(text.R)) {
                  text.R.forEach((r: any) => {
                    if (r.T) {
                      try {
                        pageText += decodeURIComponent(r.T) + " ";
                      } catch (decodeError) {
                        pageText += r.T + " ";
                      }
                    }
                  });
                }
              });
            }

            if (pageText.trim()) {
              pages.push({
                pageNumber: index + 1,
                content: pageText.trim(),
              });
            }
          });
        }

        console.log(`[PDF Parser] Successfully parsed ${pages.length} pages`);
        resolve(pages);
      } catch (error) {
        console.error("[PDF Parser] Error processing PDF data:", error);
        reject(error);
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}

export async function parseDOCXPages(buffer: Buffer): Promise<{ pageNumber: number; content: string }[]> {
  const result = await mammoth.extractRawText({ buffer });

  const paragraphs = result.value.split("\n\n").filter((p: string) => p.trim());

  const pages: { pageNumber: number; content: string }[] = [];
  let currentPage = 1;
  let currentContent = "";
  const paragraphsPerPage = 5;

  paragraphs.forEach((paragraph: string, index: number) => {
    currentContent += paragraph + "\n\n";

    if ((index + 1) % paragraphsPerPage === 0 || index === paragraphs.length - 1) {
      pages.push({
        pageNumber: currentPage,
        content: currentContent.trim(),
      });
      currentPage++;
      currentContent = "";
    }
  });

  return pages;
}

export async function downloadAndParseDocument(
  cloudinaryUrl: string,
  fileType: string,
): Promise<{ pageNumber: number; content: string }[]> {
  console.log(`[Lazy Parser] Downloading document from: ${cloudinaryUrl}`);
  console.log(`[Lazy Parser] File type: ${fileType}`);

  try {
    const response = await fetch(cloudinaryUrl);
    console.log(`[Lazy Parser] Download response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[Lazy Parser] Downloaded ${buffer.length} bytes`);
    console.log(`[Lazy Parser] Parsing document (${fileType})...`);

    let pages: { pageNumber: number; content: string }[] = [];

    if (fileType === "application/pdf") {
      pages = await parsePDFPages(buffer);
    } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      pages = await parseDOCXPages(buffer);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    console.log(`[Lazy Parser] Successfully parsed ${pages.length} pages`);
    pages.forEach((page, index) => {
      console.log(`[Lazy Parser] Page ${page.pageNumber}: ${page.content.substring(0, 100)}...`);
    });

    return pages;
  } catch (error) {
    console.error(`[Lazy Parser] Error parsing document:`, error);
    throw error;
  }
}