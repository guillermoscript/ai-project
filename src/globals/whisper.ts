import { GlobalConfig } from "payload/types";
import { isAdmin } from "../access/isAdmin";

const whisper: GlobalConfig = {
    slug: 'whisper',
    access: {
        read: () => true,
        update: isAdmin,
    },
    admin: {
        group: 'Informacion de Pago',
    },
    fields: [
        {
            name: 'input',
            type: 'number',
            label: 'Input Price for model whisper',
            required: true,
        },
    ],
};

export default whisper