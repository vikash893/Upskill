import React from 'react';
import LiveClassVerificationModal from './LiveClassVerificationModal';

export default function LiveClassModal({ liveClass, onClose }) {
  if (!liveClass?.class_id) {
    if (onClose) onClose();
    return null;
  }

  return (
    <LiveClassVerificationModal
      classId={liveClass.class_id}
      classTitle={liveClass.title}
      courseTitle={liveClass.course_title}
      onClose={onClose}
    />
  );
}
