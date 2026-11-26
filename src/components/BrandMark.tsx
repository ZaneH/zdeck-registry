/** zDeck's boxed Z mark; follows the surrounding theme's ink color. */
export function BrandMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" role="img" aria-label="zDeck" focusable="false">
      <rect x="3.5" y="3.5" width="25" height="25" rx="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 11h12L10 21h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
