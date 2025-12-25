/**
 * Fallback extractor using advanced regex patterns and text normalization.
 * Designed to be resilient to weird PDF text extraction artifacts.
 */

export function extractWithRegex(text) {
    const normalizedText = text.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');
    const cleanText = normalizedText.replace(/\s+/g, ' ').trim();
    const noSpacesText = normalizedText.replace(/\s/g, '');

    const result = {
        nome: "não encontrado",
        email: "não encontrado",
        telefone: "não encontrado"
    };

    // --- EMAIL ---
    const getEmail = () => {
        const regex = /[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/gi;
        const m1 = noSpacesText.match(regex);
        if (m1) return m1[0].toLowerCase();
        const m2 = cleanText.match(regex);
        if (m2) return m2[0].toLowerCase();
        return null;
    };
    const rawEmail = getEmail();
    if (rawEmail) {
        let email = rawEmail;
        const tld = email.match(/\.(com|br|net|org)/i);
        if (tld) email = email.substring(0, email.indexOf(tld[0]) + tld[0].length);
        result.email = email.replace(/^[a-z]{0,2}\d{5,}/i, '').replace(/^[.,\/n_-]+/, '');
    }

    // --- PHONE ---
    const ddds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99];
    const dddMatch = [...cleanText.matchAll(/(?:\(|^|\s)\s*([1-9][0-9])\s*(?:\)|$|\s)/g)];
    for (const m of dddMatch) {
        const ddd = m[1];
        if (!ddds.includes(parseInt(ddd))) continue;
        const sub = cleanText.substring(m.index, m.index + 50).replace(/\D/g, '');
        if (sub.length >= 10 && sub.startsWith(ddd)) {
            const n = sub.substring(2, 11);
            result.telefone = `(${ddd}) ${n.length === 9 ? n.substring(0, 5) : n.substring(0, 4)}-${n.substring(n.length - 4)}`;
            break;
        }
    }

    // --- NAME (Advanced Cleaning and Join) ---
    const nameLinesFound = text.split('\n').map(l => l.trim()).filter(l => l.length >= 2);
    const stopWordsForName = [
        'COLLEGE', 'DIGITAL', 'ENGENHAR', 'MECANIC', 'ENFERM', 'FORTALEZA', 'MACEIO',
        'BRASIL', 'CURRICULO', 'CONTATO', 'SOBRE', 'EXPERIENCIA', 'RESUMO', 'PERFIL',
        'OBJETIVO', 'FORMAÇÃO', 'ACADEMICO', 'UNIVERSIDADE', 'FACULDADE', 'SCHOOL'
    ];

    let finalNameParts = [];
    for (let i = 0; i < Math.min(8, nameLinesFound.length); i++) {
        let line = nameLinesFound[i].replace(/^(nome|name|candidato|candidate|cv|perfil|resumo|profissional)[:\s\-]*/i, '').trim();

        if (line.length < 2 || line.includes('@') || line.includes('www.') || line.includes('http')) {
            if (finalNameParts.length > 0) break;
            continue;
        }

        const upper = line.toUpperCase();

        // Immediate cut if stop word is found
        let cutAtPos = -1;
        for (const sw of stopWordsForName) {
            const idx = upper.indexOf(sw);
            if (idx !== -1 && (cutAtPos === -1 || idx < cutAtPos)) {
                cutAtPos = idx;
            }
        }

        if (cutAtPos !== -1) {
            line = line.substring(0, cutAtPos).trim();
            if (line.length > 2) finalNameParts.push(line);
            break;
        }

        const words = line.split(/\s+/);
        const capWeight = words.filter(w => /^[A-ZÀ-Ú]/.test(w) || /^(de|da|do|dos|das|e)$/i.test(w)).length / words.length;

        if (capWeight > 0.6) {
            finalNameParts.push(line);
        } else if (finalNameParts.length > 0) {
            break;
        }
    }

    if (finalNameParts.length > 0) {
        result.nome = finalNameParts.join(' ').trim();
    }

    return result;
}
