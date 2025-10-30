import { GoogleGenAI, Modality, Type } from "@google/genai";
import { FormState, Scene, EnhancedScene, Prompt, ImageDetail, SocialPost, Model, VisualStyleDetail, ElevenLabsVoice, ElevenLabsUserDetails as ElevenLabsUserDetailsType } from '../types';

type Logger = (message: string, isError?: boolean) => void;

/**
 * Draws user-provided text onto an image using HTML Canvas, ensuring correct Vietnamese font rendering.
 * @param imageUrl The data URL of the base image.
 * @param text The text to draw on the image.
 * @returns A Promise that resolves with the data URL of the new image with text.
 */
const addTextToImage = (imageUrl: string, text: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // Necessary for loading images into a canvas
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // --- Text Styling ---
            // Dynamic font size based on image width, with a max size.
            const baseFontSize = Math.floor(canvas.width / 15);
            const fontSize = Math.min(baseFontSize, 120); // Max font size of 120px
            ctx.font = `bold ${fontSize}px 'Arial'`; // Use a widely supported font
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            
            // Add a stroke for better readability on any background
            ctx.strokeStyle = 'black';
            ctx.lineWidth = Math.max(2, Math.floor(fontSize / 12)); // Dynamic stroke width

            // --- Text Wrapping Logic ---
            const maxWidth = canvas.width * 0.9; // Use up to 90% of canvas width
            const lineHeight = fontSize * 1.2;
            const words = text.toUpperCase().split(' ');
            let line = '';
            const lines: string[] = [];

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    lines.push(line);
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);

            // Calculate starting Y position to center the text block vertically
            const totalTextHeight = lines.length * lineHeight;
            let startY = (canvas.height - totalTextHeight) / 2 + (fontSize / 2);

            // Adjust startY if the text block is too high, pushing it down slightly
            if (startY < (lineHeight / 2)) {
                startY = (lineHeight / 2) + (canvas.height * 0.05);
            }
            
            // Draw each line with both stroke and fill
            lines.forEach((l, index) => {
                const yPos = startY + (index * lineHeight);
                ctx.strokeText(l.trim(), canvas.width / 2, yPos);
                ctx.fillText(l.trim(), canvas.width / 2, yPos);
            });
            
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            reject(new Error('Failed to load image for canvas drawing.'));
        };
        img.src = imageUrl;
    });
};

/**
 * Parses the JSON string from a model object, providing default values if parsing fails.
 * @param model The model object containing the detailsJson string.
 * @returns An object with parsed model details.
 */
const parseModelDetails = (model: Model) => {
    try {
        // Allow for comments in JSON by stripping them out before parsing
        const cleanedJson = model.detailsJson.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
        const details = JSON.parse(cleanedJson);
        return {
            gender: details.gender || 'Not specified',
            nationality: details.nationality || 'Not specified',
            age: details.age || 'Not specified',
            clothing: details.clothing || 'Not specified',
            hairstyle: details.hairstyle || 'Not specified',
            otherDetails: details.otherDetails || 'Not specified',
        };
    } catch (e) {
        console.error(`Invalid JSON for model ${model.id}:`, e, "JSON string was:", model.detailsJson);
        // Return default/empty values if parsing fails to avoid crashing the app
        return {
            gender: 'Not specified',
            nationality: 'Not specified',
            age: 'Not specified',
            clothing: 'Not specified',
            hairstyle: 'Not specified',
            otherDetails: 'Invalid JSON provided in form',
        };
    }
}

const dataUrlToBase64 = (dataUrl: string): { base64: string, mimeType: string } => {
    const parts = dataUrl.split(',');
    const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/png'; // Default to png if regex fails
    const base64 = parts[1];
    if (!base64) {
        throw new Error('Invalid data URL format');
    }
    return { base64, mimeType };
};

// Helper to create parts for multimodal prompts
const buildMultimodalPromptParts = (promptText: string, images: ImageDetail[]) => {
    const parts: any[] = [{ text: promptText }];
    images.forEach(image => {
        parts.push({
            inlineData: {
                mimeType: image.mimeType,
                data: image.base64,
            },
        });
    });
    return parts;
};

// Helper function to safely parse JSON from Gemini response
export const parseGeminiResponse = (responseText: string): any => {
    // The response is often wrapped in ```json ... ``` or just ```...```
    // This regex is more robust, handling optional 'json' and varying whitespace/newlines.
    const match = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    // If there's a match, use the captured group; otherwise, assume the whole string is JSON.
    const jsonString = match ? match[1] : responseText;
    try {
        // Also handle cases where the string might not be perfectly trimmed.
        return JSON.parse(jsonString.trim());
    } catch (e) {
        console.error("Failed to parse JSON response:", jsonString);
        throw new Error("Invalid JSON response from API. Could not parse content.");
    }
};

/**
 * Executes a Gemini API call with automatic key rotation and retry logic for quota errors.
 * @param keys An array of Gemini API keys.
 * @param apiCall A function that takes a key and performs the API call.
 * @returns The result of the successful API call.
 * @throws An error if all keys and retries fail.
 */
async function executeWithKeyRotation<T>(
    keys: string[],
    apiCall: (key: string) => Promise<T>,
    logger: Logger = () => {}
): Promise<T> {
    if (!keys || keys.length === 0) {
        logger("Không có Gemini API key nào được cung cấp.", true);
        throw new Error("No Gemini API keys provided.");
    }
    let lastError: any;
    const maxRetriesPerKey = 3;
    const initialDelay = 2000; // Start with a 2-second delay

    for (const [keyIndex, key] of keys.entries()) {
        if (!key) continue;
        
        logger(`Đang thử API call với key #${keyIndex + 1} (kết thúc bằng ...${key.slice(-4)})`);

        let retries = 0;
        while (retries < maxRetriesPerKey) {
            try {
                // Attempt the API call with the current key
                return await apiCall(key);
            } catch (error) {
                lastError = error;
                const errorMessage = (error instanceof Error ? error.message : String(error)).toLowerCase();
                const isQuotaError = errorMessage.includes('quota') || 
                                     errorMessage.includes('resource_exhausted') ||
                                     (error as any)?.status === 429 ||
                                     errorMessage.includes('rpc failed due to xhr error');

                if (isQuotaError) {
                    retries++;
                    if (retries < maxRetriesPerKey) {
                        const delay = initialDelay * Math.pow(2, retries - 1); // Exponential backoff
                        logger(`Lỗi hạn mức với key ...${key.slice(-4)}. Thử lại sau ${delay / 1000}s... (Lần thử ${retries}/${maxRetriesPerKey}). Chi tiết: ${errorMessage}`, true);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        logger(`Đã đạt tối đa lần thử cho key ...${key.slice(-4)}.`, true);
                        if (keyIndex < keys.length - 1) {
                             logger(`Chuyển sang key tiếp theo...`);
                        }
                        // Break the while loop to move to the next key in the for loop
                        break; 
                    }
                } else {
                    // It's a different, non-retriable error, so we should fail fast.
                    logger(`Gặp lỗi không thể thử lại với key ...${key.slice(-4)}: ${errorMessage}`, true);
                    throw error;
                }
            }
        }
    }

    // If the loop completes without returning, it means all keys failed after all retries.
    let finalErrorMessage = "All provided Gemini API keys failed.";
    if (lastError) {
      const errorMessage = (lastError instanceof Error ? lastError.message : String(lastError)).toLowerCase();
      const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('resource_exhausted') || (lastError as any)?.status === 429 || errorMessage.includes('rpc failed due to xhr error');
      if (isQuotaError) {
        finalErrorMessage = "All provided Gemini API keys are currently rate-limited or have exceeded their quota, even after multiple retries.";
      } else {
        finalErrorMessage = `A non-retriable error occurred. Last error: ${lastError.message}`;
      }
    }
    logger(finalErrorMessage, true);
    throw new Error(finalErrorMessage);
}

