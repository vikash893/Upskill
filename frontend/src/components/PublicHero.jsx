export default function PublicHero({ kicker, title, description, actions, image, imageAlt = 'UniSkill learners' }) {
  return (
    <section className="coursera-hero-wrapper">
      <div className="coursera-hero-content">
        <div className="coursera-hero-text">
          {kicker && <p className="hero-title">{kicker}</p>}
          <h1 className="hero-subtitle">{title}</h1>
          {description && <p className="hero-description">{description}</p>}
          {actions ? <div className="hero-cta-group">{actions}</div> : null}
        </div>
        <div className="coursera-hero-image-area">
          <div className="hero-shape-circle" />
          <div className="hero-shape-arc" />
          <img src={image} alt={imageAlt} className="hero-student-img" />
        </div>
      </div>
    </section>
  )
}
