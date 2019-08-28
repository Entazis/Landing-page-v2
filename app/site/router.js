/**
 * This file contains the module routes
 */
const express = require('express');
const geoip = require('geoip-lite');
const csv = require('csvtojson');
const i18n = require('i18n');
const utils = require('@codeberry/nodejs').utils;
const logger = require('@codeberry/nodejs').logger;

const bundles = require('./bundles');
const i18nHelper = require('../i18n/i18n');
const redirectHandler = require('../services/redirect');
const locales = require('../services/locales');
const localeCodeConverter = require('../i18n/locale-code-converter');
const siteUrlHelper = require('./site-url-helper');
const redirectRepository = require('../services/redirect-repository');
const downloader = require('../services/downloader');
const fileGenerator = require('../services/file-generator');

const urlRoot = "/";
const urls = {
    urlRoot: urlRoot,
    urlLocalizedIndex: urlRoot + ':localeUrl',
    urlLocalizedPage: urlRoot + ':localeUrl/:nextPage'
};

/**
 * @param request
 * @returns {Promise<string>} localeUrl
 */
async function _determineLocaleUrlFromRequest(request) {
    if (request.cookies.localeUrl) {
        return request.cookies.localeUrl;
    } else {
        try {
            // TODO: This is the server IP, but it should really be the user IP!
            const serverIp = await utils.getMyIPv4AddressViaIcanhazip();
            const countryCode = geoip.lookup(serverIp).country;
            return locales.getUrlLocale(countryCode);
        } catch (e) {
            try {
                const ip = (request.headers['x-forwarded-for'] || '').split(',')[0] || request.connection.remoteAddress || request.socket.remoteAddress || request.connection.socket.remoteAddress;
                const countryCode = geoip.lookup(ip).country;
                return locales.getUrlLocale(countryCode);
            } catch (e) {
                return locales.getUrlLocale(i18nHelper.getDefaultLocale().customFormats.landingUrlBase);
            }
        }
    }
}

/**
 * @param fullLocale
 * @returns {object} internationalized urls for footer links
 */
function _getUrlsForLocale(fullLocale) {
    return {
        "about": i18n.__({phrase: "about", locale: fullLocale}),
        "press": i18n.__({phrase: "press", locale: fullLocale}),
        "reviews": i18n.__({phrase: "reviews", locale: fullLocale}),
        "team": i18n.__({phrase: "team", locale: fullLocale}),
        "scholarship": i18n.__({phrase: "scholarship", locale: fullLocale}),
        "privacy-policy": i18n.__({phrase: "privacy-policy", locale: fullLocale}),
        "terms-of-service": i18n.__({phrase: "terms-of-service", locale: fullLocale}),
        "refund-policy": i18n.__({phrase: "refund-policy", locale: fullLocale}),
    };
}

/**
 * @param baseUrl
 * @returns {object} internationalized urls
 */
function _getLocalizedUrlsForBaseUrl(baseUrl) {
    return {
        "en": i18n.__({phrase: baseUrl, locale: "en-US"}),
        "id": i18n.__({phrase: baseUrl, locale: "id-ID"}),
        "esmx": i18n.__({phrase: baseUrl, locale: "es-MX"}),
        "hu": i18n.__({phrase: baseUrl, locale: "hu-HU"}),
        "pl": i18n.__({phrase: baseUrl, locale: "pl-PL"}),
        "ptbr": i18n.__({phrase: baseUrl, locale: "pt-BR"}),
        "ro": i18n.__({phrase: baseUrl, locale: "ro-RO"}),
        "vi": i18n.__({phrase: baseUrl, locale: "vi-VN"}),
    };
}

/**
 * @param request
 * @param response
 * @returns {*}
 */
const handleRootUrlGet = async function(request, response) {
    const cssBundleFileName = await bundles.getCssFileName().catch(error => logger.error('Not found!', error));
    const jsBundleFileName = await bundles.getJsFileName().catch(error => logger.error('Not found!', error));

    return response.render('site/index/index', {
        validUrlLocaleCodes: localeCodeConverter.getAllValidUrlLocaleCodes(),
        cssBundleFileName,
        jsBundleFileName,
    });
};

/**
 * @param request
 * @param response
 * @returns {*}
 */
