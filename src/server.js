// Listen for when the player is in a Pokémon battle.
const http = require('http').createServer()
const io = require('socket.io')(http)

// Processes battle screenshot and reads for enemy Pokémon name.
const Jimp = require('jimp')
const Tesseract = require('tesseract.js')

// Establishes connection to the server.
io.on('connection', (socket) => {
    console.log('Connection from client has been established!')

    // Listen for when a battle is received.
    socket.on("battle-image", (arg) => {
        console.log(`The path of the battle image is ${arg}`)
        processImage(arg)
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
    Jimp.read(path).then(image => {
        const width = image.bitmap.width
        const height = image.bitmap.height

        // Preprocesses image for more accurate readings.
        image = image.crop(0, 0, width * 0.5, height * 0.2)
        image = image.invert()
        image = image.scan(0, 0, width, height, (x, y, idx) => {
            if (image.bitmap.data[idx] < 10 || image.bitmap.data[idx] >= 20) {
                image.bitmap.data[idx] = 255
                image.bitmap.data[idx + 1] = 255
                image.bitmap.data[idx + 2] = 255
            }
        });

        image.write('./battle/battle.png')
        readImage()
    }).catch(err => {
        console.log(err)
    })
}

// Reads the battle screenshot and logs the result.
function readImage() {
    Tesseract.recognize('./battle/battle.png', 'eng', {
        logger: m => console.log(m)
    }
    ).then(({ data: { text } }) => {
        console.log(text);
    })
}