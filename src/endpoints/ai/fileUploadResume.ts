import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import mime from 'mime';
import { PayloadHandler } from "payload/config";
import { srcPath } from "../../payload.config";
import { audioResume } from '../../services/audioResume';
import OpenAI from 'openai';


require('dotenv').config();
const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_KEY,
    timeout: 90000,
});

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

        return
    } catch (error) {
        console.log(error, '<----------- error');
        res.status(500).json({ error: 'Error transcribing audio' });
    }
    // } else {
    //   res.status(401).json({ message: 'Unauthorized' });
    // }
}
