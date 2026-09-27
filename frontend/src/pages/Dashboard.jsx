import { useAuth } from '../context/AuthContext'
import StudentDashboard from './student/StudentDashboard'
import TeacherDashboard from './teacher/TeacherDashboard'
import AdminDashboard from './admin/AdminDashboard'

export default function Dashboard() {
  const { session } = useAuth()

  if (session?.role === 'STUDENT') {
    return <StudentDashboard />
  }

  if (session?.role === 'TEACHER') {
    return <TeacherDashboard />
  }

  if (session?.role === 'ADMIN') {
    return <AdminDashboard />
  }

  return null
}
