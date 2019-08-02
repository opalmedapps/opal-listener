const identifiersConfig = require('./identifiers.json')
const cachedWildcards = {}

function getWildcards (appointmentType, wildcardsType) {
  const appointmentTypeCache = cachedWildcards[appointmentType]
  if (appointmentTypeCache) {
    const wildcardsCache = appointmentTypeCache[wildcardsType]
    if (wildcardsCache) {
      return wildcardsCache
    }
  }
  const appointmentTypeIdentifiers = identifiersConfig[appointmentType]
  if (appointmentTypeIdentifiers) {
    const wildcards = appointmentTypeIdentifiers[wildcardsType]
    if (wildcards) {
      if (appointmentTypeCache) {
        cachedWildcards[appointmentType][wildcardsType] = wildcards
      } else {
        cachedWildcards[appointmentType] = { [wildcardsType]: wildcards } 
      }
      return wildcards
    }
  }
  return null
}

module.exports = function (appointmentType, wildcardsType) {
  const wildcards = getWildcards(appointmentType, wildcardsType)
  return wildcards ? ((venueName) => {
    const identifiers = wildcards.map((wildcard) => new RegExp(wildcard, 'gmi'))
    for (const identifier of identifiers) {
      if (identifier.test(venueName)) {
        return true
      }
    }
    return false
  }) : new Error(`Unknown appointment type (${appointmentType}) or wildcard type (${wildcardsType}). `)
}
