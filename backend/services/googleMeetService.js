const { google } = require('googleapis');

function normalizeGoogleKey(value) {
  return String(value || '').replace(/\\n/g, '\n');
}

function hasRealGoogleValue(value) {
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim();
  if (!normalized) return false;

  const blockedPatterns = ['your_', 'replace_with', 'placeholder', 'changeme', 'test_'];
  const lowerCase = normalized.toLowerCase();

  return !blockedPatterns.some((pattern) => lowerCase.includes(pattern));
}

function getGoogleMeetEnv(env = process.env) {
  const serviceAccountConfigured = Boolean(
    hasRealGoogleValue(env.GOOGLE_SERVICE_ACCOUNT_EMAIL) && hasRealGoogleValue(env.GOOGLE_PRIVATE_KEY)
  );
  const oauthConfigured = Boolean(
    hasRealGoogleValue(env.GOOGLE_CLIENT_ID) &&
      hasRealGoogleValue(env.GOOGLE_CLIENT_SECRET) &&
      hasRealGoogleValue(env.GOOGLE_REDIRECT_URI)
  );

  return {
    enabled: env.GOOGLE_MEET_ENABLED !== 'false' && (serviceAccountConfigured || oauthConfigured),
    serviceAccountConfigured,
    oauthConfigured,
  };
}

function isGoogleMeetConfigured(env = process.env) {
  return getGoogleMeetEnv(env).enabled;
}

function buildGoogleAuth(env = process.env) {
  const config = getGoogleMeetEnv(env);
  if (!config.enabled) {
    return null;
  }

  if (config.serviceAccountConfigured) {
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: normalizeGoogleKey(env.GOOGLE_PRIVATE_KEY),
      },
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/meetings.space.created',
        'https://www.googleapis.com/auth/meetings.space.settings',
      ],
    });
  }

  if (config.oauthConfigured) {
    const auth = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );

    if (env.GOOGLE_ACCESS_TOKEN) {
      auth.setCredentials({
        access_token: env.GOOGLE_ACCESS_TOKEN,
        refresh_token: env.GOOGLE_REFRESH_TOKEN || undefined,
      });
    }

    return auth;
  }

  return null;
}

function buildTeacherGoogleAuth(teacher, env = process.env) {
  if (!teacher || !teacher.google_refresh_token) {
    return null;
  }

  const auth = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  const credentials = {
    refresh_token: teacher.google_refresh_token,
  };

  if (teacher.google_access_token) {
    credentials.access_token = teacher.google_access_token;
  }

  if (teacher.google_token_expiry_date) {
    credentials.expiry_date = new Date(teacher.google_token_expiry_date).getTime();
  }

  auth.setCredentials(credentials);
  return auth;
}

function normalizeAttendeeEmails(attendeeEmails = []) {
  return [...new Set(
    attendeeEmails
      .filter(Boolean)
      .map((email) => String(email).trim().toLowerCase())
      .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  )];
}

function getMeetSpaceResourceName(meetSpaceId, meetingUrl) {
  const storedName = String(meetSpaceId || '').trim();
  if (storedName.startsWith('spaces/')) return storedName;

  let meetingCode = '';
  try {
    meetingCode = new URL(meetingUrl).pathname.split('/').filter(Boolean).pop() || '';
  } catch {}

  const identifier = meetingCode || storedName;
  return identifier ? `spaces/${identifier}` : null;
}

