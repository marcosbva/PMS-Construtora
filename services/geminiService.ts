import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes a new task description to suggest priority and detect risks.
 */
export const analyzeTaskContent = async (title: string, description: string): Promise<{ priority: string; summary: string; isNC: boolean }> => {
  try {
    const prompt = `
      Você é um assistente de engenharia civil para a construtora PMS.
      Analise a seguinte tarefa:
      Título: ${title}
      Descrição: ${description}

      Responda APENAS um JSON com o seguinte formato, sem markdown:
      {
        "priority": "Baixa" | "Média" | "Alta",
        "summary": "Uma frase curta resumindo a ação técnica necessária",
        "isNC": boolean (true se parecer um defeito, erro, rachadura, infiltração, vazamento)
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || "{}";
    // Basic sanitization to ensure we get clean JSON if model adds backticks
    const jsonStr = text.replace(/```json|```/g, '').trim();
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return { priority: 'Média', summary: 'Análise indisponível', isNC: false };
  }
};

/**
 * Summarizes daily logs into a weekly report snippet.
 */
export const summarizeLogs = async (logs: string[]) => {
  if (logs.length === 0) return "Sem registros para resumir.";
  
  try {
    const prompt = `
      Resuma os seguintes registros diários de obra em um parágrafo executivo para o engenheiro chefe:
      ${logs.join('\n---\n')}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    return "Erro ao gerar resumo.";
  }
}
