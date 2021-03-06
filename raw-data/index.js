const fs = require('fs')
const _ = require('lodash')
const d3 = require('d3')
const XLSX = require('xlsx')

process.chdir(__dirname)

const CPR_MAPPING = {
  Angola: 'AGO',
  Australia: 'AUS',
  Brazil: 'BRA',
  Fiji: 'FJI',
  Kazakhstan: 'KAZ',
  Kyrgyzstan: 'KGZ',
  Liberia: 'LBR',
  Mexico: 'MEX',
  Mozambique: 'MOZ',
  Nepal: 'NPL',
  NewZealand: 'NZL',
  'New Zealand': 'NZL',
  SaudiArabia: 'SAU',
  'Saudi Arabia': 'SAU',
  UnitedKingdom: 'GBR',
  'United Kingdom': 'GBR',
}

function round(float) {
  return parseFloat(parseFloat(float).toFixed(1))
}

function readSheet(fileName, sheetIndex = 0) {
  console.log(`Reading ${fileName}`)
  const workbook = XLSX.readFile(fileName)
  const sheet = workbook.Sheets[workbook.SheetNames[sheetIndex]]
  return sheet
}

function sheetRows(sheet, columns = 'AZ', startFromRow = 0) {
  const [colStart, rowStart, colEnd, rowEnd] = sheet['!ref'].match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/).slice(1)

  console.assert(
    colStart === columns[0] && colEnd === columns[1],
    `Warning! The number of columns has changed from the master format: Expected = ${columns}, Actual = ${colStart + colEnd}`
  )

  const rows = _.range(parseInt(rowStart) + startFromRow, parseInt(rowEnd)).map((rowN) => {
    const row = {}
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(colN => {
      const cell = sheet[`${colN}${rowN}`]
      const value = cell ? cell.v : null
      row[colN] = value
    })
    return row
  })

  return rows
}

function ESRHighIncome() {
  const rows = sheetRows(readSheet('esr-high-income.xlsx'), 'AS', 1).map(row => {
    const datum = {
      countryName: row.A,
      countryCode: row.C,
      year: row.B,
      isHighIncome: parseInt(row.D) === 1,
      isOECD: parseInt(row.E) === 1,
      geoRegion: row.F,
      GDP: round(row.G),
      SERF: round(row.H),
      rights: {
        food: round(row.I),
        food_sub: {
          normalBirthweightInfants: round(row.J),
        },
        education: round(row.K),
        education_sub: {
          combinedSchoolEnrollment: round(row.L),
          educationQuality: round(row.M),
        },
        work: round(row.Q),
        work_sub: {
          notLongTermUnemployed: round(row.R),
          notRelativelyPoor: round(row.S),
        },
        housing: null,
        housing_sub: {
          // No sub-indicators for Housing in this esrStandard
        },
        health: round(row.N),
        health_sub: {
          childSurvival: round(row.O),
          survivalToAge65: round(row.P),
        },
      },
    }
    return datum
  })

  const countries = d3.nest()
    .key(d => d.countryCode)
    .rollup(countryYears => {
      const historical = d3.nest()
        .key(d => d.year)
        .rollup(ds => {
          console.assert(ds.length === 1, `WARNING: Duplicate year: ${JSON.stringify(ds, null, 2)}`)
          const d = _.pick(ds[0], 'year rights'.split(' '))
          return d
        })
        .object(countryYears)

      const current = historical['2015'] || null

      const countryData = _.pick(Object.values(countryYears)[0], 'countryCode countryName isHighIncome isOECD geoRegion'.split(' '))
      return { ...countryData, ...current, historical }
    })
    .object(rows)
  return countries
}

