import type { LucideIcon } from "lucide-react"
import { Activity, Brain, Dna, ShieldAlert, Stethoscope, Target, Utensils } from "lucide-react"
import type { AssessmentPercentages } from "@/lib/use-latest-assessment"

export type HealthCategory = { key: string; icon: LucideIcon; bg: string; accent: string; column: keyof AssessmentPercentages }

/** The six health pathways with the icon and colour pair used across the dashboard and Health Choices page. */
export const healthCategories: HealthCategory[] = [
  { key: "Nutrition", icon: Utensils, bg: "#dff8d7", accent: "#2fae19", column: "nutrition_percentage" },
  { key: "Toxin", icon: ShieldAlert, bg: "#fff2cc", accent: "#d99a00", column: "toxin_percentage" },
  { key: "Mental", icon: Brain, bg: "#eee7ff", accent: "#8b5cf6", column: "mental_percentage" },
  { key: "Physical", icon: Activity, bg: "#dcebfb", accent: "#238dd4", column: "physical_percentage" },
  { key: "Genetic", icon: Dna, bg: "#ffe4ec", accent: "#df4f7b", column: "genetic_percentage" },
  { key: "Medical", icon: Stethoscope, bg: "#d9f7f2", accent: "#159b88", column: "medical_percentage" },
]

const fallbackCategory: HealthCategory = { key: "General", icon: Target, bg: "#eef4fa", accent: "#238dd4", column: "health_percentage" }

export const categoryFor = (name: string): HealthCategory =>
  healthCategories.find((item) => item.key.toLowerCase() === name.toLowerCase()) ?? fallbackCategory
