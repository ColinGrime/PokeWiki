import { BrowserWindow } from '@electron/remote';
import $ from 'jquery';

// Add pokemon.js file for all Pokémon-related tasks.
const pokemon = require('./pokemon.js')

// Text replacer.
const textReplacer = require('../assets/data/text-replacer.json')

// Enabling DEBUG_MODE will print additional debug messages.
function DEBUG_MODE() {
    return false
}

$(() => {
    const currentWindow = BrowserWindow.getAllWindows()[0];

    // Display the 1st Pokémon.
    displayPokemonById(1)

    // Quit the application.
    $('#menu-quit').on('click', () => {
        currentWindow.close()
    });

    // Minimize the application.
    $('#menu-minimize').on('click', () => {
        currentWindow.minimize()
    });

    // [Show/Hide] the application.
    let show = true
    $('#menu-show').on('click', () => {
        if (show) {
            currentWindow.setSize(currentWindow.webContents.getOwnerBrowserWindow().getBounds().width, 35, true)
            show = false;
        } else {
            currentWindow.setSize(currentWindow.webContents.getOwnerBrowserWindow().getBounds().width, 700, true)
            show = true;
        }
    });

    // Swap Pokécard on click.
    $('.swap').on('click', () => {
        // TODO do this swappy swap image on pixelman
        $('.swap').css('height', '100px')
    });

    // Search bar mechanics.
    $('#search').on('input', () => {
        let html = ''
        for (const name of pokemon.autoCompleteName($('#search').val())) {
            html += `<li><button class="search-button">${name}</button></li>`
        }

        $('#results-list').html(html)

        if (html === '') {
            $('#results').hide()
        } else {
            $('#results').show()
        }
    })

    // Listen for enter.
    $('#search').on('keypress', (event) => {
        if (event.which === 13) {
            displayPokemon($('#search').val())
        }
    })

    // Erase search bar when unfocused.
    $('#search').on('blur', () => $('#results').hide())

    // Search buttons will auto-fill in on click.
    $('#results-list').on('mousedown', 'li .search-button', (event) => {
        const poke = $(event.target).text()
        $('#search').val(poke)
        $('#results').hide()
        displayPokemon(poke)
    })

    // Move back/forward through the wikipedia.
    $('#go-back').on('click', () => displayPokemonById($('#go-back-value').text()))
    $('#go-forward').on('click', () => displayPokemonById($('#go-forward-value').text()))

    // Switch to the Wikipedia GUI.
    $('#menu-wiki').on('click', () => {
        $('#menu-wiki').css('background', 'var(--dark-hover)')
        $('#menu-battle').css('background', 'none')
        $('#wiki').show()
        $('#battle').hide()
    })

    // Switch to the Battle GUI.
    $('#menu-battle').on('click', () => {
        $('#menu-wiki').css('background', 'none')
        $('#menu-battle').css('background', 'var(--dark-hover)')
        $('#wiki').hide()
        $('#battle').show()
    })

    // Listen for left/right key presses.
    $('body').on('keydown', (event) => {
        if (event.which === 37) {
            displayPokemonById($('#go-back-value').text())
        } else if (event.which === 39) {
            displayPokemonById($('#go-forward-value').text())
        }
    })
});

function displayPokemonById(id) {
    return displayPokemon(pokemon.getName(parseInt(id)))
}