const handleLocalizedIndexGet = async function(request, response) {
    if (!i18nHelper.isUrlLocaleValid(request)) {
        const validLocaleUrl = await _determineLocaleUrlFromRequest(request);
        request.params.nextPage = request.params.localeUrl;
        request.params.localeUrl = validLocaleUrl;
        return await handleLocalizedPage(request, response);
    } else {
        i18nHelper.determineLocale(request, response);
        const localeUrl = request.params.localeUrl;
        const fullLocale = locales.getFullLocale(localeUrl);
        const title = i18n.__({phrase: "Learn programming", locale: fullLocale}) + " " + i18n.__({phrase: "online", locale: fullLocale});
        const pricings = await csv().fromFile(__dirname + '/../pricing-and-plans.csv');
        const pricingForLocale = pricings.find(pricing => pricing.locale === localeUrl);

        const urlsForLocale = _getUrlsForLocale(fullLocale);

        const cssBundleFileName = await bundles.getCssFileName().catch(error => logger.error('Not found!', error));
        const jsBundleFileName = await bundles.getJsFileName().catch(error => logger.error('Not found!', error));

        response.render('site/index/index', {
            validUrlLocaleCodes: localeCodeConverter.getAllValidUrlLocaleCodes(),
            title,
            cssBundleFileName,
            jsBundleFileName,
            urlLocale: localeUrl,
            fullLocale: fullLocale,
            isFrontPage: 1,
            isNoIndexPage: false,
            mentor4all: false,
            vanityStats: {
                numberOfStudents: '103,199',
                numberOfCompletedLessons: '856,541',
                numberOfLinesOfCodeWritten: '5,443,468'
            },
            pricing: pricingForLocale,
            urlsForLocale: urlsForLocale
        });
    }
};

function _isAdminFunction(slug) {
    const adminFunctionSlugs = [
        "download-reviews",
        "download-scholarship",
        "download-press-mentions",
        "generate-sitemap",
        "generate-static-page",
        "download-pricing-and-plans",
        "download-discount-amounts",
    ];
    return adminFunctionSlugs.includes(slug);
}

async function _callAdminFunction(nextPage) {
    try {
        const slugToFunctionMap = {
            'download-reviews': downloader.getReviewsCSV,
            'download-scholarship': downloader.getScholarshipCSV,
            'download-press-mentions': downloader.getPressMentionsCSV,
            'generate-sitemap': fileGenerator.generateSitemap,
            'generate-static-page': fileGenerator.generateStaticPage,
            'download-pricing-and-plans': downloader.getPricingAndPlansCSV,
            'download-discount-amounts': downloader.getDiscountAmountsCSV,
        };
        const functionToExecute = slugToFunctionMap[nextPage];
        return functionToExecute ? await functionToExecute() : undefined;
    } catch(error) {
        logger.error('REDIRECT | Error while executing admin function.', {slug: nextPage});
    }
}


/**
 * @param request
 * @param response
 * @returns {*}
 */
