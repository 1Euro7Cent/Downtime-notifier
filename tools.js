/**
 * Generate a random int between min and max
 * @param {Number} min 
 * @param {Number} max 
 * @returns {Number}
 */

function random(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
/**
 * get the percentage of x to y
 * @param {Number} x
 * @param {Number} y
 */
function getPercentage(x, y) {
    return (x / y) * 100
}
/**
 * @param {number} a
 * @param {number} b 
 * @param {number} threshold
 */
function isInRange(a, b, threshold = 1000) {
    // round to nearest threshold
    a = Math.round(a / threshold) * threshold
    b = Math.round(b / threshold) * threshold

    return a % b
}

/**
 * check if hex is valid
 * @param {String} hex
 * @example
 * isHex('#ffffff') // true
 * isHex('#fff') // true
 * isHex('#fffffff') // false
 * isHex('#fffffff') // false
 * isHex('#ffffff') // true
 * isHex('#FFaeFb') // true
 * ishHex('FFaeFb') // true
 * isHex('123456') // true
 */
function isHex(hex) {
    if (!hex.startsWith('#')) hex = '#' + hex
    return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(hex)
}
/**
 * mark word at offset and length with "
 * @param {string} text
 * @param {number} offset
 * @param {number} length
 * @param {string} marking
 * @returns {string}
 * @example
 * markWord('hello world', 5, 5) // 'hello "world"'
 * markWord('das ist ein test', 4, 3 ) // 'das "ist" ein test' 
 * markWord('das ist ein test', 4, 3, '*' ) // 'das *ist* ein test'
 */
function markWord(text, offset, length, marking = '"') {
    var before = text.substring(0, offset)
    var after = text.substring(offset + length)
    return `${before}${marking}${text.substring(offset, offset + length)}${marking}${after}`
}

/**
 * this removes one entry of the array with that name
 * @param {any[]} arr 
 * @param {any} name 
 * @returns {any[]} the new array
 * 
 * @example
 * removeElemByName(['a', 'b', 'c'], 'b') // ['a', 'c']
 * removeElemByName(['a', 'b', 'c'], 'd') // ['a', 'b', 'c']
 * removeElemByName(['a', 'b', 'c', 'b'], 'b') // ['a', 'c', 'b']
 */
function removeElemByName(arr, name) {
    var index = arr.indexOf(name)
    if (index == -1) return arr
    return arr.filter((elem, i) => i != index)
}

module.exports = {
    random,
    getPercentage,
    isHex,
    markWord,
    isInRange,
    removeElemByName
}