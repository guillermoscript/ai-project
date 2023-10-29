import type { PayloadHandler } from 'payload/config'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2022-08-01',
})

export const createPaymentSession: PayloadHandler = async (req, res): Promise<void> => {
    const { user, payload } = req

    if (!stripe) {
        res.status(500).json({ error: 'Stripe not configured' })
        return
    }

    if (!user) {
        res.status(401).send('Unauthorized')
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

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer: stripeCustomerID,
            mode: 'setup',
            success_url: 'http://localhost:3001/checkout/success',
            cancel_url: 'http://localhost:3001/checkout/cancel',
        });

        const paymentMethod = await payload.create<'payment-methods'>({
            collection: 'payment-methods',
            data: {
                paymentsOfUser: typeof user === 'string' ? user : user.id,
                title: 'Stripe Payment Method',
                paymentMethodType: 'stripe',
                stripe: {
                    stripePaymentMethodId: session.id,
                }

            },
        })

        if (!paymentMethod) {
            throw new Error('Payment method not found')
        }

        res.status(200).json({ url: session.url })

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}
