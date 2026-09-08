/**
 * AI-Powered Schema Generator — generates OpenAPI schemas from tool descriptions
 * using Gemini structured outputs. Used when a repo lacks a manifest file.
 *
 * Uses Gemini's responseMimeType: "application/json" with responseSchema
 * to constrain the output to a valid JSON object. The schema field is
 * returned as a string (the JSON Schema as text) which we parse client-side,
 * guaranteeing we get a valid schema with dynamic property names.
 *
 * Callers: src/crawler.ts (optional enrichment fallback)
 */
import { GoogleGenAI, Type } from "@google/genai";
import { config } from "./config.js";
import type { ToolSchema } from "./types.js";

/** Result from Gemini schema generation */
export interface SchemaGenerationResult {
  /** Generated JSON Schema for the tool's input */
  schema: ToolSchema;
  /** Confidence score (0-1) */
  confidence?: number;
}

/**
 * Use Gemini to generate a JSON Schema from a tool description.
 * Falls back to a minimal empty schema on failure or when no API key is set.
 *
 * Uses Gemini structured outputs (responseSchema + responseMimeType) to
 * guarantee the response is valid JSON. The "schema" field is returned as
 * a stringified JSON Schema which we parse on the client — this avoids
 * Gemini's `additionalProperties` limitation which doesn't support
 * dynamic property names in nested objects.
 */
export async function generateToolSchema(
  toolName: string,
  description: string,
): Promise<SchemaGenerationResult> {
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    return { schema: { type: "object", properties: {} } };
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = config.geminiSchemaModel ?? "gemini-3.6-flash";

  const systemInstruction =
    `You are a tool schema generator. Given a tool name and description, ` +
    `generate a JSON Schema (Draft-07) for the tool's input parameters. ` +
    `Analyze the description for parameters (strings, numbers, booleans, ` +
    `arrays, objects) and create properties for them. If no parameters are ` +
    `mentioned, return an empty schema: {"type":"object","properties":{}}.`;

  const userPrompt = `Tool: "${toolName}"
Description: ${description}

Return your response as a JSON object with two fields:
- "schema": a string containing a JSON Schema (Draft-07) object
- "confidence": a number 0-1 representing your confidence`;

  // Response schema — constrains Gemini to emit only this shape.
  // The "schema" field is a string (containing the JSON Schema as text)
  // because Gemini's responseSchema doesn't support additionalProperties
  // with dynamic keys for nested objects.
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      schema: {
        type: Type.STRING,
        description:
          "A JSON Schema (Draft-07) string describing the tool's input parameters",
      },
      confidence: {
        type: Type.NUMBER,
        description: "Confidence score 0-1",
      },
    },
    required: ["schema"],
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction,
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      return { schema: { type: "object", properties: {} } };
    }

    // With responseSchema set, response.text is guaranteed to be valid JSON.
    const data = JSON.parse(text) as { schema: string; confidence?: number };
    if (!data?.schema) {
      return { schema: { type: "object", properties: {} } };
    }

    // Parse the schema string into a ToolSchema object
    let parsedSchema: ToolSchema;
    try {
      parsedSchema = JSON.parse(data.schema) as ToolSchema;
    } catch {
      return { schema: { type: "object", properties: {} } };
    }

    if (!parsedSchema || parsedSchema.type !== "object") {
      return { schema: { type: "object", properties: {} } };
    }

    return { schema: parsedSchema, confidence: data.confidence };
  } catch {
    return { schema: { type: "object", properties: {} } };
  }
}

/**
 * Generate a schema URL for an auto-generated schema.
 */
export function generatedSchemaUrl(namespace: string): string {
  return `https://aipages.nous.ai/schemas/${namespace}.json`;
}
