// Checks that spoken text is split into engine-safe chunks (Chromium cuts off utterances > ~15 s).
// Usage: npx tsx scripts/speech-chunk-check.ts
import { chunkSpeech } from "../lib/speech"
import { healthQuestions } from "../lib/health-questions"

const letters = ["A", "B", "C", "D", "E", "F"]
let longest = 0
let failures = 0
healthQuestions.forEach((question, index) => {
  const text = `Question ${index + 1} of ${healthQuestions.length}. ${question.question} Your options are: ${question.options.map((option, i) => `${letters[i]}, ${option.label}`).join(". ")}.`
  const chunks = chunkSpeech(text)
  const joined = chunks.join(" ").replace(/\s+/g, " ")
  const original = text.replace(/\s+/g, " ").trim()
  if (joined !== original) {
    failures++
    console.log(`TEXT CHANGED q${question.id}:\n  ${original}\n  ${joined}`)
  }
  for (const chunk of chunks) {
    longest = Math.max(longest, chunk.length)
    if (chunk.length > 180) {
      failures++
      console.log(`TOO LONG (${chunk.length}) q${question.id}: ${chunk}`)
    }
  }
})
const long = chunkSpeech("Here is a single run-on reply from the guide that keeps going without any punctuation at all for a very long time so that it would certainly exceed the fifteen second limit that chromium imposes on a single utterance and therefore must be broken up at word boundaries rather than being sent as one piece to the engine which would stop speaking halfway through")
for (const chunk of long) if (chunk.length > 180) { failures++; console.log(`TOO LONG run-on: ${chunk.length}`) }
console.log(`questions=${healthQuestions.length} longest chunk=${longest} chars, run-on split into ${long.length} chunks, failures=${failures}`)
process.exit(failures ? 1 : 0)
