import { describe, expect, it } from "vitest";
import { parseResume } from "@/lib/parsers/resume-parser";
import { parseJD } from "@/lib/parsers/jd-extractor";
import { findEvidenceForRequirement } from "@/lib/engines/evidence-engine";
import { computeFitReport } from "@/lib/engines/fit-score";
import { resolveRoleFamily } from "@/lib/engines/market-intelligence";
import { scorableRequirements } from "@/lib/models";

interface FieldCase {
  family: string;
  title: string;
  resumeText: string;
  jdText: string;
  // requirement-name substrings that must resolve to DIFFERENT evidence
  // snippets from each other (over-crediting guard)
  distinctGroups: string[][];
}

const CASES: FieldCase[] = [
  {
    family: "sdet",
    title: "SDET / QA Automation Engineer",
    resumeText: `NAME: Alex Kim
EMAIL: alex.kim@example.com
PHONE: 555-0111
SKILLS
Playwright, Selenium, API testing (Postman), CI/CD (Jenkins), Jira defect tracking, SQL database testing
WORK EXPERIENCE
Acme Corp | SDET | 2021-Present
- Built Playwright automation suites for the checkout flow
- Automated API testing with Postman and integrated into Jenkins CI/CD
- Tracked defects in Jira and validated data with SQL queries`,
    jdText: `POSITION: SDET
MANDATORY REQUIREMENTS
- Playwright experience
- API testing (Postman)
- CI/CD pipeline experience (Jenkins)
- Jira defect tracking
- SQL database testing`,
    distinctGroups: []
  },
  {
    family: "software_engineer",
    title: "Software Engineer",
    resumeText: `NAME: Sam Lee
EMAIL: sam.lee@example.com
PHONE: 555-0112
SKILLS
Python, TypeScript, Git, Docker, Microservices, PostgreSQL
WORK EXPERIENCE
Acme Corp | Software Engineer | 2021-Present
- Built backend services in Python and TypeScript
- Designed microservices deployed via Docker
- Used Git for version control and PostgreSQL for storage`,
    jdText: `POSITION: Software Engineer
MANDATORY REQUIREMENTS
- Python
- TypeScript
- Git version control
- Docker
- Microservices architecture
- SQL / PostgreSQL`,
    distinctGroups: []
  },
  {
    family: "ml_engineer",
    title: "Machine Learning Engineer",
    resumeText: `NAME: Priya Rao
EMAIL: priya.rao@example.com
PHONE: 555-0113
SKILLS
Machine learning, PyTorch, computer vision, data structures and algorithms, RAG, vector database
WORK EXPERIENCE
Acme AI | ML Engineer | 2021-Present
- Trained deep learning models with PyTorch for computer vision
- Built a RAG pipeline with a vector database for retrieval
- Applied data structures and algorithms to optimize inference`,
    jdText: `POSITION: Machine Learning Engineer
MANDATORY REQUIREMENTS
- Machine learning
- Deep learning (PyTorch)
- Computer vision
- Data structures and algorithms
- RAG / vector database experience`,
    distinctGroups: []
  },
  {
    family: "intern",
    title: "AI/ML Intern",
    resumeText: `NAME: Jordan Diaz
EMAIL: jordan.diaz@example.com
PHONE: 555-0114
SKILLS
Python, Machine Learning
PROJECTS
Disease prediction system using scikit-learn and a machine learning pipeline`,
    jdText: `POSITION: AI/ML Intern
MANDATORY REQUIREMENTS
- Python
- Machine Learning
- At least 1 AI/ML project`,
    distinctGroups: []
  },
  {
    family: "backend_engineer",
    title: "Backend Engineer",
    resumeText: `NAME: Chris Wu
EMAIL: chris.wu@example.com
PHONE: 555-0115
SKILLS
Java, Spring Boot, SQL, Microservices, Docker, Kubernetes
WORK EXPERIENCE
Acme Corp | Backend Engineer | 2021-Present
- Built REST services in Java with Spring Boot
- Designed microservices running on Kubernetes with Docker
- Wrote SQL queries against PostgreSQL`,
    jdText: `POSITION: Backend Engineer
MANDATORY REQUIREMENTS
- Java / Spring Boot
- SQL
- Microservices
- Docker
- Kubernetes`,
    distinctGroups: []
  },
  {
    family: "devops",
    title: "DevOps Engineer",
    resumeText: `NAME: Morgan Blake
EMAIL: morgan.blake@example.com
PHONE: 555-0116
SKILLS
Docker, Kubernetes, Terraform, CI/CD, AWS
WORK EXPERIENCE
Acme Corp | DevOps Engineer | 2021-Present
- Managed Kubernetes clusters and Docker containers
- Wrote Terraform infrastructure as code
- Built CI/CD pipelines and deployed to AWS`,
    jdText: `POSITION: DevOps Engineer
MANDATORY REQUIREMENTS
- Docker
- Kubernetes
- Terraform / infrastructure as code
- CI/CD
- AWS`,
    distinctGroups: []
  },
  {
    family: "data_analyst",
    title: "Data Analyst",
    resumeText: `NAME: Taylor Ng
EMAIL: taylor.ng@example.com
PHONE: 555-0117
SKILLS
Excel, pivot tables, SQL, data validation, stakeholder communication
WORK EXPERIENCE
Acme Corp | Data Analyst | 2021-Present
- Built pivot tables and dashboards in Excel
- Validated data with SQL queries
- Presented findings to stakeholders`,
    jdText: `POSITION: Data Analyst
MANDATORY REQUIREMENTS
- Excel / pivot tables
- SQL
- Data validation
- Stakeholder communication`,
    distinctGroups: []
  },
  {
    family: "finance",
    title: "Financial Analyst",
    resumeText: `NAME: Jamie Ford
EMAIL: jamie.ford@example.com
PHONE: 555-0118
SKILLS
Financial modeling, DCF valuation, Excel, client communication
WORK EXPERIENCE
Acme Capital | Financial Analyst | 2021-Present
- Built financial models and DCF valuations
- Presented reports with client communication`,
    jdText: `POSITION: Financial Analyst
MANDATORY REQUIREMENTS
- Financial modeling
- DCF valuation
- Excel
- Client communication`,
    distinctGroups: []
  },
  {
    family: "marketing",
    title: "Marketing Specialist",
    resumeText: `NAME: Robin Shaw
EMAIL: robin.shaw@example.com
PHONE: 555-0119
SKILLS
SEO, keyword ranking, presentation, leadership
WORK EXPERIENCE
Acme Corp | Marketing Specialist | 2021-Present
- Improved SEO and keyword ranking for the site
- Led a team and gave stakeholder presentations`,
    jdText: `POSITION: Marketing Specialist
MANDATORY REQUIREMENTS
- SEO / keyword ranking
- Presentation skills
- Leadership`,
    distinctGroups: []
  },
  {
    family: "renewable_energy",
    title: "Solar Design Engineer",
    resumeText: `NAME: Casey Ito
EMAIL: casey.ito@example.com
PHONE: 555-0120
SKILLS
Solar/photovoltaic systems, AutoCAD, client communication
WORK EXPERIENCE
Acme Solar | Design Engineer | 2021-Present
- Designed PV systems and used AutoCAD for layouts
- Communicated with clients on project status`,
    jdText: `POSITION: Solar Design Engineer
MANDATORY REQUIREMENTS
- Solar / photovoltaic systems
- CAD / AutoCAD
- Client communication`,
    distinctGroups: []
  },
  {
    family: "healthcare",
    title: "Registered Nurse - Med-Surg",
    resumeText: `NAME: Jane Rivera
EMAIL: jane.rivera@example.com
PHONE: 555-0100
SKILLS
Patient care, EHR (Epic), vital signs monitoring, BLS certification, phlebotomy
WORK EXPERIENCE
St. Mary Hospital | Registered Nurse | 2021-Present
- Provided direct patient care for a 20-bed med-surg unit
- Documented clinical notes in Epic EHR system
- Maintained BLS certification and led triage during high-volume shifts
- Assisted with vital signs monitoring during admissions
- Performed phlebotomy for lab draws`,
    jdText: `POSITION: Registered Nurse - Med-Surg
MANDATORY REQUIREMENTS
- Patient care experience
- EHR/EMR system proficiency (Epic preferred)
- BLS certification
- Vital signs monitoring
NICE TO HAVE
- Phlebotomy experience`,
    distinctGroups: [["Patient care", "EHR/EMR system proficiency", "BLS certification", "Vital signs monitoring", "Phlebotomy experience"]]
  },
  {
    family: "education",
    title: "Elementary School Teacher",
    resumeText: `NAME: Devon Park
EMAIL: devon.park@example.com
PHONE: 555-0121
SKILLS
Curriculum development, lesson planning, classroom management, student assessment, learning management system (Canvas)
WORK EXPERIENCE
Lincoln Elementary | 4th Grade Teacher | 2021-Present
- Developed curriculum and lesson plans for 25 students
- Maintained classroom management in a mixed-ability classroom
- Ran student assessments each quarter
- Posted grades in the learning management system`,
    jdText: `POSITION: Elementary School Teacher
MANDATORY REQUIREMENTS
- Curriculum development
- Classroom management
- Student assessment
- Learning management system experience (Canvas or similar)`,
    distinctGroups: [["Curriculum development", "Classroom management", "Student assessment", "Learning management system"]]
  },
  {
    family: "legal",
    title: "Paralegal",
    resumeText: `NAME: Riley Chen
EMAIL: riley.chen@example.com
PHONE: 555-0122
SKILLS
Contract review, legal research (Westlaw), litigation support, e-discovery
WORK EXPERIENCE
Baker Law Firm | Paralegal | 2021-Present
- Conducted contract review for commercial agreements
- Performed legal research using Westlaw
- Provided litigation support for trial preparation
- Managed e-discovery for active cases`,
    jdText: `POSITION: Paralegal
MANDATORY REQUIREMENTS
- Contract review experience
- Legal research (Westlaw or similar)
- Litigation support
- E-discovery experience`,
    distinctGroups: [["Contract review", "Legal research", "Litigation support", "E-discovery"]]
  },
  {
    family: "hospitality",
    title: "Hotel Front Desk / Server",
    resumeText: `NAME: Morgan Reyes
EMAIL: morgan.reyes@example.com
PHONE: 555-0123
SKILLS
Guest service, POS system experience, food safety (ServSafe), housekeeping, front desk operations
WORK EXPERIENCE
Grand Hotel | Front Desk Associate | 2021-Present
- Delivered guest service for a 200-room property
- Processed payments on the POS system
- Held a ServSafe food safety certification while covering the restaurant
- Coordinated with housekeeping on room turnover
- Ran front desk check-ins for arriving guests`,
    jdText: `POSITION: Hotel Front Desk Associate
MANDATORY REQUIREMENTS
- Guest service experience
- POS system experience
- Food safety certification (ServSafe)
- Housekeeping coordination
- Front desk experience`,
    distinctGroups: [["Guest service", "POS system", "Food safety certification", "Housekeeping", "Front desk"]]
  },
  {
    family: "sales",
    title: "Sales Representative",
    resumeText: `NAME: Avery Cole
EMAIL: avery.cole@example.com
PHONE: 555-0124
SKILLS
CRM (Salesforce), cold calling, lead generation, account management, quota attainment
WORK EXPERIENCE
Acme Sales | Sales Rep | 2021-Present
- Managed pipeline in Salesforce CRM
- Ran cold calling campaigns to new prospects
- Ran lead generation campaigns via email outreach
- Handled account management for top clients`,
    jdText: `POSITION: Sales Representative
MANDATORY REQUIREMENTS
- CRM experience (Salesforce)
- Cold calling experience
- Lead generation experience
- Account management experience`,
    distinctGroups: [["CRM", "Cold calling", "Lead generation", "Account management"]]
  },
  {
    family: "skilled_trades",
    title: "Electrician",
    resumeText: `NAME: Pat Nguyen
EMAIL: pat.nguyen@example.com
PHONE: 555-0125
SKILLS
Electrical wiring, plumbing basics, HVAC, welding, OSHA safety certification, blueprint reading
WORK EXPERIENCE
BuildRight Contractors | Electrician | 2021-Present
- Installed electrical wiring for commercial buildings
- Assisted with plumbing on joint jobs
- Assisted with HVAC installs on joint jobs
- Performed welding for structural supports
- Maintained OSHA safety certification
- Read blueprints on site`,
    jdText: `POSITION: Electrician
MANDATORY REQUIREMENTS
- Electrical wiring experience
- Plumbing experience
- HVAC experience
- Welding experience
- OSHA safety certification
- Blueprint reading`,
    distinctGroups: [["Electrical wiring", "Plumbing", "HVAC", "Welding", "OSHA safety certification", "Blueprint reading"]]
  },
  {
    family: "logistics",
    title: "Warehouse Supervisor",
    resumeText: `NAME: Drew Osei
EMAIL: drew.osei@example.com
PHONE: 555-0126
SKILLS
Supply chain, warehouse operations, WMS (warehouse management system), forklift certification, route optimization
WORK EXPERIENCE
Acme Logistics | Warehouse Supervisor | 2021-Present
- Coordinated supply chain flow across 3 distribution centers
- Managed warehouse operations for a 50,000 sq ft facility
- Used a WMS to track inventory
- Held forklift certification for pallet moves
- Ran route optimization for delivery trucks`,
    jdText: `POSITION: Warehouse Supervisor
MANDATORY REQUIREMENTS
- Supply chain experience
- Warehouse operations experience
- WMS (warehouse management system) experience
- Forklift certification
- Route optimization experience`,
    distinctGroups: [["Supply chain", "Warehouse operations", "WMS", "Forklift certification", "Route optimization"]]
  },
  {
    family: "manufacturing",
    title: "Quality Control Inspector",
    resumeText: `NAME: Sam Ortiz
EMAIL: sam.ortiz@example.com
PHONE: 555-0127
SKILLS
Quality control, Six Sigma, production line experience, CNC machining
WORK EXPERIENCE
Acme Manufacturing | QC Inspector | 2021-Present
- Ran quality control checks on finished goods
- Applied Six Sigma methods to reduce defects
- Worked the production line for finished goods
- Operated CNC machining equipment`,
    jdText: `POSITION: Quality Control Inspector
MANDATORY REQUIREMENTS
- Quality control experience
- Six Sigma certification
- Production line experience
- CNC machining experience`,
    distinctGroups: [["Quality control", "Six Sigma", "Production line", "CNC machining"]]
  },
  {
    family: "creative_design",
    title: "Graphic Designer",
    resumeText: `NAME: Charlie Voss
EMAIL: charlie.voss@example.com
PHONE: 555-0128
SKILLS
Graphic design, Adobe Creative Suite (Photoshop, Illustrator), video editing (Premiere Pro), branding, Figma
WORK EXPERIENCE
Acme Studio | Graphic Designer | 2021-Present
- Produced graphic design assets for client campaigns
- Used Photoshop and Illustrator for layout work
- Edited promotional videos in Premiere Pro
- Led branding projects for clients
- Designed interfaces in Figma`,
    jdText: `POSITION: Graphic Designer
MANDATORY REQUIREMENTS
- Graphic design experience
- Adobe Creative Suite proficiency
- Video editing experience
- Branding experience
- Figma experience`,
    distinctGroups: [["Graphic design", "Adobe Creative Suite", "Video editing", "Branding", "Figma"]]
  },
  {
    family: "administrative",
    title: "Executive Assistant",
    resumeText: `NAME: Jesse Farah
EMAIL: jesse.farah@example.com
PHONE: 555-0129
SKILLS
Microsoft Office, calendar management, travel coordination, executive assistant experience, office administration
WORK EXPERIENCE
Acme Corp | Executive Assistant | 2021-Present
- Managed Microsoft Office documents and reports for the exec team
- Handled calendar management for 3 executives
- Coordinated travel arrangements and ran office administration tasks`,
    jdText: `POSITION: Executive Assistant
MANDATORY REQUIREMENTS
- Microsoft Office proficiency
- Calendar management experience
- Travel coordination experience
- Executive assistant experience`,
    distinctGroups: [["Microsoft Office", "Calendar management", "Travel coordination", "Executive assistant"]]
  },
  {
    family: "customer_service",
    title: "Customer Support Representative",
    resumeText: `NAME: Quinn Baxter
EMAIL: quinn.baxter@example.com
PHONE: 555-0130
SKILLS
Customer support, call center experience, Zendesk, customer satisfaction (CSAT), conflict resolution
WORK EXPERIENCE
Acme Support | Customer Support Rep | 2021-Present
- Provided customer support in a high-volume call center
- Managed tickets in Zendesk
- Tracked and improved CSAT scores
- Practiced conflict resolution with escalated customers`,
    jdText: `POSITION: Customer Support Representative
MANDATORY REQUIREMENTS
- Customer support experience
- Call center experience
- Zendesk experience
- Customer satisfaction / CSAT experience
- Conflict resolution experience`,
    distinctGroups: [["Customer support", "Call center", "Zendesk", "Customer satisfaction", "Conflict resolution"]]
  },
  {
    family: "human_resources",
    title: "HR Generalist / Recruiter",
    resumeText: `NAME: Sasha Kim
EMAIL: sasha.kim@example.com
PHONE: 555-0131
SKILLS
Talent acquisition, HRIS (Workday), onboarding, payroll, benefits administration, employee relations
WORK EXPERIENCE
Acme Corp | HR Generalist | 2021-Present
- Led talent acquisition and recruiting for the sales org
- Managed HRIS records in Workday
- Ran onboarding programs for new hires
- Processed payroll for a 200-person org
- Handled benefits administration for the team
- Resolved employee relations cases with managers`,
    jdText: `POSITION: HR Generalist
MANDATORY REQUIREMENTS
- Talent acquisition / recruiting experience
- HRIS system experience (Workday preferred)
- Onboarding program experience
- Payroll experience
- Benefits administration experience
- Employee relations experience`,
    distinctGroups: [["Talent acquisition", "HRIS system", "Onboarding", "Payroll", "Benefits administration", "Employee relations"]]
  }
];

