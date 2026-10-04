import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ScalableLiveClassRoom from '../components/scalable-live-class/ScalableLiveClassRoom';

export default function ScalableLiveClassPage() {
  const { classId } = useParams();
  const { session } = useAuth();
  const token = localStorage.getItem('token') || session?.token || '';

  return (
    <ScalableLiveClassRoom
      classId={classId}
      token={token}
      user={session?.user || session}
    />
  );
}
