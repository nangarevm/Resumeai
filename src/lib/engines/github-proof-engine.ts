import type { CandidateProfile, GithubProofResult } from "../models";

export async function proveGithub(candidate: CandidateProfile): Promise<GithubProofResult> {
  const text = candidate.rawResumeText;
  const urls = unique(
    [...text.matchAll(/https?:\/\/github\.com\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?/gi)].map((m) => m[0])
  );
  if (candidate.githubUrl && !urls.includes(candidate.githubUrl)) urls.unshift(candidate.githubUrl);

  const username = extractUsername(candidate.githubUrl || urls[0] || "");
  const claimsMentioningGithub = candidate.rawResumeText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /github/i.test(l) && l.length > 12);

  const proofNotes: string[] = [];
  if (!username) {
    proofNotes.push("No GitHub username detected. Add https://github.com/<handle> so claims can be checked.");
  } else {
    proofNotes.push(`Detected GitHub handle: ${username}.`);
  }
  if (!claimsMentioningGithub.length) {
    proofNotes.push("Resume does not cite GitHub artifacts. Project claims cannot be externally corroborated from the document alone.");
  }

  let publicSummary: GithubProofResult["publicSummary"];
  let confidence = username ? 35 : 10;
  if (username) {
    try {
      const userRes = await fetch(`https://api.github.com/users/${username}`, {
        headers: { "User-Agent": "ResumeProof/1.0", Accept: "application/vnd.github+json" }
      });
      if (userRes.ok) {
        const user = (await userRes.json()) as {
          public_repos?: number;
          followers?: number;
          bio?: string;
        };
        const repoRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=5`, {
          headers: { "User-Agent": "ResumeProof/1.0", Accept: "application/vnd.github+json" }
        });
        const repos = repoRes.ok
          ? ((await repoRes.json()) as Array<{
              name: string;
              stargazers_count: number;
              language: string | null;
              description: string | null;
            }>)
          : [];
        publicSummary = {
          publicRepos: user.public_repos,
          followers: user.followers,
          bio: user.bio,
          topRepos: repos.map((r) => ({
            name: r.name,
            stars: r.stargazers_count,
            language: r.language,
            description: r.description
          }))
        };
        confidence = 70;
        proofNotes.push("Public GitHub profile fetched. This proves account existence, not authorship of every resume bullet.");
        const skillHits = (candidate.extractedSkills || []).filter((s) =>
          repos.some((r) => (r.language || "").toLowerCase() === s.toLowerCase())
        );
        if (skillHits.length) {
          confidence = 82;
          proofNotes.push(`Repo languages overlap resume skills: ${skillHits.join(", ")}.`);
        }
      } else {
        proofNotes.push(`GitHub API returned ${userRes.status}. Falling back to document-only proof.`);
      }
    } catch {
      proofNotes.push("GitHub API unreachable. Proof limited to URLs found in the resume.");
    }
  }

  return { username, urls, claimsMentioningGithub, publicSummary, proofNotes, confidence };
}

function extractUsername(url: string): string | undefined {
  const m = url.match(/github\.com\/([A-Za-z0-9_-]+)/i);
  if (!m) return undefined;
  if (["orgs", "settings", "features", "topics"].includes(m[1].toLowerCase())) return undefined;
  return m[1];
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}
