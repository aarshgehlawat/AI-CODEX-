
import React from 'react';

interface CodeDisplayProps {
  code: string;
  description: string;
  onCopy: () => void;
  isProcessing?: boolean;
}

const CodeDisplay: React.FC<CodeDisplayProps> = ({ code, description, onCopy, isProcessing }) => {
  if (!code && !isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-6 bg-slate-50/50">
        <div className="relative">
          <div className="absolute -inset-4 bg-blue-500/5 blur-2xl rounded-full" />
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-10 relative three-d-icon text-blue-600">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
        </div>
        <div className="text-center space-y-3 px-8">
          <p className="text-xs font-black text-slate-300 uppercase tracking-[0.4em]">Ready for Synthesis</p>
          <p className="text-[11px] max-w-xs text-center font-medium italic text-slate-400 leading-relaxed">
            "Design a professional weather portal with glassmorphism and real-time radar effects."
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden relative bg-white">
      {isProcessing && <div className="scanning-line z-20" />}
      
      <div className="flex items-center justify-between px-8 py-4 bg-slate-50 border-b border-slate-100 z-10">
        <div className="flex items-center space-x-4">
           <div className="flex gap-2">
             <div className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300" />
             <div className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300" />
             <div className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300" />
           </div>
           <div className="flex flex-col ml-4">
             <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.3em]">
               {isProcessing ? 'Kernel Pipeline Active...' : 'Source_Buffer'}
             </span>
             <span className="text-[10px] font-mono text-slate-400 truncate lowercase">
               {description ? description.slice(0, 30) + '...' : 'output.log'}
             </span>
           </div>
        </div>
        
        <button 
          onClick={onCopy}
          className="p-3 bg-white hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-blue-600 border border-slate-200 shadow-sm group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
        </button>
      </div>
      
      <div className={`flex-1 overflow-auto p-10 font-mono text-[13px] leading-relaxed transition-all duration-700 ${isProcessing ? 'opacity-20 blur-sm grayscale' : 'opacity-100'}`}>
        <pre className="text-slate-700 whitespace-pre-wrap">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

export default CodeDisplay;