export const formatVisualStyle = (style: VisualStyleDetail): string => {
    const parts = [`Base style: ${style.baseStyle}.`];
    if (style.colorAndMood) parts.push(`Color & Mood: ${style.colorAndMood}.`);
    if (style.lighting) parts.push(`Lighting: ${style.lighting}.`);
    if (style.cameraAndFraming) parts.push(`Camera & Framing: ${style.cameraAndFraming}.`);
    if (style.artisticInfluence) parts.push(`Artistic Influence: ${style.artisticInfluence}.`);
    return parts.join(' ');
}

export const generateScript = async (formState: FormState, images: ImageDetail[], logger: Logger): Promise<string> => {
    return executeWithKeyRotation(formState.geminiTokens, async (key) => {
        const ai = new GoogleGenAI({ apiKey: key });
        
        const modelsDescription = formState.models.map((model, i) => {
            const details = parseModelDetails(model);
            return `
    Model ${i + 1} (${details.gender}, ${details.nationality}, age ${details.age}):
    - Clothing: ${details.clothing}
    - Hairstyle: ${details.hairstyle}
    - Other details: ${details.otherDetails}
    - Face reference image is provided as 'model-${i+1}'.
            `;
        }).join('');

        // Dynamically calculate the number of scenes. Average 8 seconds per scene.
        const sceneCount = Math.max(1, Math.ceil(formState.duration / 8));
        const visualStyleString = formatVisualStyle(formState.visualStyleDetail);

        const prompt = `
    Objective: Create a detailed video script in JSON format. The output MUST be a valid JSON object with a "scenes" key containing an array of scene objects. The entire script, including all descriptions and voiceovers, MUST be in the language specified by the languageCode (${formState.languageCode}).

    **Video Idea:** ${formState.idea}
    **Core Content:** ${formState.content}
    **Total Duration:** Approximately ${formState.duration} seconds.
    **Script Style:** ${formState.scriptStyle} (e.g., viral, KOC review, story-telling)
    **Visual Style:** ${visualStyleString}
    ${formState.settingDescription
        ? `**Setting/Background:** ${formState.settingDescription}`
        : `**Setting/Background Generation:** You MUST invent a suitable and compelling setting/background for the video based on the idea, content, and characters. The setting must be consistent with the overall theme.`
    }
    **Models/Characters:**
    ${modelsDescription || 'No specific models described.'}

    **Reference Images:**
    ${images.map(img => `- An image is provided with source reference '${img.source}'`).join('\n')}

    **Task Instructions:**
    1.  Analyze all provided information.
    2.  Break down the video into exactly ${sceneCount} distinct scenes for the ${formState.duration}-second duration.
    3.  For each scene, provide a concise \`description\` in the target language (${formState.languageCode}).
    4.  Create a separate \`voiceover\` field containing the dialogue/narration in the target language (${formState.languageCode}). This field MUST include descriptive audio tags in square brackets to guide the text-to-speech model. The tags should also be in the target language if appropriate (e.g., for actions like [cười], [khóc], [laughs], [cries]). This is a critical requirement.
        **Available Audio Tags (Adapt these to the target language for the voiceover):**
        \`\`\`json
        {
          "emotion_tags": {"happy": "[vui vẻ]", "excited": "[hào hứng]", "sad": "[buồn bã]", "angry": "[tức giận]", "surprised": "[ngạc nhiên]", "disappointed": "[thất vọng]", "scared": "[sợ hãi]", "confident": "[tự tin]", "nervous": "[lo lắng]", "crying": "[khóc]", "laughs": "[cười]", "sighs": "[thở dài]"},
          "tone_tags": {"whispers": "[thì thầm]", "shouts": "[hét lên]", "sarcastic": "[mỉa mai]", "dramatic_tone": "[giọng kịch tính]", "reflective": "[suy tư]", "gentle_voice": "[giọng nhẹ nhàng]", "serious_tone": "[giọng nghiêm túc]"},
          "style_tags": {"storytelling": "[giọng kể chuyện]", "advertisement": "[giọng quảng cáo]"},
          "timing_tags": {"pause": "[ngừng lại]", "hesitates": "[do dự]", "rushed": "[vội vã]", "slows_down": "[chậm lại]"},
          "action_tags": {"clears_throat": "[hắng giọng]", "gasp": "[thở hổn hển]"}
        }
        \`\`\`
    5.  The \`voicer\` field MUST be set to this exact value: \`${formState.elevenLabsVoiceId}\`.
    6.  The \`languageCode\` field MUST be set to \`${formState.languageCode}\`.
    7.  Generate a detailed \`prompt\` object for a text-to-video AI model.
    8.  The \`prompt.Output_Format.Structure\` must be filled with specific, actionable details for the video generation AI, written in English, with the following additions for dialogue:
        - \`character_details\`: This is the most critical field. When describing a character (e.g., 'Model 1'), you MUST combine two sources:
            a. The reference image for that model (e.g., 'model-1') for facial features and ethnicity.
            b. **The EXACT clothing, hairstyle, and GENDER descriptions provided in the "Models/Characters" section.** This is a NON-NEGOTIABLE rule.
            Combine these into a single, cohesive description. Example: 'A 25-year-old Vietnamese woman, strongly resembling the person in reference image 'model-1', wearing **exactly** [Model 1's clothing description] and with hair styled as **exactly** [Model 1's hairstyle description], smiles warmly'.
        - \`setting_details\`: Describe the environment, lighting, and mood.
        - \`key_action\`: Describe the main action. If a product is used, reference it: '...holds a coffee maker that looks exactly like the one in reference image 'product-1'.'
        - \`camera_direction\`: Suggest camera angles and movements (e.g., "close-up shot", "panning left").
        - \`original_language_dialogue\`: Copy the content of the top-level \`voiceover\` field here, but REMOVE all audio tags like \`[vui vẻ]\`. This field must be in the target language (${formState.languageCode}).
    9.  The audio tags like '[vui vẻ]' are ONLY for the top-level \`voiceover\` field. DO NOT include them anywhere else.
    10. Ensure the final output is ONLY a single valid JSON object. Do not include any text, explanations, or markdown outside of the JSON.

    **Output Format (Strictly Adhere):**
    \`\`\`json
    {
      "scenes": [
        {
          "scene": 1,
          "description": "A short summary of the scene, in the target language.",
          "voiceover": "[emotion_tag][pause_tag] Sample voiceover text here, in the target language.",
          "voicer": "${formState.elevenLabsVoiceId}",
          "languageCode": "${formState.languageCode}",
          "prompt": {
            "Objective": "Generate a short video clip for this scene.",
            "Persona": {
              "Role": "Creative Video Director",
              "Tone": "Cinematic and evocative",
              "Knowledge_Level": "Expert in visual storytelling"
            },
            "Task_Instructions": [
              "Create a video clip lasting approximately ${Math.round(formState.duration / sceneCount)} seconds."
            ],
            "Constraints": [
              "Aspect ratio: ${formState.aspectRatio}",
              "Visual style: ${visualStyleString}"
            ],
            "Input_Examples": [],
            "Output_Format": {
              "Type": "JSON",
              "Structure": {
                "character_details": "In English. Detailed description of character appearance (referencing 'model-1' image), their EXACT clothing, and their actions in this scene.",
                "setting_details": "In English. Detailed description of the scene's setting, lighting, atmosphere.",
                "key_action": "In English. The single most important action occurring in the scene, potentially referencing a 'product-1' image.",
                "camera_direction": "In English. Specific camera shot type, angle, or movement.",
                "original_language_dialogue": "The spoken dialogue for this scene, in the target language, without audio tags."
              }
            }
          }
        }
      ]
    }
    \`\`\`
    `;
        
        const response = await ai.models.generateContent({
          model: formState.scriptGenModel || 'gemini-2.5-pro',
          contents: { parts: buildMultimodalPromptParts(prompt, images) },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    scenes: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                scene: { type: Type.NUMBER },
                                description: { type: Type.STRING },
                                voiceover: { type: Type.STRING },
                                voicer: { type: Type.STRING },
                                languageCode: { type: Type.STRING },
                                prompt: {
                                    type: Type.OBJECT,
                                    properties: {
                                        Objective: { type: Type.STRING },
                                        Persona: {
                                          type: Type.OBJECT,
                                          properties: { Role: { type: Type.STRING }, Tone: { type: Type.STRING }, Knowledge_Level: { type: Type.STRING } },
                                          required: ['Role', 'Tone', 'Knowledge_Level'],
                                        },
                                        Task_Instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        Constraints: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        Input_Examples: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { Input: { type: Type.STRING }, Expected_Output: { type: Type.STRING } } } },
                                        Output_Format: {
                                          type: Type.OBJECT,
                                          properties: {
                                            Type: { type: Type.STRING },
                                            Structure: {
                                              type: Type.OBJECT,
                                              properties: {
                                                character_details: { type: Type.STRING },
                                                setting_details: { type: Type.STRING },
                                                key_action: { type: Type.STRING },
                                                camera_direction: { type: Type.STRING },
                                                original_language_dialogue: { type: Type.STRING },
                                              },
                                              required: ['character_details', 'setting_details', 'key_action', 'camera_direction'],
                                            },
                                          },
                                          required: ['Type', 'Structure'],
                                        },
                                    },
                                    required: ['Objective', 'Persona', 'Task_Instructions', 'Constraints', 'Input_Examples', 'Output_Format'],
                                }
                            },
                            required: ['scene', 'description', 'voiceover', 'voicer', 'languageCode', 'prompt']
                        }
                    }
                },
                required: ['scenes']
            },
          },
        });

        return response.text;
    }, logger);
};

