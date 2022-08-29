const { app, BrowserWindow } = require('@electron/remote')
window.$ = window.jQuery = require('jquery')
const types = require('./types.js')

let show = true;

$(() => {
    currentWindow = BrowserWindow.getAllWindows()
    currentWindow = currentWindow[0]

    // TODO not closed all the way
    $('#menu-quit').on('click', () => {
        currentWindow.close()
    });

    $('#menu-minimize').on('click', () => {
        currentWindow.minimize()
    });

    $('#menu-show').on('click', () => {
        if (show) {
            currentWindow.setSize(currentWindow.webContents.getOwnerBrowserWindow().getBounds().width, 35, true)
            show = false;
        } else {
            currentWindow.setSize(currentWindow.webContents.getOwnerBrowserWindow().getBounds().width, 600, true)
            show = true;
        }
    });

    $('.swap').on('click', () => {
        // TODO do this swappy swap image on pixelman
        $('.swap').css('height', '100px')
    });

    $('.types p').each((i, p) => {
        p.innerHTML = types.replaceColors(p.innerHTML)
    });
});