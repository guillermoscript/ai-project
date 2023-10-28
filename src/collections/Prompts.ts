import { CollectionConfig } from 'payload/types';
import { isAdmin } from '../access/isAdmin';
import { isAdminOrCreatedBy } from '../access/isAdminOrCreatedBy';
import { populateCreatedBy } from '../hooks/populateCreatedBy';
import { populateLastModifiedBy } from '../hooks/populateLastModifiedBy';
import { createdByField } from '../fields/createdBy';
import { lastModifiedBy } from '../fields/lastModifiedBy ';
import { anyone } from '../access/anyone';


const Prompts: CollectionConfig = {
    slug: 'prompts',
    admin: {
        useAsTitle: 'description',
        description: 'Prompts de los usuarios.',
    },
    access: {
        create: anyone,
        read: anyone,
        update: isAdminOrCreatedBy,
        delete: isAdmin
    },
    fields: [
        {
            name: 'prompt',
            type: 'text',
            required: true,
            label: 'Prompt a usar',
        },
        {
            name: 'description',
            type: 'text',
            required: true,
            label: 'Descripción del prompt',
        },
        {
            name: 'category',
            type: 'relationship',
            relationTo: 'categories',
            required: true,
            hasMany: true,
        },
        createdByField(),
        lastModifiedBy(),
    ],
    hooks: {
        beforeChange: [
            populateCreatedBy,
            populateLastModifiedBy,
        ]
    }
};

export default Prompts;