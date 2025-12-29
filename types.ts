
export interface CodeSnippet {
  id: string;
  language: string;
  code: string;
  description: string;
  timestamp: number;
}

export interface GroundingLink {
  uri: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  image?: string;
  video?: string;
  audio?: string;
  timestamp: number;
  groundingLinks?: GroundingLink[];
  isThinking?: boolean;
}

export interface AppState {
  isListening: boolean;
  isProcessing: boolean;
  currentCode: string;
  currentDescription: string;
  history: CodeSnippet[];
  error: string | null;
  view: 'code' | 'preview' | 'assistant' | 'studio';
  chatHistory: ChatMessage[];
  selectedImage: string | null;
  useThinking: boolean;
  useGrounding: 'none' | 'search' | 'maps';
}

export enum ModelName {
  LIVE = 'gemini-2.5-flash-native-audio-preview-09-2025',
  PRO = 'gemini-3-pro-preview',
  FLASH = 'gemini-3-flash-preview',
  FLASH_LITE = 'gemini-2.5-flash-lite-latest',
  FLASH_IMAGE = 'gemini-2.5-flash-image',
  PRO_IMAGE = 'gemini-3-pro-image-preview',
  VEO = 'veo-3.1-fast-generate-preview',
  TTS = 'gemini-2.5-flash-preview-tts',
  MAPS_BASE = 'gemini-2.5-flash'
}
