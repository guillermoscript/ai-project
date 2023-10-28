import { Order, Plan, Product, Subscription, User } from '../../../payload-types';
import { Payload } from "payload";
import createSubscriptionDto, { SubscriptionCreateDto } from '../dto/createSubscriptionDto';
import { Message } from 'payload/dist/email/types';
import tryCatch from '../../../utilities/tryCatch';
import { noReplyEmail } from '../../../utilities/consts';

export async function sendUserEmail(userId: Order['customer'], payload: Payload) {
    
    const [user, userError] = await tryCatch<User>(payload.findByID({
        collection: 'users',
        id: userId as string,
    }))

    if (userError) return

    const mailOptions: Message = {
        from: noReplyEmail,
        to: user?.email as string,
        subject: 'Su compra ha sido exitosa',
        html: `<h1>Gracias por comprar</h1>`,
    };
    payload.sendEmail(mailOptions)
}

export async function newCreateSubscription(plans: Plan[], payload: Payload, docType: Order, productThatArePlans: Product[]) {
    
    const subscriptionData = productThatArePlans.map((product,index) => {
        const planId = plans[index].id as string
        const planPeriodicity = plans[index].periodicity
        const planFunctionalities = plans[index].functionalities
        return createSubscriptionDto(docType, product, planId, planPeriodicity, planFunctionalities)
    })
    
    let subscriptions: Subscription[] = []
    let error: Error[] = []

    for (const subscription of subscriptionData) {
        const [subscriptionDoc, subscriptionError] = await tryCatch<Subscription>(payload.create({
            collection: 'subscriptions',
            data: subscription as SubscriptionCreateDto,
        }))

        if (subscriptionError) {
            console.error(subscriptionError)
            error.push(subscriptionError)
            break
        }

        subscriptions.push(subscriptionDoc as Subscription)
    }

    return error.length > 0 ? [null, error] : [subscriptions, null]
}
