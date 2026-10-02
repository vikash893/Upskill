import { useEffect, useState } from 'react'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'

const PRESET_BRANCHES = ['All Branches', 'B.Tech', 'BCA', 'BBA', 'MCA', 'MBA', 'B.Sc', 'B.Com']
const SOURCE_PLATFORMS = ['All', 'LinkedIn', 'Instagram', 'Indeed', 'Unstop', 'Naukri', 'Other']

export default function StudentJobs() {
  const { session } = useAuth()
  const headers = { Authorization: `Bearer ${session.token}` }

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all' | 'job' | 'internship'
  const [filterBranch, setFilterBranch] = useState('All Branches')
  const [filterPlatform, setFilterPlatform] = useState('All')

  // Expanded descriptions map
  const [expandedMap, setExpandedMap] = useState({})

  const fetchJobs = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterType !== 'all') params.set('type', filterType)
      if (filterBranch !== 'All Branches') params.set('branch', filterBranch)
      if (filterPlatform !== 'All') params.set('source', filterPlatform)
      if (search.trim()) params.set('search', search.trim())

      const data = await request(`/jobs?${params.toString()}`, { headers })
      setJobs(data.jobs || [])
    } catch (err) {
      setError(err.message || 'Failed to load jobs and internships')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [filterType, filterBranch, filterPlatform])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchJobs()
  }

  const toggleExpand = (id) => {
    setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCopyLink = (job) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(job.apply_url)
      setCopiedId(job._id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const getPlatformBadge = (platform) => {
    const p = (platform || '').toLowerCase()
    if (p.includes('linkedin')) return { bg: '#0077b5', color: '#fff', label: 'LinkedIn', icon: '🔗' }
    if (p.includes('insta')) return { bg: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: '#fff', label: 'Instagram', icon: '📸' }
    if (p.includes('indeed')) return { bg: '#2164f3', color: '#fff', label: 'Indeed', icon: '💼' }
    if (p.includes('unstop')) return { bg: '#1c4980', color: '#fff', label: 'Unstop', icon: '🚀' }
    if (p.includes('naukri')) return { bg: '#004c8f', color: '#fff', label: 'Naukri', icon: '📄' }
    return { bg: 'var(--ink)', color: '#fff', label: platform || 'Web', icon: '🌐' }
  }

  const counts = {
    total: jobs.length,
    jobs: jobs.filter((j) => j.type === 'job').length,
    internships: jobs.filter((j) => j.type === 'internship').length,
  }

  return (
    <main>
      <section className="content-section">
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <p className="eyebrow">CAREERS & OPPORTUNITIES HUB</p>
          <h2 style={{ margin: '0 0 8px', fontSize: '32px', letterSpacing: '-1.5px' }}>
            Jobs & Internships
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px', maxWidth: '700px', lineHeight: 1.6 }}>
            Curated opportunities for BCA, BBA, B.Tech, and other degrees verified directly from LinkedIn, Instagram, and top hiring boards.
          </p>
        </div>

        {/* Type Toggle Tabs */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button
            type="button"
            className={filterType === 'all' ? 'primary-button' : 'outline-button'}
            style={{ fontSize: '12px', padding: '9px 18px' }}
            onClick={() => setFilterType('all')}
          >
            All Opportunities ({counts.total})
          </button>
          <button
            type="button"
            className={filterType === 'job' ? 'primary-button' : 'outline-button'}
            style={{ fontSize: '12px', padding: '9px 18px' }}
            onClick={() => setFilterType('job')}
          >
            💼 Full-Time Jobs ({counts.jobs})
          </button>
          <button
            type="button"
            className={filterType === 'internship' ? 'primary-button' : 'outline-button'}
            style={{ fontSize: '12px', padding: '9px 18px' }}
            onClick={() => setFilterType('internship')}
          >
            🎓 Internships ({counts.internships})
          </button>
        </div>

        {/* Search and Branch Quick Filter Strip */}
        <div style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '8px', marginBottom: '28px' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input
              placeholder="Search by job title, company, skills (e.g. React, Marketing, Finance)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: '240px', padding: '12px 14px', border: '1px solid var(--line)', borderRadius: '4px', background: '#fff' }}
            />
            <button className="primary-button" type="submit" style={{ padding: '12px 24px' }}>
              Search
            </button>
            {search && (
              <button
                className="outline-button"
                type="button"
                onClick={() => {
                  setSearch('')
                  const params = new URLSearchParams()
                  if (filterType !== 'all') params.set('type', filterType)
                  if (filterBranch !== 'All Branches') params.set('branch', filterBranch)
                  if (filterPlatform !== 'All') params.set('source', filterPlatform)
                  request(`/jobs?${params.toString()}`, { headers }).then((d) => setJobs(d.jobs || []))
                }}
              >
                Clear
              </button>
            )}
          </form>

          {/* Branch Pill Filter */}
          <div>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              FILTER BY YOUR DEGREE / BRANCH:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PRESET_BRANCHES.map((branch) => {
                const isActive = filterBranch === branch
                return (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => setFilterBranch(branch)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      border: isActive ? '1px solid var(--orange)' : '1px solid var(--line)',
                      background: isActive ? 'var(--orange)' : '#fff',
                      color: isActive ? '#fff' : 'var(--ink)',
                      fontWeight: isActive ? 600 : 400,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {branch}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', marginBottom: '20px', borderRadius: '4px', fontSize: '13px' }}>
            ⚠ {error}
          </div>
        )}

        {/* Opportunities Grid / Cards */}
        {loading ? (
          <div className="empty-state">Finding the latest job and internship openings...</div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <p style={{ margin: 0, fontSize: '16px' }}>No openings found matching your criteria.</p>
            <p style={{ margin: '6px 0 16px', fontSize: '13px', color: 'var(--muted)' }}>
              Try selecting "All Branches" or clearing your search filters to explore all opportunities.
            </p>
            <button
              className="outline-button"
              onClick={() => {
                setFilterType('all')
                setFilterBranch('All Branches')
                setFilterPlatform('All')
                setSearch('')
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '20px' }}>
            {jobs.map((job) => {
              const isInternship = job.type === 'internship'
              const platformBadge = getPlatformBadge(job.source_platform)
              const isExpanded = !!expandedMap[job._id]
              const isLongDescription = job.description && job.description.length > 280

              return (
                <div
                  key={job._id}
                  style={{
                    padding: '24px',
                    background: '#fff',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '18px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      {/* Top Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '4px',
                            background: isInternship ? '#eff6ff' : '#f0fdf4',
                            color: isInternship ? '#1d4ed8' : '#166534',
                            border: `1px solid ${isInternship ? '#bfdbfe' : '#bbf7d0'}`,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {isInternship ? '🎓 Student Internship' : '💼 Full-Time Job'}
                        </span>

                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: '4px',
                            background: platformBadge.bg,
                            color: platformBadge.color,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>{platformBadge.icon}</span>
                          <span>{platformBadge.label}</span>
                        </span>

                        {job.location && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '3px 10px',
                              borderRadius: '4px',
                              background: '#f8fafc',
                              color: '#475569',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            📍 {job.location}
                          </span>
                        )}
                      </div>

                      {/* Job Title & Company */}
                      <h3 style={{ margin: '0 0 6px', fontSize: '20px', color: 'var(--ink)' }}>{job.title}</h3>
                      <p style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 600, color: 'var(--orange)' }}>
                        {job.company}
                      </p>

                      {/* Meta highlights pills */}
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: '#475569', marginBottom: '14px' }}>
                        {job.salary_or_stipend && (
                          <span style={{ padding: '4px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                            💰 <strong>{job.salary_or_stipend}</strong>
                          </span>
                        )}
                        {job.experience && (
                          <span style={{ padding: '4px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                            🎓 <strong>{job.experience}</strong>
                          </span>
                        )}
                        {job.deadline && (
                          <span style={{ padding: '4px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', color: '#991b1b', fontWeight: 500 }}>
                            ⏰ Apply before: {new Date(job.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Target Branches */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Eligible:</span>
                        {job.target_branches?.map((b) => (
                          <span
                            key={b}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              background: '#e0f2fe',
                              border: '1px solid #bae6fd',
                              borderRadius: '12px',
                              color: '#0369a1',
                              fontWeight: 600,
                            }}
                          >
                            {b}
                          </span>
                        ))}
                      </div>

                      {/* Description */}
                      <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                        {isLongDescription && !isExpanded
                          ? `${job.description.slice(0, 280)}...`
                          : job.description}
                      </div>

                      {isLongDescription && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(job._id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--orange)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '4px 0',
                            marginTop: '4px',
                          }}
                        >
                          {isExpanded ? 'Show less ▲' : 'Read full details ▼'}
                        </button>
                      )}
                    </div>

                    {/* Apply Action CTA */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '180px' }}>
                      <a
                        href={job.apply_url}
                        target="_blank"
                        rel="noreferrer"
                        className="primary-button"
                        style={{
                          textAlign: 'center',
                          padding: '12px 18px',
                          fontSize: '13px',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)',
                        }}
                      >
                        <span>Apply / View Source</span>
                        <span>↗</span>
                      </a>

                      <button
                        type="button"
                        className="outline-button"
                        style={{ fontSize: '11px', padding: '8px 12px' }}
                        onClick={() => handleCopyLink(job)}
                      >
                        {copiedId === job._id ? '✓ Link Copied!' : '📋 Share / Copy Link'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