async function getGoogleMeetConferenceStatus({ meetSpaceId, meetingUrl }, teacher = null) {
  const env = process.env;
  if (!getGoogleMeetEnv(env).enabled) {
    return { configured: false, state: 'unavailable', message: 'Google Meet is not configured.' };
  }

  const auth = buildTeacherGoogleAuth(teacher, env);
  const spaceName = getMeetSpaceResourceName(meetSpaceId, meetingUrl);
  if (!auth || !spaceName) {
    return { configured: true, state: 'unavailable', message: 'Teacher Google authorization or Meet space is missing.' };
  }

  const meet = google.meet({ version: 'v2', auth });
  let spaceResponse;
  try {
    spaceResponse = await meet.spaces.get({ name: spaceName });
  } catch (error) {
    if (error?.response?.status === 403 && !String(meetSpaceId || '').startsWith('spaces/')) {
      return {
        configured: true,
        state: 'unsupported',
        message: 'This older Calendar-created Meet space cannot be synced through the Meet API. End it in Google Meet, then confirm the LMS class end.',
      };
    }
    throw error;
  }
  const canonicalSpaceName = spaceResponse.data.name || spaceName;
  const activeConferenceName = spaceResponse.data.activeConference?.conferenceRecord;

  if (activeConferenceName) {
    const recordResponse = await meet.conferenceRecords.get({ name: activeConferenceName });
    const conferenceRecord = recordResponse.data;
    return {
      configured: true,
      state: conferenceRecord.endTime ? 'ended' : 'active',
      endedAt: conferenceRecord.endTime || null,
      conferenceRecordName: conferenceRecord.name,
    };
  }

  const recordsResponse = await meet.conferenceRecords.list({
    filter: `space.name = "${canonicalSpaceName}"`,
    pageSize: 100,
  });
  const conferenceRecords = recordsResponse.data.conferenceRecords || [];
  const latestRecord = conferenceRecords.sort((left, right) =>
    new Date(right.startTime || 0).getTime() - new Date(left.startTime || 0).getTime()
  )[0];

  if (!latestRecord) {
    return { configured: true, state: 'not_started', endedAt: null };
  }

  return {
    configured: true,
    state: latestRecord.endTime ? 'ended' : 'active',
    endedAt: latestRecord.endTime || null,
    conferenceRecordName: latestRecord.name,
  };
}

async function endGoogleMeetConference({ meetSpaceId, meetingUrl }, teacher = null) {
  const env = process.env;
  const auth = buildTeacherGoogleAuth(teacher, env);
  const spaceName = getMeetSpaceResourceName(meetSpaceId, meetingUrl);
  if (!getGoogleMeetEnv(env).enabled || !auth || !spaceName) {
    return { ended: false, message: 'Teacher Google authorization or Meet space is unavailable.' };
  }

  try {
    const meet = google.meet({ version: 'v2', auth });
    await meet.spaces.endActiveConference({ name: spaceName });
    return { ended: true, message: 'Google Meet ended for all participants.' };
  } catch (error) {
    console.error('GOOGLE_MEET_END_CONFERENCE_ERROR:', error?.response?.data || error?.message || error);
    return { ended: false, message: 'Google Meet could not be ended. The LMS class remains live.' };
  }
}

async function syncGoogleMeetRecordingMetadata({
  meetSpaceId,
  calendarEventId,
  liveClass,
}, teacher = null) {
  const env = process.env;
  const googleConfig = getGoogleMeetEnv(env);

  if (!googleConfig.enabled) {
    return {
      synced: false,
      configured: false,
      message: 'Google Meet is not configured for recording sync.',
    };
  }

  const auth = buildTeacherGoogleAuth(teacher, env) || buildGoogleAuth(env);
  if (!auth) {
    return {
      synced: false,
      configured: false,
      message: 'Missing Google authentication for Meet recording sync.',
    };
  }

  const meet = google.meet({ version: 'v2', auth });

  try {
    const calendar = google.calendar({ version: 'v3', auth });
    let resolvedMeetSpaceId = meetSpaceId;

    if (!resolvedMeetSpaceId && calendarEventId) {
      const eventResult = await calendar.events.get({
        calendarId: env.GOOGLE_CALENDAR_ID || 'primary',
        eventId: calendarEventId,
      });
      resolvedMeetSpaceId = eventResult.data?.conferenceData?.conferenceId || null;
    }

    if (!resolvedMeetSpaceId) {
      return {
        synced: false,
        configured: true,
        message: 'No Google Meet space was found for this class yet.',
      };
    }

    const records = await meet.conferenceRecords.list({ pageSize: 20 });
    const match = (records.data.conferenceRecords || []).find((record) => {
      const nameMatches = record.name?.includes(resolvedMeetSpaceId) || record.conferenceId === resolvedMeetSpaceId;
      const idMatches = record.id === resolvedMeetSpaceId;
      return nameMatches || idMatches;
    });

    const recordingItems = (match?.recordings || []).map((recording) => ({
      id: recording.id,
      uri: recording.uri,
      name: recording.name,
      transcriptUri: recording.transcriptUri || null,
      startTime: recording.startTime || null,
      endTime: recording.endTime || null,
    }));

    const transcriptItems = (match?.transcripts || []).map((transcript) => ({
      id: transcript.id,
      name: transcript.name,
      uri: transcript.uri || null,
      content: transcript.content || null,
    }));

    return {
      synced: true,
      configured: true,
      meetSpaceId: resolvedMeetSpaceId,
      recordingCount: recordingItems.length,
      recordings: recordingItems,
      transcripts: transcriptItems,
      conferenceRecord: match || null,
      message: recordingItems.length
        ? 'Google Meet recording metadata synchronized.'
        : 'No recording metadata was available yet for this class.',
      liveClass: liveClass || null,
    };
  } catch (error) {
    console.error('GOOGLE_MEET_SYNC_RECORDING_ERROR:', error?.response?.data || error?.message || error);
    return {
      synced: false,
      configured: true,
      message: 'Google Meet recording sync is unavailable right now.',
      error: error?.message || 'Unknown Meet recording sync failure',
    };
  }
}

