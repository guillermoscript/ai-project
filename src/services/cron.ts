// import cron from "node-cron";
import payload from 'payload';
import { PaginatedDocs } from "payload/dist/mongoose/types";
import { Order, Subscription, User } from "../payload-types";
import tryCatch from "../utilities/tryCatch";
import { noReplyEmail } from "../utilities/consts";
import { BulkOperationResult } from "payload/dist/collections/config/types";
import { chargeStripeUser } from '../endpoints/stripe/charge-session-checkout';
const todayDate = new Date().toISOString().substring(0, 10);

async function findPastDueDateSubscription(): Promise<[PaginatedDocs<Subscription> | null, Error | null]> {
    const [subscriptions, subError] = await tryCatch<PaginatedDocs<Subscription>>(payload.find({
        collection: 'subscriptions',
        where: {
            and: [
                {
                    status: {
                        equals: 'active'
                    },
                },
                {
                    endDate: {
                        less_than: todayDate
                    }
                }
            ]
        }
    }))

    if (subError) {
        console.log(subError, '<----------- subError');
        return [null, subError]
    }

    // console.log(subscriptions, '<----------- subscriptions');
    return [subscriptions, null]
}

async function setAsInactiveSubscription(subscriptions: Subscription[]) {
    let updatedSubs = []
    for (const subscription of subscriptions) {
        const [updatedSubscription, updatedSubscriptionError] = await tryCatch<Subscription>(payload.update({
            collection: 'subscriptions',
            id: subscription.id,
            data: {
                status: 'inactive'
            }
        }))

        if (updatedSubscriptionError) {
            console.log(updatedSubscriptionError, '<----------- updatedSubscriptionError');
            return [null, updatedSubscriptionError]
        }

        // console.log(updatedSubscription, '<----------- updatedSubscription');
        updatedSubs.push(updatedSubscription)
    }

    return [updatedSubs, null]
}

async function setAsInactiveOrder(orders: string[]) {
    let updatedOrders = []
    for (const order of orders) {
        const [updatedOrder, updatedOrderError] = await tryCatch<Order>(payload.update({
            collection: 'orders',
            id: order,
            data: {
                status: 'finished'
            }
        }))

        if (updatedOrderError) {
            console.log(updatedOrderError, '<----------- updatedOrderError');
            return [null, updatedOrderError]
        }

        // console.log(updatedOrder, '<----------- updatedOrder');
        updatedOrders.push(updatedOrder)
    }

    return [updatedOrders as Order[], null]
}

// TODO que pasa si la persona paga antes? no se deberia crear una nueva orden
async function createRenewalOrder(orders: Order[]): Promise<[Order[] | null, Error | null]> {


    let newOrders = []
    for (const myorder of orders) {

        const userId = myorder.customer === 'string' ? myorder.customer : (myorder?.customer as User)?.id
        const productsIds = (myorder.products as any[]).map((product) => {
            return typeof product === 'string' ? product : product?.id
        })
        console.log(productsIds, '<----------- productsIds');
        const [order, orderError] = await tryCatch(payload.create({
            collection: 'orders',
            data: {
                products: productsIds,
                status: 'pending',
                type: 'renewal',
                customer: userId,
                amount: myorder.amount,
            }
        }))

        if (orderError) {
            console.log(orderError, '<----------- orderError');
            return [null, orderError]
        }

        newOrders.push(order)
    }

    return [newOrders, null]
}

export async function runInactivateSubscriptionAndCreateRenewalOrder() {
    
    const [subscriptions, subError] = await findPastDueDateSubscription()

    if (subError) {
        return [null, subError]
    }

    const [updatedSubscriptions, updatedSubError] = await setAsInactiveSubscription(subscriptions?.docs as Subscription[])

    if (updatedSubError) {
        return [null, updatedSubError]
    }

    const ordersIds = subscriptions?.docs.map((subscription) => {
        return typeof subscription.order === 'string' ? subscription.order : subscription?.order?.id
    })

    const [inactivatedOrders, inactivatedOrdersError] = await setAsInactiveOrder(ordersIds as string[])

    if (inactivatedOrdersError) {
        return [null, inactivatedOrdersError]
    }

    const uniqueInactiveOrder = (inactivatedOrders as Order[])?.filter((order, index, self) => {
        return self.findIndex((t) => t.id === order.id) === index
    })

    const [newOrders, newOrdersError] = await createRenewalOrder(uniqueInactiveOrder)

    if (newOrdersError) {
        return [null, newOrdersError]
    }

    const ordersFromStripeUsers = newOrders?.map((order) => {
        return typeof order.customer === 'string' ? order.customer : order.customer?.id
    }).filter((order, index, self) => {
        return self.findIndex((t) => t === order) === index
    })

    console.log(ordersFromStripeUsers)

    const [stripeUsers, stripeUsersError] = await tryCatch(payload.find<'payment-methods'>({
        collection: 'payment-methods',
        where: {
            and: [
                {
                    paymentsOfUser: {
                        in: ordersFromStripeUsers as string[]
                    }
                },
                {
                    default: {
                        equals: true
                    }
                },
                // {
                //     'stripe.stripePaymentMethodId': {
                //         exists: true
                //     }
                // }
            ]
        },
        depth: 3
    }))

    console.log(stripeUsers, '<----------- stripeUsers')

    if (stripeUsersError) {
        return [null, stripeUsersError]
    }

    let stripeResponse = []
    
    for (let i = 0; i < stripeUsers?.docs.length; i++) {
        const stripeUser = stripeUsers.docs[i];
        try {
            
            const responsePaymentIntent = await chargeStripeUser(stripeUser.paymentsOfUser as User, newOrders?.filter((order) => {
                const orderId = typeof order.customer === 'string' ? order.customer : order.customer?.id
                const userId = typeof stripeUser.paymentsOfUser === 'string' ? stripeUser.paymentsOfUser : stripeUser.paymentsOfUser?.id
                return orderId === userId
            }
            )[0], payload)

            console.log(responsePaymentIntent, '<----------- responsePaymentIntent');

            stripeResponse.push(responsePaymentIntent)

        } catch (error) {
            console.log(error, '<----------- error');
            return [null, error]
        }
    }

    

    // payload.sendEmail({
    //     to: 'arepayquezo@gmail.com',
    //     from: noReplyEmail
    //     subject: 'Subscription Renewal',
    //     html: 'Your subscription has been renewed'
    // })

    console.log("Finished running inactivate subscription and create renewal order");

    return [{
        stripeResponse,
        stripeUsers,
        newOrders,
        inactivatedOrders,
        updatedSubscriptions,
        subscriptions
    }, null]
}


//TODO Fix docker error
/**
 * Run every day at 1:00 am
 * 0 1 * * *
 * 
 */
// export const cronJob = () => {
//     cron.schedule('0 1 * * *', () => {
//         console.log('Running a task every midnight (1:00 am)')
//         runInactivateSubscriptionAndCreateRenewalOrder().then((result) => {
//             console.log(result, '<----------- result');
//         }).catch((error) => {
//             console.log(error, '<----------- error');
//         })
//     })
// }