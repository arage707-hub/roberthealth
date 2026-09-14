// Quick sanity check for spoken-answer matching: npx tsx scripts/voice-match-check.ts
import { healthQuestions } from "../lib/health-questions"
import { matchSpokenOption } from "../components/health/health-quiz"

let failures = 0
let checks = 0

function expect(questionIndex: number, phrase: string, expectedIndex: number | null) {
  const question = healthQuestions[questionIndex]
  const match = matchSpokenOption(phrase, question.options)
  const got = match ? question.options.indexOf(match) : null
  checks++
  if (got !== expectedIndex) {
    failures++
    console.log(`FAIL q${question.id} "${phrase}" -> ${got === null ? "null" : `${got} (${question.options[got].label})`}, expected ${expectedIndex === null ? "null" : `${expectedIndex} (${question.options[expectedIndex].label})`}`)
  }
}

// Every option of every question, spoken verbatim, as a letter, and as a position.
healthQuestions.forEach((question, qi) => {
  question.options.forEach((option, oi) => {
    expect(qi, option.label, oi)
    expect(qi, option.label.toLowerCase() + ".", oi)
    expect(qi, ["a", "b", "c", "d"][oi], oi)
    expect(qi, `option ${["one", "two", "three", "four"][oi]}`, oi)
    expect(qi, ["first", "second", "third", "fourth"][oi], oi)
    expect(qi, `number ${oi + 1}`, oi)
  })
})

// Natural phrasing and number words.
expect(0, "I would say good", 1)
expect(0, "excellent", 0)
expect(1, "seven to eight", 2)
expect(1, "less than five", 0)
expect(1, "more than eight hours", 3)
expect(3, "five or more", 0)
expect(3, "none", 3)
expect(5, "three to four", 1)
expect(7, "eight or more", 0)
expect(7, "fewer than two", 3)
expect(9, "never", 0)
expect(9, "I quit over a year ago", 1)
expect(13, "very connected", 0)
expect(13, "somewhat connected", 1)
expect(16, "yes it's normal", 0)
expect(16, "I don't know", 3)
expect(16, "slightly high", 1)
expect(0, "banana", null)
expect(0, "", null)

console.log(`${checks - failures}/${checks} checks passed`)
process.exit(failures ? 1 : 0)
