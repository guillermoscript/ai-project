import { PayloadHandler } from "payload/config";
import { UserTranscription } from "payload/generated-types";
import tryCatch from "../../utilities/tryCatch";
import { createChatCompletition } from "../../services/createChatCompletition";
import OpenAI from "openai";

require('dotenv').config();
const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_KEY,
    timeout: 90000,
});


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

        res.status(500).json({ error: 'Error on transcription summary' });
    }

    return null
}
