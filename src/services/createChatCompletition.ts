import OpenAI from "openai";
import tryCatch from "../utilities/tryCatch";

type createChatCompletitionParams = {
    transcription: string
    systemPrompt: string
    openai: OpenAI
    temperature?: number,
    max_tokens?: number,
    top_p?: number,
    frequency_penalty?: number,
    presence_penalty?: number,
}

export async function createChatCompletition({
    transcription,
    systemPrompt,
    openai,
    temperature,
    max_tokens,
    top_p,
    frequency_penalty,
    presence_penalty,
}: createChatCompletitionParams) {

    const [response, error] = await tryCatch(openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k-0613",
        messages: [{
            "role": "system",
            "content": systemPrompt
        },
        {
            "role": "user",
            "content": transcription
        }],
        
        temperature: temperature || 0.9,
        max_tokens: max_tokens || 15000,
        top_p: top_p || 1,
        frequency_penalty: frequency_penalty || 0.0,
        presence_penalty: presence_penalty || 0.6,
    }));

    if (error) {
        console.log(error, '<----------- error');
        return [null, error]
    }

    return [{
        usage: response.usage,
        text: response.choices[0].message.content
    }, null]
}
