const { BrowserWindow } = require('@electron/remote')
window.$ = window.jQuery = require('jquery')

// Add pokemon.js file for all Pokémon-related tasks.
const pokemon = require('./pokemon/pokemon.js')

$(() => {
    currentWindow = BrowserWindow.getAllWindows()
    currentWindow = currentWindow[0]

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

    // Go through all Pokémon types and color code accordingly.
    $('.types p').each((index, element) => {
        element.innerHTML = pokemon.replaceColors(element.innerHTML)
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

    // Erase search bar when unfocused.
    $('#search').on('blur', () => $('#results').hide())

    // Search buttons will auto-fill in on click.
    $('#results-list').on('mousedown', 'li .search-button', (event) => {
        $('#search').val($(event.target).text())
        $('#results').hide()
    })
});