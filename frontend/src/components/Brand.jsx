import { Link } from 'react-router-dom'
import { LANDING_URL } from '../config'

export default function Brand({ variant = 'logo', to, onClick, className = '' }) {
  const targetUrl = to !== undefined ? to : LANDING_URL
  const isExternal = typeof targetUrl === 'string' && /^https?:\/\//i.test(targetUrl)

  if (variant === 'wordmark') {
    if (isExternal) {
      return (
        <a href={targetUrl} className={`brand-wordmark ${className}`.trim()} onClick={onClick}>
          UniSkill
        </a>
      )
    }
    return (
      <Link to={targetUrl} className={`brand-wordmark ${className}`.trim()} onClick={onClick}>
        UniSkill
      </Link>
    )
  }

  if (isExternal) {
    return (
      <a href={targetUrl} className={`brand-logo ${className}`.trim()} onClick={onClick} aria-label="UniSkill home">
        <img src="/logo.png" alt="UniSkill" />
      </a>
    )
  }

  return (
    <Link to={targetUrl} className={`brand-logo ${className}`.trim()} onClick={onClick} aria-label="UniSkill home">
      <img src="/logo.png" alt="UniSkill" />
    </Link>
  )
}
