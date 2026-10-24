import { useEffect, useState } from 'react'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'
import Skeleton from '../components/Skeleton'
import Pagination from '../components/Pagination'
import { getRealtimeSocket } from '../api/realtime'

export default function AdminLogs() {
  const { session } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 25,
    totalRecords: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })

  const fetchLogs = () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (search.trim()) params.set('search', search.trim())

    request(`/admin/logs?${params.toString()}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((data) => {
        setLogs(data.logs || [])
        if (data.pagination) {
          setPagination(data.pagination)
        } else {
          const tot = data.total || (data.logs ? data.logs.length : 0)
          setPagination({
            currentPage: page,
            pageSize: limit,
            totalRecords: tot,
            totalPages: data.pages || Math.ceil(tot / limit) || 1,
            hasNextPage: page * limit < tot,
            hasPreviousPage: page > 1,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchLogs()
  }, [page, limit, search])

  // Real-time audit logs stream via WebSockets
  useEffect(() => {
    const socket = getRealtimeSocket()
    if (!socket) return

    const handleNewLog = (newLog) => {
      // If user is currently on page 1 and no search filter is active or filter matches
      if (page === 1) {
        setLogs((prev) => [newLog, ...prev.slice(0, limit - 1)])
        setPagination((prev) => ({
          ...prev,
          totalRecords: (prev.totalRecords || 0) + 1
        }))
      }
    }

    socket.on('audit:new_log', handleNewLog)
    return () => {
      socket.off('audit:new_log', handleNewLog)
    }
  }, [page, limit, search])

  const handleClear = async () => {
    if (!window.confirm('Clear all system activity logs?')) return
    try {
      await request('/admin/logs/clear', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      })
      setPage(1)
      fetchLogs()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <main>
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SYSTEM SECURITY</p>
            <h2>Audit Trail & Activity Logs</h2>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ font: '11px var(--mono)', color: 'var(--muted)' }}>{pagination.totalRecords} total records</span>
            <button className="outline-button" style={{ borderColor: '#c0392b', color: '#c0392b', fontSize: '11px', padding: '6px 12px' }} onClick={handleClear}>
              Clear Logs
            </button>
          </div>
        </div>

        <input
          type="text"
          placeholder="Filter by user email, role, or path..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          style={{ width: '100%', maxWidth: '400px', padding: '12px', border: '1px solid var(--line)', background: '#FFFFFF', outlineColor: 'var(--orange)', marginBottom: '20px' }}
        />

        {loading ? (
          <Skeleton variant="table" count={6} label="Loading audit logs" />
        ) : logs.length === 0 ? (
          <div className="empty-state">No activity logs found.</div>
        ) : (
          <>
            <div style={{ border: '1px solid var(--line)', background: '#FFFFFF', overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '70px 1.2fr 1.4fr 90px 1.4fr 120px 80px 1.1fr', gap: '8px', padding: '12px 16px', borderBottom: '1px solid var(--line)', font: '10px var(--mono)', color: 'var(--muted)' }}>
                <span>METHOD</span>
                <span>PERSON NAME</span>
                <span>EMAIL ADDRESS</span>
                <span>ROLE</span>
                <span>ENDPOINT PATH</span>
                <span>CLIENT IP</span>
                <span>STATUS</span>
                <span>TIMESTAMP</span>
              </div>

              {logs.map((log) => {
                const isSuccess = log.statusCode >= 200 && log.statusCode < 300
                const isError = log.statusCode >= 400

                return (
                  <div
                    key={log._id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '70px 1.2fr 1.4fr 90px 1.4fr 120px 80px 1.1fr',
                      gap: '8px',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--line)',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ font: '11px var(--mono)', fontWeight: 700, color: log.method === 'GET' ? '#2563eb' : log.method === 'POST' ? '#16a34a' : log.method === 'DELETE' ? '#dc2626' : '#ea580c' }}>
                      {log.method}
                    </span>
                    <strong>{log.name || 'Visitor'}</strong>
                    <span style={{ font: '11px var(--mono)', color: 'var(--muted)' }}>{log.email}</span>
                    <span>
                      <span className="badge" style={{ position: 'static', padding: '2px 6px', fontSize: '9px', background: log.role === 'ADMIN' ? 'var(--orange)' : log.role === 'TEACHER' ? 'var(--lime)' : '#e5e7eb', color: log.role === 'ADMIN' ? 'white' : 'var(--ink)' }}>
                        {log.role || 'GUEST'}
                      </span>
                    </span>
                    <span style={{ font: '11px var(--mono)', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.path}</span>
                    <span style={{ font: '11px var(--mono)', color: 'var(--ink)', fontWeight: 600 }}>{log.ipAddress || '127.0.0.1'}</span>
                    <span>
                      <span
                        className="badge"
                        style={{
                          position: 'static',
                          background: isSuccess ? 'var(--lime)' : isError ? '#fee2e2' : '#f3f4f6',
                          color: isSuccess ? 'var(--ink)' : isError ? '#991b1b' : 'var(--ink)',
                          padding: '3px 8px',
                          fontSize: '10px',
                        }}
                      >
                        {log.statusCode || 200}
                      </span>
                    </span>
                    <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>
                      {new Date(log.createdAt || log.visitedAt).toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>

            <Pagination
              pagination={pagination}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setLimit(newSize)
                setPage(1)
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              itemName="logs"
              loading={loading}
            />
          </>
        )}
      </section>
    </main>
  )
}

