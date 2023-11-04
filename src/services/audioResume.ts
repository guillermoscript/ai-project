
import type OpenAI from 'openai'

import { createChatCompletition } from './createChatCompletition'
import { audioTranscription } from './audioTranscription'



type audioResumeParams = {
    openai: OpenAI
    filePath: string
}

export async function audioResume({
    openai,
    filePath
}: audioResumeParams) { 
    try {
        
        const transcription = await audioTranscription({
            openai,
            filePath
        })

        console.log(transcription, '<----------- transcription')

        // const keyPointsExtraction = "Eres un experto en destilar la información en puntos clave. Basándose en el siguiente texto, identifique y enumere los puntos principales que se debatieron o sacaron a colación. Deben ser las ideas, conclusiones o temas más importantes que son cruciales para la esencia de la discusión. Tu objetivo es proporcionar una lista que alguien pueda leer para comprender rápidamente de qué se habló."
        // const actionItemExtraction = "Eres un experto en analizar conversaciones y extraer elementos de acción. Por favor, revisa el texto e identifica las tareas, asignaciones o acciones que se acordaron o mencionaron como necesarias. Puede tratarse de tareas asignadas a personas concretas o de acciones generales que el grupo haya decidido emprender. Enumere estos puntos de acción de forma clara y concisa."
        // const sentimentAnalysis = "Como IA experta en análisis del lenguaje y las emociones, su tarea consiste en analizar el sentimiento del siguiente texto. Tenga en cuenta el tono general de la discusión, la emoción transmitida por el lenguaje utilizado y el contexto en el que se utilizan las palabras y frases. Indique si el sentimiento es en general positivo, negativo o neutro, y explique brevemente su análisis cuando sea posible."
        const keyPointsExtraction = "You are an expert at distilling information into key points. Based on the following text, identify and list the main points that were discussed or brought up. These should be the most important ideas, conclusions, or themes that are crucial to the essence of the discussion. Your goal is to provide a list that someone can read to quickly understand what was discussed."
        const actionItemExtraction = "You are an expert at analyzing conversations and extracting action items. Please review the text and identify the tasks, assignments or actions that were agreed upon or mentioned as necessary. These may be tasks assigned to specific individuals or general action items that the group has decided to undertake. List these action items clearly and concisely."
        const sentimentAnalysis = "As an AI expert in language and emotion analysis, your task is to analyze the sentiment of the following text. Consider the overall tone of the discussion, the emotion conveyed by the language used, and the context in which the words and phrases are used. Indicate whether the sentiment is generally positive, negative, or neutral, and briefly explain your analysis where possible."

        const [keyPoints,keyPointsError] = await createChatCompletition({
            transcription, systemPrompt: keyPointsExtraction, openai
        })
        const [actionItems, actionItemsError ] = await createChatCompletition({
            transcription, systemPrompt: actionItemExtraction, openai
        })
        // const sentiment = await createChatCompletition({
        //     transcription, systemPrompt: sentimentAnalysis, openai
        // })
        if (!keyPoints || !actionItems || keyPointsError || actionItemsError) {
            throw new Error('Error creating chat completition')
        }

        const response = {
            keyPoints: keyPoints,
            actionItems: actionItems,
            transcription,
            // sentiment: sentiment.data
        }

        return response

    } catch (error) {
        console.log(error, '<----------- error');
        throw error
    }
}

