import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import './App.css'

// Shared Components & Layout
import ProtectedRoute from './components/ProtectedRoute'
import WorkspaceLayout from './components/WorkspaceLayout'

// Authentication
import Auth from './pages/Auth'

// Application Pages
import CourseDetail from './pages/CourseDetail'
import LearningRoom from './pages/LearningRoom'
import Profile from './pages/Profile'
import Dashboard from './pages/Dashboard'
import Forms from './pages/Forms'
import Announcements from './pages/Announcements'

// Student Distinct Pages
import StudentMyCourses from './pages/student/StudentMyCourses'
import StudentExploreCourses from './pages/student/StudentExploreCourses'
import StudentAssignments from './pages/student/StudentAssignments'
import StudentLiveClasses from './pages/student/StudentLiveClasses'
import StudentPayments from './pages/student/StudentPayments'
import StudentJobs from './pages/student/StudentJobs'
import StudentCertificates from './pages/student/StudentCertificates'

// Teacher Distinct Pages
import TeacherCourses from './pages/teacher/TeacherCourses'
import TeacherAssignments from './pages/teacher/TeacherAssignments'
import TeacherLiveStudio from './pages/teacher/TeacherLiveStudio'
import TeacherStudents from './pages/teacher/TeacherStudents'

// Admin Distinct Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminCourses from './pages/AdminCourses'
import AdminTeachers from './pages/AdminTeachers'
import AdminUsers from './pages/AdminUsers'
import AdminPayments from './pages/AdminPayments'
import AdminLogs from './pages/AdminLogs'
import AdminInquiries from './pages/admin/AdminInquiries'
import AdminCertificates from './pages/AdminCertificates'
import AdminTeam from './pages/admin/AdminTeam'
import AdminForms from './pages/admin/AdminForms'
import AdminJobs from './pages/admin/AdminJobs'

function App() {
  const { session } = useAuth()

  return (
    <Routes>
      {/* ========================================================= */}
      {/* ROOT & AUTHENTICATION ROUTES (app.uniskill.in) */}
      {/* ========================================================= */}
      <Route
        path="/"
        element={
          session ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="/login" element={<Auth initialMode="login" />} />
      <Route path="/register" element={<Auth initialMode="register" />} />
      <Route path="/auth" element={<Auth initialMode="login" />} />

      {/* Redirect legacy public routes to internal counterparts or login */}
      <Route
        path="/courses"
        element={
          session?.role === 'STUDENT' ? (
            <Navigate to="/student/explore-courses" replace />
          ) : session ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login?redirect=/student/explore-courses" replace />
          )
        }
      />

      {/* Public/Protected Course Detail */}
      <Route path="/course/:courseId" element={<CourseDetail />} />

      {/* Forms top-level alias */}
      <Route
        path="/forms"
        element={
          session?.role === 'STUDENT' ? (
            <Navigate to="/student/forms" replace />
          ) : session?.role === 'TEACHER' ? (
            <Navigate to="/teacher/forms" replace />
          ) : session?.role === 'ADMIN' ? (
            <Navigate to="/admin/forms" replace />
          ) : (
            <Navigate to="/login?redirect=/forms" replace />
          )
        }
      />

      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

      {/* ========================================================= */}
      {/* FULLSCREEN LEARNING ROOM / CLASSROOM */}
      {/* ========================================================= */}
      <Route
        path="/learning/:courseId"
        element={
          <ProtectedRoute>
            <LearningRoom />
          </ProtectedRoute>
        }
      />

      {/* ========================================================= */}
      {/* PERSISTENT WORKSPACE LAYOUT (WITH FIXED COLLAPSIBLE SIDEBAR) */}
      {/* ========================================================= */}
      <Route
        element={
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      >
        {/* Default Dashboard for all roles */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/announcements" element={<Announcements />} />

        {/* Student Dedicated Routes */}
        <Route
          path="/student/my-courses"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentMyCourses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/explore-courses"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentExploreCourses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/assignments"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentAssignments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/live-classes"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentLiveClasses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/payments"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentPayments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/jobs"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentJobs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/certificates"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentCertificates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/forms"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <Forms />
            </ProtectedRoute>
          }
        />

        {/* Teacher Dedicated Routes */}
        <Route
          path="/teacher/courses"
          element={
            <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
              <TeacherCourses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/assignments"
          element={
            <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
              <TeacherAssignments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/live-studio"
          element={
            <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
              <TeacherLiveStudio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/students"
          element={
            <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
              <TeacherStudents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/forms"
          element={
            <ProtectedRoute allowedRoles={['TEACHER']}>
              <Forms />
            </ProtectedRoute>
          }
        />

        {/* Admin Dedicated Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminPayments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/courses"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminCourses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/teachers"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminTeachers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inquiries"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminInquiries />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/certificates"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminCertificates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/team"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminTeam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/forms"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminForms />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/jobs"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminJobs />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* CATCH ALL */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
