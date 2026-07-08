import { BarChart3Icon, FileTextIcon, PresentationIcon, SearchIcon } from "lucide-react";
import type { ComponentType } from "react";

import { cn } from "~/lib/utils";

export interface DocsTemplate {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: ComponentType<{ className?: string }>;
  readonly prompt: string;
  /** When true the composer keeps focus at the end so the user finishes the sentence. */
  readonly needsInput: boolean;
}

export const DOCS_TEMPLATES: ReadonlyArray<DocsTemplate> = [
  {
    id: "research-report",
    title: "Research report",
    description: "Research a topic and write it up as a document",
    icon: SearchIcon,
    prompt:
      "Research the topic below and write a well-structured report. Save it as a markdown file in this folder, and if document tooling is available also produce a .docx version.\n\nTopic: ",
    needsInput: true,
  },
  {
    id: "slide-deck",
    title: "Slide deck",
    description: "Turn a topic into a presentation",
    icon: PresentationIcon,
    prompt:
      "Create a presentation on the topic below. Start with a short outline for my review, then produce the deck (a .pptx if tooling is available, otherwise a clean HTML slide deck saved in this folder).\n\nTopic: ",
    needsInput: true,
  },
  {
    id: "data-cleanup",
    title: "Data cleanup",
    description: "Tidy up spreadsheets or CSV files in this folder",
    icon: BarChart3Icon,
    prompt:
      "Look at the spreadsheet and CSV files in this folder. Clean the data — remove duplicates, normalize dates and number formats, fix obvious typos — and save the result as a new .xlsx file. Finish with a short summary of what you changed.",
    needsInput: false,
  },
  {
    id: "draft-document",
    title: "Draft a document",
    description: "Write a letter, memo, or any document",
    icon: FileTextIcon,
    prompt:
      "Draft the document described below and save it in this folder (as .docx if tooling is available, otherwise markdown). Show me a short outline first, then write the full text.\n\nDocument: ",
    needsInput: true,
  },
];

export function DocsTemplateLauncher({
  className,
  onPick,
}: {
  className?: string;
  onPick: (template: DocsTemplate) => void;
}) {
  return (
    <div className={cn("w-full max-w-2xl", className)}>
      <div className="mb-4 text-center">
        <h3 className="text-sm font-medium text-foreground">What are we working on?</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick a starting point, or just describe what you need below.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {DOCS_TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onPick(template)}
              className="flex flex-col items-start rounded-lg border border-border/70 bg-card/45 p-3.5 text-left transition-colors hover:border-border hover:bg-card"
            >
              <Icon className="mb-2.5 size-4.5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{template.title}</span>
              <span className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {template.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
