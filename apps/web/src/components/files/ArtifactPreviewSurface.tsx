import type { AssetCreateUrlResult, AssetResource, EnvironmentId } from "@t3tools/contracts";
import type { AtomCommandResult } from "@t3tools/client-runtime/state/runtime";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import {
  isWorkspaceDocumentPreviewPath,
  isWorkspaceImagePreviewPath,
} from "@t3tools/shared/filePreview";
import type { ThreadId } from "@t3tools/contracts";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { resolveAssetUrl } from "~/assets/assetUrls";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "~/lib/utils";

export type ArtifactPreviewKind = "pdf" | "image" | "docx" | "xlsx";

export function resolveArtifactPreviewKind(path: string): ArtifactPreviewKind | null {
  const cleanPath = path.split(/[?#]/, 1)[0]?.toLowerCase() ?? "";
  if (cleanPath.endsWith(".pdf")) return "pdf";
  if (isWorkspaceImagePreviewPath(cleanPath)) return "image";
  if (!isWorkspaceDocumentPreviewPath(cleanPath)) return null;
  return cleanPath.endsWith(".docx") ? "docx" : "xlsx";
}

const XLSX_MAX_ROWS = 1000;
const XLSX_MAX_COLUMNS = 60;

interface SheetPreview {
  readonly name: string;
  readonly rows: ReadonlyArray<ReadonlyArray<string>>;
  readonly truncated: boolean;
}

type ArtifactPreviewState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "url"; readonly url: string }
  | { readonly status: "docx"; readonly html: string }
  | { readonly status: "xlsx"; readonly sheets: ReadonlyArray<SheetPreview> };

export type CreateAssetUrl = (input: {
  readonly environmentId: EnvironmentId;
  readonly input: { readonly resource: AssetResource };
}) => Promise<AtomCommandResult<AssetCreateUrlResult, unknown>>;

interface ArtifactPreviewSurfaceProps {
  kind: ArtifactPreviewKind;
  environmentId: EnvironmentId;
  threadId: ThreadId;
  absolutePath: string;
  fileName: string;
  httpBaseUrl: string | null;
  createAssetUrl: CreateAssetUrl;
}

async function renderDocxHtml(bytes: ArrayBuffer): Promise<string> {
  const [mammoth, dompurify] = await Promise.all([import("mammoth"), import("dompurify")]);
  const converted = await mammoth.convertToHtml({ arrayBuffer: bytes });
  return dompurify.default.sanitize(converted.value, { USE_PROFILES: { html: true } });
}

async function renderXlsxSheets(bytes: ArrayBuffer): Promise<ReadonlyArray<SheetPreview>> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(bytes, { type: "array" });
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const allRows = sheet
      ? (XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: false,
          defval: "",
        }) as string[][])
      : [];
    const truncated =
      allRows.length > XLSX_MAX_ROWS || allRows.some((row) => row.length > XLSX_MAX_COLUMNS);
    const rows = allRows
      .slice(0, XLSX_MAX_ROWS)
      .map((row) => row.slice(0, XLSX_MAX_COLUMNS).map((cell) => String(cell ?? "")));
    return { name, rows, truncated };
  });
}

export default function ArtifactPreviewSurface({
  kind,
  environmentId,
  threadId,
  absolutePath,
  fileName,
  httpBaseUrl,
  createAssetUrl,
}: ArtifactPreviewSurfaceProps) {
  const [state, setState] = useState<ArtifactPreviewState>({ status: "loading" });
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    setActiveSheetIndex(0);
    if (!httpBaseUrl) {
      setState({ status: "error", message: "The environment is not reachable over HTTP." });
      return;
    }
    void (async () => {
      const assetResult = await createAssetUrl({
        environmentId,
        input: {
          resource: { _tag: "workspace-file", threadId, path: absolutePath },
        },
      });
      if (cancelled) return;
      if (assetResult._tag === "Failure") {
        const error = squashAtomCommandFailure(assetResult);
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to load the file.",
        });
        return;
      }
      const assetUrl = resolveAssetUrl(httpBaseUrl, assetResult.value.relativeUrl);
      if (assetUrl === null) {
        setState({ status: "error", message: "The environment returned an invalid asset URL." });
        return;
      }
      if (kind === "pdf" || kind === "image") {
        setState({ status: "url", url: assetUrl });
        return;
      }
      try {
        const response = await fetch(assetUrl);
        if (!response.ok) {
          throw new Error(`Failed to load the file (HTTP ${response.status}).`);
        }
        const bytes = await response.arrayBuffer();
        if (cancelled) return;
        if (kind === "docx") {
          const html = await renderDocxHtml(bytes);
          if (!cancelled) setState({ status: "docx", html });
          return;
        }
        const sheets = await renderXlsxSheets(bytes);
        if (!cancelled) setState({ status: "xlsx", sheets });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Failed to render the file.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [absolutePath, createAssetUrl, environmentId, httpBaseUrl, kind, threadId]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-xs leading-relaxed text-destructive">
        {state.message}
      </div>
    );
  }

  if (state.status === "url" && kind === "pdf") {
    return (
      <iframe src={state.url} title={fileName} className="min-h-0 flex-1 border-0 bg-background" />
    );
  }

  if (state.status === "url") {
    return (
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-h-full items-center justify-center p-6">
          <img
            src={state.url}
            alt={fileName}
            className="max-h-full max-w-full rounded-md border border-border/60 object-contain"
          />
        </div>
      </ScrollArea>
    );
  }

  if (state.status === "docx") {
    return (
      <ScrollArea className="min-h-0 flex-1">
        <div
          className="chat-markdown mx-auto max-w-4xl px-6 py-5 text-sm leading-relaxed"
          // Mammoth output is sanitized with DOMPurify before it reaches here.
          dangerouslySetInnerHTML={{ __html: state.html }}
        />
      </ScrollArea>
    );
  }

  const sheets = state.sheets;
  const activeSheet = sheets[Math.min(activeSheetIndex, Math.max(sheets.length - 1, 0))];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {sheets.length > 1 ? (
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2 py-1">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              type="button"
              onClick={() => setActiveSheetIndex(index)}
              className={cn(
                "shrink-0 rounded-md px-2 py-0.5 text-xs",
                index === activeSheetIndex
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      ) : null}
      {activeSheet?.truncated ? (
        <div className="shrink-0 border-b border-amber-500/20 bg-amber-500/8 px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
          Preview limited to the first {XLSX_MAX_ROWS.toLocaleString()} rows and {XLSX_MAX_COLUMNS}{" "}
          columns.
        </div>
      ) : null}
      <ScrollArea className="min-h-0 flex-1">
        {activeSheet && activeSheet.rows.length > 0 ? (
          <table className="w-max min-w-full border-collapse text-xs">
            <tbody>
              {activeSheet.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? "bg-accent/40" : undefined}>
                  <td className="sticky left-0 border border-border/60 bg-background px-2 py-1 text-right text-muted-foreground select-none">
                    {rowIndex + 1}
                  </td>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={cn(
                        "max-w-80 truncate border border-border/60 px-2 py-1 align-top",
                        rowIndex === 0 && "font-medium",
                      )}
                      title={cell}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex min-h-32 items-center justify-center text-xs text-muted-foreground">
            This sheet is empty.
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
