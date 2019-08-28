/**
 * This file is the main file for the app
 */
/* -------------------------- Module requirements --------------------------- */
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const expressHandlebars = require('express-handlebars');
const handlebarsHelpers = require('./site/handlebars-helpers');
const favicon = require('serve-favicon');
const i18n = require('i18n');
const i18nHelper = require('./i18n/i18n');

function createApp() {
    return express();
}

function initializeViewEngineWithHandlebars(app) {
    app.set('views', path.join(__dirname));
    app.engine('hbs',
        expressHandlebars({
            extname: 'hbs',
            defaultLayout: 'layout.hbs',
            layoutsDir: __dirname + '/site/layouts',
            partialsDir: [
                __dirname + '/site/partials',
                __dirname + '/i18n/partials'
            ],
            helpers: handlebarsHelpers
        })
    );
    app.set('view engine', 'hbs');
}

function initializeThirdPartyMiddleware(app) {
    app.use(bodyParser.json({limit: '16mb'}));
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(cookieParser());
    app.use(favicon(path.join(__dirname, "../", 'public', 'favicon.ico')));
}

function initializeI18n(app) {
    i18n.configure(i18nHelper.i18nConfigReqRes);
    app.use(i18n.init);
}

function initializeRoutes(app) {
    /* Serve static content first */
    app.use(express.static(path.join(__dirname, '../public')));

    /* Make Handlebars helpers accessible to Express */
    app.use((request, response, next) => {
        request.handlebars = expressHandlebars;
        next();
    });

    /* Make server status checking route available for UpTime */
    app.use("/uptime", (request, response) => response.send({"status": "OK"}));

    /* Routers */
    app.use('/', require('./i18n/router'));

    /* ToDo: index router needs to be last because of its URL parsing algorithm */
    app.use('/', require('./site/router'));
}

function initializeErrorHandlers(app) {
    app.use(function (request, response, next) {
        const error = new Error('Not Found');
        error.status = 404;
        next(error);
    });
    app.use(function (error, request, response) {
        response.status(error.status || 500);
        response.render('core/error', {
            message: error.message,
            error: (app.get('env') !== 'production') ? error : {}
        });
    });
}

const app = createApp();
initializeViewEngineWithHandlebars(app);
initializeThirdPartyMiddleware(app);
initializeI18n(app);
initializeRoutes(app);
initializeErrorHandlers(app);

module.exports = app;
