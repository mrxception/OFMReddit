"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Upload, FileText, Save, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DocumentCard } from "./document-card"

type Prompt = {
  id: number
  name: string
  prompt_text: string
  description: string
  documents: Document[]
}

type Document = {
  id: number
  filename: string
  originalFilename: string
  cloudinaryUrl: string
  fileType: string
  fileSize: number
  createdAt: string
}

type PromptsTabProps = {
  prompts: Prompt[]
  selectedPrompt: string
  onPromptChange: (promptName: string) => void
  onSave: (promptText: string) => Promise<void>
  onFileUpload: (files: FileList) => Promise<void>
  onDeleteDocument: (documentId: number) => Promise<void>
  isSaving: boolean
  uploadingFile: boolean
  showSavedSuccess: boolean
}

export function PromptsTab({
  prompts,
  selectedPrompt,
  onPromptChange,
  onSave,
  onFileUpload,
  onDeleteDocument,
  isSaving,
  uploadingFile,
  showSavedSuccess,
}: PromptsTabProps) {
  const [promptText, setPromptText] = useState("")
  const { toast } = useToast()

  const currentPrompt = prompts.find((p) => p.name === selectedPrompt)

  useEffect(() => {
    const prompt = prompts.find((p) => p.name === selectedPrompt)
    if (prompt) {
      setPromptText(prompt.prompt_text)
    }
  }, [prompts, selectedPrompt])

  const handlePromptChange = (promptName: string) => {
    onPromptChange(promptName)
    const prompt = prompts.find((p) => p.name === promptName)
    if (prompt) {
      setPromptText(prompt.prompt_text)
    }
  }

  const handleSave = async () => {
    if (!promptText.trim()) {
      toast({
        title: "Error",
        description: "Prompt text cannot be empty",
        variant: "destructive",
      })
      return
    }
    await onSave(promptText)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    await onFileUpload(files)
    event.target.value = ""
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Select Prompt</label>
        <select
          value={selectedPrompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
          disabled={isSaving || uploadingFile}
        >
          {prompts.map((prompt) => (
            <option key={prompt.name} value={prompt.name}>
              {prompt.name === "caption_generator" ? "Caption Generator" : "Image Analyzer"}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Instructions
          </label>
          <div className="flex items-center gap-2">
            {showSavedSuccess && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Saved successfully</span>
              </div>
            )}
            <Button onClick={handleSave} disabled={isSaving || uploadingFile} size="sm">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Prompt"}
            </Button>
          </div>
        </div>
        <Textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          className="min-h-[400px] font-mono text-sm"
          placeholder="Enter your prompt instructions here..."
          disabled={isSaving || uploadingFile}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Knowledge
          </label>
          <div>
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploadingFile || isSaving}
              multiple
            />
            <Button
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={uploadingFile || isSaving}
              size="sm"
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadingFile ? "Uploading..." : "Upload Documents"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentPrompt?.documents?.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onDelete={onDeleteDocument}
              disabled={isSaving || uploadingFile}
            />
          ))}
        </div>

        {(!currentPrompt?.documents || currentPrompt.documents.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No documents uploaded yet</p>
          </div>
        )}
      </div>
    </Card>
  )
}
