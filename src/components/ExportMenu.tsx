import React, { useState } from 'react';
import { ExportOptions } from '../types';
import { BearIcon, FileIcon } from './Icons';

interface ExportMenuProps {
  files: File[];
  onExport: (options: ExportOptions) => void;
  onBack: () => void;
}

const ExportMenu: React.FC<ExportMenuProps> = ({ files, onExport, onBack }) => {
  const [pdf, setPdf] = useState(true);
  const [docx, setDocx] = useState(true);

  const handleExport = () => {
    if (pdf || docx) {
      onExport({ pdf, docx });
    }
  };

  return (
    <div className="w-full animate-in fade-in zoom-in-95 duration-300">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Export Options</h2>
        <p className="text-sm text-gray-500 dark:text-white/60">
          Customize your conversion output
        </p>
      </div>

      <div className="space-y-6">
        {/* File Preview */}
        <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-black/10 dark:border-white/10">
          <h3 className="font-semibold text-xs text-gray-500 dark:text-white/50 uppercase tracking-wide mb-3">Files to Process ({files.length})</h3>
          <ul className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
            {files.map((f, idx) => (
              <li key={idx} className="text-sm text-gray-700 dark:text-white/80 flex items-center gap-2">
                <FileIcon className="w-4 h-4 text-gray-400" />
                <span className="truncate">{f.name}</span>
                <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Font Preview */}
        <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black/5 dark:border-white/10 p-6 rounded-xl shadow-sm">
          <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">Font Preview</p>
          <div className="font-['BearSansUI'] text-gray-900 dark:text-white">
            <h3 className="text-2xl font-bold mb-2">
              Heading Example
            </h3>
            <p className="text-base mb-2 leading-relaxed opacity-90">
              This is how your document will look with the <strong>BearSansUI</strong> font family. 
              The styling includes bold text, proper spacing, and formatting.
            </p>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Fonts are embedded in the output files.
          </p>
        </div>

        {/* Format Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className={`
            flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition-all
            ${docx 
                ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/20' 
                : 'border-gray-200 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'}
          `}>
            <input 
              type="checkbox" 
              checked={docx}
              onChange={(e) => setDocx(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-gray-900 dark:text-white block text-sm">DOCX Format</span>
              <span className="text-xs text-gray-500 dark:text-white/60">Editable Word document</span>
            </div>
          </label>

          <label className={`
            flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition-all
            ${pdf 
                ? 'border-red-500 bg-red-500/10 dark:bg-red-500/20' 
                : 'border-gray-200 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'}
          `}>
            <input 
              type="checkbox" 
              checked={pdf}
              onChange={(e) => setPdf(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <div>
              <span className="font-semibold text-gray-900 dark:text-white block text-sm">PDF Format</span>
              <span className="text-xs text-gray-500 dark:text-white/60">Read-only, fonts locked</span>
            </div>
          </label>
        </div>

        {/* Warning */}
        {!pdf && !docx && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3 rounded-r-lg animate-in slide-in-from-top-1">
            <p className="text-red-700 dark:text-red-400 text-sm font-medium">⚠️ Please select at least one format</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onBack}
            className="px-6 py-3 border border-black/10 dark:border-white/10 rounded-xl font-medium text-gray-700 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition w-1/3"
          >
            Back
          </button>
          <button
            onClick={handleExport}
            disabled={!pdf && !docx}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            Process & Export →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportMenu;