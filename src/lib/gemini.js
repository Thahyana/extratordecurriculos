
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractWithRegex } from "./regex-extractor";


export async function extractResumeData(text, apiKey) {
    if (!apiKey) {
        throw new Error("Chave da API Gemini não fornecida.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Using gemini-1.5-flash for speed and cost effectiveness
    const modelsToTry = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-pro",
        "gemini-pro",
        "gemini-1.0-pro"
    ];

    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`Tentando conectar com modelo: ${modelName}`);
            const model = genAI.getGenerativeModel({
                model: modelName,
            });

            const prompt = `
            Você é um assistente especialista em extração de dados de currículos.
            Analise o texto fornecido abaixo e extraia os seguintes campos:
            - nome (O nome completo do candidato)
            - email (O endereço de email principal)
            - telefone (O número de telefone principal)

            Regras:
            1. Retorne um objeto JSON estrito.
            2. Se algum dado não for encontrado, o valor deve ser exatamente "não encontrado".
            3. Normalize/formate o telefone se possível.

            Texto do currículo:
            """
            ${text}
            """
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let textResponse = response.text();

            // Remove markdown code blocks if present
            textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(textResponse);

        } catch (error) {
            console.warn(`Falha com modelo ${modelName}:`, error.message);
            lastError = error;
            // If it is not a 404/Not Found, might be worth stopping, but trying all is safer for connectivity issues.
        }
    }

    console.error("Todas as tentativas de modelo Gemini falharam. Usando extração por regex como fallback.");
    console.warn("AVISO: A extração por regex é menos precisa que a IA. Considere verificar sua chave API do Gemini.");

    // Fallback to regex extraction
    return extractWithRegex(text);
}
