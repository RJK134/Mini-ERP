import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="mb-2 text-2xl font-semibold">Set up your workspace</h1>
      <p className="mb-6 text-sm text-slate-600">
        A workspace gives your team a shared inbox, case queue, and dashboard. Takes about 30 seconds.
      </p>
      <OnboardingForm />
    </div>
  );
}
