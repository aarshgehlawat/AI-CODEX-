
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration, GenerateContentResponse } from '@google/genai';
import VoiceIndicator from './components/VoiceIndicator';
import CodeDisplay from './components/CodeDisplay';
import PreviewFrame from './components/PreviewFrame';
import TranscriptionFeed from './components/TranscriptionFeed';
import AssistantPanel from './components/AssistantPanel';
import StudioPanel from './components/StudioPanel';
import { AppState, ModelName, ChatMessage, GroundingLink } from './types';
import { decode, decodeAudioData, createBlob } from './utils/audioHelpers';

const generateCodeFunction: FunctionDeclaration = {
  name: 'generate_code',
  parameters: {
    type: Type.OBJECT,
    description: 'Generates optimized code based on human requirements.',
    properties: {
      description: {
        type: Type.STRING,
        description: 'Technical spec of the code to write.',
      },
      language: {
        type: Type.STRING,
        description: 'Target language (Python, JavaScript, C++, etc).',
      }
    },
    required: ['description', 'language'],
  },
};

const App: React.FC = () => {
  const [targetLang, setTargetLang] = useState<string>('javascript');
  const [state, setState] = useState<AppState & { liveUserText: string, liveAiText: string }>({
    isListening: false,
    isProcessing: false,
    currentCode: '',
    currentDescription: '',
    history: [],
    error: null,
    liveUserText: '',
    liveAiText: '',
    view: 'code',
    chatHistory: [],
    selectedImage: null,
    useThinking: false,
    useGrounding: 'none'
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const outAudioContextRef = useRef<AudioContext | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const handleMessage = async (message: LiveServerMessage) => {
    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (audioData && outAudioContextRef.current) {
      const ctx = outAudioContextRef.current;
      nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
      const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += buffer.duration;
      sourcesRef.current.add(source);
    }

    if (message.serverContent?.inputTranscription) {
      setState(p => ({ ...p, liveUserText: message.serverContent?.inputTranscription?.text || '' }));
    }
    if (message.serverContent?.outputTranscription) {
      setState(p => ({ ...p, liveAiText: message.serverContent?.outputTranscription?.text || '' }));
    }

    if (message.toolCall) {
      for (const fc of message.toolCall.functionCalls) {
        if (fc.name === 'generate_code') {
          const { description, language } = fc.args as { description: string; language: string };
          setState(prev => ({ ...prev, isProcessing: true, currentDescription: description }));
          
          try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
              model: ModelName.PRO,
              config: { thinkingConfig: { thinkingBudget: 4000 } },
              contents: `Act as a Master Developer built by aarsh. Generate optimized code for: ${description}. Target Language: ${language}. Only return raw code.`,
            });
            
            const code = response.text || '// Synthesis failed';
            const newSnippet = { id: Date.now().toString(), language, code, description, timestamp: Date.now() };

            setState(prev => ({
              ...prev,
              currentCode: code,
              isProcessing: false,
              history: [newSnippet, ...prev.history].slice(0, 15),
              view: 'code'
            }));

            if (sessionPromiseRef.current) {
              const session = await sessionPromiseRef.current;
              session.sendToolResponse({
                functionResponses: [{ id: fc.id, name: fc.name, response: { result: "Compiled." } }]
              });
            }
          } catch (err) {
            setState(p => ({ ...p, isProcessing: false, error: 'Kernel overload' }));
          }
        }
      }
    }
  };

  const startSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const inCtx = new AudioContext({ sampleRate: 16000 });
      const outCtx = new AudioContext({ sampleRate: 24000 });
      await inCtx.resume();
      await outCtx.resume();
      audioContextRef.current = inCtx;
      outAudioContextRef.current = outCtx;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: ModelName.LIVE,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          systemInstruction: `You are AI Codex, engineered by aarsh. Act as a Voice IDE. Be concise.`,
          tools: [{ functionDeclarations: [generateCodeFunction] }]
        },
        callbacks: {
          onopen: () => {
            const source = inCtx.createMediaStreamSource(stream);
            const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              sessionPromise.then(s => s.sendRealtimeInput({ media: createBlob(e.inputBuffer.getChannelData(0)) }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);
            scriptProcessorRef.current = scriptProcessor;
          },
          onmessage: handleMessage,
          onclose: () => setState(p => ({ ...p, isListening: false }))
        }
      });
      sessionPromiseRef.current = sessionPromise;
      setState(p => ({ ...p, isListening: true, error: null }));
    } catch (e) {
      setState(p => ({ ...p, error: 'Microphone permission denied' }));
    }
  };

  const stopSession = () => {
    scriptProcessorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close();
    outAudioContextRef.current?.close();
    setState(p => ({ ...p, isListening: false }));
  };

  const handleSendMessage = async (text: string, imageData?: string) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, image: imageData, timestamp: Date.now() };
    setState(prev => ({ ...prev, chatHistory: [...prev.chatHistory, userMsg], isProcessing: true }));

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let model = state.useThinking ? ModelName.PRO : ModelName.FLASH;
      let config: any = {
        systemInstruction: "You are Assistant Codex, engineered by aarsh. Provide expert coding and general assistance.",
      };

      if (state.useThinking) {
        config.thinkingConfig = { thinkingBudget: 32768 };
      }

      if (state.useGrounding === 'search') {
        model = ModelName.FLASH;
        config.tools = [{ googleSearch: {} }];
      } else if (state.useGrounding === 'maps') {
        model = ModelName.MAPS_BASE;
        config.tools = [{ googleMaps: {} }];
        
        // Try to get user location for maps
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
          config.toolConfig = {
            retrievalConfig: {
              latLng: { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
            }
          };
        } catch (e) { /* silent fail */ }
      }

      const contents: any[] = [];
      if (imageData) {
        contents.push({
          parts: [
            { inlineData: { data: imageData.split(',')[1], mimeType: 'image/png' } },
            { text }
          ]
        });
      } else {
        contents.push(text);
      }

      const response = await ai.models.generateContent({
        model,
        contents,
        config
      });

      const assistantId = Date.now().toString();
      const groundingLinks: GroundingLink[] = [];
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web) groundingLinks.push({ uri: chunk.web.uri, title: chunk.web.title });
          if (chunk.maps) groundingLinks.push({ uri: chunk.maps.uri, title: chunk.maps.title });
        });
      }

      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        text: response.text || "No response generated.",
        timestamp: Date.now(),
        groundingLinks: groundingLinks.length > 0 ? groundingLinks : undefined,
        isThinking: state.useThinking
      };

      setState(prev => ({ 
        ...prev, 
        chatHistory: [...prev.chatHistory, assistantMsg],
        isProcessing: false 
      }));

    } catch (err) {
      console.error(err);
      setState(p => ({ ...p, isProcessing: false, error: 'Neural link failed' }));
    }
  };

  const speakText = async (text: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: ModelName.TTS,
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioData) {
        const ctx = new AudioContext({ sampleRate: 24000 });
        const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
      }
    } catch (err) {
      console.error('Speech synthesis error');
    }
  };

  return (
    <div className="h-screen flex flex-col selection:bg-blue-100 relative overflow-hidden">
      <header className="px-8 py-4 flex items-center justify-between glass z-50">
        <div className="flex items-center space-x-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-xl blur opacity-20 group-hover:opacity-100 transition duration-1000"></div>
            <div className="relative w-14 h-14 bg-white rounded-xl flex items-center justify-center font-bold text-blue-600 border border-slate-200 text-2xl shadow-sm three-d-icon">
              AC
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900">
              AI CODEX <span className="text-blue-600">ULTRA</span>
            </h1>
            <p className="text-[10px] tracking-[0.4em] font-bold text-slate-400 uppercase leading-none mt-1">
              ENGINEERED BY <span className="text-blue-500">AARSH</span>
            </p>
          </div>
        </div>

        <nav className="flex items-center bg-slate-100 rounded-2xl border border-slate-200 p-1 shadow-sm">
          {['code', 'preview', 'assistant', 'studio'].map((v) => (
            <button 
              key={v}
              onClick={() => setState(p => ({ ...p, view: v as any }))}
              className={`px-8 py-2 rounded-xl text-xs font-black tracking-widest transition-all uppercase ${state.view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {v}
            </button>
          ))}
        </nav>

        <div className="flex flex-col items-end">
          <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">System Health</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${state.isListening ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-300'}`} />
            <span className={`text-[11px] font-bold ${state.isListening ? 'text-emerald-600' : 'text-slate-400'}`}>
              {state.isListening ? 'LIVE_CORE_ACTIVE' : 'IDLE_MODE'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        <aside className="w-80 flex flex-col gap-6">
          <div className="glass rounded-[2rem] p-8 flex flex-col items-center justify-center space-y-8 relative overflow-hidden group border border-slate-200 shadow-sm">
            <VoiceIndicator isActive={state.isListening} isProcessing={state.isProcessing} />
            
            <div className="w-full space-y-4">
               <div className="grid grid-cols-4 gap-2 mb-2">
                  {['js', 'py', 'c++', 'html'].map(l => (
                    <button 
                      key={l}
                      onClick={() => setTargetLang(l)}
                      className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${targetLang === l ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400'}`}
                    >
                      {l}
                    </button>
                  ))}
               </div>
               
               <button
                onClick={state.isListening ? stopSession : startSession}
                className={`w-full group relative flex items-center justify-center space-x-3 py-5 rounded-[1.2rem] font-black transition-all duration-500 overflow-hidden ${
                  state.isListening 
                    ? 'bg-red-50 text-red-600 border border-red-200 shadow-sm' 
                    : 'bg-blue-600 text-white shadow-lg hover:bg-blue-700'
                }`}
              >
                <span className="relative z-10 uppercase tracking-[0.2em] text-xs">
                  {state.isListening ? 'Stop Live Feed' : 'Launch Live API'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex-1 glass rounded-[2rem] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Assistant Config</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Grounding Engine</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['none', 'search', 'maps'] as const).map(g => (
                    <button 
                      key={g}
                      onClick={() => setState(p => ({ ...p, useGrounding: g }))}
                      className={`py-2 rounded-lg text-[8px] font-black uppercase border transition-all ${state.useGrounding === g ? 'bg-blue-600 text-white border-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Processing Mode</label>
                <button 
                  onClick={() => setState(p => ({ ...p, useThinking: !p.useThinking }))}
                  className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${state.useThinking ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-400'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${state.useThinking ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
                  Thinking Mode
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100">
                 <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Recent Builds</h4>
                 <div className="space-y-2">
                   {state.history.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setState(prev => ({ ...prev, currentCode: item.code, currentDescription: item.description, view: 'code' }))}
                      className="w-full text-left p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
                    >
                      <p className="text-[10px] text-slate-500 line-clamp-1 italic">{item.description}</p>
                    </button>
                  ))}
                 </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex-1 flex flex-col gap-6">
          <div className="flex-1 flex gap-6 overflow-hidden">
            {state.view !== 'studio' && (
              <div className="w-1/4 glass rounded-[2rem] flex flex-col overflow-hidden border border-slate-200 relative">
                 <div className="px-6 py-3 border-b border-slate-100 bg-blue-50/20 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-600">Neural Stream</span>
                 </div>
                 <div className="flex-1 overflow-y-auto p-6">
                    <TranscriptionFeed userText={state.liveUserText} aiText={state.liveAiText} />
                 </div>
              </div>
            )}

            <div className="flex-1 glass rounded-[2rem] flex flex-col overflow-hidden border border-slate-200 shadow-sm relative">
              <div className="h-full relative z-10 overflow-hidden">
                {state.view === 'code' ? (
                  <CodeDisplay 
                    code={state.currentCode} 
                    description={state.currentDescription} 
                    onCopy={() => navigator.clipboard.writeText(state.currentCode)} 
                    isProcessing={state.isProcessing}
                  />
                ) : state.view === 'preview' ? (
                  <div className="p-8 h-full bg-slate-50">
                    <PreviewFrame code={state.currentCode} />
                  </div>
                ) : state.view === 'studio' ? (
                  <StudioPanel />
                ) : (
                  <AssistantPanel 
                    messages={state.chatHistory} 
                    onSendMessage={handleSendMessage} 
                    onSpeak={speakText}
                    isProcessing={state.isProcessing}
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-8 py-3 glass border-t border-slate-200 flex items-center justify-between text-[9px] uppercase tracking-[0.4em] font-black text-slate-400">
        <div className="flex items-center gap-6">
          <span>CODEX_ULTRA_V4.0</span>
          <span>GROUNDING: {state.useGrounding.toUpperCase()}</span>
          <span>THINKING: {state.useThinking ? 'MAX_CAPACITY' : 'STANDARD'}</span>
        </div>
        <div className="text-blue-500/40">
          DESIGNED BY AARSH // MULTIMODAL CORE ACTIVE
        </div>
      </footer>
    </div>
  );
};

export default App;
