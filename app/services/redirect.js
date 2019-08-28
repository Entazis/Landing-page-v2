const i18n = require('i18n');

function isLocaleNextPageMatched(nextPage, fullLocale) {
    let catalogForLocale = Object.values(i18n.getCatalog(fullLocale));

    return !!catalogForLocale.find(phrase => {
        return phrase === nextPage;
    });
}

function getCorrectNextPageForLocale(nextPage, fullLocale) {
    const catalogForCorrectLocale = i18n.getCatalog(fullLocale);

    /* Check if nextPage is a base token */
    if (catalogForCorrectLocale[nextPage]) {
        return catalogForCorrectLocale[nextPage];
    }

    /* Check if nextPage is in another language than the language set in url */
    const locales = i18n.getLocales();
    for (const locale of locales) {
        const catalogForLocale = i18n.getCatalog(locale);
        const translations = Object.values(i18n.getCatalog(locale));
        const translation = translations.find(phrase => {
            return phrase === nextPage;
        });
        if (translation) {
            const phrase = Object.keys(catalogForLocale).find(key => catalogForLocale[key] === translation);
            return catalogForCorrectLocale[phrase];
        }
    }

    return catalogForCorrectLocale['error'];
}

/**
 *
 * @returns {Promise<{locale: string, Page: string, old: string, new: string}>}
 */
async function readRedirectsFromFile() {
    const allRedirects = await csv().fromFile(`${__dirname}/../redirection.csv`);
    /* Only return valid redirects */
    return allRedirects.filter(redirect => redirect.old && (redirect.old !== '-'));
}

module.exports = {
    isLocaleNextPageMatched,
    getCorrectNextPageForLocale,
    readRedirectsFromFile
};