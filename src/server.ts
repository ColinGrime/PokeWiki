const DEBUG = false

const { ipcRenderer } = require('electron');
const isEqual = require('lodash/isEqual');

// Listen for when the player is in a Pokémon battle.
const http = require('http').createServer()
const io = require('socket.io')(http)

// Processes battle screenshot and reads for enemy Pokémon name.
const Jimp = require('jimp');
const { getMoveDetermination } = require('./move-determination');
const { getByName, autoCompleteName } = require('./pokemon');

// Check if request is ongoing.
let requestOngoing = false

// Variable for holding Pokémon battle information.
let battleInfo = undefined
let enemyName = undefined
let isSameLineUp = false

// Establishes connection to the server.
io.on('connection', (socket) => {
    console.log('Connection from client has been established!')

    // Listen for when a battle is received.
    socket.on("battle", (arg) => {
        if (requestOngoing) {
            return
        }

        // Close for 5 seconds.
        requestOngoing = true
        setInterval(() => {
            requestOngoing = false
        }, 5000)


        const json = JSON.parse(arg)
        if (battleInfo !== undefined && isEqual(battleInfo['Main'], json['Main']) && isEqual(battleInfo['Party'], json['Party'])) {
            isSameLineUp = true
        }

        battleInfo = json
        processImage(battleInfo['EnemyScreenshot'])
    })

    // Listen for when the player wants to search for a Pokémon.
    socket.on("pokesearch", (arg) => {
        displayPokemon(arg)
    })
})

http.listen(8080, () => {
    console.log("Starting HTTP server...")
})

// Reads battle screenshot.
function processImage(path) {
    const time = Date.now()
    if (DEBUG_MODE()) {
        console.log(`Processing battle image at path: ${path}`)
    }

    Jimp.read(path).then(image => {
        const width = image.bitmap.width
        const height = image.bitmap.height

        // Preprocesses image for more accurate readings.
        image = image.crop(width * 0.05, 0, width * 0.5, height * 0.2)
        image = image.invert()
        image = image.scan(0, 0, width, height, (x, y, idx) => {
            if (image.bitmap.data[idx] < 2 || image.bitmap.data[idx] >= 20) {
                image.bitmap.data[idx] = 255
                image.bitmap.data[idx + 1] = 255
                image.bitmap.data[idx + 2] = 255
            }
        });

        image.write('./battle/battle.png')        
        ipcRenderer.send('request-ocr')

        if (DEBUG_MODE()) {
            console.log(`Battle image proprocessing complete in ${Date.now() - time}ms. Commencing OCR on image...`)
        }
    }).catch(err => {
        console.log(err)
    })
}

ipcRenderer.on('ocr-complete', (event, arg) => {
    const names = autoCompleteName(arg)
    if (names === undefined || names.length == 0) {
        return
    }

    // Most likely name of the enemy.
    const name = names[0]

    // Check if it's the same line-up.
    if (isSameLineUp) {
        isSameLineUp = false
        if (enemyName === name) {
            return
        }
    }

    // Enemy Pokémon.
    enemyName = name
    const enemyPokemon = getByName(name)

    // Pokémon that is currently in battle.
    const mainPokemon = getByName(battleInfo['Main']['Name'])
    mainPokemon.setMoves(battleInfo['Main']['Moves'])
    mainPokemon.setHealth(battleInfo['Main']['Health'])

    // Other Pokémon in the party (that are still alive).
    const partyPokemons = []
    for (const party of battleInfo['Party']) {
        const partyPokemon = getByName(party['Name'])
        partyPokemon.setMoves(party['Moves'])
        partyPokemon.setHealth(party['Health'])
        partyPokemons.push(partyPokemon)
    }

    const moveDetermination = getMoveDetermination(enemyPokemon, mainPokemon, partyPokemons)
    console.log(`The score for the main Pokémon is: ${moveDetermination.scoreMainFight()}`)
});