import React, { useState, useCallback } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { CopyIcon, CheckIcon } from './icons';
import { SocialPost } from '../types';

interface SocialPostDisplayProps {
  post: SocialPost | null;
  isLoading: boolean;
  error: string | null;
}

const SocialPostDisplay: React.FC<SocialPostDisplayProps> = ({ post, isLoading, error }) => {
    const { t } = useLocalization();
    const [isCopied, setIsCopied] = useState(false); // For YouTube copy
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null); // For TikTok versions
    const [selectedTab, setSelectedTab] = useState(0);

    const handleCopyYouTube = useCallback(() => {
        if (!post || post.platform !== 'youtube') return;
        let fullText = `Tiêu đề: ${post.title}\n\nMô tả:\n${post.description}\n\nTags: ${post.tags}`;
        navigator.clipboard.writeText(fullText).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    }, [post]);

    const handleCopyTikTok = useCallback((index: number) => {
        if (!post || post.platform !== 'tiktok') return;
        const version = post.versions[index];
        let fullText = `${version.post}\n\n${version.hashtags}`;
        navigator.clipboard.writeText(fullText).then(() => {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        });
    }, [post]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-24">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="ml-3 text-text-secondary">{t('socialPost.generating')}</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className="text-sm text-red-500 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/30 rounded-md">
                    <p className='font-bold'>{t('socialPost.error')}</p>
                    <p className="mt-1">{error}</p>
                </div>
            );
        }
        if (post) {
            if (post.platform === 'youtube') {
                return (
                    <div className="text-sm text-text-main space-y-4">
                        <div>
                            <h4 className="font-semibold text-text-secondary uppercase text-xs tracking-wider mb-1">{t('socialPost.youtube.title')}</h4>
                            <p className="font-semibold text-text-main">{post.title}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-text-secondary uppercase text-xs tracking-wider mb-1">{t('socialPost.youtube.description')}</h4>
                            <p className="whitespace-pre-wrap font-sans bg-brand-bg/50 dark:bg-surface/30 p-2 rounded-md border border-border-color">{post.description}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-text-secondary uppercase text-xs tracking-wider mb-1">{t('socialPost.youtube.tags')}</h4>
                            <p className="text-primary/90 font-medium break-words">{post.tags}</p>
                        </div>
                    </div>
                );
            }
            if (post.platform === 'tiktok') {
                if (!post.versions || post.versions.length === 0) return null;
                const selectedVersion = post.versions[selectedTab];
                return (
                    <div>
                        <div className="flex border-b border-border-color -mx-4 px-2">
                             {post.versions.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedTab(index)}
                                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${selectedTab === index
                                            ? 'text-primary border-primary'
                                            : 'text-text-secondary border-transparent hover:text-text-main'
                                        }`}
                                >
                                    {t('socialPost.version', { number: index + 1 })}
                                </button>
                            ))}
                        </div>
                         <div className="mt-4 pt-1 text-sm text-text-main space-y-3 relative">
                             <button
                                onClick={() => handleCopyTikTok(selectedTab)}
                                className="absolute top-0 right-0 flex items-center gap-2 bg-surface hover:bg-gray-100 dark:hover:bg-gray-700 text-xs text-text-secondary font-medium py-1 px-2 rounded-md border border-border-color transition-colors"
                                aria-label={copiedIndex === selectedTab ? t('socialPost.copied') : t('socialPost.copy')}
                            >
                                {copiedIndex === selectedTab ? <CheckIcon className="w-3 h-3 text-green-500" /> : <CopyIcon className="w-3 h-3" />}
                                <span>{copiedIndex === selectedTab ? t('socialPost.copied') : t('socialPost.copy')}</span>
                            </button>
                            <p className="whitespace-pre-wrap font-sans pr-24">{selectedVersion.post}</p>
                            <p className="text-primary font-semibold break-words">{selectedVersion.hashtags}</p>
                        </div>
                    </div>
                );
            }
        }
        return null;
    };


    return (
        <div className="mb-6 p-4 border border-border-color rounded-lg bg-brand-bg relative">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-text-main">{t('socialPost.title')}</h3>
                {post && !isLoading && !error && post.platform === 'youtube' && (
                     <button
                        onClick={handleCopyYouTube}
                        className="flex items-center gap-2 bg-surface hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-text-secondary font-medium py-1.5 px-3 rounded-md border border-border-color transition-colors"
                        aria-label={isCopied ? t('socialPost.copied') : t('socialPost.copy.youtube')}
                    >
                        {isCopied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                        <span>{isCopied ? t('socialPost.copied') : t('socialPost.copy.youtube')}</span>
                    </button>
                )}
            </div>
            {renderContent()}
        </div>
    );
};

export default SocialPostDisplay;