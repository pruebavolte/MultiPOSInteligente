import OpenAI from "openai";
import type { VoiceCommand, LanguageCode, Product } from "@shared/schema";

// This is using OpenAI's API - reference: javascript_openai blueprint
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function detectLanguage(text: string): Promise<LanguageCode> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content:
            "Detect the language of the text and respond with a language code. Respond with JSON in this format: { 'language': 'es' | 'en' | 'fr' | 'de' | 'zh' | 'ja' }",
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return (result.language as LanguageCode) || "en";
  } catch (error) {
    console.error("Error detecting language:", error);
    return "en";
  }
}

export async function parseVoiceCommand(
  transcription: string,
  language: LanguageCode,
  products: Product[]
): Promise<{ command: VoiceCommand; product?: Product }> {
  try {
    const productList = products
      .filter((p) => p.active && p.stock > 0)
      .map((p) => `${p.name} (SKU: ${p.sku})`)
      .join(", ");

    const promptTemplates = {
      es: `Analiza el siguiente comando de voz de un cliente en un punto de venta y extrae la acción y el producto mencionado.

Productos disponibles: ${productList}

Comando: "${transcription}"

Identifica:
1. Tipo de comando: "add" (agregar), "remove" (quitar), "change" (cambiar cantidad), "search" (buscar), "total" (cuánto es), "complete" (finalizar), "cancel" (cancelar)
2. Nombre del producto (si aplica) - usa búsqueda aproximada
3. Cantidad (si se menciona, si no, usa 1)

Responde en JSON: { "type": "add|remove|change|search|total|complete|cancel", "productName": "nombre exacto del producto disponible o null", "quantity": número }`,
      
      en: `Analyze the following voice command from a customer at a point of sale and extract the action and mentioned product.

Available products: ${productList}

Command: "${transcription}"

Identify:
1. Command type: "add", "remove", "change" (quantity), "search", "total", "complete", "cancel"
2. Product name (if applicable) - use fuzzy matching
3. Quantity (if mentioned, otherwise use 1)

Respond in JSON: { "type": "add|remove|change|search|total|complete|cancel", "productName": "exact product name from available list or null", "quantity": number }`,
    };

    const prompt = promptTemplates[language] || promptTemplates.en;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a smart POS system assistant that processes voice commands accurately.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    const command: VoiceCommand = {
      type: result.type || "search",
      productName: result.productName || undefined,
      quantity: result.quantity || 1,
    };

    // Find the best matching product using fuzzy search
    let matchedProduct: Product | undefined;
    if (command.productName) {
      const searchTerm = command.productName.toLowerCase();
      matchedProduct = products.find(
        (p) =>
          p.active &&
          p.stock > 0 &&
          (p.name.toLowerCase().includes(searchTerm) ||
            searchTerm.includes(p.name.toLowerCase()) ||
            p.sku.toLowerCase() === searchTerm ||
            p.barcode?.toLowerCase() === searchTerm)
      );
    }

    return { command, product: matchedProduct };
  } catch (error) {
    console.error("Error parsing voice command:", error);
    return {
      command: { type: "search", productName: transcription, quantity: 1 },
    };
  }
}
