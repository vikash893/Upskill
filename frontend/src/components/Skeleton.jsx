function Block({ className = '' }) {
  return <span className={`skeleton-block ${className}`} />
}

function Lines({ count = 2 }) {
  return (
    <div className="skeleton-lines">
      {Array.from({ length: count }, (_, index) => <Block key={index} className={`skeleton-line skeleton-line-${index + 1}`} />)}
    </div>
  )
}

function Card({ compact = false }) {
  return (
    <div className={`skeleton-card${compact ? ' skeleton-card-compact' : ''}`}>
      {!compact && <Block className="skeleton-card-image" />}
      <div className="skeleton-card-body">
        <Block className="skeleton-kicker" />
        <Block className="skeleton-heading" />
        <Lines count={compact ? 2 : 3} />
        <Block className="skeleton-action" />
      </div>
    </div>
  )
}

function Row() {
  return (
    <div className="skeleton-row">
      <Block className="skeleton-avatar" />
      <div className="skeleton-row-copy">
        <Block className="skeleton-heading" />
        <Lines count={2} />
      </div>
      <Block className="skeleton-action skeleton-row-action" />
    </div>
  )
}

function Table({ count }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-head"><Block /><Block /><Block /><Block /></div>
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-table-row" key={index}>
          <Block /><Block /><Block /><Block />
        </div>
      ))}
    </div>
  )
}

function Dashboard({ count }) {
  return (
    <div className="skeleton-dashboard">
      <div className="skeleton-dashboard-stats">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="skeleton-stat" key={index}><Block className="skeleton-kicker" /><Block className="skeleton-stat-value" /><Block className="skeleton-line" /></div>
        ))}
      </div>
      <div className="skeleton-dashboard-content">
        {Array.from({ length: count }, (_, index) => <Card compact key={index} />)}
      </div>
    </div>
  )
}

function LearningRoom() {
  return (
    <div className="skeleton-learning-room">
      <div className="skeleton-learning-header"><Block className="skeleton-heading" /><div><Block /><Block /><Block /></div></div>
      <div className="skeleton-learning-content">
        <div className="skeleton-learning-player"><Block className="skeleton-player" /><Block className="skeleton-heading" /><Lines count={3} /></div>
        <div className="skeleton-learning-sidebar"><Block className="skeleton-kicker" />{Array.from({ length: 5 }, (_, index) => <Row key={index} />)}</div>
      </div>
    </div>
  )
}

export default function Skeleton({ variant = 'rows', count = 4, label = 'Loading content' }) {
  let content

  if (variant === 'course-cards') {
    content = <div className="skeleton-card-grid">{Array.from({ length: count }, (_, index) => <Card key={index} />)}</div>
  } else if (variant === 'class-list') {
    content = <div className="skeleton-class-list">{Array.from({ length: count }, (_, index) => <Card compact key={index} />)}</div>
  } else if (variant === 'table') {
    content = <Table count={count} />
  } else if (variant === 'dashboard') {
    content = <Dashboard count={count} />
  } else if (variant === 'learning-room') {
    content = <LearningRoom />
  } else if (variant === 'profile') {
    content = <div className="skeleton-profile"><div className="skeleton-profile-heading"><Block className="skeleton-avatar-large" /><div><Block className="skeleton-heading" /><Lines count={2} /></div></div><div className="skeleton-profile-grid">{Array.from({ length: 6 }, (_, index) => <div key={index}><Block className="skeleton-kicker" /><Block className="skeleton-field" /></div>)}</div></div>
  } else if (variant === 'detail') {
    content = <div className="skeleton-detail"><div className="skeleton-detail-hero"><Block className="skeleton-kicker" /><Block className="skeleton-heading" /><Lines count={3} /><Block className="skeleton-action" /></div><div className="skeleton-detail-sections">{Array.from({ length: count }, (_, index) => <Card compact key={index} />)}</div></div>
  } else {
    content = <div className="skeleton-row-list">{Array.from({ length: count }, (_, index) => <Row key={index} />)}</div>
  }

  return (
    <div className={`content-skeleton content-skeleton-${variant}`} role="status" aria-label={label} aria-busy="true">
      <span className="skeleton-screen-reader-only">{label}</span>
      <div aria-hidden="true">{content}</div>
    </div>
  )
}