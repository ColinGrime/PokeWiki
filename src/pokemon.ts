import fs from 'fs';
import * as pokemon from 'pokemon';
import legendary from '../assets/data/legendary.json';
import typeChart from '../assets/data/type-chart.json';
import biomesIgnore from '../assets/data/biomes-ignore.json';
import FuzzySet from 'fuzzyset';

// Get Pokémon names and cache.
const pokemonNames: string[] = [...pokemon.all()];
const pokemonNamesFuzzy = FuzzySet(pokemonNames);
const pokemonCache = new Map();

/**
 * Gets the ID number of a Pokémon.
 * @param name name of the Pokémon
 * @returns full ID with padding of the Pokémon
 */
function getFullId(name: string) {
	const id = pokemon.getId(name);
	if (id === null) {
	    return null;
	}

	return addPadding(id);
}

/**
 * Adds padding to a number.
 * @param idNum id number
 * @returns number with 3 width padding
 */
function addPadding(idNum: number) {
	let id = String(idNum);
	while (id.length < 3) {
		id = '0' + id;
	}

	return id;
}

export class Pokemon {
	name: string;
	formattedName: string;
	id: string;
	isLegendary: boolean;
	types: object;
	stats: object;
	spawns: object[];
	#statsJson: object;
	#spawnsJson: object;

	constructor(name: string) {
		this.name = name;
		this.formattedName = name.replace('.', '').replace(' ', '').replace(':', '').replace('\'', '').replace('’', '').replace('♀', 'female').replace('♂', 'male');
		this.id = getFullId(name);
		this.isLegendary = legendary.includes(name);

		// Attempts to get the types and stats of the Pokémon.
		if (fs.existsSync(`assets/data/stats/${this.id}.json`)) {
			const statsJson = require(`../assets/data/stats/${this.id}.json`);
			this.#statsJson = statsJson;
			this.types = this.#getTypes();
			this.stats = this.#getStats();
		}

		// Atempts to get the spawn info of the Pokémon.
		if (fs.existsSync(`assets/data/spawns/${this.formattedName}.set.json`)) {
			const spawnsJson = require(`../assets/data/spawns/${this.formattedName}.set.json`);
			this.#spawnsJson = spawnsJson;
			this.spawns = this.#getSpawns();
		}
		else {
			this.spawns = [];
		}
	}

	/**
     * @returns all type info about a Pokémon
     */
	#getTypes() {
		const types = this.#statsJson['types'];
		const typeEffectiveness = [];

		// Gets the type effectiveness of the all the Pokémon's types.
		for (const type of types) {
			typeEffectiveness.push(typeChart[type]);
		}

		// Combines the type effectiveness of all the Pokémon's types.
		const combinedTypes = {};
		for (const effectiveness of typeEffectiveness) {
			for (const type in effectiveness) {
				if (type in combinedTypes) {
					combinedTypes[type] = combinedTypes[type] * effectiveness[type];
				}
				else {
					combinedTypes[type] = effectiveness[type];
				}
			}
		}

		// Type multipliers.
		const x400 = [];
		const x200 = [];
		const x50 = [];
		const x25 = [];
		const x0 = [];

		// Sort types and remove those that have an effectiveness of 1.
		for (const type in combinedTypes) {
			switch (combinedTypes[type]) {
			case 1:
				delete combinedTypes[type];
				break;
			case 4:
				x400.push(type);
				break;
			case 2:
				x200.push(type);
				break;
			case 0.5:
				x50.push(type);
				break;
			case 0.25:
				x25.push(type);
				break;
			case 0:
				x0.push(type);
				break;
			}
		}

