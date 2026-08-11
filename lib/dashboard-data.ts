export const patientStats = [
  { label: "Emergency Patients", short: "Emergency", value: 56, key: "emergency", fill: "var(--color-emergency)" },
  { label: "Routine Check-up", short: "Check-up", value: 45, key: "routine", fill: "var(--color-routine)" },
  { label: "Appointment", short: "Appointment", value: 34, key: "appointment", fill: "var(--color-appointment)" },
  { label: "Physical Therapy", short: "Therapy", value: 20, key: "physical", fill: "var(--color-physical)" },
  { label: "Therapy Session", short: "Session", value: 16, key: "session", fill: "var(--color-session)" },
]

export const workingHours = [
  { key: "reception", label: "Patient reception", value: 27, fill: "var(--color-reception)" },
  { key: "document", label: "Document processing", value: 14, fill: "var(--color-document)" },
  { key: "online", label: "Online consultations", value: 5, fill: "var(--color-online)" },
]

export type PaymentStatus = "Paid" | "Pending"
export type VisitStatus = "First Visit" | "Follow-up" | "Discharge Summary"

export type Appointment = {
  no: string
  name: string
  room: string
  age: number
  date: string
  time: string
  status: VisitStatus
  payment: PaymentStatus
}

export const appointments: Appointment[] = [
  { no: "01", name: "Cameron Williamson", room: "Melati Room", age: 58, date: "Apr 22, 2026", time: "4:45 PM", status: "First Visit", payment: "Paid" },
  { no: "02", name: "Robert Fox", room: "Melati Room", age: 38, date: "Apr 23, 2026", time: "5:00 PM", status: "Follow-up", payment: "Pending" },
  { no: "03", name: "Marvin McKinney", room: "Melati Room", age: 28, date: "Apr 24, 2026", time: "6:00 PM", status: "First Visit", payment: "Pending" },
  { no: "04", name: "Devon Lane", room: "Melati Room", age: 52, date: "Apr 25, 2026", time: "7:00 PM", status: "Discharge Summary", payment: "Paid" },
  { no: "05", name: "Arlene McCoy", room: "Melati Room", age: 18, date: "Apr 26, 2026", time: "8:00 PM", status: "First Visit", payment: "Paid" },
  { no: "06", name: "Jenny Wilson", room: "Anggrek Room", age: 44, date: "Apr 27, 2026", time: "9:00 AM", status: "Follow-up", payment: "Paid" },
]

export type ScheduleStatus = "Available" | "Overbooked" | "No slots available"

export type HospitalSchedule = {
  name: string
  role: string
  time: string
  status: ScheduleStatus
}

export const hospitalSchedule: HospitalSchedule[] = [
  { name: "Flores, Juanita", role: "Ophthalmologist", time: "10:00 AM", status: "Overbooked" },
  { name: "Black, Marvin", role: "Headache", time: "10:12 AM", status: "Available" },
  { name: "Cooper, Kristin", role: "Runny nose", time: "10:15 AM", status: "Overbooked" },
  { name: "Miles, Esther", role: "Cold", time: "10:30 AM", status: "Overbooked" },
  { name: "Black, Marvin", role: "Stomach-ache", time: "10:00 AM", status: "No slots available" },
  { name: "Henry, Arthur", role: "Cardiologist", time: "10:45 AM", status: "Overbooked" },
  { name: "Nguyen, Shane", role: "Dermatologist", time: "10:50 AM", status: "Available" },
]

// Calendar for April: value = booked intensity (0 none, 1 partial, 2 full), muted = other month
export type CalendarDay = { day: number; state: "full" | "partial" | "empty" | "muted" }

export const calendarDays: CalendarDay[] = [
  { day: 1, state: "full" }, { day: 2, state: "full" }, { day: 3, state: "full" }, { day: 4, state: "full" }, { day: 5, state: "empty" }, { day: 6, state: "empty" }, { day: 7, state: "full" },
  { day: 8, state: "muted" }, { day: 9, state: "muted" }, { day: 10, state: "empty" }, { day: 11, state: "full" }, { day: 12, state: "empty" }, { day: 13, state: "full" }, { day: 14, state: "empty" },
  { day: 15, state: "full" }, { day: 16, state: "full" }, { day: 17, state: "muted" }, { day: 18, state: "muted" }, { day: 19, state: "full" }, { day: 20, state: "partial" }, { day: 21, state: "partial" },
  { day: 22, state: "full" }, { day: 23, state: "partial" }, { day: 24, state: "full" }, { day: 25, state: "empty" }, { day: 26, state: "partial" }, { day: 27, state: "partial" }, { day: 28, state: "partial" },
  { day: 25, state: "empty" }, { day: 30, state: "full" }, { day: 1, state: "muted" }, { day: 2, state: "muted" }, { day: 3, state: "muted" }, { day: 4, state: "muted" }, { day: 5, state: "muted" },
]

export const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

// Deterministic pastel avatar color from a name
export function avatarTone(name: string) {
  const tones = [
    { bg: "oklch(0.9 0.05 10)", fg: "oklch(0.4 0.1 10)" },
    { bg: "oklch(0.9 0.05 290)", fg: "oklch(0.4 0.1 290)" },
    { bg: "oklch(0.9 0.06 155)", fg: "oklch(0.4 0.1 155)" },
    { bg: "oklch(0.92 0.07 95)", fg: "oklch(0.45 0.1 95)" },
    { bg: "oklch(0.9 0.05 245)", fg: "oklch(0.4 0.1 245)" },
  ]
  const sum = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return tones[sum % tones.length]
}

export function initials(name: string) {
  return name
    .replace(/,/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}
