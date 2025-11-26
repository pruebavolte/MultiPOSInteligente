import fetch from "node-fetch";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

export async function transcribeAudio(
  audioBuffer: Buffer,
  language: string = "es"
): Promise<string> {
  try {
    // ElevenLabs doesn't have a direct transcription API
    // We'll use OpenAI Whisper for transcription instead
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Use toFile helper from openai package for Node.js compatibility
    const { toFile } = await import("openai");
    const file = await toFile(audioBuffer, "audio.webm", { type: "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: language === "es" ? "es" : language === "en" ? "en" : undefined,
    });

    return transcription.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw new Error("Failed to transcribe audio");
  }
}

export async function synthesizeSpeech(
  text: string,
  language: string = "es"
): Promise<Buffer> {
  try {
    // Map language to ElevenLabs voice IDs (using default voices)
    const voiceIds: Record<string, string> = {
      es: "EXAVITQu4vr4xnSDxMaL", // Spanish voice
      en: "21m00Tcm4TlvDq8ikWAM", // English voice (Rachel)
      fr: "21m00Tcm4TlvDq8ikWAM", // Fallback to English
      de: "21m00Tcm4TlvDq8ikWAM",
      zh: "21m00Tcm4TlvDq8ikWAM",
      ja: "21m00Tcm4TlvDq8ikWAM",
    };

    const voiceId = voiceIds[language] || voiceIds.en;

    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY || "",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Error synthesizing speech:", error);
    throw new Error("Failed to synthesize speech");
  }
}