const handleLocalizedPage = async function(request, response) {
    let hasRedirectionHappened = false;

    if (!i18nHelper.isUrlLocaleValid(request)) {
        request.params.localeUrl = await _determineLocaleUrlFromRequest(request);
        hasRedirectionHappened = true;
    }

    /* Handle redirects */
    const redirect = await redirectRepository.findByFrom(request.params.localeUrl, request.params.nextPage);
    if (redirect){
        request.params.nextPage = redirect.toPage;
        hasRedirectionHappened = true;
    }

    i18nHelper.determineLocale(request, response);
    const localeUrl = request.params.localeUrl;
    let nextPage = request.params.nextPage;
    const fullLocale = locales.getFullLocale(localeUrl);

    if(_isAdminFunction(nextPage)) {
        // noinspection ES6MissingAwait We don't want to wait for the admin action to finish here.
        _callAdminFunction(nextPage);
        return response.redirect('/' + localeUrl + '/admin');
    }

    if (!redirectHandler.isLocaleNextPageMatched(nextPage, fullLocale)) {
        nextPage = redirectHandler.getCorrectNextPageForLocale(nextPage, fullLocale);
        hasRedirectionHappened = true;
    }

    /* Check if the page is in the routing */
    const catalogForLocale = i18n.getCatalog(fullLocale);
    let baseURL = Object.keys(catalogForLocale).find(key => catalogForLocale[key] === nextPage);
    if (!siteUrlHelper.isKnownPageSlug(baseURL)) {
        baseURL = 'error';
        hasRedirectionHappened = false;
    }

    if (hasRedirectionHappened && baseURL !== 'error') {
        return response.redirect('/' + localeUrl + '/' + nextPage);
    }

    const pageTitle = locales.getTitle(nextPage, fullLocale);
    let reviewsForLocale = [];
    let discountTextForLocale = '';
    let pricingForLocale = {};
    let scholarship = [];
    let pressMentions = [];

    try {
        const reviews = await csv().fromFile(__dirname + '/../reviews.csv');
        const discounts = await csv().fromFile(__dirname + '/../discount-amounts.csv');
        const pricings = await csv().fromFile(__dirname + '/../pricing-and-plans.csv');
        scholarship = await csv().fromFile(__dirname + '/../scholarship.csv');
        pressMentions = await csv().fromFile(__dirname + '/../press-mentions.csv');
        reviewsForLocale = reviews.filter(review => review.locale === fullLocale);
        pricingForLocale = pricings.find(pricing => pricing.locale === localeUrl);

        const discountForLocale = discounts.find(discount => discount.locale ===  fullLocale);
        discountTextForLocale = i18n.__({
            phrase: 'If you subscribe you\'ll get a discount of {{discountAmount}}.',
            locale: fullLocale}, {
            discountAmount: discountForLocale.discountAmount});

        const pressMentionsForLocale = pressMentions.filter(pressMention => pressMention.locale === fullLocale);
        const pressMentionsEn = pressMentions.filter(pressMention =>
            pressMention.locale === 'en-US' &&
            !pressMentionsForLocale.includes(pressMention));
        const pressMentionsRest = pressMentions.filter(pressMention =>
            !pressMentionsEn.includes(pressMention) &&
            !pressMentionsForLocale.includes(pressMention));
        pressMentions = pressMentionsForLocale.concat(pressMentionsEn).concat(pressMentionsRest);
    } catch (error) {
        logger.error('ROUTER', error);
    }

    const urlsForLocale = _getUrlsForLocale(fullLocale);
    const localizedNextPageUrls = _getLocalizedUrlsForBaseUrl(baseURL);

    const cssBundleFileName = await bundles.getCssFileName().catch(error => logger.error('Not found!', error));
    const jsBundleFileName = await bundles.getJsFileName().catch(error => logger.error('Not found!', error));

    (baseURL === 'error') ? response.status(404) : response.status(200);
    const pageName = (baseURL==='landing') ? 'index' : baseURL;
    return response.render('site/index/' + pageName, {
        validUrlLocaleCodes: localeCodeConverter.getAllValidUrlLocaleCodes(),
        title: pageTitle,
        cssBundleFileName,
        jsBundleFileName,
        urlLocale: localeUrl,
        fullLocale: fullLocale,
        pricing: pricingForLocale,
        reviews: reviewsForLocale,
        discountTextForLocale: discountTextForLocale,
        scholarship: scholarship,
        pressMentions: pressMentions,
        isFrontPage: baseURL === 'index' || baseURL === 'landing',
        isNoIndexPage: baseURL === 'discount' || baseURL === 'referral' || baseURL === 'error' || baseURL === 'admin',
        mentor4all: false,
        vanityStats: {
            numberOfStudents: '103,199',
            numberOfCompletedLessons: '856,541',
            numberOfLinesOfCodeWritten: '5,443,468'
        },
        urlsForLocale: urlsForLocale,
        nextPageUrls: localizedNextPageUrls
    });
};

/* ------------------------------ Module body ------------------------------- */
let router = new express.Router();

/* Init i18n to be accessible by the templating engine
 * Add middleware to enforce user locale change */
router.use(i18n.init);
router.use(function(request, response, next) {
    i18nHelper.determineLocale(request, response);
    next();
});
router.get(urls.urlRoot, handleRootUrlGet);
router.get(urls.urlLocalizedIndex, handleLocalizedIndexGet);
router.get(urls.urlLocalizedPage, handleLocalizedPage);
router.use(async function(request, response) {
    const localeUrl = await _determineLocaleUrlFromRequest(request);
    request.params.localeUrl = localeUrl;
    i18nHelper.determineLocale(request, response);

    const fullLocale = locales.getFullLocale(localeUrl);
    const pageTitle = i18n.__({phrase: "Error", locale: fullLocale});

    const cssBundleFileName = await bundles.getCssFileName().catch(error => logger.error('Not found!', error));
    const jsBundleFileName = await bundles.getJsFileName().catch(error => logger.error('Not found!', error));

    response.status(404);
    return response.render('site/index/error', {
        title: pageTitle,
        cssBundleFileName,
        jsBundleFileName,
        fullLocale: fullLocale,
        isFrontPage: false,
        isNoIndexPage: true,
    });
});

/* ----------------------------- Module exports ----------------------------- */
module.exports = router;
