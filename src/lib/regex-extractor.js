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

    // Email pattern
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const emailMatch = text.match(emailRegex);
    if (emailMatch && emailMatch[0]) {
        result.email = emailMatch[0];
    }

    // Phone pattern (Brazilian formats)
    const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}/g;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch && phoneMatch[0]) {
        result.telefone = phoneMatch[0].trim();
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

    // Process first 30 lines
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
            'idiomas', 'languages'
        ];

        const lowerLine = line.toLowerCase();
        const hasSkipWord = skipWords.some(word => lowerLine.includes(word));
        const hasPhone = /\(\d{2}\)\s*\d{4,5}[-\s]?\d{4}/.test(line);

        if (hasSkipWord || hasPhone) {
            console.log(`  [${i}] SKIP - palavra-chave/telefone detectado`);
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
                'florianópolis', 'vitória', 'cuiabá', 'campo', 'grande'
            ];

            // Collect words until we hit a city or state
            const validWords = [];
            for (const word of capitalWords) {
                const lower = word.toLowerCase();

                // Stop at city names
                if (cities.includes(lower)) {
                    console.log(`  [${i}] Parando em cidade: ${word}`);
                    break;
                }

                // Stop at state abbreviations
                if (/^(CE|SP|RJ|MG|BA|PR|SC|RS|PE|PA|AM|RO|AC|AP|RR|TO|MA|PI|AL|SE|PB|RN|MT|MS|GO|DF)$/i.test(word)) {
                    console.log(`  [${i}] Parando em estado: ${word}`);
                    break;
                }

                // Add valid word (at least 2 chars)
                if (word.length >= 2) {
                    validWords.push(word);
                }

                // Stop after collecting 2-5 words (typical name length)
                if (validWords.length >= 5) {
                    break;
                }
            }

            if (validWords.length >= 1) {
                result.nome = validWords.join(' ');
                console.log(`  [${i}] ✓✓✓ NOME ENCONTRADO: "${result.nome}"`);
                break;
            }
        }

        console.log(`  [${i}] Nenhuma palavra capitalizada válida`);
    }

    console.log('=== FIM DEBUG ===');
    console.log('Resultado:', result);

    return result;
}
