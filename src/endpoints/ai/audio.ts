import { PayloadHandler } from "payload/config";
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { audioResume, audioTranscription, createChatCompletition } from "../../services/openAi";
import { openai } from "../../server";
import { Audio, User, UserTranscription } from "payload/generated-types";
import tryCatch from "../../utilities/tryCatch";
import { StatusCodes } from "http-status-codes";
import axios from "axios";
import mime from 'mime';
import { srcPath } from "../../payload.config";

const bufferToStream = (buffer: Buffer) => {
    return Readable.from(buffer);
}

export const fileUploadResume: PayloadHandler = async (req, res): Promise<void> => {
    const request = req
    const audioFile = request.files?.file

    const { user, payload } = request

    // if (!user) {
    //   return res.status(401).json({ message: 'Unauthorized' });
    // }

    if (!audioFile) {
        res.status(400).json({ message: 'Audio file is required.' });
    }

    // // const [activeSubscriptions, subError] = await tryCatch<PaginatedDocs<Subscription>>(payload.find({
    // //   collection: 'subscriptions',
    // //   where: {
    // //     and: [
    // //       {
    // //         'user': {
    // //           equals: user.id
    // //         }
    // //       },
    // //       {
    // //         'status': {
    // //           equals: 'active'
    // //         }
    // //       }
    // //     ]
    // //   },
    // //   sort: '-createdAt',
    // // }));

    try {
        const audioStream = bufferToStream(audioFile.data);

        // Write the audio file to a new file in a folder
        const filePath = path.join(srcPath, 'audio', audioFile.name);
        const fileStream = fs.createWriteStream(filePath);
        audioStream.pipe(fileStream);

        fileStream.on('finish', async () => {
            try {
                const respoonse = await audioResume({
                    openai,
                    filePath,
                });

                console.log(respoonse, '<----------- respoonse');
                res.status(200).json(respoonse);

            } catch (error) {
                console.log(error, '<----------- error');
                res.status(500).json({ error: 'Error transcribing audio' });
            }
        });

        fileStream.on('error', (error) => {
            console.log(error, '<----------- error');
            res.status(500).json({ error: 'Error on writing audio file' });
        });

    } catch (error) {
        console.log(error, '<----------- error');
        res.status(500).json({ error: 'Error transcribing audio' });
    }
    // } else {
    //   res.status(401).json({ message: 'Unauthorized' });
    // }
}

