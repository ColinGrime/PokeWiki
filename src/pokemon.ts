import fs from 'fs';
import pokemon from 'pokemon';
const pokemonNames = pokemon.all()
import legendary from '../assets/data/legendary.json';
import typeChart from '../assets/data/type-chart.json';
import biomesIgnore from '../assets/data/biomes-ignore.json';
const pokemonCache = new Map()
const pokeFuzz = require('fuzzyset')(pokemonNames)

function getFullId(name) {
    let id = pokemon.getId(name)
    if (id === null) {
        return null
    }

    return addPadding(id)
}

function addPadding(idNum) {
    let id = String(idNum)
    while (id.length < 3) {
        id = "0" + id
    }

    return id
}

function formatName(str) {
    return str.replace('.', '').replace(' ', '').replace(':', '').replace('\'', '').replace('’', '').replace('♀', 'female').replace('♂', 'male')
}

class Pokemon {
    name
    formalName
    id
    types
    stats
    spawnInfo
    isLegendary
    #statsJson
    #spawnInfoJson
    #moveSet
    #health

    constructor(name) {
        this.name = name
        this.formalName = formatName(name)
        this.id = getFullId(name)
        this.isLegendary = legendary.includes(name)

        if (fs.existsSync(`assets/data/stats/${this.id}.json`)) {
            this.#statsJson = require(`../assets/data/stats/${this.id}.json`)
            this.types = this.#getTypes()
            this.stats = this.#getStats()
        }

        if (fs.existsSync(`assets/data/spawns/${this.formalName}.set.json`)) {
            this.#spawnInfoJson = require(`../assets/data/spawns/${this.formalName}.set.json`)
            this.spawnInfo = this.#getSpawnInfo()
        } else {
            this.spawnInfo = []
        }
    }

    #getTypes() {
        const types = this.#statsJson['types']
        const typeEffectiveness = []

        // Gets the type effectiveness of the all the Pokémon's types.
        for (const type of types) {
            typeEffectiveness.push(typeChart[type])
        }

        // Combines the type effectiveness of all the Pokémon's types.
        const combinedTypes = {}
        for (const effectiveness of typeEffectiveness) {
            for (const type in effectiveness) {
                if (type in combinedTypes) {
                    combinedTypes[type] = combinedTypes[type] * effectiveness[type]
                } else {
                    combinedTypes[type] = effectiveness[type]
                }
            }
        }

        // Type multipliers.
        let x400 = []
        let x200 = []
        let x50 = []
        let x25 = []
        let x0 = []

        // Sort types and remove those that have an effectiveness of 1.
        for (const type in combinedTypes) {
            switch (combinedTypes[type]) {
                case 1:
                    delete combinedTypes[type]
                    break
                case 4:
                    x400.push(type)
                    break
                case 2:
                    x200.push(type)
                    break
                case 0.5:
                    x50.push(type)
                    break
                case 0.25:
                    x25.push(type)
                    break
                case 0:
                    x0.push(type)
                    break
            }
        }

