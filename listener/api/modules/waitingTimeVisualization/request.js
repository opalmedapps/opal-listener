module.exports = function (requestObject) {
  return new Promise((resolve, reject) => {
    const { refId, refSource } = requestObject.Parameters
    console.log('')
    console.log('')
    console.log('')
    console.log('WaitingTimeVisualization requested!')
    console.log(refId, refSource)
    console.log('')
    console.log('')
    console.log('')
    
    resolve({delays: {Set1: 0, Set2: 0, Set3: 0, Set4: 0}})
  })
}
