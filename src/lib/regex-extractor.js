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

    // --- EMAIL EXTRACTION (Search in Clean and No-Spaces text) ---
    const getBestEmail = () => {
        const emailRegex = /[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/gi;

        // 1. Try noSpacesText (best for "u e n i o @ h o t m a i l . c o m")
        let matches = noSpacesText.match(emailRegex);
        if (matches) return matches[0].toLowerCase();

        // 2. Try cleanText
        matches = cleanText.match(emailRegex);
        if (matches) return matches[0].toLowerCase();

        // 3. Fallback: Split by common delimiters
        const parts = cleanText.split(/[\s|;:]+/);
        for (let part of parts) {
            if (part.includes('@') && part.includes('.') && part.length > 5) {
                return part.replace(/[^\w.@+-]/g, '').toLowerCase();
            }
        }
        return null;
    };

    const extractedEmail = getBestEmail();
    if (extractedEmail) {
        let email = extractedEmail;
        // Cut at TLD
        const tldMatch = email.match(/\.(com|br|net|org)/i);
        if (tldMatch) {
            email = email.substring(0, email.indexOf(tldMatch[0]) + tldMatch[0].length);
        }
        // Clean prefix noise
        result.email = email.replace(/^[a-z]{0,2}\d{5,}/i, '').replace(/^[.,\/n_-]+/, '');
    }

    // --- PHONE EXTRACTION ---
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

    // --- NAME EXTRACTION (Ultra Flexible) ---
    const nameLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    const stopKeywords = [
        'ENGENHAR', 'MECÂNICA', 'ENFERMEIR', 'ANALISTA', 'DESENVOLVEDOR', 'TÉCNICO',
        'ESTAGIÁRIO', 'CURRÍCULO', 'EXPERIÊNCIA', 'RESUMO', 'CONTATO', 'FORMAÇÃO', 'ACADÊMICO',
        'CURSO', 'GRADUAÇÃO', 'BACHAREL', 'LICENCIATUR', 'DOUTOR', 'MESTRE', 'PÓS', 'ESPECIALIZA',
        'FORTALEZA', 'MACEIÓ', 'CEARÁ', 'ALAGOAS', 'BRAZIL', 'BRASIL', 'SÃO PAULO', 'RIO DE JANEIRO'
    ];

    for (let i = 0; i < Math.min(10, nameLines.length); i++) {
        let line = nameLines[i]
            .replace(/^(nome|name|candidato|candidate|currículo|curriculum|cv|profissional|resumo|perfil)[:\s\-]*/i, '')
            .trim();

        if (line.length < 3) continue;
        if (line.includes('@') || line.includes('www.') || /\d{5,}/.test(line)) continue;

        // Cut at profession/section
        const upper = line.toUpperCase();
        let cutIdx = -1;
        stopKeywords.forEach(word => {
            const idx = upper.indexOf(word);
            if (idx !== -1 && (cutIdx === -1 || idx < cutIdx)) {
                cutIdx = idx;
            }
        });

        if (cutIdx !== -1) line = line.substring(0, cutIdx).trim();
        if (line.length < 3) continue;

        // Valid name: 2+ words, most starting with Uppercase (accepts Thahyana)
        const words = line.split(/\s+/);
        const nameScore = words.filter(w => /^[A-ZÀ-Ú]/.test(w)).length / words.length;

        if (words.length >= 2 && nameScore > 0.5) {
            result.nome = line;
            break;
        }
    }

    return result;
}
