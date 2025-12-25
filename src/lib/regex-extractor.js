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

    // --- EMAIL (Ultra-Aggressive Anchored Search) ---
    const getEmail = () => {
        // Standard patterns
        const patterns = [
            /[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/gi,
            /[a-zA-Z0-9._%+-]+(?:\s*@\s*|\s*AT\s*)(?:[a-zA-Z0-9-]+\s*\.\s*)+[a-zA-Z]{2,}/gi // Captures with spaces
        ];

        let bestCandidate = null;

        for (const pattern of patterns) {
            const matches = [...(noSpacesText.matchAll(pattern)), ...(cleanText.matchAll(pattern))];
            for (const m of matches) {
                let candidate = m[0].toLowerCase().replace(/\s/g, '');
                // Basic validation: length and at least one dot
                if (candidate.length > 5 && candidate.includes('.')) {
                    bestCandidate = candidate;
                    break;
                }
            }
            if (bestCandidate) break;
        }

        // Fallback: Extremely fragmented search (Find @ and expand)
        if (!bestCandidate) {
            const atIndices = [];
            let idx = cleanText.indexOf('@');
            while (idx !== -1) {
                atIndices.push(idx);
                idx = cleanText.indexOf('@', idx + 1);
            }

            for (const pos of atIndices) {
                const start = Math.max(0, pos - 80);
                const end = Math.min(cleanText.length, pos + 80);
                const slice = cleanText.substring(start, end).replace(/\s/g, '');
                const match = slice.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                if (match) {
                    bestCandidate = match[0].toLowerCase();
                    break;
                }
            }
        }
        return bestCandidate;
    };

    const rawEmail = getEmail();
    if (rawEmail) {
        let email = rawEmail;
        const atPos = email.indexOf('@');

        if (atPos !== -1) {
            const domain = email.substring(atPos);
            // Sort TLDs by length descending to catch .com.br before .com
            const tlds = ['.com.br', '.com', '.net.br', '.org.br', '.edu.br', '.gov.br', '.net', '.org', '.edu', '.me', '.co', '.io', '.tech', '.br'];
            let bestTld = "";
            for (const t of tlds) {
                if (domain.includes(t)) {
                    bestTld = t;
                    break;
                }
            }
            if (bestTld) {
                email = email.substring(0, atPos) + domain.substring(0, domain.indexOf(bestTld) + bestTld.length);
            }
        }

        // --- AGGRESSIVE NOISE REMOVAL ---
        // 1. Remove CEPs and long digit sequences (5-12 digits) at start
        email = email.replace(/^\d{5,12}/, '');

        // 2. Remove keyword prefixes that are common in PDF artifacts
        email = email.replace(/^(results|resultados|contato|email|gmail|hotmail|outlook|nome|name|cv|link|perfil|z-|a\.|aluno\.|c\.|processos|digitais|linkedin|github|telefone|tel|fone|cel)[:\s\-_]*/i, '');

        // 3. Remove leading single-letter orphans (the 'n' in 'ntah_costah')
        // Only if followed by another letter (prevents removing 'a@...')
        email = email.replace(/^[a-z][.\-_]*/i, (m) => (email.length > m.length + 3 ? '' : m));

        // 4. Final trim of symbols
        email = email.replace(/^[.\-_]+/, '').replace(/[.,\/_-]+$/, '');

        result.email = email;
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
    const noiseWordsList = [
        'COLLEGE', 'DIGITAL', 'ENGENHAR', 'MECANIC', 'ENFERM', 'ANALISTA', 'TECNICO',
        'FORTALEZA', 'MACEIO', 'BRASIL', 'SAO PAULO', 'RIO DE JANEIRO', 'CEARA', 'CEARÁ',
        'CURRICULO', 'PROFISSIONAL', 'CONTATO', 'SOBRE', 'EXPERIENCIA', 'RESUMO', 'PERFIL',
        'OBJETIVO', 'FORMAÇÃO', 'ACADEMICO', 'UNIVERSIDADE', 'FACULDADE', 'SCHOOL',
        'ENDEREÇO', 'ENDERECO', 'RUA ', 'AVENIDA', 'AV.', 'BAIRRO', 'CEP:', 'JUAZEIRO',
        'SOLTEIRO', 'CASADO', 'IDADE', 'ANOS', 'BRASILEIRO', 'EMAIL:', 'E-MAIL:',
        'ASSISTENTE', 'OPERACAO', 'OPERAÇÃO', 'PROCESSOS', 'DIRETOR', 'GERENTE', 'COORDENADOR',
        'AUXILIAR', 'HABILIDADES', 'HABIL', 'COMPETENCIAS', 'QUALIFICACOES', 'QUALIFICAÇÕES',
        'DESENVOLVIMENTO', 'FULL STACK', 'STACK', 'SOFTWARE', 'DEVELOPER',
        'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
        'INÍCIO', 'INICIO', 'ATUAL', 'DATA', 'NASCIMENTO', 'TEL:', 'FONE:',
        'CURSOS', 'EXTRACURRICULARES', 'PROJETOS', 'ACADÊMICA', 'FORMAÇÃO'
    ];

    let candidates = [];
    for (let i = 0; i < Math.min(15, nameLines.length); i++) {
        // Double pass to remove multiple prefixes like "Currículo Profissional Lucas"
        let line = nameLines[i].replace(/^(currículo|curriculum|cv|profissional|nome|resumo|perfil|candidato)[:\s\-_]*/gi, '').trim();
        line = line.replace(/^(currículo|curriculum|cv|profissional|nome|resumo|perfil|candidato)[:\s\-_]*/gi, '').trim();

        // Skip if line is clearly not a name or contains metadata symbols
        if (line.length < 2 || line.includes('@') || line.includes('www.') || line.includes('http') ||
            line.includes('&') || line.includes('–') || line.includes('—') || line.includes(':')) {
            if (candidates.length > 0) break;
            continue;
        }

        const upper = line.toUpperCase();
        // Strict stop for section headers
        if (['HABILIDADES', 'PERFIL', 'RESUMO', 'CONTATO', 'EXPERIÊNCIA', 'OBJETIVO', 'PROFISSIONAL', 'DESENVOLVIMENTO', 'FULL STACK', 'DEVELOPER', 'INÍCIO', 'JULHO', 'CURSOS', 'EXTRACURRICULARES', 'PROJETOS'].some(w => upper.includes(w))) {
            if (candidates.length > 0) break;
            continue;
        }

        let cutPoint = -1;
        for (const sw of noiseWordsList) {
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
        let joined = candidates.join(' ').trim();

        // Final polish: remove single letters 'n', 'c' or section noise that leaked
        joined = joined.split(/\s+/).filter(word => {
            const wUpper = word.toUpperCase();
            if (word.length === 1 && !/^[AI]$/i.test(word)) return false; // Remove single letters except I/A
            if (['CURSOS', 'EXTRACURRICULARES', 'PROJETOS'].includes(wUpper)) return false;
            return true;
        }).join(' ').trim();

        if (joined.split(/\s+/).length >= 2) {
            result.nome = joined;
        }
    }

    return result;
}
