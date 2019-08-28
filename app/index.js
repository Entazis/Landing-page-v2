/**
 * This file is the starting point of the app.
 */

const moment = require('moment');
const codeberry = require('@codeberry/nodejs');
const initializer = require('./initializer');

async function downloadData() {
    const downloader = require('./services/downloader');
    const logger = codeberry.logger;
    logger.debug('Started downloading.');
    try {
        await Promise.all([
            downloader.getReviewsCSV(),
            downloader.getDiscountAmountsCSV(),
            downloader.getPricingAndPlansCSV(),
            downloader.getPressMentionsCSV(),
            downloader.getScholarshipCSV(),
            downloader.getRedirectionCSV()
        ]);
    } catch(error) {
        logger.error('Error during downloading.', error);
        return;
    }
    logger.debug('Finished downloading.');
}

async function generateDynamicSite() {
    const fileGenerator = require('./services/file-generator');
    const logger = codeberry.logger;
    logger.debug('Started generating dynamic files.');
    try {
        await fileGenerator.minifyCSSFiles();
        await fileGenerator.minifyJSFiles();
        await fileGenerator.generateSitemap();
    } catch(error) {
        logger.error('Error during dynamic file generation.', error);
        return;
    }
    logger.debug('Finished dynamic generating.');
}

async function generateStaticSite() {
    const fileGenerator = require('./services/file-generator');
    const logger = codeberry.logger;
    logger.debug('Started generating static site.');
    try {
        await fileGenerator.generateStaticPage();
    } catch(error) {
        logger.error('Error during static site generation.', error);
        return;
    }
    logger.debug('Finished static site generating.');
}

async function startApp() {
    const config = codeberry.config;
    const logger = codeberry.logger;
    const app = require('./app');
    app.listen(config.get('app:PORT'), config.get('app:IP'), async function () {
        await downloadData();
        await generateDynamicSite();
        if (process.env.NODE_ENV === "production") {
            logger.error("APP RESTART | " + config.get('app:NAME') + " has been restarted - possible error if not intended.");
            console.log(moment().format('YYYY-MM-DD HH:mm:ss') + " | APP | " + config.get('app:NAME') + " is running.");
        } else {
            await generateStaticSite();
            logger.info("---------------------------------------------");
            logger.info("APP | " + config.get('app:NAME') + " is running on " + config.get('app:APP_URL'));
        }
    });
}

async function initializeAndStartApp() {
    try {
        await initializer.initializeCodeBerryLibrary();
        await initializer.initializeMongoose();
        await startApp();
    } catch (error) {
        const logger = codeberry.logger;
        logger.error("APP | FATAL: Error during app loading.", error);
        console.log(moment().format('YYYY-MM-DD HH:mm:ss') + ' | APP | FATAL: Error during app loading. Environment: ' + process.env.NODE_ENV + ', Error: ' + error.toString() + ', ' + error.stack);
    }
}

// noinspection JSIgnoredPromiseFromCall
initializeAndStartApp();
