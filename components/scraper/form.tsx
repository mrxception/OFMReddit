"use client"
import React from "react"
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select2'

interface FormProps {
    onSubmit: (e: React.FormEvent) => void
    progRef: React.RefObject<HTMLElement | null>
    status: string
    busy: boolean
    username: string
    setUsername: (v: string) => void
    showSecondUsername: boolean
    setShowSecondUsername: (v: boolean) => void
    username2: string
    setUsername2: (v: string) => void
    dateRange: string
    setDateRange: (v: string) => void
    limit: number
    setLimit: (v: number) => void
    inclVote: boolean
    setInclVote: (v: boolean) => void
    inclSubs: boolean
    setInclSubs: (v: boolean) => void
    inclComm: boolean
    setInclComm: (v: boolean) => void
    inclPER: boolean
    setInclPER: (v: boolean) => void
    inclMed: boolean
    setInclMed: (v: boolean) => void
    s: { [key: string]: string }
}

const Tooltip: React.FC<{ text: React.ReactNode; children: React.ReactNode }> = ({ text, children }) => (
  <div className="relative inline-flex items-center group">
    {children}
    <div className="pointer-events-none absolute bottom-full mb-2 w-72 bg-card text-xs rounded py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-border shadow-lg z-20">
      {text}
    </div>
  </div>
)

