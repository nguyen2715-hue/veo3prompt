import React, { useState } from 'react';
import JSZip from 'jszip';
import { useLocalization } from '../hooks/useLocalization';

const getSourceFiles = (): Record<string, string> => {
    const sourceFiles: Record<string, string> = {};

    const escape = (str: string) => str.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

    sourceFiles['index.html'] = escape(`<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KỊCH BẢN VIDEO THẦN THÁNH</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      :root {
        --color-brand-bg: 249 250 251; /* gray-50 */
        --color-surface: 255 255 255; /* white */
        --color-primary: 59 130 246; /* blue-500 */
        --color-primary-hover: 37 99 235; /* blue-600 */
        --color-text-main: 17 24 39; /* gray-900 */
        --color-text-secondary: 107 114 128; /* gray-500 */
        --color-border-color: 209 213 219; /* gray-300 */
        
        /* Semantic Colors */
        --color-success: 16 185 129;  /* emerald-500 */
        --color-success-hover: 5 150 105; /* emerald-600 */
        --color-error: 239 68 68;    /* red-500 */
        --color-error-hover: 220 38 38; /* red-600 */
        --color-warning: 245 158 11; /* amber-500 */
        --color-warning-hover: 217 119 6; /* amber-600 */
      }
      html.dark {
        --color-brand-bg: 17 24 39; /* gray-900 */
        --color-surface: 31 41 55; /* gray-800 */
        --color-primary: 96 165 250; /* blue-400 */
        --color-primary-hover: 59 130 246; /* blue-500 */
        --color-text-main: 243 244 246; /* gray-100 */
        --color-text-secondary: 156 163 175; /* gray-400 */
        --color-border-color: 55 65 81; /* gray-700 */
        
        /* Semantic Colors */
        --color-success: 16 185 129;  /* emerald-500 */
        --color-success-hover: 52 211 153; /* emerald-400 */
        --color-error: 248 113 113;    /* red-400 */
        --color-error-hover: 252 165 165; /* red-300 */
        --color-warning: 252 211 77;   /* amber-300 */
        --color-warning-hover: 253 224 71; /* amber-200 */
      }
      /* Custom scrollbar for dark mode for a better UX */
      html.dark ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      html.dark ::-webkit-scrollbar-track {
        background: rgb(var(--color-surface));
      }
      html.dark ::-webkit-scrollbar-thumb {
        background-color: #4b5563; /* gray-600 */
        border-radius: 4px;
        border: 2px solid rgb(var(--color-surface));
      }
    </style>
    <script>
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            colors: {
              'brand-bg': 'rgb(var(--color-brand-bg) / <alpha-value>)',
              'surface': 'rgb(var(--color-surface) / <alpha-value>)',
              'primary': 'rgb(var(--color-primary) / <alpha-value>)',
              'primary-hover': 'rgb(var(--color-primary-hover) / <alpha-value>)',
              'text-main': 'rgb(var(--color-text-main) / <alpha-value>)',
              'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
              'border-color': 'rgb(var(--color-border-color) / <alpha-value>)',
              'success': 'rgb(var(--color-success) / <alpha-value>)',
              'success-hover': 'rgb(var(--color-success-hover) / <alpha-value>)',
              'error': 'rgb(var(--color-error) / <alpha-value>)',
              'error-hover': 'rgb(var(--color-error-hover) / <alpha-value>)',
              'warning': 'rgb(var(--color-warning) / <alpha-value>)',
              'warning-hover': 'rgb(var(--color-warning-hover) / <alpha-value>)',
            },
            ringColor: {
              'primary': 'rgb(var(--color-primary))',
            }
          },
        },
      }
    </script>
  <script type="importmap">
{
  "imports": {
    "react/": "https://aistudiocdn.com/react@^19.2.0/",
    "react": "https://aistudiocdn.com/react@^19.2.0",
    "@google/genai": "https://aistudiocdn.com/@google/genai@^1.22.0",
    "react-dom/": "https://aistudiocdn.com/react-dom@^19.2.0/",
    "jszip": "https://esm.sh/jszip@3.10.1"
  }
}
</script>
</head>
  <body class="bg-brand-bg text-text-main">
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>`);

    sourceFiles['index.tsx'] = escape(`import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);`);

    sourceFiles['metadata.json'] = escape(`{
  "name": "Copy of Kịch bản video v1 (chuẩn)",
  "description": "An application to generate professional video scripts in JSON format for the Veo AI video generator, based on user ideas, content, and reference images.",
  "requestFramePermissions": []
}`);

    sourceFiles['types.ts'] = escape(`// This file should only contain type definitions.

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
}`);
    
    // FIX: Replaced regex with string literals in .replace() to fix syntax errors caused by unescaped forward slashes in file paths.
    sourceFiles['App.tsx'] = escape(document.querySelector('file:contains("App.tsx")')!.textContent!.replace('--- START OF FILE App.tsx ---', '').replace('--- END OF FILE App.tsx ---', ''));
    
    // FIX: Replaced regex with string literals in .replace() to fix syntax errors caused by unescaped forward slashes in file paths.
    const geminiServiceContent = document.querySelector('file:contains("services/geminiService.ts")')!.textContent!.replace('--- START OF FILE services/geminiService.ts ---', '').replace('--- END OF FILE services/geminiService.ts ---', '');
    // Fix the regex that causes the syntax error
    const fixedGeminiServiceContent = geminiServiceContent.replace(
        `model.detailsJson.replace(/\\/\\*[\\s\\S]*?\\*\\/|([^\\\\:]|^)\\/\\/.*$/gm, '$1')`,
        `model.detailsJson.replace(/\\u002F\\u002A[\\s\\S]*?\\u002A\\u002F|([^\\\\:]|^)\\/\\/.*$/gm, '$1')`
    );
    sourceFiles['services/geminiService.ts'] = escape(fixedGeminiServiceContent);

    const otherFiles = [
        'constants.ts',
        'components/Header.tsx',
        'components/ScriptForm.tsx',
        'components/JsonDisplay.tsx',
        'components/ImagePreview.tsx',
        'components/Loader.tsx',
        'components/icons.tsx',
        'localization/vi.json',
        'contexts/LanguageContext.tsx',
        'hooks/useLocalization.ts',
        'components/LanguageSwitcher.tsx',
        'components/FlowTokenInput.tsx',
        'services/flowService.ts',
        'components/ApiSettingsModal.tsx',
        'components/ApiTokenInput.tsx',
        'components/SocialPostDisplay.tsx',
        'components/GoogleImportForm.tsx',
        'components/BatchProcessForm.tsx',
        'components/ProductSearchForm.tsx',
        'components/BatchStatusDisplay.tsx',
        'components/SnapshotManagerModal.tsx',
        'README.md',
        'requirements.txt'
    ];
    
    otherFiles.forEach(path => {
       const selector = `file:contains("${path}")`;
       const element = document.querySelector(selector);
       if(element) {
           let content = element.textContent || '';
           const startMarker = `--- START OF FILE ${path} ---`;
           const endMarker = `--- END OF FILE ${path} ---`;
           if (content.includes(startMarker)) {
                content = content.substring(content.indexOf(startMarker) + startMarker.length, content.indexOf(endMarker));
           }
           sourceFiles[path] = escape(content.trim());
       }
    });

    return sourceFiles;
};

