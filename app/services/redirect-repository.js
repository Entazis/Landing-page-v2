const csvToJson = require('csvtojson');

/**
 * @typedef Redirect
 * @property {string} fromLocale
 * @property {string} fromPage
 * @property {string} toLocale
 * @property {string} toPage
 * @property {string} toParameters
 */
/**
 * @type {Redirect[]}
 */
let allRedirectsCache = [];
let areRedirectsLoaded = false;

/**
 * @returns {Promise<void>}
 */
async function _readRedirectsFromFile() {
    const allRawRedirectsIncludingInvalidOnes = await csvToJson().fromFile(`${__dirname}/../redirection.csv`);
    const allRawRedirects = allRawRedirectsIncludingInvalidOnes.filter(redirect => redirect.old && (redirect.old !== '-'));
    allRedirectsCache = allRawRedirects.map(redirect => ({
        fromLocale: redirect.old.split('/')[3],
        fromPage: redirect.old.split('/')[4],
        toLocale: redirect.new.split('/')[3],
        toPage: redirect.new.split('/')[4],
        toParameters: redirect.new.split('/')[5],
    }));
    areRedirectsLoaded = true;
}

/**
 * @returns {Promise<Redirect[]>}
 */
async function getAllRedirects() {
    if (!areRedirectsLoaded) {
        await _readRedirectsFromFile();
    }
    return allRedirectsCache;
}

/**
 * @param {string} fromLocale E.g. "hu" or "esmx"
 * @param {string} fromPage E.g. "about-pl"
 * @returns {Promise<Redirect|undefined>}
 */
async function findByFrom(fromLocale, fromPage) {
    if (!areRedirectsLoaded) {
        await _readRedirectsFromFile();
    }
    return allRedirectsCache.find(redirect => (redirect.fromLocale === fromLocale && redirect.fromPage === fromPage));
}

module.exports = {
    getAllRedirects,
    findByFrom,
};