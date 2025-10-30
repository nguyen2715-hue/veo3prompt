import React, { useState } from 'react';
import type { FormState, Model, VisualStyleDetail } from '../types';
import ImagePreview from './ImagePreview';
import { UploadIcon } from './icons';
import { useLocalization } from '../hooks/useLocalization';
import ConsoleLog from './ConsoleLog';
import BatchProcessForm from './BatchProcessForm';

interface ScriptFormProps {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  onSingleSubmit: () => void;
  onBatchSubmit: () => void;
  isLoading: boolean;
  consoleMessages: string[];
}

const ModelFaceUpload: React.FC<{
  file: File | null;
  onChange: (file: File | null) => void;
  previewUrl: string | undefined;
}> = ({ file, onChange, previewUrl }) => {
    const { t } = useLocalization();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onChange(e.target.files[0]);
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(null);
    }

    const inputId = React.useId();

    if (previewUrl && file) {
        return (
             <div className="w-full h-full relative group">
                <img src={previewUrl} alt="Model face preview" className="w-full h-full object-cover rounded-md" />
                <button
                    onClick={handleRemove}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                >
                    &times;
                </button>
            </div>
        )
    }

    return (
        <label htmlFor={inputId} className="w-full h-full flex flex-col items-center justify-center text-center p-4 border-2 border-border-color border-dashed rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-surface/50 transition">
             <div className="space-y-1 text-center">
                <svg className="mx-auto h-10 w-10 text-text-secondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <p className="text-sm text-primary font-medium">{t('form.models.uploadFace')}</p>
             </div>
            <input id={inputId} name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
        </label>
    );
};

interface SingleProjectFormProps {
    formState: FormState;
    handleInputChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
    handleVisualStyleChange: <K extends keyof VisualStyleDetail>(key: K, value: VisualStyleDetail[K]) => void;
    handleModelChange: <K extends keyof Model>(index: number, key: K, value: Model[K]) => void;
    handleAddModel: () => void;
    handleRemoveModel: () => void;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveFile: (indexToRemove: number) => void;
    onSingleSubmit: () => void;
    isLoading: boolean;
    isFormValid: boolean;
}

