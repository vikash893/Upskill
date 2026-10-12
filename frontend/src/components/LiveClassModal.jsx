import React, { useEffect } from 'react';

export default function LiveClassModal({ liveClass, onClose }) {
  const meetingUrl = liveClass?.platform_join_url || liveClass?.join_url || null;

  useEffect(() => {
    if (!meetingUrl) {
      if (onClose) onClose();
      return;
    }

    const opened = window.open(meetingUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.href = meetingUrl;
    }

    if (onClose) onClose();
  }, [meetingUrl, onClose]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      backgroundColor: 'rgba(15,23,42,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '28px 24px',
        width: 'min(420px, 100%)',
        boxShadow: '0 20px 60px rgba(15,23,42,0.25)',
        textAlign: 'center'
      }}>
        <p className="eyebrow" style={{ margin: 0 }}>GOOGLE MEET</p>
        <h3 style={{ margin: '12px 0 8px', fontSize: '24px' }}>Opening your class</h3>
        <p style={{ color: 'var(--muted)', margin: '0 0 18px' }}>
          {meetingUrl
            ? 'The LMS is opening your secure live class page in a new tab.'
            : 'This class does not have a live class link yet. Please wait for the instructor to publish it.'}
        </p>
        <button className="primary-button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
