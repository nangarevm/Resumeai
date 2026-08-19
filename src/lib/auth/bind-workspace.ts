import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "./config";
import { setWorkspaceUserId } from "../workspace-store";

export async function bindWorkspaceUser(): Promise<string> {
  if (process.env.RESUMEPROOF_TEST_MODE || process.env.RESUMEPROOF_WORKSPACE_FILE) {
    const testUser = process.env.RESUMEPROOF_WORKSPACE_USER || "test";
    setWorkspaceUserId(testUser);
    return testUser;
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    setWorkspaceUserId(session.user.id);
    return session.user.id;
  }

  const jar = await cookies();
  const guest = jar.get("rp_guest")?.value;
  if (guest) {
    setWorkspaceUserId(guest);
    return guest;
  }

  setWorkspaceUserId("default");
  return "default";
}

export async function getSessionUser() {
  return getServerSession(authOptions);
}
