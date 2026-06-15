export type Dimension = "R" | "I" | "A" | "S" | "E" | "C";

export interface AssessmentQuestion {
  id: string;
  dimension: Dimension;
  prompt: string;
  context: string;
}

export const assessmentQuestions: AssessmentQuestion[] = [
  { id: "r1", dimension: "R", prompt: "I enjoy building, repairing, or working with physical objects.", context: "Practical interests" },
  { id: "i1", dimension: "I", prompt: "I like investigating why things happen and finding evidence-based answers.", context: "Analytical interests" },
  { id: "a1", dimension: "A", prompt: "I enjoy expressing ideas through design, writing, music, or visual work.", context: "Creative interests" },
  { id: "s1", dimension: "S", prompt: "I feel energised when I help someone learn, grow, or solve a personal challenge.", context: "People-focused interests" },
  { id: "e1", dimension: "E", prompt: "I enjoy persuading others, leading a group, or turning an idea into action.", context: "Leadership interests" },
  { id: "c1", dimension: "C", prompt: "I like organising information and creating clear, reliable systems.", context: "Organisational interests" },
  { id: "r2", dimension: "R", prompt: "On a project day, I would rather test a prototype than prepare a presentation.", context: "Preferred activities" },
  { id: "i2", dimension: "I", prompt: "A difficult puzzle or complex data set makes me curious rather than frustrated.", context: "Problem-solving" },
  { id: "a2", dimension: "A", prompt: "I prefer assignments that allow more than one valid approach or outcome.", context: "Work style" },
  { id: "s2", dimension: "S", prompt: "Classmates often come to me for patient explanations or support.", context: "Strengths" },
  { id: "e2", dimension: "E", prompt: "In a team with no clear direction, I am comfortable setting priorities.", context: "Scenario" },
  { id: "c2", dimension: "C", prompt: "I notice missing details and enjoy making plans accurate and complete.", context: "Strengths" },
  { id: "r3", dimension: "R", prompt: "I would enjoy spending a day in a laboratory, workshop, field site, or studio.", context: "Environment" },
  { id: "i3", dimension: "I", prompt: "I value work that lets me keep learning about difficult questions.", context: "Values" },
  { id: "a3", dimension: "A", prompt: "It matters to me that my work has room for originality and imagination.", context: "Values" },
  { id: "s3", dimension: "S", prompt: "It matters to me that my future work improves people's lives directly.", context: "Values" },
  { id: "e3", dimension: "E", prompt: "I am motivated by ambitious goals and visible results.", context: "Values" },
  { id: "c3", dimension: "C", prompt: "I work best when expectations, deadlines, and processes are clear.", context: "Environment" },
];

export function calculateScores(responses: Record<string, number>) {
  const totals: Record<Dimension, number[]> = { R: [], I: [], A: [], S: [], E: [], C: [] };
  assessmentQuestions.forEach((question) => totals[question.dimension].push(responses[question.id] ?? 0));
  return Object.fromEntries(
    Object.entries(totals).map(([dimension, values]) => [dimension, Math.round((values.reduce((a, b) => a + b, 0) / (values.length * 5)) * 100)]),
  );
}

export const dimensionNames: Record<Dimension, string> = {
  R: "Realistic", I: "Investigative", A: "Artistic", S: "Social", E: "Enterprising", C: "Conventional",
};