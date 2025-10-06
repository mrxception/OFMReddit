"use client"

import { Copy, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import type { Post } from "@/app/caption-generator/page"

type CaptionResultsProps = {
  posts: Post[]
  selectedPostId: string
  onClearCaptions: () => void
}

export function CaptionResults({ posts, selectedPostId, onClearCaptions }: CaptionResultsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const selectedPost = posts.find((p) => p.id === selectedPostId)
  const captions = selectedPost?.captions || []

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="bg-card overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Generated Captions</h2>
          <Button
            onClick={onClearCaptions}
            disabled={captions.length === 0}
            variant="outline"
            size="sm"
            className={`${captions.length === 0 ? "opacity-50 cursor-not-allowed bg-gray-300 text-gray-500" : "hover:bg-destructive hover:text-destructive-foreground"}`}
          >
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>

        {captions.length > 0 ? (
          <div className="space-y-3">
            {captions.map((caption: { option: number; text: string }) => {
              const captionId = `${selectedPostId}-${caption.option}`
              const isCopied = copiedId === captionId

              return (
                <div
                  key={caption.option}
                  className="bg-gradient-to-br from-primary/20 to-primary/10 text-foreground rounded-lg p-4 relative border border-border"
                >
                  <button
                    onClick={() => handleCopy(caption.text, captionId)}
                    className="absolute top-3 right-3 p-1.5 rounded-md bg-background/50 hover:bg-background/80 transition-colors"
                    aria-label="Copy caption"
                  >
                    {isCopied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-primary" />
                    )}
                  </button>

                  <p className="text-sm leading-relaxed pr-8">{caption.text}</p>

                  <Button
                    onClick={() => handleCopy(caption.text, captionId)}
                    size="sm"
                    className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                  >
                    {isCopied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-sm">No captions generated yet.</p>
            <p className="text-xs mt-2">Fill out the form and click Generate.</p>
          </div>
        )}
      </div>
    </div>
  )
}
