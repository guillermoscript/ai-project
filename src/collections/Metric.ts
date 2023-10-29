import { CollectionConfig } from 'payload/types';
import { isAdminOrEditor } from '../access/isAdminOrEditor';
import { populateCreatedBy } from '../hooks/populateCreatedBy';
import { populateLastModifiedBy } from '../hooks/populateLastModifiedBy';
import { slugField } from '../fields/slug';
import { User } from '../payload-types';
import { checkRole } from '../access/checkRole';
import { isAdminOrSelf } from '../access/isAdminOrSelf';


// Example Collection - For reference only, this must be added to payload.config.ts to be used.
const Metric: CollectionConfig = {
    slug: 'metrics',
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
        read : ({ req: { user } }) => {
            if (!user) {
                return false
            }
            if (checkRole(['admin', 'editor'], user)) {
                return true
            }
            return {
                'user': {
                    equals: user.id
                }
            }
        },
        update: isAdminOrEditor,
        delete: isAdminOrEditor
    },
    fields: [
        {
            name: 'value',
            type: 'json',
            required: true,
        },
        {
            name: 'user',
            type: 'relationship',
            relationTo: 'users',
            required: true,
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

export default Metric;