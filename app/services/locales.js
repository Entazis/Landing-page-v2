const i18n = require('i18n');

function getUrlLocale(country_code) {
    let urlLocale;
    if (country_code === 'ID') {
        urlLocale = 'id';
    } else if (country_code === 'MX') {
        urlLocale = 'esmx';
    } else if (country_code === 'HU') {
        urlLocale = 'hu';
    } else if (country_code === 'PL') {
        urlLocale = 'pl';
    } else if (country_code === 'BR') {
        urlLocale = 'ptbr';
    } else if (country_code === 'RO') {
        urlLocale = 'ro';
    } else if (country_code === 'VI') {
        urlLocale = 'vi';
    } else {
        urlLocale = 'en';
    }
    return urlLocale;
}

function getFullLocale(urlLocale) {
    let fullLocale;
    if (urlLocale === 'id') {
        fullLocale = 'id-ID';
    } else if (urlLocale === 'esmx') {
        fullLocale = 'es-MX';
    } else if (urlLocale === 'hu') {
        fullLocale = 'hu-HU';
    } else if (urlLocale === 'pl') {
        fullLocale = 'pl-PL';
    } else if (urlLocale === 'ptbr') {
        fullLocale = 'pt-BR';
    } else if (urlLocale === 'ro') {
        fullLocale = 'ro-RO';
    } else if (urlLocale === 'vi') {
        fullLocale = 'vi-VN';
    } else {
        fullLocale = 'en-US';
    }
    return fullLocale;
}

// get page's title
function getTitle(nextPage, fullLocale) {
    let title;

    const catalogForLocale = i18n.getCatalog(fullLocale);
    const phrase = Object.keys(catalogForLocale).find(key => catalogForLocale[key] === nextPage);

    switch (phrase) {
        case 'discount':
            title = i18n.__({phrase: 'Discount', locale: fullLocale});
            break;
        case 'press':
            title = i18n.__({phrase: 'Press', locale: fullLocale});
            break;
        case 'reviews':
            title = i18n.__({phrase: 'Reviews', locale: fullLocale});
            break;
        case 'about':
            title = i18n.__({phrase: 'About', locale: fullLocale});
            break;
        case 'pricing':
            title = i18n.__({phrase: 'Pricing', locale: fullLocale});
            break;
        case 'error':
            title = i18n.__({phrase: 'Error', locale: fullLocale});
            break;
        case 'referral':
            title = i18n.__({phrase: 'Referral', locale: fullLocale});
            break;
        case 'scholarship':
            title = i18n.__({phrase: 'Scholarship', locale: fullLocale});
            break;
        case 'privacy-policy':
            title = i18n.__({phrase: 'Privacy Policy', locale: fullLocale});
            break;
        case 'refund-policy':
            title = i18n.__({phrase: 'Refund Policy', locale: fullLocale});
            break;
        case 'terms-of-service':
            title = i18n.__({phrase: 'Terms of Service', locale: fullLocale});
            break;
        case 'branding-guidelines':
            title = i18n.__({phrase: 'Branding Guidelines', locale: fullLocale});
            break;
        case 'team':
            title = i18n.__({phrase: 'Our Team', locale: fullLocale});
            break;
        case 'student-works':
            title = i18n.__({phrase: 'Student Works', locale: fullLocale});
            break;
        case 'course-listing':
            title = i18n.__({phrase: 'Courses Listing', locale: locale});
            break;
        case 'course-page':
            title = i18n.__({phrase: 'Course Page', locale: locale});
            break;
        case 'index':
        case 'landing':
            title = i18n.__({phrase: 'Learn programming', locale: fullLocale});
            break;
        default:
            title = 'CodeBerry';
    }

    return title;
}

module.exports = {getUrlLocale, getTitle, getFullLocale};