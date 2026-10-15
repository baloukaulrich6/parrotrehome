import { readEmailTemplates } from "@/lib/email-templates";
import { notFound } from "next/navigation";
import { WorkflowDemo } from "@/components/parrotrehome/workflow-demo";
export const dynamic = "force-dynamic";
export const metadata = { title: "Workflow demo", robots: { index: false, follow: false } };

export default function DemoPage() {
  if (process.env.DEMO_ENABLED !== "true") notFound();
  return <WorkflowDemo paymentTemplate={readEmailTemplates()["instructions-ready"]} />;
}
