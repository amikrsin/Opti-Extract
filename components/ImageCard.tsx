import React from 'react';
import { ScannedImage, OptimizationSuggestion } from '../types';
import { AlertCircle, CheckCircle, Image as ImageIcon, Zap, Maximize2, FileType, Eye } from 'lucide-react';

interface ImageCardProps {
  image: ScannedImage;
  suggestion?: OptimizationSuggestion;
}

export const ImageCard: React.FC<ImageCardProps> = ({ image, suggestion }) => {
  // Determine status color based on if we have suggestion
  const borderColor = suggestion ? 'border-emerald-500/30' : 'border-slate-700';
  const bgColor = 'bg-slate-800';

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} overflow-hidden transition-all hover:shadow-lg hover:shadow-slate-900/50 flex flex-col md:flex-row`}>
      {/* Visual Preview Section */}
      <div className="md:w-48 h-48 md:h-auto bg-slate-900 flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-slate-700 shrink-0 relative group">
        {image.src ? (
          <img 
            src={image.src} 
            alt="Preview" 
            className="max-w-full max-h-full object-contain rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`hidden absolute inset-0 flex flex-col items-center justify-center text-slate-500 ${!image.src ? '!flex' : ''}`}>
          <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
          <span className="text-xs">No Preview</span>
        </div>
      </div>

      {/* Details Section */}
      <div className="p-5 flex-1 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
            <span className="truncate max-w-[200px]" title={image.src}>{image.src}</span>
            <a href={image.src} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
              <Eye size={14} />
            </a>
          </h3>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge label="Width" value={image.originalWidth || 'auto'} icon={<Maximize2 size={12} />} />
            <Badge label="Height" value={image.originalHeight || 'auto'} icon={<Maximize2 size={12} className="rotate-90" />} />
            <Badge label="Alt" value={image.alt || 'MISSING'} warning={!image.alt} />
            {image.className && <Badge label="Class" value={image.className} />}
          </div>
        </div>

        {suggestion && (
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-2 mb-3 text-emerald-400 font-medium">
              <Zap size={16} />
              <span>AI Optimization Analysis</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {suggestion.role}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p className="text-slate-400">Recommended Srcset Widths:</p>
                <div className="flex flex-wrap gap-1">
                  {suggestion.suggestedWidths.map(w => (
                    <span key={w} className="px-2 py-0.5 bg-indigo-900/40 text-indigo-300 rounded border border-indigo-500/20 text-xs">
                      {w}w
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-slate-400">Formats & Loading:</p>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {suggestion.suggestedFormats.map(fmt => (
                       <span key={fmt} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-xs border border-slate-600 uppercase">
                         {fmt}
                       </span>
                    ))}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs border ${suggestion.lazyLoad ? 'bg-emerald-900/20 text-emerald-300 border-emerald-700' : 'bg-orange-900/20 text-orange-300 border-orange-700'}`}>
                    {suggestion.lazyLoad ? 'Lazy' : 'Eager'}
                  </span>
                </div>
              </div>
              
              <div className="md:col-span-2 space-y-1">
                <p className="text-slate-400 text-xs uppercase font-bold">Recommended sizes attribute</p>
                <code className="block bg-black/30 p-2 rounded text-xs text-orange-200 font-mono break-all">
                  {suggestion.sizesAttribute}
                </code>
              </div>

              {suggestion.altTextImprovement && (
                 <div className="md:col-span-2 text-xs text-slate-400 border-t border-slate-800 pt-2 mt-1">
                    <span className="text-yellow-500 font-medium">Alt Tip:</span> {suggestion.altTextImprovement}
                 </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Badge: React.FC<{label: string, value: string, icon?: React.ReactNode, warning?: boolean}> = ({ label, value, icon, warning }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${warning ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-slate-700 text-slate-200 border-slate-600'}`}>
    {icon}
    <span className="opacity-70">{label}:</span>
    <span className="truncate max-w-[120px]">{value}</span>
  </span>
);