"use client"

import React from "react"

type Msg = { type: string; text: string } | null

interface ExcelSheetSectionProps {
    hasTop10: boolean
    username: string
    cols: Array<{ key: string; label: string }>
    previewWith30: any[]
    fmtUTC: (iso: string) => string
    files: Array<{ id: string; filename: string }>
    historyRef: React.RefObject<HTMLDivElement | null>
    handleDownload: (id: string, filename: string) => void
    handleDelete: (id: string) => void
    msg: Msg
    s: { [key: string]: string }
}

export default function ExcelSheetSection({
    hasTop10,
    username,
    cols,
    previewWith30,
    fmtUTC,
    files,
    historyRef,
    handleDownload,
    handleDelete,
    msg,
    s,
}: ExcelSheetSectionProps) {
    return (
        <div className="rounded-lg border border-border bg-card p-4 md:p-6">
            {hasTop10 && (
                <div>
                    <div className="mb-4">
                        <h2 className="text-lg md:text-xl font-bold text-foreground">
                            Subreddit Performance {username ? ` for u/${username}` : ""}
                        </h2>
                        <p className={s.hint}>
                            Displaying {previewWith30.length} subreddits (scroll to view all)
                        </p>
                    </div>
                    <div className={`${s.tableContainer} overflow-x-auto overflow-y-auto`}>
                        <div
                            className={s.excel}
                            role="table"
                            aria-label="Subreddit Performance (all)"
                            style={{
                                gridTemplateColumns: `48px repeat(${cols.length}, minmax(140px, 1fr))`,
                                minWidth: "800px",
                            }}
                        >
                            <div className={`${s.cell} ${s.corner}`} aria-hidden="true">
                                {" "}
                            </div>

                            {cols.map((c: { key: string; label: string }, i: number) => (
                                <div
                                    key={`col-${c.key}`}
                                    className={`${s.cell} ${s.colhead}`}
                                    role="columnheader"
                                    aria-colindex={i + 1}
                                >
                                    {c.label}
                                </div>
                            ))}

                            {previewWith30.map((row: any, r: number) => (
                                <React.Fragment key={`row-${r}`}>
                                    <div className={`${s.cell} ${s.rowhead}`} role="rowheader">
                                        {r + 1}
                                    </div>
                                    <div className={s.cell} role="cell">
                                        {row?.Subreddit ?? ""}
                                    </div>
                                    <div className={s.cell} role="cell">
                                        {row?.Total_Posts ?? ""}
                                    </div>
                                    <div className={s.cell} role="cell">
                                        {row?.Avg_Upvotes_Per_Post ?? ""}
                                    </div>
                                    <div className={s.cell} role="cell">
                                        {row?.Avg_Comments_Per_Post != null ? Math.round(row.Avg_Comments_Per_Post) : ""}
                                    </div>
                                    <div className={s.cell} role="cell">
                                        {row?.Posts_Per_30Days != null ? row.Posts_Per_30Days : ""}
                                    </div>
                                    <div className={s.cell} role="cell">
                                        {row?.LastDateTimeUTC ? fmtUTC(row.LastDateTimeUTC) : ""}
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div id="history" className={s.history} aria-live="polite" ref={historyRef}>
                {files.length === 0 ? (
                    <div className={s.hint}>No files in this session yet.</div>
                ) : (
                    files.map((f: { id: string; filename: string }) => (
                        <div key={f.id} className={s.histrow}>
                            <span className={s.fname} title={f.filename}>
                                {f.filename}
                            </span>
                            <span className={s.flex1} />
                            <button type="button" className={s.mini} onClick={() => handleDownload(f.id, f.filename)}>
                                Download
                            </button>
                            <button type="button" className={`${s.mini} ${s.subtle}`} onClick={() => handleDelete(f.id)}>
                                Delete
                            </button>
                        </div>
                    ))
                )}
            </div>

            {msg && <div className={`${s.alert} ${msg.type === "ok" ? s.ok : s.err}`}>{msg.text}</div>}

            <p className={s.hint}>
                Files are stored temporarily in memory for this page session and auto-expire after ~10 minutes or when you
                close/reload the page.
            </p>
        </div>
    )
}
