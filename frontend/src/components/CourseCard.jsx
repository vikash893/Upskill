import { useNavigate } from 'react-router-dom'

export default function CourseCard({ course }) {
  const navigate = useNavigate()
  const image = course.photo
    ? `http://localhost:8000/${course.photo.replace(/\\\\/g, '/')}`
    : null

  return (
    <article className="course-card" onClick={() => navigate(`/course/${course.course_id}`)} style={{ cursor: 'pointer' }}>
      <div className="course-image" style={image ? { backgroundImage: `url(${image})` } : undefined}>
        {!image && <span className="course-image-fallback">UNI / SKILL</span>}
        <span className="badge">
          {course.course_type === 'free' ? 'Free to learn' : `${course.discount || 0}% off`}
        </span>
      </div>
      <div className="course-card-body">
        <p className="eyebrow">CURATED COURSE</p>
        <h3>{course.course_title}</h3>
        <p className="course-description">{course.course_description}</p>
        <div className="price-row">
          <strong>{course.course_type === 'free' ? 'Free' : `₹${course.final_amount}`}</strong>
          {course.discount > 0 && <del>₹{course.actual_amount}</del>}
        </div>
        <button className="text-button" type="button" onClick={(e) => { e.stopPropagation(); navigate(`/course/${course.course_id}`) }}>
          View details <span>↗</span>
        </button>
      </div>
    </article>
  )
}