function ESRCore() {
  const rows = sheetRows(readSheet('esr-core.xlsx'), 'AV', 1).map(row => {
    const datum = {
      // countryName: row.A, // Malformed for Core data
      countryCode: row.C,
      year: row.B,
      isHighIncome: parseInt(row.E) === 1,
      isOECD: parseInt(row.F) === 1,
      geoRegion: row.D,
      GDP: round(row.H),
      SERF: round(row.G),
      rights: {
        food: round(row.I),
        food_sub: {
          childrenNourishment: round(row.J),
        },
        education: round(row.R),
        education_sub: {
          combinedSchoolEnrollment: round(row.S),
          primarySchoolCompletion: round(row.T),
        },
        work: round(row.U),
        work_sub: {
          notAbsolutelyPoor: round(row.V),
        },
        housing: round(row.K),
        housing_sub: {
          improvedSanitation: round(row.L),
          improvedRuralWater: round(row.M),
        },
        health: round(row.N),
        health_sub: {
          childSurvival: round(row.O),
          survivalToAge65: round(row.P),
          contraceptiveUseScore: round(row.Q),
        },
      },
    }
    return datum
  })

  const countries = d3.nest()
    .key(d => d.countryCode)
    .rollup(countryYears => {
      const historical = d3.nest()
        .key(d => d.year)
        .rollup(ds => {
          console.assert(ds.length === 1, `WARNING: Duplicate year: ${JSON.stringify(ds, null, 2)}`)
          const d = _.pick(ds[0], 'year rights'.split(' '))
          return d
        })
        .object(countryYears)

      const current = historical['2015'] || null

      const countryData = _.pick(Object.values(countryYears)[0], 'countryCode isHighIncome isOECD geoRegion'.split(' '))
      return { ...countryData, ...current, historical }
    })
    .object(rows)

  return countries
}

function CPR() {
  const csvText = fs.readFileSync('cpr.csv', 'utf-8')
  const rows = d3.csvParse(csvText)
  const countries = rows.map(row => {
    const getRight = rightCode => ({
      mean: parseFloat(row[`${rightCode}_mean`]),
      percentile10: parseFloat(row[`${rightCode}_10`]),
      percentile90: parseFloat(row[`${rightCode}_90`]),
    })

    const countryCode = CPR_MAPPING[row.country]

    if (!countryCode) throw new Error(`Missing CPR_MAPPING country code: '${row.country}'`)

    const datum = {
      countryCode,
      rights: {
        'opinion-and-expression': getRight('express'),
        'assembly-and-association': getRight('assem_assoc'),
        'assembly-and-association-sub': {
          'assembly': getRight('assem'),
          'association': getRight('assoc'),
        },
        'participate-in-government': getRight('polpart'),
        'freedom-from-torture': getRight('tort'),
        'freedom-from-execution': getRight('execution'),
        'freedom-from-execution-sub': {
          'freedom-from-the-death-penalty': getRight('dpex'),
          'freedom-from-extrajudicial-execution': getRight('exkill'),
        },
        'freedom-from-arbitrary-arrest': getRight('arrest'),
        'freedom-from-disappearance': getRight('disap'),
      },
    }
    return datum
  })

  return _.keyBy(countries, 'countryCode')
}

function CPRRangeAtRisk() {
  const rows = d3.csvParse(fs.readFileSync('cpr-range-at-risk.csv', 'utf-8'))
  const codebook = sheetRows(readSheet('cpr-range-at-risk-codebook.xlsx'), 'AC', 1).map(row => {
    if (row.A === 'Country' || row.A === 'CountryCode') return null
    if (row.C === 'Do Not Include in Online Visualizations') return null
    if (row.A.includes('range')) return null // Data removed from website

    return {
      wordCode: row.A.replace(`"right"_`, ''),
      word: row.B,
    }
  }).filter(Boolean)

  const wordsValuesByCountry = {}
  rows.forEach(row => {
    const countryCode = CPR_MAPPING[row.Country]
    if (!countryCode) throw new Error(`Missing CPR_MAPPING country code: '${row.Country}'`)

    const getWordsValues = rightCode => codebook.map(({ word, wordCode }) => {
      const value = parseFloat(row[`${rightCode}_${wordCode}`])
      if (!value || value === 0) return null
      return [ wordCode, value ]
    }).filter(Boolean)

    const getAverageWordsValues = (rightCode1, rightCode2) => {
      const words1 = _.fromPairs(getWordsValues(rightCode1))
      const words2 = _.fromPairs(getWordsValues(rightCode2))
      const wordsKeys = _.uniq(Object.keys(words1).concat(Object.keys(words2)))
      return wordsKeys.map(w => {
        const v1 = words1[w]
        const v2 = words2[w]
        if (v1 === null && v2 !== null) return [w, v2]
        if (v2 === null && v1 !== null) return [w, v1]
        return [w, _.mean([v1, v2])]
      })
    }

    wordsValuesByCountry[countryCode] = {
      'opinion-and-expression': getWordsValues('express'),
      'assembly-and-association': getAverageWordsValues('assoc', 'assem'),
      'assembly-and-association-sub': {
        'assembly': getWordsValues('assem'),
        'association': getWordsValues('assoc'),
      },
      'participate-in-government': getWordsValues('polpart'),
      'freedom-from-torture': getWordsValues('tort'),
      'freedom-from-execution': getAverageWordsValues('exkill', 'dpex'),
      'freedom-from-execution-sub': {
        'freedom-from-the-death-penalty': getWordsValues('dpex'),
        'freedom-from-extrajudicial-execution': getWordsValues('exkill'),
      },
      'freedom-from-arbitrary-arrest': getWordsValues('arrest'),
      'freedom-from-disappearance': getWordsValues('disap'),
    }
  })

  return wordsValuesByCountry
}

