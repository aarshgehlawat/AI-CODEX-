
import React from 'react';

interface TranscriptionFeedProps {
  userText: string;
  aiText: string;
}

const TranscriptionFeed: React.FC<TranscriptionFeedProps> = ({ userText, aiText }) => {
  return (
    <div className="space-y-6">
      {userText && (
        <div className="flex flex-col items-start border-l-2 border-blue-500/30 pl-4 py-1">
          <span className="text-[8px] text-blue-600 uppercase font-black tracking-[0.4em] mb-2">Neural_Input</span>
          <p className="text-slate-700 text-sm font-medium leading-relaxed">
            {userText}
          </p>
        </div>
      )}
      {aiText && (
        <div className="flex flex-col items-start border-l-2 border-cyan-500/30 pl-4 py-1">
          <span className="text-[8px] text-cyan-600 uppercase font-black tracking-[0.4em] mb-2">Kernel_Reply</span>
          <p className="text-slate-500 text-xs italic leading-relaxed">
            {aiText}
          </p>
        </div>
      )}
      {!userText && !aiText && (
        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] leading-relaxed text-center py-10">
          Awaiting Neural Stream...
        </p>
      )}
    </div>
  );
};

export default TranscriptionFeed;
