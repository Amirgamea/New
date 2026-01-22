import React, { useState, useEffect, useRef } from 'react';
import { ConversionStatus, FileItem, ExportOptions } from './types';
import { uploadFile, checkJobStatus, getDownloadUrl, downloadZip } from './services/api';
import DropZone from './components/DropZone';
import ExportMenu from './components/ExportMenu';
import { CheckIcon, ErrorIcon, FileIcon, BearIcon, ArrowLeftIcon, ArchiveIcon, XMarkIcon, SunIcon, MoonIcon, FilePdfIcon, FileDocxIcon } from './components/Icons';

type ViewState = 'HOME' | 'MENU' | 'QUEUE' | 'RESULTS';
type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('HOME');
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({ docx: true, pdf: false });
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });
  
  // Theme Effect
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Haptic feedback helper
  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (navigator.vibrate) {
      navigator.vibrate(style === 'heavy' ? 200 : 50);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    triggerHaptic('light');
  };

  const handleFilesSelected = (files: File[]) => {
    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: ConversionStatus.QUEUED,
      uploadProgress: 0,
      processingProgress: 0,
      timeLeft: 0
    }));

    setFileList(prev => [...prev, ...newFiles]);
    setView('MENU'); // Go to Menu first
    triggerHaptic('light');
  };

  const handleExportStart = (options: ExportOptions) => {
      setExportOptions(options);
      setView('QUEUE');
      triggerHaptic('medium');
  };

  // Queue Processor Effect
  useEffect(() => {
    const processNext = async () => {
      // If we are not in Queue mode (e.g. user went back home), stop processing new ones visual logic
      if (view !== 'QUEUE') return;
      if (isProcessingQueue) return;

      const nextFileIndex = fileList.findIndex(f => f.status === ConversionStatus.QUEUED);
      if (nextFileIndex === -1) {
        // No more queued files. Check if all are done to transition to results.
        const allDone = fileList.length > 0 && fileList.every(f => 
            f.status === ConversionStatus.COMPLETED || f.status === ConversionStatus.ERROR
        );
        if (allDone) {
            setTimeout(() => {
                setView('RESULTS');
                triggerHaptic('heavy');
            }, 1000);
        }
        return;
      }

      setIsProcessingQueue(true);
      const currentItem = fileList[nextFileIndex];
      
      updateFileStatus(currentItem.id, { status: ConversionStatus.UPLOADING });

      try {
        // 1. Upload
        const { jobId } = await uploadFile(currentItem.file, exportOptions, (percent) => {
          updateFileStatus(currentItem.id, { uploadProgress: percent });
        });

        updateFileStatus(currentItem.id, { 
          status: ConversionStatus.PROCESSING, 
          serverJobId: jobId,
          uploadProgress: 100
        });

        // 2. Poll Status
        const pollInterval = setInterval(async () => {
          // If user navigates away, stop polling for this UI instance
          if (view !== 'QUEUE') {
             clearInterval(pollInterval);
             return;
          }

          try {
            const statusData = await checkJobStatus(jobId);
            
            if (statusData.state === 'completed') {
              clearInterval(pollInterval);
              updateFileStatus(currentItem.id, { 
                status: ConversionStatus.COMPLETED,
                processingProgress: 100,
                timeLeft: 0,
                resultUrl: statusData.outputs?.docx ? getDownloadUrl(jobId, 'docx') : undefined, // Legacy support
                outputs: {
                    docx: statusData.outputs?.docx ? getDownloadUrl(jobId, 'docx') : undefined,
                    pdf: statusData.outputs?.pdf ? getDownloadUrl(jobId, 'pdf') : undefined
                }
              });
              setIsProcessingQueue(false); 
            } else if (statusData.state === 'error') {
              clearInterval(pollInterval);
              throw new Error(statusData.error || 'Unknown error');
            } else {
              updateFileStatus(currentItem.id, { 
                processingProgress: statusData.progress,
                timeLeft: statusData.timeLeft
              });
            }
          } catch (err) {
            clearInterval(pollInterval);
            throw err;
          }
        }, 1000);

      } catch (error: any) {
        updateFileStatus(currentItem.id, { 
          status: ConversionStatus.ERROR, 
          error: error.message 
        });
        setIsProcessingQueue(false);
      }
    };

    processNext();
  }, [fileList, isProcessingQueue, view, exportOptions]);

  const updateFileStatus = (id: string, updates: Partial<FileItem>) => {
    setFileList(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleDownload = (url: string, filename: string) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const handleDownloadZip = async () => {
      const completedJobIds = fileList
        .filter(f => f.status === ConversionStatus.COMPLETED && f.serverJobId)
        .map(f => f.serverJobId as string);
      
      if (completedJobIds.length > 0) {
          try {
              await downloadZip(completedJobIds);
              triggerHaptic('medium');
          } catch (e) {
              alert("Failed to create zip");
          }
      }
  };

  const handleCancelItem = (id: string) => {
      // Remove from list
      setFileList(prev => {
          const newList = prev.filter(f => f.id !== id);
          if (newList.length === 0) {
              setView('HOME');
              setIsProcessingQueue(false);
          }
          return newList;
      });
  };

  const goBack = () => {
      setView('HOME');
      setFileList([]);
      setIsProcessingQueue(false);
  };

  const goBackToMenu = () => {
      setView('MENU');
      // Reset status of all files to queued if they were processing? 
      // Actually simpler to just clear processing state but keep files.
      // But for simplicity, let's treat 'Back' from Menu as clearing files.
      // If we are in Menu, Back goes to Home.
  };

  // --- RENDER HELPERS ---

  const renderHeader = () => (
      <div className="text-center space-y-2 relative w-full flex flex-col items-center">
            {/* Top Bar with Back and Theme Toggle */}
            <div className="absolute top-0 w-full flex justify-between items-center px-2">
                {view !== 'HOME' ? (
                    <button 
                        onClick={goBack}
                        className="p-3 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/20 text-gray-900 dark:text-white transition-all backdrop-blur-md"
                    >
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                ) : <div className="w-12"></div> /* Spacer */}
                
                <button 
                    onClick={toggleTheme}
                    className="p-3 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/20 text-gray-900 dark:text-white transition-all backdrop-blur-md"
                    title="Toggle Theme"
                >
                    {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                </button>
            </div>

            <div className="inline-flex items-center justify-center p-4 bg-white/40 dark:bg-white/10 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/10 shadow-xl mb-4 mt-8">
                <BearIcon className="w-10 h-10 text-gray-900 dark:text-white" />
            </div>
            
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white drop-shadow-sm">
                Bear to DOCX
            </h1>
      </div>
  );

  const renderQueueItem = (item: FileItem) => (
    <div key={item.id} className="bg-black/5 dark:bg-white/5 rounded-xl p-4 border border-black/10 dark:border-white/10 relative overflow-hidden group animate-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={`p-2 rounded-lg ${
                    item.status === ConversionStatus.ERROR ? 'bg-red-500/20 text-red-500 dark:text-red-400' :
                    item.status === ConversionStatus.COMPLETED ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                    'bg-black/10 dark:bg-white/10 text-gray-700 dark:text-white'
                }`}>
                    {item.status === ConversionStatus.COMPLETED ? <CheckIcon className="w-5 h-5" /> :
                        item.status === ConversionStatus.ERROR ? <ErrorIcon className="w-5 h-5" /> :
                        <FileIcon className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                    <p className="text-gray-900 dark:text-white font-medium truncate text-sm max-w-[150px]">{item.file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-white/40">
                        {item.status === ConversionStatus.QUEUED && "Waiting..."}
                        {item.status === ConversionStatus.UPLOADING && `Uploading ${item.uploadProgress}%`}
                        {item.status === ConversionStatus.PROCESSING && "Processing..."}
                        {item.status === ConversionStatus.COMPLETED && "Ready"}
                        {item.status === ConversionStatus.ERROR && "Failed"}
                    </p>
                </div>
            </div>

            {/* Cancel Button during processing */}
            <button 
                onClick={() => handleCancelItem(item.id)}
                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 dark:text-white/50 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Cancel"
            >
                <XMarkIcon className="w-5 h-5" />
            </button>
        </div>

        {/* Progress Bars */}
        {(item.status === ConversionStatus.UPLOADING || item.status === ConversionStatus.PROCESSING) && (
            <div className="relative z-10 space-y-1 mt-2">
                <div className="w-full h-1 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-pink-500 transition-all duration-300"
                        style={{ width: `${item.status === ConversionStatus.UPLOADING ? item.uploadProgress : 100}%` }}
                    />
                </div>
                {item.status === ConversionStatus.PROCESSING && (
                    <>
                        <div className="w-full h-1 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-blue-500 transition-all duration-500"
                                style={{ width: `${item.processingProgress}%` }}
                            />
                        </div>
                        <div className="flex justify-end text-[10px] text-gray-500 dark:text-white/40 mt-1">
                            <span>{item.timeLeft}s left</span>
                        </div>
                    </>
                )}
            </div>
        )}
         {item.status === ConversionStatus.ERROR && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">{item.error}</p>
        )}
    </div>
  );

  const renderResultItem = (item: FileItem) => (
    <div key={item.id} className="bg-black/5 dark:bg-white/5 rounded-xl p-4 border border-black/10 dark:border-white/10 relative overflow-hidden group flex flex-col gap-3">
        <div className="flex items-center gap-3 overflow-hidden">
             <div className={`p-2 rounded-lg ${
                item.status === ConversionStatus.ERROR ? 'bg-red-500/20 text-red-500 dark:text-red-400' :
                'bg-green-500/20 text-green-600 dark:text-green-400'
            }`}>
                {item.status === ConversionStatus.ERROR ? <ErrorIcon className="w-5 h-5" /> : <FileIcon className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-gray-900 dark:text-white font-medium truncate text-sm">{item.file.name}</p>
                <p className="text-xs text-gray-500 dark:text-white/40">
                    {item.status === ConversionStatus.ERROR ? "Conversion Failed" : "Converted successfully"}
                </p>
            </div>
        </div>

        {item.status === ConversionStatus.COMPLETED && (
            <div className="flex gap-2 mt-1">
                {item.outputs?.docx && (
                     <button 
                        onClick={() => handleDownload(item.outputs!.docx!, item.file.name.replace(/\.(md|textbundle)$/, '') + '.docx')}
                        className="flex-1 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 transition-colors border border-blue-500/20 flex items-center justify-center gap-2"
                    >
                        <FileDocxIcon className="w-4 h-4" /> DOCX
                    </button>
                )}
                {item.outputs?.pdf && (
                     <button 
                        onClick={() => handleDownload(item.outputs!.pdf!, item.file.name.replace(/\.(md|textbundle)$/, '') + '.pdf')}
                        className="flex-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 transition-colors border border-red-500/20 flex items-center justify-center gap-2"
                    >
                         <FilePdfIcon className="w-4 h-4" /> PDF
                    </button>
                )}
            </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center p-6 animate-gradient bg-gray-50 dark:bg-[#0f0f0f] transition-colors duration-300">
      {/* Overlay: White/30 for light, Black/40 for dark */}
      <div className="absolute inset-0 bg-white/30 dark:bg-black/40 pointer-events-none transition-colors duration-300" />

      <div className="w-full max-w-lg relative z-10 flex flex-col gap-6">
        
        {renderHeader()}

        {/* Content Card */}
        <div className="glass rounded-3xl p-6 shadow-2xl transition-all duration-500 relative overflow-hidden min-h-[300px] flex flex-col">
            
            {/* HOME VIEW */}
            {view === 'HOME' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 flex flex-col justify-center">
                    <DropZone onFilesSelected={handleFilesSelected} disabled={false} />
                </div>
            )}

            {/* MENU VIEW */}
            {view === 'MENU' && (
                <ExportMenu 
                    files={fileList.map(f => f.file)} 
                    onExport={handleExportStart}
                    onBack={goBack} 
                />
            )}

            {/* QUEUE VIEW */}
            {view === 'QUEUE' && (
                <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4 border-b border-black/10 dark:border-white/10 pb-2">
                        <h2 className="text-gray-900 dark:text-white font-semibold">Processing...</h2>
                        <span className="text-xs text-gray-500 dark:text-white/50">{fileList.filter(f => f.status === ConversionStatus.COMPLETED).length}/{fileList.length}</span>
                    </div>
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1 pb-2">
                        {fileList.map(renderQueueItem)}
                    </div>
                </div>
            )}

            {/* RESULTS VIEW */}
            {view === 'RESULTS' && (
                <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col h-full">
                    
                    {/* Bulk Actions */}
                    <button 
                        onClick={handleDownloadZip}
                        className="w-full mb-4 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2 group"
                    >
                        <ArchiveIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Download All as ZIP
                    </button>

                    <div className="flex justify-between items-center mb-2 border-b border-black/10 dark:border-white/10 pb-2">
                        <h2 className="text-gray-900 dark:text-white font-semibold text-sm">Individual Files</h2>
                    </div>

                    <div className="space-y-3 max-h-[45vh] overflow-y-auto custom-scrollbar pr-1 pb-2">
                        {fileList.map(renderResultItem)}
                    </div>
                    
                    <button 
                        onClick={goBack}
                        className="mt-4 w-full py-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-900 dark:text-white font-medium transition-colors text-sm"
                    >
                        Convert More Files
                    </button>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default App;