export default function Form(props: FormProps) {
    const {
        onSubmit,
        progRef,
        status,
        busy,
        username,
        setUsername,
        showSecondUsername,
        setShowSecondUsername,
        username2,
        setUsername2,
        dateRange,
        setDateRange,
        limit,
        setLimit,
        inclVote,
        setInclVote,
        inclSubs,
        setInclSubs,
        inclComm,
        setInclComm,
        inclPER,
        setInclPER,
        inclMed,
        setInclMed,
        s,
    } = props

    const addSecond = () => setShowSecondUsername(true)
    const removeSecond = () => {
        setUsername2("")
        setShowSecondUsername(false)
    }

    const perDisabled = !inclSubs

    return (
        <form onSubmit={onSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-4 mb-4">
                <div className="sm:col-span-1 lg:grid-cols-2 lg:col-span-2">
                    <label htmlFor="username" className="block text-sm font-semibold text-foreground mb-2">
                        Reddit Username
                    </label>
                    <input
                        className={s.csvinput}
                        id="username"
                        name="username"
                        placeholder="e.g. spez"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="off"
                    />
                </div>

                {showSecondUsername ? (
                    <div className="sm:col-span-1 lg:col-span-3">
                        <label htmlFor="username2" className="block text-sm font-semibold text-foreground mb-2">
                            Another Username
                        </label>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                            <input
                                className={`${s.csvinput} lg:col-span-2`}
                                id="username2"
                                name="username2"
                                placeholder="e.g. another_user"
                                value={username2}
                                onChange={(e) => setUsername2(e.target.value)}
                                autoComplete="off"
                            />
                            <button
                                type="button"
                                className={`${s.btn2} w-full lg:col-span-1`}
                                onClick={removeSecond}
                                disabled={busy}
                                aria-label="Remove second username"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="sm:col-span-1 lg:col-span-2 flex items-end">
                        <button
                            type="button"
                            className={`${s.btn2} w-full`}
                            onClick={addSecond}
                            disabled={busy}
                            aria-label="Add another username"
                        >
                            + Compare with another username
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                    <label htmlFor="dateRange" className="block text-sm font-semibold text-foreground mb-2">
                        Date Range
                    </label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger id="dateRange" className={s.csvinput}>
                            <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="7">Last 7 Days</SelectItem>
                            <SelectItem value="30">Last 30 Days</SelectItem>
                            <SelectItem value="60">Last 60 Days</SelectItem>
                            <SelectItem value="90">Last 90 Days</SelectItem>
                        </SelectContent>
                    </Select>

                </div>

                <div className="sm:col-span-1">
                    <label htmlFor="limit" className="block text-sm font-semibold text-foreground mb-2">
                        Max posts (1–1000)
                    </label>
                    <input
                        className={s.csvinput}
                        id="limit"
                        name="limit"
                        type="number"
                        min="1"
                        max="1000"
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value || 1000))}
                    />
                </div>

                <div className="sm:col-span-2 lg:col-span-1 flex items-end">
                    <button className={`${s.btn} w-full`} type="submit" disabled={busy}>
                        {busy ? "Preparing…" : "Run Analysis"}
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
                <b className="block text-sm font-semibold text-foreground mb-1">Metric to Include:</b>
                <label htmlFor="inclSubs" className="flex items-center gap-2 cursor-pointer lg:col-span-2">
                    <Checkbox
                        id="inclSubs"
                        checked={inclSubs}
                        onCheckedChange={(v) => {
                            const b = Boolean(v)
                            setInclSubs(b)
                            if (!b) setInclPER(false)
                        }}
                        className="size-5 rounded-full border-1 bg-[var(--color-background)] border-[var(--color-primary)]"
                    />
                    <span className="text-sm text-foreground">Subreddit member count</span>
                    <Tooltip
                        text={
                            <div className="space-y-1">
                                <p className="font-medium">Subreddit Member Counts</p>
                                <p>Include member counts during scraping to enrich your dataset.<span><b> This makes scraping longer!</b></span></p>
                                <ul className="list-disc pl-4 space-y-0.5">
                                    <li>Unlocks Performance Rating checkboxes.</li>
                                    <li>Turns the scatter plot into a bubble chart sized by members.</li>
                                </ul>
                                <p className="text-muted-foreground/80">Disable to keep a standard scatter plot and skip member lookups.</p>
                            </div>
                        }
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </Tooltip>
                </label>
            </div>
            {/*
            <b className="block text-sm font-semibold text-foreground mb-4">Metrics to Analyze:</b>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                <label htmlFor="inclVote" className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                        id="inclVote"
                        checked={inclVote}
                        onCheckedChange={(v) => setInclVote(Boolean(v))}
                        className="size-5 rounded-full border-1 bg-[var(--color-background)] border-[var(--color-primary)]"
                    />
                    <span className="text-sm text-foreground">Total upvotes</span>
                </label>

                <label htmlFor="inclSubs" className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                        id="inclSubs"
                        checked={inclSubs}
                        onCheckedChange={(v) => {
                            const b = Boolean(v)
                            setInclSubs(b)
                            if (!b) setInclPER(false)
                        }}
                        className="size-5 rounded-full border-1 bg-[var(--color-background)] border-[var(--color-primary)]"
                    />
                    <span className="text-sm text-foreground">Subreddit member count</span>
                    <Tooltip
                        text={
                            <div className="space-y-1">
                                <p className="font-medium">Subreddit Member Counts</p>
                                <p>Include member counts during scraping to enrich your dataset.<span><b> This makes scraping longer!</b></span></p>
                                <ul className="list-disc pl-4 space-y-0.5">
                                    <li>Unlocks Performance Rating checkboxes.</li>
                                    <li>Turns the scatter plot into a bubble chart sized by members.</li>
                                </ul>
                                <p className="text-muted-foreground/80">Disable to keep a standard scatter plot and skip member lookups.</p>
                            </div>
                        }
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </Tooltip>
                </label>
                <label htmlFor="inclMed" className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                        id="inclMed"
                        checked={inclMed}
                        onCheckedChange={(v) => setInclMed(Boolean(v))}
                        className="size-5 rounded-full border-1 bg-[var(--color-background)] border-[var(--color-primary)]"
                    />
                    <span className="text-sm text-foreground">Median average upvotes per post</span>
                </label>
                <label htmlFor="inclComm" className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                        id="inclComm"
                        checked={inclComm}
                        onCheckedChange={(v) => setInclComm(Boolean(v))}
                        className="size-5 rounded-full border-1 bg-[var(--color-background)] border-[var(--color-primary)]"
                    />
                    <span className="text-sm text-foreground">Total comments</span>
                </label>
                <label
                    htmlFor="inclPER"
                    className={`flex items-center gap-2 ${perDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    aria-disabled={perDisabled}
                >
                    <Checkbox
                        id="inclPER"
                        checked={inclPER}
                        disabled={perDisabled}
                        onCheckedChange={(v) => {
                            if (perDisabled) return
                            setInclPER(Boolean(v))
                        }}
                        className="size-5 rounded-full border-1 bg-[var(--color-background)] border-[var(--color-primary)]"
                    />
                    <span className="text-sm text-foreground">Performance rating</span>
                </label>
            </div>
            */}
            <div className={s.bar} aria-hidden="true">
                <i id="progress" ref={progRef} />
            </div>
            <div id="status" className={`${s.hint} flex justify-center`}>
                <span>{status}</span>
            </div>
        </form>
    )
}
