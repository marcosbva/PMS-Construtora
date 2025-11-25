
import { GoogleGenAI } from "@google/genai";
import { BudgetCategory, ConstructionWork } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Helper to handle retries for 429 errors (Rate Limits)
 * Updated to accept string or complex content object
 */
async function generateWithRetry(model: string, contents: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent({
        model: model,
        contents: contents,
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
 * Generates an intelligent construction budget structure (WBS/EAP) based on work details and optional image.
 */
export const generateBudgetStructure = async (workName: string, workDescription: string, fileBase64?: string): Promise<BudgetCategory[]> => {
  try {
    const textPrompt = `
      Atue como um Engenheiro Civil Sênior, Especialista em Orçamentos de Obras Residenciais e BIM Manager.
      Sua tarefa é criar uma Estrutura Analítica de Projeto (EAP) detalhada e profissional para a seguinte obra:
      
      Nome da Obra: ${workName}
      Descrição e Escopo: ${workDescription}

      ${fileBase64 ? 'Um arquivo técnico (Planta Baixa em Imagem ou Projeto em PDF) foi fornecido. ANALISE VISUALMENTE este arquivo para extrair quantitativos (m² de alvenaria, contagem de pontos elétricos, áreas de piso) e identificar especificações técnicas implícitas.' : ''}

      Regras de Negócio:
      1. Seja extremamente técnico e detalhista. Não use termos genéricos. Use termos de orçamentação (ex: "Regularização de contrapiso", "Emboço paulista", "Pintura Acrílica 2 demãos").
      2. Estime quantidades realistas baseadas na descrição e no arquivo fornecido. Se não houver dados exatos, use sua experiência em obras residenciais para projetar uma média segura.
      3. Organize em etapas lógicas construtivas (Preliminares -> Estrutura -> Vedação -> Instalações -> Acabamentos).

      Responda EXCLUSIVAMENTE um JSON com o seguinte formato (Array de Categories):
      [
        {
          "id": "cat_1",
          "name": "1. Serviços Preliminares",
          "categoryTotal": 0,
          "items": [
             { "id": "item_1", "description": "Limpeza mecanizada do terreno", "unit": "m²", "quantity": 100, "unitPrice": 0, "totalPrice": 0, "notes": "Estimado via análise visual" }
          ]
        },
        ...
      ]
      
      Não inclua markdown, não inclua explicações. Apenas o JSON puro.
    `;

    let contents: any;

    if (fileBase64) {
      // Extract mime type and data from data URL
      // Format: data:image/png;base64,iVBORw0KGgo... OR data:application/pdf;base64,...
      const matches = fileBase64.match(/^data:(.+);base64,(.+)$/);
      if (matches && matches.length === 3) {
         const mimeType = matches[1];
         const data = matches[2];
         
         contents = {
           parts: [
             { text: textPrompt },
             { inlineData: { mimeType, data } }
           ]
         };
      } else {
         // Fallback if regex fails
         contents = textPrompt;
      }
    } else {
      contents = textPrompt;
    }

    const response = await generateWithRetry('gemini-2.5-flash', contents);
    const text = response.text || "[]";
    const jsonStr = text.replace(/```json|```/g, '').trim();
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Budget Error:", error);
    return [];
  }
}

/**
 * Generates the text content for a formal commercial proposal (PDF)
 */
export const generateBudgetProposalText = async (work: ConstructionWork, categories: BudgetCategory[]) => {
  try {
    // Flatten items for context, but limit length to avoid token limits
    const scopeSummary = categories.map(c => 
      `- ${c.name}: ${c.items.length} itens previstos.`
    ).join('\n');

    const prompt = `
      Atue como um Engenheiro e Gerente Comercial Sênior da PMS Construtora.
      Escreva o texto para uma **Proposta Comercial Formal** para o cliente abaixo.

      **Dados da Obra:**
      Cliente: ${work.client || 'Cliente Final'}
      Obra: ${work.name}
      Endereço: ${work.address}
      Prazo Estimado: ${work.startDate} a ${work.endDate} (se houver datas)

      **Escopo Resumido:**
      ${scopeSummary}

      **Sua Tarefa:**
      Gere um texto profissional formatado em Markdown contendo APENAS as seções de texto (não gere a tabela de preços, pois eu já tenho ela).
      O texto deve conter:
      1. **Apresentação**: Breve parágrafo formal apresentando a proposta.
      2. **Metodologia Executiva**: Um parágrafo descrevendo que a obra seguirá normas técnicas (ABNT), com segurança e qualidade.
      3. **Condições de Fornecimento**:
         - Mencionar que materiais básicos e acabamentos serão definidos conforme cronograma.
         - Mencionar que a mão de obra é especializada.
      4. **Condições Gerais e Exclusões**:
         - Liste 3 ou 4 exclusões padrão em orçamentos civis (ex: taxas de prefeitura, projetos não citados, imprevistos ocultos).
      5. **Encerramento**: Cordial e profissional.

      Tom de voz: Profissional, Seguro, Engenharia.
      Não coloque cabeçalho ou rodapé. Apenas o corpo do texto.
    `;

    const response = await generateWithRetry('gemini-2.5-flash', prompt);
    return response.text;
  } catch (error) {
    console.error("Gemini Proposal Error:", error);
    return "## Erro na geração do texto\n\nNão foi possível gerar o texto da proposta com IA. Por favor, edite este campo manualmente com as condições comerciais.";
  }
}
