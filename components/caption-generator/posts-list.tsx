"use client"

import { Button } from "@/components/ui/button"
import { Plus, ChevronRight } from "lucide-react"
import type { Post } from "@/app/caption-generator/page"

type PostsListProps = {
  posts: Post[]
  selectedPostId: string
  onSelectPost: (id: string) => void
  onAddPost: () => void
}

export function PostsList({ posts, selectedPostId, onSelectPost, onAddPost }: PostsListProps) {
  return (
    <div className="bg-card border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-sm text-muted-foreground mb-3">
          {posts.find((p) => p.id === selectedPostId)?.name || "Select Post"}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {posts.map((post) => (
          <button
            key={post.id}
            onClick={() => onSelectPost(post.id)}
            className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
              post.id === selectedPostId ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="text-sm">{post.name}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
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
