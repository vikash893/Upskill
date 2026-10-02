export default function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Rajat Singhania',
      role: 'Frontend Engineer at Razorpay',
      quote: 'The live class environment and immediate instructor feedback on my assignments made all the difference. UniSkill feels like a real studio rather than a sterile video library.',
      course: 'Full-Stack Web Engineering',
      rating: 5,
    },
    {
      name: 'Pooja Kulkarni',
      role: 'ML Practitioner at DataLabs',
      quote: 'Choosing the yearly plan gave me access to every live cohort and recording archive. The problem sheets prepared me directly for industry technical rounds.',
      course: 'AI & Applied Machine Learning',
      rating: 5,
    },
    {
      name: 'Devansh Verma',
      role: 'Cloud Architect at Infosys',
      quote: 'The flexible monthly billing and clear plan expiry tracking allowed me to master Kubernetes and Terraform without long lock-ins. Superb platform.',
      course: 'Cloud Computing & DevOps',
      rating: 5,
    },
  ]

  return (
    <section className="content-section" aria-labelledby="testimonials-title">
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <p className="eyebrow">STUDENT OUTCOMES</p>
        <h2 id="testimonials-title" className="section-title">
          Proven by learners<br /><em>in top engineering roles.</em>
        </h2>
        <p className="section-subtitle" style={{ margin: '0 auto' }}>
          Our alumni work at hyper-growth tech companies and global enterprises. They came for practical skills—and stayed for the rigor.
        </p>
      </div>

      <div className="testimonial-grid">
        {testimonials.map((t, idx) => (
          <div key={idx} className="testimonial-card">
            <div className="testimonial-stars">{'★'.repeat(t.rating)}</div>
            <p className="testimonial-quote">"{t.quote}"</p>
            <div className="testimonial-author">
              <div>
                <strong>{t.name}</strong>
                <span>{t.role}</span>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--orange)', fontWeight: 600, marginTop: '2px' }}>
                  {t.course}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
