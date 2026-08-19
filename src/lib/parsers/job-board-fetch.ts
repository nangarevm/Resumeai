/**
 * Fetch and normalize job text from public boards (Greenhouse, Lever, JSON-LD).
 * No auth — falls back to generic HTML strip when structure is unknown.
 */

export interface JobFetchResult {
  text: string;
  source: "greenhouse" | "lever" | "json-ld" | "generic";
  title?: string;
  company?: string;
}

export async function fetchJobFromUrl(url: string): Promise<JobFetchResult> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "ResumeProof/2.0 (+https://github.com/nangarevm/Resumeai)",
      Accept: "text/html,application/xhtml+xml"
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const lower = url.toLowerCase();

  if (lower.includes("greenhouse.io") || lower.includes("boards.greenhouse")) {
    const gh = parseGreenhouse(html, url);
    if (gh) return gh;
  }
  if (lower.includes("lever.co") || lower.includes("jobs.lever")) {
    const lv = parseLever(html, url);
    if (lv) return lv;
  }

  const ld = parseJsonLdJobPosting(html);
  if (ld) return ld;

  return { text: stripGenericHtml(html), source: "generic" };
}

export function parseJsonLdJobPosting(html: string): JobFetchResult | null {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const s of scripts) {
    try {
      const data = JSON.parse(s[1].trim());
      const posts = Array.isArray(data) ? data : [data];
      for (const item of posts) {
        if (item["@type"] === "JobPosting" || item.title) {
          const parts = [
            item.title ? `POSITION: ${item.title}` : "",
            item.hiringOrganization?.name ? `COMPANY: ${item.hiringOrganization.name}` : "",
            item.jobLocation?.address?.addressLocality ? `LOCATION: ${item.jobLocation.address.addressLocality}` : "",
            item.description ? stripHtml(item.description) : ""
          ].filter(Boolean);
          return {
            text: parts.join("\n"),
            source: "json-ld",
            title: item.title,
            company: item.hiringOrganization?.name
          };
        }
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return null;
}

function parseGreenhouse(html: string, url: string): JobFetchResult | null {
  const ld = parseJsonLdJobPosting(html);
  if (ld) return { ...ld, source: "greenhouse" };

  const title = html.match(/<h1[^>]*class=["'][^"']*app-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const company = html.match(/<span[^>]*class=["'][^"']*company-name[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1];
  const content =
    html.match(/<div[^>]*id=["']content["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ||
    html.match(/<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1];

  if (!content && !title) return null;

  const text = [
    title ? `POSITION: ${stripHtml(title)}` : "",
    company ? `COMPANY: ${stripHtml(company)}` : "",
    `SOURCE URL: ${url}`,
    content ? stripHtml(content) : ""
  ]
    .filter(Boolean)
    .join("\n");

  return { text, source: "greenhouse", title: title ? stripHtml(title) : undefined, company: company ? stripHtml(company) : undefined };
}

function parseLever(html: string, url: string): JobFetchResult | null {
  const ld = parseJsonLdJobPosting(html);
  if (ld) return { ...ld, source: "lever" };

  const posting = html.match(/window\.LEVER_POSTING\s*=\s*(\{[\s\S]*?\});/);
  if (posting) {
    try {
      const data = JSON.parse(posting[1]) as {
        text?: string;
        title?: string;
        categories?: { team?: string; location?: string };
        workplaceType?: string;
      };
      const text = [
        data.title ? `POSITION: ${data.title}` : "",
        data.categories?.team ? `COMPANY: ${data.categories.team}` : "",
        data.categories?.location ? `LOCATION: ${data.categories.location}` : "",
        data.text ? stripHtml(data.text) : ""
      ]
        .filter(Boolean)
        .join("\n");
      return { text, source: "lever", title: data.title, company: data.categories?.team };
    } catch {
      /* fall through */
    }
  }

  const h2 = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1];
  const body = html.match(/<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1];
  if (!h2 && !body) return null;
  return {
    text: [h2 ? `POSITION: ${stripHtml(h2)}` : "", body ? stripHtml(body) : ""].filter(Boolean).join("\n"),
    source: "lever",
    title: h2 ? stripHtml(h2) : undefined
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function stripGenericHtml(html: string): string {
  return stripHtml(html).slice(0, 12000);
}
