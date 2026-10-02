import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'

const audienceLabels = { everyone: 'Everyone', student: 'Student form', teacher: 'Teacher form' }

export default function Forms() {
  const { session } = useAuth()
  const { pathname } = useLocation()
  const isWorkspaceForm = pathname !== '/forms'
  const [forms, setForms] = useState([])
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState({})
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    request('/forms/available', {
      headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
    })
      .then((data) => setForms(data.forms || []))
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false))
  }, [session?.token])

  const updateAnswer = (formId, fieldKey, value) => {
    setAnswers((current) => ({
      ...current,
      [formId]: { ...current[formId], [fieldKey]: value },
    }))
  }

  const submitForm = async (event, form) => {
    event.preventDefault()
    setSending(form._id)
    setError('')
    try {
      await request(`/forms/${form._id}/submissions`, {
        method: 'POST',
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
        body: JSON.stringify({ answers: answers[form._id] || {} }),
      })
      setSubmitted((current) => ({ ...current, [form._id]: true }))
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSending('')
    }
  }

  const renderField = (form, field) => {
    const value = answers[form._id]?.[field.key]
    const inputId = `${form._id}-${field.key}`
    if (field.type === 'checkbox') {
      return (
        <label className="audience-form-check" key={field.key} htmlFor={inputId}>
          <input id={inputId} type="checkbox" required={field.required} checked={Boolean(value)} onChange={(event) => updateAnswer(form._id, field.key, event.target.checked)} />
          <span>{field.label}{field.required ? ' *' : ''}</span>
        </label>
      )
    }

    return (
      <label className="audience-form-field" key={field.key} htmlFor={inputId}>
        <span>{field.label}{field.required ? <b aria-label="required"> *</b> : null}</span>
        {field.type === 'textarea' ? (
          <textarea id={inputId} rows={4} required={field.required} value={value || ''} onChange={(event) => updateAnswer(form._id, field.key, event.target.value)} />
        ) : field.type === 'select' ? (
          <select id={inputId} required={field.required} value={value || ''} onChange={(event) => updateAnswer(form._id, field.key, event.target.value)}>
            <option value="">Choose an option</option>
            {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : (
          <input id={inputId} type={field.type} required={field.required} value={value ?? ''} onChange={(event) => updateAnswer(form._id, field.key, event.target.value)} />
        )}
      </label>
    )
  }

  return (
    <main className={`audience-forms-page ${isWorkspaceForm ? 'workspace-audience-form' : ''}`}>
      <section className="content-section">
        <header className="audience-forms-heading">
          <div><p className="eyebrow">UNI / SKILL FORMS</p><h1>Forms & requests</h1><p>Complete a form below and your response will be sent to the UniSkill team.</p></div>
          <span className="audience-form-count">{forms.length} available</span>
        </header>
        {error && <p className="audience-form-error" role="alert">{error}</p>}
        {loading ? <div className="empty-state">Loading available forms...</div> : forms.length === 0 ? (
          <div className="audience-form-empty"><span>NO OPEN FORMS</span><h2>Nothing to fill out right now.</h2><p>When a form is made available to you, it will appear here.</p></div>
        ) : (
          <div className="audience-form-grid">
            {forms.map((form, index) => (
              <article className="audience-form-card" key={form._id}>
                <header className="audience-form-card-heading">
                  <span className="audience-form-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="audience-form-audience">{audienceLabels[form.audience]}</span>
                </header>
                {submitted[form._id] ? (
                  <div className="audience-form-success" role="status"><span>RESPONSE RECEIVED</span><h2>Thank you.</h2><p>Your response has been submitted successfully.</p></div>
                ) : (
                  <>
                    <h2>{form.title}</h2>
                    {form.description && <p className="audience-form-description">{form.description}</p>}
                    <form onSubmit={(event) => submitForm(event, form)}>
                      <div className="audience-form-fields">{form.fields.map((field) => renderField(form, field))}</div>
                      <button className="primary-button" type="submit" disabled={sending === form._id}>{sending === form._id ? 'Sending...' : 'Submit response'}</button>
                    </form>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .audience-forms-page { font-family: inherit; }
        .audience-forms-page .content-section { padding: 48px 9vw 72px; }
        .workspace-audience-form .content-section { padding: 0 0 28px; }
        .audience-forms-heading { display: flex; justify-content: space-between; align-items: end; gap: 20px; margin-bottom: 24px; }
        .audience-forms-heading h1 { margin: 0; color: var(--ink); font-size: 30px; line-height: 1.2; font-weight: 700; }
        .audience-forms-heading p:not(.eyebrow) { max-width: 520px; margin: 8px 0 0; color: var(--muted); font-size: 14px; line-height: 1.55; }
        .audience-form-count { color: var(--muted); font: 11px var(--mono); white-space: nowrap; }
        .audience-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 390px), 1fr)); gap: 16px; align-items: start; }
        .audience-form-card { min-width: 0; padding: 20px; border: 1px solid var(--line); border-top: 3px solid #147d78; background: #fff; }
        .audience-form-card-heading { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 17px; }
        .audience-form-number { color: #147d78; font: 12px var(--mono); }
        .audience-form-audience { padding: 5px 8px; background: #edf5f3; color: #235c58; font: 10px var(--mono); }
        .audience-form-card h2 { margin: 0; color: var(--ink); font-size: 21px; line-height: 1.3; font-weight: 700; overflow-wrap: anywhere; }
        .audience-form-description { margin: 8px 0 18px; color: var(--muted); font-size: 14px; line-height: 1.55; white-space: pre-wrap; }
        .audience-form-card form { display: grid; gap: 16px; }
        .audience-form-fields { display: grid; gap: 15px; }
        .audience-form-field { display: grid; gap: 6px; color: #405060; font-size: 13px; font-weight: 600; }
        .audience-form-field b { color: #c4503f; }
        .audience-form-field input, .audience-form-field select, .audience-form-field textarea { width: 100%; min-width: 0; border: 1px solid var(--line); border-radius: 4px; padding: 12px 13px; background: #fff; color: var(--ink); font-family: inherit; font-size: 14px; line-height: 1.4; }
        .audience-form-field textarea { resize: vertical; min-height: 96px; }
        .audience-form-check { display: flex; align-items: start; gap: 10px; color: #405060; font-size: 13px; line-height: 1.5; }
        .audience-form-check input { margin: 2px 0 0; accent-color: #147d78; }
        .audience-form-card .primary-button { justify-self: start; padding: 11px 17px; border-radius: 4px; font-size: 13px; }
        .audience-form-error { margin: 0 0 16px; padding: 12px 14px; border: 1px solid #fecaca; background: #fef2f2; color: #991b1b; font-size: 13px; }
        .audience-form-empty { display: grid; min-height: 220px; place-content: center; justify-items: center; gap: 8px; padding: 24px; border: 1px dashed var(--line); background: #fff; text-align: center; }
        .audience-form-empty span, .audience-form-success > span { color: #147d78; font: 10px var(--mono); letter-spacing: 1px; }
        .audience-form-empty h2, .audience-form-success h2 { margin: 0; font-size: 21px; line-height: 1.4; letter-spacing: normal; }
        .audience-form-empty p, .audience-form-success p { max-width: 38ch; margin: 0; color: var(--muted); font-size: 14px; line-height: 1.6; }
        .audience-form-success { padding: 18px 0; }
        @media (max-width: 620px) { .audience-forms-page .content-section { padding: 36px 5vw; } .workspace-audience-form .content-section { padding: 0 0 22px; } .audience-forms-heading { align-items: start; flex-direction: column; margin-bottom: 20px; } .audience-forms-heading h1 { font-size: 27px; } .audience-forms-heading p:not(.eyebrow) { font-size: 13px; } .audience-form-card { padding: 17px; } .audience-form-grid { gap: 12px; } .audience-form-empty { padding: 24px 18px; gap: 10px; } .audience-form-empty h2 { font-size: 20px; } .audience-form-empty p { max-width: 30ch; } }
      `}</style>
    </main>
  )
}