import { Link } from 'react-router-dom'

export default function Brand({ variant = 'logo', to = '/', onClick, className = '' }) {
  if (variant === 'wordmark') {
    return (
      <Link to={to} className={`brand ${className}`.trim()} onClick={onClick}>
        UniSkill
      </Link>
    )
  }

  return (
    <Link to={to} className={`brand ${className}`.trim()} onClick={onClick} aria-label="UniSkill home">
      <img src="/logo.png" alt="UniSkill" />
    </Link>
  )
}
