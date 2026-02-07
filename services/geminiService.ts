import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type, GenerateContentResponse } from '@google/genai';
import {
  GEMINI_LIVE_MODEL,
  GEMINI_TEXT_MODEL,
  INPUT_AUDIO_SAMPLE_RATE,
  OUTPUT_AUDIO_SAMPLE_RATE,
  AUDIO_NUM_CHANNELS
} from '../constants';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';

// Define a local interface for the Blob structure expected by the Gemini Live API's media part.
// This is done because 'Blob' is not directly exported as a named member from '@google/genai'
// for direct import in some environments, leading to a SyntaxError.
interface GeminiMediaBlob {
  data: string; // base64 encoded string
  mimeType: string; // IANA standard MIME type
}

// Audio context for playing AI responses
let outputAudioContext: AudioContext | null = null;
let nextStartTime = 0; // Tracks the end of the audio playback queue
const playingSources = new Set<AudioBufferSourceNode>(); // Keep track of active audio sources

// Function to get a new Gemini API instance
const getGeminiClient = (): GoogleGenAI => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not set. Please select or configure your API key.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const startLiveConversation = async (
  onAiMessage: (text: string, audioUrl?: string) => void,
  onTranscription: (type: 'user' | 'ai', text: string) => void,
  onFunctionCall: (name: string, args: Record<string, unknown>, id: string) => Promise<string>,
  onError: (error: string) => void,
  onOpen: () => void,
  onClose: () => void,
  onInterrupt: () => void,
): Promise<{ session: any; stop: () => void }> => {
  let session: any;
  let mediaRecorder: MediaRecorder | null = null;
  let audioStream: MediaStream | null = null;
  let scriptProcessor: ScriptProcessorNode | null = null;
  let inputAudioContext: AudioContext | null = null;
  let inputSource: MediaStreamAudioSourceNode | null = null;

  let currentInputTranscription = '';
  let currentOutputTranscription = '';

  const ai = getGeminiClient();

  // Fix: Converted to a regular function and moved up for hoisting,
  // resolving 'used before declaration' error in onerror/onclose callbacks.
  function stopConversation() {
    if (session) {
      session.close();
      session = null;
    }
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      audioStream = null;
    }
    if (scriptProcessor) {
      scriptProcessor.disconnect();
      scriptProcessor.onaudioprocess = null;
      scriptProcessor = null;
    }
    if (inputSource) {
      inputSource.disconnect();
      inputSource = null;
    }
    if (inputAudioContext) {
      inputAudioContext.close();
      inputAudioContext = null;
    }
    // Stop all playing AI audio
    for (const source of playingSources.values()) {
      source.stop();
    }
    playingSources.clear();
    nextStartTime = 0;
    console.log('Live conversation stopped.');
  };

  const functionDeclarations: FunctionDeclaration[] = [
    {
      name: 'setReminder',
      parameters: {
        type: Type.OBJECT,
        description: 'Sets a reminder for the user.',
        properties: {
          time: { type: Type.STRING, description: 'The time for the reminder (e.g., "8:00 AM", "in 30 minutes").' },
          message: { type: Type.STRING, description: 'The reminder message.' },
          isMedication: { type: Type.BOOLEAN, description: 'True if it is a medication reminder, false otherwise.' },
        },
        required: ['time', 'message', 'isMedication'],
      },
    },
    {
      name: 'getNewsHeadline',
      parameters: {
        type: Type.OBJECT,
        description: 'Fetches a news headline on a specific topic.',
        properties: {
          topic: { type: Type.STRING, description: 'The topic for which to get a news headline.' },
        },
        required: ['topic'],
      },
    },
    {
      name: 'playMusic',
      parameters: {
        type: Type.OBJECT,
        description: 'Plays music based on genre or artist.',
        properties: {
          query: { type: Type.STRING, description: 'The genre or artist to play music from.' },
        },
        required: ['query'],
      },
    },
    {
      name: 'callFamilyMember',
      parameters: {
        type: Type.OBJECT,
        description: 'Initiates a call to a family member.',
        properties: {
          name: { type: Type.STRING, description: 'The name of the family member to call.' },
        },
        required: ['name'],
      },
    },
  ];

  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Fix: Replaced window.webkitAudioContext with window.AudioContext
    inputAudioContext = new (window.AudioContext || window.AudioContext)({ sampleRate: INPUT_AUDIO_SAMPLE_RATE });
    inputSource = inputAudioContext.createMediaStreamSource(audioStream);
    scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);

    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
      const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
      const pcmBlob = createBlob(inputData);
      session?.sendRealtimeInput({ media: pcmBlob });
    };

    inputSource.connect(scriptProcessor);
    scriptProcessor.connect(inputAudioContext.destination);

    const sessionPromise = ai.live.connect({
      model: GEMINI_LIVE_MODEL,
      callbacks: {
        onopen: () => {
          onOpen();
        },
        onmessage: async (message: LiveServerMessage) => {
          // Handle model's audio output
          const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64EncodedAudioString) {
            if (!outputAudioContext) {
              // Fix: Replaced window.webkitAudioContext with window.AudioContext
              outputAudioContext = new (window.AudioContext || window.AudioContext)({ sampleRate: OUTPUT_AUDIO_SAMPLE_RATE });
            }
            nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);

            try {
              const audioBuffer = await decodeAudioData(
                decode(base64EncodedAudioString),
                outputAudioContext,
                OUTPUT_AUDIO_SAMPLE_RATE,
                AUDIO_NUM_CHANNELS,
              );
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);
              source.addEventListener('ended', () => {
                playingSources.delete(source);
              });

              source.start(nextStartTime);
              nextStartTime = nextStartTime + audioBuffer.duration;
              playingSources.add(source);

              // For display purposes, you might want to create a blob URL
              // Note: This is a simplified approach, actual streaming requires more sophisticated handling
              const audioBlob = new globalThis.Blob([decode(base64EncodedAudioString)], { type: 'audio/pcm' });
              const audioUrl = URL.createObjectURL(audioBlob);
              onAiMessage(message.serverContent?.outputTranscription?.text || '', audioUrl);

            } catch (audioDecodeError) {
              console.error('Error decoding audio data:', audioDecodeError);
              onError('Error playing AI response audio.');
            }
          }

          // Handle interruptions
          const interrupted = message.serverContent?.interrupted;
          if (interrupted) {
            for (const source of playingSources.values()) {
              source.stop();
              playingSources.delete(source);
            }
            nextStartTime = 0;
            onInterrupt();
          }

          // Handle transcriptions
          if (message.serverContent?.outputTranscription) {
            currentOutputTranscription += message.serverContent.outputTranscription.text;
          } else if (message.serverContent?.inputTranscription) {
            currentInputTranscription += message.serverContent.inputTranscription.text;
          }

          // Handle turn completion for transcriptions
          if (message.serverContent?.turnComplete) {
            if (currentInputTranscription) {
              onTranscription('user', currentInputTranscription);
              currentInputTranscription = '';
            }
            if (currentOutputTranscription) {
              onTranscription('ai', currentOutputTranscription);
              currentOutputTranscription = '';
            }
          }

          // Handle function calls
          if (message.toolCall && message.toolCall.functionCalls) {
            for (const fc of message.toolCall.functionCalls) {
              const result = await onFunctionCall(fc.name, fc.args, fc.id);
              session?.sendToolResponse({
                functionResponses: {
                  id: fc.id,
                  name: fc.name,
                  response: { result: result },
                },
              });
            }
          }
        },
        onerror: (e: Event | ErrorEvent) => {
          console.error('Live session error:', e);
          const errorMessage = e instanceof ErrorEvent ? e.message : 'An unknown error occurred during the live session.';
          onError(errorMessage);
          stopConversation(); // Attempt to stop on error
        },
        onclose: (e: CloseEvent) => {
          console.debug('Live session closed:', e);
          onClose();
          stopConversation(); // Clean up on close
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }, // Zephyr is a common natural voice
        },
        systemInstruction: `You are an AI companion for elderly individuals. Your goal is to provide empathetic companionship, assist with daily reminders, offer entertainment, and facilitate connections with family. Speak clearly and at a moderate pace. Prioritize ease of use and emotional support. Be concise and helpful. You can set reminders, give news headlines, play music, or help call family members.`,
        inputAudioTranscription: {}, // Enable transcription for user input audio
        outputAudioTranscription: {}, // Enable transcription for model output audio
        tools: [{ functionDeclarations: functionDeclarations }],
      },
    });

    session = await sessionPromise;
    console.log('Gemini Live session started.');

  } catch (error) {
    console.error('Failed to start live conversation:', error);
    onError(`Failed to start voice chat: ${error instanceof Error ? error.message : String(error)}`);
    stopConversation(); // Clean up if initial setup fails
  }

  return { session, stop: stopConversation };
};