export const generateImagePreview = async (scene: Scene, images: ImageDetail[], formState: FormState, logger: Logger): Promise<{ imageUrls: string[], promptText: string }> => {
    try {
        return await executeWithKeyRotation(formState.geminiTokens, async (key) => {
            const ai = new GoogleGenAI({ apiKey: key });
            const p = scene.prompt;
            const structure = p.Output_Format.Structure;
            const visualStyleString = formatVisualStyle(formState.visualStyleDetail);

            // Find the target model to get explicit clothing/hairstyle descriptions
            let targetModel: Model | undefined;
            const modelMatch = (structure.character_details || '').match(/Model (\d+)/i);
            if (modelMatch) {
                const modelIndex = parseInt(modelMatch[1], 10) - 1;
                if (formState.models && formState.models[modelIndex]) {
                    targetModel = formState.models[modelIndex];
                }
            } else if (formState.models.length === 1) {
                // Fallback for single model projects where "Model 1" might not be specified
                targetModel = formState.models[0];
            }

            // Clean character and action details for text-only models like Imagen
            const cleanedCharacterDetails = (structure.character_details || '').replace(/,?\s*strongly resembling the person in reference image 'model-\d+'/i, '');
            const cleanedKeyAction = (structure.key_action || '').replace(/ that looks exactly like the one in reference image 'product-\d+'/i, '');

            if (formState.imageGenModel === 'imagen_4') {
                let mandatoryClothing = 'As described in Subject Description.';
                let mandatoryHairstyle = 'As described in Subject Description.';
                if (targetModel) {
                    const details = parseModelDetails(targetModel);
                    mandatoryClothing = `'${details.clothing}'`;
                    mandatoryHairstyle = `'${details.hairstyle}'`;
                }

                 let apiAspectRatio: string = formState.aspectRatio;
                if (apiAspectRatio === '4:5') {
                    apiAspectRatio = '3:4'; // Map 4:5 to the supported 3:4 for Imagen
                    logger(`Lưu ý: Model Imagen 4 không hỗ trợ tỷ lệ 4:5. Đã chuyển đổi thành 3:4 gần nhất.`);
                }

                const promptText = `
                **Primary Goal:** Create ONE SINGLE, UNIFIED, ultra-realistic, photorealistic preview image for a video scene. The output MUST NOT be a collage, grid, or have multiple frames.

                **--- IMAGE COMPOSITION DETAILS ---**
                - **Subject Description:** ${cleanedCharacterDetails}
                - **MANDATORY Clothing:** ${mandatoryClothing}
                - **MANDATORY Hairstyle:** ${mandatoryHairstyle}
                - **Key Action:** ${cleanedKeyAction}
                - **Setting/Environment:** ${structure.setting_details}
                - **Camera & Shot Type:** ${structure.camera_direction}
                - **Overall Visual Style:** ${visualStyleString}, high detail.

                **--- CRITICAL, NON-NEGOTIABLE RULES ---**
                1.  **SINGLE IMAGE OUTPUT (ABSOLUTE RULE):** The entire output MUST be one single, coherent image. Do not create a collage, grid, multi-panel image, split screen, diptych, or any image with multiple frames. The image must be one unified scene. This is the most important rule.
                2.  **ASPECT RATIO:** The final image's aspect ratio MUST be EXACTLY ${formState.aspectRatio}. No exceptions.
                3.  **CLOTHING & HAIRSTYLE FIDELITY:** The character's clothing and hairstyle MUST PERFECTLY match the **MANDATORY** descriptions provided above.
                4.  **NO TEXT/LOGOS:** The image must be 100% free of any text, letters, words, subtitles, captions, logos, watermarks, or typography.

                **--- NEGATIVE PROMPTS (Strictly Avoid) ---**
                - **Framing:** collage, grid, multiple panels, multi-panel, split screen, diptych, triptych, multiple frames, photo grid, image grid.
                - **Text & Logos:** text, words, letters, logos, watermarks, typography, signatures, labels.
                - **Style:** cartoon, illustration, drawing, sketch, anime, 3d render.
                - **Composition:** multiple people (unless specified in subject).
                `.trim();

                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: promptText,
                    config: {
                        numberOfImages: 1,
                        outputMimeType: 'image/png',
                        aspectRatio: apiAspectRatio as any,
                    },
                });

                if (!response.generatedImages || response.generatedImages.length === 0) {
                    throw new Error("Imagen 4 generation failed, no image was returned.");
                }

                const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
                const imageUrl = `data:image/png;base64,${base64ImageBytes}`;

                return { imageUrls: [imageUrl], promptText };

            } else { // default to 'gemini_flash_image'
                 const promptText = `
                Objective: Generate ONE SINGLE photorealistic, high-quality preview image for a video scene, meticulously following all instructions. The output MUST be a single, unified image.

                **--- SCENE COMPOSITION ---**
                - **Overall Style:** ${visualStyleString}.
                - **Camera & Shot:** ${structure.camera_direction}.
                - **Setting:** ${structure.setting_details}.
                - **Character & Clothing:** ${structure.character_details}.
                - **Key Action:** ${structure.key_action}.

                **--- ABSOLUTE, NON-NEGOTIABLE RULES ---**
                1.  **SINGLE IMAGE OUTPUT (CRITICAL):** The output MUST be ONE single, coherent image. NO collages, grids, split-screens, or multi-panel images are allowed under any circumstances.
                2.  **CHARACTER FIDELITY:** The character's clothing, hairstyle, and gender MUST PERFECTLY and EXACTLY match the description provided in the scene composition. This OVERRIDES ALL other instructions.
                3.  **NO TEXT OR WATERMARKS:** The image MUST be 100% free of any text, letters, words, subtitles, captions, logos, watermarks, or any form of typography.

                **--- NEGATIVE PROMPT (Elements to strictly AVOID) ---**
                - collage, grid, multiple panels, multi-panel, split screen, diptych, triptych, multiple frames.
                - text, words, letters, logos, watermarks, typography, signatures, labels, captions, subtitles.
                - cartoon, illustration, drawing, sketch, anime, 3d render.
                `;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: buildMultimodalPromptParts(promptText, images) },
                    config: {
                        responseModalities: [Modality.IMAGE],
                        imageConfig: {
                            aspectRatio: formState.aspectRatio as any,
                        },
                    },
                });

                const imageUrls: string[] = [];
                // Safely check for response candidates and content before accessing parts
                if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData) {
                            const base64ImageBytes: string = part.inlineData.data;
                            const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                            imageUrls.push(imageUrl);
                        }
                    }
                }

                if (imageUrls.length === 0) {
                    const finishReason = response.candidates?.[0]?.finishReason;
                    let errorMessage = "Gemini Flash Image generation failed, no image was returned in the response parts.";
                    if (finishReason && finishReason !== 'STOP') {
                        errorMessage += ` The process was stopped due to: ${finishReason}. This can happen due to safety filters or other restrictions.`;
                    }
                    throw new Error(errorMessage);
                }


                return { imageUrls, promptText };
            }
        }, logger);
    } catch (err) {
        logger(`Image preview generation failed for scene ${scene.scene}: ${err instanceof Error ? err.message : String(err)}`, true);
        throw err;
    }
};

