import { GlobalConfig } from "payload/types";
import { isAdmin } from "../access/isAdmin";

const gpt35: GlobalConfig = {
    slug: 'gpt35',
    access: {
        read: () => true,
        update: isAdmin,
    },
    admin: {
        group: 'Informacion de Pago',
    },
    fields: [
        {
            name: 'input4',
            type: 'number',
            label: 'Input Price for model 4K',
            required: true,
        },
        {
            name: 'output4',
            type: 'number',
            label: 'Output Price for model 4K',
            required: true,
        },
        {
            name: 'input16',
            type: 'number',
            label: 'Input Price for model 16K',
            required: true,
        },
        {
            name: 'output16',
            type: 'number',
            label: 'Output Price for model 16K',
            required: true,
        },
    ],
};

export default gpt35