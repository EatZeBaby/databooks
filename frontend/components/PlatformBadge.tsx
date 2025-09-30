import React from 'react'

export default function PlatformBadge({ sourceType, size = 16, className = '' }: { sourceType?: string; size?: number; className?: string }) {
  const st = (sourceType || '').toLowerCase()
  const isDbx = st.includes('databricks')
  const isSnow = st.includes('snowflake')
  const src = isDbx ? '/assets/images/databricks.svg' : isSnow ? '/assets/images/snowflake.svg' : undefined
  const label = isDbx ? 'Databricks' : isSnow ? 'Snowflake' : 'Dataset'

  if (!src) {
    return <span className={`inline-block rounded-full bg-gray-200 text-gray-700 text-[10px] px-1 ${className}`}>DS</span>
  }
  return (
    <span className={`inline-flex items-center ${className}`} title={label} aria-label={label}>
      {/* Use a plain img so missing assets won’t break the build; hide on error */}
      <img
        src={src}
        alt={label}
        width={size}
        height={size}
        onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display='none' }}
        className="opacity-80"
      />
    </span>
  )
}


