// Timestamp utilities
function pad2(n) {
  return String(n).padStart(2, '0')
}

export function tsId() {
  const d = new Date()
  const s = `${d.getFullYear()}${pad2(d.getMonth()+1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
  const r = Math.random().toString(36).slice(2, 8)
  return `${s}-${r}`
}