const SingleProjectForm: React.FC<SingleProjectFormProps> = ({
    formState,
    handleInputChange,
    handleVisualStyleChange,
    handleModelChange,
    handleAddModel,
    handleRemoveModel,
    handleFileChange,
    handleRemoveFile,
    onSingleSubmit,
    isLoading,
    isFormValid
}) => {
    const { t } = useLocalization();
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div>
                    <label htmlFor="projectName" className="block text-sm font-medium text-text-secondary mb-1">
                        {t('form.projectName.label')}
                    </label>
                    <input
                        id="projectName"
                        type="text"
                        value={formState.projectName}
                        onChange={(e) => handleInputChange('projectName', e.target.value)}
                        placeholder={t('form.projectName.placeholder')}
                        className="w-full bg-gray-100 dark:bg-gray-700/50 border border-border-color rounded-md px-3 py-2 focus:ring-primary focus:border-primary transition cursor-not-allowed"
                        disabled={true}
                    />
                </div>
                <div>
                    <label htmlFor="idea" className="block text-sm font-medium text-text-secondary mb-1">
                        {t('form.idea.label')}
                    </label>
                    <input
                        id="idea"
                        type="text"
                        value={formState.idea}
                        onChange={(e) => handleInputChange('idea', e.target.value)}
                        placeholder={t('form.idea.placeholder')}
                        className="w-full bg-brand-bg border border-border-color rounded-md px-3 py-2 focus:ring-primary focus:border-primary transition"
                    />
                </div>
                <div>
                    <label htmlFor="content" className="block text-sm font-medium text-text-secondary mb-1">
                        {t('form.content.label')}
                    </label>
                    <textarea
                        id="content"
                        value={formState.content}
                        onChange={(e) => handleInputChange('content', e.target.value)}
                        rows={4}
                        placeholder={t('form.content.placeholder')}
                        className="w-full bg-brand-bg border border-border-color rounded-md px-3 py-2 focus:ring-primary focus:border-primary transition"
                    />
                </div>
            </div>

            <div className="pt-4 border-t border-border-color">
            <button
                onClick={onSingleSubmit}
                disabled={isLoading || !isFormValid}
                className="w-full bg-primary text-white font-bold py-3 px-4 rounded-md hover:bg-primary-hover transition-colors disabled:bg-text-secondary/50 disabled:cursor-not-allowed"
            >
                {isLoading ? t('form.button.generating') : t('form.button.generate')}
            </button>
            </div>

            <div className="space-y-4 pt-4 border-t border-border-color">
            <h3 className="text-lg font-semibold text-text-main">{t('form.section.settingAndModels')}</h3>
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-text-main">{t('form.models.sectionTitle')} ({formState.models.length})</h4>
                <div className="flex items-center gap-2">
                    <button onClick={handleAddModel} className="w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-primary/20 text-primary rounded-md hover:bg-blue-200 dark:hover:bg-primary/30 transition text-xl font-bold">+</button>
                    <button onClick={handleRemoveModel} disabled={formState.models.length === 0} className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-text-secondary rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-xl font-bold">-</button>
                </div>
            </div>
            <div className="space-y-6">
                {formState.models.map((model, index) => (
                <div key={model.id} className="bg-brand-bg/50 dark:bg-surface/30 p-4 rounded-lg border border-border-color space-y-4">
                    <h5 className="font-bold text-text-main">{t('form.models.model')} {index + 1}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1 h-40">
                            <ModelFaceUpload file={model.faceImage} onChange={(file) => handleModelChange(index, 'faceImage', file)} previewUrl={model.faceImageUrl} />
                        </div>
                        <div className="md:col-span-2">
                             <label htmlFor={`modelJson-${index}`} className="block text-sm font-medium text-text-secondary mb-1">
                                {t('form.models.jsonLabel')}
                            </label>
                            <textarea
                                id={`modelJson-${index}`}
                                value={model.detailsJson}
                                onChange={(e) => handleModelChange(index, 'detailsJson', e.target.value)}
                                rows={8}
                                placeholder={t('form.models.jsonPlaceholder')}
                                className="w-full h-full bg-surface border border-border-color rounded-md px-3 py-1.5 focus:ring-primary focus:border-primary transition text-xs font-mono"
                            />
                        </div>
                    </div>
                </div>
                ))}
            </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border-color">
            <h3 className="text-lg font-semibold text-text-main">{t('form.section.references')}</h3>
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">{t('form.image.label')}</label>
                {formState.imageFiles.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4 p-2 border border-border-color rounded-md">
                    {formState.imageFiles.map((file, index) => (<ImagePreview key={index} file={file} onRemove={() => handleRemoveFile(index)} />))}
                    </div>
                )}
                <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-border-color border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                    <UploadIcon className="mx-auto h-12 w-12 text-text-secondary" />
                    <div className="flex text-sm text-text-secondary">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-surface rounded-md font-medium text-primary hover:text-primary-hover focus-within:outline-none">
                        <span>{t('form.image.upload')}</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" multiple/>
                        </label>
                        <p className="pl-1">{t('form.image.drag')}</p>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{t('form.image.types')}</p>
                    </div>
                </div>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border-color">
                <h3 className="text-lg font-semibold text-text-main">{t('form.section.videoSettings')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="duration" className="block text-sm font-medium text-text-secondary mb-1">{t('form.duration.label')}</label>
                        <input id="duration" type="number" value={formState.duration} onChange={(e) => handleInputChange('duration', parseInt(e.target.value, 10) || 0)} min="1" className="w-full bg-brand-bg border border-border-color rounded-md px-3 py-2 focus:ring-primary focus:border-primary transition" />
                    </div>
                    <div>
                        <label htmlFor="numberOfVideos" className="block text-sm font-medium text-text-secondary mb-1">{t('form.numberOfVideos.label')}</label>
                        <input id="numberOfVideos" type="number" value={formState.numberOfVideos} onChange={(e) => handleInputChange('numberOfVideos', parseInt(e.target.value, 10) || 1)} min="1" max="4" className="w-full bg-brand-bg border border-border-color rounded-md px-3 py-2 focus:ring-primary focus:border-primary transition" />
                    </div>
                    <div>
                        <label htmlFor="aspectRatio" className="block text-sm font-medium text-text-secondary mb-1">{t('form.aspectRatio.label')}</label>
                        <select id="aspectRatio" value={formState.aspectRatio} onChange={(e) => handleInputChange('aspectRatio', e.target.value as FormState['aspectRatio'])} className="w-full bg-brand-bg border border-border-color rounded-md px-3 py-2 focus:ring-primary focus:border-primary transition">
                        <option value="16:9">{t('form.aspectRatio.16x9')}</option>
                        <option value="9:16">{t('form.aspectRatio.9x16')}</option>
                        <option value="1:1">{t('form.aspectRatio.1x1')}</option>
                        <option value="4:5">{t('form.aspectRatio.4x5')}</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="languageCode" className="block text-sm font-medium text-text-secondary mb-1">
                            {t('form.languageCode.label')}
                        </label>
                        <select 
                            id="languageCode" 
                            value={formState.languageCode} 
                            onChange={(e) => handleInputChange('languageCode', e.target.value)} 
                            className="w-full bg-brand-bg border border-border-color rounded-md px-3 py-2 focus:ring-primary focus:border-primary transition"
                        >
                            <option value="vi-VN">Tiếng Việt (vi-VN)</option>
                            <option value="en-US">English (en-US)</option>
                            <option value="ja-JP">日本語 (ja-JP)</option>
                            <option value="ko-KR">한국어 (ko-KR)</option>
                            <option value="th-TH">ภาษาไทย (th-TH)</option>
                            <option value="zh-CN">中文 (zh-CN)</option>
                        </select>
                    </div>
                </div>
                <div>
                    <div className="relative flex items-start mt-4">
                        <div className="flex h-6 items-center">
                            <input
                            id="autoGenerateThumbnailText"
                            name="autoGenerateThumbnailText"
                            type="checkbox"
                            checked={formState.autoGenerateThumbnailText}
                            onChange={(e) => handleInputChange('autoGenerateThumbnailText', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                        </div>
                        <div className="ml-3 text-sm leading-6">
                            <label htmlFor="autoGenerateThumbnailText" className="font-medium text-text-main">
                            {t('form.autoGenerateThumbnailText.label')}
                            </label>
                        </div>
                    </div>
                    <label htmlFor="thumbnailText" className="block text-sm font-medium text-text-secondary mb-1 mt-2">
                        {t('form.thumbnailText.label')}
                    </label>
                    <input
                        id="thumbnailText"
                        type="text"
                        value={formState.thumbnailText}
                        onChange={(e) => handleInputChange('thumbnailText', e.target.value)}
                        placeholder="VD: BÍ QUYẾT, BẤT NGỜ, SHOCK"
                        className="w-full bg-brand-bg border border-border-color rounded-md px-3 py-2 focus:ring-primary focus:border-primary transition"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">{t('form.veo.model.label')}</label>
                    <div className="grid grid-cols-2 gap-2 rounded-md bg-brand-bg p-1 border border-border-color">
                        <button type="button" onClick={() => handleInputChange('veoModel', 'veo_fast')} className={`w-full py-1.5 text-sm rounded-md transition ${formState.veoModel === 'veo_fast' ? 'bg-primary text-white shadow-sm font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                            {t('form.veo.model.fast')}
                        </button>
                        <button type="button" onClick={() => handleInputChange('veoModel', 'veo_ultra')} className={`w-full py-1.5 text-sm rounded-md transition ${formState.veoModel === 'veo_ultra' ? 'bg-primary text-white shadow-sm font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                            {t('form.veo.model.ultra')}
                        </button>
                    </div>
                    <p className="text-xs text-text-secondary mt-2">{t('form.veo.model.note')}</p>
                </div>
                
                <div className="space-y-4 pt-4 mt-4 border-t border-border-color/50">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            {t('form.scriptStyle.label')}
                        </label>
                        <div className="grid grid-cols-3 gap-1 rounded-md bg-brand-bg p-1 border border-border-color">
                            <button type="button" onClick={() => handleInputChange('scriptStyle', 'viral')} className={`w-full py-1.5 text-sm rounded-md transition ${formState.scriptStyle === 'viral' ? 'bg-primary text-white shadow-sm font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                {t('form.scriptStyle.viral')}
                            </button>
                            <button type="button" onClick={() => handleInputChange('scriptStyle', 'koc_review')} className={`w-full py-1.5 text-sm rounded-md transition ${formState.scriptStyle === 'koc_review' ? 'bg-primary text-white shadow-sm font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                {t('form.scriptStyle.koc_review')}
                            </button>
                            <button type="button" onClick={() => handleInputChange('scriptStyle', 'story')} className={`w-full py-1.5 text-sm rounded-md transition ${formState.scriptStyle === 'story' ? 'bg-primary text-white shadow-sm font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                {t('form.scriptStyle.story')}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            {t('form.scriptGenModel.label')}
                        </label>
                        <div className="grid grid-cols-2 gap-2 rounded-md bg-brand-bg p-1 border border-border-color">
                            <button type="button" onClick={() => handleInputChange('scriptGenModel', 'gemini-2.5-pro')} className={`w-full py-1.5 text-sm rounded-md transition ${formState.scriptGenModel === 'gemini-2.5-pro' ? 'bg-primary text-white shadow-sm font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                {t('form.scriptGenModel.pro')}
                            </button>
                            <button type="button" onClick={() => handleInputChange('scriptGenModel', 'gemini-2.5-flash')} className={`w-full py-1.5 text-sm rounded-md transition ${formState.scriptGenModel === 'gemini-2.5-flash' ? 'bg-primary text-white shadow-sm font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                {t('form.scriptGenModel.flash')}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            {t('form.visualStyle.sectionTitle')}
                        </label>
                        <div className="grid grid-cols-2 gap-2 rounded-md bg-brand-bg p-1 border border-border-color">
                            <button type="button" onClick={() => handleVisualStyleChange('baseStyle', 'cinematic')} className={`w-full py-1.5 text-sm rounded-md transition ${formState.visualStyleDetail.baseStyle === 'cinematic' ? 'bg-primary text-white shadow-sm font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                {t('form.visualStyle.cinematic')}
                            </button>
                            <button type="button" onClick={() => handleVisualStyleChange('baseStyle', 'modern_trendy')} className={`w-full py-1.5 text-sm rounded-md transition ${formState.visualStyleDetail.baseStyle === 'modern_trendy' ? 'bg-primary text-white shadow-sm font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                {t('form.visualStyle.modern_trendy')}
                            </button>
                            <button type="button" onClick={() => handleVisualStyleChange('baseStyle', 'anime')} className={`w-full py-1.5 text-sm rounded-md transition ${formState.visualStyleDetail.baseStyle === 'anime' ? 'bg-primary text-white shadow-sm font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                {t('form.visualStyle.anime')}
                            </button>
                            <button type="button" onClick={() => handleVisualStyleChange('baseStyle', '3d_animation')} className={`w-full py-1.5 text-sm rounded-md transition ${formState.visualStyleDetail.baseStyle === '3d_animation' ? 'bg-primary text-white shadow-sm font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                {t('form.visualStyle.3d_animation')}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            {t('form.imageGenModel.label')}
                        </label>
                        <div className="grid grid-cols-2 gap-2 rounded-md bg-brand-bg p-1 border border-border-color">
                            <button type="button" onClick={() => handleInputChange('imageGenModel', 'gemini_flash_image')} className={`w-full py-1.5 text-sm rounded-md transition ${formState.imageGenModel === 'gemini_flash_image' ? 'bg-primary text-white shadow-sm font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                {t('form.imageGenModel.flash')}
                            </button>
                            <button type="button" onClick={() => handleInputChange('imageGenModel', 'imagen_4')} className={`w-full py-1.5 text-sm rounded-md transition ${formState.imageGenModel === 'imagen_4' ? 'bg-primary text-white shadow-sm font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                {t('form.imageGenModel.imagen')}
                            </button>
                        </div>
                        <p className="text-xs text-text-secondary mt-2">{t('form.imageGenModel.note')}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border-color">
                <h3 className="text-lg font-semibold text-text-main">{t('form.section.social')}</h3>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                        {t('form.social.platform.label')}
                    </label>
                    <div className="grid grid-cols-2 gap-1 rounded-md bg-brand-bg p-1 border border-border-color">
                        <button type="button" onClick={() => handleInputChange('socialPlatform', 'tiktok')} className={`w-full py-1.5 text-sm rounded-md transition ${formState.socialPlatform === 'tiktok' ? 'bg-primary text-white shadow-sm font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                            {t('form.social.platform.tiktok')}
                        </button>
                        <button type="button" onClick={() => handleInputChange('socialPlatform', 'youtube')} className={`w-full py-1.5 text-sm rounded-md transition ${formState.socialPlatform === 'youtube' ? 'bg-primary text-white shadow-sm font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                            {t('form.social.platform.youtube')}
                        </button>
                    </div>
                </div>
                {formState.socialPlatform === 'youtube' && (
                    <div className="space-y-4 pt-3 mt-3 border-t border-border-color/50">
                        <div>
                            <label htmlFor="youtubeTitle" className="block text-sm font-medium text-text-secondary mb-1">
                                {t('form.youtube.title.label')}
                            </label>
                            <input
                                id="youtubeTitle"
                                type="text"
                                value={formState.youtubeTitle}
                                onChange={(e) => handleInputChange('youtubeTitle', e.target.value)}
                                placeholder={t('form.youtube.title.placeholder')}
                                className="w-full bg-brand-bg border border-border-color rounded-md px-3 py-2 focus:ring-primary focus:border-primary transition"
                            />
                        </div>
                        <div>
                            <label htmlFor="youtubeDescription" className="block text-sm font-medium text-text-secondary mb-1">
                                {t('form.youtube.description.label')}
                            </label>
                            <textarea
                                id="youtubeDescription"
                                value={formState.youtubeDescription}
                                onChange={(e) => handleInputChange('youtubeDescription', e.target.value)}
                                rows={3}
                                placeholder={t('form.youtube.description.placeholder')}
                                className="w-full bg-brand-bg border border-border-color rounded-md px-3 py-2 focus:ring-primary focus:border-primary transition"
                            />
                        </div>
                        <div>
                            <label htmlFor="youtubeTags" className="block text-sm font-medium text-text-secondary mb-1">
                                {t('form.youtube.tags.label')}
                            </label>
                            <input
                                id="youtubeTags"
                                type="text"
                                value={formState.youtubeTags}
                                onChange={(e) => handleInputChange('youtubeTags', e.target.value)}
                                placeholder={t('form.youtube.tags.placeholder')}
                                className="w-full bg-brand-bg border border-border-color rounded-md px-3 py-2 focus:ring-primary focus:border-primary transition"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


const ScriptForm: React.FC<ScriptFormProps> = ({ formState, setFormState, onSingleSubmit, onBatchSubmit, isLoading, consoleMessages }) => {
  const { t } = useLocalization();
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  
  const handleInputChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState(prev => {
        const newState = { ...prev, [key]: value };
        // Automatically switch social platform based on aspect ratio for better UX
        if (key === 'aspectRatio') {
            if (value === '16:9') {
                newState.socialPlatform = 'youtube';
            } else {
                newState.socialPlatform = 'tiktok';
            }
        }
        if (key === 'imageGenModel' || key === 'languageCode') {
            localStorage.setItem(key, value as string);
        }
        return newState;
    });
  };

  const handleVisualStyleChange = <K extends keyof VisualStyleDetail>(key: K, value: VisualStyleDetail[K]) => {
    setFormState(prev => ({
        ...prev,
        visualStyleDetail: {
            ...prev.visualStyleDetail,
            [key]: value,
        }
    }));
  };
  
  const handleModelChange = <K extends keyof Model>(index: number, key: K, value: Model[K]) => {
      const updatedModels = [...formState.models];
      // Create a mutable copy of the model at the specific index
      const currentModel = { ...updatedModels[index] };

      if (key === 'faceImage') {
          // Clean up old blob URL
          if (currentModel.faceImageUrl) {
              URL.revokeObjectURL(currentModel.faceImageUrl);
          }
          // Create new blob URL for preview and update the file
          currentModel.faceImage = value as File | null;
          currentModel.faceImageUrl = value ? URL.createObjectURL(value as File) : undefined;
      } else {
          // Handle other keys like 'detailsJson'
          (currentModel as any)[key] = value;
      }
      
      updatedModels[index] = currentModel;
      setFormState(prev => ({...prev, models: updatedModels}));
  };

  const handleAddModel = () => {
      const defaultModelDetails = {
          "gender": "female",
          "nationality": "vietnamese",
          "age": "25",
          "clothing": "",
          "hairstyle": "",
          "otherDetails": ""
      };
      const newModel: Model = {
          id: crypto.randomUUID(),
          faceImage: null,
          detailsJson: JSON.stringify(defaultModelDetails, null, 2),
      };
      handleInputChange('models', [...formState.models, newModel]);
  };
  
  const handleRemoveModel = () => {
      if (formState.models.length > 0) {
          const lastModel = formState.models[formState.models.length - 1];
          if (lastModel.faceImageUrl) {
              URL.revokeObjectURL(lastModel.faceImageUrl);
          }
          handleInputChange('models', formState.models.slice(0, -1));
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      handleInputChange('imageFiles', [...formState.imageFiles, ...newFiles]);
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    handleInputChange('imageFiles', formState.imageFiles.filter((_, index) => index !== indexToRemove));
  };
  
  const isFormValid = formState.idea.trim() !== '' && formState.content.trim() !== '';

  return (
    <div className="bg-surface rounded-lg p-6 shadow-sm border border-border-color">
      <div className="mb-4">
          <ConsoleLog messages={consoleMessages} />
      </div>

      <div className="border-b border-border-color mb-6">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button
                  onClick={() => setMode('single')}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                      mode === 'single'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-text-secondary hover:text-text-main hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                  {t('form.mode.single')}
              </button>
              <button
                  onClick={() => setMode('batch')}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                      mode === 'batch'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-text-secondary hover:text-text-main hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                   {t('form.mode.batch')}
              </button>
          </nav>
      </div>

      {mode === 'single' ? (
          <SingleProjectForm
            formState={formState}
            handleInputChange={handleInputChange}
            handleVisualStyleChange={handleVisualStyleChange}
            handleModelChange={handleModelChange}
            handleAddModel={handleAddModel}
            handleRemoveModel={handleRemoveModel}
            handleFileChange={handleFileChange}
            handleRemoveFile={handleRemoveFile}
            onSingleSubmit={onSingleSubmit}
            isLoading={isLoading}
            isFormValid={isFormValid}
          />
      ) : (
          <BatchProcessForm 
              formState={formState}
              setFormState={setFormState}
              onBatchSubmit={onBatchSubmit}
              isLoading={isLoading}
          />
      )}
    </div>
  );
};

export default ScriptForm;