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
            const { user } = args
            return !checkRole(['admin', 'editor'], user as unknown as User)
        },
        group: 'Información de productos',
    },
    access: {
        create: isAdminOrEditor,
        read: () => true,
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
        {
            name: 'code',
            type: 'select',
            required: true,
            defaultValue: 'usd',
            options: [
                { label: "usd", value: "usd" },

                { label: " aed", value: " aed" },

                { label: " afn", value: " afn" },

                { label: " all", value: " all" },

                { label: " amd", value: " amd" },

                { label: " ang", value: " ang" },

                { label: " aoa", value: " aoa" },

                { label: " ars", value: " ars" },

                { label: " aud", value: " aud" },

                { label: " awg", value: " awg" },

                { label: " azn", value: " azn" },

                { label: " bam", value: " bam" },

                { label: " bbd", value: " bbd" },

                { label: " bdt", value: " bdt" },

                { label: " bgn", value: " bgn" },

                { label: " bhd", value: " bhd" },

                { label: " bif", value: " bif" },

                { label: " bmd", value: " bmd" },

                { label: " bnd", value: " bnd" },

                { label: " bob", value: " bob" },

                { label: " brl", value: " brl" },

                { label: " bsd", value: " bsd" },

                { label: " bwp", value: " bwp" },

                { label: " byn", value: " byn" },

                { label: " bzd", value: " bzd" },

                { label: " cad", value: " cad" },

                { label: " cdf", value: " cdf" },

                { label: " chf", value: " chf" },

                { label: " clp", value: " clp" },

                { label: " cny", value: " cny" },

                { label: " cop", value: " cop" },

                { label: " crc", value: " crc" },

                { label: " cve", value: " cve" },

                { label: " czk", value: " czk" },

                { label: " djf", value: " djf" },

                { label: " dkk", value: " dkk" },

                { label: " dop", value: " dop" },

                { label: " dzd", value: " dzd" },

                { label: " egp", value: " egp" },

                { label: " etb", value: " etb" },

                { label: " eur", value: " eur" },

                { label: " fjd", value: " fjd" },

                { label: " fkp", value: " fkp" },

                { label: " gbp", value: " gbp" },

                { label: " gel", value: " gel" },

                { label: " gip", value: " gip" },

                { label: " gmd", value: " gmd" },

                { label: " gnf", value: " gnf" },

                { label: " gtq", value: " gtq" },

                { label: " gyd", value: " gyd" },

                { label: " hkd", value: " hkd" },

                { label: " hnl", value: " hnl" },

                { label: " hrk", value: " hrk" },

                { label: " htg", value: " htg" },

                { label: " huf", value: " huf" },

                { label: " idr", value: " idr" },

                { label: " ils", value: " ils" },

                { label: " inr", value: " inr" },

                { label: " isk", value: " isk" },

                { label: " jmd", value: " jmd" },

                { label: " jod", value: " jod" },

                { label: " jpy", value: " jpy" },

                { label: " kes", value: " kes" },

                { label: " kgs", value: " kgs" },

                { label: " khr", value: " khr" },

                { label: " kmf", value: " kmf" },

                { label: " krw", value: " krw" },

                { label: " kwd", value: " kwd" },

                { label: " kyd", value: " kyd" },

                { label: " kzt", value: " kzt" },

                { label: " lak", value: " lak" },

                { label: " lbp", value: " lbp" },

                { label: " lkr", value: " lkr" },

                { label: " lrd", value: " lrd" },

                { label: " lsl", value: " lsl" },

                { label: " mad", value: " mad" },

                { label: " mdl", value: " mdl" },

                { label: " mga", value: " mga" },

                { label: " mkd", value: " mkd" },

                { label: " mmk", value: " mmk" },

                { label: " mnt", value: " mnt" },

                { label: " mop", value: " mop" },

                { label: " mur", value: " mur" },

                { label: " mvr", value: " mvr" },

                { label: " mwk", value: " mwk" },

                { label: " mxn", value: " mxn" },

                { label: " myr", value: " myr" },

                { label: " mzn", value: " mzn" },

                { label: " nad", value: " nad" },

                { label: " ngn", value: " ngn" },

                { label: " nio", value: " nio" },

                { label: " nok", value: " nok" },

                { label: " npr", value: " npr" },

                { label: " nzd", value: " nzd" },

                { label: " omr", value: " omr" },

                { label: " pab", value: " pab" },

                { label: " pen", value: " pen" },

                { label: " pgk", value: " pgk" },

                { label: " php", value: " php" },

                { label: " pkr", value: " pkr" },

                { label: " pln", value: " pln" },

                { label: " pyg", value: " pyg" },

                { label: " qar", value: " qar" },

                { label: " ron", value: " ron" },

                { label: " rsd", value: " rsd" },

                { label: " rub", value: " rub" },

                { label: " rwf", value: " rwf" },

                { label: " sar", value: " sar" },

                { label: " sbd", value: " sbd" },

                { label: " scr", value: " scr" },

                { label: " sek", value: " sek" },

                { label: " sgd", value: " sgd" },

                { label: " shp", value: " shp" },

                { label: " sle", value: " sle" },

                { label: " sos", value: " sos" },

                { label: " srd", value: " srd" },

                { label: " std", value: " std" },

                { label: " szl", value: " szl" },

                { label: " thb", value: " thb" },

                { label: " tjs", value: " tjs" },

                { label: " tnd", value: " tnd" },

                { label: " top", value: " top" },

                { label: " try", value: " try" },

                { label: " ttd", value: " ttd" },

                { label: " twd", value: " twd" },

                { label: " tzs", value: " tzs" },

                { label: " uah", value: " uah" },

                { label: " ugx", value: " ugx" },

                { label: " uyu", value: " uyu" },

                { label: " uzs", value: " uzs" },

                { label: " vnd", value: " vnd" },

                { label: " vuv", value: " vuv" },

                { label: " wst", value: " wst" },

                { label: " xaf", value: " xaf" },

                { label: " xcd", value: " xcd" },

                { label: " xof", value: " xof" },

                { label: " xpf", value: " xpf" },

                { label: " yer", value: " yer" },

                { label: " zar", value: " zar" },

                { label: " zmw", value: " zmw" },

                { label: " usdc", value: " usdc" },

                { label: " btn", value: " btn" },

                { label: " ghs", value: " ghs" },

                { label: " eek", value: " eek" },

                { label: " lvl", value: " lvl" },

                { label: " svc", value: " svc" },

                { label: " vef", value: " vef" },

                { label: " ltl", value: " ltl" },

                { label: " sll", value: " sll" },
            ]
        }
    ],
    hooks: {
        beforeChange: [
            populateCreatedBy,
            populateLastModifiedBy,

        ]
    }
}

export default Currencies;