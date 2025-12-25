/**
 * Fallback extractor using advanced regex patterns and text normalization.
 * Designed to be resilient to weird PDF text extraction artifacts.
 */

export function extractWithRegex(text) {
    // 1. Pre-normalization: Clean the text
    // Remove null bytes and other common PDF artifacts
    const normalizedText = text.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');
    const cleanText = normalizedText.replace(/\s+/g, ' ').trim();
    const noSpacesText = normalizedText.replace(/\s/g, '');

    const result = {
        nome: "não encontrado",
        email: "não encontrado",
        telefone: "não encontrado"
    };

    // --- EMAIL EXTRACTION (Find @ and expand outwards) ---
    const findEmail = (str) => {
        // Look for the @ symbol as an anchor
        const parts = str.split(/[\s|;:]+/);
        for (let part of parts) {
            if (part.includes('@') && part.includes('.') && part.length > 5) {
                let email = part.trim().toLowerCase();

                // Cut at TLD to avoid "email.comlinkedin"
                const tldMatch = email.match(/\.(com|br|net|org)/i);
                if (tldMatch) {
                    email = email.substring(0, email.indexOf(tldMatch[0]) + tldMatch[0].length);
                }

                // Remove common prefix noise
                email = email.replace(/^[a-z]{0,2}\d{5,15}/i, '');
                email = email.replace(/^(results|resultados|contato|email|gmail|hotmail|outlook|nome|name)[:\s-_]*/i, '');
                email = email.replace(/^[.,\/n_-]+/, '').replace(/[.,\/]$/, '');

                if (email.includes('@') && email.split('@')[1].includes('.')) {
                    return email;
                }
            }
        }
        return null;
    };

    const extractedEmail = findEmail(cleanText) || findEmail(noSpacesText);
    if (extractedEmail) result.email = extractedEmail;

    // --- PHONE EXTRACTION (Power Search) ---
    const validDDDs = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99];
    const compactedDigits = normalizedText.replace(/\D/g, '');
    const phoneMatches = [...compactedDigits.matchAll(/([1-9][0-9])(9?\d{8})/g)];

    if (phoneMatches.length > 0) {
        for (const match of phoneMatches) {
            if (validDDDs.includes(parseInt(match[1]))) {
                result.telefone = `(${match[1]}) ${match[2].length === 9 ? match[2].substring(0, 5) : match[2].substring(0, 4)}-${match[2].substring(match[2].length - 4)}`;
                break;
            }
        }
    }

    // --- NAME EXTRACTION (Strict Filter) ---
    let lines = normalizedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const potentialHeaderLines = [];
    const stopWords = [
        'ENGENHEIR', 'ENFERMEIR', 'ANALISTA', 'DESENVOLVEDOR', 'TÉCNICO', 'AUXILIAR', 'GERENTE',
        'ESTAGIÁRIO', 'PROFISSIONAL', 'DESCRIÇÃO', 'CURRÍCULO', 'EXPERIÊNCIA', 'RESUMO', 'CONTATO',
        'SOBRE', 'OBJECTIVE', 'SKILLS', 'EDUCATION', 'SUMMARY', 'PROFILE', 'CURRICULUM', 'RESUME'
    ];

    for (let i = 0; i < Math.min(6, lines.length); i++) {
        let line = lines[i]
            .replace(/^(nome|name|candidato|candidate|currículo|curriculum|profissional|resumo)[:\s\-]*/i, '')
            .trim();

        if (line.length < 2) continue;

        const lowerLine = line.toUpperCase();
        if (['@', 'HTTP', '.COM', 'TELEFONE', 'EMAIL'].some(w => lowerLine.includes(w))) break;

        // Stop if line contains a profession or section header
        if (stopWords.some(word => lowerLine.includes(word))) break;

        const words = line.split(/\s+/);
        const isCapitalized = words.every(w => /^[A-ZÀ-Ú]/.test(w) || /^(de|da|do|dos|das|e)$/i.test(w));

        if (isCapitalized) {
            potentialHeaderLines.push(line);
        } else if (potentialHeaderLines.length > 0) {
            break;
        }
    }

    if (potentialHeaderLines.length > 0) {
        result.nome = potentialHeaderLines.join(' ');
    }

    // The original code had a nameCandidates block after this, which is now redundant
    // and should be removed as per the instruction's implied replacement.
    // The new logic for name extraction is entirely contained within the 'potentialHeaderLines' block.

    return result;
}
