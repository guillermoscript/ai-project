import { CollectionConfig } from 'payload/types';
import { slugField } from '../fields/slug';
import { isAdminOrSelf } from '../access/isAdminOrSelf';
import { isLoggedIn } from '../access/isLoggedIn';
import { User } from 'payload/generated-types';

const Audios: CollectionConfig = {
    slug: 'audios',
    access: {
        create: ({ req: { user, files } }) => {
            
            if (!user || !files) return false;
            const userFunctionalities = user?.functionalities as User['functionalities']
            const file = files.file;
            const { mimetype, size } = file;
            const fileSizeInMegabytes = size / (1024 * 1024);

            console.log(fileSizeInMegabytes, userFunctionalities)
            if ((fileSizeInMegabytes > 10 && userFunctionalities === 'free') || (fileSizeInMegabytes > 80 && userFunctionalities === 'basic')) {
                console.log('asdasd')
                return false;
            }

            return true;
        },
        read: isAdminOrSelf,
    },
    admin: {
        useAsTitle: 'filename',
        defaultColumns: ['filename', 'altText', 'createdBy', 'createdAt'],
    },
    upload: {
        staticURL: '/audios',
        staticDir: 'audios',
        // accpet only audio/mp3 audio/wav audio/ogg audio/webm audio/mpeg audio/m4a audio/mpga audio/mp4 audio/flac
        mimeTypes: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mpeg', 'audio/m4a', 'audio/mpga', 'audio/mp4', 'audio/flac' , 'video/mp4', 'video/webm', 'video/ogg', 'video/mpeg', 'video/m4a', 'video/mpga', 'video/mp4', 'video/flac'],
    },
    fields: [
        {
            name: 'filename',
            type: 'text',
            required: true,
        },
        {
            name: 'user',
            type: 'relationship',
            relationTo: 'users',
            required: true,
        },
        slugField('filename'),
    ],
    hooks: {
        beforeChange: [
            ({ data, req, operation }) => {
                if (operation === 'create') {
                    if (req.user) {
                        data.user = req.user.id;
                        return data;
                    }
                }
            },
        ]
    }
};

export default Audios;