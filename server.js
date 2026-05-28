const express = require('express');
const cors = require('cors');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const OUTPUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'GoodMonday Video Server attivo', version: '1.0.0' });
});

// Endpoint principale — genera video da script
app.post('/genera-video', async (req, res) => {
  const { script, caption_finale } = req.body;

  if (!script || !script.notizie) {
    return res.status(400).json({ errore: 'Script mancante o non valido' });
  }

  const jobId = `goodmonday_${Date.now()}`;
  const jobDir = path.join(OUTPUT_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  try {
    console.log(`[${jobId}] Avvio generazione video...`);

    // 1. Costruisce il testo completo per TTS
    const testoCompleto = buildTestoTTS(script);

    // 2. Genera audio con edge-tts
    console.log(`[${jobId}] Generazione audio Edge TTS...`);
    const audioPath = path.join(jobDir, 'audio.mp3');
    await generateAudio(testoCompleto, audioPath);

    // 3. Genera il video con Remotion
    console.log(`[${jobId}] Rendering video Remotion...`);
    const videoPath = path.join(jobDir, 'video.mp4');
    await renderVideo(script, audioPath, videoPath, jobId);

    // 4. Legge il video e lo restituisce come base64
    console.log(`[${jobId}] Video generato, invio risposta...`);
    const videoBuffer = fs.readFileSync(videoPath);
    const videoBase64 = videoBuffer.toString('base64');

    // Pulizia file temporanei
    setTimeout(() => {
      try { fs.rmSync(jobDir, { recursive: true }); } catch (e) {}
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
    res.status(500).json({ errore: err.message });
  }
});

// Costruisce testo per TTS concatenando tutte le parti dello script
function buildTestoTTS(script) {
  let testo = script.intro + '. ';
  script.notizie.forEach(n => {
    testo += n.testo + '. ' + (n.citazione_voce || '') + '. ';
  });
  testo += script.outro;
  return testo;
}

// Genera audio con edge-tts (voce italiana)
async function generateAudio(testo, outputPath) {
  const { stdout, stderr } = await execAsync(
    `edge-tts --voice it-IT-ElsaNeural --text "${testo.replace(/"/g, "'")}" --write-media "${outputPath}"`,
    { timeout: 60000 }
  );
  if (!fs.existsSync(outputPath)) {
    throw new Error('Audio non generato: ' + stderr);
  }
}

// Renderizza il video con Remotion
async function renderVideo(script, audioPath, outputPath, jobId) {
  // Scrive i dati dello script in un file temporaneo per passarli a Remotion
  const propsPath = path.join(OUTPUT_DIR, jobId, 'props.json');
  fs.writeFileSync(propsPath, JSON.stringify({ script, audioPath }));

  const { stdout, stderr } = await execAsync(
    `npx remotion render src/index.ts GoodMondayVideo "${outputPath}" --props="${propsPath}" --log=verbose`,
    {
      timeout: 300000,
      env: { ...process.env, NODE_ENV: 'production' }
    }
  );

  if (!fs.existsSync(outputPath)) {
    throw new Error('Video non generato: ' + (stderr || stdout));
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GoodMonday Video Server in ascolto sulla porta ${PORT}`);
});
