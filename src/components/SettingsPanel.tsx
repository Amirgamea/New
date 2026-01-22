import React from 'react';
import { ConversionSettings } from '../types';
import { XMarkIcon } from './Icons';

interface SettingsPanelProps {
  settings: ConversionSettings;
  onSettingsChange: (settings: ConversionSettings) => void;
  onClose: () => void;
  isOpen: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSettingsChange, onClose, isOpen }) => {
  if (!isOpen) return null;

  const handleChange = (field: keyof ConversionSettings, value: any) => {
    onSettingsChange({ ...settings, [field]: value });
  };

  const handleMarginChange = (side: keyof ConversionSettings['margins'], value: string) => {
    onSettingsChange({
      ...settings,
      margins: { ...settings.margins, [side]: value }
    });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-sm glass rounded-3xl p-6 overflow-y-auto max-h-[85vh] animate-in zoom-in-95 duration-200 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pandoc Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            <XMarkIcon className="w-6 h-6 text-gray-900 dark:text-white" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Paper Size */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-white/70">Paper Size</label>
            <div className="relative">
                <select
                value={settings.paperSize}
                onChange={(e) => handleChange('paperSize', e.target.value)}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 appearance-none transition-all hover:bg-black/10 dark:hover:bg-white/10"
                >
                <option value="a4" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">A4</option>
                <option value="letter" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">US Letter</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 dark:text-white/50">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
                    </svg>
                </div>
            </div>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-white/70">Language Code</label>
            <input
              type="text"
              value={settings.language}
              onChange={(e) => handleChange('language', e.target.value)}
              placeholder="en-US"
              className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all hover:bg-black/10 dark:hover:bg-white/10"
            />
          </div>

          {/* Margins */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-white/70">Margins</label>
            <div className="grid grid-cols-2 gap-3">
              {['top', 'bottom', 'left', 'right'].map((side) => (
                <div key={side} className="relative group">
                   <input
                    type="text"
                    value={settings.margins[side as keyof typeof settings.margins]}
                    onChange={(e) => handleMarginChange(side as any, e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl pl-3 pr-2 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all group-hover:bg-black/10 dark:group-hover:bg-white/10"
                  />
                  <span className="absolute right-3 top-2 text-xs text-gray-400 dark:text-white/30 capitalize pointer-events-none">{side}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Variables */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-white/70">Custom Variables</label>
            <textarea
              value={settings.customVariables}
              onChange={(e) => handleChange('customVariables', e.target.value)}
              placeholder="key=value"
              rows={3}
              className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none transition-all hover:bg-black/10 dark:hover:bg-white/10"
            />
             <p className="text-xs text-gray-500 dark:text-white/40">One per line. E.g. mainfont=Arial</p>
          </div>
        </div>

        <div className="mt-8">
            <button 
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white font-bold transition-all shadow-lg shadow-pink-500/20 active:scale-95"
            >
                Save Changes
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;