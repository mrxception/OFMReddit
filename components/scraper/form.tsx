"use client"
import React from "react"

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
                                className={`${s.btn} w-full lg:col-span-1`}
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
                            className={`${s.btn} w-full`}
                            onClick={addSecond}
                            disabled={busy}
                            aria-label="Add another username"
                        >
                            + Add another username
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                    <label htmlFor="dateRange" className="block text-sm font-semibold text-foreground mb-2">
                        Date Range
                    </label>
                    <select
                        className={s.csvinput}
                        id="dateRange"
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                    >
                        <option value="all">All Time</option>
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="60">Last 60 Days</option>
                        <option value="90">Last 90 Days</option>
                    </select>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className={s.setinput}
                        checked={inclVote}
                        onChange={(e) => setInclVote(e.target.checked)}
                    />
                    <span className="text-sm text-foreground">Total upvotes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className={s.setinput}
                        checked={inclSubs}
                        onChange={(e) => setInclSubs(e.target.checked)}
                    />
                    <span className="text-sm text-foreground">Subreddit member count</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className={s.setinput}
                        checked={inclComm}
                        onChange={(e) => setInclComm(e.target.checked)}
                    />
                    <span className="text-sm text-foreground">Total comments</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className={s.setinput}
                        checked={inclPER}
                        onChange={(e) => setInclPER(e.target.checked)}
                    />
                    <span className="text-sm text-foreground">Performance rating</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className={s.setinput}
                        checked={inclMed}
                        onChange={(e) => setInclMed(e.target.checked)}
                    />
                    <span className="text-sm text-foreground">Median average upvotes per post</span>
                </label>
            </div>

            <div className={s.bar} aria-hidden="true">
                <i id="progress" ref={progRef} />
            </div>
            <div id="status" className={`${s.hint} flex justify-center`}>
                <span>{status}</span>
            </div>
        </form>
    )
}
