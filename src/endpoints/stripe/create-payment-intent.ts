import type { PayloadHandler } from 'payload/config'
import Stripe from 'stripe'
import { getProductData } from '../../utilities/functions'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2022-08-01',
})

// this endpoint creates a `PaymentIntent` with the productId passed in the body
// 
// once completed, we pass the `client_secret` of the `PaymentIntent` back to the client which can process the payment
export const createPaymentIntent: PayloadHandler = async (req, res): Promise<void> => {
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

    try {
        let stripeCustomerID = fullUser?.stripeCustomerID

        // lookup user in Stripe and create one if not found
        if (!stripeCustomerID) {
            const customer = await stripe.customers.create({
                email: fullUser?.email,
                name: fullUser?.firstName + ' ' + fullUser?.lastName,
            })

            stripeCustomerID = customer.id

            await payload.update({
                collection: 'users',
                id: user?.id,
                data: {
                    stripeCustomerID,
                },
            })
        }

        const { total, currencySymbol, product } = await getProductData({
            productId,
            payload,
        })


        const paymentIntent = await stripe.paymentIntents.create({
            customer: stripeCustomerID,
            amount: total,
            setup_future_usage: 'off_session',
            currency: currencySymbol,
            automatic_payment_methods: {
                enabled: true,
            },
        })

        res.send({ client_secret: paymentIntent.client_secret })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        payload.logger.error(message)
        res.json({ error: message })
    }
}
