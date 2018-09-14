module.exports = function (identifiersArray) {
  return function (venueName) {
    const identifiers = identifiersArray.map((identifier) => new RegExp(identifier, 'gmi'))
    for (const identifier of identifiers) {
      if (identifier.test(venueName)) {
        return true
      }
    }
    return false
  }
}
