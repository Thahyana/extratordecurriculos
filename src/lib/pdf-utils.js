
import * as pdfjsLib from 'pdfjs-dist';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractTextFromPDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/standard_fonts/',
        }).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Group items by their vertical position (y-coordinate)
            const lines = {};
            textContent.items.forEach((item) => {
                const y = Math.round(item.transform[5]); // y-coordinate
                if (!lines[y]) lines[y] = [];
                lines[y].push(item);
            });

            // Sort lines from top to bottom
            const sortedY = Object.keys(lines).sort((a, b) => b - a);

            const pageText = sortedY.map(y => {
                // Sort items in each line from left to right
                return lines[y]
                    .sort((a, b) => a.transform[4] - b.transform[4])
                    .map(item => item.str)
                    .join(" ");
            }).join("\n");

            fullText += pageText + "\n";
        }

        return fullText;
    } catch (error) {
        console.error("PDF Parsing Error:", error);
        throw new Error("Falha ao ler o arquivo PDF.");
    }
}
