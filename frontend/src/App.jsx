import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import './App.css'

// Shared Components & Layout
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import AuthModal from './components/AuthModal'
import ProtectedRoute from './components/ProtectedRoute'
import WorkspaceLayout from './components/WorkspaceLayout'

// Public & Shared Pages
import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import LearningRoom from './pages/LearningRoom'
import Profile from './pages/Profile'
import Dashboard from './pages/Dashboard'

// Student Distinct Pages
import StudentMyCourses from './pages/student/StudentMyCourses'
import StudentExploreCourses from './pages/student/StudentExploreCourses'
import StudentAssignments from './pages/student/StudentAssignments'
import StudentLiveClasses from './pages/student/StudentLiveClasses'
import StudentPayments from './pages/student/StudentPayments'

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
import StudentCertificates from './pages/student/StudentCertificates'
import AdminTeam from './pages/admin/AdminTeam'
import AdminForms from './pages/admin/AdminForms'
import Forms from './pages/Forms'
import Announcements from './pages/Announcements'

function App() {
  const { session } = useAuth()
  const [authMode, setAuthMode] = useState(null)

  return (
    <>
      {/* Top Navbar on public pages */}
      <Routes>
        <Route path="/" element={<Navbar onAuthOpen={setAuthMode} />} />
        <Route path="/about" element={<Navbar onAuthOpen={setAuthMode} />} />
        <Route path="/contact" element={<Navbar onAuthOpen={setAuthMode} />} />
        <Route path="/courses" element={<Navbar onAuthOpen={setAuthMode} />} />
        <Route path="/course/:courseId" element={<Navbar onAuthOpen={setAuthMode} />} />
        <Route path="/forms" element={<Navbar onAuthOpen={setAuthMode} />} />
        <Route path="*" element={null} />
      </Routes>

      <Routes>
        {/* ========================================================= */}
        {/* PUBLIC ROUTES */}
        {/* ========================================================= */}
        <Route
          path="/"
          element={
            session ? <Navigate to="/dashboard" replace /> : <Home onAuthOpen={setAuthMode} />
          }
        />
        <Route path="/about" element={<About onAuthOpen={setAuthMode} />} />
        <Route path="/contact" element={<Contact />} />
        <Route
          path="/courses"
          element={
            session?.role === 'STUDENT' ? (
              <Navigate to="/student/explore-courses" replace />
            ) : (
              <Courses />
            )
          }
        />
        <Route path="/course/:courseId" element={<CourseDetail onAuthOpen={setAuthMode} />} />
        <Route
          path="/forms"
          element={
            session?.role === 'STUDENT' ? <Navigate to="/student/forms" replace />
              : session?.role === 'TEACHER' ? <Navigate to="/teacher/forms" replace />
                : <Forms />
          }
        />

        <Route path="/admin" element={<Navigate to="/" replace />} />

        {/* FULLSCREEN LEARNING ROOM / CLASSROOM */}
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
        </Route>

        {/* CATCH ALL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Footer on public pages */}
      <Routes>
        <Route path="/" element={<Footer />} />
        <Route path="/about" element={<Footer />} />
        <Route path="/contact" element={<Footer />} />
        <Route path="/courses" element={<Footer />} />
        <Route path="/course/:courseId" element={<Footer />} />
        <Route path="/forms" element={<Footer />} />
        <Route path="*" element={null} />
      </Routes>

      {/* Public Auth Modal (Students and Teachers only) */}
      {authMode && (
        <AuthModal mode={authMode} onClose={() => setAuthMode(null)} />
      )}
    </>
  )
}

export default App
