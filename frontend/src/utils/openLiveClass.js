import { request } from '../api/request'

export async function generateAndOpenLiveClass(classId, token) {
  const meetingWindow = window.open('about:blank', '_blank')
  if (!meetingWindow) {
    throw new Error('Allow pop-ups for this site to open the live class.')
  }

  meetingWindow.opener = null
  try {
    const result = await request(`/live-class/${classId}/generate-meeting`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const meetingUrl = result.meeting_url || result.liveClass?.meeting_url
    if (!meetingUrl || !/^https?:\/\//i.test(meetingUrl)) {
      throw new Error('Google Meet did not return a valid session link.')
    }
    meetingWindow.location.replace(meetingUrl)
    return result
  } catch (error) {
    meetingWindow.close()
    throw error
  }
}

export async function openLiveClassWithAttendance(classId, token) {
  const meetingWindow = window.open('about:blank', '_blank')
  if (!meetingWindow) {
    throw new Error('Allow pop-ups for this site to open the live class and record attendance.')
  }

  meetingWindow.opener = null

  try {
    const result = await request(`/live-class/join/${classId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const meetingUrl = result.meeting_url || result.join_url
    if (!meetingUrl || !/^https?:\/\//i.test(meetingUrl)) {
      throw new Error('The instructor has not published a valid Google Meet link yet.')
    }

    meetingWindow.location.replace(meetingUrl)

    const departureCheck = window.setInterval(() => {
      if (!meetingWindow.closed) return
      window.clearInterval(departureCheck)
      request(`/live-class/leave/${classId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }, 10000)
  } catch (error) {
    meetingWindow.close()
    throw error
  }
}