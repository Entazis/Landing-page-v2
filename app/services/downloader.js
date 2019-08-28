const fs = require('fs');
const mimeTypes = require('mime-types');
const {extname} = require('path');
const csv = require('csvtojson');
const json2csv = require('json2csv');

const config = require('@codeberry/nodejs').config;
const logger = require('@codeberry/nodejs').logger;
const utils = require('@codeberry/nodejs').utils;

/**
 * @param {string} url The URL to download the file from.
 * @param {string} fileName Used for saving the content.
 * @returns {Promise<string|undefined>} The file path, or undefined if it failed.
 */
async function _downloadAndSaveCsv(url, fileName) {
    const filePath = __dirname + '/../' + fileName;

    try {
        const fileContent = (await utils.requestPromisified({method: 'GET', url})).body;
        await fs.promises.writeFile(filePath, fileContent);
        logger.info('DOWNLOADER | CSV download complete: ' + fileName);
        return filePath;
    } catch (error) {
        logger.error('DOWNLOADER | Could not download and save file.', {fileName, url}, error);
        return undefined;
    }
}

/**
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Promise<void>}
 */
async function _saveResponse(filePath, content) {
    try {
        await fs.promises.writeFile(filePath, content);
        // logger.info('SERVICE | saveResponse | File was downloaded.', {filePath});
    } catch (error) {
        logger.error('SERVICE | saveResponse | File write error.', {filePath}, error);
    }
}

const _getDefaultExtensionByMimeType = mimeType => {
    // noinspection JSUnresolvedFunction
    return mimeTypes.extension(mimeType);
};

/**
 * @param {string} filePath E.g. "/tmp/yy/xxx.jpg"
 * @returns {string} E.g. "jpg"
 */
const _getFileExtension = filePath => extname(filePath);

/**
 * @param {string} fileName E.g. "xxx" or "xxx.jpg"
 * @param {string} contentTypeHeader E.g. "image/jpeg"
 * @returns {string} E.g. "xxx.jpg"
 */
function _determineFileNameWithExtension(fileName, contentTypeHeader) {
    if (_getFileExtension(fileName)) {
        return fileName;
    } else {
        const defaultExtension = _getDefaultExtensionByMimeType(contentTypeHeader);

        if (defaultExtension) {
            return fileName + '.' + defaultExtension;
        } else {
            logger.error('DOWNLOADER | assembleFilePath | Cannot detect file extension.', {rootPath, fileName, contentTypeHeader});
            return fileName;
        }
    }
}

/**
 *
 * @param {string} url
 * @returns {Promise<{response: http.IncomingMessage, body: string}>}
 */
async function _downloadImage(url) {
    try {
        const {response, body} = await utils.requestPromisified({url, encoding: null});
        if (response.statusCode >= 200 && response.statusCode < 300) {
            return {response, body: body};
        } else {
            logger.error('SERVICE | downloadImage | Download failed. Unexpected response code.', response.statusCode);
        }
    } catch (error) {
        logger.error('SERVICE | downloadImage | Request failed!', error);
    }
}

/**
 *
 * @param {number} index
 * @param {{name: string, photo_url: string, file_name?: string}} object
 * @param objectPropertyNameWhereFileNameIsStored
 * @param imageFolderName
 * @returns {Promise<void>}
 * @private
 */
async function _downloadAndSaveImage(index, object, objectPropertyNameWhereFileNameIsStored, imageFolderName) {
    const {response, body: imageFileContent} = await _downloadImage(object[objectPropertyNameWhereFileNameIsStored]);
    object.file_name = _determineFileNameWithExtension(index, response.headers['content-type']);
    await _saveResponse(__dirname + '/../../public/assets/img/' + imageFolderName + '/' + object.file_name, imageFileContent);
}

async function _downloadScholarshipImages(path) {
    const scholarships = await csv().fromFile(path);
    const downloadImagePromises = Object.entries(scholarships).map((item) => _downloadAndSaveImage(item[0], item[1], 'photo_url', 'scholarship-images'));

    try {
        await Promise.all(downloadImagePromises);
        await fs.promises.writeFile(path, json2csv.parse(scholarships, ['name', 'photo_url', 'file_name']));
    } catch (error) {
        logger.error('SERVICE | downloadScholarshipImages', error);
    }
}

async function _downloadPressLogos(path) {
    const pressMentions = await csv().fromFile(path);
    const downloadImagePromises = Object.entries(pressMentions).map(item => _downloadAndSaveImage(item[0], item[1], 'logo', 'press'));
    try {
        await Promise.all(downloadImagePromises);
        await fs.promises.writeFile(path, json2csv.parse(pressMentions, ['head', 'body', 'logo', 'url', 'locale', 'file_name']));
    } catch (error) {
        logger.error('SERVICE | downloadPressLogos', error);
    }
}

async function getReviewsCSV() {
    await _downloadAndSaveCsv(config.get('contentSpreadsheet:REVIEWS_URL'), 'reviews.csv');
}

async function getDiscountAmountsCSV() {
    await _downloadAndSaveCsv(config.get('contentSpreadsheet:DISCOUNT_AMOUNTS_URL'), 'discount-amounts.csv');
}

async function getPricingAndPlansCSV() {
    await _downloadAndSaveCsv(config.get('contentSpreadsheet:PRICING_AND_PLANS_URL'), 'pricing-and-plans.csv');
}

async function getPressMentionsCSV() {
    const filePath = await _downloadAndSaveCsv(config.get('contentSpreadsheet:PRESS_MENTIONS_URL'), 'press-mentions.csv');
    if (filePath) {
        await _downloadPressLogos(filePath);
    }
}

async function getScholarshipCSV() {
    const filePath = await _downloadAndSaveCsv(config.get('contentSpreadsheet:SCHOLARSHIP_URL'), 'scholarship.csv');
    if (filePath) {
        await _downloadScholarshipImages(filePath);
    }
}

async function getRedirectionCSV() {
    await _downloadAndSaveCsv(config.get('contentSpreadsheet:REDIRECTION_URL'), 'redirection.csv');
}

module.exports = {
    getReviewsCSV,
    getDiscountAmountsCSV,
    getPricingAndPlansCSV,
    getPressMentionsCSV,
    getScholarshipCSV,
    getRedirectionCSV
};