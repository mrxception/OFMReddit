"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
    creativeStyle: "fantasy",
    isInteractive: false,
    subredditName: "",
    contentType: "picture", 
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
        console.error("Failed to load creator features:", error)
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
    if (formData.mode === "advanced" && !formData.subredditName.trim() && !formData.subredditType) {
      errors.subredditType = "Subreddit Category is required when Subreddit Name is not provided"
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

  const handleGenderChange = (value: string) => {
    setFormData((prev) => ({ ...prev, gender: value as "female" | "male" | "trans" }))
  }

  const handleToggleInteractive = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isInteractive: checked }) as FormData)
  }

  const handleContentTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, contentType: value as "picture" | "picture set" | "GIF/short video" }))
  }

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
        {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

        <div className="space-y-2">
          <Label className="text-[var(--card-foreground)] text-lg">Mode</Label>
          <Tabs
            value={formData.mode}
            onValueChange={(v) => setFormData((prev) => ({ ...prev, mode: v as "keywords" | "advanced" }))}
          >
            <TabsList className="grid w-full grid-cols-2 bg-[var(--muted)]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="keywords"
                    style={{
                      backgroundColor: formData.mode === "keywords" ? "var(--primary)" : "var(--muted)",
                      color: formData.mode === "keywords" ? "var(--primary-foreground)" : "var(--card-foreground)",
                      border: formData.mode === "keywords" ? "1px solid var(--primary)" : "none",
                    }}
                    className="w-full h-full hover:bg-[var(--secondary)] transition-colors duration-200"
                  >
                    Keywords Mode
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>
                    Provide keywords (e.g., niche, visual context, mood), and the AI will automatically infer the best
                    caption strategy for your post.
                  </p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="advanced"
                    style={{
                      backgroundColor: formData.mode === "advanced" ? "var(--primary)" : "var(--muted)",
                      color: formData.mode === "advanced" ? "var(--primary-foreground)" : "var(--card-foreground)",
                      border: formData.mode === "advanced" ? "1px solid var(--primary)" : "none",
                    }}
                    className="w-full h-full hover:bg-[var(--secondary)] transition-colors duration-200"
                  >
                    Advanced Mode
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>
                    Provides maximum strategic control. You define the subreddit context, visual details, and mood to
                    receive highly tailored captions.
                  </p>
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
                    placeholder="e.g. cute, Japanese girl, anime, big natural boobs"
                    value={formData.physicalFeatures}
                    onChange={(e) => handleChange(e, "physicalFeatures")}
                    className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] placeholder:opacity-50 dark:placeholder:opacity-70"
                    disabled={isGenerating}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[var(--card-foreground)]">Gender</Label>
                  <Select value={formData.gender} onValueChange={handleGenderChange} disabled={isGenerating}>
                    <SelectTrigger className="w-full bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="trans">Trans</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.gender && <p className="text-red-500 text-sm">{formErrors.gender}</p>}
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
                  className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] placeholder:opacity-50 dark:placeholder:opacity-70 min-h-[80px]"
                  disabled={isGenerating}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 border border-[var(--border)] rounded-lg p-4">
                  <Label className="text-[var(--card-foreground)]">Gender</Label>
                  <Select value={formData.gender} onValueChange={handleGenderChange} disabled={isGenerating}>
                    <SelectTrigger className="w-full bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="trans">Trans</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.gender && <p className="text-red-500 text-sm">{formErrors.gender}</p>}
                </div>

                <div className="space-y-2 border border-[var(--border)] rounded-lg p-4">
                  <Label className="w-fit text-[var(--card-foreground)]">Degen Scale</Label>
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
            <div className="grid grid-cols-[1fr_1fr] gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="space-y-3 border border-[var(--border)] rounded-lg p-4 max-w-md">
                    <Label className="w-fit text-[var(--card-foreground)] text-lg">Degen Scale</Label>
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
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Adjusts the intensity of the caption's tone.</p>
                  <ul className="list-disc pl-5 mt-2">
                    <li>
                      <strong>Suggestive</strong>: Subtle and hinting at content.
                    </li>
                    <li>
                      <strong>Direct</strong>: Clear and straightforward language.
                    </li>
                    <li>
                      <strong>Explicit</strong>: Bold and unambiguous phrasing.
                    </li>
                  </ul>
                </TooltipContent>
              </Tooltip>
              <div className="space-y-3 border border-[var(--border)] rounded-lg p-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label className="w-fit text-[var(--card-foreground)] text-lg">Creative Style</Label>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>Optionally refines the caption's narrative to focus on a specific type of scenario.</p>
                    <ul className="list-disc pl-5 mt-2">
                      <li>
                        <strong>Grounded Scenario</strong>: Generates captions describing a plausible, real-world
                        scenario to feel authentic and relatable.
                      </li>
                      <li>
                        <strong>Fantasy / Roleplay</strong>: Creates an immersive or escapist point-of-view experience
                        by framing the content as a fantasy scenario.
                      </li>
                      <li>
                        <strong>Kink-Specific</strong>: Uses specific jargon and scenarios for a narrow, kink-focused
                        audience to signal 'insider' knowledge.
                      </li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
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
                      <RadioGroupItem
                        value={option.value}
                        id={`style-${option.value}`}
                        className="border-[var(--border)] scale-125"
                      />
                      <Label
                        htmlFor={`style-${option.value}`}
                        className="text-[var(--card-foreground)] font-normal cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[var(--card-foreground)] text-lg">Subreddit Context</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="subredditName" className="w-fit text-[var(--card-foreground)]">
                        Subreddit Name{" "}
                        <span className="text-sm font-normal text-[var(--muted-foreground)]">(optional)</span>
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>
                        Enter the subreddit name for tailored captions (e.g., r/example). This will auto-determine the
                        subreddit type.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  <Input
                    id="subredditName"
                    placeholder="e.g., r/example"
                    value={formData.subredditName}
                    onChange={(e) => handleChange(e, "subredditName")}
                    className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] placeholder:opacity-50 dark:placeholder:opacity-70"
                    disabled={isGenerating}
                  />
                </div>
                <div className="space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label className="w-fit text-[var(--card-foreground)]">
                        Subreddit Category{" "}
                        {formData.subredditName.trim() === "" && (
                          <span className="text-sm font-normal text-red-500">*</span>
                        )}
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="mb-2">Determines the caption strategy based on the subreddit type.</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>
                          <strong>Generalist</strong>: For large, broad-appeal subreddits, e.g. r/slutsofsnapchat,
                          r/nude_selfie
                        </li>
                        <li>
                          <strong>Body/Attribute</strong>: Focused on specific physical traits or demographics, e.g.
                          r/boobs, r/latinas, r/foreverteens
                        </li>
                        <li>
                          <strong>Kink/Activity</strong>: Defined by a specific fetish, activity, or scenario, e.g.
                          r/daddysbrokentoys, r/twerking
                        </li>
                        <li>
                          <strong>Aesthetic/Subculture</strong>: For subcultures with a strong identity, like Goth or
                          Cosplay, r/gymgirls, r/bigtiddygothgf
                        </li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                  <Select
                    value={formData.subredditType}
                    onValueChange={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        subredditType: v as "generalist" | "body-specific" | "kink-specific" | "aesthetic",
                      }))
                    }
                    disabled={isGenerating || formData.subredditName.trim() !== ""}
                  >
                    <SelectTrigger
                      className={
                        formData.subredditName.trim() !== ""
                          ? "w-full opacity-50 cursor-not-allowed bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                          : "w-full bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                      }
                    >
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generalist">Generalist Megahub</SelectItem>
                      <SelectItem value="body-specific">Body/Attribute Specific</SelectItem>
                      <SelectItem value="kink-specific">Kink/Activity Specific</SelectItem>
                      <SelectItem value="aesthetic">Aesthetic/Subculture</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.subredditType && <p className="text-red-500 text-sm">{formErrors.subredditType}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[var(--card-foreground)] text-lg">Content Details</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="context" className="w-fit text-[var(--card-foreground)] text-lg">
                        Visual Context
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>
                        Describe the main action, setting, or focus of the content. This is not for a literal
                        description, but to provide creative inspiration for the captions. E.g. showering, sitting on
                        gamer chair showing boobs, titty reveal in the garden.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  <Textarea
                    id="context"
                    placeholder="e.g., showering, sitting on gamer chair showing boobs, titty reveal in the garden"
                    value={formData.visualContext}
                    onChange={(e) => handleChange(e, "visualContext")}
                    className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] placeholder:opacity-50 dark:placeholder:opacity-70 min-h-[80px]"
                    disabled={isGenerating}
                  />
                </div>
                <div className="space-y-3 border border-[var(--border)] bg-[var(--card)] rounded-lg p-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label className="w-fit text-[var(--card-foreground)] text-lg">
                        Content Type
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>Specify the type of content to tailor the caption style. Influences how the caption describes the media.</p>
                    </TooltipContent>
                  </Tooltip>
                  <RadioGroup
                    value={formData.contentType}
                    onValueChange={handleContentTypeChange}
                    className="flex space-x-2"
                    disabled={isGenerating}
                  >
                    {[
                      { value: "picture", label: "Picture" },
                      { value: "picture set", label: "Picture Set" },
                      { value: "GIF/short video", label: "GIF/Short Video" },
                    ].map((option) => (
                      <div key={option.value} className="flex items-center py-2 space-x-2">
                        <RadioGroupItem
                          value={option.value}
                          id={`content-type-${option.value}`}
                          className="border-[var(--border)] scale-125"
                        />
                        <Label
                          htmlFor={`content-type-${option.value}`}
                          className="text-[var(--card-foreground)] font-normal cursor-pointer"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label htmlFor="mood" className="w-fit text-[var(--card-foreground)] text-lg">
                    Caption Mood
                  </Label>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>This sets the emotional tone for your captions. e.g. playful, confident, shy, commanding</p>
                </TooltipContent>
              </Tooltip>
              <Input
                id="mood"
                placeholder="e.g., playful, confident, shy, commanding"
                value={formData.captionMood}
                onChange={(e) => handleChange(e, "captionMood")}
                className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] placeholder:opacity-50 dark:placeholder:opacity-70"
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label htmlFor="rules" className="w-fit text-[var(--card-foreground)] text-lg">
                    Rules
                  </Label>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Specify any title rules for the particular subreddit you're posting to e.g. gender tag</p>
                </TooltipContent>
              </Tooltip>
              <Input
                id="rules"
                placeholder="e.g., gender tag"
                value={formData.rules}
                onChange={(e) => handleChange(e, "rules")}
                className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] placeholder:opacity-50 dark:placeholder:opacity-70"
                disabled={isGenerating}
              />
            </div>
          </>
        )}

        <div className="flex items-center space-x-2 my-8">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-2 cursor-pointer"
                onClick={() => !isGenerating && handleToggleInteractive(!formData.isInteractive)}
              >
                <div
                  className={`relative w-16 h-7 rounded-full transition-colors duration-200 ${formData.isInteractive ? "bg-blue-600" : "bg-gray-300"} ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                  role="switch"
                  aria-checked={formData.isInteractive}
                  aria-disabled={isGenerating}
                >
                  <span
                    className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full transition-transform duration-200 ${formData.isInteractive ? "translate-x-[2.25rem]" : "translate-x-1"}`}
                  />
                  <span
                    className={`absolute top-1/2 -translate-y-1/2 text-white text-xs font-bold transition-opacity duration-200 ${formData.isInteractive ? "left-2 opacity-100" : "left-2 opacity-0"}`}
                  >
                    ON
                  </span>
                  <span
                    className={`absolute top-1/2 -translate-y-1/2 text-gray-600 text-xs font-bold transition-opacity duration-200 ${!formData.isInteractive ? "right-2 opacity-100" : "right-2 opacity-0"}`}
                  >
                    OFF
                  </span>
                </div>

                <Label className="text-[var(--card-foreground)] text-lg">
                  Interactive/Clickbait Captions{" "}
                  <span className="text-sm font-normal">(beware some subreddits do not allow questions)</span>
                </Label>
              </div>
            </TooltipTrigger>

            <TooltipContent className="max-w-xs" side="right">
              <p>
                Enable to generate interactive/clickbait captions (e.g., 'Would you introduce me to your parents?') that
                encourage comments like 'yes' or 'no'.
              </p>
            </TooltipContent>
          </Tooltip>
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