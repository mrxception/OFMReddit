"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileText, Trash2 } from "lucide-react"

type Document = {
  id: number
  filename: string
  originalFilename: string
  cloudinaryUrl: string
  fileType: string
  fileSize: number
  createdAt: string
}

type DocumentCardProps = {
  document: Document
  onDelete: (documentId: number) => Promise<void>
  disabled: boolean
}

export function DocumentCard({ document, onDelete, disabled }: DocumentCardProps) {
  return (
    <Card className="p-4 bg-muted/50">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{document.originalFilename}</p>
            <p className="text-xs text-muted-foreground">{document.fileType.includes("pdf") ? "PDF" : "DOCX"}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(document.id)}
          className="text-destructive hover:text-destructive"
          disabled={disabled}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <a
        href={document.cloudinaryUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline"
      >
        View Document
      </a>
    </Card>
  )
}
