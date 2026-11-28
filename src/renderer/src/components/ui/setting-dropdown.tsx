import { ChevronDown } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./dropdown-menu"

interface DropdownOption<T extends string | number> {
  value: T
  label: string
}

interface SettingDropdownProps<T extends string | number> {
  value: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

/** A single-select dropdown styled for the settings rows (shadcn dropdown-menu + radix). */
export function SettingDropdown<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: SettingDropdownProps<T>) {
  const current = options.find((option) => option.value === value)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`setting-select${className ? ` ${className}` : ""}`}
          aria-label={ariaLabel}
        >
          <span className="setting-select-value">{current?.label ?? String(value)}</span>
          <ChevronDown size={13} className="setting-select-chevron" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="setting-menu">
        <DropdownMenuRadioGroup
          value={String(value)}
          onValueChange={(next) => {
            const match = options.find((option) => String(option.value) === next)
            if (match) onChange(match.value)
          }}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={String(option.value)} value={String(option.value)}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
