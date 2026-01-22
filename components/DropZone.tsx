import React, { useCallback, useRef, useState } from 'react';
import { UploadIcon } from './Icons';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected, disabled }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragActive(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[];
      validateAndPropagate(files);
    }
  }, [disabled, onFilesSelected]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      validateAndPropagate(files);
    }
  };

  const validateAndPropagate = (files: File[]) => {
    const validExtensions = ['.md', '.txt', '.textbundle'];
    const validFiles: File[] = [];

    files.forEach(file => {
      const lowerName = file.name.toLowerCase();
      if (validExtensions.some(ext => lowerName.endsWith(ext))) {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    } else {
      alert("Please upload valid .md or .textbundle files");
    }
  };

  const onCardClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div
      onClick={onCardClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        relative w-full h-64 rounded-2xl border-2 border-dashed 
        flex flex-col items-center justify-center cursor-pointer
        transition-all duration-300 ease-in-out group
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5'}
        ${isDragActive 
            ? 'border-pink-500 bg-pink-500/10 scale-[1.02]' 
            : 'border-gray-300 dark:border-white/20'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".md,.textbundle"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      <div className={`p-4 rounded-full bg-black/5 dark:bg-white/10 mb-4 transition-transform duration-300 ${isDragActive ? 'scale-110' : 'group-hover:scale-110'}`}>
        <UploadIcon className="w-8 h-8 text-gray-700 dark:text-white" />
      </div>

      <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {isDragActive ? 'Drop your notes here' : 'Drag & Drop Bear Notes'}
      </p>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-[80%]">
        Supports multiple files (.md and .textbundle)
      </p>
    </div>
  );
};

export default DropZone;