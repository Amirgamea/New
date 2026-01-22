import { ConvertResponse, JobStatusResponse, ExportOptions } from '../types';

/**
 * Uploads a file and returns a Job ID.
 * Uses XMLHttpRequest to track upload progress.
 */
export const uploadFile = (
  file: File, 
  options: ExportOptions,
  onProgress: (percent: number) => void
): Promise<ConvertResponse> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('exportOptions', JSON.stringify(options));

    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          reject(new Error('Invalid server response'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.open('POST', '/upload');
    xhr.send(formData);
  });
};

/**
 * Polls the status of a specific job.
 */
export const checkJobStatus = async (jobId: string): Promise<JobStatusResponse> => {
  const response = await fetch(`/status/${jobId}`);
  if (!response.ok) {
    throw new Error('Failed to check status');
  }
  return response.json();
};

/**
 * Generates the download URL for a completed job.
 * format defaults to docx, but can be 'pdf'.
 */
export const getDownloadUrl = (jobId: string, format: 'docx' | 'pdf' = 'docx'): string => {
  return `/download/${jobId}/${format}`;
};

/**
 * Triggers ZIP download for multiple jobs
 */
export const downloadZip = async (jobIds: string[]) => {
  const response = await fetch('/zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobIds })
  });

  if (!response.ok) throw new Error("Failed to generate zip");

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bear-notes-converted.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};