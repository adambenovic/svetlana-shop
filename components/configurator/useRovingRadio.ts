'use client'
import { useRef } from 'react'

/**
 * Roving tabindex for a WAI-ARIA radio group: the group is a single tab stop
 * (the checked radio, or the first when none is), Arrow keys move focus and
 * selection to the previous/next option (wrapping), Home/End to the first/last.
 * Space/Enter keep working through the native <button> click.
 */
export function useRovingRadio<T extends string>(ids: readonly T[], selected: string, onChange: (id: T) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const selectedIndex = ids.indexOf(selected as T)
  const tabStop = selectedIndex >= 0 ? selectedIndex : 0

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % ids.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + ids.length) % ids.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = ids.length - 1
    else return
    e.preventDefault()
    onChange(ids[next])
    refs.current[next]?.focus()
  }

  return (index: number) => ({
    ref: (el: HTMLButtonElement | null) => { refs.current[index] = el },
    tabIndex: index === tabStop ? 0 : -1,
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => onKeyDown(e, index),
  })
}
