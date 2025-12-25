/**
 * Fallback extractor using regex patterns
 * Used when Gemini API is unavailable
 */

export function extractWithRegex(text) {
    const result = {
        nome: "não encontrado",
        email: "não encontrado",
        telefone: "não encontrado"
    };

    // Email pattern - more robust
    const emailRegex = /[a-zA-Z0-9._%+!$&'*-/=?^`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
    const emailMatch = text.match(emailRegex);
    if (emailMatch && emailMatch[0]) {
        result.email = emailMatch[0].toLowerCase();
    }

    // Phone pattern (Brazilian formats) - improved to catch more variations
    const phoneRegex = /(?:\+?55\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\s?)?[2-9]\d{3})[-\s]?(\d{4}))/g;

    let bestPhone = null;
    const phoneMatches = [...text.matchAll(phoneRegex)];

    for (const match of phoneMatches) {
        const fullMatch = match[0];
        const isDateRange = /^(19|20)\d{2}\s*-\s*(19|20)\d{2}$/.test(fullMatch);
        if (!isDateRange) {
            // Prefer matches with DDD
            if (match[1] || !bestPhone) {
                bestPhone = fullMatch.trim();
            }
        }
    }

    if (bestPhone) {
        result.telefone = bestPhone;
    }

    // Name extraction - handle single-line PDFs
    let lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // If we got only 1 line, it might be a PDF with weird formatting
    // Try splitting on common delimiters
    if (lines.length === 1) {
        const singleLine = lines[0];
        // Split on patterns like "  n  " or multiple spaces or common separators
        lines = singleLine
            .split(/\s{2,}n\s{2,}|\s{3,}|[|;]/)
            .map(l => l.trim())
            .filter(l => l.length > 0);
        console.log('PDF tinha 1 linha, dividido em', lines.length, 'partes');
    }

    // Also try splitting by common patterns if still too few lines
    if (lines.length < 5) {
        const allText = lines.join(' ');
        // Try to split by email, phone, or other obvious separators
        const betterLines = allText
            .split(/(?=\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4})|(?=[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})|(?=LinkedIn:|GitHub:|Sobre|Formação|Experiência|Habilidades)/i)
            .map(l => l.trim())
            .filter(l => l.length > 0);

        if (betterLines.length > lines.length) {
            lines = betterLines;
            console.log('Melhor divisão encontrada:', lines.length, 'partes');
        }
    }

    console.log('=== DEBUG EXTRAÇÃO DE NOME ===');
    console.log('Total de linhas após split:', lines.length);
    console.log('Primeiras 20 linhas:');
    lines.slice(0, 20).forEach((line, i) => console.log(`  [${i}] "${line}"`));

    // Process first 30 lines to find potential name candidates
    const nameCandidates = [];

    for (let i = 0; i < Math.min(30, lines.length); i++) {
        const line = lines[i];

        // Skip very short lines
        if (line.length < 2) {
            console.log(`  [${i}] SKIP - muito curto`);
            continue;
        }

        // Skip lines with obvious non-name content
        const skipWords = [
            '@', 'www.', 'http', '.com', '.br',
            'curriculum', 'currículo', 'resume',
            'telefone', 'phone', 'cel', 'celular',
            'email', 'e-mail',
            'endereço', 'address', 'rua', 'av.',
            'linkedin', 'github', 'portfolio',
            'objetivo', 'objective',
            'experiência', 'experience',
            'formação', 'education', 'escolaridade',
            'habilidades', 'skills', 'competências',
            'idiomas', 'languages',
            'perfil', 'profile', 'resumo', 'summary',
            'profissional', 'professional',
            'contato', 'contact', 'contact info',
            'sobre', 'about',
            'ensino', 'educação', 'colégio', 'faculdade', 'universidade', 'escola',
            'prêmio', 'award', 'bolsa', 'scholarship'
        ];

        const lowerLine = line.toLowerCase();
        const hasSkipWord = skipWords.some(word => lowerLine.includes(word));

        // Relax digit check: allow single digit (noise/pagination), reject 2+ (dates/phones/address)
        const digitCount = (line.match(/\d/g) || []).length;
        const hasTooManyDigits = digitCount >= 2;
        const hasPhone = /\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/.test(line);

        if (hasSkipWord || hasPhone || hasTooManyDigits) {
            console.log(`  [${i}] SKIP - palavra-chave/telefone/muitos números detectados`);
            continue;
        }

        // Clean the line and split by common separators
        let cleanLine = line
            .replace(/^(nome|name|candidato|candidate):\s*/i, '')
            .replace(/^[-•]\s*/, '')
            .replace(/\s+n\s+/g, ' ')  // Remove " n " artifacts
            .replace(/\s*[–-]\s*[A-Z]{2}\s*$/, '')  // Remove "– CE", "- SP" at end
            .trim();

        // Extract capitalized words (names usually start with capital)
        const capitalWords = cleanLine.match(/[A-ZÀ-ÚÇ][a-zà-úçA-ZÀ-ÚÇ'\-]*/g);

        if (capitalWords && capitalWords.length > 0) {
            // Common Brazilian cities to stop at
            const cities = [
                'fortaleza', 'são', 'paulo', 'rio', 'janeiro', 'belo', 'horizonte',
                'brasília', 'salvador', 'curitiba', 'recife', 'porto', 'alegre',
                'manaus', 'belém', 'goiânia', 'campinas', 'luís',
                'maceió', 'natal', 'teresina', 'joão', 'pessoa', 'aracaju',
                'florianópolis', 'vitória', 'cuiabá', 'campo', 'grande', 'ceará', 'brasil'
            ];

            // Collect words until we hit a city or state
            const validWords = [];

            // Helper to process words from a line
            const processWords = (words) => {
                for (const word of words) {
                    const lower = word.toLowerCase();
                    // Stop at specific keywords that weren't caught by line skipping (e.g. inside a line)
                    if ([
                        'telefone', 'email', 'endereço', 'address',
                        'engenharia', 'engineer', 'analista', 'analyst', 'desenvolvedor', 'developer',
                        'mecânica', 'mechanic', 'elétrica', 'electric', 'técnico', 'technician',
                        'auxiliar', 'assistant', 'estagiário', 'intern', 'gerente', 'manager'
                    ].includes(lower)) break;


                    if (cities.includes(lower)) break;

                    // Stop at state abbreviations
                    if (/^(CE|SP|RJ|MG|BA|PR|SC|RS|PE|PA|AM|RO|AC|AP|RR|TO|MA|PI|AL|SE|PB|RN|MT|MS|GO|DF)$/i.test(word)) break;

                    // Add valid word (at least 2 chars)
                    if (word.length >= 2) {
                        validWords.push(word);
                    }
                }
            };

            processWords(capitalWords);

            // Look ahead to next lines for split names
            let nextLineIdx = i + 1;
            while (validWords.length < 6 && nextLineIdx < Math.min(i + 3, lines.length)) {
                const nextLine = lines[nextLineIdx];
                const nextLineLower = nextLine.toLowerCase();
                const nextHasSkipWord = skipWords.some(word => nextLineLower.includes(word));
                const nextDigitCount = (nextLine.match(/\d/g) || []).length;
                const nextHasTooManyDigits = nextDigitCount >= 2;
                const nextHasPhone = /\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/.test(nextLine);

                if (nextHasSkipWord || nextHasTooManyDigits || nextHasPhone) {
                    break;
                }

                let cleanNextLine = nextLine
                    .replace(/^(nome|name|candidato|candidate):\s*/i, '')
                    .replace(/^[-•]\s*/, '')
                    .trim();

                const nextCapitalWords = cleanNextLine.match(/[A-ZÀ-ÚÇ][a-zà-úçA-ZÀ-ÚÇ'\-]*/g);
                if (nextCapitalWords && nextCapitalWords.length > 0) {
                    processWords(nextCapitalWords);
                } else {
                    break;
                }
                nextLineIdx++;
            }


            if (validWords.length >= 2) {
                const candidateName = validWords.join(' ');

                // Scoring system
                let score = 0;

                // Prefer candidates closer to the top (lines 0-5)
                if (i <= 5) score += 5;
                else if (i <= 10) score += 2;

                // Prefer longer names (3+ parts), likely full name vs "Burton Davis"
                if (validWords.length >= 3) score += 3;

                // Check if next line contains strong career/contact signals
                // This is a very strong indicator for the main header
                const lookAheadLimit = Math.min(nextLineIdx + 2, lines.length);
                for (let checkIdx = nextLineIdx; checkIdx < lookAheadLimit; checkIdx++) {
                    const checkLine = lines[checkIdx].toLowerCase();
                    if (checkLine.includes('engenharia') || checkLine.includes('desenvolvedor') || checkLine.includes('analista') || checkLine.includes('telefone') || checkLine.includes('email') || checkLine.includes('perfil profissional')) {
                        score += 10;
                        console.log(`  [${i}] Bônus de contexto: linha seguinte tem palavra-chave de currículo`);
                        break;
                    }
                }

                console.log(`  [${i}] Candidato: "${candidateName}" (Score: ${score})`);
                nameCandidates.push({ name: candidateName, score });
            }
        } else {
            console.log(`  [${i}] Nenhuma palavra capitalizada válida`);
        }
    }

    if (nameCandidates.length > 0) {
        // Sort by score descending
        nameCandidates.sort((a, b) => b.score - a.score);
        result.nome = nameCandidates[0].name;
        console.log(`=== VENCEDOR: "${result.nome}" com score ${nameCandidates[0].score} ===`);
    } else {
        console.log('Nenhum candidato a nome encontrado.');
    }

    console.log('=== FIM DEBUG ===');
    console.log('Resultado:', result);

    return result;
}
