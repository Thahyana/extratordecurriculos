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

    // --- NAME (Resilient Cleaning & Target Search) ---
    const nameLines = text.split('\n').map(l => l.trim()).filter(l => l.length >= 2);
    const noiseWords = [
        'COLLEGE', 'DIGITAL', 'ENGENHAR', 'MECANIC', 'ENFERM', 'ANALISTA', 'TECNICO',
        'FORTALEZA', 'MACEIO', 'BRASIL', 'SAO PAULO', 'RIO DE JANEIRO', 'CEARA', 'CEARÁ',
        'CURRICULO', 'CONTATO', 'SOBRE', 'EXPERIENCIA', 'RESUMO', 'PERFIL',
        'OBJETIVO', 'FORMAÇÃO', 'ACADEMICO', 'UNIVERSIDADE', 'FACULDADE', 'SCHOOL',
        'ENDEREÇO', 'ENDERECO', 'RUA ', 'AVENIDA', 'AV.', 'BAIRRO', 'CEP:', 'JUAZEIRO',
        'SOLTEIRO', 'CASADO', 'IDADE', 'ANOS', 'BRASILEIRO', 'EMAIL:', 'E-MAIL:'
    ];

    let candidates = [];
    for (let i = 0; i < Math.min(15, nameLines.length); i++) {
        let line = nameLines[i].replace(/^(nome|name|candidato|candidate|cv|perfil|resumo|profissional)[:\s\-]*/i, '').trim();

        if (line.length < 2 || line.includes('@') || line.includes('www.') || line.includes('http')) {
            if (candidates.length > 0) break;
            continue;
        }

        const upper = line.toUpperCase();

        // Find cut point (stop words or digits)
        let cutPoint = -1;
        for (const sw of noiseWords) {
            const idx = upper.indexOf(sw);
            if (idx !== -1 && (cutPoint === -1 || idx < cutPoint)) cutPoint = idx;
        }

        const firstDigit = line.search(/\d/);
        if (firstDigit !== -1 && (cutPoint === -1 || firstDigit < cutPoint)) cutPoint = firstDigit;

        if (cutPoint !== -1) {
            line = line.substring(0, cutPoint).trim().replace(/[,\-:;]+$/, '');
            if (line.length > 3) {
                candidates.push(line);
                break; // Found name and hit noise -> we are done
            }
            // If noise is at the start and we haven't found a name, just skip this line
            if (candidates.length > 0) break;
            continue;
        }

        // Validate if it looks like a name
        const words = line.split(/\s+/);
        const capScore = words.filter(w => /^[A-ZÀ-Ú]/.test(w) || /^(de|da|do|dos|das|e)$/i.test(w)).length / words.length;

        if (capScore > 0.6) {
            candidates.push(line);
        } else if (candidates.length > 0) {
            break;
        }
    }

    if (candidates.length > 0) {
        result.nome = candidates.join(' ').trim();
    }

    return result;
}
