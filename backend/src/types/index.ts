// AWS Lambda Event Types
export interface APIGatewayProxyEvent {
  pathParameters: { [name: string]: string } | null;
  queryStringParameters: { [name: string]: string } | null;
  body: string | null;
  headers: { [name: string]: string };
  httpMethod: string;
  path: string;
  requestContext: {
    requestId: string;
    stage: string;
    identity: {
      sourceIp: string;
      userAgent: string;
    };
  };
}

export interface APIGatewayProxyResult {
  statusCode: number;
  headers?: { [header: string]: string | boolean };
  body: string;
}

// POSL Domain Types
export interface User {
  userId: string;
  email: string;
  xUserId?: string;
  xUsername?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface Settings {
  userId: string;
  settingType: SettingType;
  data: any;
  updatedAt: string;
}

export type SettingType = 
  | 'post-time'
  | 'week-theme'
  | 'event'
  | 'trend'
  | 'tone'
  | 'template'
  | 'prompt'
  | 'x-auth';

// 投稿関連
export interface PostLog {
  userId: string;
  postId: string;
  content: string;
  timestamp: string;
  xPostId?: string;
  prompt: string;
  trendData?: TrendData[];
  success: boolean;
  error?: string;
}

export interface TrendData {
  keyword: string;
  rank: number;
  category?: string;
  trafficVolume?: number;
  region?: string;
}

// 日記・人格関連
export interface Diary {
  userId: string;
  diaryId: string;
  originalText: string;
  audioFileUrl?: string;
  extractedPersonaTraits: PersonaTrait[];
  emotionTags: string[];
  createdAt: string;
  processedAt?: string;
  transcriptionStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  s3Key?: string;
  duration?: number;
  fileSize?: number;
}

export interface PersonaTrait {
  category: string;
  trait: string;
  confidence: number;
  examples: string[];
}

export interface PersonaProfile {
  userId: string;
  summary: string;
  traits: PersonaTrait[];
  commonTopics: string[];
  speakingStyle: {
    formality: number;
    positivity: number;
    expertise: number;
    emotionLevel: number;
  };
  lastUpdated: string;
  diaryCount: number;
}

// 設定データの型定義
export interface PostTimeSettings {
  enabled: boolean;
  time: string; // HH:mm format
  timezone: string;
}

export interface WeekThemeSettings {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export interface EventSettings {
  enabled: boolean;
  customEvents: CustomEvent[];
  behavior: 'add' | 'replace';
}

export interface CustomEvent {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  description: string;
  templateOverride?: string;
  enabled: boolean;
}

export interface TrendSettings {
  enabled: boolean;
  sources: ('google' | 'yahoo')[];
  mixRatio: number; // 0-100
  mixStyle: 'brief' | 'casual' | 'detailed' | 'humor';
  excludeCategories: string[];
}

export interface ToneSettings {
  politeness: number; // 0-100
  casualness: number; // 0-100
  positivity: number; // 0-100
  expertise: number; // 0-100
  emotionLevel: number; // 0-100
  metaphorUsage: number; // 0-100
  emojiUsage: number; // 0-100
}

export interface TemplateSettings {
  enabled: string[]; // template IDs
  priorities: { [templateId: string]: number };
}

export interface PromptSettings {
  additionalRules: string;
  ngWords: string[];
  preferredPhrases: string[];
  creativityLevel: number; // 0.0-1.0
}

export interface XAuthSettings {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  verified: boolean;
  lastVerified?: string;
}

// エラーレスポンス
export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
}

// API レスポンス
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 音声アップロード関連
export interface AudioUploadRequest {
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface AudioUploadResponse {
  uploadUrl: string;
  diaryId: string;
  s3Key: string;
}

export interface TranscriptionRequest {
  diaryId: string;
  s3Key: string;
  language?: string;
}

export interface TranscriptionResponse {
  diaryId: string;
  transcribedText: string;
  confidence: number;
  processingTimeMs: number;
}