        return {
            "Types": types,
            "400": x400,
            "200": x200,
            "50": x50,
            "25": x25,
            "0": x0
        }
    }

    #getStats() {
        const stats = this.#statsJson['stats']

        // Rename Defence => Defense
        Object.defineProperty(stats, 'Defense', Object.getOwnPropertyDescriptor(stats, 'Defence'))
        delete stats['Defence']

        // Rename SpecialDefence => SpecialDefense
        Object.defineProperty(stats, 'SpecialDefense', Object.getOwnPropertyDescriptor(stats, 'SpecialDefence'))
        delete stats['SpecialDefence']

        // Total of the stats.
        let total = 0
        for (const stat in stats) {
            total += stats[stat]
        }

        // Average value of the stats.
        const average = Math.round(total / 6)

        // Highest and lowest stat.
        const sortedStats = Object.entries(stats).sort(([, v1], [, v2]) => v1 - v2);

        // Add them to the JSON object.
        stats.Total = total
        stats.Average = average
        stats.Lowest = sortedStats[0][0]
        stats.Highest = sortedStats[sortedStats.length - 1][0]

        // Check for 20% difference of Attack vs. Special Atk.
        if (stats['Attack'] / stats['SpecialAttack'] >= 1.2) {
            stats.Useless = 'SpecialAttack'
        } else if (stats['SpecialAttack'] / stats['Attack'] >= 1.2) {
            stats.Useless = 'Attack'
        }

        return stats
    }

    #getSpawnInfo() {
        const spawnInfos = this.#spawnInfoJson['spawnInfos']
        const spawnInfo = []

        for (const spawn of spawnInfos) {
            const rarity = spawn['rarity']
            const locations = spawn['stringLocationTypes']

            // Ignore manmade locations.
            if (locations.includes('Manmade')) {
                continue;
            }

            // Times.
            let times = ['━']
            if ('condition' in spawn && 'times' in spawn['condition']) {
                times = spawn['condition']['times']
            }

            // Account for weather multipliers.
            const weathers = [{ 'rarity': 1, 'weather': ['━'] }]
            if ('rarityMultipliers' in spawn && 'condition' in spawn['rarityMultipliers'] && 'weathers' in spawn['rarityMultipliers']['condition']) {
                for (const multipliers of spawn['rarityMultipliers']) {
                    weathers.push({
                        'rarity': multipliers['multiplier'],
                        'weather': multipliers['condition']['weathers']
                    })
                }
            }

            // Custom forms.
            let customForm = false
            if ('form' in spawn['spec'] && spawn['spec']['form'] !== 0) {
                customForm = true
            }

            // Unique row per biome if possible.
            if ('condition' in spawn && 'stringBiomes' in spawn['condition']) {
                for (const biome of spawn['condition']['stringBiomes']) {
                    if (biomesIgnore['Biomes'].includes(biome)) {
                        continue
                    }

                    for (const weather of weathers) {
                        spawnInfo.push({
                            'Biome': biome.split('_').map((s) => s.charAt(0).toUpperCase() + s.substring(1)).join(' '),
                            'Rarity': Math.round(rarity * weather['rarity'] * 100) / 100,
                            'Times': times,
                            'Locations': locations,
                            'Weathers': weather['weather'],
                            'CustomForm': customForm
                        })
                    }
                }
            } else {
                spawnInfo.push({
                    'Biome': '━',
                    'Rarity': rarity,
                    'Times': times,
                    'Locations': locations,
                    'Weathers': '━',
                    'CustomForm': customForm
                })
            }
        }

        spawnInfo.sort((a, b) => parseFloat(b.Rarity) - parseFloat(a.Rarity))
        return spawnInfo.slice(0, 6)
    }

    getMoves() {
        if (this.#moveSet !== undefined) {
            return this.#moveSet
        }

        const eggMoves = getMoves(this.#statsJson, 'eggMoves')
        const transferMoves = getMoves(this.#statsJson, 'transferMoves')
        const hmMoves = getMoves(this.#statsJson, 'hmMoves')
        const trMoves = getMoves(this.#statsJson, 'trMoves')
        const tmMoves8 = getMoves(this.#statsJson, 'tmMoves8')
        const tmMoves7 = getMoves(this.#statsJson, 'tmMoves7')
        const tmMoves6 = getMoves(this.#statsJson, 'tmMoves6')
        const tmMoves5 = getMoves(this.#statsJson, 'tmMoves5')
        const tmMoves4 = getMoves(this.#statsJson, 'tmMoves4')
        const tmMoves3 = getMoves(this.#statsJson, 'tmMoves3')
        const tmMoves2 = getMoves(this.#statsJson, 'tmMoves2')
        const tmMoves1 = getMoves(this.#statsJson, 'tmMoves1')
        const levelUpMoves = getLevelUpMoves(this.#statsJson)

        function getMoves(statsJson, name) {
            return name in statsJson ? statsJson[name] : []
        }

        function getLevelUpMoves(statsJson) {
            if (!('levelUpMoves' in statsJson)) {
                return
            }

            let arr = []
            for (const level in statsJson['levelUpMoves']) {
                arr = arr.concat(statsJson['levelUpMoves'][level])
            }
            return arr
        }

        this.#moveSet = [...new Set([...eggMoves, ...transferMoves, ...hmMoves, 
            ...trMoves, ...tmMoves8, ...tmMoves7, 
            ...tmMoves6, ...tmMoves5, ...tmMoves4, 
            ...tmMoves3, ...tmMoves2, ...tmMoves1, 
            ...levelUpMoves])]
            
        return this.#moveSet
    }

    setMoves(moveSet) {
        this.#moveSet = moveSet
    }

    getHealth() {
        if (this.#health !== undefined) {
            return this.#health
        }

        return Math.floor(0.01 * (2 * this.stats['HP'] + 31 + Math.floor(0.25 * 252)) * 100) + 100 + 10
    }

    setHealth(health) {
        this.#health = health
    }

    getBack() {
        const back = parseInt(this.id) - 1
        return back === 0 ? '905' : addPadding(back)
    }

    getForward() {
        const forward = parseInt(this.id) + 1
        return forward === 906 ? '001' : addPadding(forward)
    }
}

export function getByName(name) {
    if (name === null || name === undefined || typeof name !== 'string') {
        return null
    }

    // Check if the name is already in the cache.
    if (pokemonCache.has(name)) {
        return pokemonCache.get(name)
    }

    // Check if it is a valid Pokémon name.
    validName = false
    for (const pokemonName of pokemonNames) {
        if (pokemonName.toLowerCase() === name.toLowerCase()) {
            validName = true
            name = pokemonName
            break
        }
    }

    if (!validName) {
        return
    }

    const pokemon = new Pokemon(name)
    pokemonCache.set(name, pokemon)
    return pokemon
}

export function getName(id) {
    return pokemon.getName(id)
}

export function autoCompleteName(str) {
    if (typeof str !== 'string' || str === '') {
        return []
    }

    const names = pokeFuzz.get(str)
    if (names === null || names === undefined) {
        return []
    }

    const arr = []
    for (const name of names) {
        arr.push(name[1])
    }

    return arr.slice(0, 5)
}