function process (groupsArr, dataArr, currentIndex, previousValue, currentGroup, isNewGroup, onDone) {
  if (currentIndex === -1) {
    return onDone(groupsArr)
  }
  const currentValue = dataArr[currentIndex]
  if (isNewGroup(currentValue, previousValue)) {
    const group = [currentValue]
    groupsArr.push(group)
    process(groupsArr, dataArr, currentIndex - 1, currentValue, group, isNewGroup, onDone)
  } else {
    currentGroup.push(currentValue)
    process(groupsArr, dataArr, currentIndex - 1, currentValue, currentGroup, isNewGroup, onDone)
  }
}

function linearGroupify (dataArr, isNewGroup, onDone) {
  const dataAmount = dataArr.length
  const groupsArr = []
  let currentGroup = []
  for (let currentIndex = dataAmount - 1; currentIndex >= 0; --currentIndex) {
    const previousValue = currentIndex + 1 >= dataAmount ? null : dataArr[currentIndex + 1]
    const currentValue = dataArr[currentIndex]
    if (isNewGroup(currentValue, previousValue)) {
      currentGroup = [currentValue]
      groupsArr.push(currentGroup)
    } else {
      currentGroup.push(currentValue)
    }
  }
  onDone(groupsArr)
}

function groupify (dataArr, isNewGroup, onDone) {
  process([], dataArr, dataArr.length - 1, null, null, isNewGroup, onDone)
}

module.exports = function (results) {
  return new Promise((resolve) => {
    if(results.ActualStartDate){
      resolve(results)
    }
    linearGroupify(
      results,
      (currentValue, previousValue) => previousValue === null ||
          currentValue.PatientLocationRevCount >= previousValue.PatientLocationRevCount,
      resolve
    )
  })
}
