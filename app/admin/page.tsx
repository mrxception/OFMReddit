"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileText, Trash2, Users, Copy, Save, Ban, UserX } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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

type User = {
  id: number
  email: string
  is_admin: boolean
  email_verified: boolean
  created_at: string
  post_count: number
  copied_count: number
  banned_id: number | null
  ban_reason: string | null
  banned_at: string | null
}

type CopiedCaption = {
  id: number
  caption_text: string
  copied_at: string
  user_email: string
  post_name: string
}

export default function AdminPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [copiedCaptions, setCopiedCaptions] = useState<CopiedCaption[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<string>("caption_generator")
  const [promptText, setPromptText] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")
    console.log(" Admin Page - Token exists:", !!token)
    console.log(" Admin Page - User data:", userData)
    if (userData) {
      const parsedUser = JSON.parse(userData)
      console.log(" Admin Page - Parsed user:", parsedUser)
      console.log(" Admin Page - isAdmin value:", parsedUser.isAdmin)
    }

    if (!token) {
      router.push("/login")
      return
    }

    fetchData()
  }, [router])

  const fetchData = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const [promptsRes, usersRes, captionsRes] = await Promise.all([
        fetch("/api/admin/prompts", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/copied-captions", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (!promptsRes.ok || !usersRes.ok || !captionsRes.ok) {
        if (promptsRes.status === 403 || usersRes.status === 403 || captionsRes.status === 403) {
          toast({
            title: "Access Denied",
            description: "You don't have admin privileges",
            variant: "destructive",
          })
          router.push("/")
          return
        }
        throw new Error("Failed to fetch data")
      }

      const promptsData = await promptsRes.json()
      const usersData = await usersRes.json()
      const captionsData = await captionsRes.json()

      setPrompts(promptsData.prompts)
      setUsers(usersData.users)
      setCopiedCaptions(captionsData.copiedCaptions)

      
      const captionPrompt = promptsData.prompts.find((p: Prompt) => p.name === "caption_generator")
      if (captionPrompt) {
        setPromptText(captionPrompt.prompt_text)
      }
    } catch (error: any) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePromptChange = (promptName: string) => {
    setSelectedPrompt(promptName)
    const prompt = prompts.find((p) => p.name === promptName)
    if (prompt) {
      setPromptText(prompt.prompt_text)
    }
  }

  const handleSavePrompt = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    setIsSaving(true)
    try {
      const response = await fetch("/api/admin/prompts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: selectedPrompt,
          promptText,
        }),
      })

      if (!response.ok) throw new Error("Failed to save prompt")

      toast({
        title: "Success",
        description: "Prompt saved successfully",
      })

      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const token = localStorage.getItem("token")
    if (!token) return

    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("promptName", selectedPrompt)

      const response = await fetch("/api/admin/documents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to upload document")
      }

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      })

      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setUploadingFile(false)
      event.target.value = ""
    }
  }

  const handleDeleteDocument = async (documentId: number) => {
    const token = localStorage.getItem("token")
    if (!token) return

    if (!confirm("Are you sure you want to delete this document?")) return

    try {
      const response = await fetch(`/api/admin/documents?id=${documentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error("Failed to delete document")

      toast({
        title: "Success",
        description: "Document deleted successfully",
      })

      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleBanUser = async (userId: number, currentlyBanned: boolean) => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      if (currentlyBanned) {
        const response = await fetch(`/api/admin/users/ban?id=${userId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) throw new Error("Failed to unban user")

        toast({
          title: "Success",
          description: "User unbanned successfully",
        })
      } else {
        const reason = prompt("Enter ban reason (optional):")

        const response = await fetch("/api/admin/users/ban", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId, reason }),
        })

        if (!response.ok) throw new Error("Failed to ban user")

        toast({
          title: "Success",
          description: "User banned successfully",
        })
      }

      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId: number) => {
    const token = localStorage.getItem("token")
    if (!token) return

    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error("Failed to delete user")

      toast({
        title: "Success",
        description: "User deleted successfully",
      })

      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex items-center justify-center gap-3 flex-col text-center">
          <div className="relative">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-primary-foreground bg-primary animate-bounce">
              <Users className="w-6 h-6" />
            </div>
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentPrompt = prompts.find((p) => p.name === selectedPrompt)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">Manage prompts, documents, users, and analytics</p>
        </div>

        <Tabs defaultValue="prompts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="prompts">Prompts & Docs</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="analytics">Copied Captions</TabsTrigger>
          </TabsList>

          <TabsContent value="prompts" className="space-y-6">
            <Card className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Select Prompt</label>
                <select
                  value={selectedPrompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
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
                  <Button onClick={handleSavePrompt} disabled={isSaving} size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Prompt"}
                  </Button>
                </div>
                <Textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Enter your prompt instructions here..."
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
                      disabled={uploadingFile}
                    />
                    <Button
                      onClick={() => document.getElementById("file-upload")?.click()}
                      disabled={uploadingFile}
                      size="sm"
                      variant="outline"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingFile ? "Uploading..." : "Upload Document"}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {currentPrompt?.documents?.map((doc) => (
                    <Card key={doc.id} className="p-4 bg-muted/50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center">
                            <FileText className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.originalFilename}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.fileType.includes("pdf") ? "PDF" : "DOCX"}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <a
                        href={doc.cloudinaryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View Document
                      </a>
                    </Card>
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
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5" />
                <h2 className="text-xl font-semibold">User Management</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-sm font-medium">Email</th>
                      <th className="text-left p-3 text-sm font-medium">Posts</th>
                      <th className="text-left p-3 text-sm font-medium">Copied</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                      <th className="text-left p-3 text-sm font-medium">Joined</th>
                      <th className="text-right p-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                        <td className="p-3">
                          <div>
                            <p className="text-sm font-medium">{user.email}</p>
                            {user.is_admin ? (
                              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Admin</span>
                            ) : (
                                <></>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm">{user.post_count}</td>
                        <td className="p-3 text-sm">{user.copied_count}</td>
                        <td className="p-3">
                          {user.banned_id ? (
                            <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded">Banned</span>
                          ) : (
                            <span className="text-xs bg-green-500/20 text-green-600 px-2 py-1 rounded">Active</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleBanUser(user.id, !!user.banned_id)}
                              disabled={user.is_admin}
                            >
                              {user.banned_id ? (
                                <>
                                  <UserX className="w-4 h-4 mr-1" />
                                  Unban
                                </>
                              ) : (
                                <>
                                  <Ban className="w-4 h-4 mr-1" />
                                  Ban
                                </>
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={user.is_admin}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Copy className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Copied Captions</h2>
              </div>

              <div className="space-y-3">
                {copiedCaptions.map((caption) => (
                  <Card key={caption.id} className="p-4 bg-muted/50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">{caption.user_email}</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Post: {caption.post_name} • {new Date(caption.copied_at).toLocaleString()}
                        </p>
                        <p className="text-sm bg-background p-3 rounded border border-border">{caption.caption_text}</p>
                      </div>
                    </div>
                  </Card>
                ))}

                {copiedCaptions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Copy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No captions copied yet</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
