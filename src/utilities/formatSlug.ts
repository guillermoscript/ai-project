import type { FieldHook } from 'payload/types'

export const formatToSlug = (val: string): string =>
    val
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '')
        .toLowerCase()

const formatSlug =
    (fallback: string): FieldHook =>
        ({ operation, value, originalDoc, data }) => {
            if (typeof value === 'string') {
                return formatToSlug(value)
            }

            if (operation === 'create' || operation === 'update') {
                const fallbackData = data?.[fallback] || originalDoc?.[fallback]

                if (fallbackData && typeof fallbackData === 'string') {
                    return formatToSlug(fallbackData)
                }
            }

            return value
        }

export default formatSlug
