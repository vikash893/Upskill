import { useEffect, useState } from 'react'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'

const PRESET_BRANCHES = ['All Branches', 'B.Tech', 'BCA', 'BBA', 'MCA', 'MBA', 'B.Sc', 'B.Com', 'Diploma']
const SOURCE_PLATFORMS = ['LinkedIn', 'Instagram', 'Indeed', 'Unstop', 'Naukri', 'Company Portal', 'Telegram', 'Other']

const emptyForm = {
  title: '',
  type: 'job',
  company: '',
  location: 'Remote',
  source_platform: 'LinkedIn',
  apply_url: '',
  description: '',
  target_branches: ['All Branches'],
  salary_or_stipend: '',
  experience: 'Fresher / Students',
  deadline: '',
  status: 'active',
}

export default function AdminJobs() {
  const { session } = useAuth()
  const headers = { Authorization: `Bearer ${session.token}` }

  const [jobs, setJobs] = useState([])
  const [stats, setStats] = useState({ total_jobs: 0, total_internships: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Form states
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [customBranchInput, setCustomBranchInput] = useState('')

  // Filter states
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterBranch, setFilterBranch] = useState('all')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const fetchJobs = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterType !== 'all') params.set('type', filterType)
      if (filterBranch !== 'all') params.set('branch', filterBranch)
      if (filterPlatform !== 'all') params.set('source', filterPlatform)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (search.trim()) params.set('search', search.trim())

      const data = await request(`/jobs?${params.toString()}`, { headers })
      setJobs(data.jobs || [])
      if (data.stats) setStats(data.stats)
    } catch (err) {
      setError(err.message || 'Failed to load jobs and internships')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [filterType, filterBranch, filterPlatform, filterStatus])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchJobs()
  }

  const handleOpenCreate = () => {
    setForm(emptyForm)
    setEditId(null)
    setIsEditing(true)
    setMessage('')
    setError('')
  }

  const handleOpenEdit = (job) => {
    setForm({
      title: job.title || '',
      type: job.type || 'job',
      company: job.company || '',
      location: job.location || 'Remote',
      source_platform: job.source_platform || 'LinkedIn',
      apply_url: job.apply_url || '',
      description: job.description || '',
      target_branches: job.target_branches?.length ? job.target_branches : ['All Branches'],
      salary_or_stipend: job.salary_or_stipend || '',
      experience: job.experience || 'Fresher / Students',
      deadline: job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '',
      status: job.status || 'active',
    })
    setEditId(job._id)
    setIsEditing(true)
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBranchToggle = (branch) => {
    let current = [...form.target_branches]
    if (branch === 'All Branches') {
      current = ['All Branches']
    } else {
      current = current.filter((b) => b !== 'All Branches')
      if (current.includes(branch)) {
        current = current.filter((b) => b !== branch)
      } else {
        current.push(branch)
      }
      if (current.length === 0) current = ['All Branches']
    }
    setForm({ ...form, target_branches: current })
  }

  const handleAddCustomBranch = (e) => {
    e.preventDefault()
    if (!customBranchInput.trim()) return
    const val = customBranchInput.trim()
    let current = form.target_branches.filter((b) => b !== 'All Branches')
    if (!current.includes(val)) {
      current.push(val)
    }
    setForm({ ...form, target_branches: current })
    setCustomBranchInput('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      if (editId) {
        await request(`/jobs/${editId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(form),
        })
        setMessage('Opportunity updated successfully!')
      } else {
        await request('/jobs', {
          method: 'POST',
          headers,
          body: JSON.stringify(form),
        })
        setMessage('Opportunity posted successfully!')
      }
      setIsEditing(false)
      setForm(emptyForm)
      setEditId(null)
      fetchJobs()
    } catch (err) {
      setError(err.message || 'Failed to save opportunity')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return
    try {
      await request(`/jobs/${id}`, { method: 'DELETE', headers })
      setMessage('Opportunity deleted successfully.')
      fetchJobs()
    } catch (err) {
      setError(err.message || 'Failed to delete opportunity')
    }
  }

  const handleToggleStatus = async (job) => {
    const newStatus = job.status === 'active' ? 'closed' : 'active'
    try {
      await request(`/jobs/${job._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus }),
      })
      setMessage(`Listing marked as ${newStatus}.`)
      fetchJobs()
    } catch (err) {
      setError(err.message || 'Failed to update status')
    }
  }

  const getPlatformBadge = (platform) => {
    const p = (platform || '').toLowerCase()
    if (p.includes('linkedin')) return { bg: '#0077b5', color: '#fff', label: 'LinkedIn' }
    if (p.includes('insta')) return { bg: '#E1306C', color: '#fff', label: 'Instagram' }
    if (p.includes('indeed')) return { bg: '#2164f3', color: '#fff', label: 'Indeed' }
    if (p.includes('unstop')) return { bg: '#1c4980', color: '#fff', label: 'Unstop' }
    if (p.includes('naukri')) return { bg: '#004c8f', color: '#fff', label: 'Naukri' }
    return { bg: 'var(--ink)', color: '#fff', label: platform || 'Link' }
  }

  return (
    <main>
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CAREERS & PLACEMENT PORTAL</p>
            <h2>Jobs & Internships Management</h2>
          </div>
          <button
            className="primary-button"
            onClick={() => {
              if (isEditing) {
                setIsEditing(false)
                setEditId(null)
              } else {
                handleOpenCreate()
              }
            }}
          >
            {isEditing ? 'Cancel Editor' : '+ Post New Job / Internship'}
          </button>
        </div>

        {/* Stats Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '24px' }}>
          <div style={{ padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Full-Time Jobs</span>
            <h3 style={{ margin: '4px 0 0', fontSize: '26px', color: 'var(--ink)' }}>{stats.total_jobs || 0}</h3>
          </div>
          <div style={{ padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Internships</span>
            <h3 style={{ margin: '4px 0 0', fontSize: '26px', color: 'var(--orange)' }}>{stats.total_internships || 0}</h3>
          </div>
          <div style={{ padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Filtered Listings</span>
            <h3 style={{ margin: '4px 0 0', fontSize: '26px', color: '#166534' }}>{jobs.length}</h3>
          </div>
        </div>

        {message && (
          <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', marginBottom: '20px', borderRadius: '4px', fontSize: '13px' }}>
            ✓ {message}
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', marginBottom: '20px', borderRadius: '4px', fontSize: '13px' }}>
            ⚠ {error}
          </div>
        )}

        {/* Create / Edit Form Panel */}
        {isEditing && (
          <div style={{ padding: '30px', border: '1px solid var(--orange)', background: '#fff', marginBottom: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <p className="eyebrow" style={{ color: 'var(--orange)' }}>
              {editId ? 'UPDATE OPPORTUNITY' : 'NEW CAREER OPPORTUNITY'}
            </p>
            <h3 style={{ margin: '0 0 20px', fontSize: '20px' }}>
              {editId ? `Editing: ${form.title}` : 'Post a Job or Internship for Students'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '18px' }}>
              {/* Type Picker */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
                  OPPORTUNITY CATEGORY *
                </label>
                <div className="role-picker" style={{ margin: 0 }}>
                  <button
                    type="button"
                    className={form.type === 'job' ? 'active' : ''}
                    onClick={() => setForm({ ...form, type: 'job' })}
                  >
                    💼 Full-Time / Part-Time Job
                  </button>
                  <button
                    type="button"
                    className={form.type === 'internship' ? 'active' : ''}
                    onClick={() => setForm({ ...form, type: 'internship' })}
                  >
                    🎓 Student Internship
                  </button>
                </div>
              </div>

              {/* Title & Company */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                  Job / Internship Title *
                  <input
                    required
                    placeholder="e.g. Associate Software Engineer, Marketing Intern"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    style={{ padding: '12px', border: '1px solid var(--line)', borderRadius: '4px' }}
                  />
                </label>

                <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                  Company / Organization Name *
                  <input
                    required
                    placeholder="e.g. Infosys, Swiggy, Amazon, Stealth Startup"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    style={{ padding: '12px', border: '1px solid var(--line)', borderRadius: '4px' }}
                  />
                </label>
              </div>

              {/* Source Platform & Apply URL */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                  Source Platform (Where did you find this?) *
                  <select
                    value={form.source_platform}
                    onChange={(e) => setForm({ ...form, source_platform: e.target.value })}
                    style={{ padding: '12px', border: '1px solid var(--line)', borderRadius: '4px', background: '#fff' }}
                  >
                    {SOURCE_PLATFORMS.map((plat) => (
                      <option key={plat} value={plat}>
                        {plat}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                  Direct Source / Application URL *
                  <input
                    required
                    type="url"
                    placeholder="https://linkedin.com/jobs/... or https://instagram.com/p/..."
                    value={form.apply_url}
                    onChange={(e) => setForm({ ...form, apply_url: e.target.value })}
                    style={{ padding: '12px', border: '1px solid var(--line)', borderRadius: '4px' }}
                  />
                </label>
              </div>

              {/* Eligible Branches Multi-Select Chips */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', fontWeight: 600 }}>
                  ELIGIBLE STUDENT BRANCHES / DEGREES (Select all that apply)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  {PRESET_BRANCHES.map((branch) => {
                    const isSelected = form.target_branches.includes(branch)
                    return (
                      <button
                        key={branch}
                        type="button"
                        onClick={() => handleBranchToggle(branch)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          border: isSelected ? '1px solid var(--orange)' : '1px solid var(--line)',
                          background: isSelected ? 'var(--orange)' : '#f9f9f9',
                          color: isSelected ? '#fff' : 'var(--ink)',
                          fontWeight: isSelected ? 600 : 400,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected ? `✓ ${branch}` : `+ ${branch}`}
                      </button>
                    )
                  })}
                </div>

                {/* Custom branch addition */}
                <div style={{ display: 'flex', gap: '8px', maxWidth: '360px' }}>
                  <input
                    placeholder="Add other degree (e.g. B.Des, B.Arch)..."
                    value={customBranchInput}
                    onChange={(e) => setCustomBranchInput(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid var(--line)', borderRadius: '4px', flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomBranch}
                    className="outline-button"
                    style={{ padding: '8px 14px', fontSize: '12px' }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Location, Salary, Experience & Deadline */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                  Location / Mode
                  <input
                    placeholder="e.g. Remote, Noida, Bengaluru"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    style={{ padding: '10px', border: '1px solid var(--line)', borderRadius: '4px' }}
                  />
                </label>

                <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                  Salary / Stipend
                  <input
                    placeholder="e.g. ₹15,000/mo or ₹6-8 LPA"
                    value={form.salary_or_stipend}
                    onChange={(e) => setForm({ ...form, salary_or_stipend: e.target.value })}
                    style={{ padding: '10px', border: '1px solid var(--line)', borderRadius: '4px' }}
                  />
                </label>

                <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                  Experience / Year
                  <input
                    placeholder="e.g. Fresher / 2024-2025"
                    value={form.experience}
                    onChange={(e) => setForm({ ...form, experience: e.target.value })}
                    style={{ padding: '10px', border: '1px solid var(--line)', borderRadius: '4px' }}
                  />
                </label>

                <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                  Last Date to Apply (Optional)
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    style={{ padding: '10px', border: '1px solid var(--line)', borderRadius: '4px' }}
                  />
                </label>
              </div>

              {/* Status */}
              <div>
                <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--muted)', maxWidth: '200px' }}>
                  Listing Status
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    style={{ padding: '10px', border: '1px solid var(--line)', borderRadius: '4px', background: '#fff' }}
                  >
                    <option value="active">Active (Visible to Students)</option>
                    <option value="closed">Closed / Archived</option>
                  </select>
                </label>
              </div>

              {/* Description */}
              <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                Job / Internship Description & Requirements *
                <textarea
                  required
                  rows="6"
                  placeholder="Paste detailed job responsibilities, skills required (e.g. React, Python, Communication), selection process, perks, and how to apply..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ padding: '12px', border: '1px solid var(--line)', borderRadius: '4px', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </label>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button className="primary-button" type="submit" disabled={saving}>
                  {saving ? 'Saving Opportunity...' : editId ? 'Save Changes' : 'Publish Opportunity'}
                </button>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => {
                    setIsEditing(false)
                    setEditId(null)
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '8px', marginBottom: '24px' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Search Keyword</label>
              <input
                placeholder="Search title, company, skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '4px', background: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '4px', background: '#fff' }}
              >
                <option value="all">All Types (Jobs & Internships)</option>
                <option value="job">Jobs Only</option>
                <option value="internship">Internships Only</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Student Branch</label>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '4px', background: '#fff' }}
              >
                <option value="all">All Student Branches</option>
                {PRESET_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Source Platform</label>
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '4px', background: '#fff' }}
              >
                <option value="all">All Platforms</option>
                {SOURCE_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '4px', background: '#fff' }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="closed">Closed Only</option>
              </select>
            </div>

            <button className="outline-button" type="submit" style={{ padding: '10px 18px', height: '42px' }}>
              Filter
            </button>
          </form>
        </div>

        {/* Listings List */}
        {loading ? (
          <div className="empty-state">Loading career opportunities...</div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <p style={{ margin: 0, fontSize: '15px' }}>No jobs or internships found matching your criteria.</p>
            <p style={{ margin: '6px 0 16px', fontSize: '12px', color: 'var(--muted)' }}>
              Create your first posting using the button above.
            </p>
            <button className="primary-button" onClick={handleOpenCreate}>
              + Post First Opportunity
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {jobs.map((job) => {
              const platformBadge = getPlatformBadge(job.source_platform)
              const isInternship = job.type === 'internship'
              const isClosed = job.status === 'closed'

              return (
                <div
                  key={job._id}
                  style={{
                    padding: '22px',
                    background: '#fff',
                    border: `1px solid ${isClosed ? '#e5e7eb' : 'var(--line)'}`,
                    borderRadius: '8px',
                    opacity: isClosed ? 0.75 : 1,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      {/* Badges strip */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '3px',
                            background: isInternship ? '#eff6ff' : '#f0fdf4',
                            color: isInternship ? '#1d4ed8' : '#166534',
                            border: `1px solid ${isInternship ? '#bfdbfe' : '#bbf7d0'}`,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {isInternship ? '🎓 Internship' : '💼 Job (Full-Time)'}
                        </span>

                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '3px',
                            background: platformBadge.bg,
                            color: platformBadge.color,
                          }}
                        >
                          {platformBadge.label}
                        </span>

                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '3px',
                            background: isClosed ? '#fef2f2' : '#f8f9fa',
                            color: isClosed ? '#991b1b' : 'var(--muted)',
                            border: '1px solid var(--line)',
                          }}
                        >
                          {isClosed ? '🔴 Closed' : '🟢 Active'}
                        </span>
                      </div>

                      {/* Title & Company */}
                      <h3 style={{ margin: '0 0 4px', fontSize: '18px', color: 'var(--ink)' }}>{job.title}</h3>
                      <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600, color: 'var(--orange)' }}>
                        {job.company} · <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{job.location}</span>
                      </p>

                      {/* Meta Tags */}
                      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
                        {job.salary_or_stipend && (
                          <span>
                            💵 <strong>{job.salary_or_stipend}</strong>
                          </span>
                        )}
                        {job.experience && (
                          <span>
                            ⏳ <strong>{job.experience}</strong>
                          </span>
                        )}
                        {job.deadline && (
                          <span style={{ color: '#991b1b' }}>
                            📅 Deadline: {new Date(job.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Branches Tags */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Target:</span>
                        {job.target_branches?.map((b) => (
                          <span
                            key={b}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '12px',
                              color: '#334155',
                              fontWeight: 500,
                            }}
                          >
                            {b}
                          </span>
                        ))}
                      </div>

                      {/* Description preview */}
                      <p style={{ margin: 0, fontSize: '13px', color: '#4b5563', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                        {job.description}
                      </p>
                    </div>

                    {/* Actions Box */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px', alignItems: 'stretch' }}>
                      <a
                        href={job.apply_url}
                        target="_blank"
                        rel="noreferrer"
                        className="primary-button"
                        style={{
                          textAlign: 'center',
                          fontSize: '12px',
                          padding: '8px 14px',
                          textDecoration: 'none',
                          display: 'inline-block',
                        }}
                      >
                        Visit Link ↗
                      </a>

                      <button
                        className="outline-button"
                        style={{ fontSize: '11px', padding: '7px 12px' }}
                        onClick={() => handleOpenEdit(job)}
                      >
                        Edit Details
                      </button>

                      <button
                        className="outline-button"
                        style={{ fontSize: '11px', padding: '7px 12px' }}
                        onClick={() => handleToggleStatus(job)}
                      >
                        {isClosed ? 'Reopen Listing' : 'Mark as Closed'}
                      </button>

                      <button
                        className="outline-button"
                        style={{ fontSize: '11px', padding: '7px 12px', borderColor: '#c0392b', color: '#c0392b' }}
                        onClick={() => handleDelete(job._id, job.title)}
                      >
                        Delete
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
