/**
 * Fallback extractor using advanced regex patterns and text normalization.
 * Designed to be resilient to weird PDF text extraction artifacts.
 */

export function extractWithRegex(text) {
    // 1. Pre-normalization: Clean the text to remove common PDF noise
    const cleanText = text
        .replace(/\u0000/g, '') // Remove null characters
        .replace(/\s+/g, ' ')   // Normalize multiple spaces to single space
        .trim();

    const result = {
        nome: "não encontrado",
        email: "não encontrado",
        telefone: "não encontrado"
    };

    // --- EMAIL EXTRACTION (Handles fragmented emails with spaces) ---
    // Matches standard emails and those broken by fragments: "user @ domain . com"
    const fragmentedEmailRegex = /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}/gi;
    const emailMatches = cleanText.match(fragmentedEmailRegex);

    if (emailMatches && emailMatches.length > 0) {
        // Clean any spaces and potential trailing noise
        result.email = emailMatches[0].replace(/\s+/g, '').replace(/[.,]$/, '').toLowerCase();
    }

    // --- PHONE EXTRACTION (Resilient to spaces and formatting) ---
    // Approach: Find potential phone numbers by looking for DDD or mobile start,
    // then extract the digits and validate the length.

    // Pattern to catch various Brazilian formats even with lots of noise
    const rawDigits = text.replace(/\D/g, ''); // Extract all digits to see if there's a match in a single line

    // Method A: Look for formatted patterns in the clean text
    const standardPhoneRegex = /(?:\+?55\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:9\s?)?[2-9](?:\s?\d){3,4}[-\s\.]?(?:\s?\d){4}/g;
    const standardMatches = [...cleanText.matchAll(standardPhoneRegex)];

    let candidates = [];

    // Method B: If standard fails, try to find sequences of 10-11 digits that start with a valid DDD
    if (standardMatches.length === 0) {
        // Look for 10 or 11 digits together or with minimal separators
        const looseRegex = /(?:\(?([1-9][0-9])\)?[\s\.-]*)?(?:9[\s\.-]*)?\d{4}[\s\.-]*\d{4}/g;
        const looseMatches = [...cleanText.matchAll(looseRegex)];
        standardMatches.push(...looseMatches);
    }

    for (const match of standardMatches) {
        const full = match[0].trim();
        const digitsOnly = full.replace(/\D/g, '');

        // Skip obvious noise (years, CPFs, too short numbers)
        if (digitsOnly.length < 8) continue;
        if (/^(19|20)\d{2}/.test(full) && digitsOnly.length === 4) continue; // It's just a year
        if (digitsOnly.length === 11 && /^\d{11}$/.test(digitsOnly)) {
            // Check if it's a fixed sequence or looks like CPF (very basic check)
            if (/(\d)\1{10}/.test(digitsOnly)) continue; // 1111111...
        }

        // Calculate a confidence score
        let score = full.length;
        if (match[1]) score += 10; // Has DDD
        if (digitsOnly.length === 11) score += 5; // Likely mobile

        candidates.push({ text: full, digits: digitsOnly, score });
    }

    if (candidates.length > 0) {
        // Find candidate with best score
        candidates.sort((a, b) => b.score - a.score);
        result.telefone = candidates[0].text.replace(/\s+/g, ' ');
    }

    // --- NAME EXTRACTION (Refined logic) ---
    let lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Logic for split names in short lines
    if (lines.length < 5) {
        lines = cleanText.split(/  +|[|;]/).map(l => l.trim()).filter(l => l.length > 0);
    }

    const nameCandidates = [];
    const skipWords = [
        '@', 'www.', 'http', 'curriculum', 'currículo', 'telefone', 'phone', 'cel',
        'email', 'endereço', 'rua', 'av.', 'linkedin', 'github', 'experiência',
        'formação', 'habilidades', 'idiomas', 'perfil', 'maceió', 'fortaleza', 'ceará'
    ];

    for (let i = 0; i < Math.min(20, lines.length); i++) {
        const line = lines[i];
        if (line.length < 3 || line.length > 50) continue;

        const lower = line.toLowerCase();
        if (skipWords.some(word => lower.includes(word))) continue;
        if (/\d{2,}/.test(line)) continue; // Year or numbers

        const words = line.split(/\s+/);
        const capitalized = words.every(w => /^[A-ZÀ-Ú]/.test(w) || (w.length <= 3 && /^(de|da|do|dos|das|e)$/i.test(w)));

        if (capitalized && words.length >= 2) {
            let score = 20 - i; // Higher for top lines
            if (words.length >= 3) score += 5;
            nameCandidates.push({ name: line, score });
        }
    }

    if (nameCandidates.length > 0) {
        nameCandidates.sort((a, b) => b.score - a.score);
        result.nome = nameCandidates[0].name;
    }

    return result;
}
