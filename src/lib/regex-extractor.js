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

    // --- EMAIL EXTRACTION (High Precision) ---
    const emailRegex = /(?:[a-zA-Z0-9._%+-]\s*)+@\s*(?:[a-zA-Z0-9.-]\s*)+\.\s*[a-zA-Z]{2,}/gi;
    const emailMatches = cleanText.match(emailRegex);

    if (emailMatches && emailMatches.length > 0) {
        let email = emailMatches[0].replace(/\s+/g, '').toLowerCase();

        // Smarter cut: only keep until the last character of a valid TLD
        // This handles "user@domain.comlinkedin" by detecting ".com"
        const tldMatch = email.match(/\.(com|br|net|org|edu|gov|io|me|info)/i);
        if (tldMatch) {
            const endIdx = email.indexOf(tldMatch[0]) + tldMatch[0].length;
            email = email.substring(0, endIdx);
        }

        // Remove CEP/IDs at the start (5+ digits followed by non-number)
        email = email.replace(/^\d{5,}/, '');
        // Clean start/end
        email = email.replace(/[.,\/]$/, '').replace(/^[.,\/n_-]+/, '');

        result.email = email;
    }

    // --- PHONE EXTRACTION (Strict Brazilian DDD Validation) ---
    const phoneRegex = /(?:\+?55\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:9\s?)?[2-9](?:\s?\d){3,4}[-\s\.]?(?:\s?\d){4}/g;
    const standardMatches = [...cleanText.matchAll(phoneRegex)];
    let candidates = [];

    // Valid Brazilian DDDs
    const validDDDs = [
        11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
        41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
        71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99
    ];

    for (const match of standardMatches) {
        const full = match[0].trim();
        const ddd = parseInt(match[1]);
        const digitsOnly = full.replace(/\D/g, '');

        if (digitsOnly.length < 8 || digitsOnly.length > 13) continue;
        if (match[1] && !validDDDs.includes(ddd)) continue; // Filter invalid DDD noise

        let score = full.length;
        if (match[1]) score += 20;
        if (digitsOnly.length === 11) score += 10;

        candidates.push({ text: full, score });
    }

    if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        result.telefone = candidates[0].text.replace(/\s+/g, ' ');
    }

    // --- NAME EXTRACTION (Refined) ---
    let lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 5) {
        lines = cleanText.split(/  +|[|;]/).map(l => l.trim()).filter(l => l.length > 0);
    }

    const nameCandidates = [];
    for (let i = 0; i < Math.min(20, lines.length); i++) {
        let line = lines[i];
        // Remove common labels
        line = line.replace(/^(nome|name|candidato|candidate):\s*/i, '').trim();

        if (line.length < 3 || line.length > 50) continue;

        const lower = line.toLowerCase();
        if (['@', 'http', 'curriculum', 'telefone', 'email', 'linkedin'].some(w => lower.includes(w))) continue;
        if (/\d{2,}/.test(line)) continue;

        const words = line.split(/\s+/);
        const capitalized = words.every(w => /^[A-ZÀ-Ú]/.test(w) || (w.length <= 3 && /^(de|da|do|dos|das|e)$/i.test(w)));

        if (capitalized && words.length >= 2) {
            let score = 30 - i;
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