		return {
			'Types': types,
			'400': x400,
			'200': x200,
			'50': x50,
			'25': x25,
			'0': x0,
		};
	}

	#getStats() {
		const stats = this.#statsJson['stats'];

		// Rename Defence => Defense
		Object.defineProperty(stats, 'Defense', Object.getOwnPropertyDescriptor(stats, 'Defence'));
		delete stats['Defence'];

		// Rename SpecialDefence => SpecialDefense
		Object.defineProperty(stats, 'SpecialDefense', Object.getOwnPropertyDescriptor(stats, 'SpecialDefence'));
		delete stats['SpecialDefence'];

		// Total of the stats.
		let total = 0;
		for (const stat in stats) {
			total += stats[stat];
		}

		// Average value of the stats.
		const average = Math.round(total / 6);

		// Highest and lowest stat.
		const sortedStats = Object.entries(stats).sort(([, v1]: any, [, v2]: any) => v1 - v2);

		// Add them to the JSON object.
		stats.Total = total;
		stats.Average = average;
		stats.Lowest = sortedStats[0][0];
		stats.Highest = sortedStats[sortedStats.length - 1][0];

		// Check for 20% difference of Attack vs. Special Atk.
		if (stats['Attack'] / stats['SpecialAttack'] >= 1.2) {
			stats.Useless = 'SpecialAttack';
		}
		else if (stats['SpecialAttack'] / stats['Attack'] >= 1.2) {
			stats.Useless = 'Attack';
		}

		return stats;
	}

	#getSpawns() {
		const spawnInfos = this.#spawnsJson['spawnInfos'];
		const spawnInfo = [];

		for (const spawn of spawnInfos) {
			const rarity = spawn['rarity'];
			const locations = spawn['stringLocationTypes'];

			// Ignore manmade locations.
			if (locations.includes('Manmade')) {
				continue;
			}

			// Times.
			let times = ['━'];
			if ('condition' in spawn && 'times' in spawn['condition']) {
				times = spawn['condition']['times'];
			}

			// Account for weather multipliers.
			const weathers = [{ 'rarity': 1, 'weather': ['━'] }];
			if ('rarityMultipliers' in spawn && 'condition' in spawn['rarityMultipliers'] && 'weathers' in spawn['rarityMultipliers']['condition']) {
				for (const multipliers of spawn['rarityMultipliers']) {
					weathers.push({
						'rarity': multipliers['multiplier'],
						'weather': multipliers['condition']['weathers'],
					});
				}
			}

			// Custom forms.
			let customForm = false;
			if ('form' in spawn['spec'] && spawn['spec']['form'] !== 0) {
				customForm = true;
			}

			// Unique row per biome if possible.
			if ('condition' in spawn && 'stringBiomes' in spawn['condition']) {
				for (const biome of spawn['condition']['stringBiomes']) {
					if ((biomesIgnore as any).includes(biome)) {
						continue;
					}

					for (const weather of weathers) {
						spawnInfo.push({
							'Biome': biome.split('_').map((s) => s.charAt(0).toUpperCase() + s.substring(1)).join(' '),
							'Rarity': Math.round(rarity * weather['rarity'] * 100) / 100,
							'Times': times,
							'Locations': locations,
							'Weathers': weather['weather'],
							'CustomForm': customForm,
						});
					}
				}
			}
			else {
				spawnInfo.push({
					'Biome': '━',
					'Rarity': rarity,
					'Times': times,
					'Locations': locations,
					'Weathers': '━',
					'CustomForm': customForm,
				});
			}
		}

		spawnInfo.sort((a, b) => parseFloat(b.Rarity) - parseFloat(a.Rarity));
		return spawnInfo.slice(0, 6);
	}

	getBack() {
		const back = parseInt(this.id) - 1;
		return back === 0 ? '905' : addPadding(back);
	}

	getForward() {
		const forward = parseInt(this.id) + 1;
		return forward === 906 ? '001' : addPadding(forward);
	}
}

/**
 * Gets info about a Pokémon if it exists.
 * @param name name of the Pokémon
 * @returns Pokémon class
 */
export function getByName(name: string) {
	// Return null if the name doesn't exist.
	if (!name) {
		return null;
	}

	// Check if the name is already in the cache.
	if (pokemonCache.has(name)) {
		return pokemonCache.get(name);
	}

	// Check if it is a valid Pokémon name.
	let validName = false;
	for (const pokemonName of pokemonNames) {
		if (pokemonName.toLowerCase() === name.toLowerCase()) {
			validName = true;
			name = pokemonName;
			break;
		}
	}

	if (!validName) {
		return;
	}

	// Create a new Pokémon and put it in the cache.
	const pokemon = new Pokemon(name);
	pokemonCache.set(name, pokemon);
	return pokemon;
}

/**
 * Auto-completes the string by finding Pokémon names that are similar to it.
 * @param str any string
 * @returns finds the closest Pokémon name to the string
 */
export function autoComplete(str: string) {
	const names = pokemonNamesFuzzy.get(str, null, 0.3);

	// No close names exist.
	if (!names) {
		return [];
	}

	const arr = [];
	for (const name of names) {
		arr.push(name[1]);
	}

	// Return the 5 closest names.
	return arr.slice(0, 5);
}