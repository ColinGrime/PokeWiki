import { BrowserWindow } from '@electron/remote';
import $ from 'jquery';

import { getName } from 'pokemon';
import { getByName, autoComplete, Pokemon } from './pokemon.js';
import textReplacer from '../assets/data/text-replacer.json';

$(() => {
	const currentWindow = BrowserWindow.getAllWindows()[0];

	// Display the 1st Pokémon.
	displayPokemonById(1);

	// Quit the application.
	$('#menu-quit').on('click', () => {
		currentWindow.close();
	});

	// Minimize the application.
	$('#menu-minimize').on('click', () => {
		currentWindow.minimize();
	});

	// [Show/Hide] the application.
	let show = true;
	$('#menu-show').on('click', () => {
		if (show) {
			currentWindow.setSize((currentWindow.webContents as any).getOwnerBrowserWindow().getBounds().width, 35, true);
			show = false;
		}
		else {
			currentWindow.setSize((currentWindow.webContents as any).getOwnerBrowserWindow().getBounds().width, 700, true);
			show = true;
		}
	});

	// Swap Pokécard on click.
	$('.swap').on('click', () => {
		// TODO Swap Pokémon image.
		// $('.swap').css('height', '100px')
	});

	// Search bar mechanics.
	$('#search').on('input', () => {
		let html = '';
		for (const name of autoComplete($('#search').val() as string)) {
			html += `<li><button class="search-button">${name}</button></li>`;
		}

		$('#results-list').html(html);

		if (html === '') {
			$('#results').hide();
		}
		else {
			$('#results').show();
		}
	});

	// Listen for enter.
	$('#search').on('keypress', (event) => {
		if (event.which === 13) {
			displayPokemon($('#search').val() as string);
		}
	});

	// Erase search bar when unfocused.
	$('#search').on('blur', () => $('#results').hide());

	// Search buttons will auto-fill in on click.
	$('#results-list').on('mousedown', 'li .search-button', (event) => {
		const pokemon = $(event.target).text();
		$('#search').val(pokemon);
		$('#results').hide();
		displayPokemon(pokemon);
	});

	// Move back/forward through the wikipedia.
	$('#go-back').on('click', () => displayPokemonById($('#go-back-value').text()));
	$('#go-forward').on('click', () => displayPokemonById($('#go-forward-value').text()));

	// Switch to the Wikipedia GUI.
	$('#menu-wiki').on('click', () => {
		$('#menu-wiki').css('background', 'var(--dark-hover)');
		$('#menu-battle').css('background', 'none');
		$('#wiki').show();
		$('#battle').hide();
	});

	// Listen for left/right key presses.
	$('body').on('keydown', (event) => {
		if (event.which === 37) {
			displayPokemonById($('#go-back-value').text());
		}
		else if (event.which === 39) {
			displayPokemonById($('#go-forward-value').text());
		}
	});
});

/**
 * Displays the Pokémon on the screen.
 * @param id id of a Pokémon
 */
function displayPokemonById(id: string | number) {
	return displayPokemon(getName(parseInt(id as string)));
}

/**
 * Displays the Pokémon on the screen.
 * @param name name of a Pokémon
 */
