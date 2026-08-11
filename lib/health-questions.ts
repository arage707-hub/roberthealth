export const healthCategories = ["Nutrition", "Toxin", "Mental", "Physical", "Genetic", "Medical"] as const

export type HealthCategory = (typeof healthCategories)[number]
export type HealthScore = 1 | 2 | 3 | 4

export type HealthOption = {
  label: string
  score: HealthScore
}

export type HealthQuestion = {
  id: number
  category: HealthCategory
  subcategory: string
  question: string
  options: HealthOption[]
}

export const healthQuestions: HealthQuestion[] = [
  { id: 1, category: "Medical", subcategory: "Overall Health", question: "How would you rate your overall health right now?", options: [
    { label: "Excellent", score: 1 }, { label: "Good", score: 2 }, { label: "Fair", score: 3 }, { label: "Poor", score: 4 },
  ] },
  { id: 2, category: "Physical", subcategory: "Sleep", question: "On average, how many hours do you sleep each night?", options: [
    { label: "Less than 5", score: 4 }, { label: "5 to 6", score: 3 }, { label: "7 to 8", score: 1 }, { label: "More than 8", score: 2 },
  ] },
  { id: 3, category: "Physical", subcategory: "Sleep", question: "How often do you wake up feeling rested?", options: [
    { label: "Almost always", score: 1 }, { label: "Often", score: 2 }, { label: "Sometimes", score: 3 }, { label: "Rarely", score: 4 },
  ] },
  { id: 4, category: "Physical", subcategory: "Exercise", question: "How many days a week do you exercise for 30+ minutes?", options: [
    { label: "5 or more", score: 1 }, { label: "3 to 4", score: 2 }, { label: "1 to 2", score: 3 }, { label: "None", score: 4 },
  ] },
  { id: 5, category: "Physical", subcategory: "Movement", question: "How much time do you spend sitting on a typical day?", options: [
    { label: "Less than 4 hours", score: 1 }, { label: "4 to 6 hours", score: 2 }, { label: "6 to 9 hours", score: 3 }, { label: "More than 9 hours", score: 4 },
  ] },
  { id: 6, category: "Nutrition", subcategory: "Whole Foods", question: "How many servings of fruits and vegetables do you eat daily?", options: [
    { label: "5 or more", score: 1 }, { label: "3 to 4", score: 2 }, { label: "1 to 2", score: 3 }, { label: "Almost none", score: 4 },
  ] },
  { id: 7, category: "Nutrition", subcategory: "Food Quality", question: "How often do you eat fast food or fried food?", options: [
    { label: "Rarely", score: 1 }, { label: "Once a week", score: 2 }, { label: "A few times a week", score: 3 }, { label: "Most days", score: 4 },
  ] },
  { id: 8, category: "Nutrition", subcategory: "Hydration", question: "How many glasses of water do you drink per day?", options: [
    { label: "8 or more", score: 1 }, { label: "5 to 7", score: 2 }, { label: "2 to 4", score: 3 }, { label: "Fewer than 2", score: 4 },
  ] },
  { id: 9, category: "Nutrition", subcategory: "Sugar Intake", question: "How often do you eat sugary snacks or drinks?", options: [
    { label: "Rarely", score: 1 }, { label: "A few times a week", score: 2 }, { label: "Once a day", score: 3 }, { label: "Several times a day", score: 4 },
  ] },
  { id: 10, category: "Toxin", subcategory: "Tobacco Exposure", question: "Do you currently smoke or use tobacco products?", options: [
    { label: "Never", score: 1 }, { label: "Quit over a year ago", score: 2 }, { label: "Occasionally", score: 3 }, { label: "Daily", score: 4 },
  ] },
  { id: 11, category: "Toxin", subcategory: "Alcohol Exposure", question: "How often do you drink alcohol?", options: [
    { label: "Never", score: 1 }, { label: "Occasionally", score: 2 }, { label: "Weekly", score: 3 }, { label: "Daily", score: 4 },
  ] },
  { id: 12, category: "Mental", subcategory: "Stress", question: "How often have you felt stressed in the past two weeks?", options: [
    { label: "Rarely", score: 1 }, { label: "Sometimes", score: 2 }, { label: "Often", score: 3 }, { label: "Almost constantly", score: 4 },
  ] },
  { id: 13, category: "Mental", subcategory: "Emotional Wellbeing", question: "How often do you feel down, anxious, or overwhelmed?", options: [
    { label: "Rarely", score: 1 }, { label: "Sometimes", score: 2 }, { label: "Often", score: 3 }, { label: "Almost every day", score: 4 },
  ] },
  { id: 14, category: "Mental", subcategory: "Social Connection", question: "How connected do you feel to friends and family?", options: [
    { label: "Very connected", score: 1 }, { label: "Somewhat connected", score: 2 }, { label: "A little isolated", score: 3 }, { label: "Very isolated", score: 4 },
  ] },
  { id: 15, category: "Medical", subcategory: "Symptoms", question: "How often do you experience headaches?", options: [
    { label: "Rarely", score: 1 }, { label: "Once a month", score: 2 }, { label: "Weekly", score: 3 }, { label: "Almost daily", score: 4 },
  ] },
  { id: 16, category: "Physical", subcategory: "Energy", question: "How would you describe your energy levels during the day?", options: [
    { label: "High and steady", score: 1 }, { label: "Generally good", score: 2 }, { label: "Often low", score: 3 }, { label: "Exhausted", score: 4 },
  ] },
  { id: 17, category: "Medical", subcategory: "Cardiovascular Health", question: "Do you know your typical blood pressure range?", options: [
    { label: "Yes, it's normal", score: 1 }, { label: "Yes, slightly high", score: 2 }, { label: "Yes, it's high", score: 4 }, { label: "I don't know", score: 3 },
  ] },
  { id: 18, category: "Medical", subcategory: "Cardiorespiratory Symptoms", question: "How often do you feel shortness of breath during light activity?", options: [
    { label: "Never", score: 1 }, { label: "Rarely", score: 2 }, { label: "Sometimes", score: 3 }, { label: "Often", score: 4 },
  ] },
  { id: 19, category: "Physical", subcategory: "Strength and Mobility", question: "How would you rate your physical strength and mobility?", options: [
    { label: "Excellent", score: 1 }, { label: "Good", score: 2 }, { label: "Limited", score: 3 }, { label: "Very limited", score: 4 },
  ] },
  { id: 20, category: "Physical", subcategory: "Musculoskeletal Health", question: "How often do you experience back or joint pain?", options: [
    { label: "Rarely", score: 1 }, { label: "Occasionally", score: 2 }, { label: "Frequently", score: 3 }, { label: "Constantly", score: 4 },
  ] },
  { id: 21, category: "Medical", subcategory: "Preventive Care", question: "When was your last routine medical check-up?", options: [
    { label: "Within 6 months", score: 1 }, { label: "Within a year", score: 2 }, { label: "1 to 2 years ago", score: 3 }, { label: "More than 2 years", score: 4 },
  ] },
  { id: 22, category: "Medical", subcategory: "Immunization", question: "How up to date are you with recommended vaccinations?", options: [
    { label: "Fully up to date", score: 1 }, { label: "Mostly up to date", score: 2 }, { label: "Somewhat behind", score: 3 }, { label: "Not sure", score: 4 },
  ] },
  { id: 23, category: "Medical", subcategory: "Medication Burden", question: "Do you take any prescribed medication regularly?", options: [
    { label: "None", score: 1 }, { label: "One", score: 2 }, { label: "Two to three", score: 3 }, { label: "Four or more", score: 4 },
  ] },
  { id: 24, category: "Nutrition", subcategory: "Meal Regularity", question: "How often do you skip meals?", options: [
    { label: "Never", score: 1 }, { label: "Occasionally", score: 2 }, { label: "A few times a week", score: 3 }, { label: "Daily", score: 4 },
  ] },
  { id: 25, category: "Physical", subcategory: "Screen Habits", question: "How many hours of screen time do you have outside of work?", options: [
    { label: "Less than 1", score: 1 }, { label: "1 to 2", score: 2 }, { label: "3 to 4", score: 3 }, { label: "More than 4", score: 4 },
  ] },
  { id: 26, category: "Mental", subcategory: "Relaxation", question: "How often do you take time to relax or unwind?", options: [
    { label: "Every day", score: 1 }, { label: "A few times a week", score: 2 }, { label: "Rarely", score: 3 }, { label: "Almost never", score: 4 },
  ] },
  { id: 27, category: "Physical", subcategory: "Sleep", question: "How consistent is your sleep schedule?", options: [
    { label: "Very consistent", score: 1 }, { label: "Mostly consistent", score: 2 }, { label: "Irregular", score: 3 }, { label: "Very irregular", score: 4 },
  ] },
  { id: 28, category: "Genetic", subcategory: "Immune Predisposition", question: "How would you rate your immune system this year?", options: [
    { label: "Rarely get sick", score: 1 }, { label: "Occasionally sick", score: 2 }, { label: "Often sick", score: 3 }, { label: "Constantly unwell", score: 4 },
  ] },
  { id: 29, category: "Mental", subcategory: "Work-Life Balance", question: "How well do you manage your work-life balance?", options: [
    { label: "Very well", score: 1 }, { label: "Fairly well", score: 2 }, { label: "Struggling", score: 3 }, { label: "Very poorly", score: 4 },
  ] },
  { id: 30, category: "Mental", subcategory: "Health Motivation", question: "Overall, how motivated are you to improve your health?", options: [
    { label: "Very motivated", score: 1 }, { label: "Somewhat motivated", score: 2 }, { label: "A little", score: 3 }, { label: "Not right now", score: 4 },
  ] },
]
