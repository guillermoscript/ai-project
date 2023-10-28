import { Payload } from "payload";

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getProductData({
    payload,
    productId,
}: {
    payload: Payload
    productId: string
}) {
    let total = 0

    const product = await payload.findByID<'products'>({
        collection: 'products',
        id: productId,
    })

    if (!product) {
        throw new Error('Product not found')
    }

    // add the price of the product to the total
    const priceId = typeof product.price === 'string' ? product.price : product.price?.id

    if (!priceId) {
        throw new Error('Product price not found')
    }

    const price = await payload.findByID<'product-prices'>({
        collection: 'product-prices',
        id: priceId,
    })

    if (!price) {
        throw new Error('Product price not found')
    }

    total += price.price

    const currencyId = typeof price.currency === 'string' ? price.currency : price.currency?.id

    if (!currencyId) {
        throw new Error('Product currency not found')
    }

    const currency = await payload.findByID<'currencies'>({
        collection: 'currencies',
        id: currencyId,
    })

    if (!currency) {
        throw new Error('Product currency not found')
    }

    const currencySymbol = currency.code

    return {
        total,
        currencySymbol,
        product
    }
}