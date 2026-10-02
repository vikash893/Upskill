import { useState } from 'react'
import { mediaUrl } from '../utils/mediaUrl'

export default function MediaImage({ src, alt = '', className = '', style, fallback = null }) {
  const [failed, setFailed] = useState(false)
  const resolved = mediaUrl(src)

  if (!resolved || failed) {
    return fallback
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  )
}
