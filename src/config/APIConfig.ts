/**
 * APIConfig — single source of truth for all third-party API providers.
 *
 * Every service interface (TranslationService, ChatService, SpeechService,
 * etc.) reads its provider + credentials from this file. To swap providers,
 * change ONLY this file — business logic never touches provider specifics.
 *
 * Keys are read from Vite env vars (import.meta.env.VITE_*) so nothing is
 * hardcoded in source. Add the matching VITE_* vars to .env to activate a
 * provider.
 */

export const APIConfig = {
  translation: {
    provider: (import.meta.env.VITE_TRANSLATION_PROVIDER ?? 'dictionary') as
      | 'dictionary' | 'google',
    apiKey: import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY ?? '',
    endpoint: 'https://translation.googleapis.com/language/translate/v2',
    supportedLanguages: [
      'en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'gu', 'pa', 'bn', 'or', 'as', 'ur',
    ] as const,
    defaultLanguage: 'en' as const,
  },

  chat: {
    provider: (import.meta.env.VITE_CHAT_PROVIDER ?? 'rule-based') as
      | 'rule-based' | 'openai' | 'gemini',
    apiKey: import.meta.env.VITE_CHAT_API_KEY ?? '',
    endpoint: import.meta.env.VITE_CHAT_ENDPOINT ?? '',
    model: import.meta.env.VITE_CHAT_MODEL ?? 'gpt-4o-mini',
  },

  speech: {
    provider: (import.meta.env.VITE_SPEECH_PROVIDER ?? 'webspeech') as
      | 'webspeech' | 'google',
    apiKey: import.meta.env.VITE_SPEECH_API_KEY ?? '',
  },

  ocr: {
    provider: (import.meta.env.VITE_OCR_PROVIDER ?? 'tesseract') as
      | 'tesseract' | 'google-vision',
    apiKey: import.meta.env.VITE_OCR_API_KEY ?? '',
  },
} as const;

export type LanguageCode = (typeof APIConfig.translation.supportedLanguages)[number];
