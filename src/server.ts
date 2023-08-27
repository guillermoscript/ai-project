import path from 'path';
import express from 'express';
import payload from 'payload';
import fs from 'fs';
import { Readable } from 'stream';
import { OpenAI } from 'openai'
import { PayloadRequest } from 'payload/types';
import tryCatch from './utilities/tryCatch';
import { PaginatedDocs } from 'payload/dist/mongoose/types';
import { Subscription } from './payload-types';
import { StatusCodes } from 'http-status-codes';


require('dotenv').config();
const app = express();

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
  timeout: 30000,
});

const  bufferToStream = (buffer: Buffer) => {
  return  Readable.from(buffer);
}
// Redirect root to Admin panel
app.get('/', (_, res) => {
  res.redirect('/admin');
});



const start = async () => {
  // Initialize Payload
  
  const secret = process.env.PAYLOAD_SECRET
  const mongoURL = process.env.MONGODB_URI

  if (!secret) {
    throw new Error('Missing env var: PAYLOAD_SECRET')
  }

  if (!mongoURL) {
    throw new Error('Missing env var: MONGODB_URI')
  }

  await payload.init({
    secret,
    mongoURL,  express: app,
    onInit: async () => {
      payload.logger.info(`Payload Admin URL: ${payload.getAdminURL()}`)
    },
  })

  // TODO: add auth middleware to check if user is logged in and check if route works good
  // Add your own express routes here
  app.post('/api/files/upload', async (req, res) => {
    const request = req as PayloadRequest
    const audioFile = request.files?.file 

    const { user, payload } = request

    // if (!user) {
    //   return res.status(401).json({ message: 'Unauthorized' });
    // }

    if (!audioFile) {
    return res.status(400).json({ message: 'Audio file is required.' });
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

    // if (subError) {
    //   return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Error getting active subscriptions', error: subError });
    // }

    // if (activeSubscriptions?.docs.length === 0) {
    //   return res.status(StatusCodes.BAD_REQUEST).json({ message: 'No active subscription found' });
    // }

    // if (activeSubscriptions || user.role === 'admin') {
      try {
        const audioStream = bufferToStream(audioFile.data);
  
        // Write the audio file to a new file in a folder
        const filePath = path.join(__dirname, 'audio', audioFile.name);
        const fileStream = fs.createWriteStream(filePath);
        audioStream.pipe(fileStream);
  
        fileStream.on('finish', async () => {
          try {
            const resp = await openai.audio.transcriptions.create(
              // @ts-ignore
              fs.createReadStream(filePath), // Audio file
              "whisper-1", // Whisper model name. 
            );
            const transcription = resp.text;
  
            // Delete the file from the server
            fs.unlinkSync(filePath);
  
            const keyPointsExtraction = "Eres un experto en destilar la información en puntos clave. Basándose en el siguiente texto, identifique y enumere los puntos principales que se debatieron o sacaron a colación. Deben ser las ideas, conclusiones o temas más importantes que son cruciales para la esencia de la discusión. Tu objetivo es proporcionar una lista que alguien pueda leer para comprender rápidamente de qué se habló."
            const actionItemExtraction = "Eres un experto en analizar conversaciones y extraer elementos de acción. Por favor, revisa el texto e identifica las tareas, asignaciones o acciones que se acordaron o mencionaron como necesarias. Puede tratarse de tareas asignadas a personas concretas o de acciones generales que el grupo haya decidido emprender. Enumere estos puntos de acción de forma clara y concisa."
            const sentimentAnalysis = "Como IA experta en análisis del lenguaje y las emociones, su tarea consiste en analizar el sentimiento del siguiente texto. Tenga en cuenta el tono general de la discusión, la emoción transmitida por el lenguaje utilizado y el contexto en el que se utilizan las palabras y frases. Indique si el sentimiento es en general positivo, negativo o neutro, y explique brevemente su análisis cuando sea posible."
  
            const keyPoints = await createChatCompletition(transcription, keyPointsExtraction)
            const actionItems = await createChatCompletition(transcription, actionItemExtraction)
            const sentiment = await createChatCompletition(transcription, sentimentAnalysis)
  
            res.json({
              transcription,
              keyPoints,
              actionItems,
              sentiment
            });
  
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
  });



  app.listen(3000);
}

start();


async function createChatCompletition(transcription: string, systemPrompt: string) {

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-16k",
    messages: [{
        "role": "system",
        "content": systemPrompt
    },
    {
        "role": "user",
        "content": transcription
    }],
    temperature: 0,
    max_tokens: 14324,
    // frequency_penalty: 0.14,
    // presence_penalty: 0.15,
  });

  return response?.choices[0].message
}