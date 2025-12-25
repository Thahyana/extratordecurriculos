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
    // This is more accurate than a forward-matching regex for resumes
    const findEmail = (str) => {
        const atIndex = str.indexOf('@');
        if (atIndex === -1) return null;

        // Try to find all @ and pick the most likely email
        const parts = str.split(/\s+|[|;:]/);
        for (let part of parts) {
            if (part.includes('@') && part.includes('.')) {
                let email = part.trim().toLowerCase();
                // Clean noise from start and end
                email = email.replace(/^[.,\/n_-]+/, '').replace(/[.,\/]$/, '');

                // Cut at TLD to avoid "email.comlinkedin"
                const tldMatch = email.match(/\.(com|br|net|org)/i);
                if (tldMatch) {
                    email = email.substring(0, email.indexOf(tldMatch[0]) + tldMatch[0].length);
                }

                // Remove ID/CEP prefix (sequence of digits at the start)
                email = email.replace(/^\d{5,}/, '');

                if (email.length > 5 && email.includes('.') && !email.includes(' ')) {
                    return email;
                }
            }
        }
        return null;
    };

    const extractedEmail = findEmail(cleanText) || findEmail(noSpacesText);
    if (extractedEmail) result.email = extractedEmail;

    // --- PHONE EXTRACTION (Ultra-Resilient to Spaces) ---
    // Brazilian pattern: (XX) 9 XXXX - XXXX
    // We search for the digits and allow ANY amount of noise/spaces between them
    const phoneRegex = /(?:\+?55\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:9\s?)?[2-9](?:\s?\d){3,4}[-\s\.]?(?:\s?\d){4}/g;
    const standardMatches = [...normalizedText.matchAll(phoneRegex)];
    let candidates = [];

    const validDDDs = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99];

    for (const match of standardMatches) {
        const full = match[0].trim();
        const ddd = parseInt(match[1]);
        const digitsOnly = full.replace(/\D/g, '');

        if (digitsOnly.length < 8 || digitsOnly.length > 13) continue;
        if (match[1] && !validDDDs.includes(ddd)) continue;

        let score = full.length;
        if (match[1]) score += 20;
        if (digitsOnly.length === 11) score += 10;

        candidates.push({ text: full, score });
    }

    if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        result.telefone = candidates[0].text.replace(/\s+/g, ' ').trim();
    }

    // --- NAME EXTRACTION (Focus on Header) ---
    let lines = normalizedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const nameCandidates = [];

    for (let i = 0; i < Math.min(10, lines.length); i++) {
        let line = lines[i].replace(/^(nome|name|candidato|candidate):\s*/i, '').trim();
        if (line.length < 3 || line.length > 50) continue;
        if (['@', 'http', 'curriculum', 'email', 'telefone'].some(w => line.toLowerCase().includes(w))) continue;

        const words = line.split(/\s+/);
        // Better capitalization check: first letter of each main word must be capital
        const capitalized = words.length >= 2 && words.every(w => /^[A-ZÀ-Ú]/.test(w) || /^(de|da|do|dos|das|e)$/i.test(w));

        if (capitalized) {
            let score = 50 - (i * 5); // Very strong preference for top lines
            if (words.length >= 3) score += 10;
            nameCandidates.push({ name: line, score });
        }
    }

    if (nameCandidates.length > 0) {
        nameCandidates.sort((a, b) => b.score - a.score);
        result.nome = nameCandidates[0].name;
    }

    return result;
}
