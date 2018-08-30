const fs = require('fs')

module.exports = function (summary) {
  const sortedKeys = Object.keys(summary).sort((a, b) => {
    const valueA = summary[a]
    const valueB = summary[b]
    if (valueB > valueA) {
      return 1
    } else if (valueA > valueB) {
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
  fs.writeFile('decreasingDelayFrequency.csv', csvOutput, () => console.log('decreasingDelayFrequency.csv generated.'))
  return response
}