function displayPokemon(name) {
    if (name === null || name === undefined) {
        return
    }

    // Get the Pokemon object.
    const poke = pokemon.getByName(name)
    if (poke === null || poke === undefined || poke.stats === undefined) {
        return
    }

    name = poke.name
    $('.name').text(name)
    $('.id-num').text(poke.id)
    $('.pokemon').attr('src', `../assets/Pokemon/${poke.formalName}.png`)

    // Legendary icon.
    if (poke.isLegendary) {
        $('.legendary').show()
    } else {
        $('.legendary').hide()
    }

    // Types information.
    const types = poke.types
    $('.type').text(types['Types'].join(', '))
    $('.400').text(types['400'].join(', '))
    $('.200').text(types['200'].join(', '))
    $('.50').text(types['50'].join(', '))
    $('.25').text(types['25'].join(', '))
    $('.0').text(types['0'].join(', '))

    // Replace empty types.
    checkEmptyType('.400')
    checkEmptyType('.200')
    checkEmptyType('.50')
    checkEmptyType('.25')
    checkEmptyType('.0')

    function checkEmptyType(type) {
        if ($(type).text() === '') {
            $(type).text('None')
        }
    }

    // Base stats information.
    const stats = poke.stats
    $('.hp-value').text(stats['HP'])
    $('.attack-value').text(stats['Attack'])
    $('.special-attack-value').text(stats['SpecialAttack'])
    $('.defense-value').text(stats['Defense'])
    $('.special-defense-value').text(stats['SpecialDefense'])
    $('.speed-value').text(stats['Speed'])
    $('.total-value').text(stats['Total'])
    $('.average-value').text(stats['Average'])

    // Extra stat indications.
    $('.extra div').each((i, e) => { if (!e.classList.contains('total')) e.innerHTML = '' })
    $(`.extra .${convertStat(stats.Lowest)}`).html('<img src="../assets/extra/Down.png">')
    $(`.extra .${convertStat(stats.Highest)}`).html('<img src="../assets/extra/Up.png">')

    // Extra stat indications.
    $('.stats .attack').css('text-decoration', 'none')
    $('.stats .special-attack').css('text-decoration', 'none')
    if ('Useless' in stats) {
        $(`.stats .${convertStat(stats.Useless)}`).css('text-decoration', 'line-through')
    }

    // Spawn info information.
    $('#content div p').each((i, e) => e.innerText = '')
    $('#content div div').each((i, e) => e.innerHTML = '')
    const spawnInfo = poke.spawnInfo
    for (let i = 0; i < spawnInfo.length; i++) {
        setupBiomes(spawnInfo[i].Biome, spawnInfo[i].CustomForm, i)
        $(`#rarity p:eq(${i})`).text(spawnInfo[i].Rarity)
        $(`#weather p:eq(${i})`).text(spawnInfo[i].Weathers)
        addEmojis(spawnInfo[i].Times, 'time', i)
        addEmojis(spawnInfo[i].Locations, 'location', i)
    }

    function setupBiomes(biome, hasCustomForm, index) {
        let html = `<p>${biome}</p>`

        // Check for custom skin.
        if (hasCustomForm) {
            if (biome === '━') {
                html = '<img src="../assets/extra/Skin.png">'
            } else {
                html += '<img src="../assets/extra/Skin.png">'
            }
        }

        // Set HTML.
        $(`#biome div:eq(${index})`).html(html)
    }

    function addEmojis(section, name, index) {
        if (section === null || section === undefined) {
            return
        }

        // Add emojis.
        let html = ''
        for (const sec of section) {
            // Check for none.
            if (sec === '━') {
                $(`#${name} div:eq(${index})`).text(sec)
                return
            }

            html += `<img src="../assets/extra/${sec}.png"> `
        }

        // Set HTML.
        $(`#${name} div:eq(${index})`).html(html)
    }

    // Set size of spawn panel.
    const size = (spawnInfo.length + 1) * 25 + 2
    if (spawnInfo.length === 0) {
        $('#spawn').hide()
        $('#no-natural-spawning-available').show()
    } else {
        $('#no-natural-spawning-available').hide()
        $('#spawn').show()
        $('#spawn').css('height', `${size}px`)
    }

    // Bottom buttons.
    $('#go-back-value').text(poke.getBack())
    $('#go-forward-value').text(poke.getForward())

    // Replace text.
    replaceHTML()
}

function convertStat(stat) {
    return stat.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function replaceHTML() {
    $('.types p').each((index, element) => element.innerHTML = replaceColors(element.innerHTML))
    $('#content div p').each((index, element) => element.innerText = replaceText(element.innerText))
}

function replaceText(str) {
    if (str === null || str === undefined) {
        return
    }

    // LowerCase text.
    str = str.toLowerCase()

    // Replace text.
    for (const key in textReplacer) {
        if (typeof textReplacer[key] === 'string') {
            str = str.replace(key, textReplacer[key])
        }
    }

    // UpperCase text.
    str = str.replace('_', ' ')
    str = str.split(' ').map((s) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');

    return str
}

function replaceColors(str) {
    if (str === null || str === undefined) {
        return
    }

    // Replace color codes.
    for (const key in textReplacer['Colors']) {
        str = str.replace(key, `<span style="color:${textReplacer['Colors'][key]}">${key}</span>`)
    }

    // Change color of 0% (and avoid changing the last 0% of 100%, etc.)
    if (str.includes('(0%)')) {
        str = str.replace('0%', `<span style="color:#55ffff">0%</span>`)
    }

    return str
}