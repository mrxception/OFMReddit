"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { FormData } from "@/app/caption-generator/page"

type CaptionFormProps = {
  onGenerate: (data: FormData) => void
  isGenerating: boolean
  error?: string | null
}

export function CaptionForm({ onGenerate, isGenerating, error }: CaptionFormProps) {
  const [formData, setFormData] = useState<FormData>({
    mode: "advanced",
    physicalFeatures: "",
    gender: "female",
    subredditType: "generalist",
    visualContext: "",
    degenScale: 2,
    captionMood: "",
    rules: "",
    creativeStyle: "",
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  useEffect(() => {
    const savedFeatures = localStorage.getItem("creatorFeatures")
    if (savedFeatures) {
      try {
        const { physicalFeatures, gender } = JSON.parse(savedFeatures)
        setFormData((prev) => ({
          ...prev,
          physicalFeatures: physicalFeatures || prev.physicalFeatures,
          gender: gender || prev.gender,
        }))
      } catch (error) {
        console.error("[v0] Failed to load creator features:", error)
      }
    }
  }, [])

  useEffect(() => {
    const creatorFeatures = {
      physicalFeatures: formData.physicalFeatures,
      gender: formData.gender,
    }
    localStorage.setItem("creatorFeatures", JSON.stringify(creatorFeatures))
  }, [formData.physicalFeatures, formData.gender])

  useEffect(() => {
    const errors: Partial<Record<keyof FormData, string>> = {}
    if (!formData.gender) {
      errors.gender = "Gender is required"
    }
    setFormErrors(errors)
    console.log("CaptionForm formData:", formData, "formErrors:", errors)
  }, [formData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (Object.keys(formErrors).length > 0) {
      console.log("Validation failed:", formErrors)
      return
    }
    onGenerate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof FormData) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
      {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

      <div className="space-y-2">
        <Label className="text-foreground text-lg">Mode</Label>
        <Tabs
          value={formData.mode}
          onValueChange={(v) => setFormData((prev) => ({ ...prev, mode: v as "keywords" | "advanced" }))}
        >
          <TabsList className="grid w-full grid-cols-2 bg-muted">
            <TabsTrigger
              value="keywords"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Keywords Mode
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Advanced Mode
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="border-2 border-border rounded-lg p-5 bg-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Creator Features</h3>
        <div className={formData.mode === "keywords" ? "space-y-4" : "grid grid-cols-[1fr_auto] gap-4 items-start"}>
          <div className="space-y-2">
            <Label htmlFor="features" className="text-foreground">
              {formData.mode === "keywords" ? "Keywords" : "Niche/Physical Features"}
            </Label>
            {formData.mode === "keywords" ? (
              <Textarea
                id="features"
                placeholder="e.g., blonde, athletic, lingerie, bedroom"
                value={formData.physicalFeatures}
                onChange={(e) => handleChange(e, "physicalFeatures")}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground min-h-[80px]"
                disabled={isGenerating}
              />
            ) : (
              <Input
                id="features"
                placeholder="e.g., blonde hair, athletic build, curvy"
                value={formData.physicalFeatures}
                onChange={(e) => handleChange(e, "physicalFeatures")}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                disabled={isGenerating}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Gender</Label>
            <RadioGroup
              value={formData.gender}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, gender: v as "female" | "male" | "trans" }))}
              className="flex gap-4"
              disabled={isGenerating}
            >
              {(["female", "male", "trans"] as const).map((value: "female" | "male" | "trans") => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value} id={value} className="border-border" />
                  <Label htmlFor={value} className="text-foreground font-normal cursor-pointer">
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {formErrors.gender && <p className="text-red-500 text-sm">{formErrors.gender}</p>}
          </div>
        </div>
      </div>

      <div className="space-y-3 border border-border rounded-lg p-4 max-w-xs mx-auto">
        <Label className="text-foreground text-lg">Degen Scale</Label>
        <div className="space-y-2">
          <Slider
            value={[formData.degenScale]}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, degenScale: value[0] }))}
            min={1}
            max={3}
            step={1}
            className="w-full"
            disabled={isGenerating}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Suggestive</span>
            <span>Direct</span>
            <span>Explicit</span>
          </div>
        </div>
      </div>

      {formData.mode === "advanced" && (
        <>
          <div className="space-y-3">
            <Label className="text-foreground text-lg">Creative Style</Label>
            <RadioGroup
              value={formData.creativeStyle}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, creativeStyle: v }))}
              className="flex space-y-2"
              disabled={isGenerating}
            >
              {(
                [
                  { value: "grounded", label: "Grounded Scenario" },
                  { value: "fantasy", label: "Fantasy / Roleplay" },
                  { value: "kink", label: "Kink-Specific" },
                ] as const
              ).map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`style-${option.value}`} className="border-border" />
                  <Label htmlFor={`style-${option.value}`} className="text-foreground font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-foreground text-lg">Subreddit Type</Label>
            <div className="grid grid-cols-2 gap-5">
              {(
                [
                  { value: "generalist", label: "Generalist Megahub" },
                  { value: "body-specific", label: "Body/Attribute Specific" },
                  { value: "kink-specific", label: "Kink/Activity Specific" },
                  { value: "aesthetic", label: "Aesthetic/Subculture" },
                ] as const
              ).map((option: { value: string; label: string }) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      subredditType: option.value as "generalist" | "body-specific" | "kink-specific" | "aesthetic",
                    }))
                  }
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${formData.subredditType === option.value
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-muted-foreground"
                    }`}
                  disabled={isGenerating}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.subredditType === option.value ? "border-primary" : "border-border"
                        }`}
                    >
                      {formData.subredditType === option.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="text-sm">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="context" className="text-foreground text-lg">
              Visual Context
            </Label>
            <Textarea
              id="context"
              placeholder="e.g., cozy bedroom, beach at sunset, gym workout"
              value={formData.visualContext}
              onChange={(e) => handleChange(e, "visualContext")}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground min-h-[80px]"
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mood" className="text-foreground text-lg">
              Caption Mood
            </Label>
            <Input
              id="mood"
              placeholder="e.g., playful, seductive, confident, shy"
              value={formData.captionMood}
              onChange={(e) => handleChange(e, "captionMood")}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rules" className="text-foreground text-lg">
              Rules
            </Label>
            <Input
              id="rules"
              placeholder="e.g., include [F], no explicit words, max 50 characters"
              value={formData.rules}
              onChange={(e) => handleChange(e, "rules")}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              disabled={isGenerating}
            />
          </div>
        </>
      )}

      <Button
        type="submit"
        disabled={isGenerating || Object.keys(formErrors).length > 0}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base font-semibold disabled:opacity-50"
      >
        {isGenerating ? "Generating..." : "Generate Captions"}
      </Button>
    </form>
  )
}