function toNumberIfNumber(str, parse = parseInt) {
  const num = parse(str)
  return Number.isNaN(num) ? null : num
}

function CountryData() {
  const rows = sheetRows(readSheet('country-data.xlsx'), 'AE', 1).map(row => {
    const datum = {
      countryName: row.A,
      countryCode: row.B,
      population: toNumberIfNumber(row.D),
      GDP: toNumberIfNumber(row.E, parseFloat),
    }
    return datum
  })

  const countryDataByCountry = d3.nest()
    .key(d => d.countryCode)
    .rollup(v => v[0])
    .object(rows)

  return countryDataByCountry
}

function calculate() {
  const esrHI = ESRHighIncome()
  const esrCore = ESRCore()
  const cpr = CPR()
  const cprRangeAtRisk = CPRRangeAtRisk()
  const countryDataByCountry = CountryData()

  const countryCodesList = Object.keys(esrHI)

  const catalogCountries = []

  const joinedCountries = countryCodesList.map(countryCode => {
    const countryEsrHI = esrHI[countryCode]
    const countryEsrCore = esrCore[countryCode]
    const countryCpr = cpr[countryCode] || { rights: null }
    const countryCprRangeAtRisk = cprRangeAtRisk[countryCode]

    const ambiguousCountryCodes = { ADO: 'AND', ZAR: 'COD', IMY: 'IMN', KSV: 'XKX', ROM: 'ROU', TMP: 'TLS', WBG: 'PSE' }

    const { population = null, GDP = null } = countryDataByCountry[countryCode]
      ? countryDataByCountry[countryCode]
      : countryDataByCountry[ambiguousCountryCodes[countryCode]]

    if (!population && !GDP) {
      console.warn(`!!! Missing Population/GDP data for ${countryCode} (${countryEsrHI.countryName})`)
    }

    const countryInfo = _.pick(countryEsrHI, [
      'countryCode',
      'countryName',
      // 'GDP',
      // 'SERF',
    ])

    const rights = {
      esrHI: countryEsrHI.rights,
      esrHIHistorical: countryEsrHI.historical,
      esrCore: countryEsrCore.rights,
      esrCoreHistorical: countryEsrCore.historical,
      cpr: countryCpr.rights,
      cprRangeAtRisk: countryCprRangeAtRisk || null,
    }

    const countryCatalog = _.pick(countryEsrHI, [
      'countryCode',
      'isHighIncome',
      'isOECD',
      'geoRegion',
    ])
    countryCatalog.geoRegion = countryCatalog.geoRegion.replace(/_/g, '-')
    countryCatalog.hasCPR = countryCpr.rights !== null
    catalogCountries.push(countryCatalog)

    return { ...countryInfo, population, GDP, rights }
  })

  const joinedCountriesByCountry = _.keyBy(joinedCountries, 'countryCode')

  const catalogCountriesByRegion = d3.nest()
    .key(c => c.geoRegion)
    .rollup(cs => cs.map(c => c.countryCode))
    .object(catalogCountries)
  const catalogCountriesHIOECD = catalogCountries.filter(c => c.isHighIncome && c.isOECD).map(c => c.countryCode)
  const catalogCountriesCPRPilot = catalogCountries.filter(c => c.hasCPR).map(c => c.countryCode)

  const regions = {
    ...catalogCountriesByRegion,
    'high-income-oecd': catalogCountriesHIOECD,
    'cpr-pilot': catalogCountriesCPRPilot,
  }

  const indent = 2
  fs.writeFileSync('../src/data/rights-by-country.json', JSON.stringify(joinedCountriesByCountry, null, indent))
  fs.writeFileSync('../src/data/country-categories.json', JSON.stringify(regions, null, indent))

  console.log(`
    Written data files:
      • ../src/data/rights-by-country.json: Rights data for each country
      • ../src/data/country-categories.json: Countries grouped by category (geographical or political)
  `)
}

calculate()
