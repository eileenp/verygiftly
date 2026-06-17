type LogoProps = {
  /** Tailwind height class controls the rendered size, e.g. "h-9" or "h-14". */
  className?: string
  alt?: string
}

// The VeryGiftly wordmark (coral stacked "very giftly" with the signature
// four-point star). Width auto-scales from the height class.
export function Logo({ className = 'h-9', alt = 'VeryGiftly' }: LogoProps) {
  return (
    <img
      src="/verygiftly-logo.png"
      alt={alt}
      className={`w-auto ${className}`}
    />
  )
}
