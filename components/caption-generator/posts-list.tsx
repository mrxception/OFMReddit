"use client"

import { Button } from "@/components/ui/button"
import { Plus, ChevronRight, GripVertical } from "lucide-react"
import type { Post } from "@/app/caption-generator/page"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type PostsListProps = {
  posts: Post[]
  selectedPostId: string
  onSelectPost: (id: string) => void
  onAddPost: () => void
  onReorderPosts: (posts: Post[]) => void
}

function SortablePostItem({
  post,
  isSelected,
  onSelect,
}: {
  post: Post
  isSelected: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: post.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <button
        onClick={onSelect}
        className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
          isSelected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
        }`}
      >
        <div className="flex items-center gap-2 flex-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <span className="text-sm">{post.name}</span>
        </div>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

export function PostsList({ posts, selectedPostId, onSelectPost, onAddPost, onReorderPosts }: PostsListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = posts.findIndex((post) => post.id === active.id)
      const newIndex = posts.findIndex((post) => post.id === over.id)
      const reorderedPosts = arrayMove(posts, oldIndex, newIndex)
      onReorderPosts(reorderedPosts)
    }
  }

  return (
    <div className="bg-card border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-sm text-muted-foreground mb-3">
          {posts.find((p) => p.id === selectedPostId)?.name || "Select Post"}
        </h2>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={posts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            {posts.map((post) => (
              <SortablePostItem
                key={post.id}
                post={post}
                isSelected={post.id === selectedPostId}
                onSelect={() => onSelectPost(post.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <div className="p-4 border-t border-border mt-auto">
        <Button onClick={onAddPost} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Add New Post
        </Button>
      </div>
    </div>
  )
}
