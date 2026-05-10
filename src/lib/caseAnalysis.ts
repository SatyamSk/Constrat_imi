import { supabase } from "./supabase";

export interface CaseAnalysis {
  framework: string;
  framework_score: number;
  clarity: number;
  approach: number;
  execution: number;
  overall_score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface GuessimateAnalysis {
  methodology: string;
  methodology_score: number;
  accuracy: number;
  reasoning: number;
  presentation: number;
  overall_score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

// Analyze case submission with AI-like heuristics
export async function analyzeCaseSubmission(answer: string): Promise<CaseAnalysis> {
  // This is a placeholder implementation
  // In production, you would call an actual AI/ML service
  const analysis = performBasicAnalysis(answer, "case");

  return {
    framework: detectFramework(answer),
    framework_score: analysis.framework_score,
    clarity: analysis.clarity,
    approach: analysis.approach,
    execution: analysis.execution,
    overall_score: analysis.overall_score,
    feedback: generateFeedback(analysis),
    strengths: extractStrengths(answer, analysis),
    improvements: extractImprovements(answer, analysis),
  };
}

// Analyze guestimate submission
export async function analyzeGuessimateSubmission(answer: string): Promise<GuessimateAnalysis> {
  const analysis = performBasicAnalysis(answer, "guestimate");

  return {
    methodology: detectMethodology(answer),
    methodology_score: analysis.framework_score,
    accuracy: analysis.approach,
    reasoning: analysis.execution,
    presentation: analysis.clarity,
    overall_score: analysis.overall_score,
    feedback: generateFeedback(analysis),
    strengths: extractStrengths(answer, analysis),
    improvements: extractImprovements(answer, analysis),
  };
}

// Detect consulting framework used in answer
function detectFramework(answer: string): string {
  const frameworks = [
    { name: "4Ps", keywords: ["price", "product", "place", "promotion"] },
    { name: "SWOT", keywords: ["strength", "weakness", "opportunity", "threat"] },
    {
      name: "Porter's 5 Forces",
      keywords: ["supplier", "competitor", "buyer", "threat", "substitute"],
    },
    { name: "3Cs", keywords: ["company", "customer", "competitor"] },
    { name: "Value Chain", keywords: ["value", "chain", "activities", "primary", "support"] },
    { name: "Ansoff", keywords: ["matrix", "market", "product", "growth"] },
    { name: "Profitability Tree", keywords: ["revenue", "cost", "profit", "margin"] },
  ];

  const lowerAnswer = answer.toLowerCase();
  for (const framework of frameworks) {
    if (framework.keywords.some((k) => lowerAnswer.includes(k))) {
      return framework.name;
    }
  }

  return "Not Structured";
}

// Detect methodology in guestimate
function detectMethodology(answer: string): string {
  const lowerAnswer = answer.toLowerCase();

  if (lowerAnswer.includes("top-down") || lowerAnswer.includes("top down")) {
    return "Top-Down";
  }
  if (lowerAnswer.includes("bottom-up") || lowerAnswer.includes("bottom up")) {
    return "Bottom-Up";
  }
  if (lowerAnswer.includes("benchmark") || lowerAnswer.includes("comparison")) {
    return "Benchmark-Based";
  }

  return "Mixed Approach";
}

// Perform basic textual analysis
interface Analysis {
  framework_score: number;
  clarity: number;
  approach: number;
  execution: number;
  overall_score: number;
}

function performBasicAnalysis(answer: string, type: string): Analysis {
  const wordCount = answer.split(/\s+/).length;
  const paragraphCount = answer.split("\n").filter((p) => p.trim()).length;
  const numberCount = (answer.match(/\d+/g) || []).length;
  const hasStructure = /^#+\s|^-\s|^\d+\.\s/m.test(answer);

  let clarity = 0;
  if (wordCount > 50) clarity += 20;
  if (wordCount > 200) clarity += 20;
  if (answer.includes("?")) clarity += 10;
  if (paragraphCount > 2) clarity += 20;
  if (hasStructure) clarity += 20;
  clarity = Math.min(clarity, 100);

  let approach = 0;
  const keyTerms = [
    "market",
    "customer",
    "competitor",
    "revenue",
    "cost",
    "profit",
    "strategy",
    "analysis",
    "framework",
  ];
  const matchedTerms = keyTerms.filter((term) => answer.toLowerCase().includes(term)).length;
  approach = Math.min(matchedTerms * 10 + 20, 100);

  let execution = 0;
  if (numberCount > 0) execution += 20;
  if (answer.includes("therefore") || answer.includes("hence")) execution += 20;
  if (answer.includes("recommendation") || answer.includes("conclusion")) execution += 20;
  if (paragraphCount > 3) execution += 20;
  if (answer.length > 500) execution += 20;
  execution = Math.min(execution, 100);

  const framework_score = Math.min(Math.floor((matchedTerms / 9) * 100), 100);

  const overall_score = Math.round(
    ((clarity * 0.25 + approach * 0.35 + execution * 0.25 + framework_score * 0.15) / 100) * 100,
  );

  return {
    framework_score,
    clarity: Math.floor(clarity),
    approach: Math.floor(approach),
    execution: Math.floor(execution),
    overall_score: Math.min(overall_score, 100),
  };
}

// Generate contextual feedback
function generateFeedback(analysis: Analysis): string {
  const feedbacks: string[] = [];

  if (analysis.clarity < 60) {
    feedbacks.push(
      "Consider structuring your answer more clearly with headings and bullet points.",
    );
  }
  if (analysis.approach < 60) {
    feedbacks.push("Use a recognized consulting framework to structure your analysis.");
  }
  if (analysis.execution < 60) {
    feedbacks.push("Strengthen your recommendations with concrete data and examples.");
  }

  if (analysis.overall_score >= 80) {
    feedbacks.push("Well done! Your answer demonstrates strong analytical thinking.");
  } else if (analysis.overall_score >= 60) {
    feedbacks.push("Good effort. Review the suggestions above for improvement.");
  } else {
    feedbacks.push("This requires significant revision. Focus on structure and clarity.");
  }

  return feedbacks.join(" ");
}

// Extract strengths from answer
function extractStrengths(answer: string, analysis: Analysis): string[] {
  const strengths: string[] = [];

  if (analysis.clarity > 70) strengths.push("Clear and well-structured");
  if (analysis.approach > 70) strengths.push("Strong analytical framework");
  if (analysis.execution > 70) strengths.push("Concrete recommendations");
  if (answer.match(/\d+/g) && answer.match(/\d+/g)!.length > 3) {
    strengths.push("Good use of data");
  }
  if (answer.toLowerCase().includes("but") || answer.toLowerCase().includes("however")) {
    strengths.push("Balanced perspective");
  }

  return strengths.slice(0, 3);
}

// Extract improvement areas
function extractImprovements(answer: string, analysis: Analysis): string[] {
  const improvements: string[] = [];

  if (analysis.clarity < 70) improvements.push("Improve structure and formatting");
  if (analysis.approach < 70) improvements.push("Use a consulting framework");
  if (analysis.execution < 70) improvements.push("Add more concrete recommendations");
  if (!answer.match(/\d+/g)) improvements.push("Include relevant data/metrics");
  if (answer.length < 300) improvements.push("Provide more detailed analysis");

  return improvements.slice(0, 3);
}

// Save analysis to database
export async function saveCaseAnalysis(
  submissionId: string,
  analysis: CaseAnalysis,
): Promise<void> {
  if (!supabase) return;

  try {
    await supabase
      .from("case_submissions")
      .update({
        score: analysis.overall_score,
        feedback: analysis.feedback,
        ai_analysis: {
          framework: analysis.framework,
          clarity: analysis.clarity,
          approach: analysis.approach,
          execution: analysis.execution,
        },
      })
      .eq("id", submissionId);
  } catch (err) {
    console.error("Error saving case analysis:", err);
  }
}

// Save guestimate analysis to database
export async function saveGuessimateAnalysis(
  submissionId: string,
  analysis: GuessimateAnalysis,
): Promise<void> {
  if (!supabase) return;

  try {
    await supabase
      .from("guestimate_submissions")
      .update({
        score: analysis.overall_score,
        feedback: analysis.feedback,
        ai_analysis: {
          methodology: analysis.methodology,
          accuracy: analysis.accuracy,
          reasoning: analysis.reasoning,
          presentation: analysis.presentation,
        },
      })
      .eq("id", submissionId);
  } catch (err) {
    console.error("Error saving guestimate analysis:", err);
  }
}

// Get rankings for a case
export async function getCaseRankings(
  caseId: string,
  limit: number = 10,
): Promise<
  Array<{
    user_id: string;
    name: string;
    score: number;
    rank: number;
  }>
> {
  if (!supabase) return [];

  try {
    const { data } = await supabase
      .from("case_rankings")
      .select(
        `
        rank,
        score,
        profiles:user_id(full_name)
      `,
      )
      .eq("case_id", caseId)
      .order("rank", { ascending: true })
      .limit(limit);

    return (
      data?.map((item: any) => ({
        user_id: item.user_id,
        name: item.profiles?.full_name || "Anonymous",
        score: item.score,
        rank: item.rank,
      })) || []
    );
  } catch (err) {
    console.error("Error getting case rankings:", err);
    return [];
  }
}

// Update case rankings after a new submission
export async function updateCaseRankings(caseId: string): Promise<void> {
  if (!supabase) return;

  try {
    // Get all submissions for this case
    const { data: submissions } = await supabase
      .from("case_submissions")
      .select("user_id, score")
      .eq("case_id", caseId)
      .order("score", { ascending: false });

    if (!submissions) return;

    // Update rankings
    for (let i = 0; i < submissions.length; i++) {
      const { user_id, score } = submissions[i];

      const { data: existing } = await supabase
        .from("case_rankings")
        .select("id")
        .eq("case_id", caseId)
        .eq("user_id", user_id)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase
          .from("case_rankings")
          .update({ rank: i + 1, score })
          .eq("case_id", caseId)
          .eq("user_id", user_id);
      } else {
        await supabase.from("case_rankings").insert({
          case_id: caseId,
          user_id: user_id,
          rank: i + 1,
          score: score,
        });
      }
    }
  } catch (err) {
    console.error("Error updating case rankings:", err);
  }
}
