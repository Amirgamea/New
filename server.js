import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import archiver from 'archiver';
import { logger } from './lib/logger.js';
import { convertDocument } from './lib/converter.js'; // New Module

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Multer setup
const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Robust Job Manager Class
 */
class JobManager {
  constructor(concurrencyLimit = 2) { // Increased concurrency due to lighter process
    this.jobs = new Map();
    this.queue = [];
    this.activeWorkers = 0;
    this.concurrencyLimit = concurrencyLimit;

    setInterval(() => this.cleanupStaleJobs(), 10 * 60 * 1000);
  }

  addJob(file, exportOptions) {
    const jobId = randomUUID();
    const job = {
      id: jobId,
      state: 'queued',
      progress: 0,
      fileSize: file.size,
      originalName: file.originalname,
      inputPath: file.path,
      outputs: {},
      exportOptions: exportOptions || { docx: true, pdf: false },
      error: null,
      startTime: 0,
      endTime: 0,
      estimatedDuration: 0,
      created: Date.now()
    };

    this.jobs.set(jobId, job);
    this.queue.push(jobId);
    this.processNext();
    return jobId;
  }

  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  async processNext() {
    if (this.activeWorkers >= this.concurrencyLimit || this.queue.length === 0) return;

    this.activeWorkers++;
    const jobId = this.queue.shift();
    const job = this.jobs.get(jobId);

    if (!job) {
      this.activeWorkers--;
      this.processNext();
      return;
    }

    try {
      await this.executeJob(job);
    } catch (error) {
      logger.error(`Unhandled error in worker for job ${jobId}: ${error.message}`);
      job.state = 'error';
      job.error = 'Internal Server Error';
    } finally {
      this.activeWorkers--;
      this.processNext();
    }
  }

  async executeJob(job) {
    logger.info(`Starting processing for job ${job.id}`);
    job.state = 'processing';
    job.startTime = Date.now();
    
    // Heuristic calculation
    const fileSizeKB = job.fileSize / 1024;
    job.estimatedDuration = 1000 + (fileSizeKB * 50) + (job.exportOptions.pdf ? 3000 : 0);

    try {
      job.progress = 10;
      
      // Perform Conversion using new module
      // Note: We skip the explicit preprocess step because markdown-it-emoji handles emojis now
      await convertDocument(job);
      
      job.progress = 100;
      job.state = 'completed';
      job.endTime = Date.now();

      // Schedule physical file deletion (20 mins)
      setTimeout(async () => {
        if (job.outputs.docx) await fs.unlink(job.outputs.docx).catch(() => {});
        if (job.outputs.pdf) await fs.unlink(job.outputs.pdf).catch(() => {});
      }, 20 * 60 * 1000);

    } catch (error) {
      logger.error(`Job ${job.id} logic failed: ${error.message}`);
      job.state = 'error';
      job.error = error.message;
    } finally {
      // Cleanup Input File
      if (job.inputPath) await fs.unlink(job.inputPath).catch(() => {});
    }
  }

  calculateTimeLeft(job) {
    if (job.state === 'processing') {
      const elapsed = Date.now() - job.startTime;
      return Math.max(0, Math.ceil((job.estimatedDuration - elapsed) / 1000));
    } else if (job.state === 'queued') {
      const positionInQueue = this.queue.indexOf(job.id);
      if (positionInQueue === -1) return 0;
      return (positionInQueue + 1) * 2;
    }
    return 0;
  }

  cleanupStaleJobs() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [id, job] of this.jobs.entries()) {
      if (job.created < oneHourAgo) {
        this.jobs.delete(id);
      }
    }
  }
}

const jobManager = new JobManager(2);

// --- Routes ---

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    let exportOptions = { docx: true, pdf: false };
    if (req.body.exportOptions) {
        try { exportOptions = JSON.parse(req.body.exportOptions); } catch (e) {}
    }
    const jobId = jobManager.addJob(req.file, exportOptions);
    res.json({ jobId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to queue job' });
  }
});

app.get('/status/:id', (req, res) => {
  const job = jobManager.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.json({
    state: job.state,
    progress: job.progress,
    timeLeft: jobManager.calculateTimeLeft(job),
    outputs: { docx: !!job.outputs?.docx, pdf: !!job.outputs?.pdf },
    error: job.error
  });
});

app.get('/download/:id/:format', (req, res) => {
  const { id, format } = req.params;
  const job = jobManager.getJob(id);
  
  if (!job || job.state !== 'completed') return res.status(404).json({ error: 'File not ready' });

  const filePath = format === 'pdf' ? job.outputs.pdf : job.outputs.docx;
  if (!filePath) return res.status(404).json({ error: `Format ${format} not generated` });

  const ext = format === 'pdf' ? '.pdf' : '.docx';
  const filename = job.originalName.replace(/\.(md|textbundle)$/, '') + ext;
  res.download(filePath, filename);
});

app.post('/zip', async (req, res) => {
    const { jobIds } = req.body;
    if (!Array.isArray(jobIds) || jobIds.length === 0) return res.status(400).json({ error: "No job IDs" });

    const validJobs = jobIds.map(id => jobManager.getJob(id)).filter(j => j && j.state === 'completed');
    if (validJobs.length === 0) return res.status(404).json({ error: "No completed files" });

    res.attachment('converted-files.zip');
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', err => {
        logger.error(`Archive error: ${err.message}`);
        if (!res.headersSent) res.status(500).send({error: err.message});
    });

    archive.pipe(res);

    for (const job of validJobs) {
        const baseName = job.originalName.replace(/\.(md|textbundle)$/, '');
        if (job.outputs.docx) archive.file(job.outputs.docx, { name: baseName + '.docx' });
        if (job.outputs.pdf) archive.file(job.outputs.pdf, { name: baseName + '.pdf' });
    }

    await archive.finalize();
});

app.get('/health', (req, res) => res.send('OK'));

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(port, () => logger.info(`Server running on port ${port}`));
