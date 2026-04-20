"use client";

import { useState } from "react";
import { Button, Card, CardBody } from "@ops-hub/ui";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function OnboardingForm() {
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [firstTeamName, setFirstTeamName] = useState("Field Team");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ slug: string; email: string } | null>(null);

  function onNameChange(v: string) {
    setWorkspaceName(v);
    if (!workspaceSlug || workspaceSlug === slugify(workspaceName)) {
      setWorkspaceSlug(slugify(v));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceName,
          workspaceSlug,
          ownerName,
          ownerEmail,
          firstTeamName: firstTeamName || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? "failed");
      setDone({ slug: workspaceSlug, email: ownerEmail });
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <Card>
        <CardBody>
          <h2 className="text-lg font-semibold">Workspace created ✓</h2>
          <p className="mt-2 text-sm text-slate-700">
            Slug: <span className="font-mono">{done.slug}</span>. Inbound email address:{" "}
            <span className="font-mono">inbound+{done.slug}@ops-hub.example</span>.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            In production, a magic-link sign-in email would have landed at <strong>{done.email}</strong>.
            For the pilot demo, set <code className="rounded bg-slate-100 px-1">DEMO_TENANT_SLUG={done.slug}</code>{" "}
            in the web app env and reload.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Labeled label="Workspace name">
        <input
          type="text"
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          placeholder="Acme Plumbing"
          value={workspaceName}
          onChange={(e) => onNameChange(e.target.value)}
          required
        />
      </Labeled>
      <Labeled label="Workspace slug" hint="Used for the inbound email address.">
        <input
          type="text"
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
          value={workspaceSlug}
          onChange={(e) => setWorkspaceSlug(e.target.value)}
          pattern="[a-z0-9][a-z0-9-]+[a-z0-9]"
          required
        />
      </Labeled>
      <Labeled label="Your name">
        <input
          type="text"
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          required
        />
      </Labeled>
      <Labeled label="Your email">
        <input
          type="email"
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          required
        />
      </Labeled>
      <Labeled label="First team (optional)">
        <input
          type="text"
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          value={firstTeamName}
          onChange={(e) => setFirstTeamName(e.target.value)}
        />
      </Labeled>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create workspace"}
      </Button>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </form>
  );
}

function Labeled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
