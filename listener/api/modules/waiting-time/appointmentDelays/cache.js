const { runSqlQuery } = require('../../../sqlInterface')
const { opalDb: opalDbQueries } = require('./queries')
const ONE_DAY = 1000 * 60 * 60 * 24; // 1 ms * 60 sec * 60 min * 24 h
const memoized = {}

function memoize (appointmentType, scheduledDay, scheduledHour, scheduledMinutes, data) {
  const a = memoized[appointmentType]
  if (!a) {
    if (!data) {
      return
    }
    memoized[appointmentType] = {[scheduledDay]: {[scheduledHour]: {[scheduledMinutes]: data}}}
    return data.sets
  }
  const b = a[scheduledDay]
  if (!b) {
    if (!data) {
      return
    }
    memoized[appointmentType][scheduledDay] = {[scheduledHour]: {[scheduledMinutes]: data}}
    return data.sets
  }
  const c = b[scheduledHour]
  if (!c) {
    if (!data) {
      return
    }
    memoized[appointmentType][scheduledDay][scheduledHour] = {[scheduledMinutes]: data}
    return data.sets
  }
  const d = c[scheduledMinutes]
  if (!d) {
    if (!data) {
      return
    }
    memoized[appointmentType][scheduledDay][scheduledHour] = {[scheduledMinutes]: data}
    return data.sets
  }
  if (data) {
    memoized[appointmentType][scheduledDay][scheduledHour][scheduledMinutes] = data
    return data.sets
  }
  const cached = d[scheduledMinutes]
  if (cached && (Date.now() - cached.updatedAt <= ONE_DAY)) {
    return cached.sets
  }
  return null
}

module.exports = function (appointmentType, scheduledDay, scheduledHour, scheduledMinutes) {
  return {
    verify () {
      return new Promise((resolve, reject) => {
        const cachedSets = memoize(appointmentType, scheduledDay, scheduledHour, scheduledMinutes)
        if (cachedSets) {
          return resolve(cachedSets)
        }
        runSqlQuery(opalDbQueries.getDelay(appointmentType, scheduledDay, scheduledHour, scheduledMinutes))
          .then((results) => {
            const result = results && results.length > 0 ? results[0] : null
            if (result) {
              const sets = {
                set1: result.Set1,
                set2: result.Set2,
                set3: result.Set3,
                set4: result.Set4
              }
              resolve(memoize(appointmentType, scheduledDay, scheduledHour, scheduledMinutes, {sets, updatedAt: Date.now()}))
            } else {
              resolve()
            }
          })
          .catch(reject)
      })
    },
    save (set1, set2, set3, set4) {
      return new Promise((resolve) => {
        runSqlQuery(opalDbQueries.registerDelay(appointmentType, scheduledDay, scheduledHour, scheduledMinutes, set1, set2, set3, set4))
        resolve(memoize(appointmentType, scheduledDay, scheduledHour, scheduledMinutes, {sets: {set1, set2, set3, set4}, updatedAt: Date.now()}))
      })
    }
  }
}
