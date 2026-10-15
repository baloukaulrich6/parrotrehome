import { redirect } from "next/navigation";
import { getServerUser } from "./auth";

export async function requireStaffPage() {
  const user = await getServerUser({ allowMfaSetup: true });
  if (!user) redirect("/sign-in?callbackUrl=/admin");
  if (user.role === "CLIENT") redirect("/my-requests");
  if (!user.mfaEnabled) redirect("/staff-mfa");
  return user;
}
