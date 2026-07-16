// Client-side personalised PDF career report.
import { jsPDF } from "jspdf";
import { dimensionNames, type Dimension } from "@/lib/assessment";

type Rec = {
  rank: number;
  career_title: string;
  confidence: number;
  description: string;
  match_reasons?: string[] | null;
  university_majors?: string[] | null;
  recommended_subjects?: string[] | null;
  technical_skills?: string[] | null;
  soft_skills?: string[] | null;
  preparation_experiences?: string[] | null;
  outlook?: string | null;
};

type PlanStep = {
  title: string;
  description: string;
  timeframe: string;
  category: string;
  completed: boolean;
};

type UniMatch = {
  university: string;
  country: string;
  city?: string;
  major: string;
  matchLevel: "strong" | "competitive" | "reach";
  admissionProbability: number;
  entryRequirements: string;
  tuitionEstimate: string;
  ranking?: string;
};

export type ReportInput = {
  studentName: string;
  educationalStage?: string | null;
  country?: string | null;
  scores: Record<string, number>;
  recommendations: Rec[];
  plan: PlanStep[];
  universities?: UniMatch[];
};

const BRAND = "#0b3d2e"; // deep green primary-ish

export function generateCareerReport(input: ReportInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  const ensure = (need: number) => {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const h1 = (text: string) => {
    ensure(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(BRAND);
    doc.text(text, margin, y);
    y += 22;
    doc.setDrawColor(BRAND);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
    doc.setTextColor(30);
  };

  const h2 = (text: string) => {
    ensure(22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(BRAND);
    doc.text(text, margin, y);
    y += 16;
    doc.setTextColor(30);
  };

  const para = (text: string, size = 10) => {
    if (!text) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    for (const line of lines) {
      ensure(size + 4);
      doc.text(line, margin, y);
      y += size + 4;
    }
  };

  const bullets = (items: (string | null | undefined)[]) => {
    const clean = items.filter((x): x is string => Boolean(x && x.trim()));
    if (!clean.length) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const item of clean) {
      const lines = doc.splitTextToSize(`•  ${item}`, pageW - margin * 2 - 12);
      for (const line of lines) {
        ensure(14);
        doc.text(line, margin + 12, y);
        y += 13;
      }
    }
    y += 4;
  };

  const bar = (label: string, value: number, max = 100) => {
    ensure(22);
    const barX = margin + 140;
    const barW = pageW - margin - barX - 40;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.text(label, margin, y + 10);
    doc.setDrawColor(220);
    doc.setFillColor(235, 238, 235);
    doc.roundedRect(barX, y + 2, barW, 10, 3, 3, "F");
    doc.setFillColor(BRAND);
    const pct = Math.max(0, Math.min(1, value / max));
    doc.roundedRect(barX, y + 2, Math.max(2, barW * pct), 10, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.text(`${Math.round(value)}%`, pageW - margin, y + 10, { align: "right" });
    y += 20;
  };

  // ---------- Cover ----------
  doc.setFillColor(BRAND);
  doc.rect(0, 0, pageW, 140, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255);
  doc.setFontSize(11);
  doc.text("COMPASS", margin, 50);
  doc.setFontSize(28);
  doc.text("Your Career Report", margin, 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(
    `Prepared for ${input.studentName} · ${new Date().toLocaleDateString(undefined, { dateStyle: "long" })}`,
    margin,
    115,
  );
  doc.setTextColor(30);
  y = 180;

  para(
    "This personalised report summarises your interest pattern, AI-generated career recommendations, university matches and the action plan Compass has built for you. It is a snapshot — revisit Compass any time to update it as your goals evolve.",
    11,
  );
  y += 8;

  const meta = [
    input.educationalStage ? ["Stage", input.educationalStage.replace(/_/g, " ")] : null,
    input.country ? ["Country", input.country] : null,
  ].filter(Boolean) as string[][];
  if (meta.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    for (const [k, v] of meta) {
      ensure(14);
      doc.setTextColor(120);
      doc.text(k.toUpperCase(), margin, y);
      doc.setTextColor(30);
      doc.text(v, margin + 80, y);
      y += 14;
    }
    y += 8;
  }

  // ---------- Interest pattern ----------
  h1("Your interest pattern");
  para("Based on the RIASEC-inspired assessment. Higher bars indicate stronger alignment.");
  y += 4;
  const sorted = Object.entries(input.scores).sort((a, b) => b[1] - a[1]);
  for (const [key, value] of sorted) {
    bar(dimensionNames[key as Dimension] ?? key, value);
  }

  // ---------- Recommendations ----------
  h1("Career recommendations");
  for (const rec of input.recommendations) {
    ensure(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(BRAND);
    doc.text(`${rec.rank}. ${rec.career_title}`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`${rec.confidence}% fit`, pageW - margin, y, { align: "right" });
    y += 16;
    doc.setTextColor(30);
    para(rec.description);
    if (rec.match_reasons?.length) {
      h2("Why it fits you");
      bullets(rec.match_reasons);
    }
    if (rec.university_majors?.length) {
      h2("University majors to consider");
      bullets(rec.university_majors);
    }
    if (rec.recommended_subjects?.length) {
      h2("Subjects to prioritise");
      bullets(rec.recommended_subjects);
    }
    if (rec.technical_skills?.length || rec.soft_skills?.length) {
      h2("Skills to build");
      bullets([...(rec.technical_skills ?? []), ...(rec.soft_skills ?? [])]);
    }
    if (rec.preparation_experiences?.length) {
      h2("Experiences that will help");
      bullets(rec.preparation_experiences);
    }
    if (rec.outlook) {
      h2("Outlook");
      para(rec.outlook);
    }
    y += 6;
  }

  // ---------- Universities ----------
  if (input.universities && input.universities.length > 0) {
    doc.addPage();
    y = margin;
    h1("University matches");
    para("Personalised university matches classified by admission likelihood. Estimates only — always verify entry requirements on the official website.");
    y += 6;
    for (const uni of input.universities) {
      ensure(70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(BRAND);
      doc.text(uni.university, margin, y);
      const chip =
        uni.matchLevel === "strong" ? "STRONG" : uni.matchLevel === "competitive" ? "COMPETITIVE" : "REACH";
      doc.setFontSize(9);
      doc.setTextColor(uni.matchLevel === "strong" ? "#166534" : uni.matchLevel === "competitive" ? "#92400e" : "#9f1239");
      doc.text(chip, pageW - margin, y, { align: "right" });
      y += 14;
      doc.setTextColor(80);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(
        `${uni.major} · ${[uni.city, uni.country].filter(Boolean).join(", ")}`,
        margin,
        y,
      );
      y += 14;
      doc.setTextColor(30);
      bar("Admission probability", uni.admissionProbability);
      const details = [
        uni.ranking ? `Ranking: ${uni.ranking}` : null,
        `Tuition: ${uni.tuitionEstimate}`,
        `Entry: ${uni.entryRequirements}`,
      ].filter(Boolean) as string[];
      for (const line of details) para(line);
      y += 6;
      doc.setDrawColor(230);
      ensure(4);
      doc.line(margin, y, pageW - margin, y);
      y += 10;
    }
  }

  // ---------- Plan ----------
  if (input.plan.length) {
    doc.addPage();
    y = margin;
    h1("Your action plan");
    para("Milestones to move from where you are today toward your top-matched career.");
    y += 6;
    for (const step of input.plan) {
      ensure(50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(BRAND);
      const marker = step.completed ? "✓" : "○";
      doc.text(`${marker}  ${step.title}`, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`${step.timeframe} · ${step.category}`, pageW - margin, y, { align: "right" });
      y += 14;
      doc.setTextColor(30);
      para(step.description);
      y += 6;
    }
  }

  // ---------- Footer on every page ----------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text("Compass · personal career report · not a guarantee of outcomes", margin, pageH - 20);
    doc.text(`${i} / ${pageCount}`, pageW - margin, pageH - 20, { align: "right" });
  }

  const filename = `compass-career-report-${input.studentName.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  doc.save(filename);
}