export const textToSpeechElevenLabs = async (
    payload: { text: string; model_id: string },
    apiKey: string,
    voiceId: string
): Promise<string> => {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const headers = {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        if (response.status === 401) throw new Error("Invalid ElevenLabs API key.");
        if (errorBody?.detail?.message?.includes("is blocked due to unusual activity")) {
             throw new Error('ELEVENLABS_FREE_TIER_BLOCKED');
        }
        if (errorBody?.detail?.message?.includes("quota")) {
            throw new Error('ELEVENLABS_QUOTA_EXCEEDED');
        }
        throw new Error(`ElevenLabs API Error: ${response.statusText} - ${JSON.stringify(errorBody)}`);
    }

    const audioBlob = await response.blob();
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onloadend = () => {
            const base64data = reader.result as string;
            // The result includes the data URL prefix "data:audio/mpeg;base64,", remove it
            resolve(base64data.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
    });
};

export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return res.blob();
};

export const generateAndFetchAllAudioBlobs = async (
    script: EnhancedScene[],
    tokens: string[],
    voiceId: string
): Promise<{ name: string; blob: Blob }[]> => {
    if (!tokens || tokens.length === 0) {
        console.warn("No ElevenLabs API keys provided. Skipping audio generation.");
        return [];
    }

    let currentKeyIndex = 0;
    const audioFiles: { name: string; blob: Blob }[] = [];

    // Use a sequential for...of loop to prevent concurrent requests
    for (const scene of script) {
        const textToSpeak = (scene.voiceover || '').replace(/\[.*?\]/g, ' ').trim();

        if (!textToSpeak) {
            continue; // No audio for this scene, skip to the next one
        }

        let success = false;
        // Try each key until one succeeds for this specific scene's audio
        for (let i = 0; i < tokens.length; i++) {
            const apiKey = tokens[currentKeyIndex];
            try {
                const base64Audio = await textToSpeechElevenLabs(
                    { text: textToSpeak, model_id: 'eleven_v3' },
                    apiKey,
                    voiceId
                );
                const audioSrc = `data:audio/mpeg;base64,${base64Audio}`;
                const blob = await dataUrlToBlob(audioSrc);
                audioFiles.push({ name: `scene_${scene.scene}_audio.mp3`, blob });
                success = true;
                // On success, break the inner loop and proceed to the next scene
                break;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.warn(`ElevenLabs key ...${apiKey.slice(-4)} failed for scene ${scene.scene}: ${errorMessage}. Trying next key.`);
                // Rotate to the next key for the next attempt
                currentKeyIndex = (currentKeyIndex + 1) % tokens.length;
            }
        }

        if (!success) {
            // If all keys failed for this scene after the loop
            console.error(`All ElevenLabs keys failed for scene ${scene.scene}. Skipping audio for this scene.`);
        }
    }

    return audioFiles;
};

