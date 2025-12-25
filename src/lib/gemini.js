
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
            Sua missão é extrair Nome, Email e Telefone de textos de currículos que podem estar muito bagunçados devido à extração de PDF.

            ### Exemplos de Treino (Entrada Bagunçada -> Saída Limpa):
            Exemplo 1:
            Entrada: "c e630 17 010 elibbcosta @ hotmail . comlinkedin.com/in/elibb"
            Saída: {"nome": "não encontrado", "email": "elibbcosta@hotmail.com", "telefone": "não encontrado"}

            Exemplo 2:
            Entrada: "t a h _ c o s t a h @ h o t m a i l . c o m ( 8 5 ) 9 8 1 0 7 - 0 5 5 0"
            Saída: {"nome": "não encontrado", "email": "tah_costah@hotmail.com", "telefone": "(85) 98107-0550"}

            Exemplo 3:
            Entrada: "Nome: FRANCISCO UENIO PEREIRA DA SILVA... u e n i o @ h o t m a i l . c o m"
            Saída: {"nome": "FRANCISCO UENIO PEREIRA DA SILVA", "email": "uenio@hotmail.com", "telefone": "não encontrado"}

            ### Suas Tarefas:
            1. Identifique o Nome Completo. Se estiver precedido por "Nome:", remova o prefixo.
            2. Identifique o Email. Remova qualquer espaço interno ou texto grudado no final (como "linkedin").
            3. Identifique o Telefone (DDD incluído). Remova espaços internos.
            
            ### Regras Estritas:
            - Retorne APENAS o JSON puro. Sem Markdown.
            - Se um campo não for encontrado, use "não encontrado".
            - Ignore ruidos de PDF (espaços entre letras de uma mesma palavra).

            ### Texto a Processar:
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
