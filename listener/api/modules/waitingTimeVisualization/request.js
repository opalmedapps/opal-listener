module.exports = function (requestObject) {
  return new Promise((resolve, reject) => {
    console.log('WaitingTimeVisualization requested!')
    console.log(requestObject)
    resolve({hello: 'world'})
  })
}
