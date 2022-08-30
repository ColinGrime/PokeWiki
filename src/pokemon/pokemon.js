// list of pokemon
const pokemon = require('pokemon')
const pokemonNames = pokemon.all()

// type colors
const json = require('./types.json')
const types = new Map(Object.entries(json))

function autoCompleteName(str) {
    if (str === '') {
        return []
    }

    const names = pokemonNames.filter(p => p.toLowerCase().startsWith(str.toLowerCase()))
    if (names.length > 5) {
        return names.slice(0, 5)
    }

    return names;
}

// TODO jsdoc comments
function replaceColors(text) {
    for (const type of types.keys()) {
        text = text.replace(type, `<span style="color:${types.get(type)}">${type}</span>`)
    }

    // have to do this to make sure it doesn't change color of 10'0%'
    if (text.includes('(0%)')) {
        text = text.replace('0%', `<span style="color:#55ffff">0%</span>`)
    }

    return text;
}

module.exports = { autoCompleteName, replaceColors } 