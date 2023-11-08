import { Payload } from 'payload'
import type { PayloadHandler } from 'payload/config'
import { Order, User } from 'payload/generated-types'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2022-08-01',
})

// this endpoint creates a `PaymentIntent` with the productId passed in the body
// 
// once completed, we pass the `client_secret` of the `PaymentIntent` back to the client which can process the payment
export const chargeCheckoutSession: PayloadHandler = async (req, res): Promise<void> => {
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

        payload.logger.info(`Creating payment intent for ${currencySymbol}${total} for user ${user?.id}`)

        const paymentMethods = await stripe.customers.listPaymentMethods(
            fullUser.stripeCustomerID,
            { type: 'card' }
        );

        payload.logger.info(`Found ${JSON.stringify(paymentMethods.data)}} payment methods for user ${user?.id}`)

        const paymentIntent = await stripe.paymentIntents.create({
            amount: total * 100,
            currency: currencySymbol,
            // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
            automatic_payment_methods: { enabled: true },
            customer: stripeCustomerID,
            payment_method: paymentMethods.data[0].id,
            return_url: `${process.env.PAYLOAD_PUBLIC_SITE_URL}/checkout/success`,
            off_session: true,
            confirm: true,
        });

        // add payment method to user
        const paymentMethod = await payload.update<'payment-methods'>({
            collection: 'payment-methods',
            where: {
                and: [
                    {
                        paymentsOfUser: {
                            equals: user?.id
                        }
                    },
                    {
                        default: {
                            equals: true
                        }
                    },
                    {
                        paymentMethodType: {
                            equals: 'stripe'
                        }
                    }
                ]
            },
            data: {
                stripe: {
                    stripePaymentMethodId: paymentMethods.data[0].id
                }
            }
        })

        res.status(200).json({ client_secret: paymentIntent.client_secret, url: paymentIntent.next_action?.redirect_to_url?.url })

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}


export async function chargeStripeUser(user: User, order: Order, payload: Payload) {
    const fullUser = await payload.findByID({
        collection: 'users',
        id: user?.id,
    })

    if (!fullUser) {

        return [null, new Error('User not found')]
    }

    try {
        let stripeCustomerID = fullUser?.stripeCustomerID

        // lookup user in Stripe and create one if not found
        let total = 0

        console.log(order, '<----------- order.products');

        const product = await payload.findByID<'products'>({
            collection: 'products',
            id: typeof order.products[0] === 'string' ? order.products[0] : order.products[0]?.id,
        })

        if (!product) {
            return [null, new Error('Product not found')]
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

        payload.logger.info(`Creating payment intent for ${currencySymbol}${total} for user ${user?.id}`)

        const userHaveAlreadyPaymentMethod = await payload.find({
            collection: 'payment-methods',
            where: {
                and: [
                    {
                        paymentsOfUser: {
                            equals: user?.id
                        }
                    },
                    {
                        default: {
                            equals: true
                        }
                    },
                    {
                        paymentMethodType: {
                            equals: 'stripe'
                        }
                    },
                    {
                        'stripe.stripePaymentMethodId': {
                            exists: true
                        }
                    }
                ]
            }
        })
        let paymentMethods = null

        if (userHaveAlreadyPaymentMethod.totalDocs === 0) {

            paymentMethods = await stripe.customers.listPaymentMethods(
                fullUser.stripeCustomerID,
                { type: 'card' }
            );
            paymentMethods = paymentMethods.data[0].id
        } else {
            paymentMethods = userHaveAlreadyPaymentMethod.docs[0].stripe.stripePaymentMethodId
        }

        payload.logger.info(`Found payment methods for user ${user?.id}`)

        const paymentIntent = await stripe.paymentIntents.create({
            amount: total * 100,
            currency: currencySymbol,
            // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
            automatic_payment_methods: { enabled: true },
            customer: stripeCustomerID,
            payment_method: paymentMethods,
            return_url: 'http://localhost:3001/checkout/success',
            off_session: true,
            confirm: true,
            metadata: {
                orderId: order.id
            }
        });

        if (userHaveAlreadyPaymentMethod.totalDocs > 0) {
            // add payment method to user
            const paymentMethod = await payload.update<'payment-methods'>({
                collection: 'payment-methods',
                where: {
                    and: [
                        {
                            paymentsOfUser: {
                                equals: user?.id
                            }
                        },
                        {
                            default: {
                                equals: true
                            }
                        },
                        {
                            paymentMethodType: {
                                equals: 'stripe'
                            }
                        }
                    ]
                },
                data: {
                    stripe: {
                        stripePaymentMethodId: paymentMethods
                    }
                }
            })
        }

        return [paymentIntent, null]

    } catch (error) {
        return [null, error]
    }
}
