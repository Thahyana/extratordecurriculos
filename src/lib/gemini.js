
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractWithRegex } from "./regex-extractor";


export async function extractResumeData(text, apiKey) {
    if (!apiKey) {
        throw new Error("Chave da API Gemini não fornecida.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-pro"
    ];

    let aiResult = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`Tentando conectar com modelo: ${modelName}`);
            const model = genAI.getGenerativeModel({
                model: modelName,
            });

            const prompt = `
            Você é um assistente especialista em extração de dados de currículos.
            A missão é extrair APENAS o Nome Civil do candidato, Email e Telefone.

            ### REGRAS DO NOME (EXTREMA IMPORTÂNCIA):
            1. O nome deve ser APENAS o Nome CIVIL COMPLETO (ex: "Edna Mara Mattza").
            2. IGNORAR COMPLETAMENTE cabeçalhos de seção misturados ao nome. Exemplos: "Cursos Extracurriculares", "Habilidades", "Projetos", "Experiência".
            3. NUNCA inclua letras soltas como "n" ou "c" que pareçam ruído de PDF no meio do nome.
            4. Se o nome estiver quebrado, una apenas as partes do nome civil.
            5. NUNCA inclua datas, meses ou o termo "Início".

            ### REGRAS DE EMAIL (INFALÍVEL):
            1. O email deve ser APENAS o endereço real (ex: "fulano@gmail.com").
            2. NUNCA inclua ruidos de PDF como CEPs, nomes de instituições (ex: "fiocruz-", "ciocruz-", "ufc-") ou palavras de seções ("processos", "digitais", "cv").
            3. Ignore letras soltas ou prefixos institucionais grudados no início do email (ex: "ciocruz-maramattza@..." -> USE "maramattza@...").
            4. Se encontrar fragmentos de email em linhas diferentes, una-as.
            5. Se encontrar "ce63017010elibbcosta@hotmail.com", o correto é APENAS "elibbcosta@hotmail.com".

            RETORNE APENAS JSON:
            {"nome": "...", "email": "...", "telefone": "..."}

            TEXTO DO CURRÍCULO:
            """
            ${text}
            """
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let textResponse = response.text();

            // Limpeza robusta do JSON
            textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            // Tenta encontrar o objeto JSON se houver texto extra
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                aiResult = JSON.parse(jsonMatch[0]);
                break; // Sucesso com a IA
            }
        } catch (error) {
            console.warn(`Falha com modelo ${modelName}:`, error.message);
        }
    }

    // Se a IA não retornou nada ou faltam campos importantes, usamos Regex como reforço
    const regexResult = extractWithRegex(text);

    if (!aiResult) {
        return regexResult;
    }

    // Mesclar resultados: IA tem preferência, mas se for "não encontrado", tentamos Regex
    const finalResult = {
        nome: aiResult.nome && aiResult.nome !== "não encontrado" ? aiResult.nome : regexResult.nome,
        email: aiResult.email && aiResult.email !== "não encontrado" ? aiResult.email : regexResult.email,
        telefone: aiResult.telefone && aiResult.telefone !== "não encontrado" ? aiResult.telefone : regexResult.telefone
    };

    return finalResult;
}
