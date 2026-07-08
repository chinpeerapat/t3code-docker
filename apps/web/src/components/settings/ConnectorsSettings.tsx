import type { ProjectId, ProjectMcpConnector } from "@t3tools/contracts";
import { PlugIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";

import { usePrimaryEnvironmentId } from "../../state/environments";
import { useProjects } from "../../state/entities";
import { usePrimarySettings, useUpdatePrimarySettings } from "../../hooks/useSettings";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";

function newConnectorId(): string {
  return `connector-${Math.random().toString(36).slice(2, 10)}`;
}

type ConnectorMap = Readonly<Record<string, ReadonlyArray<ProjectMcpConnector>>>;

function withProjectConnectors(
  map: ConnectorMap,
  projectId: ProjectId,
  connectors: ReadonlyArray<ProjectMcpConnector>,
): ConnectorMap {
  const next = { ...map } as Record<string, ReadonlyArray<ProjectMcpConnector>>;
  if (connectors.length === 0) {
    delete next[projectId];
  } else {
    next[projectId] = connectors;
  }
  return next;
}

function ConnectorRow({
  connector,
  onChange,
  onRemove,
}: {
  connector: ProjectMcpConnector;
  onChange: (next: ProjectMcpConnector) => void;
  onRemove: () => void;
}) {
  const [authDraft, setAuthDraft] = useState<string | null>(null);
  const authPlaceholder = connector.authHeaderRedacted
    ? "Stored - enter a new value to replace"
    : "e.g. Bearer sk-...";

  return (
    <div className="rounded-lg border border-border/70 bg-card/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="h-8 w-40 text-xs"
          value={connector.name}
          placeholder="Name (e.g. notion)"
          onChange={(event) => onChange({ ...connector, name: event.target.value })}
        />
        <Input
          className="h-8 min-w-56 flex-1 text-xs"
          value={connector.url}
          placeholder="MCP server URL (https://...)"
          onChange={(event) => onChange({ ...connector, url: event.target.value })}
        />
        <div className="flex items-center gap-2">
          <Switch
            checked={connector.enabled}
            onCheckedChange={(checked) => onChange({ ...connector, enabled: Boolean(checked) })}
            aria-label="Connector enabled"
          />
          <Button size="xs" variant="ghost" onClick={onRemove} aria-label="Remove connector">
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="mt-2">
        <Input
          className="h-8 w-full text-xs"
          type="password"
          value={authDraft ?? ""}
          placeholder={authPlaceholder}
          onChange={(event) => {
            const value = event.target.value;
            setAuthDraft(value);
            onChange({
              ...connector,
              authHeader: value,
              // Typing a value replaces the stored secret; clearing the field
              // back to empty keeps the stored one.
              ...(value.length === 0 && connector.authHeaderRedacted
                ? { authHeaderRedacted: true }
                : {}),
            });
          }}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Optional Authorization header sent to the connector. Stored on this machine and never
          shown again.
        </p>
      </div>
    </div>
  );
}

export function ConnectorsSettingsPanel() {
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const projects = useProjects();
  const connectorMap = usePrimarySettings((settings) => settings.projectMcpConnectors);
  const updateSettings = useUpdatePrimarySettings();

  const primaryProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          primaryEnvironmentId === null || project.environmentId === primaryEnvironmentId,
      ),
    [primaryEnvironmentId, projects],
  );

  const setProjectConnectors = (
    projectId: ProjectId,
    connectors: ReadonlyArray<ProjectMcpConnector>,
  ) => {
    updateSettings({
      projectMcpConnectors: withProjectConnectors(connectorMap, projectId, connectors),
    });
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-5 py-6">
        <div className="mb-5">
          <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <PlugIcon className="size-4" />
            Connectors
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Connect external tools (MCP servers) to a project. The agent working in that project can
            use them - for example a Notion, calendar, or search connector. Currently applied to
            Claude sessions.
          </p>
        </div>
        {primaryProjects.length === 0 ? (
          <p className="text-xs text-muted-foreground">Add a project first.</p>
        ) : (
          <div className="space-y-6">
            {primaryProjects.map((project) => {
              const connectors = connectorMap[project.id] ?? [];
              return (
                <section key={project.id}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3
                      className="truncate text-xs font-medium text-foreground"
                      title={project.workspaceRoot}
                    >
                      {project.title}
                      {project.workspaceKind === "docs" ? (
                        <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                          docs
                        </span>
                      ) : null}
                    </h3>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        setProjectConnectors(project.id, [
                          ...connectors,
                          {
                            id: newConnectorId(),
                            name: `connector-${connectors.length + 1}`,
                            url: "",
                            authHeader: "",
                            enabled: true,
                          },
                        ])
                      }
                    >
                      <PlusIcon className="size-3.5" />
                      Add connector
                    </Button>
                  </div>
                  {connectors.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
                      No connectors for this project.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {connectors.map((connector) => (
                        <ConnectorRow
                          key={connector.id}
                          connector={connector}
                          onChange={(next) =>
                            setProjectConnectors(
                              project.id,
                              connectors.map((candidate) =>
                                candidate.id === connector.id ? next : candidate,
                              ),
                            )
                          }
                          onRemove={() =>
                            setProjectConnectors(
                              project.id,
                              connectors.filter((candidate) => candidate.id !== connector.id),
                            )
                          }
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
