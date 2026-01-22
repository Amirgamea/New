export enum ConversionStatus {
  IDLE = 'IDLE',
  QUEUED = 'QUEUED',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface ExportOptions {
  pdf: boolean;
  docx: boolean;
}

export interface FileItem {
  id: string;
  file: File;
  status: ConversionStatus;
  uploadProgress: number;
  processingProgress: number;
  timeLeft?: number; // in seconds
  resultUrl?: string; // Legacy, kept for compatibility if needed
  outputs?: {
    docx?: string;
    pdf?: string;
  };
  error?: string;
  serverJobId?: string;
}

export interface ConvertResponse {
  jobId: string;
}

export interface JobStatusResponse {
  state: 'queued' | 'processing' | 'completed' | 'error';
  progress: number;
  timeLeft: number;
  error?: string;
  outputs?: {
    docx?: boolean;
    pdf?: boolean;
  };
}

export interface DragState {
  isDragActive: boolean;
}

export interface ConversionSettings {
  paperSize: string;
  language: string;
  margins: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
  customVariables: string;
}