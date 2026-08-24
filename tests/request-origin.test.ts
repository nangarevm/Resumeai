import { describe, expect, it } from "vitest";
import { getPublicOrigin } from "@/lib/request-origin";

describe("getPublicOrigin", () => {
  it("replaces 0.0.0.0 with localhost when no Host header", () => {
    const origin = getPublicOrigin(new Request("http://0.0.0.0:3000/api/share"));
    expect(origin).toBe("http://localhost:3000");
  });

  it("prefers the Host header the browser used", () => {
    const origin = getPublicOrigin(
      new Request("http://0.0.0.0:3000/api/share", { headers: { host: "localhost:3000" } })
    );
    expect(origin).toBe("http://localhost:3000");
  });

  it("uses NEXTAUTH_URL when set", () => {
    const prev = process.env.NEXTAUTH_URL;
    process.env.NEXTAUTH_URL = "https://resumeproof.example.com";
    const origin = getPublicOrigin(new Request("http://0.0.0.0:3000/api/share"));
    expect(origin).toBe("https://resumeproof.example.com");
    process.env.NEXTAUTH_URL = prev;
  });
});
