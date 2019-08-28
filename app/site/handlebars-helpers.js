/**
 * This module defines the possible handlebars helpers
 */

/**
 * @param {string} leftValue
 * @param {string} rightValue
 * @param {object} options
 * @returns {boolean} compared
 */
const compare = function (leftValue, rightValue, options) {
    if (arguments.length === 3) {
        const operators = {
            '@=': (left, right) => left === (right - 1),
            '==': (left, right) => left === right,
            '===': (left, right) => left === right,
            '!=': (left, right) => left !== right,
            '<': (left, right) => left < right,
            '>': (left, right) => left > right,
            '<=': (left, right) => left <= right,
            '>=': (left, right) => left >= right,
            'typeof': (left, right) => typeof left === right
        };

        const operator = options.hash.operator || "==";
        if (operators[operator]) {
            const result = operators[operator](leftValue, rightValue);
            return result ? options.fn(this) : options.inverse(this);
        } else {
            throw new Error("Handlebars Helper 'compare' doesn't know the operator '" + operator + "'");
        }
    } else {
        throw new Error("Handlebars Helper 'compare' needs 3 parameters");
    }
};

const ifEven = function (conditional, options) {
    return ((conditional % 2) === 0) ? options.fn(this) : options.inverse(this);
};

module.exports = {
    compare,
    ifEven
};
