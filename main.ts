// Modules to control application life and create native browser window
import { app, BrowserWindow } from 'electron';
import * as remote from '@electron/remote/main';

// Initialize remote.
remote.initialize();

function createWindow() {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		width: 800,
		height: 636,
		minWidth: 636,
		minHeight: 35,
		resizable: false,
		frame: false,
		transparent: true,
		hasShadow: true,
		title: 'Pokémon Wikipedia',
		icon: __dirname + '/assets/Logo.png',
		roundedCorners: false,
		alwaysOnTop: true,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			// enableRemoteModule: true
		},
	});

	// Enable web contents.
	remote.enable(mainWindow.webContents);

	// Load index.html of the app.
	mainWindow.loadFile('./src/index.html');
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
	createWindow();

	app.on('activate', function() {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', function() {
	if (process.platform !== 'darwin') app.quit();
});