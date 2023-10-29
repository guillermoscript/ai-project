import { GlobalConfig } from "payload/types";
import { isAdmin } from "../access/isAdmin";

const gpt4: GlobalConfig = {
    slug: 'gpt4',
    access: {
        read: () => true,
        update: isAdmin,
    },
    admin: {
        group: 'Informacion de Pago',
    },
    fields: [
        {
            name: 'input8',
            type: 'number',
            label: 'Input Price for model 8K',
            required: true,
        },
        {
            name: 'output8',
            type: 'number',
            label: 'Output Price for model 8K',
            required: true,
        },
        {
            name: 'input32',
            type: 'number',
            label: 'Input Price for model 32K',
            required: true,
        },
        {
            name: 'output32',
            type: 'number',
            label: 'Output Price for model 32K',
            required: true,
        },
    ],
};

export default gpt4