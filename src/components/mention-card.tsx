"use client";

import { useState } from "react";
import { SentimentChip } from "@/components/ui";
import { CHANNEL_LABEL, fmt, fmtCompact, fmtDateTime } from "@/lib/format";
import type { Mention } from "@/lib/types";

const POST_TYPE: Record<string, string> = {
  Commented: "Comment",
  Posted: "Post",
  Tweeted: "Tweet",
  Quoted: "Quote",
  Shared: "Share",
};

const LONG = 320;

/** YouTube thumbnails can be derived from the link; other channels only have what the export gives. */
function youtubeThumb(url: string | null) {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/)([\w-]{11})/);
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null;
}

function initials(name: string) {
  return (
    name
      .replace(/^@/, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => Array.from(w)[0]!.toUpperCase()) // Array.from keeps emoji / styled letters whole
      .join("") || "?"
  );
}

/** Image from a social CDN: links can expire, so a broken one just disappears. */
function Thumb({ src, href, className }: { src: string; href: string | null; className: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- remote CDN thumbnails, size unknown
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setOk(false)}
      className={`${className} shrink-0 rounded-md border border-line bg-surface object-cover`}
    />
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer noopener" aria-label="Open original post" className="shrink-0">
      {img}
    </a>
  ) : (
    img
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  if (!value) return null;
  return (
    <span className="num">
      <span className="font-semibold text-ink">{fmtCompact(value)}</span> {label}
    </span>
  );
}

export function MentionCard({ m }: { m: Mention }) {
  const [expanded, setExpanded] = useState(false);
  const handle = m.authorHandle?.replace(/^@/, "") || null; // YouTube handles already start with @
  const name = m.authorName ?? (handle ? `@${handle}` : "Unknown author");
  const showHandle = handle && m.authorName && m.authorName.replace(/^@/, "") !== handle;
  const isComment = m.postType === "Commented";
  const image = m.preview.images[0] ?? youtubeThumb(m.url);
  const text = m.content ?? "";
  const long = text.length > LONG;
  const hasParent = isComment && (m.title || m.preview.where);

  return (
    <article className="rounded-[10px] border border-line bg-card p-5">
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-xs font-bold text-muted"
        >
          {initials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
            {m.preview.userLink ? (
              <a href={m.preview.userLink} target="_blank" rel="noreferrer noopener" className="font-semibold hover:underline">
                {name}
              </a>
            ) : (
              <span className="font-semibold">{name}</span>
            )}
            {showHandle && <span className="truncate text-muted">@{handle}</span>}
            {m.authorVerified && <span className="text-xs font-semibold text-ink">Verified</span>}
            {m.authorFollowers ? <span className="text-xs text-muted">{fmtCompact(m.authorFollowers)} followers</span> : null}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
            <span>
              {CHANNEL_LABEL[m.channel]} {(POST_TYPE[m.postType ?? ""] ?? m.postType ?? "mention").toLowerCase()}
            </span>
            <time dateTime={m.publishedAt}>{fmtDateTime(m.publishedAt)}</time>
          </p>
        </div>
        <SentimentChip s={m.sentimentLabel} />
      </header>

      {hasParent ? (
        // A comment: show the post it replies to, like the source tool does.
        <div className="mt-4 flex gap-3 rounded-[10px] border border-line bg-surface/60 p-3">
          {image && <Thumb src={image} href={m.url} className="h-20 w-20" />}
          <div className="min-w-0 text-sm">
            <p className="text-xs text-muted">
              Reply to a post
              {m.preview.where ? (
                <span className="font-semibold text-ink"> by {/^[^@\s]+$/.test(m.preview.where) ? "@" : ""}{m.preview.where}</span>
              ) : null}
            </p>
            {m.title && <p className="mt-1 line-clamp-3 break-words leading-relaxed">{m.title}</p>}
          </div>
        </div>
      ) : (
        m.title &&
        m.title !== m.content && <h3 className="mt-4 font-semibold leading-snug">{m.title}</h3>
      )}

      <div className={`mt-3 flex gap-4 ${hasParent ? "" : "items-start"}`}>
        <div className="min-w-0 flex-1">
          <p
            className={`whitespace-pre-line break-words text-[0.95rem] leading-relaxed ${long && !expanded ? "line-clamp-6" : ""}`}
          >
            {text || <span className="text-muted">No text (for example a sticker-only comment).</span>}
          </p>
          {long && (
            <button onClick={() => setExpanded((v) => !v)} className="mt-1 text-xs font-semibold text-ink hover:underline">
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
        {!hasParent && image && <Thumb src={image} href={m.url} className="h-24 w-24 sm:h-28 sm:w-28" />}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <Metric label="likes" value={m.likes} />
        <Metric label="comments" value={m.comments} />
        <Metric label="shares" value={m.shares} />
        <Metric label="views" value={m.views} />
        <Metric label="saves" value={m.preview.bookmarks} />
        <span className="num">
          <span className="font-semibold text-ink">{fmt(m.engagements)}</span> engagement
        </span>
        <Metric label="reach" value={m.reach} />
      </div>

      <footer className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs">
        {m.brands.map((b) => (
          <span
            key={b.id}
            className={b.isOwn ? "mark font-semibold" : "rounded bg-surface px-1.5 py-0.5"}
          >
            {b.name}
          </span>
        ))}
        {m.url && (
          <a href={m.url} target="_blank" rel="noreferrer noopener" className="ml-auto font-semibold text-ink hover:underline">
            Open original post
          </a>
        )}
      </footer>
    </article>
  );
}
