import { CollectionConfig } from 'payload/types';
import { isAdminOrEditor } from '../access/isAdminOrEditor';
import { populateCreatedBy } from '../hooks/populateCreatedBy';
import { populateLastModifiedBy } from '../hooks/populateLastModifiedBy';
import { slugField } from '../fields/slug';
import { User } from '../payload-types';
import { checkRole } from '../access/checkRole';


// Example Collection - For reference only, this must be added to payload.config.ts to be used.
const Currencies: CollectionConfig = {
    slug: 'currencies',
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
            name: 'name',
            type: 'text',
            required: true,
            label: 'Nombre de la moneda',
        },
        {
            name: 'symbol',
            type: 'text',
            required: true,
        },
        {
            name: 'exchangeRate',
            type: 'number',
            label: 'Tipo de cambio',
        },
        slugField('name'),
    ],
    hooks: {
        beforeChange: [
            populateCreatedBy,
            populateLastModifiedBy,
            
        ]
    }
}

export default Currencies;