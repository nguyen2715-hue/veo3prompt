import React, { useState, useCallback, useEffect } from 'react';
import { FormState, Scene, EnhancedScene, Model, ImageDetail, SocialPost, BatchRunState, BatchProjectStatus } from './types';
import * as geminiService from './services/geminiService';
import Header from './components/Header';
import ScriptForm from './components/ScriptForm';
import JsonDisplay from './components/JsonDisplay';
import ApiSettingsModal from './components/ApiSettingsModal';
// FIX: Changed to a named import to match the export from DownloadCodeModal.
import { DownloadCodeModal } from './components/DownloadCodeModal';
import { useLocalization } from './hooks/useLocalization';

/**
 * Safely extracts an error message from an unknown thrown value.
 * Tries to parse JSON errors from API responses.
 * @param error The error caught.
 * @returns A string representation of the error.
 */
const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        try {
             // Check if the message is a JSON string, which is common for API errors
            if (error.message && error.message.trim().startsWith('{')) {
                const parsedError = JSON.parse(error.message);
                if (parsedError.error && parsedError.error.message) {
                    return parsedError.error.message;
                }
            }
        } catch (e) {
            // Not a valid JSON message, fall back to returning the original message
        }
        return error.message;
    }
    return String(error);
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


const App: React.FC = () => {
    const { t } = useLocalization();
    const [formState, setFormState] = useState<FormState>(() => {
        const geminiTokens = JSON.parse(localStorage.getItem('geminiTokens') || '[]');
        const elevenLabsTokens = JSON.parse(localStorage.getItem('elevenLabsTokens') || '[]');
        
        // Automated project naming logic
        const today = new Date();
        const d = String(today.getDate()).padStart(2, '0');
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const y = today.getFullYear();
        const todayStr = `${d}${m}${y}`;
        
        const lastProjectDate = localStorage.getItem('lastProjectDate');
        let sequence = 1;

        if (lastProjectDate === todayStr) {
            sequence = parseInt(localStorage.getItem('projectSequence') || '0', 10) + 1;
        }
        
        localStorage.setItem('lastProjectDate', todayStr);
        localStorage.setItem('projectSequence', String(sequence));

        const projectName = `${todayStr}-${sequence}`;

        const defaultModelDetails = {
            "gender": "female",
            "nationality": "vietnamese",
            "age": "25",
            "clothing": "Áo thun cổ tròn, khoét ngực, tay ngắn, màu xanh xanh baby, ôm nhẹ",
            "hairstyle": "Tóc thẳng, dài ngang ngực, rẽ ngôi giữa, màu đen tự nhiên",
            "otherDetails": "Gọn gàng, chuyên nghiệp nhưng gần gũi, tươi cười nhẹ nhàng"
        };

        return {
            projectName: projectName,
            idea: '',
            content: '',
            duration: 30,
            aspectRatio: '9:16',
            imageFiles: [],
            geminiTokens: geminiTokens,
            elevenLabsTokens: elevenLabsTokens,
            elevenLabsVoiceId: localStorage.getItem('elevenLabsVoiceId') || '3VnrjnYrskPMDsapTr8X',
            languageCode: localStorage.getItem('languageCode') || 'vi-VN',
            scriptGenModel: 'gemini-2.5-flash',
            imageGenModel: (localStorage.getItem('imageGenModel') as FormState['imageGenModel']) || 'gemini_flash_image',
            models: [
                {
                  id: crypto.randomUUID(),
                  faceImage: null,
                  detailsJson: JSON.stringify(defaultModelDetails, null, 2),
                }
            ],
            settingDescription: '',
            scriptStyle: 'viral',
            visualStyleDetail: {
                baseStyle: 'cinematic',
                colorAndMood: '',
                lighting: '',
                cameraAndFraming: '',
                artisticInfluence: '',
            },
            numberOfVideos: 1,
            veoModel: 'veo_fast',
            socialPlatform: 'tiktok',
            youtubeTitle: '',
            youtubeDescription: '',
            youtubeTags: '',
            thumbnailText: '',
            autoGenerateThumbnailText: true,
            googleWorkspaceToken: localStorage.getItem('googleWorkspaceToken') || '',
            batchInputSheetId: '14xCbI346GIjbpaPklzk65XxhWJdiXrOzmL6Fr_lqCEs',
            batchModelLibraryFolderId: '1MWJNVP896s6iXpLgSaCkPEFg7V0TjMsO',
            batchProductLibraryFolderId: '1rgHLQQBrlBSJ4K8l40hajUzCdUtnjOmz',
            batchOutputSheetId: '14xCbI346GIjbpaPklzk65XxhWJdiXrOzmL6Fr_lqCEs',
            batchOutputDriveFolderId: '1MCFHYgcKfVCbHWLuzOnBTcBaSgQ2nDvw',
        };
    });
    const [generatedScript, setGeneratedScript] = useState<EnhancedScene[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [imageDetails, setImageDetails] = useState<ImageDetail[]>([]);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [isThumbnailLoading, setIsThumbnailLoading] = useState<boolean>(false);
    const [thumbnailError, setThumbnailError] = useState<string | null>(null);
    const [consoleMessages, setConsoleMessages] = useState<string[]>([]);
    const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
    const [isDownloadCodeModalOpen, setIsDownloadCodeModalOpen] = useState(false);
    const [socialPost, setSocialPost] = useState<SocialPost | null>(null);
    const [isSocialPostLoading, setIsSocialPostLoading] = useState<boolean>(false);
    const [socialPostError, setSocialPostError] = useState<string | null>(null);
    const [elevenLabsDetails, setElevenLabsDetails] = useState<geminiService.ElevenLabsUserDetails[]>([]);
    const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
    const [batchRunState, setBatchRunState] = useState<BatchRunState | null>(null);
    
    const logToConsole = useCallback((message: string, isError = false) => {
        const timestamp = new Date().toLocaleTimeString('vi-VN', { hour12: false });
        const prefix = isError ? '[LỖI]' : '[INFO]';
        setConsoleMessages(prev => [...prev, `${timestamp} ${prefix} ${message}`]);
    }, []);

    const filesToBase64 = (files: File[]): Promise<{base64: string, mimeType: string}[]> => {
        const promises = files.map(file => {
            return new Promise<{base64: string, mimeType: string}>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    const result = reader.result as string;
                    const base64 = result.split(',')[1];
                    const mimeType = result.split(';')[0].split(':')[1];
                    resolve({ base64, mimeType });
                };
                reader.onerror = (err) => reject(err);
            });
        });
        return Promise.all(promises);
    };
    

    const generateThumbnail = async (script: Scene[], images: ImageDetail[], currentState: FormState, logger: (message: string, isError?: boolean) => void) => {
        setIsThumbnailLoading(true);
        setThumbnailError(null);
        try {
            const url = await geminiService.generateThumbnail(script, images, currentState, logger);
            setThumbnailUrl(url);
            return url; // Return the URL for immediate use
        } catch (err) {
            console.error('Failed to generate thumbnail', err);
            const errorMessage = getErrorMessage(err)
            setThumbnailError(errorMessage);
            throw err; // Re-throw to be caught in handleSubmit
        } finally {
            setIsThumbnailLoading(false);
        }
    };
    
    /**
     * Core logic to generate all assets for a single project state.
     */
    const runGenerationProcess = useCallback(async (
        currentState: FormState,
        referenceImages: ImageDetail[],
        onProgress?: (message: string) => void
    ): Promise<{
        script: EnhancedScene[],
        thumbnailUrl: string | null,
        socialPost: SocialPost | null,
    }> => {
        const progressLog = (message: string, isError = false) => {
            logToConsole(message, isError);
            if (onProgress && !isError) onProgress(message);
        };
        
        progressLog("Bước 1/4: Đang tạo kịch bản...");
        const rawJson = await geminiService.generateScript(currentState, referenceImages, logToConsole);
        const scriptData: Scene[] = geminiService.parseGeminiResponse(rawJson).scenes;
        progressLog(`Tạo kịch bản thành công. Tổng cộng ${scriptData.length} cảnh.`);

        const enhancedScript: EnhancedScene[] = scriptData.map(s => ({ ...s, isPreviewLoading: true, isVideoLoading: false }));
        const styleText = geminiService.formatVisualStyle(currentState.visualStyleDetail);

        // Generate video prompts for each scene and store them
        enhancedScript.forEach(scene => {
            // Defensive check for malformed API responses
            if (scene.prompt && scene.prompt.Output_Format && scene.prompt.Output_Format.Structure) {
                const structure = scene.prompt.Output_Format.Structure;
                const originalDialogueContext = structure.original_language_dialogue
                    ? `\nOriginal Dialogue (${scene.languageCode}): ${structure.original_language_dialogue}.`
                    : '';


                const videoPrompt = `
${scene.description || ''}.${originalDialogueContext}
Character details: ${structure.character_details || 'Not specified'}.
Setting details: ${structure.setting_details || 'Not specified'}.
Key action: ${structure.key_action || 'Not specified'}.
Camera: ${structure.camera_direction || 'Not specified'}.
Style: ${styleText}.

**CRITICAL NEGATIVE PROMPT (ABSOLUTE RULE):**
The generated video MUST NOT contain any text, letters, words, subtitles, captions, logos, watermarks, or any form of typography overlaid on or embedded in the video frames. The video must be purely visual.
`.trim();
                scene.videoGenPrompt = videoPrompt;
            } else {
                // Log a warning if the prompt structure is missing for a scene
                logToConsole(`Cảnh báo: Cảnh ${scene.scene} thiếu cấu trúc 'prompt' hợp lệ từ API. Sẽ sử dụng prompt video cơ bản.`, true);
                scene.videoGenPrompt = `${scene.description || ''}. Style: ${styleText}.

**CRITICAL NEGATIVE PROMPT (ABSOLUTE RULE):**
The generated video MUST NOT contain any text, letters, words, subtitles, captions, logos, watermarks, or any form of typography overlaid on or embedded in the video frames. The video must be purely visual.
`;
            }
        });
        
        setGeneratedScript(enhancedScript);

        // Delay to prevent API rate limiting
        progressLog(t('log.api.delay', { seconds: 7 }));
        await new Promise(resolve => setTimeout(resolve, 7000));

        let generatedThumbnailUrl: string | null = null;
        progressLog("Bước 2/4: Đang tạo ảnh đại diện (thumbnail)...");
        try {
            generatedThumbnailUrl = await generateThumbnail(scriptData, referenceImages, currentState, logToConsole);
            progressLog("Tạo ảnh đại diện (thumbnail) thành công.");
        } catch (err) {
            progressLog(`Tạo ảnh đại diện thất bại: ${getErrorMessage(err)}`, true);
        }

        // Delay to prevent API rate limiting
        progressLog(t('log.api.delay', { seconds: 7 }));
        await new Promise(resolve => setTimeout(resolve, 7000));

        let generatedSocialPost: SocialPost | null = null;
        progressLog("Bước 3/4: Đang tạo nội dung bài đăng social media...");
        setIsSocialPostLoading(true);
        try {
            generatedSocialPost = await geminiService.generateSocialPost(scriptData, currentState, logToConsole);
            setSocialPost(generatedSocialPost);
            progressLog("Tạo nội dung bài đăng thành công.");
        } catch (err) {
            const socialErrorMessage = getErrorMessage(err);
            setSocialPostError(socialErrorMessage);
            progressLog(`Tạo nội dung social media thất bại: ${socialErrorMessage}`, true);
        } finally {
            setIsSocialPostLoading(false);
        }
        
        progressLog("Bước 4/4: Đang tạo ảnh xem trước cho từng cảnh (tuần tự)...");
        const delayBetweenPreviews = 3000; // 3 second delay
        let scriptWithPreviews = [...enhancedScript];

        for (let i = 0; i < scriptWithPreviews.length; i++) {
            const scene = scriptWithPreviews[i];
            try {
                logToConsole(`[Cảnh ${scene.scene}] Bắt đầu tạo ảnh...`);
                const result = await geminiService.generateImagePreview(
                    scene, 
                    referenceImages, 
                    currentState, 
                    (msg, isErr) => logToConsole(`[Cảnh ${scene.scene}] ${msg}`, isErr)
                );
                
                scriptWithPreviews[i] = { 
                    ...scene, 
                    previewImageUrls: result.imageUrls, 
                    imageGenPrompt: result.promptText, 
                    isPreviewLoading: false 
                };

                setGeneratedScript([...scriptWithPreviews]);
                logToConsole(`[Cảnh ${scene.scene}] Tạo ảnh thành công.`);

            } catch (err) {
                const errorMessage = getErrorMessage(err);
                logToConsole(`[Cảnh ${scene.scene}] Tạo ảnh xem trước thất bại: ${errorMessage}`, true);
                
                scriptWithPreviews[i] = { 
                    ...scene, 
                    isPreviewLoading: false, 
                    error: errorMessage 
                };

                setGeneratedScript([...scriptWithPreviews]);
            }

            // Wait before starting the next one, but not after the last one
            if (i < scriptWithPreviews.length - 1) {
                logToConsole(`Tạm dừng ${delayBetweenPreviews / 1000}s trước khi tạo ảnh tiếp theo...`);
                await new Promise(resolve => setTimeout(resolve, delayBetweenPreviews));
            }
        }
        
        progressLog("Hoàn tất tạo ảnh xem trước.");

        return {
            script: scriptWithPreviews,
            thumbnailUrl: generatedThumbnailUrl,
            socialPost: generatedSocialPost,
        }

    }, [logToConsole, t]);

    const handleSubmit = async () => {
        setIsBatchProcessing(false);
        setIsLoading(true);
        setError(null);
        setGeneratedScript(null);
        setThumbnailUrl(null);
        setSocialPost(null);
        setConsoleMessages([]); // Clear console on new run

        try {
            logToConsole("Đang xử lý hình ảnh tham khảo...");
            const productImages: ImageDetail[] = (await filesToBase64(formState.imageFiles)).map((file, i) => ({
                ...file,
                source: `product-${i + 1}`
            }));
            const modelImages: ImageDetail[] = (await Promise.all(
                formState.models.map(m => m.faceImage ? filesToBase64([m.faceImage]) : Promise.resolve([]))
            )).flat().map((file, i) => ({
                ...file,
                source: `model-${i + 1}`
            }));

            const allImages = [...productImages, ...modelImages];
            setImageDetails(allImages);
            logToConsole(`Đã xử lý ${allImages.length} hình ảnh tham khảo.`);
            
            await runGenerationProcess(formState, allImages);
            
        } catch (err) {
            const errorMessage = getErrorMessage(err);
            setError(errorMessage);
            logToConsole(errorMessage, true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBatchSubmit = async () => {
        setIsBatchProcessing(true);
        setIsLoading(true); // Also use general loading state for button disable
        setError(null);
        setConsoleMessages([]); // Clear console on new run
        
        const initialBatchState: BatchRunState = {
            projects: [],
            overall: { current: 0, total: 0 },
            startTime: Date.now()
        };
        setBatchRunState(initialBatchState);

        try {
            logToConsole("Bắt đầu xử lý hàng loạt...");
            logToConsole("Bước 1/4: Đang lấy danh sách dự án từ Google Sheet...");
            const projectsFromSheet = await geminiService.fetchSheetAsRows(formState.batchInputSheetId, formState.googleWorkspaceToken);
            
            const initialProjects: BatchProjectStatus[] = projectsFromSheet.map(p => ({
                rowIndex: p.rowIndex,
                name: p.data['Tên dự án'],
                status: 'pending',
                message: t('batchStatus.pending')
            }));

            setBatchRunState({
                ...initialBatchState,
                projects: initialProjects,
                overall: { current: 0, total: initialProjects.length }
            });
            logToConsole(`Tìm thấy ${initialProjects.length} dự án để xử lý.`);

            for (let i = 0; i < projectsFromSheet.length; i++) {
                const projectRow = projectsFromSheet[i];
                const projectState = geminiService.mapRowToFormState(projectRow.data, formState);

                // Update UI state to 'processing' for the current project
                setBatchRunState(prevState => {
                    if (!prevState) return null;
                    const updatedProjects = [...prevState.projects];
                    updatedProjects[i] = {
                        ...updatedProjects[i],
                        status: 'processing',
                        message: 'Đang lấy tài nguyên từ Drive...'
                    };
                    return { ...prevState, projects: updatedProjects, overall: {...prevState.overall, current: i + 1 } };
                });

                let projectError: string | null = null;
                
                try {
                    // Fetch reference images from Drive
                    logToConsole(`[${projectState.projectName}] Đang lấy hình ảnh từ Google Drive...`);
                    const modelImageFiles = await geminiService.fetchFilesFromSubfolder(formState.batchModelLibraryFolderId, projectRow.data['Thư mục con Thư viện Người mẫu'], formState.googleWorkspaceToken);
                    const productImageFiles = await geminiService.fetchFilesFromSubfolder(formState.batchProductLibraryFolderId, projectRow.data['Thư mục con Thư viện Sản phẩm'], formState.googleWorkspaceToken);
                    logToConsole(`[${projectState.projectName}] Tìm thấy ${modelImageFiles.length} ảnh người mẫu, ${productImageFiles.length} ảnh sản phẩm.`);

                    const modelImages: ImageDetail[] = (await filesToBase64(modelImageFiles)).map((file, i) => ({ ...file, source: `model-${i + 1}` }));
                    const productImages: ImageDetail[] = (await filesToBase64(productImageFiles)).map((file, i) => ({ ...file, source: `product-${i + 1}` }));
                    const allImages = [...productImages, ...modelImages];

                    const { script, thumbnailUrl, socialPost } = await runGenerationProcess(projectState, allImages, (message) => {
                         setBatchRunState(prevState => {
                            if (!prevState) return null;
                            const updatedProjects = [...prevState.projects];
                            updatedProjects[i].message = message;
                            return { ...prevState, projects: updatedProjects };
                        });
                    });

                    setBatchRunState(prevState => prevState ? ({ ...prevState, projects: prevState.projects.map(p => p.rowIndex === projectRow.rowIndex ? {...p, message: "Đang tải lên kết quả..."} : p) }) : null);
                    logToConsole(`[${projectState.projectName}] Đang tạo thư mục kết quả trên Drive...`);
                    const outputFolderId = await geminiService.createDriveFolder(formState.batchOutputDriveFolderId, projectState.projectName, formState.googleWorkspaceToken);
                    
                    logToConsole(`[${projectState.projectName}] Đang tạo các thư mục con...`);
                    const promptsFolderId = await geminiService.createDriveFolder(outputFolderId, 'prompts', formState.googleWorkspaceToken);
                    const imagesFolderId = await geminiService.createDriveFolder(outputFolderId, 'preview_images', formState.googleWorkspaceToken);
                    const audioFolderId = await geminiService.createDriveFolder(outputFolderId, 'audio', formState.googleWorkspaceToken);

                    const uploadPromises = [];
                    
                    // 1. Upload main script
                    const cleanScript = script.map(({ previewImageUrls, isPreviewLoading, error, videoUrl, isVideoLoading, videoError, imageGenPrompt, videoGenPrompt, ...rest }) => rest);
                    const scriptBlob = new Blob([JSON.stringify({ scenes: cleanScript }, null, 2)], { type: 'application/json' });
                    uploadPromises.push(geminiService.uploadFileToDrive(outputFolderId, scriptBlob, 'script.json', formState.googleWorkspaceToken));
                    
                    // 2. Upload thumbnail
                    if (thumbnailUrl) {
                        const thumbBlob = await geminiService.dataUrlToBlob(thumbnailUrl);
                        uploadPromises.push(geminiService.uploadFileToDrive(outputFolderId, thumbBlob, 'thumbnail.png', formState.googleWorkspaceToken));
                    }
                    
                    // 3. Upload social post
                    if (socialPost) {
                         let socialPostText = socialPost.platform === 'youtube'
                            ? `Title: ${socialPost.title}\n\nDescription:\n${socialPost.description}\n\nTags: ${socialPost.tags}`
                            : socialPost.versions.map(v => `Post: ${v.post}\nHashtags: ${v.hashtags}`).join('\n\n');
                        const socialBlob = new Blob([socialPostText], { type: 'text/plain' });
                        uploadPromises.push(geminiService.uploadFileToDrive(outputFolderId, socialBlob, 'social_post.txt', formState.googleWorkspaceToken));
                    }

                    // 4. Upload scene prompts
                    logToConsole(`[${projectState.projectName}] Chuẩn bị ${script.length} file prompt để tải lên...`);
                    script.forEach(scene => {
                        const promptBlob = new Blob([JSON.stringify(scene.prompt, null, 2)], { type: 'application/json' });
                        uploadPromises.push(geminiService.uploadFileToDrive(promptsFolderId, promptBlob, `scene_${scene.scene}_prompt.json`, formState.googleWorkspaceToken));
                    });

                    // 5. Upload preview images
                    logToConsole(`[${projectState.projectName}] Chuẩn bị ảnh xem trước để tải lên...`);
                    script.forEach(scene => {
                        if (scene.previewImageUrls && scene.previewImageUrls.length > 0) {
                            const uploadPromise = geminiService.dataUrlToBlob(scene.previewImageUrls[0])
                                .then(blob => geminiService.uploadFileToDrive(imagesFolderId, blob, `scene_${scene.scene}_preview.png`, formState.googleWorkspaceToken))
                                .catch(err => logToConsole(`[${projectState.projectName}] Lỗi khi xử lý ảnh xem trước cho cảnh ${scene.scene}: ${getErrorMessage(err)}`, true));
                            uploadPromises.push(uploadPromise);
                        }
                    });

                    // 6. Upload audio files
                    logToConsole(`[${projectState.projectName}] Đang tạo file âm thanh TTS...`);
                    const audioFiles = await geminiService.generateAndFetchAllAudioBlobs(script, projectState.elevenLabsTokens, projectState.elevenLabsVoiceId);
                    logToConsole(`[${projectState.projectName}] Đã tạo ${audioFiles.length} file âm thanh, chuẩn bị tải lên...`);
                    audioFiles.forEach(audioFile => {
                        uploadPromises.push(geminiService.uploadFileToDrive(audioFolderId, audioFile.blob, audioFile.name, formState.googleWorkspaceToken));
                    });

                    // 7. Upload guide and SRT
                    const guideText = getTransitionGuideText(t);
                    const guideBlob = new Blob([guideText], { type: 'text/plain' });
                    uploadPromises.push(geminiService.uploadFileToDrive(outputFolderId, guideBlob, 'editing_guide.txt', formState.googleWorkspaceToken));

                    const srtContent = geminiService.generateSrtContent(script, projectState.duration);
                    const srtBlob = new Blob([srtContent], { type: 'text/plain' });
                    uploadPromises.push(geminiService.uploadFileToDrive(outputFolderId, srtBlob, 'subtitles.srt', formState.googleWorkspaceToken));
                    
                    logToConsole(`[${projectState.projectName}] Đang tải lên tất cả ${uploadPromises.length} file...`);
                    await Promise.all(uploadPromises);
                    logToConsole(`[${projectState.projectName}] Tải lên thành công. Cập nhật Google Sheet...`);
                    
                    // Update Sheet
                    const outputFolderUrl = `https://drive.google.com/drive/folders/${outputFolderId}`;
                    await geminiService.updateSheetRow(
                        formState.batchOutputSheetId,
                        projectRow.rowIndex,
                        [['COMPLETED', outputFolderUrl, JSON.stringify({ scenes: cleanScript }, null, 2)]],
                        formState.googleWorkspaceToken
                    );

                } catch (err) {
                    projectError = getErrorMessage(err);
                    logToConsole(`[${projectState.projectName}] Gặp lỗi nghiêm trọng: ${projectError}`, true);
                    await geminiService.updateSheetRow(
                        formState.batchOutputSheetId,
                        projectRow.rowIndex,
                        [['ERROR', '', projectError]],
                        formState.googleWorkspaceToken
                    );
                }

                 setBatchRunState(prevState => {
                    if (!prevState) return null;
                    const updatedProjects = [...prevState.projects];
                    updatedProjects[i] = {
                        ...updatedProjects[i],
                        status: projectError ? 'error' : 'completed',
                        message: projectError ? t('batchStatus.failed') : t('batchStatus.completed'),
                        error: projectError || undefined
                    };
                    return { ...prevState, projects: updatedProjects };
                });
            }
            logToConsole("Hoàn tất xử lý hàng loạt.");

        } catch (err) {
            const errorMessage = getErrorMessage(err);
            setError(errorMessage);
            logToConsole(`Lỗi nghiêm trọng trong quá trình xử lý hàng loạt: ${errorMessage}`, true);
        } finally {
            setIsLoading(false);
            // Don't set isBatchProcessing to false, so the results screen stays visible
        }
    };

    const handleRegenerateScene = async (sceneIndex: number) => {
        if (!generatedScript) return;

        const updatedScript = [...generatedScript];
        const sceneToUpdate = updatedScript[sceneIndex];
        updatedScript[sceneIndex] = { ...sceneToUpdate, isPreviewLoading: true, error: undefined };
        setGeneratedScript(updatedScript);

        try {
            logToConsole(`Bắt đầu tạo lại Cảnh ${sceneToUpdate.scene}...`);
            const { description, prompt } = await geminiService.regenerateScene(formState, generatedScript, sceneIndex, logToConsole);
            
            // Regenerate the image preview for the new scene description/prompt
            const tempSceneForPreview: Scene = { ...sceneToUpdate, description, prompt };
            const { imageUrls, promptText } = await geminiService.generateImagePreview(tempSceneForPreview, imageDetails, formState, logToConsole);

            updatedScript[sceneIndex] = {
                ...sceneToUpdate,
                description,
                prompt,
                previewImageUrls: imageUrls,
                imageGenPrompt: promptText,
                isPreviewLoading: false,
                videoUrl: undefined, // Reset video if script changes
                isVideoLoading: false,
                videoError: undefined,
            };
            setGeneratedScript(updatedScript);
            logToConsole(`Tạo lại Cảnh ${sceneToUpdate.scene} thành công.`);

        } catch (err) {
            const errorMessage = getErrorMessage(err);
            logToConsole(`Tạo lại Cảnh ${sceneToUpdate.scene} thất bại: ${errorMessage}`, true);
            updatedScript[sceneIndex] = { ...sceneToUpdate, isPreviewLoading: false, error: errorMessage };
            setGeneratedScript(updatedScript);
        }
    };
    
    const handleGenerateVideo = async (sceneIndex: number) => {
        // First, check if user has selected an API key via AI Studio.
        // This is a requirement for using the Veo model.
        if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                if (typeof window.aistudio?.openSelectKey === 'function') {
                    // Prompt user to select a key.
                    logToConsole("Vui lòng chọn một API key trong cửa sổ của AI Studio để tiếp tục.", false);
                    await window.aistudio.openSelectKey();
                } else {
                    const errorMsg = "Lỗi: Không tìm thấy chức năng chọn API key. Vui lòng đảm bảo bạn đang chạy trong môi trường được hỗ trợ.";
                    logToConsole(errorMsg, true);
                    setError(errorMsg);
                    return;
                }
            }
        }

        if (!generatedScript) return;
        const updatedScript = [...generatedScript];
        const sceneToUpdate = updatedScript[sceneIndex];
        updatedScript[sceneIndex] = { ...sceneToUpdate, isVideoLoading: true, videoError: undefined };
        setGeneratedScript(updatedScript);

        try {
            logToConsole(t('log.video.start', { sceneNumber: sceneToUpdate.scene }));
            const modelName = formState.veoModel === 'veo_ultra' ? t('log.modelName.ultra') : t('log.modelName.fast');
            logToConsole(t('log.video.model', { modelName }));

            const videoUrl = await geminiService.generateVideoWithGenAI(sceneToUpdate, imageDetails, formState, logToConsole);

            updatedScript[sceneIndex] = { ...sceneToUpdate, videoUrl, isVideoLoading: false };
            setGeneratedScript(updatedScript);
            logToConsole(`Tạo video cho Cảnh ${sceneToUpdate.scene} thành công.`);
        } catch (err) {
            const errorMessage = getErrorMessage(err);
             if (errorMessage.includes("API key đã chọn không hợp lệ")) {
                 setError(errorMessage);
            }
            logToConsole(`${t('log.video.failed', { sceneNumber: sceneToUpdate.scene })}: ${errorMessage}`, true);
            updatedScript[sceneIndex] = { ...sceneToUpdate, isVideoLoading: false, videoError: errorMessage };
            setGeneratedScript(updatedScript);
        }
    };

    const handleGenerateAllVideos = async () => {
        if (!generatedScript) return;
        logToConsole(t('log.video.generateAll.start'));
        // Using a for...of loop to process videos sequentially to avoid rate limiting
        for (let i = 0; i < generatedScript.length; i++) {
            const scene = generatedScript[i];
            if (scene.videoUrl || scene.isVideoLoading) {
                logToConsole(t('log.video.generateAll.skip', { sceneNumber: scene.scene }));
                continue;
            }
            await handleGenerateVideo(i);
            // Add a small delay between requests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        logToConsole(t('log.video.generateAll.end'));
    };

    const handleRegenerateThumbnail = useCallback(async () => {
        if (!generatedScript) return;
        try {
            await generateThumbnail(generatedScript, imageDetails, formState, logToConsole);
        } catch (err) {
            // Error state is already handled within generateThumbnail
        }
    }, [generatedScript, imageDetails, formState, logToConsole]);

    const handleEnhanceVoiceover = async (sceneIndex: number) => {
        if (!generatedScript) return;

        const updatedScript = [...generatedScript];
        const sceneToUpdate = updatedScript[sceneIndex];
        updatedScript[sceneIndex] = { ...sceneToUpdate, isVoiceoverEnhancing: true, error: undefined };
        setGeneratedScript(updatedScript);

        try {
            logToConsole(t('log.voiceover.start', { sceneNumber: sceneToUpdate.scene }));
            const enhancedVoiceover = await geminiService.enhanceVoiceover(
                sceneToUpdate.voiceover,
                sceneToUpdate.languageCode,
                formState,
                (msg, isErr) => logToConsole(`[Cảnh ${sceneToUpdate.scene}] ${msg}`, isErr)
            );

            updatedScript[sceneIndex] = {
                ...sceneToUpdate,
                voiceover: enhancedVoiceover,
                isVoiceoverEnhancing: false,
            };
            setGeneratedScript(updatedScript);
            logToConsole(t('log.voiceover.success', { sceneNumber: sceneToUpdate.scene }));

        } catch (err) {
            const errorMessage = getErrorMessage(err);
            logToConsole(t('log.voiceover.failed', { sceneNumber: sceneToUpdate.scene, error: errorMessage }), true);
            updatedScript[sceneIndex] = { ...sceneToUpdate, isVoiceoverEnhancing: false, error: `Voiceover enhance failed: ${errorMessage}` };
            setGeneratedScript(updatedScript);
        }
    };

    return (
        <div className="min-h-screen bg-brand-bg text-text-main">
            <Header onApiSettingsClick={() => setIsApiSettingsOpen(true)} onDownloadCodeClick={() => setIsDownloadCodeModalOpen(true)} />
            <main className="container mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <ScriptForm
                        formState={formState}
                        setFormState={setFormState}
                        onSingleSubmit={handleSubmit}
                        onBatchSubmit={handleBatchSubmit}
                        isLoading={isLoading}
                        consoleMessages={consoleMessages}
                    />
                </div>
                <div className="lg:col-span-2">
                    <JsonDisplay
                        isLoading={isLoading}
                        isBatchProcessing={isBatchProcessing}
                        batchRunState={batchRunState}
                        error={error}
                        script={generatedScript}
                        projectName={formState.projectName}
                        aspectRatio={formState.aspectRatio}
                        duration={formState.duration}
                        elevenLabsTokens={formState.elevenLabsTokens}
                        elevenLabsVoiceId={formState.elevenLabsVoiceId}
                        elevenLabsDetails={elevenLabsDetails}
                        onRegenerateScene={handleRegenerateScene}
                        onGenerateVideo={handleGenerateVideo}
                        onGenerateAllVideos={handleGenerateAllVideos}
                        onEnhanceVoiceover={handleEnhanceVoiceover}
                        thumbnailUrl={thumbnailUrl}
                        isThumbnailLoading={isThumbnailLoading}
                        thumbnailError={thumbnailError}
                        onRegenerateThumbnail={handleRegenerateThumbnail}
                        socialPost={socialPost}
                        isSocialPostLoading={isSocialPostLoading}
                        socialPostError={socialPostError}
                        scriptGenModel={formState.scriptGenModel}
                        imageGenModel={formState.imageGenModel}
                        veoModel={formState.veoModel}
                    />
                </div>
            </main>
            {isApiSettingsOpen && (
                <ApiSettingsModal
                    formState={formState}
                    setFormState={setFormState}
                    onClose={() => setIsApiSettingsOpen(false)}
                    setElevenLabsDetails={setElevenLabsDetails}
                />
            )}
             {isDownloadCodeModalOpen && (
                <DownloadCodeModal 
                    isOpen={isDownloadCodeModalOpen}
                    onClose={() => setIsDownloadCodeModalOpen(false)}
                />
            )}
        </div>
    );
};

export default App;