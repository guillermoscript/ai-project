import type { Field } from 'payload/types'
import deepMerge from '../utilities/deepMerge'

export default function functionalities(overrides = {}) {
    return deepMerge<Field, Partial<Field>>({
        name: 'functionalities',
        type: 'radio',
        defaultValue: 'free',
        options: [ // required
            {
                label: 'Básico',
                value: 'basic',
            },
            {
                label: 'Premium',
                value: 'premium',
            },
            {
                label: 'Profesional',
                value: 'professional',
            },
            {
                label: 'Enterprise',
                value: 'enterprise',
            },
            {
                label: 'Custom',
                value: 'custom',
            },
            {
                label: 'Free',
                value: 'free',
            },

        ]
    }, overrides)
}