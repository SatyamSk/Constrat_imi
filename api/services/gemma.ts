/**
 * Google Gemma AI service
 */

import type { GemmaRequest, GemmaResponse } from '../types';
import { ExternalServiceError } from '../lib/errors';
import { logger } from '../lib/logger';

const GEMMA_API_KEY = process.env.GEMMA_API_KEY || '';
const GEMMA_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemma-2-9b-it:generateContent';

interface GemmaApiRequest {
  contents: Array<{
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
  }>;
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
    topK?: number;
    topP?: number;
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

interface GemmaApiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Call Gemma API for text generation
 */
export async function callGemma(
  request: GemmaRequest,
  requestId?: string,
): Promise<GemmaResponse> {
  try {
    if (!GEMMA_API_KEY) {
      throw new Error('Gemma API key not configured');
    }

    const payload: GemmaApiRequest = {
      contents: [
        {
          role: 'user',
          parts: [{ text: request.prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: request.maxTokens || 1024,
        temperature: request.temperature || 0.7,
        topK: request.topK || 40,
        topP: request.topP || 0.95,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_ONLY_HIGH',
        },
      ],
    };

    logger.debug('Calling Gemma API', {
      requestId,
      promptLength: request.prompt.length,
    });

    const response = await fetch(
      `${GEMMA_API_URL}?key=${GEMMA_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error('Gemma API error', new Error(error), { requestId });
      throw new Error(`API responded with ${response.status}`);
    }

    const data = (await response.json()) as GemmaApiResponse;

    if (!data.candidates || !data.candidates[0]) {
      throw new Error('No response from Gemma');
    }

    const text = data.candidates[0].content.parts.map((p) => p.text).join('');
    const tokens = data.usageMetadata?.totalTokenCount || 0;

    logger.info('Gemma API call successful', {
      requestId,
      tokens,
    });

    return {
      text,
      tokens,
      model: 'gemma-2-9b-it',
    };
  } catch (error) {
    logger.error('Gemma API call failed', error as Error, { requestId });
    throw new ExternalServiceError('Gemma', (error as Error).message);
  }
}

/**
 * Extract structured data from document using Gemma
 */
export async function extractFromDocument(
  documentText: string,
  instructions: string,
  requestId?: string,
): Promise<Record<string, unknown>> {
  try {
    const prompt = `
Extract structured data from the following document following these instructions:

Instructions:
${instructions}

Document:
${documentText}

Return ONLY valid JSON without markdown formatting.
    `.trim();

    const response = await callGemma(
      {
        prompt,
        maxTokens: 2048,
        temperature: 0.1,
      },
      requestId,
    );

    const parsed = JSON.parse(response.text);
    return parsed;
  } catch (error) {
    logger.error('Document extraction failed', error as Error, { requestId });
    throw new ExternalServiceError('Gemma', 'Failed to extract document data');
  }
}

/**
 * Classify document using Gemma
 */
export async function classifyDocument(
  documentText: string,
  categories: string[],
  requestId?: string,
): Promise<{
  category: string;
  confidence: number;
  reasoning: string;
}> {
  try {
    const categoriesList = categories.map((c, i) => `${i + 1}. ${c}`).join('\n');

    const prompt = `
Classify the following document into ONE of these categories:

${categoriesList}

Document:
${documentText.substring(0, 3000)}

Respond with JSON format: {"category": "...", "confidence": 0.0-1.0, "reasoning": "..."}
    `.trim();

    const response = await callGemma(
      {
        prompt,
        maxTokens: 512,
        temperature: 0.1,
      },
      requestId,
    );

    const parsed = JSON.parse(response.text);
    return {
      category: parsed.category || categories[0],
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      reasoning: parsed.reasoning || '',
    };
  } catch (error) {
    logger.error('Document classification failed', error as Error, { requestId });
    throw new ExternalServiceError('Gemma', 'Failed to classify document');
  }
}

/**
 * Generate summary using Gemma
 */
export async function generateSummary(
  text: string,
  maxLength = 300,
  requestId?: string,
): Promise<string> {
  try {
    const prompt = `
Summarize the following text in ${maxLength} characters or less:

${text}

Provide ONLY the summary, nothing else.
    `.trim();

    const response = await callGemma(
      {
        prompt,
        maxTokens: Math.floor(maxLength / 4) + 100,
        temperature: 0.5,
      },
      requestId,
    );

    return response.text.substring(0, maxLength);
  } catch (error) {
    logger.error('Summary generation failed', error as Error, { requestId });
    throw new ExternalServiceError('Gemma', 'Failed to generate summary');
  }
}

/**
 * Extract keywords using Gemma
 */
export async function extractKeywords(
  text: string,
  maxKeywords = 10,
  requestId?: string,
): Promise<string[]> {
  try {
    const prompt = `
Extract up to ${maxKeywords} keywords from the following text:

${text}

Return as JSON array: ["keyword1", "keyword2", ...]
    `.trim();

    const response = await callGemma(
      {
        prompt,
        maxTokens: 256,
        temperature: 0.1,
      },
      requestId,
    );

    const parsed = JSON.parse(response.text);
    return Array.isArray(parsed) ? parsed.slice(0, maxKeywords) : [];
  } catch (error) {
    logger.error('Keyword extraction failed', error as Error, { requestId });
    return [];
  }
}
