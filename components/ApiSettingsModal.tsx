import React, { useState, useCallback, useEffect } from 'react';
import type { FormState, ElevenLabsVoice, ElevenLabsUserDetails } from '../types';
import { useLocalization } from '../hooks/useLocalization';
import * as geminiService from '../services/geminiService';
import { SpeakerIcon } from './icons';
import ApiTokenInput from './ApiTokenInput';
import ApiKeyList from './ApiKeyList';

interface ApiSettingsModalProps {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  onClose: () => void;
  setElevenLabsDetails: React.Dispatch<React.SetStateAction<ElevenLabsUserDetails[]>>;
}

const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ formState, setFormState, onClose, setElevenLabsDetails }) => {
    const { t } = useLocalization();
    const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>([]);
    const [isFetchingVoices, setIsFetchingVoices] = useState(false);
    const [voicePreviewAudio, setVoicePreviewAudio] = useState<HTMLAudioElement | null>(null);

    const handleInputChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setFormState(prev => ({ ...prev, [key]: value }));
    };

    const handleKeysChange = (key: 'geminiTokens' | 'elevenLabsTokens', tokens: string[]) => {
        handleInputChange(key, tokens);
        localStorage.setItem(key, JSON.stringify(tokens));
    };
    
    const handleElevenLabsVoiceChange = (voiceId: string) => {
        handleInputChange('elevenLabsVoiceId', voiceId);
        localStorage.setItem('elevenLabsVoiceId', voiceId);
    };

    const handleGoogleTokenChange = (token: string) => {
        handleInputChange('googleWorkspaceToken', token);
        localStorage.setItem('googleWorkspaceToken', token);
    };
    
    const testElevenLabs = useCallback(async (key: string) => {
        // Use a default voice ID for testing if the current one is somehow invalid, ensuring the test can proceed.
        const voiceIdToTest = formState.elevenLabsVoiceId || '3VnrjnYrskPMDsapTr8X';
        const details = await geminiService.testElevenLabsApiKey(key, voiceIdToTest);
        setElevenLabsDetails(prevDetails => {
            const otherDetails = prevDetails.filter(d => d.apiKey !== key);
            return [...otherDetails, { apiKey: key, ...details }];
        });
        return details;
    }, [formState.elevenLabsVoiceId, setElevenLabsDetails]);

    const handleElevenLabsKeyTestSuccess = useCallback(async (apiKey: string) => {
        setIsFetchingVoices(true);
        try {
            const voices = await geminiService.fetchElevenLabsVoices(apiKey);
            setElevenLabsVoices(voices);
        } catch (e) {
            console.error("Failed to fetch ElevenLabs voices:", e);
            setElevenLabsVoices([]); // Clear voices on error
        } finally {
            setIsFetchingVoices(false);
        }
    }, []);

    const handlePreviewVoice = useCallback(() => {
        if (voicePreviewAudio) {
            voicePreviewAudio.pause();
            voicePreviewAudio.currentTime = 0;
        }
        const selectedVoice = elevenLabsVoices.find(v => v.voice_id === formState.elevenLabsVoiceId);
        if (selectedVoice?.preview_url) {
            const audio = new Audio(selectedVoice.preview_url);
            setVoicePreviewAudio(audio);
            audio.play().catch(err => console.error("Audio preview failed", err));
        }
    }, [formState.elevenLabsVoiceId, elevenLabsVoices, voicePreviewAudio]);

    // Effect to fetch voices on modal open if there's a key but no voices have been loaded yet
    useEffect(() => {
        if (formState.elevenLabsTokens.length > 0 && elevenLabsVoices.length === 0) {
            // Use the first key to fetch voices automatically
            handleElevenLabsKeyTestSuccess(formState.elevenLabsTokens[0]);
        }
    }, [formState.elevenLabsTokens, elevenLabsVoices.length, handleElevenLabsKeyTestSuccess]);
    
    // Cleanup audio on modal close
    useEffect(() => {
        return () => {
            if (voicePreviewAudio) {
                voicePreviewAudio.pause();
            }
        };
    }, [voicePreviewAudio]);

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="bg-surface rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-border-color"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-border-color">
                    <h2 className="text-xl font-bold text-text-main">{t('apiSettings.title')}</h2>
                    <button 
                        onClick={onClose} 
                        className="text-text-secondary hover:text-text-main transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-4 bg-brand-bg/50 dark:bg-surface/30 p-4 rounded-lg border border-border-color">
                         <ApiTokenInput
                            id="google-workspace-token"
                            label={t('form.google.token.label')}
                            placeholder={t('form.google.token.placeholder')}
                            token={formState.googleWorkspaceToken}
                            setToken={handleGoogleTokenChange}
                            onTestConnection={() => geminiService.testGoogleWorkspaceToken(formState.googleWorkspaceToken)}
                            extraInfo={<p className="text-xs text-text-secondary mt-2">{t('form.google.token.note')}</p>}
                        />
                    </div>

                    <div className="space-y-4 bg-brand-bg/50 dark:bg-surface/30 p-4 rounded-lg border border-border-color">
                        <ApiKeyList
                            id="gemini-keys"
                            label={t('form.gemini.token.label')}
                            placeholder={t('form.gemini.token.placeholder')}
                            keys={formState.geminiTokens}
                            onKeysChange={(keys) => handleKeysChange('geminiTokens', keys)}
                            onTestKey={geminiService.testGoogleAiApiKey}
                        />
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-4 bg-brand-bg/50 dark:bg-surface/30 p-4 rounded-lg border border-border-color">
                            <ApiKeyList
                                id="elevenlabs-keys"
                                label={t('apiSettings.elevenlabs.title')}
                                placeholder={t('form.elevenlabs.token.placeholder')}
                                keys={formState.elevenLabsTokens}
                                onKeysChange={(keys) => handleKeysChange('elevenLabsTokens', keys)}
                                onTestKey={testElevenLabs}
                                onTestSuccess={handleElevenLabsKeyTestSuccess}
                                renderKeyDetails={(details) => (
                                    <div className="text-xs text-text-secondary space-y-0.5">
                                        <p><strong>{t('apiSettings.elevenlabs.voiceNameLabel')}:</strong> {details.voiceName || 'N/A'}</p>
                                        <p><strong>{t('apiSettings.elevenlabs.tier')}:</strong> {details.tier}</p>
                                        <p><strong>{t('apiSettings.elevenlabs.charsUsed')}:</strong> {details.characterCount.toLocaleString()} / {details.characterLimit.toLocaleString()}</p>
                                    </div>
                                )}
                            />
                            <div>
                               <label htmlFor="elevenlabs-voice-id" className="block text-sm font-medium text-text-secondary mb-1">{t('apiSettings.elevenlabs.voiceIdLabel')}</label>
                               <div className="flex items-center gap-2">
                                   <select
                                       id="elevenlabs-voice-id"
                                       value={formState.elevenLabsVoiceId}
                                       onChange={(e) => handleElevenLabsVoiceChange(e.target.value)}
                                       disabled={isFetchingVoices || elevenLabsVoices.length === 0}
                                       className="w-full bg-surface border border-border-color rounded-md px-3 py-1.5 focus:ring-primary focus:border-primary transition text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                   >
                                        {isFetchingVoices && <option>{t('apiSettings.elevenlabs.loadingVoices')}</option>}
                                        {!isFetchingVoices && elevenLabsVoices.length === 0 && <option>{t('apiSettings.elevenlabs.noVoices')}</option>}
                                        {elevenLabsVoices.map(voice => (
                                            <option key={voice.voice_id} value={voice.voice_id}>
                                                {voice.name}
                                            </option>
                                        ))}
                                   </select>
                                   <button 
                                        onClick={handlePreviewVoice}
                                        disabled={!formState.elevenLabsVoiceId || isFetchingVoices}
                                        title={t('apiSettings.elevenlabs.previewVoice')}
                                        className="p-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                       <SpeakerIcon className="w-5 h-5"/>
                                   </button>
                               </div>
                           </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiSettingsModal;