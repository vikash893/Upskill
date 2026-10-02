import { useEffect, useState } from 'react'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'

const fieldTypes = [
  { value: 'text', label: 'Short text' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'textarea', label: 'Long answer' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
]

const audienceLabels = { everyone: 'Everyone', student: 'Students', teacher: 'Teachers' }

const createField = () => ({
  key: `field_${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10)}`,
  label: '',
  type: 'text',
  required: false,
  options: [],
})

export default function AdminForms() {
  const { session } = useAuth()
  const headers = { Authorization: `Bearer ${session.token}` }
  const [forms, setForms] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [submissionFilter, setSubmissionFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [view, setView] = useState('builder')
  const visibleCounts = {
    student: forms.filter((form) => form.enabled && ['everyone', 'student'].includes(form.audience)).length,
    teacher: forms.filter((form) => form.enabled && ['everyone', 'teacher'].includes(form.audience)).length,
    everyone: forms.filter((form) => form.enabled && form.audience === 'everyone').length,
  }

  const loadForms = async () => {
    const data = await request('/forms/admin', { headers })
    setForms(data.forms || [])
    return data.forms || []
  }

  useEffect(() => {
    let active = true
    request('/forms/admin', { headers: { Authorization: `Bearer ${session.token}` } })
      .then((data) => {
        if (!active) return
        const availableForms = data.forms || []
        setForms(availableForms)
        if (availableForms.length) {
          setSelectedId(availableForms[0]._id)
          setDraft(availableForms[0])
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [session.token])

  useEffect(() => {
    if (view !== 'submissions') return undefined

    let active = true
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (submissionFilter) params.set('formId', submissionFilter)
    request(`/forms/admin/submissions?${params}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((data) => {
        if (!active) return
        setSubmissions(data.submissions || [])
        setPages(data.pages || 1)
      })
      .catch((loadError) => {
        if (active) setError(loadError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [view, submissionFilter, page, session.token])

  const selectForm = (form) => {
    setSelectedId(form._id)
    setDraft(form)
    setMessage('')
    setError('')
  }

  const createForm = async () => {
    setError('')
    setMessage('')
    try {
      const data = await request('/forms/admin', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: 'New form', audience: 'everyone', enabled: false, fields: [] }),
      })
      const availableForms = await loadForms()
      const created = availableForms.find((form) => form._id === data.form._id) || data.form
      setSelectedId(created._id)
      setDraft(created)
      setMessage('Draft form created. Add fields and save when ready.')
      setView('builder')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  const saveForm = async () => {
    if (!draft) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await request(`/forms/admin/${draft._id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          audience: draft.audience,
          enabled: draft.enabled,
          fields: draft.fields,
        }),
      })
      const availableForms = await loadForms()
      const saved = availableForms.find((form) => form._id === data.form._id) || data.form
      setSelectedId(saved._id)
      setDraft(saved)
      setMessage('Form saved.')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const setPublished = async (enabled) => {
    if (!draft || saving) return

    const currentDraft = draft
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = enabled
        ? {
            title: currentDraft.title,
            description: currentDraft.description,
            audience: currentDraft.audience,
            fields: currentDraft.fields,
            enabled: true,
          }
        : { enabled: false }
      const data = await request(`/forms/admin/${currentDraft._id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      })

      setDraft((current) => enabled ? data.form : { ...current, enabled: false })
      setForms((current) => current.map((form) => form._id === currentDraft._id
        ? { ...form, ...(enabled ? data.form : {}), enabled }
        : form))
      setMessage(enabled ? 'Form published and available to its selected audience.' : 'Form unpublished and no longer available.')
    } catch (saveError) {
      setDraft((current) => ({ ...current, enabled: currentDraft.enabled }))
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (key, patch) => {
    setDraft((current) => ({
      ...current,
      fields: current.fields.map((field) => field.key === key ? { ...field, ...patch } : field),
    }))
  }

  const addField = () => setDraft((current) => ({ ...current, fields: [...current.fields, createField()] }))
  const removeField = (key) => setDraft((current) => ({ ...current, fields: current.fields.filter((field) => field.key !== key) }))

  const changeSubmissionFilter = (formId) => {
    setLoading(true)
    setSubmissionFilter(formId)
    setPage(1)
  }

  return (
    <main className="admin-forms-page">
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FORM OPERATIONS</p>
            <h2>Forms</h2>
          </div>
          <p className="section-note">Configure what each audience sees and collect every response in one place.</p>
        </div>

        <div className="form-manager-tabs" role="tablist" aria-label="Form manager views">
          <button type="button" role="tab" aria-selected={view === 'builder'} className={view === 'builder' ? 'active' : ''} onClick={() => setView('builder')}>Form builder</button>
          <button type="button" role="tab" aria-selected={view === 'submissions'} className={view === 'submissions' ? 'active' : ''} onClick={() => setView('submissions')}>Submissions</button>
        </div>

        <div className="form-audience-summary" aria-label="Published form availability">
          <span>Students <strong>{visibleCounts.student}</strong></span>
          <span>Teachers <strong>{visibleCounts.teacher}</strong></span>
          <span>Everyone <strong>{visibleCounts.everyone}</strong></span>
        </div>

        {error && <p className="form-manager-alert error" role="alert">{error}</p>}
        {message && <p className="form-manager-alert success" role="status">{message}</p>}
        {!loading && visibleCounts.student === 0 && (
          <p className="form-manager-alert info" role="status">Students currently have no published forms. Add fields, choose Students or Everyone, then turn on Published.</p>
        )}

        {view === 'builder' ? (
          <div className="form-builder-layout">
            <aside className="form-list-panel">
              <div className="form-list-heading">
                <div>
                  <p className="eyebrow">YOUR FORMS</p>
                  <h3>{forms.length} configured</h3>
                </div>
                <button type="button" className="primary-button form-add-button" onClick={createForm} title="Create form" aria-label="Create form">+</button>
              </div>
              {loading ? (
                <div className="form-list-empty">Loading forms...</div>
              ) : forms.length ? (
                <div className="form-list-items">
                  {forms.map((form) => (
                    <button type="button" key={form._id} className={`form-list-item ${selectedId === form._id ? 'selected' : ''}`} onClick={() => selectForm(form)}>
                      <span className={`form-state-dot ${form.enabled ? 'on' : ''}`} />
                      <span className="form-list-item-copy"><strong>{form.title}</strong><small>{form.enabled ? 'Published' : 'Draft'} · {audienceLabels[form.audience]} · {form.submission_count || 0} responses</small></span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="form-list-empty">Create your first form to begin.</div>
              )}
            </aside>

            {draft ? (
              <section className="form-editor-panel">
                <div className="form-editor-heading">
                  <div>
                    <p className="eyebrow">FORM SETTINGS</p>
                    <h3>Edit form</h3>
                  </div>
                  <label className={`form-enable-control ${draft.enabled ? 'enabled' : ''}`}>
                    <span>{saving ? 'Saving...' : draft.enabled ? 'Published' : 'Draft'}</span>
                    <input type="checkbox" checked={draft.enabled} disabled={saving} onChange={(event) => setPublished(event.target.checked)} aria-label="Publish this form" />
                  </label>
                </div>

                <div className="form-meta-grid">
                  <label className="form-manager-label form-title-field">Form title
                    <input value={draft.title} maxLength={120} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
                  </label>
                  <label className="form-manager-label">Audience
                    <select value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })}>
                      <option value="student">Students</option>
                      <option value="teacher">Teachers</option>
                      <option value="everyone">Everyone</option>
                    </select>
                  </label>
                  <label className="form-manager-label form-title-field">Description
                    <textarea rows={2} maxLength={1200} value={draft.description || ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
                  </label>
                </div>

                <div className="form-fields-heading">
                  <div><p className="eyebrow">QUESTIONS</p><h3>{draft.fields.length} fields</h3></div>
                  <button type="button" className="outline-button form-add-field" onClick={addField}>+ Add field</button>
                </div>

                <div className="form-fields-list">
                  {draft.fields.map((field, index) => (
                    <article className="form-field-editor" key={field.key}>
                      <div className="form-field-index">{String(index + 1).padStart(2, '0')}</div>
                      <div className="form-field-controls">
                        <div className="form-field-topline">
                          <label className="form-manager-label">Field label
                            <input value={field.label} placeholder="e.g. Full name" maxLength={120} onChange={(event) => updateField(field.key, { label: event.target.value })} />
                          </label>
                          <label className="form-manager-label">Answer type
                            <select value={field.type} onChange={(event) => updateField(field.key, { type: event.target.value, options: event.target.value === 'select' ? (field.options?.length ? field.options : ['Option 1']) : [] })}>
                              {fieldTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                            </select>
                          </label>
                        </div>
                        {field.type === 'select' && (
                          <label className="form-manager-label">Dropdown options <span className="form-field-hint">One option per line</span>
                            <textarea rows={3} value={(field.options || []).join('\n')} onChange={(event) => updateField(field.key, { options: event.target.value.split('\n') })} />
                          </label>
                        )}
                        <div className="form-field-bottomline">
                          <label className="form-required-control"><input type="checkbox" checked={field.required} onChange={(event) => updateField(field.key, { required: event.target.checked })} /> Required</label>
                          <button type="button" className="form-remove-field" onClick={() => removeField(field.key)} aria-label={`Remove ${field.label || 'field'}`}>Remove</button>
                        </div>
                      </div>
                    </article>
                  ))}
                  {draft.fields.length === 0 && <div className="form-fields-empty">This form has no questions yet. Add at least one field before enabling it.</div>}
                </div>

                <div className="form-save-bar">
                  <span>Responses are visible in the submissions view.</span>
                  <button type="button" className="primary-button" disabled={saving} onClick={saveForm}>{saving ? 'Saving...' : 'Save form'}</button>
                </div>
              </section>
            ) : (
              <section className="form-editor-empty"><span>FORM / BUILDER</span><h3>Select a form or create one.</h3><p>Build a form, choose its audience, and decide which answers are required.</p></section>
            )}
          </div>
        ) : (
          <section className="form-submissions-panel">
            <div className="form-submissions-heading">
              <div><p className="eyebrow">RESPONSE INBOX</p><h3>Submitted data</h3></div>
              <label className="form-manager-label">Filter by form
                <select value={submissionFilter} onChange={(event) => changeSubmissionFilter(event.target.value)}>
                  <option value="">All forms</option>
                  {forms.map((form) => <option key={form._id} value={form._id}>{form.title}</option>)}
                </select>
              </label>
            </div>
            {loading ? <div className="empty-state">Loading submissions...</div> : submissions.length === 0 ? <div className="empty-state">No submissions for this form yet.</div> : (
              <div className="form-submission-list">
                {submissions.map((submission) => {
                  const form = forms.find((item) => item._id === submission.form_id)
                  const labels = new Map((form?.fields || []).map((field) => [field.key, field.label]))
                  return (
                    <article className="form-submission-row" key={submission._id}>
                      <header className="form-submission-header">
                        <div><p className="eyebrow">{submission.form_title}</p><h4>{submission.respondent_name || 'Anonymous response'}</h4><span>{submission.respondent_email || submission.respondent_role}</span></div>
                        <time dateTime={submission.createdAt}>{new Date(submission.createdAt).toLocaleString()}</time>
                      </header>
                      <dl className="form-submission-answers">
                        {Object.entries(submission.answers || {}).map(([key, value]) => (
                          <div key={key}><dt>{labels.get(key) || key}</dt><dd>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</dd></div>
                        ))}
                      </dl>
                    </article>
                  )
                })}
              </div>
            )}
            {pages > 1 && <div className="form-pagination"><button type="button" className="outline-button" disabled={page <= 1} onClick={() => { setLoading(true); setPage(page - 1) }}>Previous</button><span>Page {page} of {pages}</span><button type="button" className="outline-button" disabled={page >= pages} onClick={() => { setLoading(true); setPage(page + 1) }}>Next</button></div>}
          </section>
        )}
      </section>

      <style>{`
        .admin-forms-page .content-section { padding-top: 52px; }
        .form-manager-tabs { display: flex; gap: 5px; padding: 4px; width: fit-content; margin: -20px 0 22px; border: 1px solid var(--line); background: #f1f4f6; border-radius: 5px; }
        .form-manager-tabs button { border: 0; padding: 9px 15px; color: var(--muted); background: transparent; border-radius: 3px; font: 11px var(--mono); cursor: pointer; }
        .form-manager-tabs button.active { background: #fff; color: var(--ink); box-shadow: 0 1px 4px #132b3a16; }
        .form-manager-alert { padding: 11px 14px; border: 1px solid; font-size: 12px; }
        .form-manager-alert.error { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
        .form-manager-alert.success { border-color: #bbf7d0; background: #f0fdf4; color: #166534; }
        .form-manager-alert.info { border-color: #d9c89f; background: #faf7ef; color: #6b5731; }
        .form-audience-summary { display: flex; flex-wrap: wrap; gap: 9px; margin: -8px 0 16px; }
        .form-audience-summary span { display: inline-flex; align-items: center; gap: 8px; padding: 6px 9px; border: 1px solid var(--line); background: #fff; color: var(--muted); font: 9px var(--mono); }
        .form-audience-summary strong { color: var(--ink); font-size: 11px; }
        .form-builder-layout { display: grid; grid-template-columns: minmax(220px, .35fr) minmax(0, 1fr); gap: 17px; align-items: start; }
        .form-list-panel, .form-editor-panel, .form-submissions-panel { min-width: 0; padding: 20px; border: 1px solid var(--line); background: #fff; }
        .form-list-heading, .form-editor-heading, .form-fields-heading, .form-submissions-heading { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
        .form-list-heading h3, .form-editor-heading h3, .form-fields-heading h3, .form-submissions-heading h3 { margin: 0; font-size: 19px; }
        .form-list-heading .eyebrow, .form-editor-heading .eyebrow, .form-fields-heading .eyebrow, .form-submissions-heading .eyebrow { margin-bottom: 6px; font-size: 9px; }
        .form-add-button { width: 34px; height: 34px; padding: 0; border-radius: 4px; font-size: 20px; line-height: 1; }
        .form-list-items { display: grid; gap: 5px; margin-top: 17px; }
        .form-list-item { display: flex; width: 100%; align-items: center; gap: 9px; padding: 11px 9px; text-align: left; border: 1px solid transparent; border-radius: 4px; background: transparent; cursor: pointer; }
        .form-list-item.selected { border-color: #c4d5dc; background: #f2f7f8; }
        .form-state-dot { flex: 0 0 8px; width: 8px; height: 8px; border-radius: 50%; background: #aeb7be; }
        .form-state-dot.on { background: #168069; box-shadow: 0 0 0 3px #16806918; }
        .form-list-item-copy { display: grid; min-width: 0; gap: 4px; }
        .form-list-item-copy strong { overflow: hidden; color: var(--ink); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
        .form-list-item-copy small { color: var(--muted); font-size: 10px; }
        .form-list-empty { padding: 22px 6px; color: var(--muted); font-size: 11px; line-height: 1.6; }
        .form-editor-heading { padding-bottom: 16px; border-bottom: 1px solid var(--line); }
        .form-enable-control { display: inline-flex; align-items: center; gap: 9px; color: var(--muted); font-size: 11px; cursor: pointer; }
        .form-enable-control.enabled { color: #16755f; }
        .form-enable-control input, .form-required-control input { accent-color: #137c73; }
        .form-meta-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(150px, .6fr); gap: 12px; padding: 17px 0; }
        .form-title-field { grid-column: 1 / -1; }
        .form-manager-label { display: grid; min-width: 0; gap: 6px; color: var(--muted); font-size: 10px; font-weight: 600; }
        .form-manager-label input, .form-manager-label select, .form-manager-label textarea { width: 100%; min-width: 0; padding: 10px 11px; border: 1px solid var(--line); border-radius: 3px; background: #fff; color: var(--ink); font: inherit; font-size: 12px; }
        .form-manager-label textarea { resize: vertical; }
        .form-fields-heading { padding: 14px 0; border-top: 1px solid var(--line); }
        .form-add-field { padding: 8px 11px; border-radius: 4px; font-size: 10px; }
        .form-fields-list { display: grid; gap: 9px; }
        .form-field-editor { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 10px; padding: 13px; border: 1px solid #e2e7ea; background: #fbfcfc; }
        .form-field-index { color: #81909a; font: 10px var(--mono); padding-top: 9px; }
        .form-field-controls { display: grid; gap: 10px; }
        .form-field-topline { display: grid; grid-template-columns: minmax(0, 1fr) minmax(140px, .45fr); gap: 10px; }
        .form-field-hint { color: #89949d; font-weight: 400; }
        .form-field-bottomline { display: flex; justify-content: space-between; align-items: center; }
        .form-required-control { display: inline-flex; align-items: center; gap: 7px; color: var(--ink); font-size: 10px; cursor: pointer; }
        .form-remove-field { border: 0; background: transparent; color: #a23b3b; font-size: 10px; cursor: pointer; }
        .form-fields-empty, .form-editor-empty { padding: 30px 14px; border: 1px dashed var(--line); color: var(--muted); font-size: 11px; line-height: 1.6; }
        .form-editor-empty { min-height: 220px; display: grid; place-content: center; justify-items: center; text-align: center; }
        .form-editor-empty span { color: #76929a; font: 9px var(--mono); }
        .form-editor-empty h3 { margin: 9px 0; color: var(--ink); font-size: 18px; }
        .form-editor-empty p { max-width: 280px; margin: 0; }
        .form-save-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 16px; padding-top: 15px; border-top: 1px solid var(--line); }
        .form-save-bar span { color: var(--muted); font-size: 10px; }
        .form-save-bar .primary-button { padding: 10px 17px; border-radius: 4px; font-size: 11px; }
        .form-submissions-heading { align-items: end; margin-bottom: 16px; }
        .form-submissions-heading .form-manager-label { width: min(280px, 48%); }
        .form-submission-list { display: grid; gap: 10px; }
        .form-submission-row { padding: 16px; border: 1px solid var(--line); background: #fff; }
        .form-submission-header { display: flex; justify-content: space-between; align-items: start; gap: 14px; padding-bottom: 12px; border-bottom: 1px solid #e8edef; }
        .form-submission-header .eyebrow { margin-bottom: 5px; font-size: 9px; }
        .form-submission-header h4 { margin: 0 0 4px; color: var(--ink); font-size: 14px; }
        .form-submission-header span, .form-submission-header time { color: var(--muted); font-size: 10px; }
        .form-submission-header time { text-align: right; white-space: nowrap; }
        .form-submission-answers { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px 20px; margin: 12px 0 0; }
        .form-submission-answers dt { color: var(--muted); font-size: 9px; text-transform: uppercase; }
        .form-submission-answers dd { overflow-wrap: anywhere; margin: 4px 0 0; color: var(--ink); font-size: 11px; }
        .form-pagination { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 18px; font-size: 11px; }
        .form-pagination .outline-button { padding: 7px 11px; border-radius: 4px; font-size: 10px; }
        @media (max-width: 900px) { .form-builder-layout { grid-template-columns: 1fr; } .form-list-items { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); } }
        @media (max-width: 600px) { .admin-forms-page .content-section { padding: 34px 5vw; } .form-list-panel, .form-editor-panel, .form-submissions-panel { padding: 15px; } .form-meta-grid, .form-field-topline { grid-template-columns: 1fr; } .form-title-field { grid-column: auto; } .form-submissions-heading, .form-submission-header { align-items: stretch; flex-direction: column; } .form-submissions-heading .form-manager-label { width: 100%; } .form-submission-header time { text-align: left; } .form-save-bar { align-items: stretch; flex-direction: column; } }
      `}</style>
    </main>
  )
}