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

    // --- EMAIL (The Professional Hunter - V3) ---
    const getEmail = () => {
        const patterns = [
            /[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/gi,
            /[a-z0-9._%+-]+(?:\s*@\s*|\s*AT\s*)(?:[a-z0-9-]+\s*\.\s*)+[a-z]{2,}/gi
        ];

        let candidates = [];
        const versions = [noSpacesText, cleanText, normalizedText.replace(/[|/\\;:]/g, ' ')];

        versions.forEach(t => {
            patterns.forEach(p => {
                const matches = t.match(p);
                if (matches) {
                    matches.forEach(m => {
                        let cleaned = m.toLowerCase().replace(/\s/g, '');
                        if (cleaned.length > 5 && cleaned.includes('.') && cleaned.includes('@')) {
                            candidates.push(cleaned);
                        }
                    });
                }
            });
        });

        // Fallback: Radical @ Search (Total Reconstruction)
        if (candidates.length === 0) {
            let atIdx = 0;
            // Scan for all @ symbols
            while ((atIdx = cleanText.indexOf('@', atIdx)) !== -1) {
                // Large radius of 100 to catch very long/fragmented emails
                const start = Math.max(0, atIdx - 100);
                const end = Math.min(cleanText.length, atIdx + 100);
                const chunk = cleanText.substring(start, end);

                // Super aggressive regex: letters/numbers potentially separated by ANY non-alphanumeric noise
                const fragmentMatch = chunk.match(/[a-z0-9](?:[^a-z0-9@]*[a-z0-9._%+-])*[^a-z0-9@]*@(?:[^a-z0-9]*[a-z0-9.-])*\s*\.\s*[a-z](?:[^a-z]*[a-z])+/i);

                if (fragmentMatch) {
                    let extracted = fragmentMatch[0].toLowerCase().replace(/[^a-z0-9@._%+-]/g, '');
                    if (extracted.includes('.') && extracted.length > 5) {
                        candidates.push(extracted);
                    }
                }
                atIdx++;
            }
        }

        if (candidates.length === 0) return null;
        candidates.sort((a, b) => b.length - a.length);
        return candidates[0];
    };

    const rawEmail = getEmail();
    if (rawEmail) {
        let email = rawEmail;

        // --- RECURSIVE NUCLEAR CLEANUP ---
        // Keeps cleaning until no more noise is found
        let lastEmail;
        const noiseRegex = /^(results|resultados|contato|email|gmail|hotmail|outlook|nome|name|cv|link|perfil|perfi|z-|a\.|aluno\.|c\.|processos|digitais|digital|digitals|linkedin|github|telefone|tel|fone|cel|user|usuario|login|fiocruz|ciocruz|ufc|unifor|secretaria|gab|pref|gov|fundacao|fundaçao|inst|edu|lab|site|web|prof|professora?|curriculo|curriculum)[:\s\-_]*/i;
        const cepRegex = /^[a-z]{0,2}\d{5,15}/i;
        const orphanRegex = /^[a-z]{1,2}[.\-_]/i;

        do {
            lastEmail = email;
            email = email.replace(noiseRegex, '');
            email = email.replace(cepRegex, '');
            email = email.replace(orphanRegex, '');
            // Strip leading single noise letters (n, c, z)
            if (/^[nzcup](?=[a-z])/.test(email) && email.length > 8) {
                email = email.substring(1);
            }
            email = email.replace(/^[.\-_]+/, '');
        } while (email !== lastEmail && email.length > 0);

        // Domain fix (TLD)
        const atPos = email.indexOf('@');
        if (atPos !== -1) {
            const domain = email.substring(atPos);
            const tlds = ['.com.br', '.com', '.net.br', '.org.br', '.edu.br', '.net', '.org', '.me', '.co', '.io', '.br'];
            let bestTld = tlds.find(t => domain.includes(t)) || "";
            if (bestTld) {
                email = email.substring(0, atPos) + domain.substring(0, domain.indexOf(bestTld) + bestTld.length);
            }
        }

        result.email = email.replace(/[.,\/_-]+$/, '');
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