describe("End-to-end field coverage: every role family matches cleanly with no over-crediting", () => {
  for (const c of CASES) {
    it(`${c.family} (${c.title})`, () => {
      const profile = parseResume("seeker", c.resumeText);
      const jd = parseJD(`job-${c.family}`, c.jdText);

      const resolvedFamily = resolveRoleFamily(jd.title, jd.domain);
      expect(resolvedFamily, `role family resolution for "${jd.title}"`).toBe(c.family);

      const scorable = scorableRequirements(jd);
      expect(scorable.length, `JD requirements parsed for ${c.family}`).toBeGreaterThan(0);

      const evidenceByReq = new Map(scorable.map((req) => [req.name, findEvidenceForRequirement(profile, req)]));

      const gaps = [...evidenceByReq.entries()].filter(([, e]) => e.strength === "NOT_FOUND");
      expect(gaps.map(([name]) => name), `unexpected gaps for ${c.family}`).toEqual([]);

      // Over-crediting guard: distinct requirements must not share the same
      // evidence snippet as if one skill were being credited for another.
      for (const group of c.distinctGroups) {
        const snippets = group.map((reqSubstring) => {
          const match = [...evidenceByReq.entries()].find(([name]) => name.toLowerCase().includes(reqSubstring.toLowerCase()));
          expect(match, `requirement containing "${reqSubstring}" not found for ${c.family}`).toBeTruthy();
          return match![1].snippet.toLowerCase();
        });
        const unique = new Set(snippets);
        expect(unique.size, `${c.family}: expected distinct snippets for ${JSON.stringify(group)}, got ${JSON.stringify(snippets)}`).toBe(
          snippets.length
        );
      }

      // Full fit report should compute without throwing and stay internally consistent.
      const fit = computeFitReport(profile, jd);
      expect(fit.score).toBeGreaterThanOrEqual(0);
      expect(fit.gaps.length, `fit report gaps for ${c.family}`).toBe(0);
      expect(fit.coreMatches.length).toBeGreaterThan(0);
    });
  }
});