export const enhanceVoiceover = async (
    voiceover: string,
    languageCode: string,
    formState: FormState,
    logger: Logger
): Promise<string> => {
    return executeWithKeyRotation(formState.geminiTokens, async (key) => {
        const ai = new GoogleGenAI({ apiKey: key });

        const prompt = `
        Objective: You are an expert voiceover script editor. Your task is to refine the provided voiceover text to make it sound more natural and human for a text-to-speech (TTS) engine. You must also strategically use TTS audio tags to enhance expressiveness.

        Language: The final output MUST be in the language specified by the languageCode (${languageCode}).

        Input Voiceover Text:
        "${voiceover}"

        Task Instructions:
        1. Read the input text and understand its core meaning and emotion.
        2. Rewrite the text for better flow and natural conversation. You can slightly change wording, add pauses, or rephrase sentences, but you MUST preserve the original message.
        3. Critically analyze the placement of existing audio tags (e.g., [cười], [ngừng lại]). Adjust, add, or remove them to create a more realistic and engaging delivery. The goal is to guide the TTS engine effectively.
        4. Ensure the final text is clean and ready for TTS processing.

        Available Audio Tags (Adapt these to the target language):
        \`\`\`json
        {
          "emotion_tags": {"happy": "[vui vẻ]", "excited": "[hào hứng]", "sad": "[buồn bã]", "angry": "[tức giận]", "surprised": "[ngạc nhiên]", "disappointed": "[thất vọng]", "scared": "[sợ hãi]", "confident": "[tự tin]", "nervous": "[lo lắng]", "crying": "[khóc]", "laughs": "[cười]", "sighs": "[thở dài]"},
          "tone_tags": {"whispers": "[thì thầm]", "shouts": "[hét lên]", "sarcastic": "[mỉa mai]", "dramatic_tone": "[giọng kịch tính]", "reflective": "[suy tư]", "gentle_voice": "[giọng nhẹ nhàng]", "serious_tone": "[giọng nghiêm túc]"},
          "style_tags": {"storytelling": "[giọng kể chuyện]", "advertisement": "[giọng quảng cáo]"},
          "timing_tags": {"pause": "[ngừng lại]", "hesitates": "[do dự]", "rushed": "[vội vã]", "slows_down": "[chậm lại]"},
          "action_tags": {"clears_throat": "[hắng giọng]", "gasp": "[thở hổn hển]"}
        }
        \`\`\`

        Constraints:
        - The output MUST ONLY be the refined voiceover text. Do not add any explanations, labels, or markdown formatting like quotes.
        - Preserve the original intent and key information.

        Output:
        Return ONLY the enhanced string.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text.trim().replace(/^"(.*)"$/, '$1'); // Remove potential surrounding quotes
    }, logger);
};

const generateThumbnailText = async (formState: FormState, logger: Logger): Promise<string> => {
    return executeWithKeyRotation(formState.geminiTokens, async (key) => {
        const ai = new GoogleGenAI({ apiKey: key });

        const prompt = `
        You are a Viral Content Strategist specializing in creating high-CTR (Click-Through Rate) YouTube and TikTok thumbnails.
        Your task is to generate ONE single, short, punchy, and curiosity-inducing line of text for a video thumbnail.

        **Video Context:**
        - **Idea:** ${formState.idea}
        - **Content/Features:** ${formState.content}
        - **Language:** The output text MUST be in the following language: ${formState.languageCode}.

        ${formState.thumbnailText ? `**User's Hint/Keywords (Prioritize these):** ${formState.thumbnailText}`: ''}

        **Instructions:**
        1.  The text must be VERY SHORT (ideally 3-7 words).
        2.  It must create strong curiosity, surprise, or highlight a shocking benefit.
        3.  Use strong, emotional, and impactful words.
        4.  The output MUST be in ALL CAPS.
        5.  DO NOT include any quotation marks, labels, or explanations. Just return the raw text.

        **Examples:**
        - BÍ QUYẾT LÀM ĐẸP GÂY SỐC
        - ĐỪNG MUA TRƯỚC KHI XEM
        - KẾT QUẢ BẤT NGỜ
        - AI CŨNG LÀM SAI?

        Now, based on the video context provided, generate the best possible thumbnail text.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        // Clean up response, remove potential quotes
        return response.text.trim().replace(/["']/g, "");

    }, logger);
};

export const generateThumbnail = async (script: Scene[], images: ImageDetail[], formState: FormState, logger: Logger): Promise<string> => {
    logger("Bắt đầu tạo ảnh đại diện (thumbnail)...");

    const baseImageUrl = await executeWithKeyRotation(formState.geminiTokens, async (key) => {
        const ai = new GoogleGenAI({ apiKey: key });
        const visualStyleString = formatVisualStyle(formState.visualStyleDetail);
        const mainCharacterDescription = script[0]?.prompt.Output_Format.Structure.character_details || 'The main character as described in the script.';
        
        const promptText = `
        Objective: Create ONE SINGLE, ultra high-quality, click-worthy, and visually stunning thumbnail image for a video. The thumbnail should be compelling and make people want to click.

        **--- VIDEO DETAILS FOR CONTEXT ---**
        - **Video Idea:** ${formState.idea}
        - **Core Content:** ${formState.content}
        - **Main Character:** ${mainCharacterDescription}
        - **Overall Visual Style:** ${visualStyleString}, photorealistic, dramatic lighting, high detail.

        **--- THUMBNAIL COMPOSITION INSTRUCTIONS ---**
        1.  **Focal Point:** The image MUST have a clear focal point, usually the main character or product. The character should have an engaging facial expression (e.g., surprise, happiness, intrigue).
        2.  **Composition:** Use the rule of thirds. The image should be vibrant, with high contrast to grab attention.
        3.  **Branding:** Do NOT include any logos or brand names.

        **--- CRITICAL, NON-NEGOTIABLE RULES ---**
        1.  **NO TEXT (ABSOLUTE RULE):** The image MUST be 100% free of any text, letters, words, subtitles, captions, logos, watermarks, or any form of typography. The thumbnail must be purely visual. This is the most important rule.
        2.  **SINGLE IMAGE OUTPUT:** The output MUST be one single, coherent image. NO collages, grids, or multi-panel layouts.
        3.  **NO CLICKBAIT IMAGERY:** Avoid generic arrows, circles, or overly exaggerated expressions that look fake. Keep it professional and intriguing.

        **--- NEGATIVE PROMPTS (Strictly Avoid) ---**
        - text, words, letters, logos, watermarks, typography, signatures, labels, captions, subtitles.
        - collage, grid, multiple panels.
        - cartoon, anime, 3d render, sketch, drawing.
        `.trim();

        if (formState.imageGenModel === 'imagen_4') {
             let apiAspectRatio: string = formState.aspectRatio;
            if (apiAspectRatio === '4:5') {
                apiAspectRatio = '3:4';
            }
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: promptText,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/png',
                    aspectRatio: apiAspectRatio as any,
                },
            });

            if (!response.generatedImages || response.generatedImages.length === 0) {
                throw new Error("Imagen 4 generation failed, no thumbnail image was returned.");
            }

            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return `data:image/png;base64,${base64ImageBytes}`;
        } else { // 'gemini_flash_image'
             const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: buildMultimodalPromptParts(promptText, images) },
                config: {
                    responseModalities: [Modality.IMAGE],
                    imageConfig: {
                        aspectRatio: formState.aspectRatio as any,
                    },
                },
            });

            if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        const base64ImageBytes: string = part.inlineData.data;
                        const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                        return imageUrl; // Return the first image found
                    }
                }
            }
            
            const finishReason = response.candidates?.[0]?.finishReason;
            let errorMessage = "Gemini Flash Image generation failed for thumbnail, no image was returned.";
            if (finishReason && finishReason !== 'STOP') {
                 errorMessage += ` The process was stopped due to: ${finishReason}. This can happen due to safety filters or other restrictions.`;
            }
            throw new Error(errorMessage);
        }
    }, logger);
    
    let textToApply = '';

    if (formState.autoGenerateThumbnailText) {
        logger("AI đang sáng tạo chữ cho thumbnail...");
        try {
            textToApply = await generateThumbnailText(formState, logger);
            logger(`AI đã tạo chữ: "${textToApply}"`);
        } catch (err) {
            logger(`Không thể tạo chữ tự động: ${err instanceof Error ? err.message : String(err)}. Sẽ bỏ qua bước thêm chữ.`, true);
        }
    } else if (formState.thumbnailText && formState.thumbnailText.trim() !== '') {
        textToApply = formState.thumbnailText;
    }


    if (textToApply) {
        logger("Đang thêm chữ vào ảnh đại diện...");
        try {
            const finalImageUrl = await addTextToImage(baseImageUrl, textToApply);
            logger("Thêm chữ vào ảnh đại diện thành công.");
            return finalImageUrl;
        } catch (err) {
            logger(`Không thể thêm chữ vào ảnh: ${err instanceof Error ? err.message : String(err)}. Sẽ trả về ảnh gốc.`, true);
            return baseImageUrl; // Fallback to the original image on error
        }
    }

    return baseImageUrl;
};

