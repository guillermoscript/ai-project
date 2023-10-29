import { CollectionConfig } from 'payload/types';
import { User } from '../payload-types';
import { checkRole } from '../access/checkRole';
import { isAdminOrSelf } from '../access/isAdminOrSelf';
import { anyone } from '../access/anyone';

const UserTranscriptions: CollectionConfig = {
    slug: 'user-transcriptions',
    admin: {
        hidden(args) {
            const { user } = args
            return !checkRole(['admin', 'editor'], user as unknown as User)
        },
        group: 'Información de transcripciones',
    },
    access: {
        create: async ({req: { user, payload }, id}) => {
            if (!user) return false

            if (checkRole(['admin', 'editor'], user as unknown as User)) return true

            try {

                const userSubscriptions = await payload.find({
                    collection: 'subscriptions',
                    where: {
                        and: [
                            {
                                user: {
                                    equals: typeof user === 'string' ? user : user.id
                                }
                            },
                            {
                                status: {
                                    equals: 'active'
                                }
                            }
                        ]
                    }
                })

                if (userSubscriptions.docs.length > 0) {
                    console.log('userSubscriptions.docs.length > 0')
                    return true
                } else {
                    console.log('userSubscriptions.docs.length <= 0')
                    return false
                }
            } catch (error) {
                console.log(error)
                return false
            }
        },
        read: isAdminOrSelf,
        update: isAdminOrSelf,
        delete: isAdminOrSelf
    },
    fields: [
        {
            name: 'user',
            type: 'relationship',
            relationTo: 'users',
            hasMany: false,
        },
        {
            name: 'audio',
            type: 'relationship',
            relationTo: 'audios',
            hasMany: false,
        },
        {
            name: 'transcriptionText',
            type: 'textarea',
            maxLength: 400000,
        },
        {
            name: 'summary',
            type: 'textarea',
        },
        // {
        //     name: 'keyPoints',
        //     type: 'textarea',
        // },
        // {
        //     name: 'actionItems',
        //     type: 'textarea',
        // },
        // {
        //     name: 'sentiment',
        //     type: 'textarea',
        // },
    ],
    hooks: {
        beforeChange: [
            ({ data, req, operation }) => {
                if (operation === 'create') {
                    if (req.user) {
                        data.user = typeof req.user === 'string' ? req.user : req.user.id;
                        return data;
                    }
                }

                return data
            },
        ]
    },
    endpoints: [
        {
            path: '/:transcriptionId/audios/:audioId',
            method: 'delete',
            handler: async (req, res) => {
                const { transcriptionId, audioId } = req.params

                try {
                    // delete audio 
                    await req.payload.delete<'audios'>({
                        collection: 'audios',
                        id: audioId
                    })

                    // delete transcription
                    await req.payload.delete<'user-transcriptions'>({
                        collection: 'user-transcriptions',
                        id: transcriptionId
                    })

                    return res.status(200).json({
                        message: 'Audios eliminados'
                    })
                } catch (error) {
                    console.log(error)
                    return res.status(500).json({
                        message: 'Error al eliminar los audios'
                    })
                }
            }
        }
    ]
}

export default UserTranscriptions;