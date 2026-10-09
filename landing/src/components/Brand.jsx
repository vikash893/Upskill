import { Link } from 'react-router-dom'

export default function Brand({
  variant = 'logo',
  layout = 'stacked', // 'stacked' (image top, text bottom) | 'horizontal'
  to = '/',
  onClick,
  className = '',
  size = 'md',
}) {
  const isExternal = typeof to === 'string' && /^https?:\/\//i.test(to)

  const imgSizes = {
    sm: 30,
    md: 40,
    lg: 54,
  }
  const imgHeight = imgSizes[size] || 40

  const content = (
    <>
      {(variant === 'logo' || variant === 'icon') && (
        <div className="brand-logo-wrap">
          <img
            src="/logo.png"
            alt="UniSkill"
            className="brand-logo-img"
            style={{ height: `${imgHeight}px`, width: 'auto' }}
            loading="eager"
          />
        </div>
      )}
      {(variant === 'logo' || variant === 'wordmark') && (
        <span className="brand-text">
          <span className="brand-name-main">Uni</span>
          <span className="brand-name-accent">Skill</span>
        </span>
      )}
    </>
  )

  const combinedClass = `brand-link brand-layout-${layout} brand-size-${size} ${className}`.trim()

  if (isExternal) {
    return (
      <a href={to} className={combinedClass} onClick={onClick} aria-label="UniSkill home">
        {content}
      </a>
    )
  }

  return (
    <Link to={to} className={combinedClass} onClick={onClick} aria-label="UniSkill home">
      {content}
    </Link>
  )
}
