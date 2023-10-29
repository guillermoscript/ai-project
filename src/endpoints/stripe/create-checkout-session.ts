import { Payload } from 'payload'
import type { PayloadHandler } from 'payload/config'
import Stripe from 'stripe'
import { getProductData } from '../../utilities/functions'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2022-08-01',
})

// this endpoint creates a `PaymentIntent` with the productId passed in the body
// 
// once completed, we pass the `client_secret` of the `PaymentIntent` back to the client which can process the payment
export const createCheckoutSession: PayloadHandler = async (req, res): Promise<void> => {
    const { user, payload, body: { productId } } = req

    if (!stripe) {
        res.status(500).json({ error: 'Stripe not configured' })
        return
    }

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
            payload,
            productId,
        })

        console.log(total, '<----------- total')

        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: currencySymbol,
                        product_data: {
                            name: product.name,
                        },
                        unit_amount: total * 100,
                    },
                    quantity: 1,
                },
            ],
            customer: stripeCustomerID,
            payment_intent_data: {
                setup_future_usage: 'off_session',
            },
            mode: 'payment',
            success_url: 'http://localhost:3001/checkout/success',
            cancel_url: 'http://localhost:3001/checkout/cancel',
            metadata: {
                productId: productId,
            },
        });

        // add payment method to user
        const paymentMethod = await payload.create<'payment-methods'>({
            collection: 'payment-methods',
            data: {
                title: 'Stripe card',
                paymentMethodType: 'stripe',
                paymentsOfUser: typeof user === 'string' ? user : user?.id,
                default: true,
            },
        })

        res.status(200).json({ url: session.url })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}
