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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
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
    isInteractive: false,
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

  const handleToggleInteractive = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isInteractive: checked } as FormData))
  }

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
        {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

        <div className="space-y-2">
          <Label className="text-foreground text-lg">Mode</Label>
          <Tabs
            value={formData.mode}
            onValueChange={(v) => setFormData((prev) => ({ ...prev, mode: v as "keywords" | "advanced" }))}
          >
            <TabsList className="grid w-full grid-cols-2 bg-[var(--muted)]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="keywords"
                    className="w-full h-full bg-[var(--muted)] hover:bg-[var(--secondary)] data-[state=active]:bg-[var(--primary)] data-[state=active]:text-[var(--primary-foreground)] data-[state=active]:border-[var(--primary)] data-[state=active]:border"
                  >
                    Keywords Mode
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>In Keywords Mode, the AI generates captions using simple keywords you provide, combined with gender and degen scale for basic, descriptive outputs.</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="advanced"
                    className="w-full h-full bg-[var(--muted)] hover:bg-[var(--secondary)] data-[state=active]:bg-[var(--primary)] data-[state=active]:text-[var(--primary-foreground)] data-[state=active]:border-[var(--primary)] data-[state=active]:border"
                  >
                    Advanced Mode
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>In Advanced Mode, the AI crafts detailed captions based on niche features, subreddit type, creative style, visual context, mood, and custom rules for more tailored and complex results.</p>
                </TooltipContent>
              </Tooltip>
            </TabsList>
          </Tabs>
        </div>

        <div className="border-2 border-[var(--border)] rounded-lg p-5 bg-[var(--card)]">
          {formData.mode === "advanced" ? (
            <>
              <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-4">Creator Features</h3>
              <div className="grid grid-cols-[1fr_auto] gap-4 items-start mb-4">
                <div className="space-y-2">
                  <Label htmlFor="features" className="text-[var(--card-foreground)]">
                    Niche/Physical Features
                  </Label>
                  <Input
                    id="features"
                    placeholder="e.g., blonde hair, athletic build, curvy figure"
                    value={formData.physicalFeatures}
                    onChange={(e) => handleChange(e, "physicalFeatures")}
                    className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                    disabled={isGenerating}
                  />
                </div>

                <div className="space-y-2 border border-[var(--border)] rounded-lg p-4">
                  <Label className="text-[var(--card-foreground)]">Gender</Label>
                  <RadioGroup
                    value={formData.gender}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, gender: v as "female" | "male" | "trans" }))}
                    className="flex gap-4"
                    disabled={isGenerating}
                  >
                    {(["female", "male", "trans"] as const).map((value: "female" | "male" | "trans") => (
                      <div key={value} className="flex items-center space-x-2">
                        <RadioGroupItem value={value} id={value} className="border-[var(--border)]" />
                        <Label htmlFor={value} className="text-[var(--card-foreground)] font-normal cursor-pointer">
                          {value.charAt(0).toUpperCase() + value.slice(1)}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {formErrors.gender && <p className="text-red-500 text-sm">{formErrors.gender}</p>}
                </div>
              </div>
              <div className="grid grid-cols-[1fr_1fr] gap-2">
                <div className="space-y-3 border border-[var(--border)] rounded-lg p-4 max-w-md">
                  <Label className="text-[var(--card-foreground)] text-lg">Degen Scale</Label>
                  <div className="space-y-2 p-2">
                    <Slider
                      value={[formData.degenScale]}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, degenScale: value[0] }))}
                      min={1}
                      max={3}
                      step={1}
                      className="w-full [&>div]:h-6 [&>div]:cursor-pointer [&>div>span]:w-6 [&>div>span]:h-6 [&>div>span]:data-[state=active]:bg-[var(--primary-foreground)]"
                      disabled={isGenerating}
                    />
                    <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                      <span>Suggestive</span>
                      <span className="transform -translate-x-3">Direct</span>
                      <span>Explicit</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 border border-[var(--border)] rounded-lg p-4">
                  <Label className="text-[var(--card-foreground)] text-lg">Creative Style</Label>
                  <RadioGroup
                    value={formData.creativeStyle}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, creativeStyle: v }))}
                    className="flex space-x-2"
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
                        <RadioGroupItem value={option.value} id={`style-${option.value}`} className="border-[var(--border)]" />
                        <Label htmlFor={`style-${option.value}`} className="text-[var(--card-foreground)] font-normal cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="features" className="text-[var(--card-foreground)]">
                  Keywords
                </Label>
                <Textarea
                  id="features"
                  placeholder="e.g., blonde, athletic, lingerie, bedroom setting"
                  value={formData.physicalFeatures}
                  onChange={(e) => handleChange(e, "physicalFeatures")}
                  className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] min-h-[80px]"
                  disabled={isGenerating}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 border border-[var(--border)] rounded-lg p-4">
                  <Label className="text-[var(--card-foreground)]">Gender</Label>
                  <RadioGroup
                    value={formData.gender}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, gender: v as "female" | "male" | "trans" }))}
                    className="flex gap-4"
                    disabled={isGenerating}
                  >
                    {(["female", "male", "trans"] as const).map((value: "female" | "male" | "trans") => (
                      <div key={value} className="flex items-center space-x-2">
                        <RadioGroupItem value={value} id={value} className="border-[var(--border)]" />
                        <Label htmlFor={value} className="text-[var(--card-foreground)] font-normal cursor-pointer">
                          {value.charAt(0).toUpperCase() + value.slice(1)}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {formErrors.gender && <p className="text-red-500 text-sm">{formErrors.gender}</p>}
                </div>

                <div className="space-y-2 border border-[var(--border)] rounded-lg p-4">
                  <Label className="text-[var(--card-foreground)]">Degen Scale</Label>
                  <div className="space-y-2 p-2">
                    <Slider
                      value={[formData.degenScale]}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, degenScale: value[0] }))}
                      min={1}
                      max={3}
                      step={1}
                      className="w-full [&>div]:h-6 [&>div]:cursor-pointer [&>div>span]:w-6 [&>div>span]:h-6 [&>div>span]:data-[state=active]:bg-[var(--primary-foreground)]"
                      disabled={isGenerating}
                    />
                    <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                      <span>Suggestive</span>
                      <span className="transform -translate-x-3">Direct</span>
                      <span>Explicit</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {formData.mode === "advanced" && (
          <>
            <div className="space-y-3">
              <Label className="text-[var(--card-foreground)] text-lg">Subreddit Type</Label>
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
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--card-foreground)]"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:border-[var(--secondary)]"
                      }`}
                    disabled={isGenerating}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.subredditType === option.value ? "border-[var(--primary)]" : "border-[var(--border)]"
                          }`}
                      >
                        {formData.subredditType === option.value && <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />}
                      </div>
                      <span className="text-sm">{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="context" className="text-[var(--card-foreground)] text-lg">
                Visual Context
              </Label>
              <Textarea
                id="context"
                placeholder="e.g., cozy bedroom with candles, beach at sunset, gym during workout"
                value={formData.visualContext}
                onChange={(e) => handleChange(e, "visualContext")}
                className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] min-h-[80px]"
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mood" className="text-[var(--card-foreground)] text-lg">
                Caption Mood
              </Label>
              <Input
                id="mood"
                placeholder="e.g., playful and flirty, seductive and bold, confident and empowered"
                value={formData.captionMood}
                onChange={(e) => handleChange(e, "captionMood")}
                className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rules" className="text-[var(--card-foreground)] text-lg">
                Rules
              </Label>
              <Input
                id="rules"
                placeholder="e.g., include [F], avoid explicit terms, max 50 characters"
                value={formData.rules}
                onChange={(e) => handleChange(e, "rules")}
                className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                disabled={isGenerating}
              />
            </div>
          </>
        )}

        <div className="flex items-center space-x-2 mb-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Switch
                checked={formData.isInteractive}
                onCheckedChange={handleToggleInteractive}
                disabled={isGenerating}
                className="data-[state=checked]:bg-red-600 bg-gray-700"
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Enable to generate interactive/clickbait captions (e.g., 'Would you introduce me to your parents?') that encourage comments like 'yes' or 'no'.</p>
            </TooltipContent>
          </Tooltip>
          <Label className="text-[var(--card-foreground)]">Interactive/Clickbait Captions</Label>
        </div>

        <Button
          type="submit"
          disabled={isGenerating || Object.keys(formErrors).length > 0}
          className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--primary-foreground)] h-12 text-base font-semibold disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Generate Captions"}
        </Button>
      </form>
    </TooltipProvider>
  )
}