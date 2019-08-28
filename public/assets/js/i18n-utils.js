function getLanguageIndexByUrlLocaleCode(urlLocaleCode) {
    const map = {
        en: 1,
        id: 2,
        esmx: 3,
        hu: 4,
        pl: 5,
        ptbr: 6,
        ro: 7,
        vi: 8,
    };
    return map[urlLocaleCode];
}

/**
 * @returns {string[]}
 */
function getAllUrlLocaleCodes() {
    return ['en', 'id', 'esmx', 'hu', 'pl', 'ptbr', 'ro', 'vi'];
}

function isValidUrlLocaleCode(urlLocaleCode) {
    return getAllUrlLocaleCodes().includes(urlLocaleCode);
}

/**
 * TODO: Languages and locales are mixed up here.
 * @param {Navigator} navigator
 */
function determineBestUrlLocaleCode(navigator) {
    const cookieUrlLocaleCode = getCookie('localeUrl');
    const browserLanguage = getPrimaryBrowserLanguage(navigator);

    return cookieUrlLocaleCode || (browserLanguage && isValidUrlLocaleCode(browserLanguage) ? browserLanguage : 'en');
}


/**
 * @param {Navigator} navigator
 * @returns {string} The language part only. E.g. if it's "en-US", returns the "en" part.
 */
function getPrimaryBrowserLanguage(navigator) {
    const languagesWithoutEnglish = navigator.languages.filter(language => {return (language !== 'en-US' && language !== 'en');});
    const primaryBrowserLanguage = (languagesWithoutEnglish || navigator.languages || navigator.language || {})[0];
    const dashIndex = primaryBrowserLanguage.indexOf('-');
    return (dashIndex === -1) ? primaryBrowserLanguage : primaryBrowserLanguage.substring(0, dashIndex);
}

function initializeLanguageSelectorValue($, urlPath) {
// gets the URL path after the selected language, so it does not need to redirect to the home page
    const urlLocaleCodes = getAllUrlLocaleCodes().slice(1); /* slice(1) removes the first item: English. */
    for (const urlLocaleCode of urlLocaleCodes) {
        // TODO: This is a wrong approach, it can be triggered by any URL containing "/id".
        if (urlPath.includes('/' + urlLocaleCode)) {
            $('select option[value="' + getLanguageIndexByUrlLocaleCode(urlLocaleCode) + '"]').attr('selected', true);
        }
    }
}

/**
 * @param {Navigator} navigator
 * @param {Location} location
 */
function redirectIfNoUrlLocaleCodeIsInUrl(navigator, location) {
    const currentUrlLocaleCode = location.href.split('/')[3];
    if (!currentUrlLocaleCode) {
        const targetUrlLocaleCode = determineBestUrlLocaleCode(navigator);
        location.replace("/" + targetUrlLocaleCode);
    }
}
