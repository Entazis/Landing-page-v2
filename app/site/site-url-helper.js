const _knownPageSlugs = [
    'about',
    'admin',
    'base',
    'branding-guidelines',
    'course-listing',
    'course-page',
    'discount',
    'error',
    'index',
    'landing',
    'press',
    'pricing',
    'privacy-policy',
    'referral',
    'refund-policy',
    'reviews',
    'scholarship',
    'student-works',
    'team',
    'terms-of-service'
];

/**
 * @param {string} slug
 * @returns {boolean}
 */
function isKnownPageSlug(slug) {
    return _knownPageSlugs.includes(slug);
}

function getAllKnownPageSlugs() {
    return _knownPageSlugs;
}

module.exports = {
    isKnownPageSlug,
    getAllKnownPageSlugs,
};