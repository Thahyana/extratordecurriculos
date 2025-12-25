
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
            2. NUNCA use cargos, funções ou cursos no campo nome. Exemplos do que IGNORAR: "Desenvolvimento Full Stack", "Desenvolvedor", "Assistente", "Eletricista", "Engenheiro".
            3. Se o nome vier com endereço grudado, CORTA o endereço.
            4. Se no topo estiver escrito "Desenvolvimento Full Stack" e o nome estiver abaixo, USE O NOME.
            5. NUNCA inclua símbolos como "–", "&" ou ":" no nome.

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
