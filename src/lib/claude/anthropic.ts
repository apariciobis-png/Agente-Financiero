import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

/** Modelo fijado en docs/architecture.md — solo se llama desde el servidor. */
export const MODELO_ENTREVISTA = 'claude-sonnet-5';

export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Falta ANTHROPIC_API_KEY en el entorno del servidor.');
  }
  return new Anthropic({ apiKey });
}
