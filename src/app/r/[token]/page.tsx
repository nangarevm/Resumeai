import { getShareByToken } from "@/lib/shares";
import { redactContactInfo } from "@/lib/engines/share-redaction";
import ResumeTemplatePreview from "@/components/ResumeTemplatePreview";

export const dynamic = "force-dynamic";

export default async function SharedResumePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = getShareByToken(token);

  if (!share) {
    return (
      <main className="page" style={{ maxWidth: 640, margin: "60px auto", textAlign: "center" }}>
        <h1>This link isn&apos;t available</h1>
        <p className="muted">
          It may have expired, been revoked by the person who shared it, or the link was typed incorrectly.
        </p>
      </main>
    );
  }

  const text = redactContactInfo(share.snapshot);

  return (
    <main className="page" style={{ maxWidth: 820, margin: "40px auto" }}>
      <div className="banner" style={{ marginBottom: 20 }}>
        <div>
          <strong>You&apos;re viewing a shared resume</strong>
          <p className="muted" style={{ marginTop: 6 }}>
            Contact details have been hidden on this shared view. This is a read-only preview — nothing you do here
            changes the original.
          </p>
        </div>
      </div>
      <ResumeTemplatePreview text={text} templateId="ats-classic" />
    </main>
  );
}
