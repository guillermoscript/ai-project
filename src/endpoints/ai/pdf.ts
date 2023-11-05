import fs from 'fs';
import path from 'path';
import { PayloadHandler } from "payload/config";
import { srcPath } from "../../payload.config";
import axios from "axios";
import mime from 'mime';

export const UploadUserPdf: PayloadHandler = async (req, res): Promise<void> => {

    const { documentId, chatId } = req.body

    if (!documentId) {
        res.status(400).send('Bad request')
        return
    }

    if (!chatId) {
        res.status(400).send('Bad request')
        return
    }

    const userDocuments = await req.payload.findByID<'user-documents'>({
        collection: 'user-documents',
        id: documentId
    });

    

    const filePath = path.join(srcPath, 'user-documents', userDocuments.filename)

    // TODO: update to async
    const pdfFile = fs.readFileSync(filePath);

    const blob = new Blob([pdfFile], {
        // @ts-ignore
        type: mime.getType(userDocuments.filename)
    });


    const formData = new FormData();
    formData.append('pdf', blob, userDocuments.filename);
    formData.append('chat_id', chatId)
    formData.append('document_id', documentId)

    try {
        const resPdf = await axios.post('http://python:5000/process-pdf', formData, {
            // headers: formData.getHeaders()
            maxBodyLength: Infinity,
        })
        // Handle the response from the Flask application
        console.log(resPdf.data, '<----------- resAudio.data')


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

        res.status(200).json(resPdf.data);
    } catch (error) {
        console.log(error, '<----------- error');
        res.status(500).json({ error: 'Error on pdf' });
    }

}