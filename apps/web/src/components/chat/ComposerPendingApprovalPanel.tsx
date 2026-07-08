import { memo } from "react";
import { type PendingApproval } from "../../session-logic";

interface ComposerPendingApprovalPanelProps {
  approval: PendingApproval;
  pendingCount: number;
  /** Docs workspaces phrase approvals in plain language for non-developers. */
  docsMode?: boolean;
}

function approvalSummaryText(requestKind: PendingApproval["requestKind"], docsMode: boolean) {
  if (docsMode) {
    switch (requestKind) {
      case "command":
        return "Claude wants to run a command on this computer";
      case "file-read":
        return "Claude wants to read a file";
      case "file-change":
        return "Claude wants to edit a file";
    }
  }
  switch (requestKind) {
    case "command":
      return "Command approval requested";
    case "file-read":
      return "File-read approval requested";
    case "file-change":
      return "File-change approval requested";
  }
}

export const ComposerPendingApprovalPanel = memo(function ComposerPendingApprovalPanel({
  approval,
  pendingCount,
  docsMode = false,
}: ComposerPendingApprovalPanelProps) {
  const approvalSummary = approvalSummaryText(approval.requestKind, docsMode);

  return (
    <div className="px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="uppercase text-sm tracking-[0.2em]">
          {docsMode ? "NEEDS YOUR OK" : "PENDING APPROVAL"}
        </span>
        <span className="text-sm font-medium">{approvalSummary}</span>
        {pendingCount > 1 ? (
          <span className="text-xs text-muted-foreground">1/{pendingCount}</span>
        ) : null}
      </div>
      {docsMode && approval.detail ? (
        <p
          className="mt-1.5 truncate font-mono text-xs text-muted-foreground"
          title={approval.detail}
        >
          {approval.detail}
        </p>
      ) : null}
    </div>
  );
});
