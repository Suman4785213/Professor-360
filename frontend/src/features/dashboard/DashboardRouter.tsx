import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { FacultyDashboard } from './FacultyDashboard';
import { InchargeDashboard } from './InchargeDashboard';
import { HODDashboard } from './HODDashboard';
import { IQACDashboard } from './IQACDashboard';
import { ManagementDashboard } from './ManagementDashboard';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { VerificationRecord } from '../../types';

interface DashboardRouterProps {
  setActiveTab: (tab: string) => void;
  onOpenUploadModal: () => void;
  onOpenReview: (record: VerificationRecord) => void;
  onOpenCreateCollege: () => void;
}

export const DashboardRouter: React.FC<DashboardRouterProps> = ({
  setActiveTab,
  onOpenUploadModal,
  onOpenReview,
  onOpenCreateCollege,
}) => {
  const { user } = useAuthStore();

  switch (user?.role) {
    case 'FACULTY':
      return <FacultyDashboard setActiveTab={setActiveTab} onOpenUploadModal={onOpenUploadModal} />;
    case 'DEPARTMENT_INCHARGE':
      return <InchargeDashboard setActiveTab={setActiveTab} onOpenReview={onOpenReview} />;
    case 'HOD':
      return <HODDashboard setActiveTab={setActiveTab} onOpenReview={onOpenReview} />;
    case 'IQAC':
      return <IQACDashboard setActiveTab={setActiveTab} onOpenReview={onOpenReview} />;
    case 'COLLEGE_MANAGEMENT':
      return <ManagementDashboard />;
    case 'SUPER_ADMIN':
      return (
        <SuperAdminDashboard
          setActiveTab={setActiveTab}
          onOpenCreateCollege={onOpenCreateCollege}
        />
      );
    default:
      return <FacultyDashboard setActiveTab={setActiveTab} onOpenUploadModal={onOpenUploadModal} />;
  }
};
