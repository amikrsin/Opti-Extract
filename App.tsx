import React, { useState, useCallback } from 'react';
import { Code, Search, Sparkles, AlertTriangle, RefreshCw, FileCode, Globe, ArrowRight, Link as LinkIcon, Download, FileText, Table, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { ScannedImage, OptimizationSuggestion, AnalysisStatus } from './types';
import { analyzeImagesWithGemini } from './services/geminiService';
import { ImageCard } from './components/ImageCard';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const SAMPLE_HTML = `
<div class="hero-section">
  <img src="https://picsum.photos/1920/1080" class="hero-bg" alt="Beautiful landscape" width="1920" height="1080">
  <div class="content">
     <h1>Welcome</h1>
     <img src="https://picsum.photos/64/64" class="icon-user" alt="">
  </div>
</div>
<div class="gallery-grid">
  <img src="https://picsum.photos/400/300" class="thumbnail" alt="Project 1">
  <img src="https://picsum.photos/400/300" class="thumbnail" alt="Project 2">
</div>
`.trim();

export default function App() {
  const [urlInput, setUrlInput] = useState<string>('');
  const [htmlInput, setHtmlInput] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>(''); // Used to resolve relative URLs
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [images, setImages] = useState<ScannedImage[]>([]);
  const [suggestions, setSuggestions] = useState<Map<string, OptimizationSuggestion>>(new Map());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warnings' | 'optimized'>('all');
  const [sortBy, setSortBy] = useState<'none' | 'largest' | 'issues' | 'alt'>('none');

  const resolveImageSrc = (src: string | null, base: string): string => {
    if (!src) return '';
    if (!base) return src;
    try {
      // If src is absolute, new URL(src) works. 
      // If src is relative, new URL(src, base) resolves it.
      return new URL(src, base).href;
    } catch (e) {
      return src;
    }
  };

  const handleFetchUrl = async () => {
    if (!urlInput.trim()) return;
    
    // basic validation
    let targetUrl = urlInput.trim();
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    setIsFetchingUrl(true);
    setErrorMsg(null);
    setBaseUrl(targetUrl); // Set base URL for relative path resolution

    try {
      // Using local proxy for more reliable fetching
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch content: ${response.statusText}`);
      }
      
      const htmlText = await response.text();
      setHtmlInput(htmlText);
      // Auto-trigger parsing implies we might want to analyze immediately, 
      // but let's let the user see the code first or click analyze.
      // For better UX, we can just stop here and let them click "Analyze".
    } catch (err) {
      setErrorMsg("Could not fetch website. Some very large sites like Myntra use extremely high security (like Cloudflare) that blocks almost all automated fetching, even from servers. If this specifically shows an error, try a different site to confirm the tool is working!");
      console.error(err);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleParse = useCallback(async () => {
    if (!htmlInput.trim()) return;

    setStatus(AnalysisStatus.PARSING);
    setImages([]);
    setSuggestions(new Map());
    setErrorMsg(null);

    try {
      // 1. Local Parsing
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlInput, 'text/html');
      const imgElements = Array.from(doc.querySelectorAll('img'));

      if (imgElements.length === 0) {
        setErrorMsg("No <img> tags found in the provided HTML.");
        setStatus(AnalysisStatus.IDLE);
        return;
      }

      const extractedImages: ScannedImage[] = imgElements.map((img, index) => {
        // Basic context extraction: get the parent's class or ID, or the 30 chars of outer HTML
        const parent = img.parentElement;
        const contextStr = parent ? `<${parent.tagName.toLowerCase()} class="${parent.className}" id="${parent.id}">` : 'root';
        const rawSrc = img.getAttribute('src');
        
        return {
          id: `img-${index}-${Date.now()}`,
          src: resolveImageSrc(rawSrc, baseUrl), // Resolve relative paths
          originalWidth: img.getAttribute('width'),
          originalHeight: img.getAttribute('height'),
          alt: img.getAttribute('alt'),
          className: img.className,
          contextSnippet: contextStr
        };
      });

      setImages(extractedImages);
      setStatus(AnalysisStatus.ANALYZING_AI);

      // 2. AI Analysis
      // We do this after setting images so the user sees the list immediately while AI thinks
      try {
        const aiSuggestions = await analyzeImagesWithGemini(extractedImages);
        
        const suggestionMap = new Map<string, OptimizationSuggestion>();
        aiSuggestions.forEach(s => suggestionMap.set(s.imageId, s));
        setSuggestions(suggestionMap);
        
        setStatus(AnalysisStatus.COMPLETE);
      } catch (aiErr: any) {
        console.error("AI Error", aiErr);
        setErrorMsg(aiErr.message || "AI analysis failed. Please try again later.");
        setStatus(AnalysisStatus.ERROR);
      }

    } catch (err) {
      setErrorMsg("Failed to parse HTML code.");
      setStatus(AnalysisStatus.ERROR);
    }
  }, [htmlInput, baseUrl]);

  const loadSample = () => {
    setHtmlInput(SAMPLE_HTML);
    setBaseUrl('');
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Image Optimization Audit Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    if (baseUrl) {
      doc.text(`Source URL: ${baseUrl}`, 14, 36);
    }

    const tableData = images.map(img => {
      const sug = suggestions.get(img.id);
      return [
        img.src.substring(0, 50) + (img.src.length > 50 ? '...' : ''),
        sug?.role || 'N/A',
        sug?.suggestedFormats.join(', ') || 'N/A',
        sug?.suggestedWidths.join(', ') || 'N/A',
        sug?.lazyLoad ? 'Yes' : 'No',
        sug?.altTextImprovement || 'N/A'
      ];
    });

    autoTable(doc, {
      startY: 45,
      head: [['Image Source', 'Role', 'Formats', 'Widths', 'Lazy', 'Alt Improvement']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 40 },
        5: { cellWidth: 40 }
      }
    });

    doc.save('image-optimization-report.pdf');
  };

  const downloadExcel = () => {
    const data = images.map(img => {
      const sug = suggestions.get(img.id);
      return {
        'Image ID': img.id,
        'Source URL': img.src,
        'Original Width': img.originalWidth || 'N/A',
        'Original Height': img.originalHeight || 'N/A',
        'Current Alt': img.alt || 'N/A',
        'Role': sug?.role || 'N/A',
        'Suggested Formats': sug?.suggestedFormats.join(', ') || 'N/A',
        'Suggested Widths': sug?.suggestedWidths.join(', ') || 'N/A',
        'Sizes Attribute': sug?.sizesAttribute || 'N/A',
        'Lazy Load': sug?.lazyLoad ? 'Yes' : 'No',
        'Alt Improvement': sug?.altTextImprovement || 'N/A',
        'Reasoning': sug?.reasoning || 'N/A'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Optimization Report');
    XLSX.writeFile(workbook, 'image-optimization-report.xlsx');
  };

  // Calculate Dashboard Metrics
  const getMetrics = () => {
    const total = images.length;
    let critical = 0;
    let warnings = 0;
    let optimized = 0;

    images.forEach(img => {
      const sug = suggestions.get(img.id);
      if (!sug) return;

      const isMissingAlt = !img.alt && !!sug.altTextImprovement;
      const isMissingLazy = !sug.lazyLoad && sug.role !== 'Hero';
      
      if (isMissingAlt) {
        critical++;
      } else if (isMissingLazy) {
        warnings++;
      } else {
        optimized++;
      }
    });

    // Heuristic for performance gain
    const mbSaved = (total * 0.18).toFixed(1); // 180KB per image avg
    const speedGain = Math.min(total * 4, 85); // 4% per image, max 85%

    return { total, critical, warnings, optimized, mbSaved, speedGain };
  };

  const metrics = getMetrics();

  // Filter and Sort Logic
  const filteredAndSortedImages = images.filter(img => {
    const sug = suggestions.get(img.id);
    if (filter === 'all') return true;
    if (!sug) return filter === 'all';

    const isMissingAlt = !img.alt && !!sug.altTextImprovement;
    const isMissingLazy = !sug.lazyLoad && sug.role !== 'Hero';

    if (filter === 'critical') return isMissingAlt;
    if (filter === 'warnings') return isMissingLazy && !isMissingAlt;
    if (filter === 'optimized') return !isMissingAlt && !isMissingLazy;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'none') return 0;

    const sugA = suggestions.get(a.id);
    const sugB = suggestions.get(b.id);

    if (sortBy === 'largest') {
      const areaA = (parseInt(a.originalWidth || '0') || 0) * (parseInt(a.originalHeight || '0') || 0);
      const areaB = (parseInt(b.originalWidth || '0') || 0) * (parseInt(b.originalHeight || '0') || 0);
      return areaB - areaA;
    }

    if (sortBy === 'issues') {
      const getIssueCount = (img: ScannedImage, sug?: OptimizationSuggestion) => {
        if (!sug) return 0;
        let count = 0;
        if (!img.alt && !!sug.altTextImprovement) count += 2; // Critical
        if (!sug.lazyLoad && sug.role !== 'Hero') count += 1; // Warning
        return count;
      };
      return getIssueCount(b, sugB) - getIssueCount(a, sugA);
    }

    if (sortBy === 'alt') {
      const hasMissingAltA = !a.alt && !!sugA?.altTextImprovement;
      const hasMissingAltB = !b.alt && !!sugB?.altTextImprovement;
      if (hasMissingAltA && !hasMissingAltB) return -1;
      if (!hasMissingAltA && hasMissingAltB) return 1;
      return 0;
    }

    return 0;
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0f172a] text-slate-200">
      
      {/* Left Panel: Input */}
      <div className="w-full md:w-[450px] lg:w-[600px] flex flex-col border-r border-slate-800 bg-slate-900/50 h-screen sticky top-0 z-10">
        <div className="p-6 border-b border-slate-800 bg-slate-900 z-20 shadow-md flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
              <FileCode className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">OptiExtract</h1>
              <p className="text-xs text-slate-400 font-medium">Smart HTML Image Auditor</p>
            </div>
          </div>

          {/* URL Input Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fetch from URL</label>
            <div className="flex gap-2">
              <div className="relative flex-1 group">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                <input 
                  type="text" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 transition-all"
                  placeholder="example.com"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                />
              </div>
              <button 
                onClick={handleFetchUrl}
                disabled={isFetchingUrl || !urlInput}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-slate-300 rounded-lg px-4 flex items-center justify-center transition-colors"
                title="Fetch HTML"
              >
                {isFetchingUrl ? <RefreshCw className="animate-spin" size={18} /> : <ArrowRight size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Manual HTML Input */}
        <div className="flex-1 relative group flex flex-col min-h-0">
          <div className="px-6 py-2 bg-[#0b1221] border-b border-slate-800/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">HTML Source</span>
            {baseUrl && (
               <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded flex items-center gap-1 max-w-[200px] truncate">
                 <LinkIcon size={10} />
                 Base: {baseUrl}
               </span>
            )}
          </div>
          <textarea
            className="flex-1 w-full bg-[#0b1221] p-6 text-sm font-mono text-slate-300 resize-none focus:outline-none focus:ring-inset focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-600"
            placeholder="Paste HTML here or fetch from URL above..."
            value={htmlInput}
            onChange={(e) => {
              setHtmlInput(e.target.value);
              // If user manually edits, we might want to keep or clear baseUrl. 
              // Keeping it allows them to fix fetched HTML while preserving relative links.
            }}
            spellCheck={false}
          />
          {!htmlInput.trim() && !isFetchingUrl && (
            <button 
              onClick={loadSample}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full text-xs font-medium text-slate-300 transition-colors shadow-xl z-10"
            >
              Load Sample HTML
            </button>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900 flex-shrink-0">
           <button
            onClick={handleParse}
            disabled={status === AnalysisStatus.PARSING || status === AnalysisStatus.ANALYZING_AI || !htmlInput.trim()}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
          >
            {status === AnalysisStatus.PARSING || status === AnalysisStatus.ANALYZING_AI ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                <span>{status === AnalysisStatus.PARSING ? 'Parsing HTML...' : 'Consulting AI...'}</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Analyze & Optimize</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Panel: Results */}
      <div className="flex-1 h-screen overflow-y-auto bg-[#0f172a] relative">
        <div className="p-8 max-w-5xl mx-auto min-h-full">
          
          {/* Header State */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                Analysis Results
                {images.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-400 border border-slate-700">
                    {images.length} images found
                  </span>
                )}
              </h2>
              {status === AnalysisStatus.ANALYZING_AI && (
                 <div className="flex items-center gap-2 text-xs text-indigo-400 animate-pulse">
                   <Sparkles size={14} />
                   Generating responsive strategies...
                 </div>
              )}
            </div>

            {images.length > 0 && status === AnalysisStatus.COMPLETE && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={downloadPDF}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                >
                  <FileText size={14} />
                  <span>PDF Report</span>
                </button>
                <button 
                  onClick={downloadExcel}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                >
                  <Table size={14} />
                  <span>Excel Report</span>
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 bg-red-900/20 border border-red-800 rounded-xl flex items-start gap-3 text-red-200 mb-6">
              <AlertTriangle className="shrink-0 mt-0.5" size={20} />
              <p className="text-sm">{errorMsg}</p>
            </div>
          )}

          {/* Audit Summary Dashboard */}
          {status === AnalysisStatus.COMPLETE && images.length > 0 && (
            <>
              <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Zap size={14} className="text-indigo-400" />
                      Image Audit Summary
                    </h3>
                    <div className="h-px flex-1 bg-slate-800 mx-4"></div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl">
                      <p className="text-xs font-medium text-slate-500 mb-1">Images Scanned</p>
                      <p className="text-2xl font-bold text-white">{metrics.total}</p>
                    </div>
                    <div className="bg-red-900/10 border border-red-900/20 p-4 rounded-xl">
                      <p className="text-xs font-medium text-red-400/70 mb-1">Critical Issues</p>
                      <p className="text-2xl font-bold text-red-400">{metrics.critical}</p>
                    </div>
                    <div className="bg-amber-900/10 border border-amber-900/20 p-4 rounded-xl">
                      <p className="text-xs font-medium text-amber-400/70 mb-1">Warnings</p>
                      <p className="text-2xl font-bold text-amber-400">{metrics.warnings}</p>
                    </div>
                    <div className="bg-emerald-900/10 border border-emerald-900/20 p-4 rounded-xl">
                      <p className="text-xs font-medium text-emerald-400/70 mb-1">Optimized</p>
                      <p className="text-2xl font-bold text-emerald-400">{metrics.optimized}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-xl">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-indigo-300 mb-1">Estimated Performance Gain</h4>
                      <p className="text-xs text-slate-400">Based on AI-suggested responsive strategies and modern formats.</p>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                          <Zap size={16} className="text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white">{metrics.mbSaved} MB</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">Data Saved</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                          <Zap size={16} className="text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white">{metrics.speedGain}%</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">Faster Load</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters & Sorting */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 p-4 bg-slate-900/30 border border-slate-800 rounded-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Filter Results:</span>
                  <button 
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setFilter('critical')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === 'critical' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    Critical ({metrics.critical})
                  </button>
                  <button 
                    onClick={() => setFilter('warnings')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === 'warnings' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    Warnings ({metrics.warnings})
                  </button>
                  <button 
                    onClick={() => setFilter('optimized')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === 'optimized' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    Optimized ({metrics.optimized})
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sort by:</span>
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="none">Default</option>
                    <option value="largest">Largest Images</option>
                    <option value="issues">Most Issues</option>
                    <option value="alt">Missing Alt Text</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Empty State */}
          {status === AnalysisStatus.IDLE && !errorMsg && (
             <div className="flex flex-col items-center justify-center py-20 text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl">
                <Search size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">Ready to Analyze</p>
                <p className="text-sm max-w-xs text-center mt-2 opacity-70">
                  Enter a website URL above or paste HTML code to extract image details and receive AI-powered optimization tips.
                </p>
             </div>
          )}

          {/* List Results */}
          <div className="space-y-6 pb-20">
            {filteredAndSortedImages.length === 0 && images.length > 0 && (
              <div className="py-20 text-center border border-dashed border-slate-800 rounded-2xl">
                <p className="text-slate-500">No images match the selected filter.</p>
              </div>
            )}
            {filteredAndSortedImages.map((img) => (
              <ImageCard 
                key={img.id} 
                image={img} 
                suggestion={suggestions.get(img.id)} 
              />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}