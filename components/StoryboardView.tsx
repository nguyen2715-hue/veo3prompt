import React from 'react';
import type { EnhancedScene } from '../types';
import { useLocalization } from '../hooks/useLocalization';
import { getAspectRatioClass } from './JsonDisplay';

interface StoryboardViewProps {
  script: EnhancedScene[];
  aspectRatio: string;
  onSceneSelect: (sceneNumber: number) => void;
}

const StoryboardView: React.FC<StoryboardViewProps> = ({ script, aspectRatio, onSceneSelect }) => {
    const { t } = useLocalization();

    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {script.map(scene => (
                <div 
                    key={scene.scene}
                    onClick={() => onSceneSelect(scene.scene)}
                    className="relative cursor-pointer group rounded-md overflow-hidden border border-border-color hover:border-primary hover:ring-2 hover:ring-primary transition-all"
                    title={scene.description}
                >
                    <div className={`w-full bg-brand-bg flex items-center justify-center ${getAspectRatioClass(aspectRatio)}`}>
                        {scene.isPreviewLoading && (
                             <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        )}
                        {scene.error && !scene.isPreviewLoading && (
                            <div className="text-error p-1 text-center text-xs">⚠️ {t('thumbnail.error')}</div>
                        )}
                         {scene.previewImageUrls && scene.previewImageUrls.length > 0 && !scene.isPreviewLoading && (
                            <img src={scene.previewImageUrls[0]} alt={t('scene.preview.alt')} className="w-full h-full object-cover"/>
                         )}
                         {!scene.previewImageUrls && !scene.isPreviewLoading && !scene.error && (
                            <div className="text-text-secondary text-xs p-1">...</div>
                         )}
                    </div>
                    <div className="absolute top-1 left-1 bg-black/60 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center pointer-events-none">
                        {scene.scene}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                        <p className="text-white text-xs truncate font-medium">{scene.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default StoryboardView;