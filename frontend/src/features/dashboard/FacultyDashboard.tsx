import React from 'react';
import { FacultyProfileView } from '../faculty/FacultyProfileView';

interface FacultyDashboardProps {
  setActiveTab?: (tab: string) => void;
  onOpenUploadModal?: () => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = () => {
  return <FacultyProfileView />;
};

export default FacultyDashboard;

