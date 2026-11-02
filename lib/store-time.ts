export function toStoreDateTime(iso?:string|null) {
  if(!iso)return ''
  const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso))
  return parts.replace(' ','T')
}
export function fromStoreDateTime(value:string) {
  if(!value)return undefined
  const date=new Date(`${value}:00+05:30`)
  if(!Number.isFinite(date.getTime()))throw new Error('Enter a valid date and time')
  return date.toISOString()
}