async function createGoogleMeetEvent({
  title,
  description = '',
  startTime,
  endTime,
  courseTitle,
  teacherName,
  attendeeEmails = [],
  calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary',
}, teacher = null) {
  const env = process.env;
  const googleConfig = getGoogleMeetEnv(env);

  if (!googleConfig.enabled) {
    return {
      created: false,
      configured: false,
      message: 'Google Meet is not configured. Set GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET or a service account before scheduling classes.',
    };
  }

  const teacherAuth = buildTeacherGoogleAuth(teacher, env);
  if (!teacherAuth) {
    return {
      created: false,
      configured: true,
      connected: false,
      message: 'This teacher must connect Google before creating a Meet session.',
    };
  }

  const safeStart = startTime ? new Date(startTime) : new Date();
  const safeEnd = endTime ? new Date(endTime) : new Date(safeStart.getTime() + 60 * 60 * 1000);
  const normalizedAttendeeEmails = normalizeAttendeeEmails(attendeeEmails);
  const teacherEmail = teacher?.email ? String(teacher.email).trim().toLowerCase() : null;

  // Build attendees list ensuring teacher is marked as accepted host/attendee
  const attendeesList = normalizedAttendeeEmails.map((email) => ({
    email,
    responseStatus: email === teacherEmail ? 'accepted' : 'needsAction',
  }));

  if (teacherEmail && !attendeesList.some((a) => a.email === teacherEmail)) {
    attendeesList.unshift({
      email: teacherEmail,
      responseStatus: 'accepted',
    });
  }

  let space = null;
  try {
    const meet = google.meet({ version: 'v2', auth: teacherAuth });
    const spaceResponse = await meet.spaces.create({
      requestBody: {
        config: {
          accessType: 'RESTRICTED',
          entryPointAccess: 'ALL',
        },
      },
    });
    space = spaceResponse.data;
  } catch (error) {
    console.warn('GOOGLE_MEET_SPACE_CREATE_NOTICE:', error?.response?.status || error?.code || error?.message);
    // Continue even if spaces.create fails; Google Calendar conferenceData will create the Meet conference!
  }

  const calendarEvent = {
    summary: title,
    description: [
      description,
      courseTitle ? `Course: ${courseTitle}` : '',
      teacherName ? `Teacher: ${teacherName}` : '',
      space?.meetingUri ? `Google Meet: ${space.meetingUri}` : '',
    ].filter(Boolean).join('\n'),
    location: space?.meetingUri || '',
    start: {
      dateTime: safeStart.toISOString(),
      timeZone: env.GOOGLE_CALENDAR_TIMEZONE || 'UTC',
    },
    end: {
      dateTime: safeEnd.toISOString(),
      timeZone: env.GOOGLE_CALENDAR_TIMEZONE || 'UTC',
    },
    attendees: attendeesList,
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    guestsCanSeeOtherGuests: false,
    status: 'confirmed',
    visibility: 'private',
    conferenceData: {
      createRequest: {
        requestId: `uniskill_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    },
  };

  if (teacherEmail) {
    calendarEvent.organizer = {
      email: teacherEmail,
      displayName: teacherName || 'Course Instructor',
      self: true,
    };
  }

  let calendarEventResponse = null;
  try {
    const calendar = google.calendar({ version: 'v3', auth: teacherAuth });
    calendarEventResponse = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      resource: calendarEvent,
      sendUpdates: env.GOOGLE_CALENDAR_SEND_UPDATES || 'all',
    });
  } catch (error) {
    console.error('GOOGLE_CALENDAR_EVENT_CREATE_ERROR:', error?.response?.status || error?.code || error?.message);
    if (!space?.meetingUri) {
      return {
        created: false,
        configured: true,
        restricted: true,
        message: 'Google Meet could not be scheduled. Please verify teacher Google permissions and Calendar API.',
      };
    }
  }

  const calendarMeetUrl =
    calendarEventResponse?.data?.hangoutLink ||
    calendarEventResponse?.data?.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ||
    null;

  const resolvedMeetUrl =
    calendarMeetUrl ||
    space?.meetingUri ||
    null;

  const resolvedSpaceId =
    space?.name ||
    calendarEventResponse?.data?.conferenceData?.conferenceId ||
    null;

  if (!resolvedMeetUrl) {
    return {
      created: false,
      configured: true,
      message: 'Google Meet session could not be created. Please check teacher Google permissions and Calendar API.',
    };
  }

  return {
    created: true,
    configured: true,
    eventId: calendarEventResponse?.data?.id || null,
    meetSpaceId: resolvedSpaceId,
    meetUrl: resolvedMeetUrl,
    resource: { space, calendarEvent: calendarEventResponse?.data || null },
    attendeeCount: attendeesList.length,
    accessType: space?.config?.accessType || 'RESTRICTED',
    restricted: true,
    message: 'Google Meet session and Calendar event created successfully with teacher as host.',
  };
}

async function ensureGoogleMeetEventAttendees({
  calendarEventId,
  attendeeEmails = [],
  calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary',
}, teacher = null) {
  const env = process.env;
  const auth = buildTeacherGoogleAuth(teacher, env);
  const normalizedAttendeeEmails = normalizeAttendeeEmails(attendeeEmails);

  if (!calendarEventId || !auth || normalizedAttendeeEmails.length === 0) {
    return { updated: false, attendeeCount: 0 };
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth });
    const eventResult = await calendar.events.get({
      calendarId,
      eventId: calendarEventId,
    });
    const existingAttendees = eventResult.data.attendees || [];
    const existingEmails = new Set(existingAttendees.map((attendee) => String(attendee.email || '').toLowerCase()));
    const missingAttendees = normalizedAttendeeEmails
      .filter((email) => !existingEmails.has(email))
      .map((email) => ({ email, responseStatus: 'accepted' }));

    if (!missingAttendees.length) {
      return { updated: false, attendeeCount: existingAttendees.length };
    }

    const updatedAttendees = [...existingAttendees, ...missingAttendees];
    await calendar.events.patch({
      calendarId,
      eventId: calendarEventId,
      resource: {
        attendees: updatedAttendees,
        guestsCanInviteOthers: false,
        guestsCanModify: false,
        guestsCanSeeOtherGuests: false,
      },
      sendUpdates: env.GOOGLE_CALENDAR_SEND_UPDATES || 'all',
    });

    return { updated: true, attendeeCount: updatedAttendees.length };
  } catch (error) {
    console.warn('GOOGLE_CALENDAR_ATTENDEE_SYNC_ERROR:', error?.response?.status || error?.code || error?.message);
    return { updated: false, attendeeCount: 0, error: error?.message || 'Unable to sync Meet attendee list.' };
  }
}

module.exports = {
  isGoogleMeetConfigured,
  getGoogleMeetEnv,
  buildGoogleAuth,
  buildTeacherGoogleAuth,
  getMeetSpaceResourceName,
  getGoogleMeetConferenceStatus,
  endGoogleMeetConference,
  createGoogleMeetEvent,
  ensureGoogleMeetEventAttendees,
  syncGoogleMeetRecordingMetadata,
};