interface DownloadCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DownloadCodeModal: React.FC<DownloadCodeModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLocalization();
    const [isZipping, setIsZipping] = useState(false);

    const handleDownload = async () => {
        setIsZipping(true);
        try {
            const zip = new JSZip();
            const sourceFiles = getSourceFiles();
            for (const path in sourceFiles) {
                // Ensure directories are created
                const folders = path.split('/').slice(0, -1);
                let currentFolder: JSZip | null = zip;
                folders.forEach(folderName => {
                    if (currentFolder) {
                        currentFolder = currentFolder.folder(folderName);
                    }
                });
                
                if (currentFolder) {
                    const fileName = path.split('/').pop();
                    if (fileName) {
                       currentFolder.file(fileName, sourceFiles[path]);
                    }
                } else {
                     zip.file(path, sourceFiles[path]);
                }
            }

            const content = await zip.generateAsync({ type: 'blob' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'video-script-app-source.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error("Failed to generate zip file:", error);
            alert("Error creating zip file.");
        } finally {
            setIsZipping(false);
            onClose();
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-surface rounded-lg shadow-2xl w-full max-w-md flex flex-col border border-border-color"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 text-center">
                    <h2 className="text-xl font-bold text-text-main">{t('downloadCodeModal.title')}</h2>
                    <p className="mt-2 text-text-secondary">{t('downloadCodeModal.body')}</p>
                </div>
                <div className="flex justify-end gap-3 p-4 bg-brand-bg/50 border-t border-border-color rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-text-secondary bg-surface rounded-md border border-border-color hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        disabled={isZipping}
                    >
                        {t('downloadCodeModal.cancel')}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-md hover:bg-primary-hover transition disabled:bg-primary/50"
                        disabled={isZipping}
                    >
                        {isZipping ? t('downloadCodeModal.zipping') : t('downloadCodeModal.download')}
                    </button>
                </div>
            </div>
        </div>
    );
};
