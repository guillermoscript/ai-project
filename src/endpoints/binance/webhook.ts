import { PayloadHandler } from "payload/config";
import crypto from 'crypto';
import payload from "payload";

export interface WebhookOrderResponse {
    bizType: 'PAY' | 'REFUND'
    data: string
    bizId: number
    bizStatus: 'PAY_SUCCESS' | 'PAY_FAILED' | 'REFUND_SUCCESS' | 'REFUND_FAILED' | string
}


function verifySignature(payload, decodedSignature, publicKey) {
    const verifier = crypto.createVerify('sha256');
    verifier.update(payload);
    const signatureBuffer = Buffer.from(decodedSignature, 'base64');
    const publicKeyBuffer = Buffer.from(publicKey, 'utf8');
    return verifier.verify(publicKeyBuffer, signatureBuffer);
}

export const binanceWebhookHandler: PayloadHandler = async (req, res): Promise<void> => {
    const { body } = req

    const publicKey = process.env.BINANCE_API_KEY_PUBLIC || '';
    const signature = req.headers['binancepay-signature'] as string;
    const decodedSignature = Buffer.from(signature, 'base64').toString('utf8');
    const isVerified = verifySignature(body, decodedSignature, publicKey);
    console.log(isVerified, '<----------- isVerified')

    console.log(body, '<----------- body')
    console.log(req.headers, '<----------- req.headers')

    try {
        const {bizStatus, bizType, data} = body as WebhookOrderResponse;

        if (!isVerified) {
            throw new Error('Signature verification failed');
        }

        if (bizType !== 'PAY') {
            throw new Error('Webhook is not a payment');
        }

        if (bizStatus !== 'PAY_SUCCESS') {
            throw new Error('Payment was not successful');
        }

        const orderData = JSON.parse(data);

        console.log(orderData, '<----------- orderData')

        const orderId = orderData.merchantTradeNo;

        const order = await payload.update<'orders'>({
            collection: 'orders',
            id: orderId,
            data: {
                status: 'active',
            }
        })

        console.log(order, '<----------- order')

        // TODO: Save the order to the database
        res.status(200).json({ "returnCode": "SUCCESS", "returnMessage": null });
    } catch (error) {
        console.log(error, '<----------- error');
        res.status(500).send(error);
    }
}
