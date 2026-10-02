import { getCourseAppUrl, getAppUrl } from '../config'

export default function CourseCard({ course }) {
  const isFree = course.course_type === 'free'
  const monthlyPrice = course.final_monthly_amount || course.monthly_amount || course.course_amount || 0
  const yearlyPrice = course.final_yearly_amount || course.yearly_amount || (monthlyPrice > 0 ? monthlyPrice * 10 : 0)
  const discount = course.discount || 0
  const imageUrl = course.photo ? course.photo.replace(/\\/g, '/') : null

  return (
    <div className="public-course-card">
      <div
        className="course-card-thumb"
        style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : {}}
      >
        <span className="course-badge">
          {isFree ? 'Free Access' : discount > 0 ? `${discount}% Flash Off` : 'Verified Masterclass'}
        </span>
      </div>

      <div className="course-card-body">
        <h3>{course.course_title}</h3>
        <p>
          {course.course_description?.length > 130
            ? `${course.course_description.slice(0, 130)}...`
            : course.course_description}
        </p>

        <div className="course-card-footer">
          <div>
            {isFree ? (
              <span className="course-price" style={{ color: '#166534' }}>
                Free to learn
              </span>
            ) : (
              <div>
                <span className="course-price">₹{monthlyPrice}</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '4px' }}>/ mo</span>
                {yearlyPrice > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    or ₹{yearlyPrice}/yr
                  </div>
                )}
              </div>
            )}
          </div>

          <a
            href={getCourseAppUrl(course.course_id)}
            className="primary-button"
            style={{ padding: '8px 18px', fontSize: '12px' }}
          >
            <span>Explore Course</span>
            <span>↗</span>
          </a>
        </div>
      </div>
    </div>
  )
}
