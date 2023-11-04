import fs from 'fs'
import type OpenAI from 'openai'
import tryCatch from '../utilities/tryCatch'


type audioResumeParams = {
    openai: OpenAI
    filePath: string
}

export async function audioTranscription({
    openai,
    filePath
}: audioResumeParams) {

    const resp = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
        // prompt: "Eres un experto en transcribir audio. Por favor, transcribe el siguiente audio.",
    });

    // // Delete the file from the server
    // fs.unlinkSync(filePath);

    return resp.text
}