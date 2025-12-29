
import React, { useState, useEffect } from 'react';

interface PreviewFrameProps {
  code: string;
}

const PreviewFrame: React.FC<PreviewFrameProps> = ({ code }) => {
  const [debouncedCode, setDebouncedCode] = useState(code);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (code === debouncedCode) return;

    setIsUpdating(true);
    const handler = setTimeout(() => {
      setDebouncedCode(code);
      setIsUpdating(false);
    }, 600); // 600ms debounce for smoother UI

    return () => clearTimeout(handler);
  }, [code, debouncedCode]);

  // Determine if the code is likely HTML/React/Tailwind-based
  const isRenderable = 
    code.toLowerCase().includes('<!doctype') || 
    code.toLowerCase().includes('<html') || 
    code.toLowerCase().includes('<div') ||
    code.toLowerCase().includes('<svg') ||
    code.toLowerCase().includes('class=') ||
    code.toLowerCase().includes('className=');

  if (!isRenderable && !debouncedCode) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
            <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
          </svg>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Awaiting Renderable Logic</p>
      </div>
    );
  }

  // Inject Tailwind and basic styling into the sandbox
  const srcDoc = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { 
            font-family: 'Plus Jakarta Sans', sans-serif;
            margin: 0;
            background: transparent;
            color: #0f172a;
          }
          /* Custom scrollbar for sandbox */
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        </style>
      </head>
      <body>
        ${debouncedCode}
      </body>
    </html>
  `;

  return (
    <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm relative flex flex-col">
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isUpdating ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
            {isUpdating ? 'Kernel Syncing...' : 'Live Output'}
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-200" />
          <div className="w-2 h-2 rounded-full bg-slate-200" />
          <div className="w-2 h-2 rounded-full bg-slate-200" />
        </div>
      </div>
      
      <div className="flex-1 relative bg-white">
        <iframe
          title="Neural Render Sandbox"
          srcDoc={srcDoc}
          className={`w-full h-full border-none transition-opacity duration-500 ${isUpdating ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}`}
          sandbox="allow-scripts"
        />
        
        {isUpdating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200 shadow-xl flex items-center gap-2">
              <svg className="animate-spin h-3 w-3 text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Refreshing View</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewFrame;
