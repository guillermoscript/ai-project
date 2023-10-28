
import { CollectionConfig, PayloadRequest } from 'payload/types';
import { anyone } from '../../access/anyone';
import { isAdmin } from '../../access/isAdmin';
import { createdByField } from '../../fields/createdBy';
import { lastModifiedBy } from '../../fields/lastModifiedBy ';
import { populateCreatedBy } from '../../hooks/populateCreatedBy';
import { populateLastModifiedBy } from '../../hooks/populateLastModifiedBy';
import { creationEmailNotification } from './hooks/creationEmailNotification';
import { slugField } from '../../fields/slug';
import { checkRole } from '../../access/checkRole';
import { Order, Plan, Product, User } from 'payload/generated-types';
import tryCatch from '../../utilities/tryCatch';
import { PaginatedDocs } from 'payload/dist/mongoose/types';
import { newCreateSubscription, sendUserEmail } from './hooks/createOrderAbleAfterChange';

// Example Collection - For reference only, this must be added to payload.config.ts to be used.

const Orders: CollectionConfig = {
    slug: 'orders',
    admin: {
        useAsTitle: 'id',
        hidden(args) {
            const {  user  } = args
            return !checkRole(['admin'], user as unknown as User)
        },
        group: 'Información de usuarios',
    },
    access: {
        create: anyone,
        read: ({ req: { user } }) => {

            if (!user) return false

            if (checkRole(['admin'], user)) return true
            
            return {
                customer: {
                    equals: user.id
                }
            }
        },
        // update: ({ req: { user } }) => {
        //     return isRole({ user, role: 'admin' }) || isRole({ user, roleerUser)
        // },
        delete: isAdmin
    },
    fields: [
        {
            name: 'amount',
            type: 'number',
            required: true,
            access: {
                update: ({ req: { user } }) => checkRole(['admin'], user as unknown as User)
            }
        },
        {
            name: 'status',
            type: 'radio',
            defaultValue: 'inactive',
            options: [ // required
                {
                    label: 'Activo',
                    value: 'active',
                },
                {
                    label: 'Inactivo',
                    value: 'inactive',
                },
                {
                    label: 'Cancelado',
                    value: 'canceled',
                },
                {
                    label: 'Pendiente',
                    value: 'pending',
                },
                {
                    label: 'Finalizada (Solo para renovaciones)',
                    value: 'finished',
                },
                {
                    label: 'Reembolsada',
                    value: 'refunded',
                }
            ],
        },
        {
            name: 'type',
            type: 'radio',
            defaultValue: 'order',
            options: [ // required
                {
                    label: 'Orden',
                    value: 'order',
                },
                {
                    label: 'Renovación',
                    value: 'renewal',
                },
                {
                    label: 'Suscripción',
                    value: 'subscription',
                }
            ],
            access: {
                update: ({ req: { user } }) => checkRole(['admin'], user as unknown as User)
            }
        },
        {
            name: 'customer',
            type: 'relationship',
            relationTo: 'users',
            hasMany: false,
            access: {
                update: ({ req: { user } }) => checkRole(['admin'], user as unknown as User)
            }
        },
        {
            name: 'products',
            type: 'relationship',
            relationTo: 'products',
            hasMany: true,
            access: {
                update: ({ req: { user } }) => checkRole(['admin'], user as unknown as User)
            }
        },
        {
            name: 'referenceNumber',
            type: 'text',
            label: 'Número de referencia',
        },
        {
            name: 'paymentMethod',
            type: 'relationship',
            relationTo: 'payment-methods',
            hasMany: false,
            access: {
                update: ({ req: { user } }) => checkRole(['admin'], user as unknown as User)
            }
        },
        {
            name: 'details',
            type: 'richText',
            label: 'Detalles',
            access: {
                update: ({ req: { user } }) => checkRole(['admin'], user as unknown as User)
            }
        },
        {
            name: 'total',
            type: 'text',
            label: 'Total',
            admin: {
                // hidden: true, // hides the field from the admin panel
            },
            access: {
                update: () => false, // prevents the field from being updated
                create: () => false, // prevents the field from being created
            },
        },
        createdByField(),
        lastModifiedBy(),
        slugField('id'),
    ],
    hooks: {
        afterChange: [
            creationEmailNotification,
            async ({ req, doc, operation }) => {
                // on create or update, if the order is active and is a renewal or subscription, create a new subscription
                if (doc?.status === 'active' && (doc?.type === 'renewal' || doc?.type === 'subscription')) {
                    await createNewSubOnOrderChange(doc as Order, req)
                }
            }
        ],
        beforeChange: [
            populateCreatedBy,
            populateLastModifiedBy,
            
        ]
    },
}

async function createNewSubOnOrderChange(docType: Order,req: PayloadRequest) {
    
    const { payload } = req

    const typeOfOrder = docType?.products?.map(product => {
        if (typeof product === 'string') {
            return product
        } else {
            return product.id
        }
    })

    const [purchasedProducts, purchasedProductsError] = await tryCatch<PaginatedDocs<Product>>(payload.find({
        collection: 'products',
        where: {
            id: {
                in: typeOfOrder,
            }
        }
    }))

    if (purchasedProductsError) {
        console.log(purchasedProductsError)
        return
    }

    const products = purchasedProducts?.docs

    console.log(products, '<----------- products')

    const productThatArePlans = products?.filter(product => product.productType);
    if (productThatArePlans?.length === 0) {
        console.log('no plans');
        // await sendUserEmail(docType.customer, payload);
        return;
    }

    const plansIds = productThatArePlans?.map(product => {
        return product.productType as Plan;
    });

    const [plans, plansError] = await tryCatch<PaginatedDocs<Plan>>(payload.find({
        collection: 'plans',
        where: {
            id: {
                in: plansIds?.map(plan => plan.id as string),
            }
        }
    }));

    if (plansError) {
        console.log(plansError)
        return;
    }

    const [subscription, errorSub] = await newCreateSubscription(plans?.docs as Plan[], payload, docType, productThatArePlans as Product[]);

    if (errorSub) {
        console.log(errorSub)
        return;
    }

    await sendUserEmail(docType.customer, payload);

    console.log(subscription, '<----------- subscription')
    
}

export default Orders;