export const generateSocialPost = async (script: Scene[], formState: FormState, logger: Logger): Promise<SocialPost> => {
    return executeWithKeyRotation(formState.geminiTokens, async (key) => {
        const ai = new GoogleGenAI({ apiKey: key });

        const scriptSummary = script.map(s => `Cảnh ${s.scene}: ${s.description}`).join('\n');
        
        let prompt: string;
        let responseSchema: any;

        if (formState.socialPlatform === 'youtube') {
            prompt = `
            Based on the following video idea, content, and script summary, generate a compelling YouTube post in VIETNAMESE.

            - **Video Idea:** ${formState.idea}
            - **Video Content:** ${formState.content}
            - **Script Summary:**
            ${scriptSummary}

            Generate a suitable title, a detailed description (around 3-4 paragraphs, using emojis appropriately), and a list of relevant tags (comma-separated). You MUST include the tag 'taphoachambau' in the comma-separated list of tags.
            `;
            responseSchema = {
                type: Type.OBJECT,
                properties: {
                    platform: { type: Type.STRING, enum: ['youtube'] },
                    title: { type: Type.STRING, description: "A compelling, SEO-friendly YouTube title in Vietnamese." },
                    description: { type: Type.STRING, description: "A detailed YouTube description in Vietnamese, using paragraphs and emojis." },
                    tags: { type: Type.STRING, description: "A comma-separated list of relevant YouTube tags in Vietnamese, including 'taphoachambau'." },
                },
                required: ['platform', 'title', 'description', 'tags']
            };
        } else { // TikTok
            prompt = `
            Based on the following video idea, content, and script summary, generate 2 different, short, and engaging TikTok post captions in VIETNAMESE.

            - **Video Idea:** ${formState.idea}
            - **Video Content:** ${formState.content}
            - **Script Summary:**
            ${scriptSummary}

            For each version, provide a short, punchy caption and a string of relevant hashtags (starting with #). You MUST include the hashtag #taphoachambau in the list of hashtags for every version.
            `;
            responseSchema = {
                type: Type.OBJECT,
                properties: {
                    platform: { type: Type.STRING, enum: ['tiktok'] },
                    versions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                post: { type: Type.STRING, description: "A short, engaging TikTok caption in Vietnamese." },
                                hashtags: { type: Type.STRING, description: "A space-separated string of relevant TikTok hashtags in Vietnamese (e.g., #xuhuong #review #taphoachambau)." }
                            },
                            required: ['post', 'hashtags']
                        }
                    }
                },
                required: ['platform', 'versions']
            };
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        return parseGeminiResponse(response.text);

    }, logger);
};

