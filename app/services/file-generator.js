const i18n = require('i18n');
const fs = require('fs');
const {createSitemap} = require('sitemap');
const uglifyCss = require('uglifycss');
const config = require('@codeberry/nodejs').config;
const utils = require('@codeberry/nodejs').utils;
const logger = require('@codeberry/nodejs').logger;
const babel = require("@babel/core");

const bundles = require('../site/bundles');
const localeCodeConverter = require('../i18n/locale-code-converter');
const siteUrlHelper = require('../site/site-url-helper');
const redirectRepository = require('./redirect-repository');

function generateSitemap() {
    return new Promise(resolve => {
        const urls = [];
        const fullLocaleCodes = i18n.getLocales();

        for (const page of siteUrlHelper.getAllKnownPageSlugs()) {
            if (page !== 'admin') {
                for (const fullLocaleCode of fullLocaleCodes) {
                    const catalogForLocale = i18n.getCatalog(fullLocaleCode);
                    const urlCode = localeCodeConverter.getUrlLocaleCodeByFullLocaleCode(fullLocaleCode);
                    if (urlCode && catalogForLocale[page]) {
                        urls.push({url: urlCode + '/' + catalogForLocale[page]});
                    }
                }
            }
        }

        urls.push({url: '/sitemap.xml'});

        const sitemapObject = createSitemap({
            hostname: 'https://codeberryschool.com', // TODO: Hard-coded address! Should be revisited!
            cacheTime: 600000,        // 600 sec - cache purge period
            urls: urls
        });

        const sitemapXml = sitemapObject.toString(true);

        fs.writeFile('public/sitemap.xml', sitemapXml, function (error) {
            if (error) {
                logger.error('SERVICES | SITEMAP', error);
            } else {
                logger.info('SERVICE | Sitemap.xml was successfully updated!');
                resolve();
            }
        });
    });
}

/**
 * @param {Redirect} redirect
 * @returns {Promise<void>}
 * @private
 */
async function _createRedirectFile(redirect) {
    /* Calculate data */
    const directoryPath = 'app/static/' + redirect.fromLocale + (redirect.fromPage ? '/' + redirect.fromPage : '');
    const targetUrl = '/' + redirect.toLocale + '/' + redirect.toPage + (redirect.toParameters ? '/' + redirect.toParameters : '');
    const redirectPageHtmlContent = '<html lang="en"><head><meta http-equiv="refresh" content="0; url=' + targetUrl + '" /><title>Redirect</title></head><body></body></html>';

    try {
        await utils.ensureDirectoryExists(directoryPath);
        await utils.writeFile(directoryPath + '/index.html', redirectPageHtmlContent);
    } catch (error) {
        logger.error('SERVICES | STATIC PAGE GENERATOR | createRedirectionFile |', error);
    }

    logger.info('GENERATOR | Static redirection file was successfully generated.', {originalPageDirectoryPath: directoryPath, targetUrl});
}

async function generateStaticPage() {
    const fullLocaleCodes = i18n.getLocales();

    const urls = [];
    urls.push(config.get('app:APP_URL'));

    for (const fullLocaleCode of fullLocaleCodes) {
        const urlCode = localeCodeConverter.getUrlLocaleCodeByFullLocaleCode(fullLocaleCode);
        if (urlCode) {
            urls.push(config.get('app:APP_URL') + '/' + urlCode);
            urls.push(config.get('app:APP_URL') + '/' + urlCode + '/landing-' + urlCode);
            if (urlCode === 'hu') {
                urls.push(config.get('app:APP_URL') + '/' + urlCode + '/landing');
            }
        }
    }

    for (const page of siteUrlHelper.getAllKnownPageSlugs()) {
        if (page !== 'admin') {
            for (const fullLocaleCode of fullLocaleCodes) {
                const catalogForLocale = i18n.getCatalog(fullLocaleCode);
                const urlCode = localeCodeConverter.getUrlLocaleCodeByFullLocaleCode(fullLocaleCode);
                if (urlCode && catalogForLocale[page]) {
                    urls.push(config.get('app:APP_URL') + '/' + urlCode + '/' + catalogForLocale[page]);
                }
            }
        }
    }

    const downloadAndSavePagePromises = urls.map(url => downloadAndSavePage(url));

    /* Copy assets */
    await utils.copyDirectoryRecursively(__dirname + '/../../public/assets', __dirname + '/../static/assets');

    /* Copy files */
    await fs.promises.copyFile(__dirname + '/../../public/sitemap.xml', __dirname + '/../static/sitemap.xml');

    /* Create redirects */
    const redirects = await redirectRepository.getAllRedirects();
    const createRedirectFilePromises = redirects.map(_createRedirectFile);

    /* Download static pages */
    try {
        await Promise.all(downloadAndSavePagePromises);
        await Promise.all(createRedirectFilePromises);
    } catch (error) {
        logger.error('STATIC PAGE GENERATOR | Error.', error);
    }
}

async function _downloadPage(url) {
    let callResult;
    try {
        callResult = await utils.requestPromisified({url: url, encoding: null});
    } catch (error) {
        logger.error('SERVICE | downloadAndSavePage | Request failed!', {url}, error);
        throw error;
    }
    if (((callResult.response.statusCode < 200) || (callResult.response.statusCode >= 300)) && (callResult.response.statusCode !== 404)) {
        logger.error('SERVICE | downloadAndSavePage | Request failed!', {statusCode: callResult.response.statusCode, url});
        throw new Error('Unexpected status code: ' + callResult.response.statusCode);
    }

    return callResult.body;
}

