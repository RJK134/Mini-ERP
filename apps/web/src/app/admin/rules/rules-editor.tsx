"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ops-hub/ui";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export interface RuleRow {
  id: string;
  name: string;
  isActive: boolean;
  conditions: { serviceType?: string; priority?: string };
  actions: { assignTeamId?: string; assignUserId?: string };
}

export function RulesEditor({
  initial,
  users,
  teams,
}: {
  initial: RuleRow[];
  users: { id: string; name: string }[];
  teams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<RuleRow[]>(initial);
  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [priority, setPriority] = useState("");
  const [teamId, setTeamId] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setError(null);
    if (!name.trim()) return setError("name required");
    const conditions: RuleRow["conditions"] = {};
    if (serviceType) conditions.serviceType = serviceType;
    if (priority) conditions.priority = priority;
    const actions: RuleRow["actions"] = {};
    if (teamId) actions.assignTeamId = teamId;
    if (userId) actions.assignUserId = userId;

    const res = await fetch("/api/workflow-rules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), conditions, actions }),
    });
    if (!res.ok) {
      setError((await res.json())?.error ?? "create failed");
      return;
    }
    const json = (await res.json()) as { rule: RuleRow };
    setRows((r) => [...r, json.rule]);
    setName("");
    setServiceType("");
    setPriority("");
    setTeamId("");
    setUserId("");
    router.refresh();
  }

  async function toggle(id: string, isActive: boolean) {
    const res = await fetch(`/api/workflow-rules/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (res.ok) {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, isActive } : r)));
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/workflow-rules/${id}`, { method: "DELETE" });
    if (res.ok) setRows((rs) => rs.filter((r) => r.id !== id));
  }

  return (
    <div>
      {rows.length === 0 ? (
        <div className="mb-4 text-sm text-slate-500">No rules yet.</div>
      ) : (
        <ul className="mb-4 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    if {formatConditions(r.conditions)} → {formatActions(r.actions, users, teams)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={r.isActive}
                      onChange={(e) => toggle(r.id, e.target.checked)}
                    />
                    active
                  </label>
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>✕</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded border border-slate-200 bg-slate-50 p-3">
        <h3 className="mb-2 text-sm font-medium">New rule</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <input
            type="text"
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
            placeholder="rule name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
            placeholder="condition: serviceType (e.g. leak_repair)"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
          />
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">condition: priority — any</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>priority = {p.toLowerCase()}</option>)}
          </select>
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
          >
            <option value="">action: assign team — none</option>
            {teams.map((t) => <option key={t.id} value={t.id}>assign team = {t.name}</option>)}
          </select>
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">action: assign user — none</option>
            {users.map((u) => <option key={u.id} value={u.id}>assign user = {u.name}</option>)}
          </select>
        </div>
        <div className="mt-2">
          <Button size="sm" onClick={create}>Add rule</Button>
          {error && <span className="ml-3 text-sm text-red-600">{error}</span>}
        </div>
      </div>
    </div>
  );
}

function formatConditions(c: RuleRow["conditions"]): string {
  const parts: string[] = [];
  if (c.serviceType) parts.push(`serviceType = ${c.serviceType}`);
  if (c.priority) parts.push(`priority = ${c.priority.toLowerCase()}`);
  return parts.length ? parts.join(" AND ") : "anything";
}

function formatActions(
  a: RuleRow["actions"],
  users: { id: string; name: string }[],
  teams: { id: string; name: string }[],
): string {
  const parts: string[] = [];
  if (a.assignTeamId) parts.push(`team ${teams.find((t) => t.id === a.assignTeamId)?.name ?? a.assignTeamId}`);
  if (a.assignUserId) parts.push(`user ${users.find((u) => u.id === a.assignUserId)?.name ?? a.assignUserId}`);
  return parts.length ? `assign ${parts.join(" + ")}` : "no action";
}
