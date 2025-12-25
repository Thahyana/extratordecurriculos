
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
            Analise o texto fornecido abaixo e extraia com PRECISÃO:
            - nome: Nome completo do candidato
            - email: Endereço de email (procure por padrões como user@domain.com)
            - telefone: Número de telefone/celular (procure por padrões com DDD como (11) 98888-7777 ou similares)

            Regras IMPORTANTES:
            1. Retorne APENAS um objeto JSON no formato: {"nome": "...", "email": "...", "telefone": "..."}
            2. Se o dado não existir de forma alguma, use "não encontrado".
            3. Para o telefone, remova espaços desnecessários e mantenha o DDD se disponível.
            4. Não inclua Markdown, apenas o JSON puro.

            Texto do currículo:
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
