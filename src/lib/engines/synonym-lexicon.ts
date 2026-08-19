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
  ["jenkins", "github actions", "gitlab ci", "azure devops", "ci/cd", "pipeline"],
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
  ["rust", "rustlang"]
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
  const isShortTerm = significantTokens.length <= 2;

  for (const group of GROUPS) {
    const longHit = group.some((alias) => alias.length >= 4 && lower.includes(alias));
    const exactHit = group.includes(lower);
    const shortReqHit = isShortTerm && group.some((alias) => significantTokens.includes(alias));
    if (longHit || exactHit || shortReqHit) {
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
