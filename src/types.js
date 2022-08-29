const json = require('./types.json')
const types = new Map(Object.entries(json));

function replaceColors(text) {
    for (const type of types.keys()) {
        text = text.replace(type, `<span style="color:${types.get(type)}">${type}</span>`)
    }

    if (text.includes('(0%)')) {
        text = text.replace('0%', `<span style="color:#55ffff">0%</span>`)
    }

    return text;
}

module.exports = { replaceColors } 