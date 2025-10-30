import React, { useState } from 'react';
import JSZip from 'jszip';
import type { EnhancedScene, SocialPost } from '../types';
import * as geminiService from '../services/geminiService';
import { useLocalization } from '../hooks/useLocalization';
import { DownloadIcon } from './icons';

interface AssetDownloaderProps {
    script: EnhancedScene[];
    projectName: string;
    socialPost: SocialPost | null;
    duration: number;
    thumbnailUrl: string | null;
    elevenLabsTokens: string[];
    elevenLabsVoiceId: string;
}

const getTransitionGuideText = (t: (key: string, replacements?: Record<string, string | number> | undefined) => string): string => {
    return `
---
${t('transitions.title')}
---
${t('transitions.intro')}

**${t('transitions.section.software')}**
${t('transitions.software.list')}

**${t('transitions.section.transitions')}**

*${t('transitions.transitions.standard.title')}*
${t('transitions.transitions.standard.list')}

*${t('transitions.transitions.creative.title')}*
${t('transitions.transitions.creative.list')}

**${t('transitions.section.audio')}**
${t('transitions.audio.body')}

**${t('transitions.section.pacing')}**
${t('transitions.pacing.body')}
    `.trim().replace(/^\s+/gm, '');
};


const AssetDownloader: React.FC<AssetDownloaderProps> = ({
    script,
    projectName,
    socialPost,
    duration,
    thumbnailUrl,
    elevenLabsTokens,
    elevenLabsVoiceId
}) => {
    const { t } = useLocalization();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDownload = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const zip = new JSZip();
            const assetsFolder = zip.folder(projectName);
            if (!assetsFolder) {
                throw new Error("Could not create project folder in zip.");
            }

            // 1. Script JSON
            const cleanScript = script.map(({ previewImageUrls, isPreviewLoading, error, videoUrl, isVideoLoading, videoError, imageGenPrompt, videoGenPrompt, ...rest }) => rest);
            const finalScriptObject = { scenes: cleanScript };
            const scriptJsonString = JSON.stringify(finalScriptObject, null, 2);
            assetsFolder.file('script.json', scriptJsonString);
            
            // Per-scene prompts
            const promptsFolder = assetsFolder.folder('prompts');
            script.forEach(scene => {
                promptsFolder?.file(`scene_${scene.scene}_prompt.json`, JSON.stringify(scene.prompt, null, 2));
            });

            // 2. Social Post + Guide
            if (socialPost) {
                let socialPostText = '';
                if (socialPost.platform === 'youtube') {
                    socialPostText = `TIÊU ĐỀ:\n${socialPost.title}\n\nMÔ TẢ:\n${socialPost.description}\n\nTAGS:\n${socialPost.tags}`;
                } else if (socialPost.platform === 'tiktok') {
                    socialPostText = socialPost.versions.map((v, i) => `--- ${t('socialPost.version', { number: i + 1 })} ---\n${v.post}\n\n${v.hashtags}`).join('\n\n\n');
                }
                assetsFolder.file('social_post.txt', socialPostText);
            }
            assetsFolder.file('editing_guide.txt', getTransitionGuideText(t));


            // 3. Subtitles SRT file
            const srtContent = geminiService.generateSrtContent(script, duration);
            if (srtContent) {
                assetsFolder.file('subtitles.srt', srtContent);
            }

            // 4. Thumbnail Image
            if (thumbnailUrl) {
                const thumbBlob = await geminiService.dataUrlToBlob(thumbnailUrl);
                assetsFolder.file('thumbnail.png', thumbBlob);
            }

            // 5. Preview Images
            const imagesFolder = assetsFolder.folder('preview_images');
            const imagePromises = script.map(async (scene) => {
                if (scene.previewImageUrls && scene.previewImageUrls.length > 0) {
                    const imageUrl = scene.previewImageUrls[0];
                    try {
                        const blob = await geminiService.dataUrlToBlob(imageUrl);
                        imagesFolder?.file(`scene_${scene.scene}_preview.png`, blob);
                    } catch (e) {
                         console.error(`Failed to fetch blob for scene ${scene.scene} preview image.`, e);
                    }
                }
            });
            await Promise.all(imagePromises);
            
            // 6. Audio Files (TTS)
            const audioFolder = assetsFolder.folder('audio');
            const audioBlobs = await geminiService.generateAndFetchAllAudioBlobs(
                script,
                elevenLabsTokens,
                elevenLabsVoiceId
            );
            if (audioBlobs.length > 0) {
                 audioBlobs.forEach(audio => {
                    audioFolder?.file(audio.name, audio.blob);
                });
            }


            // 7. Generate ZIP and trigger download
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectName}_assets.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to create zip file", err);
            setError(t('downloader.error.zip'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <button
                onClick={handleDownload}
                disabled={isLoading}
                className="flex w-full sm:w-auto items-center justify-center gap-2 bg-surface hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-text-secondary font-medium py-2 px-3 rounded-md border border-border-color transition-colors disabled:opacity-60 disabled:cursor-wait"
            >
                <DownloadIcon className="w-4 h-4" />
                <span>{isLoading ? t('downloader.button.loading') : t('downloader.button.label')}</span>
            </button>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
    );
};

// FIX: Remove unused wrapper component and export the main component directly.
export default AssetDownloader;