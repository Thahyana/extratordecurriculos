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

    // --- EMAIL (Anchored Robust Search) ---
    const getEmail = () => {
        const regex = /[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/gi;

        // 1. Try Standard Regex in no-spaces and clean text
        const m1 = noSpacesText.match(regex);
        if (m1) return m1[0].toLowerCase();
        const m2 = cleanText.match(regex);
        if (m2) return m2[0].toLowerCase();

        // 2. Fallback: Find '@' and expand outwards (Best for extremely fragmented text)
        const atIndex = cleanText.indexOf('@');
        if (atIndex !== -1) {
            const start = Math.max(0, atIndex - 40);
            const end = Math.min(cleanText.length, atIndex + 40);
            const slice = cleanText.substring(start, end).replace(/\s/g, '');
            const match = slice.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            if (match) return match[0].toLowerCase();
        }
        return null;
    };

    const rawEmail = getEmail();
    if (rawEmail) {
        let email = rawEmail;
        const tld = email.match(/\.(com|br|net|org|edu|gov)/i);
        if (tld) email = email.substring(0, email.indexOf(tld[0]) + tld[0].length);

        // Clean fragment prefixes
        email = email.replace(/^(results|resultados|contato|email|gmail|hotmail|outlook|nome|name)[:\s-_]*/i, '');
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

    // --- NAME (Resilient Label Removal & Multi-Line Join) ---
    const nameLines = text.split('\n').map(l => l.trim()).filter(l => l.length >= 2);
    const noiseWords = [
        'COLLEGE', 'DIGITAL', 'ENGENHAR', 'MECANIC', 'ENFERM', 'ANALISTA', 'TECNICO',
        'FORTALEZA', 'MACEIO', 'BRASIL', 'SAO PAULO', 'RIO DE JANEIRO', 'CEARA', 'CEARÁ',
        'CURRICULO', 'PROFISSIONAL', 'CONTATO', 'SOBRE', 'EXPERIENCIA', 'RESUMO', 'PERFIL',
        'OBJETIVO', 'FORMAÇÃO', 'ACADEMICO', 'UNIVERSIDADE', 'FACULDADE', 'SCHOOL',
        'ENDEREÇO', 'ENDERECO', 'RUA ', 'AVENIDA', 'AV.', 'BAIRRO', 'CEP:', 'JUAZEIRO',
        'SOLTEIRO', 'CASADO', 'IDADE', 'ANOS', 'BRASILEIRO', 'EMAIL:', 'E-MAIL:',
        'ASSISTENTE', 'OPERACAO', 'OPERAÇÃO', 'PROCESSOS', 'DIRETOR', 'GERENTE', 'COORDENADOR',
        'AUXILIAR', 'HABILIDADES', 'HABIL', 'COMPETENCIAS', 'QUALIFICACOES', 'QUALIFICAÇÕES'
    ];

    let candidates = [];
    for (let i = 0; i < Math.min(15, nameLines.length); i++) {
        // Double pass to remove multiple prefixes like "Currículo Profissional Lucas"
        let line = nameLines[i].replace(/^(currículo|curriculum|cv|profissional|nome|resumo|perfil|candidato)[:\s\-_]*/gi, '').trim();
        line = line.replace(/^(currículo|curriculum|cv|profissional|nome|resumo|perfil|candidato)[:\s\-_]*/gi, '').trim();

        if (line.length < 2 || line.includes('@') || line.includes('www.') || line.includes('http') || line.includes('&')) {
            if (candidates.length > 0) break;
            continue;
        }

        const upper = line.toUpperCase();
        if (['HABILIDADES', 'PERFIL', 'RESUMO', 'CONTATO', 'EXPERIÊNCIA', 'OBJETIVO', 'PROFISSIONAL'].includes(upper)) {
            if (candidates.length > 0) break;
            continue;
        }

        let cutPoint = -1;
        for (const sw of noiseWords) {
            const idx = upper.indexOf(sw);
            if (idx > 0 && (cutPoint === -1 || idx < cutPoint)) cutPoint = idx;
            if (idx === 0) { cutPoint = 0; break; }
        }

        const firstDigit = line.search(/\d/);
        if (firstDigit !== -1 && (cutPoint === -1 || firstDigit < cutPoint)) cutPoint = firstDigit;

        if (cutPoint !== -1) {
            line = line.substring(0, cutPoint).trim().replace(/[,\-:;&]+$/, '');
            if (line.length > 3 && line.split(/\s+/).length >= 2) {
                candidates.push(line);
                break;
            }
            if (candidates.length > 0) break;
            continue;
        }

        const words = line.split(/\s+/);
        const capScore = words.filter(w => /^[A-ZÀ-Ú]/.test(w) || /^(de|da|do|dos|das|e)$/i.test(w)).length / words.length;

        if (capScore > 0.6) {
            candidates.push(line);
        } else if (candidates.length > 0) {
            break;
        }
    }

    if (candidates.length > 0) {
        const joined = candidates.join(' ').trim();
        if (joined.split(/\s+/).length >= 2) {
            result.nome = joined;
        }
    }

    return result;
}