function displayPokemon(name: string) {
	if (!name) {
		return;
	}

	// Get the Pokemon object.
	const pokemon: Pokemon = getByName(name);
	if (!pokemon || !pokemon.stats) {
		return;
	}

	name = pokemon.name;
	$('.name').text(name);
	$('.id-num').text(pokemon.id);
	$('.pokemon').attr('src', `../assets/Pokemon/${pokemon.formattedName}.png`);

	// Legendary icon.
	if (pokemon.isLegendary) {
		$('.legendary').show();
	}
	else {
		$('.legendary').hide();
	}

	// Types information.
	const types = pokemon.types;
	$('.type').text(types['Types'].join(', '));
	$('.400').text(types['400'].join(', '));
	$('.200').text(types['200'].join(', '));
	$('.50').text(types['50'].join(', '));
	$('.25').text(types['25'].join(', '));
	$('.0').text(types['0'].join(', '));

	// Replace empty types.
	checkEmptyType('.400');
	checkEmptyType('.200');
	checkEmptyType('.50');
	checkEmptyType('.25');
	checkEmptyType('.0');

	function checkEmptyType(type: string) {
		if ($(type).text() === '') {
			$(type).text('None');
		}
	}

	// Base stats information.
	const stats = pokemon.stats;
	$('.hp-value').text(stats['HP']);
	$('.attack-value').text(stats['Attack']);
	$('.special-attack-value').text(stats['SpecialAttack']);
	$('.defense-value').text(stats['Defense']);
	$('.special-defense-value').text(stats['SpecialDefense']);
	$('.speed-value').text(stats['Speed']);
	$('.total-value').text(stats['Total']);
	$('.average-value').text(stats['Average']);

	// Extra stat indications.
	$('.extra div').each((i, e) => { if (!e.classList.contains('total')) e.innerHTML = ''; });
	$(`.extra .${convertStat(stats['Lowest'])}`).html('<img src="../assets/extra/Down.png">');
	$(`.extra .${convertStat(stats['Highest'])}`).html('<img src="../assets/extra/Up.png">');

	// Extra stat indications.
	$('.stats .attack').css('text-decoration', 'none');
	$('.stats .special-attack').css('text-decoration', 'none');
	if ('Useless' in stats) {
		$(`.stats .${convertStat(stats['Useless'])}`).css('text-decoration', 'line-through');
	}

	// Spawn info information.
	$('#content div p').each((i, e) => e.innerText = null);
	$('#content div div').each((i, e) => e.innerHTML = null);
	const spawns = pokemon.spawns;
	for (let i = 0; i < spawns.length; i++) {
		setupBiomes(spawns[i]['Biome'], spawns[i]['CustomForm'], i);
		$(`#rarity p:eq(${i})`).text(spawns[i]['Rarity']);
		$(`#weather p:eq(${i})`).text(spawns[i]['Weathers']);
		addEmojis(spawns[i]['Times'], 'time', i);
		addEmojis(spawns[i]['Locations'], 'location', i);
	}

	function setupBiomes(biome, hasCustomForm, index) {
		let html = `<p>${biome}</p>`;

		// Check for custom skin.
		if (hasCustomForm) {
			if (biome === '━') {
				html = '<img src="../assets/extra/Skin.png">';
			}
			else {
				html += '<img src="../assets/extra/Skin.png">';
			}
		}

		// Set HTML.
		$(`#biome div:eq(${index})`).html(html);
	}

	function addEmojis(section, name, index) {
		if (!section) {
			return;
		}

		// Add emojis.
		let html = '';
		for (const sec of section) {
			// Check for none.
			if (sec === '━') {
				$(`#${name} div:eq(${index})`).text(sec);
				return;
			}

			html += `<img src="../assets/biome-graphics/${sec}.png"> `;
		}

		// Set HTML.
		$(`#${name} div:eq(${index})`).html(html);
	}

	// Set size of spawn panel.
	const size = (spawns.length + 1) * 25 + 2;
	if (spawns.length === 0) {
		$('#spawn').hide();
		$('#no-natural-spawning-available').show();
	}
	else {
		$('#no-natural-spawning-available').hide();
		$('#spawn').show();
		$('#spawn').css('height', `${size}px`);
	}

	// Bottom buttons.
	$('#go-back-value').text(pokemon.getBack());
	$('#go-forward-value').text(pokemon.getForward());

	// Replace HTML.
	$('.types p').each((index, element) => {
		element.innerHTML = replaceColors(element.innerHTML)
	});

	$('#content div p').each((index, element) => {
		element.innerText = formatText(element.innerText)
	});
}

function convertStat(stat) {
	return stat.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Formats text.
 * @param str string to replace
 * @returns replaced string
 */
function formatText(str: string): string {
	if (!str) {
		return null;
	}

	// LowerCase text.
	str = str.toLowerCase();

	// Replace text.
	for (const key in textReplacer) {
		if (typeof textReplacer[key] === 'string') {
			str = str.replace(key, textReplacer[key]);
		}
	}

	// UpperCase text.
	str = str.replace('_', ' ');
	str = str.split(' ').map((s) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');

	return str;
}

/**
 * Replaces a string with color codes.
 * @param str string to replace with color codes
 * @returns replaced string with color codeds
 */
function replaceColors(str: string): string {
	if (!str) {
		return null;
	}

	// Replace color codes.
	for (const key in textReplacer['Colors']) {
		str = str.replace(key, `<span style="color:${textReplacer['Colors'][key]}">${key}</span>`);
	}

	// Change color of 0% (and avoid changing the last 0% of 100%, etc.)
	if (str.includes('(0%)')) {
		str = str.replace('0%', '<span style="color:#55ffff">0%</span>');
	}

	return str;
}