import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Custom Select component — fully styled, tanpa native <select>.
 * API kompatibel: gunakan children berupa <option> elements, sama seperti native select.
 *
 * Usage:
 *   <Select value={val} onChange={(e) => setVal(e.target.value)}>
 *     <option value="">Pilih...</option>
 *     <option value="1">Item 1</option>
 *   </Select>
 */
function Select({ children, value, onChange, disabled, id, className, placeholder }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const listRef = useRef(null)
  const [dropdownStyle, setDropdownStyle] = useState({})

  // Parse <option> children → [{ value, label, disabled }]
  const options = parseOptions(children)

  const selectedOption = options.find((opt) => String(opt.value) === String(value ?? ''))
  const displayLabel = selectedOption?.label ?? placeholder ?? ''
  const isEmpty = !selectedOption

  // Update position when opening
  useLayoutEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownStyle({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 160)
      })
    }
  }, [open])

  // Close on outside click or scroll
  useEffect(() => {
    if (!open) return

    function handleClick(event) {
      if (
        containerRef.current && !containerRef.current.contains(event.target) &&
        listRef.current && !listRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }
    
    function handleScroll(event) {
      if (listRef.current && listRef.current.contains(event.target)) {
        return // Ignore scrolling inside the dropdown itself
      }
      setOpen(false)
    }

    function handleResize() {
      setOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)

    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [open])

  // Keyboard: Escape closes, ArrowUp/Down navigates
  useEffect(() => {
    if (!open) return

    function handleKey(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const currentIndex = options.findIndex((opt) => String(opt.value) === String(value ?? ''))
        const nextIndex = event.key === 'ArrowDown'
          ? Math.min(currentIndex + 1, options.length - 1)
          : Math.max(currentIndex - 1, 0)
        const next = options[nextIndex]

        if (next && !next.disabled && onChange) {
          onChange({ target: { value: next.value } })
        }
      }

      if (event.key === 'Enter') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, options, value, onChange])

  function selectOption(optionValue) {
    if (onChange) {
      onChange({ target: { value: optionValue } })
    }
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Hidden native select for form compat & accessibility */}
      <select
        id={id}
        value={value ?? ''}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      >
        {children}
      </select>

      {/* Custom trigger button */}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-medium transition-all',
          'border-ims-slate/30 text-ims-navy',
          'hover:border-ims-slate/40',
          open && 'border-ims-blue ring-2 ring-blue-600/15',
          isEmpty && 'text-ims-slate',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        onClick={() => !disabled && setOpen((prev) => !prev)}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          size={15}
          className={cn(
            'shrink-0 text-ims-slate transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Dropdown list (rendered via Portal to avoid clipping) */}
      {open ? createPortal(
        <div
          ref={listRef}
          role="listbox"
          className={cn(
            'absolute z-[9999]',
            'overflow-hidden rounded-2xl border border-ims-slate/20 bg-white shadow-lg shadow-ims-navy/10',
          )}
          style={{ 
            top: dropdownStyle.top,
            left: dropdownStyle.left,
            width: dropdownStyle.width,
            animation: 'selectDropdownIn 120ms ease-out' 
          }}
        >
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map((option) => {
              const isSelected = String(option.value) === String(value ?? '')
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm',
                    'text-ims-navy transition-colors',
                    isSelected
                      ? 'bg-ims-navy/5 font-semibold'
                      : 'hover:bg-ims-cream/40',
                    option.disabled && 'cursor-not-allowed opacity-40',
                  )}
                  onClick={() => !option.disabled && selectOption(option.value)}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? (
                    <Check size={13} className="shrink-0 text-ims-blue" />
                  ) : null}
                </div>
              )
            })}

            {options.length === 0 ? (
              <p className="px-3 py-3 text-xs text-ims-slate">Tidak ada pilihan.</p>
            ) : null}
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  )
}

/**
 * Parse React children untuk mengekstrak <option> elements
 * menjadi array [{ value, label, disabled }].
 */
function parseOptions(children) {
  const result = []

  function traverse(node) {
    if (!node) return

    if (Array.isArray(node)) {
      node.forEach(traverse)
      return
    }

    if (typeof node !== 'object') return

    const { type, props } = node

    if (type === 'option') {
      result.push({
        value: props.value ?? '',
        label: Array.isArray(props.children) 
          ? props.children.join('') 
          : (typeof props.children === 'string' ? props.children : String(props.children ?? '')),
        disabled: Boolean(props.disabled),
      })
      return
    }

    if (type === 'optgroup' && props.children) {
      traverse(props.children)
    }
  }

  traverse(children)
  return result
}

export { Select }
