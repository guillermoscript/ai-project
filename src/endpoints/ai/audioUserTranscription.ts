import fs from 'fs';
import path from 'path';
import axios from "axios";
import { StatusCodes } from "http-status-codes";
import { Audio, User, UserTranscription } from "payload/generated-types";
import { PayloadHandler } from "payload/config";
import { srcPath } from "../../payload.config";
import tryCatch from "../../utilities/tryCatch";
import { audioTranscription } from '../../services/audioTranscription';
import OpenAI from 'openai';

require('dotenv').config();
const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_KEY,
    timeout: 90000,
});

export const audioUserTranscription: PayloadHandler = async (req, res): Promise<void> => {
    const { audioId } = req.body;
    const { user, payload } = req
    const userFunctionalities = user?.functionalities as User['functionalities']

    console.log(user, '<----------- asdasdas')

    //TODO: Think on what to do with free users
    // if (userFunctionalities === 'free') {
    //   return res.status(StatusCodes.PAYMENT_REQUIRED).json({ error: 'You must have a paid plan to use this feature' });
    // }

    const [audio, audioError] = await tryCatch<Audio>(payload.findByID({
        collection: 'audios',
        id: audioId
    }))

    if (audioError) {
        console.log(audioError, '<----------- audioError');
        res.status(500).json({ error: 'Error getting audio' });
    }

    const filePath = path.join(srcPath, 'audios', audio.filename)
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);

    if ((fileSizeInMegabytes > 10 && userFunctionalities === 'free') || (fileSizeInMegabytes > 80 && userFunctionalities === 'basic')) {
        res.status(StatusCodes.PAYMENT_REQUIRED).json({ error: 'You must update your plan to use this feature' });
    }

    if (fileSizeInMegabytes <= 24) {
        try {

            
            const resp = await openai.audio.transcriptions.create({
                file: fs.createReadStream(filePath),
                model: "whisper-1",
                // prompt: "Eres un experto en transcribir audio. Por favor, transcribe el siguiente audio.",
            });

            const Transcription = await payload.create<'user-transcriptions'>({
                collection: 'user-transcriptions',
                data: {
                    audio: audioId,
                    transcriptionText:  resp.text,
                },
                user: user.id,
                overrideAccess: false,
            })

            res.status(200).json(Transcription);
        } catch (error) {
            console.log(error, '<----------- error');
            res.status(500).json({ error: 'Error transcribing audio' });
        }
    }

    if (fileSizeInMegabytes > 24) {

        // TODO: update to async
        const audioFile = fs.readFileSync(filePath);

        const blob = new Blob([audioFile], {
            // @ts-ignore
            type: mime.getType(audio.filename)
        });

        const formData = new FormData();
        formData.append('audio', blob, audio.filename);

        try {
            const resAudio = await axios.post('http://python:5000/split-audio', formData, {
                // headers: formData.getHeaders()
                maxBodyLength: Infinity,
            })
            // Handle the response from the Flask application
            console.log(resAudio.data, '<----------- resAudio.data')
            const fullText = resAudio.data.full_text;
            console.log('Full Text:', fullText);


            const [createdTranscription, createdTranscriptionError] = await tryCatch(payload.create<'user-transcriptions'>({
                collection: 'user-transcriptions',
                data: {
                    audio: audioId,
                    transcriptionText: resAudio.data.full_text
                },
                user: user.id,
                overrideAccess: false,
            }))

            if (createdTranscriptionError) {
                console.log(createdTranscriptionError, '<----------- createdTranscriptionError');
                res.status(500).json({ error: 'Error updating transcription' });
            }

            // TODO: create metric
            // const [metric, metricError] = await tryCatch(payload.create<'metrics'>({
            //   collection: 'metrics',
            //   data: {
            //     value: {
            //       audioLength: audioDuration,
            //     },
            //     user: user.id,
            //   }
            // }));

            // if (metricError) {
            //   console.log(metricError, '<----------- metricError');
            //   res.status(500).json({ error: 'Error creating metric' });
            // }

            // console.log(metric, '<----------- metric');

            res.status(200).json(createdTranscription);
        } catch (error) {
            console.log(error, '<----------- error');
            res.status(500).json({ error: 'Error updating transcription' });
        }
    }

}