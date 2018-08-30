const fs = require('fs')

function parseInteger (i) {
  return +i || parseInt(i)
}

module.exports = function (summary) {
  const sortedKeys = Object.keys(summary).sort((a, b) => {
    const aN = parseInteger(a)
    const bN = parseInteger(b)
    if (aN > bN) {
      return 1
    } else if (bN > aN) {
      return -1
    }
    return 0
  })
  const response = []
  let csvOutput = 'Delay,Frequency\n'
  for (const key of sortedKeys) {
    const obj = { delay: key, frequency: summary[key] }
    response.push(obj)
    csvOutput = `${csvOutput}${key},${obj.frequency}\n`
  }
  fs.writeFile('ascendingDelayValue.csv', csvOutput, () => console.log('ascendingDelayValue.csv generated.'))
  return response
}
