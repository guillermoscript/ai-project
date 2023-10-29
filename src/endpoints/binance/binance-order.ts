import crypto from 'crypto';
import axios from 'axios';
import { PayloadHandler } from 'payload/config';
import { getProductData } from '../../utilities/functions';

interface BinanceOrderResponse {
    status: string
    code: string
    data: BinanceOrderData
    errorMessage: string
}

interface BinanceOrderData {
    prepayId: string
    terminalType: string
    expireTime: number
    qrcodeLink: string
    qrContent: string
    checkoutUrl: string
    deeplink: string
    universalUrl: string
    totalFee: string
    currency: string
}



async function createOrder(payload, secretKey) {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    const requestBody = {
        ...payload,
        env: {
            terminalType: 'WEB'
        },
    };
    const signature = crypto.createHmac('sha512', secretKey)
        .update(`${timestamp}\n${nonce}\n${JSON.stringify(requestBody)}\n`)
        .digest('hex')
        .toUpperCase();
    const headers = {
        'Content-Type': 'application/json',
        'BinancePay-Timestamp': timestamp,
        'BinancePay-Nonce': nonce,
        'BinancePay-Certificate-SN': process.env.BINANCE_API_KEY,
        'BinancePay-Signature': signature
    };
    
    try {
        const response = await axios.post('https://bpay.binanceapi.com/binancepay/openapi/v3/order', requestBody, { headers });
        return response.data;
    } catch (error) {
        console.log(error, '<----------- error');
        throw error;
    }
}

export const binanceOrderCreationHandler: PayloadHandler = async (req, res): Promise<void> => {
    const { user, payload, body: { productId } } = req

    if (!user) {
        res.status(401).send('Unauthorized')
        return
    }
    if (!productId) {
        res.status(400).json({ error: 'Missing product ID' })
        return
    }

    const fullUser = await payload.findByID({
        collection: 'users',
        id: user?.id,
    })

    if (!fullUser) {
        res.status(404).json({ error: 'User not found' })
        return
    }

    const { total, currencySymbol, product } = await getProductData({
        productId,
        payload,
    })

    const userOrder = await payload.create({
        collection: 'orders',
        data: {
            customer: user.id,
            products: productId,
            amount: total,
            status: 'pending',
            type: 'subscription'
        },
    })

    const bodyToSend = {
        "merchantTradeNo": userOrder.id,
        "orderAmount": 0.1,
        "currency": "USDT",
        "buyer": {
            "buyerEmail": fullUser.email,
            "buyerName": {
                "firstName": fullUser.firstName,
                "lastName": fullUser.lastName
            },
        },
        "description": `Payment for ${product.name}`,
        "webhookUrl": "",
        "goodsDetails": [{
            "goodsType": "02",
            "goodsCategory": "Z000",
            "referenceGoodsId": productId,
            "goodsName": product.name,
            "goodsDetail": product.description,
        }]
    };

    // const bodyToSend = {
    //     "merchantTradeNo": "545454537292", "orderAmount": 25.17, "currency": "USDT", "description": "very good Ice Cream", "goodsDetails": [{ "goodsType": "01", "goodsCategory": "D000", "referenceGoodsId": "7876763A3B", "goodsName": "Ice Cream", "goodsDetail": "Greentea ice cream cone" }]
    // }
    
    const secretKey = process.env.BINANCE_API_KEY_SECRET || '';
    
    try {
        const order: BinanceOrderResponse = await createOrder(bodyToSend, secretKey)
        if (order.status === 'SUCCESS') {
            res.status(200).json({
                ...order,
                url: order.data.checkoutUrl,
            });
        }
    } catch (error) {
        console.log(error, '<----------- error');
        res.status(500).send(error);
    }
}
