
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration, Blob } from '@google/genai';
import { X, Mic, StopCircle, Waves } from 'lucide-react';
import { TaskDraft, TaskPriority } from '../types';

interface VoiceTaskCreatorProps {
  onClose: () => void;
  onDraftCreated: (draft: TaskDraft) => void;
}

const draftTaskTool: FunctionDeclaration = {
  name: "draftTask",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The main title of the task" },
      description: { type: Type.STRING, description: "Detailed description of what needs to be done" },
      priority: { 
          type: Type.STRING, 
          enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
          description: "Priority level of the task"
      },
      dueDate: { type: Type.STRING, description: "The due date in YYYY-MM-DD format" },
      dueTime: { type: Type.STRING, description: "The due time in HH:MM 24-hour format" }
    },
    required: ["title"]
  }
};

const VoiceTaskCreator: React.FC<VoiceTaskCreatorProps> = ({ onClose, onDraftCreated }) => {
  const [status, setStatus] = useState<'connecting' | 'listening' | 'speaking' | 'processing' | 'error'>('connecting');
  const [volume, setVolume] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<{buffer: AudioBuffer, time: number}[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  // --- Audio Utilities ---
  
  const createBlob = (data: Float32Array): Blob => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    
    return {
      data: b64,
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const decodeAudio = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const playAudio = async (base64Data: string) => {
     if (!outputAudioContextRef.current) return;
     const ctx = outputAudioContextRef.current;
     
     const audioData = decodeAudio(base64Data);
     const buffer = await decodeAudioData(audioData, ctx, 24000, 1);
     
     const source = ctx.createBufferSource();
     source.buffer = buffer;
     source.connect(ctx.destination);
     
     // Schedule playback for gapless streaming
     const now = ctx.currentTime;
     const start = Math.max(now, nextStartTimeRef.current);
     source.start(start);
     nextStartTimeRef.current = start + buffer.duration;
  };

  // --- Live API Setup ---

  const connectToGemini = async () => {
    try {
      // Corrected: use process.env.API_KEY directly in the named parameter object
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // 1. Setup Audio Input
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
         if (!sessionRef.current) return;
         
         // Visualizer volume calculation
         const input = e.inputBuffer.getChannelData(0);
         let sum = 0;
         for(let i=0; i<input.length; i++) sum += input[i] * input[i];
         const rms = Math.sqrt(sum / input.length);
         setVolume(Math.min(1, rms * 5)); 

         const blob = createBlob(input);
         // Use the session promise to send inputs and avoid race conditions
         sessionRef.current.then(session => {
            session.sendRealtimeInput({ media: blob });
         });
      };

      source.connect(processor);
      processor.connect(audioCtx.destination); 

      // 2. Setup Audio Output
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // 3. Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            tools: [{ functionDeclarations: [draftTaskTool] }],
            systemInstruction: `You are a helpful assistant for "TeamSync", a task management app. 
            Help the user create a task. Ask for the title, and optionally priority, due date. 
            Today's date is ${new Date().toISOString().split('T')[0]}.
            When you have the title (mandatory) and other optional info, call the 'draftTask' function. 
            Keep your responses concise and conversational.`,
        },
        callbacks: {
            onopen: () => {
                if(isMountedRef.current) setStatus('listening');
            },
            onmessage: async (msg: LiveServerMessage) => {
                if (!isMountedRef.current) return;

                // Handle Model Audio Output
                const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audioData) {
                    setStatus('speaking');
                    await playAudio(audioData);
                }
                
                if (msg.serverContent?.turnComplete) {
                    setStatus('listening');
                }

                // Handle Task Drafting via Tool Call
                const toolCall = msg.toolCall;
                if (toolCall) {
                    const call = toolCall.functionCalls.find(fc => fc.name === 'draftTask');
                    if (call) {
                         const args = call.args as any;
                         const draft: TaskDraft = {
                             title: args.title,
                             description: args.description,
                             priority: args.priority as TaskPriority,
                             dueDate: args.dueDate,
                             dueTime: args.dueTime
                         };
                         
                         onDraftCreated(draft);
                    }
                }
            },
            onclose: () => {
                console.log("Session closed");
            },
            onerror: (err) => {
                console.error("Live API Error", err);
                if(isMountedRef.current) setStatus('error');
            }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (error) {
       console.error("Connection failed", error);
       setStatus('error');
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    connectToGemini();

    return () => {
        isMountedRef.current = false;
        // Clean up all resources on unmount
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (processorRef.current) processorRef.current.disconnect();
        if (audioContextRef.current) audioContextRef.current.close();
        if (outputAudioContextRef.current) outputAudioContextRef.current.close();
        
        if (sessionRef.current) {
            sessionRef.current.then(s => s.close()).catch(() => {});
        }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-6 text-white animate-fade-in">
        <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
        >
            <X size={24} />
        </button>

        <div className="mb-8 relative">
            {status === 'connecting' && <div className="w-24 h-24 rounded-full border-4 border-white/20 border-t-primary animate-spin"></div>}
            
            {status !== 'connecting' && (
                <div className="relative flex items-center justify-center w-32 h-32">
                     <div 
                        className="absolute inset-0 bg-primary/50 rounded-full blur-xl transition-all duration-75"
                        style={{ transform: `scale(${1 + volume * 2})`, opacity: 0.5 + volume }}
                     />
                     <div className="relative bg-gradient-to-br from-primary to-blue-600 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl">
                         {status === 'speaking' ? <Waves size={40} className="animate-pulse" /> : <Mic size={40} />}
                     </div>
                </div>
            )}
        </div>

        <h2 className="text-2xl font-bold mb-2 text-center">
            {status === 'connecting' && "Connecting..."}
            {status === 'listening' && "Listening..."}
            {status === 'speaking' && "Gemini is speaking..."}
            {status === 'error' && "Connection Error"}
        </h2>
        
        <p className="text-gray-300 text-center max-w-xs mb-8">
            {status === 'error' 
                ? "Please check microphone permissions and try again." 
                : "Say something like 'Create a high priority task to check inventory tomorrow'"}
        </p>

        <button 
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-3 bg-red-500/20 text-red-200 border border-red-500/50 rounded-full hover:bg-red-500/30 transition-colors"
        >
            <StopCircle size={20} />
            <span>Cancel Voice Mode</span>
        </button>
    </div>
  );
};

export default VoiceTaskCreator;
