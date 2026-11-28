// Apple-style emoji artwork (from emoji-datasource-apple), so the greeting
// looks the same on Windows as it does on macOS.
const EMOJI: Record<string, string> = {
  "🌙": "1f319",
  "☀️": "2600-fe0f",
  "😄": "1f604",
  "😌": "1f60c",
  "🎄": "1f384",
  "🎉": "1f389",
  "🎃": "1f383",
  "💘": "1f498",
  "❄️": "2744-fe0f",
  "🌸": "1f338",
  "🍂": "1f342",
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const PATTERN = new RegExp(
  `(${Object.keys(EMOJI)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|")})`,
  "g",
)

interface AppleEmojiProps {
  children: string
  size?: number
}

/** Renders known emoji as Apple emoji images, leaving any other text untouched. */
export function AppleEmoji({ children, size }: AppleEmojiProps) {
  if (!children) return null
  const parts = children.split(PATTERN)
  return (
    <>
      {parts.map((part, index) => {
        const file = EMOJI[part]
        if (!file) return <span key={index}>{part}</span>
        return (
          <img
            key={index}
            className="apple-emoji"
            src={`/emoji/apple/${file}.png`}
            alt={part}
            draggable={false}
            style={size ? { width: size, height: size } : undefined}
          />
        )
      })}
    </>
  )
}
