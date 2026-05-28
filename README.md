# GoodMonday Video Server

Server per la generazione automatica dei video del progetto **GoodMonday** — il notiziario settimanale di buone notizie raccontato da un simpatico bebè giornalista.

## Stack
- **Express** — server HTTP
- **Remotion** — rendering video 9:16 in stile Sky TG24
- **Edge TTS** — voce italiana (it-IT-ElsaNeural)

## Endpoint

### `GET /`
Health check — verifica che il server sia attivo.

### `POST /genera-video`
Genera il video a partire dallo script prodotto da n8n.

**Body JSON:**
```json
{
  "script": {
    "intro": "Ciao a tutti! Benvenuti a GoodMonday!",
    "notizie": [
      {
        "testo": "Testo della notizia...",
        "citazione_voce": "Come ci racconta la NASA!",
        "durata": "30 secondi"
      }
    ],
    "outro": "Grazie per averci seguito! A lunedì prossimo!"
  },
  "caption_finale": "..."
}
```

**Risposta:**
```json
{
  "successo": true,
  "jobId": "goodmonday_1234567890",
  "video_base64": "...",
  "formato": "mp4",
  "dimensioni": "1080x1920",
  "durata_secondi": 180
}
```

## Deploy su Railway
1. Fork questo repo
2. Crea un nuovo progetto su Railway
3. Collega il repo GitHub
4. Railway fa tutto il resto automaticamente

## Sviluppo locale
```bash
npm install
npx playwright install chromium
npm start
```
