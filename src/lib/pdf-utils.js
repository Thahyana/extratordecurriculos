
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

            // Group items by their vertical position with a tolerance (3 pixels)
            const lines = [];
            textContent.items.forEach((item) => {
                const y = item.transform[5];
                // Find if we already have a line close to this Y
                let line = lines.find(l => Math.abs(l.y - y) < 3);
                if (!line) {
                    line = { y, items: [] };
                    lines.push(line);
                }
                line.items.push(item);
            });

            // Sort lines from top to bottom (Y descending in PDF coordinate)
            lines.sort((a, b) => b.y - a.y);

            const pageText = lines.map(line => {
                // Sort items in each line from left to right
                return line.items
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