// Use the locally defined GeminiMediaBlob interface
function createBlob(data: Float32Array): GeminiMediaBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768; // Convert float to 16-bit integer
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: `audio/pcm;rate=${INPUT_AUDIO_SAMPLE_RATE}`,
  };
}

export const generateTextResponse = async (prompt: string): Promise<string> => {
  try {
    const ai = getGeminiClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: 'You are a helpful and friendly AI assistant for elderly individuals. Respond concisely and clearly.',
      },
    });
    return response.text || 'I could not generate a response.';
  } catch (error) {
    console.error('Error generating text response:', error);
    if (error instanceof Error && error.message.includes("403 Requested entity was not found.")) {
      throw new Error("API Key issue: Please ensure your selected API key is correct and has billing enabled.");
    }
    throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const generateStory = async (topic: string = 'a short, comforting story'): Promise<string> => {
  try {
    const ai = getGeminiClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: `Tell me a ${topic} for an elderly person. Keep it warm, positive, and easy to understand. Max 150 words.`,
      config: {
        systemInstruction: 'You are a compassionate storyteller for seniors. Your stories should evoke feelings of peace and happiness.',
        temperature: 0.8,
        maxOutputTokens: 200, // Sufficient tokens for a short story
        thinkingConfig: { thinkingBudget: 50 },
      },
    });
    return response.text || 'I apologize, I could not come up to a story right now.';
  } catch (error) {
    console.error('Error generating story:', error);
    if (error instanceof Error && error.message.includes("403 Requested entity was not found.")) {
      throw new Error("API Key issue: Please ensure your selected API key is correct and has billing enabled.");
    }
    throw new Error(`Failed to generate story: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const generateFunFact = async (): Promise<string> => {
  try {
    const ai = getGeminiClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: 'Tell me a gentle and interesting fun fact suitable for an elderly person.',
      config: {
        systemInstruction: 'You are an AI providing lighthearted and easy-to-digest information. Keep facts positive and simple.',
        temperature: 0.7,
        maxOutputTokens: 100,
        thinkingConfig: { thinkingBudget: 30 },
      },
    });
    return response.text || 'I\'m sorry, I couldn\'t find a fun fact at the moment.';
  } catch (error) {
    console.error('Error generating fun fact:', error);
    if (error instanceof Error && error.message.includes("403 Requested entity was not found.")) {
      throw new Error("API Key issue: Please ensure your selected API key is correct and has billing enabled.");
    }
    throw new Error(`Failed to generate fun fact: ${error instanceof Error ? error.message : String(error)}`);
  }
};