async function downloadAndSavePage(url) {
    const page = url.split('/')[4];
    const locale = url.split('/')[3];

    try {
        const body = await _downloadPage(url);

        if (!locale && !page) {
            await fs.promises.writeFile('app/static/index.html', body);
            logger.info('FILE GENERATOR | downloadAndSavePage | Static page (nothing set) was successfully generated from ' + url);
        } else if (locale && !page) {
            const relativeDirectoryPath = 'app/static/' + locale;
            const relativeFilePath = relativeDirectoryPath + '/index.html';
            await fs.promises.access(relativeDirectoryPath).catch(() => fs.promises.mkdir(relativeDirectoryPath, {recursive: true}));
            await fs.promises.writeFile(relativeFilePath, body);
            logger.info('FILE GENERATOR | downloadAndSavePage | Static page (locale set) was successfully generated from ' + url);
        } else if (locale && page) {
            const relativeDirectoryPath = 'app/static/' + locale + '/' + page;
            const relativeFilePath = relativeDirectoryPath + '/index.html';
            await fs.promises.access(relativeDirectoryPath).catch(() => fs.promises.mkdir(relativeDirectoryPath, {recursive: true}));
            await fs.promises.writeFile(relativeFilePath, body);
            logger.info('FILE GENERATOR | downloadAndSavePage | Static page (locale and page set) was successfully generated from ' + url);
        }
    } catch (error) {
        logger.error('FILE GENERATOR | downloadAndSavePage | Static page generating error.', {url, page, locale}, error);
    }
}

async function minifyCSSFiles() {
    const cssRoot = __dirname + '/../../public/assets/css';
    try {
        try {
            const oldCssFileName = await bundles.getCssFileName();
            await fs.promises.unlink(cssRoot + '/' + oldCssFileName);
        } catch (error) { /* Do nothing */ }
        const minified = uglifyCss.processFiles([cssRoot + '/style.css']);
        const minifiedMd5 = utils.getMd5Hash(minified).substring(0, 6);
        fs.writeFileSync(cssRoot + '/style.' + minifiedMd5 + '.min.css', minified);
        logger.info('SERVICE | CSS files were minified!');
    } catch (error) {
        logger.error('SERVICE | minifyCSSFiles', error);
    }
}

/**
 * @param {{fileName: string, targetPathWithoutExtension: string, code: string, sourceMap: string}} result
 * @returns {Promise<void>}
 */
async function writeMinificationResult(result) {
    try {
        await utils.writeFile(result.targetPathWithoutExtension + '.min.js', result.code);
        await utils.writeFile(result.targetPathWithoutExtension + '.js.map', JSON.stringify(result.sourceMap));
    } catch (error) {
        logger.error('GENERATOR | minifyJSFiles | Error when writing.', {fileName: result.fileName}, error);
    }
}

/**
 * Loops on all files in `public/assets/js`.
 * Creates a `*.min.js` version of each of them.
 * Then creates an `all.min.js` version where it puts all minified files concatenated.
 *
 * @returns {Promise<void>}
 */
async function minifyJSFiles() {
    const jsRoot = __dirname + '/../../public/assets/js';
    const jsFileNames = await fs.promises.readdir(jsRoot);
    const nonMinifiedJsFileNames = jsFileNames.filter(fileName => !fileName.endsWith('.min.js')).filter(fileName => !fileName.endsWith('.js.map'));
    // noinspection JSUnresolvedFunction "uglifyJs.minify" is not explicitly defined, but it exists.
    const minificationPromises = nonMinifiedJsFileNames.map(async fileName => {
        try {
            const options = {presets: ['minify'], sourceMaps: true};
            const result = await babel.transformFileAsync(jsRoot + '/' + fileName, options);
            return ({
                fileName,
                targetPathWithoutExtension: jsRoot + '/' + fileName.substring(0, fileName.lastIndexOf(".")),
                code: result.code,
                sourceMap: result.map,
            });
        } catch (error) {
            logger.error('GENERATOR | minifyJSFiles | Error while minifying.', {fileName}, error.message);
        }
    });
    const minificationResults = await Promise.all(minificationPromises);
    const minificationResultsWithoutFailedOnes = minificationResults.filter(x => x);

    const fileWritePromises = minificationResultsWithoutFailedOnes.map(writeMinificationResult);

    await Promise.all(fileWritePromises);

    if (!minificationResults) {
        logger.error('SERVICE | minifyJSFiles | Could not minify JS files');
    }

    try {
        try {
            const oldJsFileName = await bundles.getJsFileName();
            await fs.promises.unlink(jsRoot + '/' + oldJsFileName);
        } catch (error) { /* Do nothing */ }
        const minifiedBundledSourceCode = minificationResultsWithoutFailedOnes.map(result => result.code).join('\n\n');
        const minifiedBundleMd5 = utils.getMd5Hash(minifiedBundledSourceCode).substring(0, 6);
        await utils.writeFile(jsRoot + '/all.' + minifiedBundleMd5 + '.min.js', minifiedBundledSourceCode);
        logger.info('SERVICE | JS files were minified!');
    } catch (error) {
        logger.error('SERVICE | minifyJSFiles', error.message);
    }
}

module.exports = {
    generateSitemap,
    minifyCSSFiles,
    minifyJSFiles,
    generateStaticPage
};