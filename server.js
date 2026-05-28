const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { EdgeTTS } = require('node-edge-tts');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const OUTPUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const PUBLIC_GENERATED_DIR = path.join(__dirname, 'public', 'generated');
if (!fs.existsSync(PUBLIC_GENERATED_DIR)) fs.mkdirSync(PUBLIC_GENERATED_DIR, { recursive: true });

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'GoodMonday Video Server attivo', version: '1.0.0' });
});

// Endpoint principale
app.post('/genera-video', async (req, res) => {
  const { script, caption_finale } = req.body;

  if (!script || !script.notizie) {
    return res.status(400).json({ errore: 'Script mancante o non valido' });
  }

  const jobId = `goodmonday_${Date.now()}`;
  const jobDir = path.join(OUTPUT_DIR, jobId);
  const publicJobDir = path.join(PUBLIC_GENERATED_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });
  fs.mkdirSync(publicJobDir, { recursive: true });

  try {
    console.log(`[${jobId}] Avvio generazione video...`);

    // 1. Genera audio con node-edge-tts
    const testoCompleto = buildTestoTTS(script);
    console.log(`[${jobId}] Generazione audio Edge TTS...`);
    const audioPath = path.join(publicJobDir, 'audio.mp3');
    await generateAudio(testoCompleto, audioPath);

    // 2. Genera video con Remotion
    console.log(`[${jobId}] Rendering video Remotion...`);
    const videoPath = path.join(jobDir, 'video.mp4');
    const propsPath = path.join(jobDir, 'props.json');
    fs.writeFileSync(propsPath, JSON.stringify({
      script,
      audioPath: `generated/${jobId}/audio.mp3`,
    }));

    await renderVideo(propsPath, videoPath);

    if (!fs.existsSync(videoPath)) throw new Error('Video non generato');

    // 3. Restituisce video in base64
    const videoBase64 = fs.readFileSync(videoPath).toString('base64');

    setTimeout(() => {
      try { fs.rmSync(jobDir, { recursive: true }); } catch (e) {}
      try { fs.rmSync(publicJobDir, { recursive: true }); } catch (e) {}
    }, 60000);

    res.json({
      successo: true,
      jobId,
      video_base64: videoBase64,
      formato: 'mp4',
      dimensioni: '1080x1920',
      durata_secondi: 180
    });

  } catch (err) {
    console.error(`[${jobId}] Errore:`, err.message);
    try { fs.rmSync(jobDir, { recursive: true }); } catch (e) {}
    try { fs.rmSync(publicJobDir, { recursive: true }); } catch (e) {}
    res.status(500).json({ errore: err.message });
  }
});

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

async function renderVideo(propsPath, videoPath) {
  const remotionBin = path.join(__dirname, 'node_modules', '.bin', 'remotion');
  const args = [
    'render',
    'src/index.tsx',
    'GoodMondayVideo',
    videoPath,
    `--props=${propsPath}`,
    '--concurrency=1',
  ];

  await runCommand(remotionBin, args, 300000);
}

function runCommand(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: __dirname,
      env: { ...process.env, CI: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const maxLogLength = 12000;

    const appendLog = (current, chunk) => {
      const next = current + chunk.toString();
      return next.length > maxLogLength ? next.slice(-maxLogLength) : next;
    };

    child.stdout.on('data', (chunk) => {
      stdout = appendLog(stdout, chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr = appendLog(stderr, chunk);
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    child.on('close', (code, signal) => {
      clearTimeout(timeout);

      if (timedOut) {
        reject(new Error(`Render video scaduto dopo ${timeoutMs}ms`));
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(
        `Remotion fallito con codice ${code ?? 'null'} e segnale ${signal ?? 'none'}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`
      ));
    });
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GoodMonday Video Server in ascolto sulla porta ${PORT}`);
});
