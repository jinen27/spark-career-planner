export type QuizCard = {
  id: string;
  prompt: string;
  optionA: { label: string; tags: string[] };
  optionB: { label: string; tags: string[] };
};

// Each card = a "would you rather". Tags map to career families.
export const QUIZ_CARDS: QuizCard[] = [
  { id: "q1", prompt: "On a free Saturday, would you rather…",
    optionA: { label: "Debug a tricky piece of code", tags: ["technology", "analytical"] },
    optionB: { label: "Sketch a poster for a friend's event", tags: ["creative", "design"] } },
  { id: "q2", prompt: "You have to run a group project. You'd rather…",
    optionA: { label: "Lead the pitch and rally people", tags: ["business", "communication"] },
    optionB: { label: "Own the research and data", tags: ["analytical", "science"] } },
  { id: "q3", prompt: "A news headline that grabs you first:",
    optionA: { label: "Breakthrough in cancer treatment", tags: ["healthcare", "science"] },
    optionB: { label: "Startup raises $50M to fix housing", tags: ["business", "impact"] } },
  { id: "q4", prompt: "A dream 3-month internship:",
    optionA: { label: "Shadow a surgeon in a teaching hospital", tags: ["healthcare"] },
    optionB: { label: "Build product at a fintech startup", tags: ["technology", "business"] } },
  { id: "q5", prompt: "Given a broken system, you first want to…",
    optionA: { label: "Understand the people affected", tags: ["social", "communication"] },
    optionB: { label: "Map the data and find the bottleneck", tags: ["analytical", "engineering"] } },
  { id: "q6", prompt: "Pick a working environment:",
    optionA: { label: "A quiet lab with precise instruments", tags: ["science", "healthcare"] },
    optionB: { label: "A courtroom or debate chamber", tags: ["law", "communication"] } },
  { id: "q7", prompt: "You'd rather spend an evening…",
    optionA: { label: "Reading about foreign policy", tags: ["law", "social"] },
    optionB: { label: "Prototyping a small app", tags: ["technology", "engineering"] } },
  { id: "q8", prompt: "Which class assignment sounds fun?",
    optionA: { label: "Model a bridge that can hold 20kg", tags: ["engineering", "analytical"] },
    optionB: { label: "Direct a short documentary", tags: ["creative", "communication"] } },
  { id: "q9", prompt: "Success at 30 looks like…",
    optionA: { label: "Running my own studio / practice", tags: ["business", "creative"] },
    optionB: { label: "Leading a research team", tags: ["science", "healthcare"] } },
  { id: "q10", prompt: "You'd volunteer for…",
    optionA: { label: "A homeless outreach charity", tags: ["social", "healthcare"] },
    optionB: { label: "Teaching kids to code", tags: ["technology", "social"] } },
  { id: "q11", prompt: "Which puzzle wins your attention?",
    optionA: { label: "A 500-piece jigsaw of a city map", tags: ["analytical", "engineering"] },
    optionB: { label: "Writing a persuasive essay in 20 min", tags: ["law", "communication"] } },
  { id: "q12", prompt: "In a crisis, you're the one who…",
    optionA: { label: "Calms everyone and coordinates", tags: ["healthcare", "communication"] },
    optionB: { label: "Fixes the actual broken thing", tags: ["engineering", "technology"] } },
];

export type Family =
  | "technology" | "engineering" | "science" | "healthcare"
  | "business" | "law" | "creative" | "social";

export const FAMILY_META: Record<Family, { name: string; blurb: string; careers: string[]; emoji: string }> = {
  technology: { emoji: "💻", name: "Technology & Software", blurb: "You gravitate to building, breaking, and improving digital systems.", careers: ["Software Engineer", "Data Scientist", "Product Manager", "Cybersecurity Analyst"] },
  engineering: { emoji: "⚙️", name: "Engineering & Design", blurb: "You like turning constraints into working, physical things.", careers: ["Mechanical Engineer", "Civil Engineer", "Aerospace Engineer", "Industrial Designer"] },
  science: { emoji: "🔬", name: "Science & Research", blurb: "You want to understand why things work, not just that they do.", careers: ["Research Scientist", "Biotechnologist", "Physicist", "Environmental Scientist"] },
  healthcare: { emoji: "🩺", name: "Healthcare & Medicine", blurb: "You're drawn to work where the outcome matters to a person in front of you.", careers: ["Doctor", "Nurse Practitioner", "Clinical Psychologist", "Physiotherapist"] },
  business: { emoji: "📈", name: "Business & Finance", blurb: "You see opportunities, incentives, and how to move a team.", careers: ["Investment Banker", "Management Consultant", "Entrepreneur", "Marketing Lead"] },
  law: { emoji: "⚖️", name: "Law & Policy", blurb: "You like arguments, evidence, and shaping the rules that others live by.", careers: ["Barrister", "Solicitor", "Policy Analyst", "Diplomat"] },
  creative: { emoji: "🎨", name: "Creative & Media", blurb: "You want to make things people feel something about.", careers: ["Architect", "Filmmaker", "Graphic Designer", "Writer"] },
  social: { emoji: "🤝", name: "Social Impact & Education", blurb: "You measure success by the people you help along the way.", careers: ["Teacher", "Social Worker", "NGO Programme Lead", "UX Researcher"] },
};

// Aliases so quiz tags outside the 8 families still count toward the closest family.
export const TAG_ALIASES: Record<string, Family> = {
  analytical: "science",
  communication: "social",
  design: "creative",
  impact: "social",
};

export function scoreAnswers(answers: string[][]): { family: Family; score: number }[] {
  const totals: Record<Family, number> = { technology: 0, engineering: 0, science: 0, healthcare: 0, business: 0, law: 0, creative: 0, social: 0 };
  for (const tags of answers) {
    for (const raw of tags) {
      const family = (raw in totals ? (raw as Family) : TAG_ALIASES[raw]) as Family | undefined;
      if (family) totals[family] += 1;
    }
  }
  return (Object.entries(totals) as [Family, number][])
    .map(([family, score]) => ({ family, score }))
    .sort((a, b) => b.score - a.score);
}
