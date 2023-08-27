import { CollectionConfig } from 'payload/types';
import { isAdminOrEditor } from '../access/isAdminOrEditor';
import { populateCreatedBy } from '../hooks/populateCreatedBy';
import { populateLastModifiedBy } from '../hooks/populateLastModifiedBy';
import { User } from '../payload-types';
import { checkRole } from '../access/checkRole';

const ProductPrices: CollectionConfig = {
    slug: 'product-prices',
    admin: {
        useAsTitle: 'name',
        hidden(args) {
            const {  user  } = args
            return !checkRole(['admin', 'editor'], user as unknown as User)
        },
        group: 'Información de productos',
    },
    access: {
        create: isAdminOrEditor,
        read : () => true,
        update: isAdminOrEditor,
        delete: isAdminOrEditor
    },
    fields: [
        {
            name: 'price',
            type: 'number',
            required: true,
            label: 'Precio',
        },
        {
            name: 'currency',
            type: 'relationship',
            relationTo: 'currencies',
            hasMany: false,
            required: true,
        },
        {
            name: 'name',
            type: 'text',
            required: true,
            label: 'Nombre del precio',
        },
        {
            name: 'description',
            type: 'text',
            required: true,
            label: 'Descripción del precio',
        }
    ],
    hooks: {
        beforeChange: [
            populateCreatedBy,
            populateLastModifiedBy,
        ]
    }
}

export default ProductPrices;