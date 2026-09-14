// Prints the "Key benefits" bullets the product bar would extract for a few catalog products.
// Usage: npx tsx scripts/benefits-check.ts <path-to-descriptions.json>
import { readFileSync } from "node:fs"
import { extractBenefits, splitDescription } from "../components/dashboard/recommended-products"

const rows = JSON.parse(readFileSync(process.argv[2], "utf8")) as { name: string; description: string }[]
for (const row of rows) {
  console.log(`\n== ${row.name}`)
  const benefits = extractBenefits(row.description)
  if (!benefits.length) console.log("  (no benefit sentences found)")
  for (const benefit of benefits) console.log(`  • ${benefit}`)
  console.log(`  about: ${splitDescription(row.description).body.slice(0, 220)}...`)
}
