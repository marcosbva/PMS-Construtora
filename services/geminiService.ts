

import { GoogleGenAI } from "@google/genai";
import { BudgetCategory } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Helper to handle retries for 429 errors (Rate Limits)
 */
async function generateWithRetry(model: string, prompt: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent({
        model: model,
        contents: prompt,
      });
    } catch (error: any) {
      // Check for quota exceeded (429) or similar ephemeral errors
      // The error object from the library might wrap the actual response
      const statusCode = error?.status || error?.code || error?.response?.status;
      const message = error?.message || JSON.stringify(error);
      
      const isQuotaError = statusCode === 429 || statusCode === 'RESOURCE_EXHAUSTED' || message.includes('RESOURCE_EXHAUSTED') || message.includes('429');

      if (isQuotaError) {
        if (i === retries - 1) throw error; // Rethrow on last attempt
        
        // Exponential backoff: 1s, 2s, 4s...
        const waitTime = 1000 * Math.pow(2, i);
        console.warn(`Gemini Quota limit hit. Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error; // Non-retriable error
    }
  }
  throw new Error("Unexpected retry loop exit");
}

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

    // Use retry wrapper
    const response = await generateWithRetry('gemini-2.5-flash', prompt);

    const text = response.text || "{}";
    // Basic sanitization to ensure we get clean JSON if model adds backticks
    const jsonStr = text.replace(/```json|```/g, '').trim();
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Analysis Error (Fallback used):", error);
    // Return robust fallback so UI doesn't break
    return { priority: 'Média', summary: 'Análise indisponível (Cota IA excedida)', isNC: false };
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

    // Use retry wrapper
    const response = await generateWithRetry('gemini-2.5-flash', prompt);
    return response.text;
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    return "Resumo automático indisponível no momento.";
  }
}

/**
 * Generates an intelligent construction budget structure (WBS/EAP) based on work details.
 */
export const generateBudgetStructure = async (workName: string, workDescription: string): Promise<BudgetCategory[]> => {
  try {
    const prompt = `
      Atue como um Engenheiro Civil Sênior Especialista em Orçamentos e BIM.
      Crie uma Estrutura Analítica de Projeto (EAP) / Orçamento Estimativo para a seguinte obra:
      
      Nome da Obra: ${workName}
      Descrição: ${workDescription}

      Gere uma lista de etapas (Categorias) e serviços principais (Itens) que são essenciais para este tipo de obra.
      Para cada item, estime uma unidade de medida padrão (m², un, m³, vb) e uma quantidade aproximada baseada na descrição (chute educado se não houver dados). O preço unitário pode ser 0.

      Responda EXCLUSIVAMENTE um JSON com o seguinte formato (Array de Categories):
      [
        {
          "id": "cat_1",
          "name": "1. Serviços Preliminares",
          "categoryTotal": 0,
          "items": [
             { "id": "item_1", "description": "Limpeza do Terreno", "unit": "m²", "quantity": 100, "unitPrice": 0, "totalPrice": 0, "notes": "Estimado" }
          ]
        },
        ...
      ]
      
      Não inclua markdown. Apenas o JSON puro.
    `;

    const response = await generateWithRetry('gemini-2.5-flash', prompt);
    const text = response.text || "[]";
    const jsonStr = text.replace(/```json|```/g, '').trim();
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Budget Error:", error);
    return [];
  }
}