export const regenerateScene = async (formState: FormState, script: EnhancedScene[], sceneIndex: number, logger: Logger): Promise<{ description: string, prompt: Prompt }> => { logger(`Regenerating scene ${sceneIndex + 1}`); await new Promise(r => setTimeout(r, 1000)); return { description: "A new regenerated description.", prompt: script[sceneIndex].prompt }; }
export const generateVideoWithGenAI = async (
    scene: EnhancedScene,
    images: ImageDetail[],
    formState: FormState,
    logger: Logger
): Promise<string> => {
    // As per documentation for models requiring user-selected API keys (like Veo),
    // we must create a new GoogleGenAI instance right before the API call to ensure it uses the latest key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const modelMap = {
        'veo_fast': 'veo-3.1-fast-generate-preview',
        'veo_ultra': 'veo-3.1-generate-preview'
    };
    const modelName = modelMap[formState.veoModel] || 'veo-3.1-fast-generate-preview';
    logger(`Chuẩn bị tạo video với model: ${modelName}`);

    const payload: any = {
        model: modelName,
        prompt: scene.videoGenPrompt || scene.description, // Fallback to description
        config: {
            numberOfVideos: 1,
            resolution: modelName === 'veo-3.1-generate-preview' ? '1080p' : '720p',
            aspectRatio: formState.aspectRatio as any,
        }
    };

    if (scene.previewImageUrls && scene.previewImageUrls.length > 0) {
        try {
            const { base64, mimeType } = dataUrlToBase64(scene.previewImageUrls[0]);
            payload.image = {
                imageBytes: base64,
                mimeType: mimeType,
            };
            logger("Đã thêm ảnh xem trước làm ảnh bắt đầu cho video.");
        } catch (e) {
            logger(`Không thể xử lý ảnh xem trước để tạo video: ${(e as Error).message}`, true);
        }
    }

    try {
        logger("Đang gửi yêu cầu tạo video đến API... Quá trình này có thể mất vài phút.");
        let operation = await ai.models.generateVideos(payload);

        let pollCount = 0;
        const pollInterval = 10000; // 10 seconds

        while (!operation.done) {
            pollCount++;
            const waitTime = pollInterval / 1000;
            logger(`Trạng thái: Đang xử lý... (Kiểm tra lần ${pollCount}). Sẽ kiểm tra lại sau ${waitTime} giây.`);
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        logger("Tạo video hoàn tất!");

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("API đã hoàn tất nhưng không trả về link tải video.");
        }

        logger("Đang tải dữ liệu video...");
        // The API key must be appended to the download link for authentication.
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Tải video thất bại (HTTP ${response.status}): ${errorBody}`);
        }

        const videoBlob = await response.blob();
        const videoUrl = URL.createObjectURL(videoBlob);
        logger("Tải video thành công. Đã tạo URL cục bộ.");
        return videoUrl;

    } catch (error) {
        const errorMessage = (error instanceof Error ? error.message : String(error));
        // Handle specific error for API key selection as per docs
        if (errorMessage.includes("Requested entity was not found.")) {
             logger("Lỗi: API key đã chọn không hợp lệ hoặc không có quyền truy cập. Vui lòng chọn lại key API.", true);
             throw new Error("API key đã chọn không hợp lệ. Vui lòng thử lại hoặc chọn một key khác từ Cài đặt API của AI Studio.");
        }
        logger(`Lỗi trong quá trình tạo video: ${errorMessage}`, true);
        throw error; // Re-throw the original error to be caught by the UI
    }
};

export const findProductImageUrls = async (productName: string, storeName: string, keys: string[]): Promise<string[]> => {
    console.log(`Searching for ${productName} from ${storeName} using ${keys.length} keys.`);
    // Mock implementation for demonstration purposes
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    if (productName.toLowerCase().includes('error')) {
        throw new Error("Simulated search error for this product.");
    }
    return [
        `https://via.placeholder.com/150/8f8f8f/ffffff?text=${encodeURIComponent(productName.split(' ')[0])}`,
        `https://via.placeholder.com/150/cccccc/000000?text=${encodeURIComponent(productName.split(' ')[1] || 'Img2')}`
    ];
};

export const generateSrtContent = (script: EnhancedScene[], duration: number): string => {
    let srtContent = '';
    const sceneCount = script.length;
    if (sceneCount === 0) return '';
    
    // Use a more realistic average time per scene if duration is provided, otherwise default.
    const averageTimePerScene = duration > 0 ? duration / sceneCount : 5;

    const formatTime = (totalSeconds: number): string => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const milliseconds = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
    };

    let currentTime = 0;

    script.forEach((scene, index) => {
        const subtitleText = (scene.voiceover || '').replace(/\[.*?\]/g, '').trim();

        if (subtitleText) {
            // Estimate duration based on word count (e.g., 3 words per second)
            // or use average time, whichever is smaller to avoid long overlaps.
            const words = subtitleText.split(/\s+/).length;
            const estimatedDuration = Math.max(2, words / 3); // Min 2 seconds
            const sceneDuration = Math.min(estimatedDuration, averageTimePerScene);

            const startTime = currentTime;
            const endTime = startTime + sceneDuration;

            srtContent += `${index + 1}\n`;
            srtContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
            srtContent += `${subtitleText}\n\n`;
            
            currentTime = endTime;
        } else {
             currentTime += averageTimePerScene;
        }
    });

    return srtContent;
};
export const testGoogleAiApiKey = async (key: string): Promise<void> => { const ai = new GoogleGenAI({apiKey: key}); await ai.models.generateContent({model: 'gemini-2.5-flash', contents: 'test'}); }
export { ElevenLabsUserDetailsType as ElevenLabsUserDetails }
export const testElevenLabsApiKey = async (key: string, voiceId: string): Promise<Omit<ElevenLabsUserDetailsType, 'apiKey'>> => { const userRes = await fetch('https://api.elevenlabs.io/v1/user', { headers: {'xi-api-key': key} }); if (!userRes.ok) throw new Error('Invalid ElevenLabs Key'); const userData = await userRes.json(); const voiceRes = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, { headers: {'xi-api-key': key} }); const voiceData = voiceRes.ok ? await voiceRes.json() : {}; return { voiceName: voiceData.name || 'Unknown', tier: userData.subscription.tier, characterCount: userData.subscription.character_count, characterLimit: userData.subscription.character_limit }; }
export const fetchElevenLabsVoices = async (apiKey: string): Promise<ElevenLabsVoice[]> => {
    const url = 'https://api.elevenlabs.io/v1/voices';
    const headers = { 'xi-api-key': apiKey };
    const response = await fetch(url, { headers });
    if (!response.ok) {
        if (response.status === 401) throw new Error("Invalid ElevenLabs API key.");
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(`ElevenLabs API Error: ${response.statusText} - ${JSON.stringify(errorBody)}`);
    }
    const data = await response.json();
    return data.voices;
};


// --- Batch Processing Functions ---

async function apiFetch(url: string, options: RequestInit, token: string) {
    const res = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    });
    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ message: 'Unknown API error' }));
        throw new Error(`API Error (${res.status}): ${errorBody.error?.message || JSON.stringify(errorBody)}`);
    }
    return res.json();
}

export const testGoogleWorkspaceToken = async (token: string): Promise<void> => { 
    const res = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + token); 
    if (!res.ok) throw new Error('Invalid token'); 
    const data = await res.json();
    if (!data.scope || !data.scope.includes('https://www.googleapis.com/auth/drive') || !data.scope.includes('https://www.googleapis.com/auth/spreadsheets')) {
        throw new Error("Token missing required Drive and/or Sheets scopes.");
    }
}


