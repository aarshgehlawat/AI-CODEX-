
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ModelName } from '../types';

// Fix: Define the global AIStudio interface to provide type information for the existing window.aistudio property.
// This resolves "identical modifiers" and "same type" errors by satisfying the environment's expectation for the AIStudio type.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}

const StudioPanel: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'image' | 'video' | 'edit'>('image');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkKeyStatus();
  }, []);

  const checkKeyStatus = async () => {
    // The environment provides window.aistudio, we just needed to define the AIStudio interface above.
    const status = await window.aistudio.hasSelectedApiKey();
    setHasKey(status);
  };

  const handleOpenKeySelector = async () => {
    await window.aistudio.openSelectKey();
    // Assume success as per instructions to mitigate race conditions
    setHasKey(true);
    setError(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBaseImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleError = (e: any) => {
    const msg = e.message || String(e);
    console.error("Studio Error:", e);
    
    if (msg.includes("403") || msg.includes("permission") || msg.includes("Requested entity was not found")) {
      setError("PERMISSION_REQUIRED: This model requires a Paid API Key with Billing enabled.");
    } else {
      setError(msg);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: ModelName.PRO_IMAGE,
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio, imageSize } as any }
      });

      if (!response.candidates?.[0]?.content?.parts) throw new Error("Synthesis failed: Empty response");

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setResultUrl(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (e: any) {
      handleError(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const editImage = async () => {
    if (!baseImage || !prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: ModelName.FLASH_IMAGE,
        contents: {
          parts: [
            { inlineData: { data: baseImage.split(',')[1], mimeType: 'image/png' } },
            { text: prompt }
          ]
        }
      });

      if (!response.candidates?.[0]?.content?.parts) throw new Error("Synthesis failed: Empty response");

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setResultUrl(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (e: any) {
      handleError(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateVideo = async () => {
    if (!prompt.trim() && !baseImage) return;
    setIsGenerating(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const payload: any = {
        model: ModelName.VEO,
        prompt: prompt || 'Animate this image',
        config: { resolution: '720p', aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9', numberOfVideos: 1 }
      };
      if (baseImage) {
        payload.image = { imageBytes: baseImage.split(',')[1], mimeType: 'image/png' };
      }

      let operation = await ai.models.generateVideos(payload);
      while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("Video generation completed but no link was provided.");
      
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      setResultUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      handleError(e);
    } finally {
      setIsGenerating(false);
    }
  };

  if (hasKey === false) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-12 text-center">
        <div className="max-w-md space-y-8 bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-2.25-2.25"/></svg>
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-widest text-slate-900">Paid API Link Required</h2>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Studio tools (Veo & Gemini Pro Image) require a Paid API Key from a project with active billing.
            </p>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline inline-block"
            >
              View Billing Documentation ↗
            </a>
          </div>
          <button 
            onClick={handleOpenKeySelector}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg hover:bg-blue-700 transition-all active:scale-95"
          >
            Connect Paid API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <nav className="flex gap-4">
          {(['image', 'video', 'edit'] as const).map(t => (
            <button 
              key={t}
              onClick={() => { setActiveTool(t); setResultUrl(null); setError(null); }}
              className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${activeTool === t ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t === 'image' ? 'Generate' : t === 'video' ? 'Veo Animate' : 'Neural Edit'}
            </button>
          ))}
        </nav>
        <button 
          onClick={handleOpenKeySelector}
          className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Manage Key
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 p-8 border-r border-slate-100 space-y-8 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Creative Prompt</label>
            <textarea 
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={`Describe your ${activeTool}...`}
              className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-sm focus:outline-none focus:border-blue-500/30 transition-all resize-none shadow-inner"
            />
          </div>

          {(activeTool === 'edit' || activeTool === 'video') && (
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reference Image</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all group overflow-hidden relative"
              >
                {baseImage ? (
                  <img src={baseImage} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <svg className="text-slate-300 mb-2 group-hover:scale-110 transition-transform" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Click to Upload</span>
                  </>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-2">
                {['1:1', '16:9', '9:16', '4:3'].map(r => (
                  <button 
                    key={r}
                    onClick={() => setAspectRatio(r)}
                    className={`py-2 rounded-xl text-[9px] font-black border transition-all ${aspectRatio === r ? 'bg-blue-600 text-white border-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {activeTool === 'image' && (
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Precision</label>
                <div className="grid grid-cols-3 gap-2">
                  {['1K', '2K', '4K'].map(s => (
                    <button 
                      key={s}
                      onClick={() => setImageSize(s)}
                      className={`py-2 rounded-xl text-[9px] font-black border transition-all ${imageSize === s ? 'bg-blue-600 text-white border-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={activeTool === 'image' ? generateImage : activeTool === 'video' ? generateVideo : editImage}
            disabled={isGenerating}
            className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-lg ${isGenerating ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {isGenerating ? 'Synthesizing Data...' : 'Execute Synthesis'}
          </button>
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-2">
              <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest text-center">{error}</p>
              {error.includes("PERMISSION") && (
                <button 
                  onClick={handleOpenKeySelector}
                  className="w-full py-2 bg-red-600 text-white text-[9px] font-black uppercase rounded-lg shadow-sm"
                >
                  Switch to Paid API Key
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 bg-slate-50 p-8 flex items-center justify-center">
          <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-200 flex flex-col h-full">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Output Node</span>
              {isGenerating && <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />}
            </div>
            <div className="flex-1 p-8 flex items-center justify-center relative bg-grid">
              {resultUrl ? (
                activeTool === 'video' ? (
                  <video src={resultUrl} controls className="max-w-full max-h-full rounded-2xl shadow-2xl" />
                ) : (
                  <img src={resultUrl} className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" />
                )
              ) : (
                <div className="text-center space-y-4 opacity-10">
                  <svg className="mx-auto" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  <p className="text-xs font-black uppercase tracking-[0.4em]">Awaiting Output</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioPanel;
