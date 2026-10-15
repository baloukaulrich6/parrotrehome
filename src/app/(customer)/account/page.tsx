import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { formatDateUTC } from "@/lib/constants";

export const metadata = { title: "My account" };
export default async function AccountPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in?callbackUrl=/account");
  const account = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { lastLoginAt: true, createdAt: true } });
  const activity = await db.auditLog.findMany({ where: { actorId: user.id, action: { in: ["LOGIN", "LOGIN_FAILED"] } }, orderBy: { timestamp: "desc" }, take: 10 });
  return <section className="max-w-3xl mx-auto py-10 px-4 space-y-6"><h1 className="font-heading text-3xl text-slate">My account</h1>
    <dl className="rounded-xl border bg-white p-6 grid sm:grid-cols-2 gap-4 text-sm">
      <div><dt className="text-feather">Name</dt><dd>{user.name || "—"}</dd></div>
      <div><dt className="text-feather">Email</dt><dd>{user.email}</dd></div>
      <div><dt className="text-feather">Role</dt><dd>{user.role.replaceAll("_", " ")}</dd></div>
      <div><dt className="text-feather">Last successful sign-in</dt><dd>{account.lastLoginAt ? formatDateUTC(account.lastLoginAt) : "No recorded sign-in yet"}</dd></div>
      <div><dt className="text-feather">Account created</dt><dd>{formatDateUTC(account.createdAt)}</dd></div>
    </dl>
    <div className="bg-white border rounded-xl p-6 space-y-3"><h2 className="font-heading text-xl">Recent sign-in activity</h2>
      {activity.length ? <ul className="space-y-2 text-sm">{activity.map((item) => <li key={item.id}>{formatDateUTC(item.timestamp)} · {item.action === "LOGIN" ? "Successful sign-in" : "Failed sign-in attempt"}</li>)}</ul> : <p className="text-sm text-feather">No sign-in activity has been recorded yet.</p>}
    </div>
    <Link href={user.role === "CLIENT" ? "/my-requests" : "/admin"} className="inline-flex rounded-full bg-tail-red text-white px-5 py-3">{user.role === "CLIENT" ? "My requests" : "Open administration"}</Link>
  </section>;
}
