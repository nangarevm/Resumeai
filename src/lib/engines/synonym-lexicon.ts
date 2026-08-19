/**
 * Domain-agnostic synonym expansion.
 * Suggestion implemented: richer aliases so evidence matching is not limited
 * to exact JD wording (e.g. "ML" vs "machine learning").
 */
const GROUPS: string[][] = [
  ["python", "py", "python3", "django", "flask", "fastapi"],
  ["javascript", "js", "node.js", "nodejs", "node", "typescript", "ts"],
  ["java", "jvm", "spring", "spring boot", "springboot"],
  ["sql", "mysql", "postgresql", "postgres", "sqlite", "relational databases"],
  ["machine learning", "ml", "scikit-learn", "sklearn", "supervised learning"],
  ["deep learning", "dl", "neural network", "pytorch", "tensorflow", "cnn", "keras"],
  ["computer vision", "cv", "opencv", "object detection", "image detection", "traffic sign"],
  ["ai/ml project", "ai project", "ml project", "machine learning project", "prediction system", "disease prediction"],
  ["git", "github", "gitlab", "version control"],
  ["playwright", "selenium", "cypress", "ui automation", "end-to-end", "e2e", "jbehave", "bdd"],
  // Bare "pipeline" deliberately excluded — it's domain-ambiguous (CI/CD pipeline,
  // data pipeline, RAG pipeline, sales pipeline...) and matching it here made any
  // requirement mentioning e.g. "RAG pipelines" spuriously match CI/CD evidence.
  // "ci/cd" alone already covers legitimate "CI/CD pipeline" phrasing.
  ["jenkins", "github actions", "gitlab ci", "azure devops", "ci/cd"],
  ["postman", "rest api", "api testing", "supertest", "swagger"],
  ["jira", "zephyr", "testrail", "defect management"],
  ["manual testing", "automation testing", "test automation", "qa", "quality assurance"],
  ["sql", "mysql", "database testing", "data validation"],
  ["agile", "scrum", "sdlc", "stlc"],
  ["jmeter", "gatling", "performance testing"],
  ["docker", "containers", "containerization"],
  ["microservices", "microservice", "distributed systems"],
  ["data structures", "dsa", "algorithms"],
  ["excel", "spreadsheets", "vlookup", "pivot tables"],
  ["financial modeling", "dcf", "valuation", "three statement"],
  ["seo", "search engine optimization", "keyword ranking"],
  ["solidworks", "cad", "autocad", "3d modeling"],
  ["solar", "photovoltaic", "pv", "pv system", "renewable energy"],
  ["communication", "stakeholder", "presentation", "client communication"],
  ["leadership", "led a team", "mentored", "people management"],
  ["llm", "large language model", "gpt", "claude", "gemini", "openai api", "anthropic api", "chatgpt"],
  ["ai agent", "agentic", "agentic ai", "ai agents", "autonomous agent", "tool calling", "function calling", "mcp", "model context protocol"],
  ["rag", "retrieval augmented generation", "vector database", "vector db", "embeddings", "pinecone", "weaviate", "chroma", "faiss"],
  ["prompt engineering", "prompt design", "few-shot prompting", "system prompt"],
  ["langchain", "langgraph", "llamaindex", "semantic kernel"],
  ["fine-tuning", "fine tuning", "lora", "rlhf", "instruction tuning"],
  ["kubernetes", "k8s", "helm", "eks", "gke", "aks"],
  ["terraform", "infrastructure as code", "iac", "pulumi"],
  ["graphql", "apollo", "grpc"],
  ["golang", "go lang"],
  ["rust", "rustlang"],
  // Non-tech fields — added so evidence matching works for any job market, not
  // just software/finance/marketing. Each group sticks to terms specific enough
  // to that field to avoid the cross-domain contamination bare "pipeline" caused.
  ["patient care", "ehr", "emr", "electronic health records", "epic", "cerner", "clinical documentation", "vital signs", "phlebotomy", "medical terminology"],
  ["bls certification", "acls certification", "cpr certification"],
  ["curriculum development", "lesson planning", "classroom management", "instructional design", "student assessment", "differentiated instruction", "iep", "learning management system", "lms"],
  ["contract review", "legal research", "litigation support", "paralegal", "legal drafting", "westlaw", "lexisnexis", "e-discovery", "case management software"],
  ["guest service", "pos system", "point of sale", "food safety", "servsafe", "housekeeping", "front desk", "hotel operations", "reservation system"],
  ["crm", "salesforce", "hubspot crm", "cold calling", "lead generation", "account management", "quota attainment", "b2b sales", "retail sales", "merchandising", "upselling"],
  ["electrical wiring", "plumbing", "hvac", "welding", "osha", "blueprint reading", "carpentry", "construction management", "machinist"],
  ["supply chain", "inventory management", "warehouse operations", "logistics coordination", "forklift certification", "shipping and receiving", "wms", "route optimization"],
  ["quality control", "lean manufacturing", "six sigma", "production line", "assembly line", "cnc machining", "manufacturing operations", "predictive maintenance"],
  ["graphic design", "adobe creative suite", "photoshop", "illustrator", "indesign", "premiere pro", "video editing", "branding", "content creation", "figma"],
  ["microsoft office", "google workspace", "office administration", "executive assistant", "calendar management", "travel coordination"],
  ["customer support", "call center", "help desk", "ticketing system", "zendesk", "freshdesk", "customer satisfaction", "csat", "conflict resolution"],
  ["recruiting", "talent acquisition", "onboarding", "hris", "workday", "bamboohr", "employee relations", "payroll", "benefits administration", "shrm"]
];

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter(Boolean);
}

export function expandSynonyms(term: string, extra: string[] = []): string[] {
  const lower = term.toLowerCase().trim();
  const out = new Set<string>([lower, ...extra.map((s) => s.toLowerCase())]);
  if (lower.includes(" ")) out.add(lower.replace(/\s+/g, ""));
  const compact = lower.replace(/[^a-z0-9+#]+/g, " ").trim();
  if (compact) out.add(compact);

  const significantTokens = tokenize(lower).filter((t) => /[a-z]/i.test(t));

  for (const group of GROUPS) {
    const longHit = group.some((alias) => alias.length >= 4 && lower.includes(alias));
    const exactHit = group.includes(lower);
    // Token-exact match (not substring) — safe regardless of how long the
    // surrounding phrase is, since tokenize() already gives real word boundaries.
    // This is what lets a short acronym like "EHR" or "RN" match even buried
    // inside a long requirement like "EHR/EMR system proficiency (Epic preferred)".
    const tokenHit = group.some((alias) => significantTokens.includes(alias));
    if (longHit || exactHit || tokenHit) {
      group.forEach((alias) => out.add(alias));
    }
  }
  return [...out].filter((alias) => alias.length > 1);
}

export function commonTechMisspellings(): Record<string, string> {
  return {
    javscript: "JavaScript",
    javasript: "JavaScript",
    pyhton: "Python",
    machiene: "machine",
    recieve: "receive",
    acheived: "achieved",
    seperate: "separate",
    experiance: "experience",
    managment: "management",
    developement: "development",
    responcible: "responsible"
  };
}