export const fetchSheetAsRows = async (sheetId: string, token: string): Promise<{rowIndex: number, data: Record<string, any>}[]> => {
    // Step 1: Fetch spreadsheet metadata to get the first sheet's name
    const spreadsheetMetaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`;
    const metaData = await apiFetch(spreadsheetMetaUrl, {}, token);
    
    if (!metaData.sheets || metaData.sheets.length === 0) {
        throw new Error(`Spreadsheet with ID ${sheetId} has no sheets.`);
    }
    const sheetName = metaData.sheets[0].properties.title;

    // Step 2: Use the dynamic sheet name to fetch the values
    const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'${sheetName}'!A:Z`;
    const data = await apiFetch(valuesUrl, {}, token);

    if (!data.values || data.values.length < 1) return [];
    
    const [header, ...rows] = data.values;
    return rows.map((row: string[], index: number) => ({
        rowIndex: index + 2, // 1-based index, plus 1 for header
        data: header.reduce((obj: Record<string, any>, key: string, i: number) => {
            obj[key] = row[i] || '';
            return obj;
        }, {})
    })).filter(r => r.data['Tên dự án'] && r.data['Tên dự án'].trim() !== ''); // Filter out empty rows
};

export const mapRowToFormState = (row: Record<string, any>, defaultState: FormState): FormState => {
    let models: Model[] = defaultState.models;
    const modelJsonString = row['Người mẫu (JSON)'];

    if (modelJsonString && modelJsonString.trim()) {
        try {
            let parsedData = JSON.parse(modelJsonString);

            if (!Array.isArray(parsedData)) {
                if (typeof parsedData === 'object' && parsedData !== null) {
                    parsedData = [parsedData]; // Wrap single object
                } else {
                    throw new Error("Parsed JSON is not an object or array.");
                }
            }

            // Map parsed data to the Model structure
            models = parsedData.map((detailObject: any) => ({
                id: crypto.randomUUID(),
                faceImage: null,
                faceImageUrl: undefined,
                detailsJson: JSON.stringify(detailObject, null, 2),
            }));

        } catch (error) {
            console.error(`Error parsing 'Người mẫu (JSON)' from sheet. Falling back to default models. Error:`, error, `Value was:`, modelJsonString);
            models = defaultState.models; // Fallback on error
        }
    }

    return {
        ...defaultState,
        projectName: row['Tên dự án'] || defaultState.projectName,
        idea: row['Ý tưởng chính'] || defaultState.idea,
        content: row['Nội dung chính'] || defaultState.content,
        duration: parseInt(row['Thời lượng (giây)'], 10) || defaultState.duration,
        numberOfVideos: parseInt(row['Số lượng video'], 10) || defaultState.numberOfVideos,
        aspectRatio: row['Tỷ lệ khung hình'] || defaultState.aspectRatio,
        scriptStyle: row['Phong cách Kịch bản'] || defaultState.scriptStyle,
        veoModel: row['Model Veo'] || defaultState.veoModel,
        settingDescription: row['Mô tả bối cảnh'] || defaultState.settingDescription,
        socialPlatform: row['Nền tảng Social'] || defaultState.socialPlatform,
        languageCode: row['Mã Ngôn ngữ'] || defaultState.languageCode,
        elevenLabsVoiceId: row['ElevenLabs Voice ID'] || defaultState.elevenLabsVoiceId,
        imageGenModel: row['Model Tạo Ảnh'] || defaultState.imageGenModel,
        visualStyleDetail: {
            ...defaultState.visualStyleDetail,
            baseStyle: row['Phong cách Hình ảnh'] || defaultState.visualStyleDetail.baseStyle,
        },
        models: models,
    };
};

export const fetchFilesFromSubfolder = async (rootFolderId: string, subfolderName: string, token: string): Promise<File[]> => {
    const trimmedSubfolderName = subfolderName ? subfolderName.trim() : '';
    if (!trimmedSubfolderName) return [];
    
    // 1. Find subfolder ID
    const folderQuery = encodeURIComponent(`'${rootFolderId}' in parents and name='${trimmedSubfolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const folderUrl = `https://www.googleapis.com/drive/v3/files?q=${folderQuery}&fields=files(id)`;
    const folderData = await apiFetch(folderUrl, {}, token);

    if (!folderData.files || folderData.files.length === 0) {
        const helpfulError = `Không tìm thấy thư mục con '${trimmedSubfolderName}'.
Vui lòng kiểm tra các mục sau:
1. Tên thư mục trong Google Sheet phải CHÍNH XÁC TUYỆT ĐỐI (phân biệt chữ hoa, chữ thường).
2. Thư mục này phải nằm TRỰC TIẾP bên trong thư mục gốc đã cung cấp ID.
3. Tài khoản Google của bạn có quyền xem thư mục này.`;
        throw new Error(helpfulError);
    }
    const subfolderId = folderData.files[0].id;

    // 2. List files in subfolder
    const filesQuery = encodeURIComponent(`'${subfolderId}' in parents and trashed=false`);
    const filesUrl = `https://www.googleapis.com/drive/v3/files?q=${filesQuery}&fields=files(id,name,mimeType)`;
    const filesData = await apiFetch(filesUrl, {}, token);
    if (!filesData.files) return [];

    // 3. Download each file
    const filePromises = filesData.files.map(async (file: any) => {
        const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
        const res = await fetch(downloadUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Failed to download file ${file.name}`);
        const blob = await res.blob();
        return new File([blob], file.name, { type: file.mimeType });
    });

    return Promise.all(filePromises);
};

export const createDriveFolder = async (parentFolderId: string, folderName: string, token: string): Promise<string> => {
    const url = `https://www.googleapis.com/drive/v3/files`;
    const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId]
    };
    const data = await apiFetch(url, { method: 'POST', body: JSON.stringify(metadata) }, token);
    return data.id;
};

export const uploadFileToDrive = async (folderId: string, blob: Blob, fileName: string, token: string): Promise<void> => {
    const metadata = { name: fileName, parents: [folderId] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form
    });
    if (!res.ok) {
         const errorBody = await res.json().catch(() => ({ message: 'Unknown upload error' }));
         throw new Error(`Upload failed (${res.status}): ${errorBody.error?.message || JSON.stringify(errorBody)}`);
    }
};

export const updateSheetRow = async (sheetId: string, rowIndex: number, values: any[][], token: string): Promise<void> => {
    // Step 1: Fetch spreadsheet metadata to get the first sheet's name
    const spreadsheetMetaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`;
    const metaData = await apiFetch(spreadsheetMetaUrl, {}, token);

    if (!metaData.sheets || metaData.sheets.length === 0) {
        throw new Error(`Output spreadsheet with ID ${sheetId} has no sheets.`);
    }
    const sheetName = metaData.sheets[0].properties.title;
    
    // Step 2: Use the dynamic sheet name to construct the range, starting from column Q
    const range = `'${sheetName}'!Q${rowIndex}:S${rowIndex}`; // Update columns Q, R, S (Status, Link, JSON Script)
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`;
    const body = { values };
    await apiFetch(url, { method: 'PUT', body: JSON.stringify(body) }, token);
};