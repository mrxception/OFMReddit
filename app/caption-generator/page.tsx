"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CaptionForm } from "@/components/caption-generator/caption-form"
import { PostsList } from "@/components/caption-generator/posts-list"
import { CaptionResults } from "@/components/caption-generator/caption-results"

export type Post = {
  id: string
  name: string
  captions?: Caption[]
}

export type Caption = {
  option: number
  text: string
}

export type FormData = {
  mode: "keywords" | "advanced"
  physicalFeatures: string
  gender: "female" | "male" | "trans"
  subredditType: "generalist" | "body-specific" | "kink-specific" | "aesthetic"
  visualContext: string
  degenScale: number
  captionMood: string
  rules: string
  creativeStyle: string
  isInteractive: false
  subredditName: string
  contentType: string
}

export default function CaptionGeneratorPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedPostId, setSelectedPostId] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiMessage, setAiMessage] = useState<string>(
    "Ready to generate seductive captions! Fill out the form to get started.",
  )

  const selectedPost = posts.find((p) => p.id === selectedPostId)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    const fetchPosts = async () => {
      try {
        console.log("Fetching posts...")
        const response = await fetch("/api/posts", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("Failed to fetch posts:", response.status, errorData)
          throw new Error(errorData.error || `Failed to fetch posts (${response.status})`)
        }

        const data = await response.json()
        console.log("Fetched posts:", data.posts)

        if (!data.posts || data.posts.length === 0) {
          console.log("No posts found, creating default post...")
          await createDefaultPost(token)
          return
        }

        const sortedPosts = [...data.posts].sort((a, b) => parseInt(a.id) - parseInt(b.id))
        setPosts(sortedPosts)
        if (sortedPosts.length > 0) {
          setSelectedPostId(sortedPosts[0].id)
        }
      } catch (error: any) {
        console.error("Error fetching posts:", error)
        setError(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    const createDefaultPost = async (token: string) => {
      try {
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: "Post 1" }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const data = await response.json()
        console.log("Created default post:", data.post)
        setPosts([data.post])
        setSelectedPostId(data.post.id)
      } catch (error: any) {
        console.error("Error creating default post:", error)
        setError(error.message)
      }
    }

    fetchPosts()
  }, [router])

  const handleAddPost = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const newPostName = `Post ${posts.length + 1}`
      console.log("Creating new post:", newPostName)
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newPostName }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("Created post:", data.post)
      const updatedPosts = [...posts, data.post].sort((a, b) => parseInt(a.id) - parseInt(b.id))
      setPosts(updatedPosts)
      setSelectedPostId(data.post.id)
      setError(null)
    } catch (error: any) {
      console.error("Error creating post:", error)
      setError(error.message)
    }
  }

  const handleGenerateCaptions = async (formData: FormData) => {
    const token = localStorage.getItem("token")
    if (!token) return

    setIsGenerating(true)
    setError(null)
    setAiMessage("Processing your request... Crafting some steamy captions for you!")
    try {
      const response = await fetch("/api/caption-generator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, postId: selectedPostId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      if (!data.captions) {
        throw new Error("No captions returned from server")
      }

      setPosts(posts.map((post) => (post.id === selectedPostId ? { ...post, captions: data.captions } : post)))
      setAiMessage("Captions generated! Check them out on the right.")
    } catch (error: any) {
      setError(error.message || "Failed to generate captions. Please try again.")
      setAiMessage("Oops, something went wrong. Try adjusting your inputs and generating again!")
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p>Loading posts...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex flex-col lg:grid lg:grid-cols-[240px_1fr_560px] gap-0 min-h-[calc(100vh-73px)]">
        <div className="lg:border-r lg:border-border">
          <PostsList
            posts={posts}
            selectedPostId={selectedPostId}
            onSelectPost={setSelectedPostId}
            onAddPost={handleAddPost}
            onReorderPosts={setPosts}
          />
        </div>

        <div className="lg:border-r lg:border-border overflow-y-auto">
          <div className="p-4 md:p-6">
            {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

            <div className="mb-6 p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg border border-border">
              <div className="flex items-center justify-center gap-3 flex-col text-center">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  AI
                </div>
                <p className="text-sm text-foreground leading-relaxed">{aiMessage}</p>
              </div>
            </div>

            <CaptionForm
              key={selectedPostId}
              onGenerate={handleGenerateCaptions}
              isGenerating={isGenerating}
              error={error}
            />
          </div>
        </div>

        <div className="overflow-y-auto">
          <CaptionResults posts={posts} selectedPostId={selectedPostId} />
        </div>
      </div>
    </div>
  )
}