import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { EnhancedScene, SocialPost, BatchRunState } from '../types';
import type { ElevenLabsUserDetails } from '../services/geminiService';
import { textToSpeechElevenLabs } from '../services/geminiService';
import { useLocalization } from '../hooks/useLocalization';
import SocialPostDisplay from './SocialPostDisplay';
import AssetDownloader from './AssetDownloader';
import Loader from './Loader';
import BatchStatusDisplay from './BatchStatusDisplay';
import StoryboardView from './StoryboardView';
import { RefreshIcon, VideoIcon, CopyIcon, CheckIcon, DownloadIcon, SpeakerIcon, ChevronDownIcon, DocumentTextIcon, FrameIcon, SparklesIcon } from './icons';

interface ResultsDisplayProps {
    script: EnhancedScene[];
    projectName: string;
    aspectRatio: string;
    duration: number;
    elevenLabsTokens: string[];
    elevenLabsVoiceId: string;
    elevenLabsDetails: ElevenLabsUserDetails[];
    onRegenerateScene: (sceneIndex: number) => void;
    onGenerateVideo: (sceneIndex: number) => void;
    onGenerateAllVideos: () => void;
    onEnhanceVoiceover: (sceneIndex: number) => void;
    thumbnailUrl: string | null;
    isThumbnailLoading: boolean;
    thumbnailError: string | null;
    onRegenerateThumbnail: () => void;
    socialPost: SocialPost | null;
    isSocialPostLoading: boolean;
    socialPostError: string | null;
    scriptGenModel: string;
    imageGenModel: string;
    veoModel: string;
}

const ThumbnailDisplay: React.FC<{
    thumbnailUrl: string | null;
    isLoading: boolean;
    error: string | null;
    onRegenerate: () => void;
    projectName: string;
}> = ({ thumbnailUrl, isLoading, error, onRegenerate, projectName }) => {
    const { t } = useLocalization();

    return (
        <div className="p-4 border border-border-color rounded-lg bg-brand-bg">
            <h3 className="text-lg font-bold text-text-main mb-3">{t('thumbnail.title')}</h3>
            <div className="relative aspect-[16/9] bg-surface rounded-md flex items-center justify-center">
                {isLoading && (
                    <div className="flex items-center flex-col">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-3 text-sm text-text-secondary">{t('thumbnail.generating')}</p>
                    </div>
                )}
                {error && !isLoading && (
                    <div className="text-center p-4">
                        <p className="font-semibold text-error">{t('thumbnail.error')}</p>
                        <p className="text-sm text-error mt-1 max-w-md mx-auto">{error}</p>
                    </div>
                )}
                {thumbnailUrl && !isLoading && (
                     <a href={thumbnailUrl} download={`${projectName}-thumbnail.png`} title={t('thumbnail.download')}>
                        <img src={thumbnailUrl} alt={t('thumbnail.alt')} className="w-full h-full object-cover rounded-md" />
                     </a>
                )}
                {!thumbnailUrl && !isLoading && !error && (
                    <p className="text-text-secondary">{t('thumbnail.placeholder')}</p>
                )}
            </div>
            <div className="mt-4 flex justify-end">
                <button
                    onClick={onRegenerate}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50"
                >
                    <RefreshIcon className="w-4 h-4" />
                    <span>{t('thumbnail.regenerate')}</span>
                </button>
            </div>
        </div>
    );
};

export const getAspectRatioClass = (ratio: string) => {
    switch (ratio) {
        case '16:9': return 'aspect-video';
        case '9:16': return 'aspect-[9/16]';
        case '1:1': return 'aspect-square';
        case '4:5': return 'aspect-[4/5]';
        default: return 'aspect-video';
    }
};

