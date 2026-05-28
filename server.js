const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const { EdgeTTS } = require('node-edge-tts');

const app = express();
app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const OUTPUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const PUBLIC_GENERATED_DIR = path.join(__dirname, 'public', 'generated');
if (!fs.existsSync(PUBLIC_GENERATED_DIR)) fs.mkdirSync(PUBLIC_GENERATED_DIR, { recursive: true });
const JOB_RETENTION_MS = 30 * 60 * 1000;
const jobs = new Map();

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'GoodMonday Video Server attivo', version: '1.0.0' });
});

// Endpoint principale
app.post('/genera-video', (req, res) => {
  const { script, caption_finale } = req.body;

  if (!script || !script.notizie) {
    return res.status(400).json({ errore: 'Script mancante o non valido' });
  }

  const jobId = `goodmonday_${Date.now()}`;
  const baseUrl = getBaseUrl(req);
  const statusUrl = `${baseUrl}/video-status/${jobId}`;
  const videoUrl = `${baseUrl}/video/${jobId}.mp4`;

  jobs.set(jobId, {
    status: 'processing',
    createdAt: Date.now(),
    jobId,
    statusUrl,
    videoUrl,
  });

  setImmediate(() => {
    processVideoJob({ jobId, script, caption_finale, videoUrl }).catch((err) => {
      markJobFailed(jobId, err);
    });
  });

  res.status(202).json({
    successo: true,
    status: 'processing',
    jobId,
    status_url: statusUrl,
    video_url: videoUrl,
    formato: 'mp4',
    dimensioni: '1080x1920',
    durata_secondi: 180,
  });
});

app.get('/video-status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      successo: false,
      status: 'not_found',
      errore: 'Job non trovato o scaduto',
    });
  }

  res.json({
    successo: job.status === 'completed',
    status: job.status,
    jobId: job.jobId,
    video_url: job.status === 'completed' ? job.videoUrl : null,
    errore: job.error || null,
    formato: 'mp4',
    dimensioni: '1080x1920',
    durata_secondi: 180,
  });
});

app.get('/video/:jobId.mp4', (req, res) => {
  const job = jobs.get(req.params.jobId);

  if (!job || job.status !== 'completed' || !job.videoPath || !fs.existsSync(job.videoPath)) {
    return res.status(404).json({ errore: 'Video non disponibile' });
  }

  res.sendFile(job.videoPath);
});

async function processVideoJob({ jobId, script, caption_finale, videoUrl }) {
  const jobDir = path.join(OUTPUT_DIR, jobId);
  const publicJobDir = path.join(PUBLIC_GENERATED_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });
  fs.mkdirSync(publicJobDir, { recursive: true });

  try {
    console.log(`[${jobId}] Avvio generazione video...`);
    fs.writeFileSync(path.join(jobDir, 'caption.txt'), caption_finale || '');

    // 1. Genera audio con node-edge-tts
    const testoCompleto = buildTestoTTS(script);
    console.log(`[${jobId}] Generazione audio Edge TTS...`);
    const audioPath = path.join(publicJobDir, 'audio.mp3');
    await generateAudio(testoCompleto, audioPath);

    // 2. Genera video con Remotion
    console.log(`[${jobId}] Rendering video Remotion...`);
    const videoPath = path.join(jobDir, 'video.mp4');
    const propsPath = path.join(jobDir, 'props.json');
    const inputProps = {
      script,
      audioPath: `generated/${jobId}/audio.mp3`,
    };
    fs.writeFileSync(propsPath, JSON.stringify(inputProps));

    await renderVideo(inputProps, videoPath);

    if (!fs.existsSync(videoPath)) throw new Error('Video non generato');

    jobs.set(jobId, {
      status: 'completed',
      createdAt: Date.now(),
      jobId,
      videoPath,
      videoUrl,
    });

    setTimeout(() => {
      try { fs.rmSync(jobDir, { recursive: true }); } catch (e) {}
      try { fs.rmSync(publicJobDir, { recursive: true }); } catch (e) {}
      jobs.delete(jobId);
    }, JOB_RETENTION_MS);

    console.log(`[${jobId}] Video pronto: ${videoUrl}`);

  } catch (err) {
    markJobFailed(jobId, err, jobDir, publicJobDir);
  }
}

function markJobFailed(jobId, err, jobDir = null, publicJobDir = null) {
  console.error(`[${jobId}] Errore:`, err.message);
  jobs.set(jobId, {
    status: 'failed',
    createdAt: Date.now(),
    jobId,
    error: err.message,
  });

  if (jobDir) {
    try { fs.rmSync(jobDir, { recursive: true }); } catch (e) {}
  }

  if (publicJobDir) {
    try { fs.rmSync(publicJobDir, { recursive: true }); } catch (e) {}
  }

  setTimeout(() => jobs.delete(jobId), JOB_RETENTION_MS);
}

function getBaseUrl(req) {
  return process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
}

function buildTestoTTS(script) {
  let testo = script.intro + '. ';
  script.notizie.forEach(n => {
    testo += n.testo + '. ' + (n.citazione_voce || '') + '. ';
  });
  testo += script.outro;
  return testo;
}

async function generateAudio(testo, outputPath) {
  const tts = new EdgeTTS({
    voice: 'it-IT-ElsaNeural',
    lang: 'it-IT',
    outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
    timeout: 60000,
  });

  await tts.ttsPromise(testo, outputPath);

  if (!fs.existsSync(outputPath)) {
    throw new Error('Audio non generato');
  }
}

async function renderVideo(inputProps, videoPath) {
  const serveUrl = await bundle({
    entryPoint: path.join(__dirname, 'src', 'index.tsx'),
    onProgress: () => {},
  });

  const composition = await selectComposition({
    serveUrl,
    id: 'GoodMondayVideo',
    inputProps,
    logLevel: 'error',
  });

  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: videoPath,
    inputProps,
    concurrency: 1,
    overwrite: true,
    logLevel: 'error',
    onProgress: () => {},
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GoodMonday Video Server in ascolto sulla porta ${PORT}`);
});
