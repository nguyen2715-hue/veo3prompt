// This file should only contain type definitions.

export interface Model {
    id: string;
    faceImage: File | null;
    faceImageUrl?: string;
    detailsJson: string;
}

export interface ImageDetail {
    base64: string;
    mimeType: string;
    source: string; // e.g., 'product-1', 'model-1'
}

export interface VisualStyleDetail {
    baseStyle: 'cinematic' | 'modern_trendy' | 'anime' | '3d_animation';
    colorAndMood: string;
    lighting: string;
    cameraAndFraming: string;
    artisticInfluence: string;
}

export interface FormState {
    projectName: string;
    idea: string;
    content: string;
    duration: number;
    aspectRatio: '9:16' | '16:9' | '1:1' | '4:5';
    imageFiles: File[];
    geminiTokens: string[];
    elevenLabsTokens: string[];
    elevenLabsVoiceId: string;
    languageCode: string;
    scriptGenModel: 'gemini-2.5-pro' | 'gemini-2.5-flash';
    imageGenModel: 'gemini_flash_image' | 'imagen_4';
    models: Model[];
    settingDescription: string;
    scriptStyle: 'viral' | 'koc_review' | 'story';
    visualStyleDetail: VisualStyleDetail;
    numberOfVideos: number;
    veoModel: 'veo_fast' | 'veo_ultra';
    socialPlatform: 'tiktok' | 'youtube';
    youtubeTitle: string;
    youtubeDescription: string;
    youtubeTags: string;
    thumbnailText: string;
    autoGenerateThumbnailText: boolean;
    // FIX: Add missing fields for batch processing to resolve type errors.
    googleWorkspaceToken: string;
    batchInputSheetId: string;
    batchModelLibraryFolderId: string;
    batchProductLibraryFolderId: string;
    batchOutputSheetId: string;
    batchOutputDriveFolderId: string;
}

export interface PromptStructure {
    character_details: string;
    setting_details: string;
    key_action: string;
    camera_direction: string;
    original_language_dialogue?: string;
}

export interface PromptOutputFormat {
    Type: string;
    Structure: PromptStructure;
}

export interface PromptPersona {
    Role: string;
    Tone: string;
    Knowledge_Level: string;
}

export interface Prompt {
    Objective: string;
    Persona: PromptPersona;
    Task_Instructions: string[];
    Constraints: string[];
    Input_Examples: any[]; // Or define a proper type if known
    Output_Format: PromptOutputFormat;
}

export interface Scene {
    scene: number;
    description: string;
    voiceover: string;
    voicer: string;
    languageCode: string;
    prompt: Prompt;
}

export interface EnhancedScene extends Scene {
    isPreviewLoading: boolean;
    previewImageUrls?: string[];
    error?: string;
    videoUrl?: string;
    isVideoLoading: boolean;
    videoError?: string;
    imageGenPrompt?: string;
    videoGenPrompt?: string;
    isVoiceoverEnhancing?: boolean;
}

interface YouTubePost {
    platform: 'youtube';
    title: string;
    description: string;
    tags: string;
}

interface TikTokPostVersion {
    post: string;
    hashtags: string;
}

interface TikTokPost {
    platform: 'tiktok';
    versions: TikTokPostVersion[];
}

export type SocialPost = YouTubePost | TikTokPost;

// FIX: Add missing types for Batch Processing status.
export type BatchProjectStatusState = 'pending' | 'processing' | 'completed' | 'error';

export interface BatchProjectStatus {
    rowIndex: number;
    name: string;
    status: BatchProjectStatusState;
    message: string;
    error?: string;
}

export interface BatchRunState {
    projects: BatchProjectStatus[];
    overall: {
        current: number;
        total: number;
    };
    startTime: number;
}

// FIX: Add missing type for Product Search.
export interface ProductSearchResult {
    id: number;
    name: string;
    store: string;
    status: 'idle' | 'loading' | 'done' | 'error';
    foundImageUrls?: string[];
    error?: string;
}

// FIX: Add missing type for Project Snapshots.
export interface ProjectSnapshot {
    name: string;
    timestamp: number;
    formState: FormState;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  preview_url: string;
}

export interface ElevenLabsUserDetails { 
    apiKey: string; 
    voiceName: string; 
    tier: string; 
    characterCount: number; 
    characterLimit: number; 
}