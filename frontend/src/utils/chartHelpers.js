export const trendLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const monthlyLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4']

export function movementBucketIndex(dateValue, isWeekly) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return -1
  
  if (isWeekly) {
    const day = date.getDay()
    return day === 0 ? 6 : day - 1
  } else {
    const day = date.getDate()
    return day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3
  }
}
