import { request } from '../api/request'

export function getPlatformLiveClassUrl(classId) {
  return `${window.location.origin}/live-class/${encodeURIComponent(classId)}`
}

function openPlatformLiveClass(classId) {
  const meetingWindow = window.open(getPlatformLiveClassUrl(classId), '_blank', 'noopener,noreferrer')
  if (!meetingWindow) {
    window.location.href = getPlatformLiveClassUrl(classId)
  }
  return meetingWindow
}

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
    meetingWindow.location.replace(result.platform_join_url || result.join_url || getPlatformLiveClassUrl(classId))
    return result
  } catch (error) {
    meetingWindow.close()
    throw error
  }
}

export async function openLiveClassWithAttendance(classId) {
  openPlatformLiveClass(classId)
}
