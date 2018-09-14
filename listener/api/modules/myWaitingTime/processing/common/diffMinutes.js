const minutesInAnHour = 60
const minutesInADay = 24 * 60

module.exports = function (start, end) {
  if (end >= start) {
    const diffMs = (end - start)
    const days = Math.floor(diffMs / 86400000)
    const hours = Math.floor((diffMs % 86400000) / 3600000)
    const minutes = Math.round(((diffMs % 86400000) % 3600000) / 60000)
    return (days * minutesInADay) + (hours * minutesInAnHour) + minutes
  }
  const diffMs = (start - end)
  const days = Math.floor(diffMs / 86400000)
  const hours = Math.floor((diffMs % 86400000) / 3600000)
  const minutes = Math.round(((diffMs % 86400000) % 3600000) / 60000)
  return -((days * minutesInADay) + (hours * minutesInAnHour) + minutes)
}
