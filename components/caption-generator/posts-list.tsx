"use client"

import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import type { Post } from "@/app/caption-generator/page"

type PostsListProps = {
  posts: Post[]
  selectedPostId: string
  onSelectPost: (id: string) => void
  onAddPost: () => void
  onRemovePost: (id: string) => void
}

export function PostsList({ posts, selectedPostId, onSelectPost, onAddPost, onRemovePost }: PostsListProps) {
  return (
    <div className="bg-card border-r border-border flex flex-col h-full">
      <div className="flex flex-col overflow-y-auto">
        {posts.map((post) => (
          <div key={post.id} className="relative group">
            <div
              onClick={() => onSelectPost(post.id)}
              className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors cursor-pointer ${
                post.id === selectedPostId
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="text-sm">{post.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemovePost(post.id)
                }}
                className={`p-1 rounded hover:bg-destructive/20 transition-colors ${
                  post.id === selectedPostId ? "text-primary-foreground" : "text-muted-foreground"
                }`}
                aria-label="Remove post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border">
        <Button onClick={onAddPost} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Add New Post
        </Button>
      </div>
    </div>
  )
}