const SceneCard: React.FC<{
    scene: EnhancedScene;
    index: number;
    aspectRatio: string;
    onRegenerateScene: (index: number) => void;
    onGenerateVideo: (index: number) => void;
    onEnhanceVoiceover: (index: number) => void;
    elevenLabsTokens: string[];
    elevenLabsVoiceId: string;
}> = ({ scene, index, aspectRatio, onRegenerateScene, onGenerateVideo, onEnhanceVoiceover, elevenLabsTokens, elevenLabsVoiceId }) => {
    const { t } = useLocalization();
    const [isPromptVisible, setIsPromptVisible] = useState(false);
    const [copiedPrompt, setCopiedPrompt] = useState<'video' | 'image' | null>(null);
    const [ttsState, setTtsState] = useState<{ status: 'idle' | 'loading' | 'error', audioSrc: string | null, error: string | null }>({ status: 'idle', audioSrc: null, error: null });
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const voiceover = scene.voiceover || '';
    
    const generateAudio = useCallback(async (): Promise<string> => {
        const textToSpeak = voiceover.replace(/\[.*?\]/g, '... ').trim();
        if (!textToSpeak) throw new Error("No text to speak.");

        setTtsState(prev => ({ ...prev, status: 'loading', error: null }));

        try {
            let base64Audio: string | undefined;
            if (!elevenLabsTokens || elevenLabsTokens.length === 0) throw new Error(t('error.tts.elevenlabs.missing_key'));
            
            let lastError: any;
            for (const key of elevenLabsTokens) {
                if (!key) continue;
                try {
                    base64Audio = await textToSpeechElevenLabs({ text: textToSpeak, model_id: 'eleven_v3' }, key, elevenLabsVoiceId);
                    lastError = null; // Success
                    break;
                } catch (err) {
                    lastError = err;
                    const message = (err as Error).message;
                    if (message.includes('QUOTA') || message.includes('BLOCKED')) {
                        console.warn(`ElevenLabs key ending in ...${key.slice(-4)} failed due to quota/block. Trying next.`);
                        continue;
                    }
                    break; // Non-retriable error for this key
                }
            }
            if (lastError) throw lastError;
            if (!base64Audio) throw new Error(t('error.elevenlabs.all_keys_failed'));


            const audioSrc = `data:audio/mpeg;base64,${base64Audio}`;
            setTtsState({ status: 'idle', audioSrc, error: null });
            return audioSrc;
        } catch (err) {
            console.error("TTS Error:", err);
            const message = err instanceof Error ? err.message : String(err);
            
            let displayMessage = message;
            if (message === 'ELEVENLABS_QUOTA_EXCEEDED') {
                displayMessage = t('error.quota.exceeded.elevenlabs');
            } else if (message === 'ELEVENLABS_FREE_TIER_BLOCKED') {
                displayMessage = t('error.tts.elevenlabs.free_tier_blocked');
            }
            
            setTtsState({ status: 'error', audioSrc: null, error: displayMessage });
            throw new Error(displayMessage);
        }
    }, [voiceover, elevenLabsTokens, elevenLabsVoiceId, t]);

    const handlePlayAudio = useCallback(async () => {
        if (ttsState.status === 'loading') return;
        if (ttsState.audioSrc && audioRef.current) {
            audioRef.current.play();
            return;
        }

        try {
            const audioSrc = await generateAudio();
            if (audioSrc && audioRef.current) {
                audioRef.current.src = audioSrc;
                audioRef.current.play().catch(e => console.error("Audio playback failed", e));
            }
        } catch (e) {
            // Error state is already set by generateAudio
        }
    }, [ttsState.audioSrc, ttsState.status, generateAudio]);

    const handleDownloadAudio = useCallback(async () => {
        try {
            const audioSrc = ttsState.audioSrc || await generateAudio();
             const blob = await (await fetch(audioSrc)).blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${t('scene.title', { sceneNumber: scene.scene })}_audio.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Could not download audio:", e);
        }
    }, [ttsState.audioSrc, generateAudio, scene.scene, t]);
    
    const handleDownloadImage = useCallback(async () => {
        if (!scene.previewImageUrls || scene.previewImageUrls.length === 0) return;
        try {
            const imageUrl = scene.previewImageUrls[0];
            const blob = await (await fetch(imageUrl)).blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${t('scene.title', { sceneNumber: scene.scene })}_image.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Could not download image:", e);
        }
    }, [scene.previewImageUrls, scene.scene, t]);

    const handleCopyVideoPrompt = useCallback(() => {
        if (!scene.videoGenPrompt) return;
        navigator.clipboard.writeText(scene.videoGenPrompt);
        setCopiedPrompt('video');
        setTimeout(() => setCopiedPrompt(null), 2000);
    }, [scene.videoGenPrompt]);

    const handleCopyImagePrompt = useCallback(() => {
        if (!scene.imageGenPrompt) return;
        navigator.clipboard.writeText(scene.imageGenPrompt);
        setCopiedPrompt('image');
        setTimeout(() => setCopiedPrompt(null), 2000);
    }, [scene.imageGenPrompt]);

    const ActionButton: React.FC<{
        onClick: () => void;
        icon: React.ReactNode;
        text: string;
        disabled?: boolean;
    }> = ({ onClick, icon, text, disabled }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-text-secondary"
        >
            {icon}
            <span>{text}</span>
        </button>
    );

    return (
        <div className="bg-surface rounded-lg border border-border-color overflow-hidden">
            <div className="flex flex-col md:flex-row">
                {/* Image/Video Preview */}
                <div className="md:w-[40%] xl:w-1/3 p-4 flex-shrink-0">
                    <div className={`${getAspectRatioClass(aspectRatio)} w-full bg-brand-bg rounded-md flex items-center justify-center relative`}>
                        {scene.videoUrl && !scene.isVideoLoading && <video src={scene.videoUrl} controls className="w-full h-full object-cover rounded-md" />}
                        {!scene.videoUrl && scene.previewImageUrls && <img src={scene.previewImageUrls[0]} alt={`${t('scene.preview.alt')} 1`} className="w-full h-full object-cover rounded-md" />}
                        
                        {(scene.isPreviewLoading || scene.isVideoLoading) && <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>}
                        
                        {scene.error && !scene.isPreviewLoading && <div className="p-2 text-error text-xs text-center">{scene.error}</div>}
                        {scene.videoError && !scene.isVideoLoading && <div className="p-2 text-error text-xs text-center">{scene.videoError}</div>}
                    </div>
                </div>

                {/* Description and Voiceover */}
                <div className="md:w-[60%] xl:w-2/3 p-4 flex flex-col border-t md:border-t-0 md:border-l border-border-color/50">
                    <h4 className="font-bold text-lg text-primary">
                        {t('scene.title', { sceneNumber: scene.scene })}
                    </h4>
                    <p className="text-text-main mt-1 text-sm flex-grow">{scene.description}</p>
                    {voiceover && (
                        <div className="mt-3 pt-3 border-t border-border-color/50">
                            <div className="flex justify-between items-start gap-2">
                                <p className="text-sm text-text-secondary flex-grow">
                                    <span className="font-semibold text-text-main">{t('scene.voiceover')}:</span> {voiceover}
                                </p>
                                <button
                                    onClick={() => onEnhanceVoiceover(index)}
                                    disabled={scene.isVoiceoverEnhancing}
                                    className="flex-shrink-0 p-1.5 text-primary rounded-full hover:bg-primary/10 transition disabled:opacity-50 disabled:cursor-wait"
                                    title={t('scene.voiceover.enhance')}
                                >
                                    {scene.isVoiceoverEnhancing
                                        ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                        : <SparklesIcon className="w-4 h-4" />
                                    }
                                </button>
                            </div>
                            {ttsState.error && <p className="text-xs text-error mt-2">{t('error.tts.prefix')}: {ttsState.error}</p>}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Action Bar */}
            <div className="bg-brand-bg px-4 py-2 border-t border-border-color flex flex-wrap items-center gap-x-4 gap-y-2">
                <ActionButton
                    onClick={() => setIsPromptVisible(!isPromptVisible)}
                    icon={<ChevronDownIcon className={`w-4 h-4 transition-transform ${isPromptVisible ? 'rotate-180' : ''}`} />}
                    text={isPromptVisible ? t('scene.prompt.hide') : t('scene.prompt.show')}
                />
                <ActionButton
                    onClick={() => onRegenerateScene(index)}
                    icon={<RefreshIcon className="w-4 h-4" />}
                    text={t('scene.regenerateScriptAndImage')}
                    disabled={scene.isPreviewLoading}
                />
                <ActionButton
                    onClick={() => onGenerateVideo(index)}
                    icon={<VideoIcon className="w-4 h-4" />}
                    text={t('scene.generateVideo')}
                    disabled={scene.isVideoLoading || !!scene.videoUrl}
                />
                {voiceover && (
                    <>
                        <ActionButton
                            onClick={handlePlayAudio}
                            icon={ttsState.status === 'loading' ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <SpeakerIcon className="w-4 h-4" />}
                            text={t('scene.voiceover.play')}
                            disabled={ttsState.status === 'loading'}
                        />
                        <ActionButton
                            onClick={handleDownloadAudio}
                            icon={<DownloadIcon className="w-4 h-4" />}
                            text={t('scene.voiceover.download')}
                            disabled={ttsState.status === 'loading'}
                        />
                    </>
                )}
                 {scene.previewImageUrls && scene.previewImageUrls.length > 0 && (
                     <ActionButton
                        onClick={handleDownloadImage}
                        icon={<DownloadIcon className="w-4 h-4" />}
                        text={t('scene.image.download')}
                    />
                 )}
            </div>
            {isPromptVisible && (
                <div className="p-4 bg-brand-bg/50 dark:bg-black/20 text-xs space-y-4">
                    {/* Video Prompt */}
                    {scene.videoGenPrompt && (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <h5 className="font-bold text-text-main">{t('scene.prompt.videoTitle')}</h5>
                                <button
                                    onClick={handleCopyVideoPrompt}
                                    className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors"
                                >
                                    {copiedPrompt === 'video' ? <CheckIcon className="w-3 h-3 text-success" /> : <CopyIcon className="w-3 h-3" />}
                                    <span>{copiedPrompt === 'video' ? t('scene.prompt.copied') : t('scene.prompt.copy')}</span>
                                </button>
                            </div>
                            <pre className="p-2 bg-surface dark:bg-gray-900 rounded-md whitespace-pre-wrap break-all font-mono border border-border-color text-text-secondary">
                                <code>{scene.videoGenPrompt}</code>
                            </pre>
                        </div>
                    )}

                    {/* Image Prompt */}
                    {scene.imageGenPrompt && (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <h5 className="font-bold text-text-main">{t('scene.prompt.imageTitle')}</h5>
                                 <button
                                    onClick={handleCopyImagePrompt}
                                    className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors"
                                >
                                    {copiedPrompt === 'image' ? <CheckIcon className="w-3 h-3 text-success" /> : <CopyIcon className="w-3 h-3" />}
                                    <span>{copiedPrompt === 'image' ? t('scene.prompt.copied') : t('scene.prompt.copy')}</span>
                                </button>
                            </div>
                            <pre className="p-2 bg-surface dark:bg-gray-900 rounded-md whitespace-pre-wrap break-all font-mono border border-border-color text-text-secondary">
                                <code>{scene.imageGenPrompt}</code>
                            </pre>
                        </div>
                    )}
                </div>
            )}
            <audio ref={audioRef} className="hidden" />
        </div>
    );
};

const ResultsDisplay: React.FC<ResultsDisplayProps> = (props) => {
    const { script, projectName, aspectRatio, duration, elevenLabsTokens, elevenLabsVoiceId, onRegenerateScene, onGenerateVideo, onGenerateAllVideos, onEnhanceVoiceover, thumbnailUrl, isThumbnailLoading, thumbnailError, onRegenerateThumbnail, socialPost, isSocialPostLoading, socialPostError, scriptGenModel, imageGenModel, veoModel } = props;
    const { t } = useLocalization();
    const [viewMode, setViewMode] = useState<'card' | 'storyboard'>('card');
    
    const handleSceneSelect = (sceneNumber: number) => {
        setViewMode('card');
        // Use a short timeout to ensure the DOM updates before we try to scroll
        setTimeout(() => {
            const element = document.getElementById(`scene-card-${sceneNumber}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);
    };
    
    const modelMapping: { [key: string]: string } = {
        'gemini-2.5-pro': 'gemini-2.5-pro',
        'gemini-2.5-flash': 'gemini-2.5-flash',
        'gemini_flash_image': 'gemini-2.5-flash-image',
        'imagen_4': 'imagen-4.0-generate-001',
        'veo_fast': 'veo-3.1-fast-generate-preview',
        'veo_ultra': 'veo-3.1-generate-preview',
    };

    return (
        <div className="space-y-6">
            <div className="p-4 border border-border-color rounded-lg bg-brand-bg">
                <h3 className="text-lg font-bold text-text-main mb-3">{t('json.summary.title')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-xs font-semibold text-text-secondary uppercase">{t('json.summary.script')}</p>
                        <p className="font-medium text-text-main font-mono text-xs">{modelMapping[scriptGenModel] || scriptGenModel}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-text-secondary uppercase">{t('json.summary.image')}</p>
                        <p className="font-medium text-text-main font-mono text-xs">{modelMapping[imageGenModel] || imageGenModel}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-text-secondary uppercase">{t('json.summary.video')}</p>
                        <p className="font-medium text-text-main font-mono text-xs">{modelMapping[veoModel] || veoModel}</p>
                    </div>
                </div>
            </div>

            <SocialPostDisplay post={socialPost} isLoading={isSocialPostLoading} error={socialPostError} />

            <ThumbnailDisplay 
                thumbnailUrl={thumbnailUrl}
                isLoading={isThumbnailLoading}
                error={thumbnailError}
                onRegenerate={onRegenerateThumbnail}
                projectName={projectName}
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-surface rounded-lg border border-border-color">
                 <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-text-main">{t('json.scriptActions.title')}</h3>
                     <div className="flex items-center gap-1 p-1 bg-brand-bg rounded-lg border border-border-color">
                        <button 
                            onClick={() => setViewMode('card')}
                            className={`flex items-center gap-1.5 py-1 px-2 rounded-md text-sm transition ${viewMode === 'card' ? 'bg-primary text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            aria-label={t('json.viewMode.card')}
                        >
                            <DocumentTextIcon className="w-4 h-4"/>
                            <span>{t('json.viewMode.card')}</span>
                        </button>
                        <button 
                            onClick={() => setViewMode('storyboard')}
                            className={`flex items-center gap-1.5 py-1 px-2 rounded-md text-sm transition ${viewMode === 'storyboard' ? 'bg-primary text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            aria-label={t('json.viewMode.storyboard')}
                        >
                            <FrameIcon className="w-4 h-4"/>
                            <span>{t('json.viewMode.storyboard')}</span>
                        </button>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 flex-wrap justify-end">
                     <button
                        onClick={onGenerateAllVideos}
                        className="flex items-center gap-2 bg-success/10 dark:bg-success/20 text-success font-semibold py-2 px-3 rounded-md hover:bg-success/20 dark:hover:bg-success/30 transition-colors"
                    >
                        <VideoIcon className="w-4 h-4" />
                        <span>{t('json.scriptActions.generateAllVideos')}</span>
                    </button>
                    <AssetDownloader
                        script={script}
                        projectName={projectName}
                        socialPost={socialPost}
                        duration={duration}
                        thumbnailUrl={thumbnailUrl}
                        elevenLabsTokens={elevenLabsTokens}
                        elevenLabsVoiceId={elevenLabsVoiceId}
                    />
                 </div>
            </div>
            
            {viewMode === 'card' ? (
                <div className="space-y-4">
                    {script.map((scene, index) => (
                        <div key={scene.scene} id={`scene-card-${scene.scene}`}>
                            <SceneCard
                                scene={scene}
                                index={index}
                                aspectRatio={aspectRatio}
                                onRegenerateScene={onRegenerateScene}
                                onGenerateVideo={onGenerateVideo}
                                onEnhanceVoiceover={onEnhanceVoiceover}
                                elevenLabsTokens={elevenLabsTokens}
                                elevenLabsVoiceId={elevenLabsVoiceId}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <StoryboardView 
                    script={script}
                    aspectRatio={aspectRatio}
                    onSceneSelect={handleSceneSelect}
                />
            )}
        </div>
    );
};

interface JsonDisplayProps extends Omit<ResultsDisplayProps, 'script' | 'onEnhanceVoiceover'> {
    isLoading: boolean;
    isBatchProcessing: boolean;
    batchRunState: BatchRunState | null;
    error: string | null;
    script: EnhancedScene[] | null;
    onEnhanceVoiceover: (sceneIndex: number) => void;
}

const JsonDisplay: React.FC<JsonDisplayProps> = (props) => {
    const { t } = useLocalization();
    const { isLoading, isBatchProcessing, batchRunState, error, script } = props;

    const renderContent = () => {
        if (isBatchProcessing && batchRunState) {
            return <BatchStatusDisplay batchRunState={batchRunState} />;
        }
        if (isLoading && !isBatchProcessing) {
            return <Loader />;
        }
        if (error) {
            return (
                <div className="bg-error/10 border border-error/20 text-error p-4 rounded-md h-full flex flex-col items-center justify-center">
                    <p className="font-bold">{t('error.title')}</p>
                    <p className="mt-2 text-center">{error}</p>
                </div>
            );
        }
        if (script) {
            return <ResultsDisplay {...props} script={script} />;
        }
        return (
            <div className="flex items-center justify-center h-full text-text-secondary">
                <p>{t('json.placeholder')}</p>
            </div>
        );
    };

    return (
        <div className="bg-surface rounded-lg p-6 h-full min-h-[600px] flex flex-col shadow-sm border border-border-color">
            <h2 className="text-xl font-bold mb-4 text-text-main">{t('json.title')}</h2>
            <div className="flex-grow relative">
                {renderContent()}
            </div>
        </div>
    );
};

export default JsonDisplay;