export const transcriptionSummary: PayloadHandler = async (req, res): Promise<void> => {
    const {
        transcriptionId,
        options,
        max_tokens,
    } = req.body;

    const { user, payload } = req

    if (!transcriptionId) {
        res.status(400).json({ message: 'Transcription ID is required.' });
    }

    if (!options) {
        res.status(400).json({ message: 'Options are required.' });
    }

    const [transcription, transcriptionError] = await tryCatch<UserTranscription>(payload.findByID({
        collection: 'user-transcriptions',
        id: transcriptionId
    }))

    if (transcriptionError) {
        console.log(transcriptionError, '<----------- transcriptionError');
        res.status(500).json({ error: 'Error getting transcription' });
    }

    const commonOptions = {
        openai,
        transcription: transcription.transcriptionText,
        temperature: 0.19,
        max_tokens,
        top_p: 0.93,
        frequency_penalty: 0.41,
        presence_penalty: 0.29,
    };

    const cases = {
        'summary': async () => {
            const [response, responseError] = await createChatCompletition({
                ...commonOptions,
                systemPrompt: "Eres un experto en hacer resumenes, por favor haz un resumen de este texto, lo haras de la mejor manera posible. Pondras en practica todo lo que sabes sobre hacer resumenes. Con la mejor calidad posible y sin errores. Toda Tu respuesta debe ser en Markdown.",
            });

            if (responseError) {
                console.log(responseError, '<----------- responseError');
                throw responseError
            }

            return response
        },
        'keyPoints': async () => {
            const [response, responseError] = await createChatCompletition({
                ...commonOptions,
                systemPrompt: "Eres un experto en destilar la información en puntos clave. Basándose en el siguiente texto, identifique y enumere los puntos principales que se debatieron o sacaron a colación. Deben ser las ideas, conclusiones o temas más importantes que son cruciales para la esencia de la discusión. Tu objetivo es proporcionar una lista que alguien pueda leer para comprender rápidamente de qué se habló. Toda Tu respuesta debe ser en Markdown.",
            });

            if (responseError) {
                console.log(responseError, '<----------- responseError');
                throw responseError
            }

            return response
        },
        'actionItems': async () => {
            const [response, responseError] = await createChatCompletition({
                ...commonOptions,
                systemPrompt: "Eres un experto en analizar conversaciones y extraer elementos de acción. Por favor, revisa el texto e identifica las tareas, asignaciones o acciones que se acordaron o mencionaron como necesarias. Puede tratarse de tareas asignadas a personas concretas o de acciones generales que el grupo haya decidido emprender. Enumere estos puntos de acción de forma clara y concisa. Toda Tu respuesta debe ser en Markdown.",
            });

            if (responseError) {
                console.log(responseError, '<----------- responseError');
                throw responseError
            }

            return response
        },
        'sentimentAnalysis': async () => {
            const [response, responseError] = await createChatCompletition({
                ...commonOptions,
                systemPrompt: "Como IA experta en análisis del lenguaje y las emociones, su tarea consiste en analizar el sentimiento del siguiente texto. Tenga en cuenta el tono general de la discusión, la emoción transmitida por el lenguaje utilizado y el contexto en el que se utilizan las palabras y frases. Indique si el sentimiento es en general positivo, negativo o neutro, y explique brevemente su análisis cuando sea posible. Toda Tu respuesta debe ser en Markdown.",
            });

            if (responseError) {
                console.log(responseError, '<----------- responseError');
                throw responseError
            }

            return response
        },
    }


    // for each option on the cases object, if the option is on the options array, execute the function
    try {
        const response = await Promise.all(Object.keys(cases).map(async (option) => {
            if (options.includes(option)) {
                return await cases[option]()
            }
        }))

        console.log(response, '<----------- response')

        // update the transcription with the summary
        const updatedTranscription = await payload.update<'user-transcriptions'>({
            collection: 'user-transcriptions',
            where: {
                id: {
                    equals: transcriptionId
                }
            },
            data: {
                summary: response.filter((r) => r).map((option) => option.text)
                    // join the text of each option with a new line
                    .join('\n')
            }
        })

        const [metrics, metricsError] = await tryCatch(payload.create<'metrics'>({
            collection: 'metrics',
            data: {
                value: {
                    ...response.filter((r) => r).reduce((acc, option) => {
                        return {
                            ...acc,
                            ...option.usage,
                        }
                    }
                        , {})
                },
                user: user.id,
            }
        }));

        if (metricsError) {
            console.log(metricsError, '<----------- metricsError');
            res.status(500).json({ error: 'Error creating metric' });
        }

        console.log(metrics, '<----------- metrics')


        // return the response
        res.status(200).json(response);

    } catch (error) {
        console.log(error, '<----------- error');

        // check if the error is a string
        if (typeof error === 'string') {
            // if it is, return the error
            res.status(500).json({ error });
            // else if it is an object
        } else if (typeof error === 'object') {
            // check if it has a response property
            if (error.response) {
                // if it does, return the response
                res.status(500).json({ error: error.response.data });
            } else {
                // else return the error
                res.status(500).json({ error });
            }
        } else {
            // else return the error
            res.status(500).json({ error });
        }
    }
}

export const audioUpload: PayloadHandler = async (req, res): Promise<void> => {
    const { chatId, audioId } = req.body;
    const { payload } = req

    const [audio, audioError] = await tryCatch<Audio>(payload.findByID({
        collection: 'audios',
        id: audioId.id
    }))

    if (audioError) {
        console.log(audioError, '<----------- audioError');
        res.status(500).json({ error: 'Error getting audio' });
    }

    const filePath = path.join(srcPath, 'audios', audio.filename)
    console.log(filePath, "EL PATH")


    try {
        const response = await audioTranscription({
            openai,
            filePath,
        });

        const userResume = await payload.create<'messages'>({
            collection: 'messages',
            data: {
                chat: chatId.id,
                type: 'text',
                text: response,
                user: typeof audio.user === 'string' ? audio.user : audio.user.id,
            }
        })

        console.log(userResume, "EL USER RESUME")
        res.status(200).json(response);
    } catch (error) {
        console.log(error, '<----------- error');
        res.status(500).json({ error: 'Error transcribing audio' });
    }
}

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

            const response = await audioTranscription({
                openai,
                filePath,
            });

            const Transcription = await payload.create<'user-transcriptions'>({
                collection: 'user-transcriptions',
                data: {
                    audio: audioId,
                    transcriptionText: response,
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
