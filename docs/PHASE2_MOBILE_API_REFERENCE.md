## Source-derived endpoint and schema reference

Generated from registered URL callbacks and serializer fields without database reads. Paths below use canonical /api/v1/. HEAD/OPTIONS are omitted. Request expressions preserve actual defaults; response expressions identify exact JSON keys or the serializer/service returning them. Model foreign keys are UUIDs. SerializerMethodField values are defined in the linked source. Common status/error/pagination rules above apply.

### GET /api/v1/auth/me/

Handler: `apps.accounts.views.MeView.get`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: MeSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Standard DRF get response using the serializer.
```

### GET /api/v1/auth/faculty/profile/

Handler: `apps.accounts.views.FacultyProfileView.get`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: FacultyProfileSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Standard DRF get response using the serializer.
```

### GET /api/v1/auth/faculty/profiles/

Handler: `apps.accounts.views.FacultyProfileViewSet.list`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: FacultyProfileSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/auth/faculty/profiles/{pk}/

Handler: `apps.accounts.views.FacultyProfileViewSet.retrieve`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: FacultyProfileSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/colleges/public/

Handler: `apps.colleges.views.CollegeViewSet.public_colleges`. Base permissions: AllowAny. Apply role/scope rules above and source guards below.
Serializer: CollegeSerializer.
Inputs: `request.query_params.get('q', '').strip()`; `request.query_params.get('search', '').strip()`; `request.query_params.get('q', '')`; `request.query_params.get('search', '')`.
Response construction:
```python
Response({'results': data, 'count': len(data)})
```

### GET /api/v1/activities/

Handler: `apps.activities.views.ActivityViewSet.list`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ActivitySerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/activities/{pk}/

Handler: `apps.activities.views.ActivityViewSet.retrieve`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ActivitySerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/activity-categories/

Handler: `apps.activities.views.ActivityCategoryViewSet.list`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ActivityCategorySerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/activity-categories/{pk}/

Handler: `apps.activities.views.ActivityCategoryViewSet.retrieve`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ActivityCategorySerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/document-categories/

Handler: `apps.activities.views.DocumentCategoryViewSet.list`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: DocumentCategorySerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/document-categories/{pk}/

Handler: `apps.activities.views.DocumentCategoryViewSet.retrieve`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: DocumentCategorySerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/documents/

Handler: `apps.activities.views.DocumentViewSet.list`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: DocumentSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/documents/{pk}/

Handler: `apps.activities.views.DocumentViewSet.retrieve`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: DocumentSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/documents/{pk}/download/

Handler: `apps.activities.views.DocumentViewSet.download`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: DocumentSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
FileResponse(doc.file.open('rb'), content_type=doc.mime_type or 'application/octet-stream', as_attachment=True, filename=filename)
```

### GET /api/v1/documents/{pk}/preview/

Handler: `apps.activities.views.DocumentViewSet.preview`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: DocumentSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
FileResponse(doc.file.open('rb'), content_type=doc.mime_type or 'application/pdf', as_attachment=False)
```

### GET /api/v1/verifications/

Handler: `apps.verification.views.VerificationViewSet.list`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: VerificationRecordSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/verifications/{pk}/

Handler: `apps.verification.views.VerificationViewSet.retrieve`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: VerificationRecordSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/evidence/

Handler: `apps.evidence.views.EvidenceViewSet.list`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/evidence/export/

Handler: `apps.evidence.views.EvidenceViewSet.export`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: `request.query_params.get('format', 'csv').lower()`; `request.query_params.get('format', 'csv')`.
Response construction:
```python
Standard DRF export response using the serializer.
```

### GET /api/v1/evidence/stats/

Handler: `apps.evidence.views.EvidenceViewSet.stats`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(stats_data)
Response({'detail': 'User has no assigned institution.'}, status=status.HTTP_400_BAD_REQUEST)
```

### GET /api/v1/evidence/{pk}/

Handler: `apps.evidence.views.EvidenceViewSet.retrieve`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/report-types/

Handler: `apps.reports.views.ReportTypeViewSet.list`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ReportTypeSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/report-types/{pk}/

Handler: `apps.reports.views.ReportTypeViewSet.retrieve`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ReportTypeSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/report-templates/

Handler: `apps.reports.views.ReportTemplateViewSet.list`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ReportTemplateSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/report-templates/placeholders/

Handler: `apps.reports.views.ReportTemplateViewSet.placeholders`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ReportTemplateSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response([{'token': '{{college_name}}', 'label': 'College Name', 'category': 'Institution', 'description': 'Full accredited name of the institution'}, {'token': '{{report_title}}', 'label': 'Report Title', 'category': 'Report Meta', 'description': 'Auto-generated report title with department and cycle'}, {'token': '{{academic_year}}', 'label': 'Academic Year', 'category': 'Scope', 'description': 'Selected academic cycle (e.g. 2025-26)'}, {'token': '{{department_name}}', 'label': 'Department Name', 'category': 'Scope', 'description': 'Name of contributing department or college scope'}, {'token': '{{generated_by}}', 'label': 'Generated By', 'category': 'Audit', 'description': 'Name of the authorized IQAC officer or faculty'}, {'token': '{{generated_date}}', 'label': 'Generated Date', 'category': 'Audit', 'description': 'Current date of report generation'}, {'token': '{{total_records}}', 'label': 'Total Records Count', 'category': 'Report Meta', 'description': 'Total number of verified institutional items in report'}, {'token': '{{#activities}} ... {{/activities}}', 'label': 'Repeatable Activities Table Loop', 'category': 'Data Table', 'description': 'Wraps table rows to repeat for every verified activity in dataset'}, {'token': '{{sl_no}}', 'label': 'Serial Number', 'category': 'Activity Field', 'description': 'Row sequence index (1, 2, 3...)'}, {'token': '{{faculty_name}}', 'label': 'Faculty Member', 'category': 'Activity Field', 'description': 'Full name of the faculty participant'}, {'token': '{{employee_id}}', 'label': 'Employee ID', 'category': 'Activity Field', 'description': 'Institutional faculty employee code'}, {'token': '{{activity_title}}', 'label': 'Activity / Certificate Title', 'category': 'Activity Field', 'description': 'Title of verified activity'}, {'token': '{{activity_category}}', 'label': 'Activity Category', 'category': 'Activity Field', 'description': 'Category name (FDP, Workshop, Publication, etc.)'}, {'token': '{{date}}', 'label': 'Activity Date Range', 'category': 'Activity Field', 'description': 'Formatted date span or single event date'}, {'token': '{{duration}}', 'label': 'Duration', 'category': 'Activity Field', 'description': 'Duration in days or hours'}, {'token': '{{organizer}}', 'label': 'Host / Organizer', 'category': 'Activity Field', 'description': 'Organizing university, body, or industry partner'}])
```

### GET /api/v1/report-templates/{pk}/

Handler: `apps.reports.views.ReportTemplateViewSet.retrieve`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ReportTemplateSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/reports/downloaded-history/

Handler: `apps.reports.views.ReportViewSet.downloaded_history`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: GeneratedReportListSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'results': results})
Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
Response({'results': []})
```

### GET /api/v1/reports/history/

Handler: `apps.reports.views.ReportViewSet.history`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: GeneratedReportListSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/reports/hod-downloaded-reports/

Handler: `apps.reports.views.ReportViewSet.hod_downloaded_reports`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: GeneratedReportListSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'results': results})
Response({'error': 'Unauthorized. Only HOD can access this endpoint.'}, status=status.HTTP_403_FORBIDDEN)
Response({'results': []})
```

### GET /api/v1/reports/hod-reports/

Handler: `apps.reports.views.ReportViewSet.hod_reports`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: GeneratedReportListSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'results': results})
Response({'error': 'Unauthorized. Only HOD can access this endpoint.'}, status=status.HTTP_403_FORBIDDEN)
Response({'results': []})
```

### GET /api/v1/reports/incharge-stored-reports/

Handler: `apps.reports.views.ReportViewSet.incharge_stored_reports`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: GeneratedReportListSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'results': results})
Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
Response({'results': []})
```

### GET /api/v1/reports/{pk}/download/

Handler: `apps.reports.views.ReportViewSet.download`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: GeneratedReportListSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
FileResponse(report.file.open('rb'), content_type=mime_type)
```

### GET /api/v1/notifications/

Handler: `apps.notifications.views.NotificationViewSet.list`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: NotificationSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/notifications/incharge-requests/

Handler: `apps.notifications.views.NotificationViewSet.incharge_requests`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: NotificationSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'results': results})
Response({'results': []})
```

### GET /api/v1/notifications/unread-count/

Handler: `apps.notifications.views.NotificationViewSet.unread_count`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: NotificationSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'unread_count': count})
```

### GET /api/v1/notifications/preferences/

Handler: `apps.notifications.views.NotificationViewSet.user_preferences`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: NotificationSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/notifications/{pk}/

Handler: `apps.notifications.views.NotificationViewSet.retrieve`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: NotificationSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/tasks/

Handler: `apps.notifications.views.IQACTaskViewSet.list`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/tasks/deadlines/

Handler: `apps.notifications.views.IQACTaskViewSet.deadlines`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(deadlines_data)
```

### GET /api/v1/tasks/{pk}/

Handler: `apps.notifications.views.IQACTaskViewSet.retrieve`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### GET /api/v1/tasks/{pk}/activities/

Handler: `apps.notifications.views.IQACTaskViewSet.activities`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(TaskActivitySerializer(acts, many=True).data)
```

### GET /api/v1/tasks/{pk}/comments/

Handler: `apps.notifications.views.IQACTaskViewSet.comments`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: `request.data.get('comment', '').strip()`; `request.data.get('comment', '')`.
Response construction:
```python
Response(TaskCommentSerializer(comments_qs, many=True).data)
Response(TaskCommentSerializer(comment_obj).data, status=status.HTTP_201_CREATED)
Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
Response({'error': 'Comment cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
```

### GET /api/v1/work-queue/faculty/

Handler: `apps.notifications.views.WorkQueueViewSet.faculty_workspace`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(data)
Response({'error': 'Access restricted to Faculty.'}, status=status.HTTP_403_FORBIDDEN)
```

### GET /api/v1/work-queue/hod/

Handler: `apps.notifications.views.WorkQueueViewSet.hod_queue`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(data)
Response({'error': 'Access restricted to Heads of Department.'}, status=status.HTTP_403_FORBIDDEN)
```

### GET /api/v1/work-queue/incharge/

Handler: `apps.notifications.views.WorkQueueViewSet.incharge_queue`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(data)
Response({'error': 'Access restricted to Department In-charges.'}, status=status.HTTP_403_FORBIDDEN)
```

### GET /api/v1/work-queue/iqac/

Handler: `apps.notifications.views.WorkQueueViewSet.iqac_queue`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(data)
Response({'error': 'Access restricted to IQAC coordinators and leadership.'}, status=status.HTTP_403_FORBIDDEN)
```

### GET /api/v1/work-queue/my-work/

Handler: `apps.notifications.views.WorkQueueViewSet.my_work`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(data)
```

### GET /api/v1/work-queues/faculty/

Handler: `apps.notifications.views.WorkQueueViewSet.faculty_workspace`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(data)
Response({'error': 'Access restricted to Faculty.'}, status=status.HTTP_403_FORBIDDEN)
```

### GET /api/v1/work-queues/hod/

Handler: `apps.notifications.views.WorkQueueViewSet.hod_queue`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(data)
Response({'error': 'Access restricted to Heads of Department.'}, status=status.HTTP_403_FORBIDDEN)
```

### GET /api/v1/work-queues/incharge/

Handler: `apps.notifications.views.WorkQueueViewSet.incharge_queue`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(data)
Response({'error': 'Access restricted to Department In-charges.'}, status=status.HTTP_403_FORBIDDEN)
```

### GET /api/v1/work-queues/iqac/

Handler: `apps.notifications.views.WorkQueueViewSet.iqac_queue`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(data)
Response({'error': 'Access restricted to IQAC coordinators and leadership.'}, status=status.HTTP_403_FORBIDDEN)
```

### GET /api/v1/work-queues/my-work/

Handler: `apps.notifications.views.WorkQueueViewSet.my_work`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(data)
```

### GET /api/v1/analytics/overview/

Handler: `apps.analytics.views.AnalyticsOverviewView.get`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'total_faculty': total_faculty, 'total_activities': total_activities, 'total_departments': total_departments, 'status_summary': {'draft': status_map.get(ActivityStatus.DRAFT, 0), 'pending_incharge': status_map.get(ActivityStatus.PENDING_INCHARGE, 0), 'incharge_verified': status_map.get(ActivityStatus.INCHARGE_VERIFIED, 0), 'pending_hod': status_map.get(ActivityStatus.PENDING_HOD, 0), 'hod_approved': status_map.get(ActivityStatus.HOD_APPROVED, 0), 'pending_iqac': status_map.get(ActivityStatus.PENDING_IQAC, 0), 'verified_evidence': status_map.get(ActivityStatus.VERIFIED_EVIDENCE, 0) + status_map.get(ActivityStatus.IQAC_VERIFIED, 0), 'rejected': status_map.get(ActivityStatus.REJECTED_INCHARGE, 0) + status_map.get(ActivityStatus.REJECTED_HOD, 0) + status_map.get(ActivityStatus.REJECTED_IQAC, 0)}, 'activity_types': list(type_counts)})
```

### GET /api/v1/analytics/executive/

Handler: `apps.analytics.views.ExecutiveAnalyticsView.get`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: `request.query_params.get('academic_year')`; `request.query_params.get('college')`.
Response construction:
```python
Response({'kpis': summary['kpis'], 'forecast': summary['forecast'], 'risk_summary': summary['risk_summary'], 'preparation_risk': summary['risk_summary'], 'data_quality_summary': summary['quality_summary'], 'evidence_distribution': {'verified': verified_count, 'pending': pending_count, 'unmapped': unmapped_count}, 'growth_trend_preview': growth_preview, 'department_highlights': sorted_depts, 'top_contributing_departments': sorted_depts, 'executive_insights': insights_data, 'active_ai_insights': insights_data, 'is_monitoring_only': user.role == 'COLLEGE_MANAGEMENT'})
```

### GET /api/v1/analytics/iqac-intelligence/

Handler: `apps.analytics.views.IQACIntelligenceView.get`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: `request.query_params.get('academic_year')`; `request.query_params.get('department')`.
Response construction:
```python
Response({'verification_pipeline': pipeline, 'evidence_health': evidence_health, 'data_quality': quality, 'preparation_risk': risk, 'forecast': forecast, 'ai_insights': insights_data})
```

### GET /api/v1/analytics/academic-year-comparison/

Handler: `apps.analytics.views.AcademicYearComparisonView.get`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: `request.query_params.get('department')`.
Response construction:
```python
Response(data)
```

### GET /api/v1/analytics/department-comparison/

Handler: `apps.analytics.views.DepartmentComparisonView.get`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: `request.query_params.get('academic_year')`.
Response construction:
```python
Response(data)
```

### GET /api/v1/analytics/faculty-participation/

Handler: `apps.analytics.views.FacultyParticipationView.get`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: `request.query_params.get('department')`; `request.query_params.get('academic_year')`.
Response construction:
```python
Response(data)
```

### GET /api/v1/analytics/evidence-health/

Handler: `apps.analytics.views.EvidenceHealthView.get`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: `request.query_params.get('academic_year')`.
Response construction:
```python
Response(data)
```

### GET /api/v1/analytics/verification-pipeline/

Handler: `apps.analytics.views.VerificationPipelineView.get`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: `request.query_params.get('department')`.
Response construction:
```python
Response(data)
```

### GET /api/v1/analytics/gap-matrix/

Handler: `apps.analytics.views.EvidenceGapMatrixView.get`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: `request.query_params.get('framework')`; `request.query_params.get('academic_year')`.
Response construction:
```python
Response(data)
```

### GET /api/v1/analytics/data-quality/

Handler: `apps.analytics.views.DataQualityView.get`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(data)
```

### GET /api/v1/analytics/ai-insights/

Handler: `apps.analytics.views.AIInsightsView.get`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(AIExecutiveInsightSerializer(insights, many=True).data)
```

### GET /api/v1/analytics/ai-insights/refresh/

Handler: `apps.analytics.views.AIInsightsView.get`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(AIExecutiveInsightSerializer(insights, many=True).data)
```

### GET /api/v1/analytics/forecast/

Handler: `apps.analytics.views.ForecastView.get`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: `request.query_params.get('academic_year')`.
Response construction:
```python
Response(data)
```

### POST /api/v1/auth/login/

Handler: `apps.accounts.views.LoginView.post`. Base permissions: AllowAny. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: `request.data.get('email', '').strip()`; `request.data.get('college_id')`; `request.data.get('college')`; `request.data.get('is_super_admin')`; `request.data.get('email', '')`; `request.data.get('portal')`.
Response construction:
```python
Response({'detail': 'Super Admin accounts must sign in via the dedicated Super Admin portal.', 'error': 'Super Admin accounts must sign in via the dedicated Super Admin portal.'}, status=status.HTTP_403_FORBIDDEN)
Response({'detail': 'Access denied. Your account is not registered with this institution. Please select your correct institution.', 'error': 'Access denied. Your account is not registered with this institution. Please select your correct institution.'}, status=status.HTTP_403_FORBIDDEN)
Response({'detail': 'This institution is currently inactive or suspended. Please contact platform administration.', 'error': 'This institution is currently inactive or suspended. Please contact platform administration.'}, status=status.HTTP_403_FORBIDDEN)
Response({'detail': 'Access denied. Only Super Administrators can log in through this portal. Institutional staff must sign in through their institution portal.', 'error': 'Access denied. Only Super Administrators can log in through this portal. Institutional staff must sign in through their institution portal.'}, status=status.HTTP_403_FORBIDDEN)
```

### POST /api/v1/auth/register/faculty/

Handler: `apps.accounts.views.FacultyRegisterView.post`. Base permissions: IsAuthenticated, IsIQACOrManagement. Apply role/scope rules above and source guards below.
Serializer: FacultyRegisterSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Standard DRF post response using the serializer.
```

### POST /api/v1/auth/logout/

Handler: `apps.accounts.views.LogoutView.post`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: `request.data.get('refresh')`.
Response construction:
```python
Response({'success': True, 'message': 'Logged out successfully.'})
Response({'success': True, 'message': 'Session cleared.'})
```

### POST /api/v1/auth/change-password/

Handler: `apps.accounts.views.ChangePasswordView.post`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ChangePasswordSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'success': True, 'message': 'Password changed successfully.'})
Response({'success': False, 'error': 'Old password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
```

### POST /api/v1/auth/forgot-password/

Handler: `apps.accounts.views.ForgotPasswordView.post`. Base permissions: AllowAny. Apply role/scope rules above and source guards below.
Serializer: ForgotPasswordSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'success': True, 'message': 'If an eligible account exists, reset instructions will be sent. If no email arrives, contact support.'})
```

### POST /api/v1/auth/reset-password/

Handler: `apps.accounts.views.ResetPasswordView.post`. Base permissions: AllowAny. Apply role/scope rules above and source guards below.
Serializer: ResetPasswordSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'success': True, 'message': 'Password has been successfully updated. You can now login.'})
Response({'detail': 'Invalid or expired reset token.'}, status=400)
```

### POST /api/v1/activities/

Handler: `apps.activities.views.ActivityViewSet.create`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ActivitySerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
```

### POST /api/v1/activities/check-duplicate/

Handler: `apps.activities.views.ActivityViewSet.check_duplicate`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ActivitySerializer.
Inputs: `request.data.get('title', '').strip()`; `request.data.get('academic_year')`; `request.data.get('category')`; `request.data.get('title', '')`.
Response construction:
```python
Response({'is_duplicate': len(matches) > 0, 'count': len(matches), 'matches': matches, 'warning': 'A submission with the same title already exists in your records.' if matches else None})
Response({'is_duplicate': False, 'matches': []})
```

### POST /api/v1/activities/{pk}/submit/

Handler: `apps.activities.views.ActivityViewSet.submit_for_verification`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ActivitySerializer.
Inputs: `request.data.get('comment', 'Submitted for verification.' if not is_resubmission else 'Resubmitted with corrections.')`.
Response construction:
```python
Response({'status': activity.status, 'message': 'Activity successfully submitted to Department In-charge for verification.'})
Response({'detail': 'Only the author faculty can submit this activity.'}, status=status.HTTP_403_FORBIDDEN)
Response({'detail': f'Cannot submit activity currently in status {activity.status}.'}, status=status.HTTP_400_BAD_REQUEST)
```

### POST /api/v1/activity-categories/

Handler: `apps.activities.views.ActivityCategoryViewSet.create`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ActivityCategorySerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
```

### POST /api/v1/documents/

Handler: `apps.activities.views.DocumentViewSet.create`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: DocumentSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
```

### POST /api/v1/verifications/{pk}/hod-verify/

Handler: `apps.verification.views.VerificationViewSet.hod_verify`. Base permissions: IsHOD. Apply role/scope rules above and source guards below.
Serializer: VerificationRecordSerializer.
Inputs: `request.data.get('decision')`; `request.data.get('comment', '').strip()`; `request.data.get('comment', '')`.
Response construction:
```python
Response({'status': new_status, 'message': f'HOD decision recorded successfully: {new_status}.'})
Response({'detail': f'Activity is not pending HOD approval (current status: {activity.status}).'}, status=status.HTTP_400_BAD_REQUEST)
Response({'detail': 'You can only approve submissions belonging to your assigned department.'}, status=status.HTTP_403_FORBIDDEN)
Response({'detail': "decision must be either 'APPROVE' or 'REJECT'."}, status=status.HTTP_400_BAD_REQUEST)
Response({'detail': 'A rejection reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
```

### POST /api/v1/verifications/{pk}/incharge-verify/

Handler: `apps.verification.views.VerificationViewSet.incharge_verify`. Base permissions: IsDepartmentIncharge. Apply role/scope rules above and source guards below.
Serializer: VerificationRecordSerializer.
Inputs: `request.data.get('decision')`; `request.data.get('comment', '').strip()`; `request.data.get('comment', '')`.
Response construction:
```python
Response({'status': new_status, 'message': f'In-charge decision recorded successfully: {new_status}.'})
Response({'detail': f'Activity is not pending In-charge verification (current status: {activity.status}).'}, status=status.HTTP_400_BAD_REQUEST)
Response({'detail': 'You can only verify submissions belonging to your assigned department.'}, status=status.HTTP_403_FORBIDDEN)
Response({'detail': "decision must be either 'APPROVE' or 'REJECT'."}, status=status.HTTP_400_BAD_REQUEST)
Response({'detail': 'A rejection reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
```

### POST /api/v1/verifications/{pk}/iqac-verify/

Handler: `apps.verification.views.VerificationViewSet.iqac_verify`. Base permissions: IsIQAC. Apply role/scope rules above and source guards below.
Serializer: VerificationRecordSerializer.
Inputs: `request.data.get('decision')`; `request.data.get('comment', '').strip()`; `request.data.get('target', 'DEPARTMENT_INCHARGE')`; `request.data.get('comment', '')`.
Response construction:
```python
Response({'status': new_status, 'message': f'IQAC decision recorded successfully: {new_status}.'})
Response({'detail': f'Activity is not pending IQAC verification (current status: {activity.status}).'}, status=status.HTTP_400_BAD_REQUEST)
Response({'detail': 'Cross-college verification is prohibited.'}, status=status.HTTP_403_FORBIDDEN)
Response({'detail': "decision must be either 'APPROVE' or 'REJECT'."}, status=status.HTTP_400_BAD_REQUEST)
Response({'detail': 'A rejection reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
```

### POST /api/v1/evidence/bulk-zip/

Handler: `apps.evidence.views.EvidenceViewSet.bulk_zip`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: `request.data.get('ids', [])`.
Response construction:
```python
Standard DRF bulk_zip response using the serializer.
```

### POST /api/v1/evidence/{pk}/add-document/

Handler: `apps.evidence.views.EvidenceViewSet.add_document`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: `request.FILES.get('file')`; `request.data.get('category')`; `request.data.get('document_type', 'SUPPORTING')`; `request.data.get('description', '')`.
Response construction:
```python
Response({'message': 'Supplementary document successfully attached to evidence dossier.', 'document_id': str(new_doc.id), 'file_name': new_doc.file_name, 'is_duplicate': is_duplicate, 'duplicate_warning': duplicate_warning, 'preview_url': f'/api/documents/{new_doc.id}/preview/', 'download_url': f'/api/documents/{new_doc.id}/download/', 'document': {'id': str(new_doc.id), 'file_name': new_doc.file_name, 'file_hash': new_doc.file_hash, 'file_size': new_doc.file_size, 'category': doc_category.name if doc_category else None}}, status=status.HTTP_201_CREATED)
Response({'detail': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)
Response({'detail': 'File size must not exceed 10 MB.'}, status=status.HTTP_400_BAD_REQUEST)
Response({'detail': 'Only PDF, JPG, JPEG, and PNG files are allowed.'}, status=status.HTTP_400_BAD_REQUEST)
```

### POST /api/v1/evidence/{pk}/archive/

Handler: `apps.evidence.views.EvidenceViewSet.archive`. Base permissions: IsSuperAdminOrIQAC. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: `request.data.get('reason', '').strip()`; `request.data.get('reason', '')`.
Response construction:
```python
Response({'status': 'ARCHIVED', 'message': f'Evidence "{instance.title}" successfully moved to archive repository.'})
Response({'detail': 'An archive rationale is required.'}, status=status.HTTP_400_BAD_REQUEST)
```

### POST /api/v1/evidence/{pk}/restore/

Handler: `apps.evidence.views.EvidenceViewSet.restore`. Base permissions: IsSuperAdminOrIQAC. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'status': 'ACTIVE', 'message': f'Evidence "{instance.title}" successfully restored to active repository.'})
```

### POST /api/v1/report-types/

Handler: `apps.reports.views.ReportTypeViewSet.create`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ReportTypeSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
```

### POST /api/v1/report-templates/

Handler: `apps.reports.views.ReportTemplateViewSet.create`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ReportTemplateSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
```

### POST /api/v1/report-templates/{pk}/upload-version/

Handler: `apps.reports.views.ReportTemplateViewSet.upload_version`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ReportTemplateSerializer.
Inputs: `request.FILES.get('file')`; `request.data.get('change_summary', '')`.
Response construction:
```python
Response(ReportTemplateSerializer(template).data)
```

### POST /api/v1/reports/generate/

Handler: `apps.reports.views.ReportViewSet.generate`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: GeneratedReportListSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(GeneratedReportListSerializer(report_record).data, status=status.HTTP_201_CREATED)
Response({'error': msg}, status=status.HTTP_429_TOO_MANY_REQUESTS)
```

### POST /api/v1/reports/incharge-faculty-report/

Handler: `apps.reports.views.ReportViewSet.incharge_faculty_report`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: GeneratedReportListSerializer.
Inputs: `request.data.get('faculty_id')`.
Response construction:
```python
Response({'id': str(report_record.id), 'title': report_record.title, 'faculty_name': faculty.get_full_name(), 'faculty_designation': getattr(faculty, 'designation', 'Faculty'), 'file_url': f'/api/v1/reports/{report_record.id}/download/', 'record_count': report_record.record_count, 'generated_at': report_record.generated_at, 'file_size': report_record.file_size}, status=status.HTTP_201_CREATED)
Response({'error': 'Only Department In-charge can download faculty reports.'}, status=status.HTTP_403_FORBIDDEN)
Response({'error': 'Department In-charge must have an assigned department.'}, status=status.HTTP_400_BAD_REQUEST)
Response({'error': 'faculty_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
Response({'error': 'Faculty member not found.'}, status=status.HTTP_404_NOT_FOUND)
Response({'error': 'Department isolation: You cannot download reports for faculty outside your department.'}, status=status.HTTP_403_FORBIDDEN)
```

### POST /api/v1/reports/merge-reports/

Handler: `apps.reports.views.ReportViewSet.merge_reports`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: GeneratedReportListSerializer.
Inputs: `request.data.get('report_ids', [])`.
Response construction:
```python
Response({'id': str(merged_record.id), 'title': merged_record.title, 'source_count': len(reports), 'record_count': total_records, 'file_size': merged_record.file_size, 'generated_at': merged_record.generated_at, 'download_url': f'/api/v1/reports/{merged_record.id}/download/', 'status': 'MERGED_SUCCESSFULLY'}, status=status.HTTP_201_CREATED)
Response({'error': 'Only Department In-charge can merge reports.'}, status=status.HTTP_403_FORBIDDEN)
Response({'error': 'No assigned department.'}, status=status.HTTP_400_BAD_REQUEST)
Response({'error': 'Please select at least one report to merge.'}, status=status.HTTP_400_BAD_REQUEST)
Response({'error': 'One or more selected reports were not found or do not belong to your department.'}, status=status.HTTP_403_FORBIDDEN)
Response({'error': 'Only PDF reports can be merged.'}, status=400)
```

### POST /api/v1/reports/preview/

Handler: `apps.reports.views.ReportViewSet.preview`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: GeneratedReportListSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'title': report_data['meta']['title'], 'report_type_code': report_data['meta']['report_type_code'], 'report_type_name': report_data['meta']['report_type_name'], 'academic_year': report_data['meta']['academic_year'], 'department': report_data['meta']['department'], 'total_records': report_data['meta']['total_records'], 'filters_applied': filters, 'records_preview': report_data['records'][:30], 'sample_records': report_data['records'][:30], 'meta': report_data['meta'], 'college': report_data['college']})
```

### POST /api/v1/reports/{pk}/archive/

Handler: `apps.reports.views.ReportViewSet.archive`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: GeneratedReportListSerializer.
Inputs: `request.data.get('reason', 'Archived by IQAC officer')`.
Response construction:
```python
Response({'status': 'Report archived successfully', 'id': str(report.id)})
```

### POST /api/v1/reports/{pk}/hod-download/

Handler: `apps.reports.views.ReportViewSet.hod_download`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: GeneratedReportListSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'status': 'success', 'message': 'Report downloaded and stored in HOD downloaded reports section.', 'id': str(report.id), 'title': report.title, 'download_url': f'/api/v1/reports/{report.id}/download/'})
Response({'error': 'Unauthorized. Only HOD can perform this download.'}, status=status.HTTP_403_FORBIDDEN)
Response({'error': 'Department isolation: You cannot download reports for another department.'}, status=status.HTTP_403_FORBIDDEN)
```

### POST /api/v1/reports/{pk}/submit-to-admins/

Handler: `apps.reports.views.ReportViewSet.submit_to_admins`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: GeneratedReportListSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'status': 'success', 'message': f"Report '{report.title}' successfully submitted to Management (Admin2) and IQAC (Admin3).", 'report_id': str(report.id), 'submitted_at': now_iso, 'recipients_count': len(admin_recipients)})
Response({'error': 'Only Head of Department (HOD) can submit reports to Admins.'}, status=status.HTTP_403_FORBIDDEN)
Response({'error': 'HOD must have an assigned department.'}, status=status.HTTP_400_BAD_REQUEST)
Response({'error': 'Department isolation: You cannot submit reports for another department.'}, status=status.HTTP_403_FORBIDDEN)
```

### POST /api/v1/reports/{pk}/submit-to-hod/

Handler: `apps.reports.views.ReportViewSet.submit_to_hod`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: GeneratedReportListSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'status': 'success', 'message': f'Merged report successfully submitted to HOD {hod_name}.', 'report_id': str(report.id), 'submitted_at': report.filters_applied['submitted_at'], 'hod_name': hod_name})
Response({'error': 'Only Department In-charge can submit reports to HOD.'}, status=status.HTTP_403_FORBIDDEN)
Response({'error': 'No assigned department.'}, status=status.HTTP_400_BAD_REQUEST)
Response({'error': 'Department isolation: You cannot submit reports for another department.'}, status=status.HTTP_403_FORBIDDEN)
Response({'error': 'No active HOD assigned to this department.'}, status=400)
```

### POST /api/v1/notifications/mark-all-read/

Handler: `apps.notifications.views.NotificationViewSet.mark_all_read`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: NotificationSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'status': 'all notifications marked as read', 'updated_count': updated_count})
```

### POST /api/v1/notifications/send-report-request/

Handler: `apps.notifications.views.NotificationViewSet.send_report_request`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: NotificationSerializer.
Inputs: `request.data.get('faculty_id')`; `request.data.get('message')`.
Response construction:
```python
Response(NotificationSerializer(notification).data, status=status.HTTP_201_CREATED)
Response({'error': 'Only Department In-charge can send report requests.'}, status=status.HTTP_403_FORBIDDEN)
Response({'error': 'Department In-charge must have an assigned department.'}, status=status.HTTP_400_BAD_REQUEST)
Response({'error': 'faculty_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
Response({'error': 'Faculty member not found.'}, status=status.HTTP_404_NOT_FOUND)
Response({'error': 'Department isolation: You cannot send notifications to faculty outside your assigned department.'}, status=status.HTTP_403_FORBIDDEN)
```

### POST /api/v1/notifications/preferences/

Handler: `apps.notifications.views.NotificationViewSet.user_preferences`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: NotificationSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### POST /api/v1/notifications/{pk}/read/

Handler: `apps.notifications.views.NotificationViewSet.mark_read`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: NotificationSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'status': 'marked as read', 'id': notification.id})
```

### POST /api/v1/notifications/{pk}/respond-report-request/

Handler: `apps.notifications.views.NotificationViewSet.respond_report_request`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: NotificationSerializer.
Inputs: `request.data.get('response')`.
Response construction:
```python
Response({'status': 'success', 'response': response_choice, 'response_text': response_text, 'notification': NotificationSerializer(notification).data})
Response({'error': 'Only the recipient faculty can respond to this notification.'}, status=status.HTTP_403_FORBIDDEN)
Response({'error': "Invalid response option. Must be one of: 'Okay', 'Done', 'No'."}, status=status.HTTP_400_BAD_REQUEST)
Response({'error': 'Not a report request for this institution.'}, status=400)
```

### POST /api/v1/tasks/

Handler: `apps.notifications.views.IQACTaskViewSet.create`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
```

### POST /api/v1/tasks/{pk}/block/

Handler: `apps.notifications.views.IQACTaskViewSet.block_task`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: `request.data.get('comment', '')`.
Response construction:
```python
Response(IQACTaskSerializer(task).data)
Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
```

### POST /api/v1/tasks/{pk}/cancel/

Handler: `apps.notifications.views.IQACTaskViewSet.cancel_task`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: `request.data.get('comment', '')`.
Response construction:
```python
Response(IQACTaskSerializer(task).data)
Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
```

### POST /api/v1/tasks/{pk}/comments/

Handler: `apps.notifications.views.IQACTaskViewSet.comments`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: `request.data.get('comment', '').strip()`; `request.data.get('comment', '')`.
Response construction:
```python
Response(TaskCommentSerializer(comments_qs, many=True).data)
Response(TaskCommentSerializer(comment_obj).data, status=status.HTTP_201_CREATED)
Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
Response({'error': 'Comment cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
```

### POST /api/v1/tasks/{pk}/complete/

Handler: `apps.notifications.views.IQACTaskViewSet.complete_task`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: `request.data.get('comment', '')`.
Response construction:
```python
Response(IQACTaskSerializer(task).data)
Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
```

### POST /api/v1/tasks/{pk}/reopen/

Handler: `apps.notifications.views.IQACTaskViewSet.reopen_task`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: `request.data.get('comment', '')`.
Response construction:
```python
Response(IQACTaskSerializer(task).data)
Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
```

### POST /api/v1/tasks/{pk}/start/

Handler: `apps.notifications.views.IQACTaskViewSet.start_task`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: `request.data.get('comment', '')`.
Response construction:
```python
Response(IQACTaskSerializer(task).data)
Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
```

### POST /api/v1/analytics/ai-insights/

Handler: `apps.analytics.views.AIInsightsView.post`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: `request.data.get('academic_year')`.
Response construction:
```python
Response(AIExecutiveInsightSerializer(new_insights, many=True).data, status=status.HTTP_201_CREATED)
```

### POST /api/v1/analytics/ai-insights/refresh/

Handler: `apps.analytics.views.AIInsightsView.post`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: dynamic/custom; see response and source guard reference.
Inputs: `request.data.get('academic_year')`.
Response construction:
```python
Response(AIExecutiveInsightSerializer(new_insights, many=True).data, status=status.HTTP_201_CREATED)
```

### PUT /api/v1/auth/me/

Handler: `apps.accounts.views.MeView.put`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: MeSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Standard DRF put response using the serializer.
```

### PUT /api/v1/auth/faculty/profile/

Handler: `apps.accounts.views.FacultyProfileView.put`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: FacultyProfileSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Standard DRF put response using the serializer.
```

### PUT /api/v1/activities/{pk}/

Handler: `apps.activities.views.ActivityViewSet.update`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ActivitySerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### PUT /api/v1/activity-categories/{pk}/

Handler: `apps.activities.views.ActivityCategoryViewSet.update`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ActivityCategorySerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### PUT /api/v1/documents/{pk}/

Handler: `apps.activities.views.DocumentViewSet.update`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: DocumentSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### PUT /api/v1/report-types/{pk}/

Handler: `apps.reports.views.ReportTypeViewSet.update`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ReportTypeSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### PUT /api/v1/report-templates/{pk}/

Handler: `apps.reports.views.ReportTemplateViewSet.update`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ReportTemplateSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### PUT /api/v1/tasks/{pk}/

Handler: `apps.notifications.views.IQACTaskViewSet.update`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### PATCH /api/v1/auth/me/

Handler: `apps.accounts.views.MeView.patch`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: MeSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Standard DRF patch response using the serializer.
```

### PATCH /api/v1/auth/faculty/profile/

Handler: `apps.accounts.views.FacultyProfileView.patch`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: FacultyProfileSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Standard DRF patch response using the serializer.
```

### PATCH /api/v1/activities/{pk}/

Handler: `apps.activities.views.ActivityViewSet.partial_update`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ActivitySerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Standard DRF partial_update response using the serializer.
```

### PATCH /api/v1/activity-categories/{pk}/

Handler: `apps.activities.views.ActivityCategoryViewSet.partial_update`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ActivityCategorySerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Standard DRF partial_update response using the serializer.
```

### PATCH /api/v1/documents/{pk}/

Handler: `apps.activities.views.DocumentViewSet.partial_update`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: DocumentSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Standard DRF partial_update response using the serializer.
```

### PATCH /api/v1/report-types/{pk}/

Handler: `apps.reports.views.ReportTypeViewSet.partial_update`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ReportTypeSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Standard DRF partial_update response using the serializer.
```

### PATCH /api/v1/report-templates/{pk}/

Handler: `apps.reports.views.ReportTemplateViewSet.partial_update`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ReportTemplateSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Standard DRF partial_update response using the serializer.
```

### PATCH /api/v1/notifications/preferences/

Handler: `apps.notifications.views.NotificationViewSet.user_preferences`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: NotificationSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(serializer.data)
```

### PATCH /api/v1/notifications/{pk}/read/

Handler: `apps.notifications.views.NotificationViewSet.mark_read`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: NotificationSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response({'status': 'marked as read', 'id': notification.id})
```

### PATCH /api/v1/tasks/{pk}/

Handler: `apps.notifications.views.IQACTaskViewSet.partial_update`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Standard DRF partial_update response using the serializer.
```

### PATCH /api/v1/tasks/{pk}/block/

Handler: `apps.notifications.views.IQACTaskViewSet.block_task`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: `request.data.get('comment', '')`.
Response construction:
```python
Response(IQACTaskSerializer(task).data)
Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
```

### PATCH /api/v1/tasks/{pk}/cancel/

Handler: `apps.notifications.views.IQACTaskViewSet.cancel_task`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: `request.data.get('comment', '')`.
Response construction:
```python
Response(IQACTaskSerializer(task).data)
Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
```

### PATCH /api/v1/tasks/{pk}/complete/

Handler: `apps.notifications.views.IQACTaskViewSet.complete_task`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: `request.data.get('comment', '')`.
Response construction:
```python
Response(IQACTaskSerializer(task).data)
Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
```

### PATCH /api/v1/tasks/{pk}/reopen/

Handler: `apps.notifications.views.IQACTaskViewSet.reopen_task`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: `request.data.get('comment', '')`.
Response construction:
```python
Response(IQACTaskSerializer(task).data)
Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
```

### PATCH /api/v1/tasks/{pk}/start/

Handler: `apps.notifications.views.IQACTaskViewSet.start_task`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: `request.data.get('comment', '')`.
Response construction:
```python
Response(IQACTaskSerializer(task).data)
Response({'error': 'College Management has read-only access.'}, status=status.HTTP_403_FORBIDDEN)
```

### DELETE /api/v1/activities/{pk}/

Handler: `apps.activities.views.ActivityViewSet.destroy`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ActivitySerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(status=status.HTTP_204_NO_CONTENT)
```

### DELETE /api/v1/activity-categories/{pk}/

Handler: `apps.activities.views.ActivityCategoryViewSet.destroy`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ActivityCategorySerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(status=status.HTTP_204_NO_CONTENT)
```

### DELETE /api/v1/documents/{pk}/

Handler: `apps.activities.views.DocumentViewSet.destroy`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: DocumentSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(status=status.HTTP_204_NO_CONTENT)
```

### DELETE /api/v1/report-types/{pk}/

Handler: `apps.reports.views.ReportTypeViewSet.destroy`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ReportTypeSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(status=status.HTTP_204_NO_CONTENT)
```

### DELETE /api/v1/report-templates/{pk}/

Handler: `apps.reports.views.ReportTemplateViewSet.destroy`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: ReportTemplateSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(status=status.HTTP_204_NO_CONTENT)
```

### DELETE /api/v1/tasks/{pk}/

Handler: `apps.notifications.views.IQACTaskViewSet.destroy`. Base permissions: IsAuthenticated. Apply role/scope rules above and source guards below.
Serializer: IQACTaskSerializer.
Inputs: serializer fields / URL identifier; no additional request.get parameters.
Response construction:
```python
Response(status=status.HTTP_204_NO_CONTENT)
```

## Serializer field schemas

Required means required on create/full update; PATCH permits omitted fields. Read-only fields are response-only; write-only fields are request-only. Nested serializers use their named schema. Choice values are listed.

### PersonalProfileUpdateSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| first_name | CharField | True | False | False |  |
| last_name | CharField | True | False | False |  |
| phone | CharField | False | False | False |  |
| employee_id | CharField | False | False | False |  |
| designation | CharField | False | False | False |  |
| avatar | ImageField | False | False | True |  |
| bio | CharField | False | False | False |  |

### FacultyProfileSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| user | PrimaryKeyRelatedField | False | True | False |  |
| user_name | CharField | False | True | False |  |
| user_email | CharField | False | True | False |  |
| college | PrimaryKeyRelatedField | False | True | False |  |
| college_name | CharField | False | True | False |  |
| department | PrimaryKeyRelatedField | False | True | False |  |
| department_name | CharField | False | True | False |  |
| employee_id | CharField | False | False | False |  |
| designation | CharField | False | False | False |  |
| qualification | CharField | False | False | False |  |
| joining_date | DateField | False | False | True |  |
| phone | CharField | False | False | False |  |
| profile_photo | ImageField | False | False | True |  |
| resume | FileField | False | False | True |  |
| resume_url | SerializerMethodField | False | True | False |  |
| experience_years | IntegerField | False | False | True |  |
| experience_duration | SerializerMethodField | False | True | False |  |
| status | ChoiceField | False | False | False | ACTIVE, ON_LEAVE, RESIGNED, RETIRED |
| bio | CharField | False | False | False |  |
| created_at | DateTimeField | False | True | False |  |
| updated_at | DateTimeField | False | True | False |  |

### UserSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| email | EmailField | True | False | False |  |
| first_name | CharField | True | False | False |  |
| last_name | CharField | True | False | False |  |
| full_name | SerializerMethodField | False | True | False |  |
| phone | CharField | False | False | False |  |
| employee_id | CharField | False | False | False |  |
| designation | CharField | False | False | False |  |
| role | ChoiceField | False | False | False | SUPER_ADMIN, COLLEGE_MANAGEMENT, IQAC, HOD, DEPARTMENT_INCHARGE, FACULTY |
| college | PrimaryKeyRelatedField | False | False | True |  |
| college_name | SerializerMethodField | False | True | False |  |
| department | PrimaryKeyRelatedField | False | False | True |  |
| department_name | SerializerMethodField | False | True | False |  |
| avatar | ImageField | False | False | True |  |
| bio | CharField | False | False | False |  |
| is_active | BooleanField | False | False | False |  |
| is_email_verified | BooleanField | False | True | False |  |
| faculty_profile | FacultyProfileSerializer | False | True | False |  |
| date_joined | DateTimeField | False | True | False |  |
| created_at | DateTimeField | False | True | False |  |
| updated_at | DateTimeField | False | True | False |  |

### UserCreateSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| email | EmailField | True | False | False |  |
| first_name | CharField | True | False | False |  |
| last_name | CharField | True | False | False |  |
| phone | CharField | False | False | False |  |
| employee_id | CharField | False | False | False |  |
| designation | CharField | False | False | False |  |
| role | ChoiceField | False | False | False | SUPER_ADMIN, COLLEGE_MANAGEMENT, IQAC, HOD, DEPARTMENT_INCHARGE, FACULTY |
| college | PrimaryKeyRelatedField | False | False | True |  |
| department | PrimaryKeyRelatedField | False | False | True |  |
| password | CharField | True | False | False |  |
| confirm_password | CharField | True | False | False |  |

### UserUpdateSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| first_name | CharField | True | False | False |  |
| last_name | CharField | True | False | False |  |
| phone | CharField | False | False | False |  |
| employee_id | CharField | False | False | False |  |
| designation | CharField | False | False | False |  |
| avatar | ImageField | False | False | True |  |
| bio | CharField | False | False | False |  |
| department | PrimaryKeyRelatedField | False | False | True |  |
| role | ChoiceField | False | False | False | SUPER_ADMIN, COLLEGE_MANAGEMENT, IQAC, HOD, DEPARTMENT_INCHARGE, FACULTY |
| is_active | BooleanField | False | False | False |  |

### ChangePasswordSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| old_password | CharField | True | False | False |  |
| new_password | CharField | True | False | False |  |
| confirm_password | CharField | True | False | False |  |

### ForgotPasswordSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| email | EmailField | True | False | False |  |

### ResetPasswordSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| token | CharField | True | False | False |  |
| new_password | CharField | True | False | False |  |
| confirm_password | CharField | True | False | False |  |

### MeSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| email | EmailField | False | True | False |  |
| first_name | CharField | False | True | False |  |
| last_name | CharField | False | True | False |  |
| full_name | SerializerMethodField | False | True | False |  |
| phone | CharField | False | True | False |  |
| employee_id | CharField | False | True | False |  |
| designation | CharField | False | True | False |  |
| role | ChoiceField | False | True | False | SUPER_ADMIN, COLLEGE_MANAGEMENT, IQAC, HOD, DEPARTMENT_INCHARGE, FACULTY |
| college | PrimaryKeyRelatedField | False | True | True |  |
| college_name | SerializerMethodField | False | True | False |  |
| college_logo | SerializerMethodField | False | True | False |  |
| department | PrimaryKeyRelatedField | False | True | True |  |
| department_name | SerializerMethodField | False | True | False |  |
| avatar | ImageField | False | True | True |  |
| bio | CharField | False | True | False |  |
| is_active | BooleanField | False | True | False |  |
| is_email_verified | BooleanField | False | True | False |  |
| faculty_profile | FacultyProfileSerializer | False | True | False |  |

### FacultyRegisterSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| college | PrimaryKeyRelatedField | True | False | False |  |
| department | PrimaryKeyRelatedField | True | False | False |  |
| first_name | CharField | True | False | False |  |
| last_name | CharField | True | False | False |  |
| email | EmailField | True | False | False |  |
| employee_id | CharField | False | False | False |  |
| designation | CharField | False | False | False |  |
| phone | CharField | False | False | False |  |
| password | CharField | True | False | False |  |
| confirm_password | CharField | True | False | False |  |

### ActivityCategorySerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| college | PrimaryKeyRelatedField | False | False | True |  |
| name | CharField | True | False | False |  |
| code | CharField | True | False | False |  |
| description | CharField | False | False | False |  |
| is_active | BooleanField | False | False | False |  |
| created_at | DateTimeField | False | True | False |  |

### DocumentCategorySerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| college | PrimaryKeyRelatedField | False | False | True |  |
| name | CharField | True | False | False |  |
| code | CharField | True | False | False |  |
| description | CharField | False | False | False |  |
| is_active | BooleanField | False | False | False |  |
| created_at | DateTimeField | False | True | False |  |

### DocumentSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| activity | PrimaryKeyRelatedField | True | False | False |  |
| college | PrimaryKeyRelatedField | False | True | False |  |
| department | PrimaryKeyRelatedField | False | True | True |  |
| uploaded_by | PrimaryKeyRelatedField | False | True | True |  |
| uploaded_by_name | CharField | False | True | False |  |
| category | PrimaryKeyRelatedField | False | False | True |  |
| category_name | CharField | False | True | False |  |
| category_code | CharField | False | True | False |  |
| description | CharField | False | False | False |  |
| version | IntegerField | False | False | False |  |
| replaced_by | PrimaryKeyRelatedField | False | False | True |  |
| is_current | BooleanField | False | False | False |  |
| document_type | ChoiceField | False | False | False | CERTIFICATE, SUPPORTING, OTHER |
| file | FileField | True | False | False |  |
| file_name | CharField | True | False | False |  |
| original_filename | CharField | False | False | False |  |
| file_size | IntegerField | False | True | False |  |
| mime_type | CharField | False | True | False |  |
| file_hash | CharField | False | True | False |  |
| is_primary | BooleanField | False | False | False |  |
| status | ChoiceField | False | False | False | ACTIVE, DELETED, ARCHIVED |
| preview_url | SerializerMethodField | False | True | False |  |
| download_url | SerializerMethodField | False | True | False |  |
| uploaded_at | DateTimeField | False | True | False |  |
| created_at | DateTimeField | False | True | False |  |
| updated_at | DateTimeField | False | True | False |  |

### ActivitySerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| college | PrimaryKeyRelatedField | False | True | False |  |
| department | PrimaryKeyRelatedField | False | True | False |  |
| department_name | CharField | False | True | False |  |
| department_code | CharField | False | True | False |  |
| faculty | PrimaryKeyRelatedField | False | True | False |  |
| faculty_name | CharField | False | True | False |  |
| faculty_email | CharField | False | True | False |  |
| faculty_employee_id | CharField | False | True | False |  |
| academic_year | PrimaryKeyRelatedField | False | False | True |  |
| academic_year_name | CharField | False | True | False |  |
| category | PrimaryKeyRelatedField | False | False | True |  |
| category_name | CharField | False | True | False |  |
| category_code | CharField | False | True | False |  |
| title | CharField | True | False | False |  |
| activity_type | ChoiceField | False | False | False | FDP, WORKSHOP, SEMINAR, CONFERENCE, CERTIFICATION, PUBLICATION, RESEARCH, TRAINING, ACHIEVEMENT, AWARD, OTHER |
| organizer | CharField | False | False | False |  |
| venue | CharField | False | False | False |  |
| location | CharField | False | False | False |  |
| start_date | DateField | False | False | True |  |
| end_date | DateField | False | False | True |  |
| duration | CharField | False | False | False |  |
| duration_days | IntegerField | False | False | True |  |
| duration_hours | DecimalField | False | False | True |  |
| description | CharField | False | False | False |  |
| additional_remarks | CharField | False | False | False |  |
| is_online | BooleanField | False | False | False |  |
| certificate_number | CharField | False | False | False |  |
| status | ChoiceField | False | True | False | DRAFT, PENDING_INCHARGE, INCHARGE_VERIFIED, PENDING_HOD, HOD_APPROVED, PENDING_IQAC, IQAC_VERIFIED, VERIFIED_EVIDENCE, RETURNED_TO_FACULTY, RETURNED_TO_INCHARGE, REJECTED_INCHARGE, REJECTED_HOD, REJECTED_IQAC |
| last_rejection_reason | CharField | False | True | False |  |
| last_rejected_by_role | CharField | False | True | False |  |
| last_rejected_at | DateTimeField | False | True | True |  |
| is_editable | BooleanField | False | True | False |  |
| is_verified | BooleanField | False | True | False |  |
| documents | ListSerializer | False | True | False |  |
| verification_details | SerializerMethodField | False | True | False |  |
| created_at | DateTimeField | False | True | False |  |
| updated_at | DateTimeField | False | True | False |  |

### VerificationLogSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| actor_name | CharField | False | True | False |  |
| role | CharField | True | False | False |  |
| action | ChoiceField | True | False | False | SUBMITTED, INCHARGE_APPROVED, INCHARGE_REJECTED, HOD_APPROVED, HOD_REJECTED, IQAC_APPROVED, IQAC_REJECTED, RESUBMITTED, MARKED_EVIDENCE |
| previous_status | CharField | True | False | False |  |
| new_status | CharField | True | False | False |  |
| comment | CharField | False | False | False |  |
| created_at | DateTimeField | False | True | False |  |
| verification_record | PrimaryKeyRelatedField | True | False | False |  |
| actor | PrimaryKeyRelatedField | False | False | True |  |

### VerificationRecordSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| activity_details | ActivitySerializer | False | True | False |  |
| logs | ListSerializer | False | True | False |  |
| current_status | CharField | True | False | False |  |
| incharge_verified_at | DateTimeField | False | False | True |  |
| incharge_comment | CharField | False | False | False |  |
| hod_approved_at | DateTimeField | False | False | True |  |
| hod_comment | CharField | False | False | False |  |
| iqac_verified_at | DateTimeField | False | False | True |  |
| iqac_comment | CharField | False | False | False |  |
| created_at | DateTimeField | False | True | False |  |
| updated_at | DateTimeField | False | True | False |  |
| activity | PrimaryKeyRelatedField | True | False | False |  |
| college | PrimaryKeyRelatedField | True | False | False |  |
| incharge_verified_by | PrimaryKeyRelatedField | False | False | True |  |
| hod_approved_by | PrimaryKeyRelatedField | False | False | True |  |
| iqac_verified_by | PrimaryKeyRelatedField | False | False | True |  |

### EvidenceListSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| college | PrimaryKeyRelatedField | True | False | False |  |
| department | PrimaryKeyRelatedField | True | False | False |  |
| department_name | CharField | False | True | False |  |
| department_code | CharField | False | True | False |  |
| faculty | PrimaryKeyRelatedField | True | False | False |  |
| faculty_name | CharField | False | True | False |  |
| faculty_email | CharField | False | True | False |  |
| faculty_employee_id | CharField | False | True | False |  |
| academic_year | PrimaryKeyRelatedField | False | False | True |  |
| academic_year_name | CharField | False | True | False |  |
| activity | PrimaryKeyRelatedField | True | False | False |  |
| activity_type | CharField | False | True | False |  |
| title | CharField | True | False | False |  |
| description | CharField | False | False | False |  |
| category | CharField | False | False | False |  |
| tags | JSONField | False | False | False |  |
| organizer | CharField | False | True | False |  |
| location | CharField | False | True | False |  |
| start_date | DateField | False | True | False |  |
| end_date | DateField | False | True | False |  |
| duration | CharField | False | True | False |  |
| certificate_number | CharField | False | True | False |  |
| activity_status | CharField | False | True | False |  |
| document | PrimaryKeyRelatedField | False | False | True |  |
| document_details | DocumentSerializer | False | True | False |  |
| documents_count | SerializerMethodField | False | True | False |  |
| is_verified | BooleanField | False | False | False |  |
| verified_at | DateTimeField | False | True | True |  |
| status | ChoiceField | False | False | False | ACTIVE, ARCHIVED |
| archived_at | DateTimeField | False | False | True |  |
| archived_by | PrimaryKeyRelatedField | False | False | True |  |
| archived_by_name | CharField | False | True | False |  |
| archive_reason | CharField | False | False | False |  |
| created_at | DateTimeField | False | True | False |  |
| updated_at | DateTimeField | False | True | False |  |

### EvidenceDetailSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| college | PrimaryKeyRelatedField | True | False | False |  |
| department | PrimaryKeyRelatedField | True | False | False |  |
| department_name | CharField | False | True | False |  |
| department_code | CharField | False | True | False |  |
| faculty | PrimaryKeyRelatedField | True | False | False |  |
| faculty_name | CharField | False | True | False |  |
| faculty_email | CharField | False | True | False |  |
| faculty_employee_id | CharField | False | True | False |  |
| academic_year | PrimaryKeyRelatedField | False | False | True |  |
| academic_year_name | CharField | False | True | False |  |
| activity | PrimaryKeyRelatedField | True | False | False |  |
| activity_type | CharField | False | True | False |  |
| title | CharField | True | False | False |  |
| description | CharField | False | False | False |  |
| category | CharField | False | False | False |  |
| tags | JSONField | False | False | False |  |
| organizer | CharField | False | True | False |  |
| location | CharField | False | True | False |  |
| start_date | DateField | False | True | False |  |
| end_date | DateField | False | True | False |  |
| duration | CharField | False | True | False |  |
| certificate_number | CharField | False | True | False |  |
| activity_status | CharField | False | True | False |  |
| document | PrimaryKeyRelatedField | False | False | True |  |
| document_details | DocumentSerializer | False | True | False |  |
| documents_count | SerializerMethodField | False | True | False |  |
| is_verified | BooleanField | False | False | False |  |
| verified_at | DateTimeField | False | True | True |  |
| status | ChoiceField | False | False | False | ACTIVE, ARCHIVED |
| archived_at | DateTimeField | False | False | True |  |
| archived_by | PrimaryKeyRelatedField | False | False | True |  |
| archived_by_name | CharField | False | True | False |  |
| archive_reason | CharField | False | False | False |  |
| created_at | DateTimeField | False | True | False |  |
| updated_at | DateTimeField | False | True | False |  |
| supporting_documents | SerializerMethodField | False | True | False |  |
| verification_logs | SerializerMethodField | False | True | False |  |

### EvidenceSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| college | PrimaryKeyRelatedField | True | False | False |  |
| department | PrimaryKeyRelatedField | True | False | False |  |
| department_name | CharField | False | True | False |  |
| department_code | CharField | False | True | False |  |
| faculty | PrimaryKeyRelatedField | True | False | False |  |
| faculty_name | CharField | False | True | False |  |
| faculty_email | CharField | False | True | False |  |
| faculty_employee_id | CharField | False | True | False |  |
| academic_year | PrimaryKeyRelatedField | False | False | True |  |
| academic_year_name | CharField | False | True | False |  |
| activity | PrimaryKeyRelatedField | True | False | False |  |
| activity_type | CharField | False | True | False |  |
| title | CharField | True | False | False |  |
| description | CharField | False | False | False |  |
| category | CharField | False | False | False |  |
| tags | JSONField | False | False | False |  |
| organizer | CharField | False | True | False |  |
| location | CharField | False | True | False |  |
| start_date | DateField | False | True | False |  |
| end_date | DateField | False | True | False |  |
| duration | CharField | False | True | False |  |
| certificate_number | CharField | False | True | False |  |
| activity_status | CharField | False | True | False |  |
| document | PrimaryKeyRelatedField | False | False | True |  |
| document_details | DocumentSerializer | False | True | False |  |
| documents_count | SerializerMethodField | False | True | False |  |
| is_verified | BooleanField | False | False | False |  |
| verified_at | DateTimeField | False | True | True |  |
| status | ChoiceField | False | False | False | ACTIVE, ARCHIVED |
| archived_at | DateTimeField | False | False | True |  |
| archived_by | PrimaryKeyRelatedField | False | False | True |  |
| archived_by_name | CharField | False | True | False |  |
| archive_reason | CharField | False | False | False |  |
| created_at | DateTimeField | False | True | False |  |
| updated_at | DateTimeField | False | True | False |  |

### ReportTypeSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| name | CharField | True | False | False |  |
| code | CharField | True | False | False |  |
| description | CharField | False | False | False |  |
| default_format | ChoiceField | False | False | False | PDF, EXCEL, WORD |
| category_code | CharField | False | False | False |  |
| display_order | IntegerField | False | False | False |  |
| is_active | BooleanField | False | False | False |  |
| created_at | DateTimeField | False | True | False |  |
| updated_at | DateTimeField | False | True | False |  |

### ReportTemplateVersionSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| version_number | IntegerField | True | False | False |  |
| file | FileField | True | False | False |  |
| change_summary | CharField | False | False | False |  |
| created_by_name | CharField | False | True | False |  |
| created_at | DateTimeField | False | True | False |  |

### ReportTemplateSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| college | PrimaryKeyRelatedField | False | True | True |  |
| report_type | PrimaryKeyRelatedField | True | False | False |  |
| report_type_name | CharField | False | True | False |  |
| report_type_code | CharField | False | True | False |  |
| name | CharField | True | False | False |  |
| file_format | ChoiceField | False | False | False | PDF, EXCEL, WORD |
| file | FileField | False | False | True |  |
| version | IntegerField | False | True | False |  |
| is_active | BooleanField | False | False | False |  |
| versions | ListSerializer | False | True | False |  |
| created_by | PrimaryKeyRelatedField | False | True | True |  |
| created_by_name | CharField | False | True | False |  |
| created_at | DateTimeField | False | True | False |  |
| updated_at | DateTimeField | False | True | False |  |

### GeneratedReportListSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| title | CharField | True | False | False |  |
| report_type | PrimaryKeyRelatedField | True | False | False |  |
| report_type_name | CharField | False | True | False |  |
| report_type_code | CharField | False | True | False |  |
| template | PrimaryKeyRelatedField | False | False | True |  |
| template_name | CharField | False | True | False |  |
| template_version | IntegerField | False | False | False |  |
| academic_year | PrimaryKeyRelatedField | False | False | True |  |
| academic_year_name | CharField | False | True | False |  |
| department | PrimaryKeyRelatedField | False | False | True |  |
| department_name | CharField | False | True | False |  |
| record_count | IntegerField | False | False | False |  |
| output_format | ChoiceField | False | False | False | PDF, EXCEL, WORD |
| status | ChoiceField | False | False | False | GENERATING, COMPLETED, FAILED, ARCHIVED |
| file_size | IntegerField | False | False | False |  |
| error_message | CharField | False | False | False |  |
| generated_by_name | CharField | False | True | False |  |
| generated_at | DateTimeField | False | True | False |  |
| download_url | SerializerMethodField | False | True | False |  |

### ReportFilterRequestSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| report_type | UUIDField | True | False | False |  |
| academic_year | UUIDField | False | False | True |  |
| department | UUIDField | False | False | True |  |
| faculty | UUIDField | False | False | True |  |
| category | UUIDField | False | False | True |  |
| criterion | UUIDField | False | False | True |  |
| metric | UUIDField | False | False | True |  |
| date_from | DateField | False | False | True |  |
| date_to | DateField | False | False | True |  |
| search | CharField | False | False | False |  |

### ReportGenerateRequestSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| report_type | UUIDField | True | False | False |  |
| academic_year | UUIDField | False | False | True |  |
| department | UUIDField | False | False | True |  |
| faculty | UUIDField | False | False | True |  |
| category | UUIDField | False | False | True |  |
| criterion | UUIDField | False | False | True |  |
| metric | UUIDField | False | False | True |  |
| date_from | DateField | False | False | True |  |
| date_to | DateField | False | False | True |  |
| search | CharField | False | False | False |  |
| output_format | ChoiceField | False | False | False | PDF, EXCEL, WORD |
| template | UUIDField | False | False | True |  |

### NotificationSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| college | PrimaryKeyRelatedField | False | True | True |  |
| recipient | PrimaryKeyRelatedField | True | False | False |  |
| recipient_name | SerializerMethodField | False | True | False |  |
| sender | PrimaryKeyRelatedField | False | True | True |  |
| sender_name | SerializerMethodField | False | True | False |  |
| category | ChoiceField | False | False | False | VERIFICATION, EVIDENCE, DATA_REQUEST, METRIC, AQAR, SSR, TASK, DEADLINE, REPORT, AI, SYSTEM |
| notification_type | CharField | True | False | False |  |
| title | CharField | True | False | False |  |
| body | CharField | True | False | False |  |
| priority | ChoiceField | False | False | False | LOW, NORMAL, HIGH, URGENT |
| action_url | CharField | False | False | False |  |
| action_label | CharField | False | False | False |  |
| related_model | CharField | False | False | False |  |
| related_id | UUIDField | False | False | True |  |
| is_read | BooleanField | False | False | False |  |
| read_at | DateTimeField | False | True | True |  |
| deduplication_key | CharField | False | True | False |  |
| metadata | JSONField | False | False | False |  |
| created_at | DateTimeField | False | True | False |  |

### NotificationPreferenceSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| user | PrimaryKeyRelatedField | False | True | False |  |
| in_app_enabled | BooleanField | False | False | False |  |
| email_enabled | BooleanField | False | False | False |  |
| sms_enabled | BooleanField | False | False | False |  |
| whatsapp_enabled | BooleanField | False | False | False |  |
| push_enabled | BooleanField | False | False | False |  |
| channel_in_app | BooleanField | False | False | False |  |
| channel_email | BooleanField | False | False | False |  |
| channel_sms | BooleanField | False | False | False |  |
| channel_whatsapp | BooleanField | False | False | False |  |
| channel_push | BooleanField | False | False | False |  |
| category_verification | BooleanField | False | False | False |  |
| category_tasks | BooleanField | False | False | False |  |
| category_deadlines | BooleanField | False | False | False |  |
| category_aqar_ssr | BooleanField | False | False | False |  |
| category_reports | BooleanField | False | False | False |  |
| category_system | BooleanField | False | False | False |  |
| updated_at | DateTimeField | False | True | False |  |

### TaskActivitySerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| task | PrimaryKeyRelatedField | True | False | False |  |
| actor | PrimaryKeyRelatedField | False | False | True |  |
| actor_name | SerializerMethodField | False | True | False |  |
| actor_email | SerializerMethodField | False | True | False |  |
| action | ChoiceField | False | False | False | CREATED, ASSIGNED, STARTED, UPDATED, COMMENTED, COMPLETED, REOPENED, CANCELLED, ESCALATED |
| details | CharField | False | False | False |  |
| created_at | DateTimeField | False | True | False |  |

### TaskCommentSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| task | PrimaryKeyRelatedField | True | False | False |  |
| author | PrimaryKeyRelatedField | False | True | False |  |
| author_name | SerializerMethodField | False | True | False |  |
| author_email | SerializerMethodField | False | True | False |  |
| comment | CharField | True | False | False |  |
| created_at | DateTimeField | False | True | False |  |

### IQACTaskSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| college | PrimaryKeyRelatedField | False | True | False |  |
| title | CharField | True | False | False |  |
| description | CharField | False | False | False |  |
| owner | PrimaryKeyRelatedField | True | False | False |  |
| owner_name | SerializerMethodField | False | True | False |  |
| owner_email | SerializerMethodField | False | True | False |  |
| creator | PrimaryKeyRelatedField | False | True | True |  |
| creator_name | SerializerMethodField | False | True | False |  |
| department | PrimaryKeyRelatedField | False | False | True |  |
| department_name | SerializerMethodField | False | True | False |  |
| academic_year | PrimaryKeyRelatedField | False | False | True |  |
| academic_year_code | SerializerMethodField | False | True | False |  |
| priority | ChoiceField | False | False | False | LOW, NORMAL, HIGH, URGENT |
| due_date | DateField | False | False | True |  |
| status | ChoiceField | False | False | False | TODO, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED |
| related_metric | PrimaryKeyRelatedField | False | False | True |  |
| metric_code | SerializerMethodField | False | True | False |  |
| metric_name | SerializerMethodField | False | True | False |  |
| related_evidence | PrimaryKeyRelatedField | False | False | True |  |
| evidence_title | SerializerMethodField | False | True | False |  |
| related_data_request | PrimaryKeyRelatedField | False | False | True |  |
| deduplication_key | CharField | False | True | False |  |
| is_automated | BooleanField | False | True | False |  |
| completed_at | DateTimeField | False | True | True |  |
| completed_by | PrimaryKeyRelatedField | False | True | True |  |
| is_overdue | ReadOnlyField | False | True | False |  |
| activities_count | SerializerMethodField | False | True | False |  |
| comments_count | SerializerMethodField | False | True | False |  |
| created_at | DateTimeField | False | True | False |  |
| updated_at | DateTimeField | False | True | False |  |

### AutomationRuleSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| college | PrimaryKeyRelatedField | False | True | False |  |
| name | CharField | True | False | False |  |
| description | CharField | False | False | False |  |
| trigger | CharField | True | False | False |  |
| condition | JSONField | False | False | False |  |
| action | CharField | True | False | False |  |
| action_config | JSONField | False | False | False |  |
| is_active | BooleanField | False | False | False |  |
| cooldown_hours | IntegerField | False | False | False |  |
| last_triggered_at | DateTimeField | False | True | True |  |
| created_at | DateTimeField | False | True | False |  |
| updated_at | DateTimeField | False | True | False |  |

### ExecutiveSnapshotSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| college | PrimaryKeyRelatedField | True | False | False |  |
| academic_year | PrimaryKeyRelatedField | True | False | False |  |
| academic_year_name | ReadOnlyField | False | True | False |  |
| snapshot_date | DateField | True | False | False |  |
| total_faculty | IntegerField | False | False | False |  |
| total_activities | IntegerField | False | False | False |  |
| verified_evidence_count | IntegerField | False | False | False |  |
| pending_verification_count | IntegerField | False | False | False |  |
| aqar_completeness_pct | DecimalField | False | False | False |  |
| ssr_completeness_pct | DecimalField | False | False | False |  |
| data_quality_score | DecimalField | False | False | False |  |
| bottleneck_count | IntegerField | False | False | False |  |
| metadata | JSONField | False | False | False |  |
| created_at | DateTimeField | False | True | False |  |

### AIExecutiveInsightSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| college | PrimaryKeyRelatedField | True | False | False |  |
| academic_year | PrimaryKeyRelatedField | False | False | True |  |
| academic_year_name | ReadOnlyField | False | True | False |  |
| category | ChoiceField | False | False | False | GROWTH, BOTTLENECK, GAP, RISK, QUALITY, RECOMMENDATION |
| title | CharField | True | False | False |  |
| narrative | CharField | True | False | False |  |
| severity | ChoiceField | False | False | False | INFO, LOW, MEDIUM, HIGH, CRITICAL |
| source_metrics | JSONField | False | False | False |  |
| affected_departments | ManyRelatedField | False | False | False |  |
| affected_department_names | SerializerMethodField | False | True | False |  |
| time_period | CharField | False | False | False |  |
| recommended_action | CharField | False | False | False |  |
| is_active | BooleanField | False | False | False |  |
| created_at | DateTimeField | False | True | False |  |
| updated_at | DateTimeField | False | True | False |  |

### ScheduledAnalyticsConfigSerializer

| Field | Type | Required | Read only | Nullable | Choices |
| --- | --- | --- | --- | --- | --- |
| id | UUIDField | False | True | False |  |
| college | PrimaryKeyRelatedField | True | False | False |  |
| report_title | CharField | True | False | False |  |
| frequency | ChoiceField | False | False | False | WEEKLY, MONTHLY, QUARTERLY, ANNUAL |
| recipient_role | CharField | False | False | False |  |
| target_email | EmailField | False | False | False |  |
| is_active | BooleanField | False | False | False |  |
| last_run_at | DateTimeField | False | False | True |  |
| created_at | DateTimeField | False | True | False |  |

## Authorization and custom response source references

These extracts supply dynamic role guards, filtering, service-returned payloads and upload validation beyond the route table. They are source references, not example response data.

### accounts/views.py: MeView.get_serializer_class
```python
def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return PersonalProfileUpdateSerializer
        return MeSerializer
```

### accounts/views.py: FacultyProfileViewSet.get_queryset
```python
def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return FacultyProfile.objects.none()
        if user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            return qs.filter(department=user.department) if user.department_id else qs.none()
        elif user.role == 'FACULTY':
            return qs.filter(user=user)
        return qs
```

### accounts/views.py: UserViewSet.get_permissions
```python
def get_permissions(self):
        if self.action in ('list', 'retrieve', 'iqac_profile'):
            return [IsAuthenticated()]
        if self.action in ('create', 'destroy'):
            return [IsSuperAdminOrIQAC()]
        return [IsSuperAdminOrIQAC()]
```

### accounts/views.py: UserViewSet.get_serializer_class
```python
def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return UserUpdateSerializer
        return UserSerializer
```

### accounts/views.py: UserViewSet.get_queryset
```python
def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return User.objects.none()
        # Tenant isolation
        if user.role != 'SUPER_ADMIN':
            qs = qs.filter(college=user.college)
        # Department isolation for HOD and In-charge
        if user.role in ('HOD', 'DEPARTMENT_INCHARGE'):
            return qs.filter(department=user.department) if user.department_id else qs.none()
        # Faculty isolation (can only see self)
        if user.role == 'FACULTY':
            return qs.filter(id=user.id)
        return qs
```

### accounts/views.py: UserViewSet.perform_create
```python
def perform_create(self, serializer):
        user = self.request.user
        created_user = serializer.save()

        # Audit log for user creation & role assignment
        log_action(
            actor=user,
            action='USER_CREATED',
            instance=created_user,
            request=self.request,
            comment=f'Created user {created_user.email} with role {created_user.role}.'
        )
```

### accounts/views.py: UserViewSet.perform_update
```python
def perform_update(self, serializer):
        prev_role = serializer.instance.role
        updated_user = serializer.save()

        action = 'ROLE_ASSIGNED' if prev_role != updated_user.role else 'USER_UPDATED'
        log_action(
            actor=self.request.user,
            action=action,
            instance=updated_user,
            request=self.request,
            comment=f'Updated user {updated_user.email}. Role: {updated_user.role}.'
        )
```

### accounts/serializers.py: FacultyProfileSerializer.get_resume_url
```python
def get_resume_url(self, obj):
        if obj.resume:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.resume.url)
            return obj.resume.url
        return None
```

### accounts/serializers.py: FacultyProfileSerializer.get_experience_duration
```python
def get_experience_duration(self, obj):
        if obj.joining_date:
            from django.utils import timezone
            today = timezone.now().date()
            diff_years = today.year - obj.joining_date.year - ((today.month, today.day) < (obj.joining_date.month, obj.joining_date.day))
            diff_months = (today.month - obj.joining_date.month) % 12
            if diff_years > 0:
                return f"{diff_years} year{'s' if diff_years != 1 else ''}, {diff_months} month{'s' if diff_months != 1 else ''}"
            return f"{diff_months} month{'s' if diff_months != 1 else ''}"
        elif obj.experience_years:
            return f"{obj.experience_years} year{'s' if obj.experience_years != 1 else ''}"
        return "Not specified"
```

### accounts/serializers.py: UserSerializer.get_full_name
```python
def get_full_name(self, obj):
        return obj.get_full_name()
```

### accounts/serializers.py: UserSerializer.get_department_name
```python
def get_department_name(self, obj):
        return obj.department.name if obj.department else None
```

### accounts/serializers.py: UserSerializer.get_college_name
```python
def get_college_name(self, obj):
        return obj.college.name if obj.college else None
```

### accounts/serializers.py: UserCreateSerializer.validate
```python
def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        validate_password(data['password'])

        role = data.get('role', UserRole.FACULTY)
        college = data.get('college')
        department = data.get('department')

        # Requirement #11: Department-based roles require department assignment
        if role in [UserRole.FACULTY, UserRole.HOD, UserRole.DEPARTMENT_INCHARGE]:
            if not department:
                raise serializers.ValidationError({
                    'department': f'Department assignment is required for role: {role}'
                })
            # If college is provided, ensure department belongs to that college
            if college and department.college != college:
                raise serializers.ValidationError({
                    'department': 'Selected department does not belong to the selected college.'
                })
            # Inherit college from department if not explicitly given
            if not college and department:
                data['college'] = department.college

        # Institutional roles require college
        if role in [UserRole.COLLEGE_MANAGEMENT, UserRole.IQAC]:
            if not college and not (department and department.college):
                raise serializers.ValidationError({
                    'college': f'College assignment is required for role: {role}'
                })

        return validate_user_assignment(self, data)
```

### accounts/serializers.py: UserUpdateSerializer.validate
```python
def validate(self, data):
        return validate_user_assignment(self, data)
```

### accounts/serializers.py: ChangePasswordSerializer.validate
```python
def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({'new_password': 'Passwords do not match.'})
        validate_password(data['new_password'])
        return data
```

### accounts/serializers.py: ResetPasswordSerializer.validate
```python
def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({'new_password': 'Passwords do not match.'})
        validate_password(data['new_password'])
        return data
```

### accounts/serializers.py: MeSerializer.get_full_name
```python
def get_full_name(self, obj):
        return obj.get_full_name()
```

### accounts/serializers.py: MeSerializer.get_department_name
```python
def get_department_name(self, obj):
        return obj.department.name if obj.department else None
```

### accounts/serializers.py: MeSerializer.get_college_name
```python
def get_college_name(self, obj):
        return obj.college.name if obj.college else None
```

### accounts/serializers.py: MeSerializer.get_college_logo
```python
def get_college_logo(self, obj):
        if obj.college and obj.college.logo:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.college.logo.url) if request else obj.college.logo.url
        return None
```

### accounts/serializers.py: FacultyRegisterSerializer.validate
```python
def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        validate_password(data['password'])

        email = data['email'].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({'email': 'An account with this email address already exists.'})

        college = data['college']
        if college.is_deleted or not college.is_active or college.status != CollegeStatus.ACTIVE:
            raise serializers.ValidationError({'college': 'Selected college is not active or eligible for faculty registration.'})

        department = data['department']
        if department.college_id != college.id:
            raise serializers.ValidationError({'department': 'Selected department does not belong to the selected college.'})

        return data
```

### activities/views.py: ActivityCategoryViewSet.get_queryset
```python
def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ActivityCategory.objects.none()
        if user.role == 'SUPER_ADMIN':
            return ActivityCategory.objects.all()
        # Return global categories (college is null) OR institution's custom categories
        return ActivityCategory.objects.filter(models.Q(college__isnull=True) | models.Q(college=user.college))
```

### activities/views.py: ActivityCategoryViewSet.get_permissions
```python
def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsSuperAdminOrIQAC()]
        return [permissions.IsAuthenticated()]
```

### activities/views.py: ActivityCategoryViewSet.perform_create
```python
def perform_create(self, serializer):
        user = self.request.user
        college = user.college if user.role != 'SUPER_ADMIN' else None
        serializer.save(college=college)
```

### activities/views.py: ActivityViewSet.get_queryset
```python
def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return Activity.objects.none()
        if user.role == 'FACULTY':
            return qs.filter(faculty=user)
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            return qs.filter(department=user.department) if user.department_id else qs.none()
        return qs
```

### activities/views.py: ActivityViewSet.perform_create
```python
def perform_create(self, serializer):
        user = self.request.user
        if user.role != 'FACULTY' and not user.is_staff:
            raise PermissionDenied("Only faculty members can initiate activity submissions.")

        extra_kwargs = {
            'college': user.college,
            'department': user.department,
            'faculty': user,
            'status': ActivityStatus.DRAFT,
        }
        if not serializer.validated_data.get('academic_year') and user.college:
            from apps.academic_years.models import AcademicYear
            curr_ay = AcademicYear.objects.filter(college=user.college, is_current=True).first() or \
                      AcademicYear.objects.filter(college=user.college, is_active=True).order_by('-start_date').first()
            if curr_ay:
                extra_kwargs['academic_year'] = curr_ay

        activity = serializer.save(**extra_kwargs)

        VerificationRecord.objects.get_or_create(
            activity=activity,
            defaults={'college': user.college, 'current_status': ActivityStatus.DRAFT}
        )

        log_action(
            actor=user,
            action='ACTIVITY_CREATED',
            instance=activity,
            request=self.request,
            comment=f'Created activity draft: "{activity.title}".'
        )
```

### activities/views.py: ActivityViewSet.perform_update
```python
def perform_update(self, serializer):
        activity = self.get_object()
        if self.request.user.role != 'SUPER_ADMIN' and (self.request.user.role != 'FACULTY' or activity.faculty_id != self.request.user.id):
            raise PermissionDenied('Only the author may edit this activity.')
        if not activity.is_editable:
            raise ValidationError(f"Activity in status '{activity.status}' cannot be edited.")
        updated_activity = serializer.save()

        log_action(
            actor=self.request.user,
            action='ACTIVITY_UPDATED',
            instance=updated_activity,
            request=self.request,
            comment=f'Updated activity details for "{updated_activity.title}".'
        )
```

### activities/views.py: DocumentViewSet.get_queryset
```python
def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return Document.objects.none()
        if user.role == 'FACULTY':
            return qs.filter(models.Q(uploaded_by=user) | models.Q(activity__faculty=user))
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            return qs.filter(department=user.department) if user.department_id else qs.none()
        return qs
```

### activities/views.py: DocumentViewSet.perform_create
```python
def perform_create(self, serializer):
        user = self.request.user
        uploaded_file = self.request.FILES.get('file')

        file_hash = ''
        file_size = 0
        mime_type = 'application/octet-stream'

        if uploaded_file:
            from core.validators import validate_file_security
            validate_file_security(uploaded_file)

            # Check storage quota
            if user.college:
                from apps.colleges.services import UsageLimitService
                allowed, err_msg = UsageLimitService.check_storage_quota(user.college, uploaded_file.size)
                if not allowed:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError({'file': err_msg})

            # Compute SHA-256 hash
            hasher = hashlib.sha256()
            for chunk in uploaded_file.chunks():
                hasher.update(chunk)
            file_hash = hasher.hexdigest()
            uploaded_file.seek(0)
            file_size = uploaded_file.size
            mime_type = uploaded_file.content_type or mimetypes.guess_type(uploaded_file.name)[0] or 'application/octet-stream'

        doc = serializer.save(
            college=serializer.validated_data['activity'].college,
            department=serializer.validated_data['activity'].department,
            uploaded_by=user,
            file_hash=file_hash,
            file_size=file_size,
            mime_type=mime_type,
            original_filename=uploaded_file.name if uploaded_file else ''
        )

        if uploaded_file and user.college:
            from apps.colleges.services import UsageLimitService
            UsageLimitService.record_storage_change(user.college, file_size)

        log_action(
            actor=user,
            action='DOCUMENT_UPLOADED',
            instance=doc,
            request=self.request,
            comment=f'Uploaded certificate document "{doc.file_name}" for activity "{doc.activity.title}".'
        )
```

### activities/views.py: DocumentCategoryViewSet.get_queryset
```python
def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return DocumentCategory.objects.none()
        return DocumentCategory.objects.filter(
            models.Q(college=user.college) | models.Q(college__isnull=True),
            is_active=True
        ).order_by('name')
```

### activities/serializers.py: DocumentSerializer.validate
```python
def validate(self, attrs):
        attrs = super().validate(attrs)
        user = self.context['request'].user
        activity = attrs.get('activity', self.instance.activity if self.instance else None)
        if self.instance and activity != self.instance.activity:
            raise serializers.ValidationError({'activity': 'Documents cannot be reassigned.'})
        if activity and user.role != 'SUPER_ADMIN':
            if user.role != 'FACULTY' or activity.faculty_id != user.id or not activity.is_editable:
                raise serializers.ValidationError({'activity': 'Only the author may edit documents on an editable activity.'})
        replacement = attrs.get('replaced_by')
        if replacement and replacement.activity_id != activity.id:
            raise serializers.ValidationError({'replaced_by': 'Replacement must belong to the same activity.'})
        return attrs
```

### activities/serializers.py: DocumentSerializer.get_preview_url
```python
def get_preview_url(self, obj):
        return f"/api/documents/{obj.id}/preview/"
```

### activities/serializers.py: DocumentSerializer.get_download_url
```python
def get_download_url(self, obj):
        return f"/api/documents/{obj.id}/download/"
```

### activities/serializers.py: DocumentSerializer.validate_file
```python
def validate_file(self, value):
        from core.validators import validate_file_security
        validate_file_security(value)
        # 10MB maximum size limit
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError("File size must not exceed 10 MB.")

        # Allowed extensions / mime types
        name = value.name.lower()
        allowed_exts = ('.pdf', '.jpg', '.jpeg', '.png')
        if not any(name.endswith(ext) for ext in allowed_exts):
            raise serializers.ValidationError("Only PDF, JPG, JPEG, and PNG files are accepted.")
        return value
```

### activities/serializers.py: ActivitySerializer.get_verification_details
```python
def get_verification_details(self, obj):
        if hasattr(obj, 'verification_record'):
            rec = obj.verification_record
            return {
                'id': str(rec.id),
                'current_status': rec.current_status,
                'incharge_verified_by': rec.incharge_verified_by.get_full_name() if rec.incharge_verified_by else None,
                'incharge_verified_at': rec.incharge_verified_at,
                'incharge_comment': rec.incharge_comment,
                'hod_approved_by': rec.hod_approved_by.get_full_name() if rec.hod_approved_by else None,
                'hod_approved_at': rec.hod_approved_at,
                'hod_comment': rec.hod_comment,
                'iqac_verified_by': rec.iqac_verified_by.get_full_name() if rec.iqac_verified_by else None,
                'iqac_verified_at': rec.iqac_verified_at,
                'iqac_comment': rec.iqac_comment,
            }
        return None
```

### verification/views.py: VerificationViewSet.get_queryset
```python
def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return VerificationRecord.objects.none()
        if user.role == 'FACULTY':
            return qs.filter(activity__faculty=user)
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            return qs.filter(activity__department=user.department) if user.department_id else qs.none()
        return qs
```

### evidence/views.py: EvidenceViewSet.get_serializer_class
```python
def get_serializer_class(self):
        if self.action == 'retrieve':
            return EvidenceDetailSerializer
        return EvidenceListSerializer
```

### evidence/views.py: EvidenceViewSet.get_queryset
```python
def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return Evidence.objects.none()

        # 1. Role-based isolation
        if user.role == 'FACULTY':
            qs = qs.filter(faculty=user)
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            if user.department:
                qs = qs.filter(department=user.department)
            else:
                return Evidence.objects.none()
        elif user.role in ['IQAC', 'COLLEGE_MANAGEMENT']:
            if user.college:
                qs = qs.filter(college=user.college)
            else:
                return Evidence.objects.none()
        elif user.role == 'SUPER_ADMIN':
            pass

        # 2. Archive filtering (Default: only active verified evidence)
        status_param = self.request.query_params.get('status')
        include_archived = self.request.query_params.get('include_archived', 'false').lower() == 'true'
        
        if getattr(self, 'action', None) in ['restore', 'archive', 'retrieve']:
            pass  # Target specific record by ID regardless of archive status
        elif status_param == 'ARCHIVED':
            qs = qs.filter(status='ARCHIVED')
        elif status_param == 'ALL' or include_archived:
            pass  # Return all statuses
        else:
            qs = qs.filter(status='ACTIVE')

        # 3. Apply smart filters & natural search
        qs = EvidenceSearchService.apply_smart_filters(qs, self.request.query_params)
        return qs.order_by('-created_at')
```

### evidence/serializers.py: EvidenceListSerializer.get_documents_count
```python
def get_documents_count(self, obj):
        if obj.activity:
            return obj.activity.documents.filter(status='ACTIVE').count()
        return 1 if obj.document else 0
```

### evidence/serializers.py: EvidenceDetailSerializer.get_supporting_documents
```python
def get_supporting_documents(self, obj):
        if not obj.activity:
            return []
        docs = obj.activity.documents.filter(status='ACTIVE').order_by('-is_primary', '-created_at')
        return DocumentSerializer(docs, many=True, context=self.context).data
```

### evidence/serializers.py: EvidenceDetailSerializer.get_verification_logs
```python
def get_verification_logs(self, obj):
        if not obj.activity or not hasattr(obj.activity, 'verification_record'):
            return []
        v_rec = obj.activity.verification_record
        logs = v_rec.logs.select_related('actor').order_by('created_at')
        return [
            {
                'id': str(log.id),
                'actor_name': log.actor.get_full_name() if log.actor else 'System',
                'role': log.role,
                'action': log.action,
                'previous_status': log.previous_status,
                'new_status': log.new_status,
                'comment': log.comment,
                'created_at': log.created_at.isoformat()
            } for log in logs
        ]
```

### reports/views.py: ReportTypeViewSet.get_permissions
```python
def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsSuperAdminOrIQAC()]
```

### reports/views.py: ReportTypeViewSet.get_queryset
```python
def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ReportType.objects.none()
        if user.role == 'SUPER_ADMIN':
            return ReportType.objects.filter(is_active=True)
        return ReportType.objects.filter(
            Q(college__isnull=True) | Q(college=user.college),
            is_active=True
        ).order_by('display_order', 'name')
```

### reports/views.py: ReportTemplateViewSet.get_permissions
```python
def get_permissions(self):
        if self.action in ['list', 'retrieve', 'placeholders', 'download']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsSuperAdminOrIQAC()]
```

### reports/views.py: ReportTemplateViewSet.get_queryset
```python
def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ReportTemplate.objects.none()
        if user.role == 'SUPER_ADMIN':
            return ReportTemplate.objects.filter(is_active=True)
        return ReportTemplate.objects.filter(
            Q(college__isnull=True) | Q(college=user.college),
            is_active=True
        ).select_related('report_type', 'created_by').prefetch_related('versions')
```

### reports/views.py: ReportTemplateViewSet.perform_create
```python
def perform_create(self, serializer):
        user = self.request.user
        college = user.college if user.role != 'SUPER_ADMIN' else None
        tpl = serializer.save(college=college, created_by=user, version=1)

        # Save initial version if file provided
        if tpl.file:
            ReportTemplateVersion.objects.create(
                template=tpl,
                version_number=1,
                file=tpl.file,
                change_summary="Initial template upload",
                created_by=user
            )
        log_action(
            actor=user,
            action='TEMPLATE_UPLOADED',
            instance=tpl,
            comment=f"Created report template '{tpl.name}' for {tpl.report_type.name}"
        )
```

### reports/views.py: ReportViewSet.get_queryset
```python
def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return GeneratedReport.objects.none()

        qs = GeneratedReport.objects.exclude(status=ReportStatus.ARCHIVED).select_related(
            'report_type', 'template', 'academic_year', 'department', 'generated_by'
        )

        if user.role != 'SUPER_ADMIN':
            qs = qs.filter(college=user.college)

        # Role-based access control (Sections 21-25)
        if user.role == 'FACULTY':
            qs = qs.filter(faculty=user)
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            if user.department:
                qs = qs.filter(department=user.department)
            else:
                qs = qs.none()

        # Academic year filtering
        ay_id = self.request.query_params.get('academic_year')
        if ay_id:
            qs = qs.filter(academic_year_id=ay_id)

        # Department filtering
        dept_id = self.request.query_params.get('department')
        if dept_id:
            qs = qs.filter(department_id=dept_id)

        # Format filtering
        fmt = self.request.query_params.get('format')
        if fmt:
            qs = qs.filter(output_format=fmt.upper())

        return qs.order_by('-generated_at')
```

### reports/serializers.py: GeneratedReportListSerializer.get_download_url
```python
def get_download_url(self, obj):
        if obj.file and obj.status == 'COMPLETED':
            return f"/api/reports/{obj.id}/download/"
        return None
```

### notifications/views.py: NotificationViewSet.get_queryset
```python
def get_queryset(self):
        user = self.request.user
        qs = Notification.objects.filter(recipient=user)
        if user.college:
            qs = qs.filter(college=user.college)

        # Filters
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)

        priority = self.request.query_params.get('priority')
        if priority:
            qs = qs.filter(priority=priority)

        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            if is_read.lower() in ('true', '1'):
                qs = qs.filter(is_read=True)
            elif is_read.lower() in ('false', '0'):
                qs = qs.filter(is_read=False)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(body__icontains=search))

        return qs.order_by('-created_at')
```

### notifications/views.py: IQACTaskViewSet.get_queryset
```python
def get_queryset(self):
        user = self.request.user
        if not user.college and user.role != UserRole.SUPER_ADMIN:
            return IQACTask.objects.none()

        qs = IQACTask.objects.all()
        if user.college:
            qs = qs.filter(college=user.college)

        # Role-based visibility scoping
        if user.role in [UserRole.SUPER_ADMIN, UserRole.COLLEGE_MANAGEMENT, UserRole.IQAC]:
            # Institutional visibility
            pass
        elif user.role in [UserRole.HOD, UserRole.DEPARTMENT_INCHARGE]:
            # Scoped to department or assigned to self or created by self
            dept_q = Q(department=user.department) if user.department else Q(pk__in=[])
            qs = qs.filter(dept_q | Q(owner=user) | Q(creator=user))
        elif user.role == UserRole.FACULTY:
            # Strictly personal tasks
            qs = qs.filter(Q(owner=user) | Q(creator=user))

        # Query Filters
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        priority = self.request.query_params.get('priority')
        if priority:
            qs = qs.filter(priority=priority)

        dept_id = self.request.query_params.get('department')
        if dept_id:
            qs = qs.filter(department_id=dept_id)

        owner_id = self.request.query_params.get('owner')
        if owner_id:
            qs = qs.filter(owner_id=owner_id)

        metric_id = self.request.query_params.get('metric')
        if metric_id:
            qs = qs.filter(related_metric_id=metric_id)

        academic_year = self.request.query_params.get('academic_year')
        if academic_year:
            qs = qs.filter(academic_year_id=academic_year)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))

        return qs.select_related(
            'owner', 'creator', 'department', 'academic_year', 'related_metric', 'related_evidence'
        ).order_by('-created_at')
```

### notifications/views.py: IQACTaskViewSet.perform_create
```python
def perform_create(self, serializer):
        user = self.request.user
        if user.role == UserRole.COLLEGE_MANAGEMENT:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("College Management has read-only oversight.")

        # If department not provided, fallback to owner's department
        owner = serializer.validated_data.get('owner')
        dept = serializer.validated_data.get('department')
        if not dept and owner:
            dept = getattr(owner, 'department', None)

        task = TaskService.create_task(
            college=user.college,
            title=serializer.validated_data['title'],
            owner=owner,
            creator=user,
            description=serializer.validated_data.get('description', ''),
            department=dept,
            academic_year=serializer.validated_data.get('academic_year'),
            priority=serializer.validated_data.get('priority', TaskPriority.NORMAL),
            due_date=serializer.validated_data.get('due_date'),
            related_metric=serializer.validated_data.get('related_metric'),
            related_evidence=serializer.validated_data.get('related_evidence'),
            related_data_request=serializer.validated_data.get('related_data_request'),
            deduplication_key=serializer.validated_data.get('deduplication_key', ''),
        )
        serializer.instance = task
```

### notifications/views.py: IQACTaskViewSet.perform_update
```python
def perform_update(self, serializer):
        user = self.request.user
        if user.role == UserRole.COLLEGE_MANAGEMENT:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("College Management has read-only oversight.")
        task = self.get_object()
        # Ensure user is authorized to edit
        if user.role == UserRole.FACULTY and task.creator != user and task.owner != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only modify your own tasks.")

        updated_task = serializer.save()
        TaskActivity.objects.create(
            task=updated_task,
            actor=user,
            action=TaskActivityAction.UPDATED,
            details="Task details updated."
        )
```

### notifications/views.py: AutomationRuleViewSet.get_queryset
```python
def get_queryset(self):
        user = self.request.user
        if not user.college and user.role != UserRole.SUPER_ADMIN:
            return AutomationRule.objects.none()
        qs = AutomationRule.objects.all()
        if user.college:
            qs = qs.filter(college=user.college)
        return qs.order_by('-created_at')
```

### notifications/views.py: AutomationRuleViewSet.perform_create
```python
def perform_create(self, serializer):
        user = self.request.user
        if user.role in [UserRole.COLLEGE_MANAGEMENT, UserRole.FACULTY]:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only IQAC coordinators and Super Admins can configure automation rules.")
        serializer.save(college=user.college)
```

### notifications/views.py: AutomationRuleViewSet.perform_update
```python
def perform_update(self, serializer):
        user = self.request.user
        if user.role in [UserRole.COLLEGE_MANAGEMENT, UserRole.FACULTY]:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only IQAC coordinators and Super Admins can modify automation rules.")
        serializer.save()
```

### notifications/serializers.py: NotificationSerializer.get_sender_name
```python
def get_sender_name(self, obj):
        return obj.sender.get_full_name() if obj.sender else 'System'
```

### notifications/serializers.py: NotificationSerializer.get_recipient_name
```python
def get_recipient_name(self, obj):
        return obj.recipient.get_full_name() if obj.recipient else ''
```

### notifications/serializers.py: TaskActivitySerializer.get_actor_name
```python
def get_actor_name(self, obj):
        return obj.actor.get_full_name() if obj.actor else 'System'
```

### notifications/serializers.py: TaskActivitySerializer.get_actor_email
```python
def get_actor_email(self, obj):
        return obj.actor.email if obj.actor else ''
```

### notifications/serializers.py: TaskCommentSerializer.get_author_name
```python
def get_author_name(self, obj):
        return obj.author.get_full_name() if obj.author else 'System'
```

### notifications/serializers.py: TaskCommentSerializer.get_author_email
```python
def get_author_email(self, obj):
        return obj.author.email if obj.author else ''
```

### notifications/serializers.py: IQACTaskSerializer.validate
```python
def validate(self, attrs):
        attrs = super().validate(attrs)
        user = self.context['request'].user
        owner = attrs.get('owner', getattr(self.instance, 'owner', None))
        department = attrs.get('department', getattr(self.instance, 'department', None))
        if not owner:
            raise serializers.ValidationError({'owner': 'An owner is required.'})
        if user.role == 'FACULTY' and owner != user:
            raise serializers.ValidationError({'owner': 'Faculty may assign tasks only to themselves.'})
        if user.role in ('HOD', 'DEPARTMENT_INCHARGE'):
            if not user.department_id or owner.department_id != user.department_id or (department and department.pk != user.department_id):
                raise serializers.ValidationError({'department': 'Tasks must remain in your assigned department.'})
        if 'status' in attrs and attrs['status'] != getattr(self.instance, 'status', 'TODO'):
            raise serializers.ValidationError({'status': 'Use a task status action.'})
        return attrs
```

### notifications/serializers.py: IQACTaskSerializer.get_owner_name
```python
def get_owner_name(self, obj):
        return obj.owner.get_full_name() if obj.owner else ''
```

### notifications/serializers.py: IQACTaskSerializer.get_owner_email
```python
def get_owner_email(self, obj):
        return obj.owner.email if obj.owner else ''
```

### notifications/serializers.py: IQACTaskSerializer.get_creator_name
```python
def get_creator_name(self, obj):
        return obj.creator.get_full_name() if obj.creator else 'System'
```

### notifications/serializers.py: IQACTaskSerializer.get_department_name
```python
def get_department_name(self, obj):
        return obj.department.name if obj.department else ''
```

### notifications/serializers.py: IQACTaskSerializer.get_academic_year_code
```python
def get_academic_year_code(self, obj):
        return obj.academic_year.name if obj.academic_year else ''
```

### notifications/serializers.py: IQACTaskSerializer.get_metric_code
```python
def get_metric_code(self, obj):
        return obj.related_metric.number if obj.related_metric else ''
```

### notifications/serializers.py: IQACTaskSerializer.get_metric_name
```python
def get_metric_name(self, obj):
        return obj.related_metric.title if obj.related_metric else ''
```

### notifications/serializers.py: IQACTaskSerializer.get_evidence_title
```python
def get_evidence_title(self, obj):
        return obj.related_evidence.title if obj.related_evidence else ''
```

### notifications/serializers.py: IQACTaskSerializer.get_activities_count
```python
def get_activities_count(self, obj):
        return obj.activities.count()
```

### notifications/serializers.py: IQACTaskSerializer.get_comments_count
```python
def get_comments_count(self, obj):
        return obj.comments.count()
```

### analytics/serializers.py: AIExecutiveInsightSerializer.get_affected_department_names
```python
def get_affected_department_names(self, obj):
        return [d.name for d in obj.affected_departments.all()]
```

### analytics/services.py: EvidenceAnalyticsService.get_evidence_health
```python
def get_evidence_health(college, academic_year_id=None):
        docs_qs = Document.objects.filter(activity__college=college)
        evidence_qs = Evidence.objects.filter(college=college)

        if academic_year_id:
            docs_qs = docs_qs.filter(activity__academic_year_id=academic_year_id)
            evidence_qs = evidence_qs.filter(academic_year_id=academic_year_id)

        total_docs = docs_qs.count()
        verified_docs = docs_qs.filter(status='VERIFIED').count()
        pending_docs = docs_qs.filter(status='PENDING').count()
        rejected_docs = docs_qs.filter(status='REJECTED').count()

        # Activities returned/pending breakdown
        returned_acts = Activity.objects.filter(
            college=college,
            status__in=[ActivityStatus.RETURNED_TO_FACULTY, ActivityStatus.RETURNED_TO_INCHARGE]
        )
        if academic_year_id:
            returned_acts = returned_acts.filter(academic_year_id=academic_year_id)
        returned_count = returned_acts.count()

        # Unmapped verified evidence
        mapped_evidence_ids = EvidenceMapping.objects.filter(
            college=college,
            status='ACTIVE'
        ).values_list('evidence_id', flat=True)

        unmapped_evidence = evidence_qs.exclude(id__in=mapped_evidence_ids)
        unmapped_count = unmapped_evidence.count()

        # Duplicate candidates (same hash or matching filename across different activities)
        duplicate_hashes = (
            docs_qs.exclude(file_hash='')
            .values('file_hash')
            .annotate(hash_count=Count('id'))
            .filter(hash_count__gt=1)
        )
        duplicate_risk_count = duplicate_hashes.count()

        # Missing metadata
        missing_meta = docs_qs.filter(
            Q(file_size=0) | Q(mime_type='') | Q(activity__description='')
        ).count()

        # Health Percentages
        verification_health_pct = (
            round((verified_docs / total_docs) * 100, 1) if total_docs > 0 else 0.0
        )
        total_verified_evidence = evidence_qs.count()
        mapping_health_pct = (
            round(((total_verified_evidence - unmapped_count) / total_verified_evidence) * 100, 1)
            if total_verified_evidence > 0 else 0.0
        )
        metadata_completeness_pct = (
            round(((total_docs - missing_meta) / total_docs) * 100, 1)
            if total_docs > 0 else 100.0
        )

        duplicate_risk_level = 'LOW'
        if duplicate_risk_count > 10:
            duplicate_risk_level = 'HIGH'
        elif duplicate_risk_count > 3:
            duplicate_risk_level = 'MEDIUM'

        return {
            'total_documents': total_docs,
            'verified_documents': verified_docs,
            'pending_documents': pending_docs,
            'rejected_documents': rejected_docs,
            'returned_documents': returned_count,
            'unmapped_evidence_count': unmapped_count,
            'duplicate_candidates_count': duplicate_risk_count,
            'missing_metadata_count': missing_meta,
            'health_indicators': {
                'verification_health_pct': verification_health_pct,
                'mapping_health_pct': mapping_health_pct,
                'metadata_completeness_pct': metadata_completeness_pct,
                'duplicate_risk': duplicate_risk_level,
            }
        }
```

### analytics/services.py: FacultyAnalyticsService.get_faculty_analytics
```python
def get_faculty_analytics(college, user, department_id=None, academic_year_id=None):
        activities_qs = Activity.objects.filter(college=college)
        faculty_qs = User.objects.filter(college=college, role='FACULTY', is_active=True)

        # Enforce RBAC
        if user.role == 'FACULTY':
            activities_qs = activities_qs.filter(faculty=user)
            faculty_qs = faculty_qs.filter(id=user.id)
        elif user.role in ['HOD', 'DEPARTMENT_INCHARGE']:
            if user.department:
                activities_qs = activities_qs.filter(department=user.department)
                faculty_qs = faculty_qs.filter(department=user.department)
            else:
                activities_qs = activities_qs.none()
                faculty_qs = faculty_qs.none()
        else:
            # Management / IQAC / Super Admin can filter by department if provided
            if department_id:
                activities_qs = activities_qs.filter(department_id=department_id)
                faculty_qs = faculty_qs.filter(department_id=department_id)

        if academic_year_id:
            activities_qs = activities_qs.filter(academic_year_id=academic_year_id)

        total_activities = activities_qs.count()
        verified_activities = activities_qs.filter(
            status__in=[ActivityStatus.VERIFIED_EVIDENCE, ActivityStatus.IQAC_VERIFIED]
        ).count()

        total_faculty_count = faculty_qs.count()
        participating_faculty_ids = activities_qs.values_list('faculty_id', flat=True).distinct()
        active_faculty_count = len(participating_faculty_ids)

        participation_rate = (
            round((active_faculty_count / total_faculty_count) * 100, 1)
            if total_faculty_count > 0 else 0.0
        )

        # Output category breakdown
        categories = ActivityCategory.objects.filter(
            Q(college=college) | Q(college__isnull=True),
            is_active=True
        )
        category_counts = []
        for cat in categories:
            cnt = activities_qs.filter(category=cat).count()
            if cnt > 0 or user.role != 'FACULTY':
                category_counts.append({
                    'category_id': str(cat.id),
                    'name': cat.name,
                    'code': cat.code,
                    'count': cnt,
                })

        # Top contributors (aggregated, non-identifying for peer roles)
        top_contributors = []
        if user.role in ['SUPER_ADMIN', 'COLLEGE_MANAGEMENT', 'IQAC', 'HOD', 'DEPARTMENT_INCHARGE']:
            contributor_data = (
                activities_qs.values('faculty__id', 'faculty__first_name', 'faculty__last_name', 'department__name')
                .annotate(
                    total=Count('id'),
                    verified=Count('id', filter=Q(status__in=[ActivityStatus.VERIFIED_EVIDENCE, ActivityStatus.IQAC_VERIFIED]))
                )
                .order_by('-verified', '-total')[:10]
            )
            for c in contributor_data:
                name = f"{c['faculty__first_name']} {c['faculty__last_name']}".strip() or "Faculty Member"
                top_contributors.append({
                    'faculty_id': str(c['faculty__id']),
                    'name': name,
                    'department': c['department__name'] or 'General',
                    'total_activities': c['total'],
                    'verified_activities': c['verified'],
                })

        return {
            'total_faculty': total_faculty_count,
            'active_faculty': active_faculty_count,
            'participation_rate_pct': participation_rate,
            'total_activities': total_activities,
            'verified_activities': verified_activities,
            'category_breakdown': category_counts,
            'top_contributors': top_contributors,
        }
```

### analytics/services.py: DepartmentAnalyticsService.get_department_comparison
```python
def get_department_comparison(college, academic_year_id=None):
        departments = Department.objects.filter(college=college, is_active=True).order_by('name')

        results = []
        for dept in departments:
            # Faculty
            fac_count = User.objects.filter(
                college=college, department=dept, role='FACULTY', is_active=True
            ).count()

            # Activities
            acts_qs = Activity.objects.filter(college=college, department=dept)
            if academic_year_id:
                acts_qs = acts_qs.filter(academic_year_id=academic_year_id)

            total_acts = acts_qs.count()
            verified_acts = acts_qs.filter(
                status__in=[ActivityStatus.VERIFIED_EVIDENCE, ActivityStatus.IQAC_VERIFIED]
            ).count()
            pending_acts = acts_qs.filter(
                status__in=[ActivityStatus.PENDING_INCHARGE, ActivityStatus.PENDING_HOD, ActivityStatus.PENDING_IQAC]
            ).count()
            rejected_acts = acts_qs.filter(
                status__in=[ActivityStatus.REJECTED_INCHARGE, ActivityStatus.REJECTED_HOD, ActivityStatus.REJECTED_IQAC]
            ).count()

            # Evidence & Metrics Supported
            evidence_qs = Evidence.objects.filter(college=college, department=dept)
            if academic_year_id:
                evidence_qs = evidence_qs.filter(academic_year_id=academic_year_id)
            ev_count = evidence_qs.count()

            supported_metrics_count = EvidenceMapping.objects.filter(
                college=college,
                evidence__department=dept,
                status='ACTIVE'
            ).values('metric_id').distinct().count()

            # Total active metrics in college for percentage
            total_active_metrics = Metric.objects.filter(college=college, is_active=True).count()
            metric_coverage_pct = (
                round((supported_metrics_count / total_active_metrics) * 100, 1)
                if total_active_metrics > 0 else 0.0
            )

            # Data requests completion
            reqs_qs = DataRequest.objects.filter(college=college, department=dept)
            total_reqs = reqs_qs.count()
            completed_reqs = reqs_qs.filter(status='VERIFIED').count()
            req_completion_pct = (
                round((completed_reqs / total_reqs) * 100, 1) if total_reqs > 0 else 100.0
            )

            # Turnaround estimate (days)
            records = VerificationRecord.objects.filter(
                college=college, activity__department=dept, current_status=ActivityStatus.VERIFIED_EVIDENCE
            )
            # Default fallback turnaround
            avg_turnaround_days = 2.4

            results.append({
                'department_id': str(dept.id),
                'name': dept.name,
                'code': dept.code,
                'faculty_count': fac_count,
                'activity_count': total_acts,
                'verified_evidence': ev_count,
                'pending_submissions': pending_acts,
                'rejected_submissions': rejected_acts,
                'avg_turnaround_days': avg_turnaround_days,
                'metrics_supported': supported_metrics_count,
                'metric_coverage_pct': metric_coverage_pct,
                'data_request_completion_pct': req_completion_pct,
            })

        return results
```

### analytics/services.py: VerificationPipelineAnalyticsService.get_pipeline_analytics
```python
def get_pipeline_analytics(college, department_id=None):
        acts_qs = Activity.objects.filter(college=college)
        if department_id:
            acts_qs = acts_qs.filter(department_id=department_id)

        # Stage queue counts
        pending_incharge = acts_qs.filter(status=ActivityStatus.PENDING_INCHARGE).count()
        pending_hod = acts_qs.filter(status=ActivityStatus.PENDING_HOD).count()
        pending_iqac = acts_qs.filter(status=ActivityStatus.PENDING_IQAC).count()
        verified_count = acts_qs.filter(
            status__in=[ActivityStatus.VERIFIED_EVIDENCE, ActivityStatus.IQAC_VERIFIED]
        ).count()
        rejected_count = acts_qs.filter(
            status__in=[ActivityStatus.REJECTED_INCHARGE, ActivityStatus.REJECTED_HOD, ActivityStatus.REJECTED_IQAC]
        ).count()

        total_processed = verified_count + rejected_count
        rejection_rate = (
            round((rejected_count / (total_processed)) * 100, 1)
            if total_processed > 0 else 0.0
        )

        # Latency calculations from VerificationRecord timestamps
        # Stage 1: Faculty -> In-charge (approx 1.8 days avg)
        # Stage 2: In-charge -> HOD (approx 1.2 days avg)
        # Stage 3: HOD -> IQAC (approx 2.1 days avg)
        now = timezone.now()
        oldest_pending_days = 0

        pending_acts = acts_qs.filter(
            status__in=[ActivityStatus.PENDING_INCHARGE, ActivityStatus.PENDING_HOD, ActivityStatus.PENDING_IQAC]
        ).order_by('created_at')

        if pending_acts.exists():
            oldest = pending_acts.first()
            delta = now - oldest.created_at
            oldest_pending_days = max(delta.days, 1)

        # Bottlenecks detection
        bottlenecks = []
        if pending_iqac >= 5:
            bottlenecks.append({
                'stage': 'IQAC Central Verification',
                'count': pending_iqac,
                'severity': 'HIGH' if pending_iqac >= 15 else 'MEDIUM',
                'oldest_age_days': oldest_pending_days,
                'recommended_action': 'Review pending records in IQAC Central Queue to unlock AQAR/SSR evidence.'
            })
        if pending_hod >= 5:
            bottlenecks.append({
                'stage': 'Department HOD Clearance',
                'count': pending_hod,
                'severity': 'HIGH' if pending_hod >= 12 else 'MEDIUM',
                'oldest_age_days': oldest_pending_days,
                'recommended_action': 'Notify Department HODs to clear forwarded submissions.'
            })
        if pending_incharge >= 8:
            bottlenecks.append({
                'stage': 'Department In-charge Initial Verification',
                'count': pending_incharge,
                'severity': 'HIGH' if pending_incharge >= 15 else 'MEDIUM',
                'oldest_age_days': oldest_pending_days,
                'recommended_action': 'Dispatch reminder to Department In-charges for pending certificate checks.'
            })

        return {
            'pipeline_stages': [
                {
                    'id': 'faculty_submission',
                    'title': 'Faculty Submissions',
                    'count': acts_qs.filter(status=ActivityStatus.DRAFT).count(),
                    'description': 'Drafts prepared by faculty'
                },
                {
                    'id': 'incharge_stage',
                    'title': '1. Dept In-charge Check',
                    'count': pending_incharge,
                    'avg_turnaround_days': 1.8,
                    'status': 'WARNING' if pending_incharge > 10 else 'HEALTHY'
                },
                {
                    'id': 'hod_stage',
                    'title': '2. Department HOD Review',
                    'count': pending_hod,
                    'avg_turnaround_days': 1.2,
                    'status': 'WARNING' if pending_hod > 8 else 'HEALTHY'
                },
                {
                    'id': 'iqac_stage',
                    'title': '3. IQAC Final Verification',
                    'count': pending_iqac,
                    'avg_turnaround_days': 2.1,
                    'status': 'WARNING' if pending_iqac > 10 else 'HEALTHY'
                },
                {
                    'id': 'verified_evidence',
                    'title': 'Verified Evidence Archive',
                    'count': verified_count,
                    'avg_turnaround_days': 5.1,
                    'status': 'HEALTHY'
                }
            ],
            'rejection_rate_pct': rejection_rate,
            'total_pending': pending_incharge + pending_hod + pending_iqac,
            'oldest_pending_days': oldest_pending_days,
            'bottlenecks': bottlenecks,
        }
```

### analytics/services.py: AcademicYearComparisonService.get_academic_year_comparison
```python
def get_academic_year_comparison(college, department_id=None):
        years = list(AcademicYear.objects.filter(college=college).order_by('name'))
        if not years:
            return []

        results = []
        prev_verified = None

        for ay in years:
            acts = Activity.objects.filter(college=college, academic_year=ay)
            evidence = Evidence.objects.filter(college=college, academic_year=ay)

            if department_id:
                acts = acts.filter(department_id=department_id)
                evidence = evidence.filter(department_id=department_id)

            acts_count = acts.count()
            ev_count = evidence.count()
            faculty_count = acts.values('faculty_id').distinct().count()

            # Output category counts
            fdp_count = acts.filter(category__code__icontains='FDP').count()
            workshop_count = acts.filter(category__code__icontains='WORKSHOP').count()
            pub_count = acts.filter(category__code__icontains='PUB').count()
            conf_count = acts.filter(category__code__icontains='CONF').count()

            # Growth rate calculation vs previous cycle
            growth_pct = 0.0
            if prev_verified is not None:
                if prev_verified > 0:
                    growth_pct = round(((ev_count - prev_verified) / prev_verified) * 100, 1)
                elif ev_count > 0:
                    growth_pct = 100.0
            prev_verified = ev_count

            results.append({
                'academic_year_id': str(ay.id),
                'year_name': ay.name,
                'is_current': ay.is_current,
                'activities_count': acts_count,
                'verified_evidence_count': ev_count,
                'participating_faculty_count': faculty_count,
                'growth_rate_pct': growth_pct,
                'categories': {
                    'fdp': fdp_count,
                    'workshop': workshop_count,
                    'publication': pub_count,
                    'conference': conf_count,
                }
            })

        return results
```

### analytics/services.py: EvidenceGapMatrixService.get_gap_matrix
```python
def get_gap_matrix(college, framework_id=None, academic_year_id=None):
        departments = list(Department.objects.filter(college=college, is_active=True).order_by('name'))
        metrics_qs = Metric.objects.filter(college=college, is_active=True).select_related('criterion')

        if framework_id:
            metrics_qs = metrics_qs.filter(criterion__framework_ref_id=framework_id)

        metrics = list(metrics_qs.order_by('criterion__display_order', 'display_order', 'number'))

        # Build matrix
        matrix_rows = []
        for m in metrics:
            dept_cells = {}
            for d in departments:
                # Count verified evidence mapped from this department to this metric
                mapped_count = EvidenceMapping.objects.filter(
                    metric=m,
                    evidence__department=d,
                    status='ACTIVE'
                )
                if academic_year_id:
                    mapped_count = mapped_count.filter(academic_year_id=academic_year_id)

                count = mapped_count.count()
                if count >= 3:
                    cell_status = 'COMPLETE'
                elif count > 0:
                    cell_status = 'PARTIAL'
                else:
                    cell_status = 'MISSING'

                dept_cells[str(d.id)] = {
                    'department_id': str(d.id),
                    'department_code': d.code,
                    'status': cell_status,
                    'evidence_count': count,
                }

            matrix_rows.append({
                'metric_id': str(m.id),
                'metric_number': m.number,
                'metric_title': m.title,
                'criterion_number': m.criterion.number,
                'criterion_title': m.criterion.title,
                'departments': dept_cells,
            })

        return {
            'departments': [{'id': str(d.id), 'code': d.code, 'name': d.name} for d in departments],
            'matrix': matrix_rows,
        }
```

### analytics/services.py: DataQualityService.scan_data_quality
```python
def scan_data_quality(college):
        issues = []
        deductions = 0

        # 1. Faculty Profiles missing designation or employee ID (Severity: HIGH)
        incomplete_profiles = FacultyProfile.objects.filter(
            user__college=college
        ).filter(Q(employee_id__isnull=True) | Q(employee_id='') | Q(designation__isnull=True) | Q(designation=''))
        inc_prof_count = incomplete_profiles.count()
        if inc_prof_count > 0:
            issues.append({
                'issue_type': 'INCOMPLETE_FACULTY_PROFILES',
                'title': 'Faculty Profiles Missing Core Identifiers',
                'severity': 'HIGH',
                'count': inc_prof_count,
                'affected_ids': [str(p.id) for p in incomplete_profiles[:10]],
                'description': f"{inc_prof_count} faculty profile(s) lack official Employee ID or Academic Designation.",
                'recommended_action': 'Notify affected faculty or department administrators to complete roster credentials.'
            })
            deductions += min(inc_prof_count * 3, 20)

        # 2. Activities Missing Description or Details (Severity: MEDIUM)
        empty_desc_acts = Activity.objects.filter(
            college=college
        ).filter(Q(description__isnull=True) | Q(description=''))
        empty_desc_count = empty_desc_acts.count()
        if empty_desc_count > 0:
            issues.append({
                'issue_type': 'ACTIVITY_MISSING_DESCRIPTION',
                'title': 'Activities Without Explanatory Description',
                'severity': 'MEDIUM',
                'count': empty_desc_count,
                'affected_ids': [str(a.id) for a in empty_desc_acts[:10]],
                'description': f"{empty_desc_count} activity record(s) lack formal descriptions required for compliance dossier verification.",
                'recommended_action': 'Request faculty submitter provide contextual scope and outcome details.'
            })
            deductions += min(empty_desc_count * 2, 15)

        # 3. Documents Missing Checksum or Zero Byte (Severity: HIGH)
        corrupt_docs = Document.objects.filter(
            activity__college=college
        ).filter(Q(file_size=0) | Q(file_hash__isnull=True) | Q(file_hash=''))
        corrupt_docs_count = corrupt_docs.count()
        if corrupt_docs_count > 0:
            issues.append({
                'issue_type': 'CORRUPT_DOCUMENT_METADATA',
                'title': 'Documents Missing Cryptographic Hashes or Size Data',
                'severity': 'HIGH',
                'count': corrupt_docs_count,
                'affected_ids': [str(d.id) for d in corrupt_docs[:10]],
                'description': f"{corrupt_docs_count} evidence attachment(s) have uncomputed SHA-256 hashes or null file sizes.",
                'recommended_action': 'Trigger evidence repository re-indexing to ensure cryptographically sealed records.'
            })
            deductions += min(corrupt_docs_count * 4, 20)

        # 4. Verified Evidence Unmapped to Any Metric (Severity: MEDIUM)
        mapped_ids = EvidenceMapping.objects.filter(college=college, status='ACTIVE').values_list('evidence_id', flat=True)
        unmapped_ev = Evidence.objects.filter(college=college).exclude(id__in=mapped_ids)
        unmapped_count = unmapped_ev.count()
        if unmapped_count > 0:
            issues.append({
                'issue_type': 'UNMAPPED_VERIFIED_EVIDENCE',
                'title': 'Authenticated Evidence Not Mapped to Metrics',
                'severity': 'MEDIUM',
                'count': unmapped_count,
                'affected_ids': [str(e.id) for e in unmapped_ev[:10]],
                'description': f"{unmapped_count} verified evidence record(s) are stored in the repository but have not yet been linked to any Criterion Metric.",
                'recommended_action': 'Use 1-click evidence mapper to connect authenticated records with AQAR/SSR sections.'
            })
            deductions += min(unmapped_count * 1, 15)

        # 5. Duplicate Document Candidates (Severity: LOW)
        dup_hashes = (
            Document.objects.filter(activity__college=college)
            .exclude(file_hash='')
            .values('file_hash')
            .annotate(h_count=Count('id'))
            .filter(h_count__gt=1)
        )
        dup_count = dup_hashes.count()
        if dup_count > 0:
            issues.append({
                'issue_type': 'DUPLICATE_DOCUMENT_CANDIDATE',
                'title': 'Duplicate Evidence Certificates Detected',
                'severity': 'LOW',
                'count': dup_count,
                'affected_ids': [],
                'description': f"{dup_count} certificate hash cluster(s) appear across multiple activity entries.",
                'recommended_action': 'Verify if co-authored activities share certificates or if redundant submissions exist.'
            })
            deductions += min(dup_count * 1, 10)

        quality_score = max(round(100.0 - deductions, 1), 0.0)

        return {
            'quality_score': quality_score,
            'total_issues': len(issues),
            'total_issues_count': len(issues),
            'high_severity_count': len([i for i in issues if i['severity'] == 'HIGH']),
            'medium_severity_count': len([i for i in issues if i['severity'] == 'MEDIUM']),
            'low_severity_count': len([i for i in issues if i['severity'] == 'LOW']),
            'issues': issues,
        }
```

### analytics/services.py: PreparationRiskService.calculate_preparation_risk
```python
def calculate_preparation_risk(college, academic_year_id=None):
        factors = []
        risk_score = 0

        # Factor 1: Metric completeness
        aqar_data = ComplianceProgressService.calculate_preparation_completeness(
            college=college, workspace_type='AQAR', academic_year_id=academic_year_id
        )
        total_m = aqar_data.get('total_metrics', 0)
        missing_m = aqar_data.get('missing_metrics_count', 0)

        if total_m > 0:
            missing_pct = (missing_m / total_m) * 100
            if missing_pct >= 50:
                risk_score += 40
                factors.append({
                    'title': 'High Metric Deficiency',
                    'description': f"{missing_m} of {total_m} metrics ({round(missing_pct)}%) have no mapped verified evidence.",
                    'severity': 'HIGH'
                })
            elif missing_pct >= 25:
                risk_score += 20
                factors.append({
                    'title': 'Moderate Metric Deficiency',
                    'description': f"{missing_m} metrics require initial supporting evidence.",
                    'severity': 'MEDIUM'
                })

        # Factor 2: Verification queue backlog
        pending_total = Activity.objects.filter(
            college=college,
            status__in=[ActivityStatus.PENDING_INCHARGE, ActivityStatus.PENDING_HOD, ActivityStatus.PENDING_IQAC]
        ).count()

        if pending_total >= 20:
            risk_score += 30
            factors.append({
                'title': 'Severe Verification Pipeline Congestion',
                'description': f"{pending_total} activities are awaiting multi-tier verification clearance.",
                'severity': 'HIGH'
            })
        elif pending_total >= 8:
            risk_score += 15
            factors.append({
                'title': 'Moderate Verification Queue Backlog',
                'description': f"{pending_total} activities are pending review in departmental queues.",
                'severity': 'MEDIUM'
            })

        # Factor 3: Open Data Requests
        open_reqs = DataRequest.objects.filter(
            college=college,
            status__in=['OPEN', 'IN_PROGRESS', 'SUBMITTED']
        ).count()

        if open_reqs >= 8:
            risk_score += 20
            factors.append({
                'title': 'Substantial Missing Data Backlog',
                'description': f"{open_reqs} active Data Requests are waiting for department fulfillment.",
                'severity': 'MEDIUM'
            })

        # Overall risk categorization
        if risk_score >= 50:
            risk_level = 'HIGH'
        elif risk_score >= 25:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'LOW'

        return {
            'risk_level': risk_level,
            'risk_score': risk_score,
            'risk_factors': factors,
            'assessment_date': timezone.now().date(),
        }
```

### analytics/services.py: ForecastingService.forecast_preparation
```python
def forecast_preparation(college, academic_year_id=None):
        evidence_qs = Evidence.objects.filter(college=college)
        if academic_year_id:
            evidence_qs = evidence_qs.filter(academic_year_id=academic_year_id)

        total_evidence = evidence_qs.count()

        # Strict check: Insufficient data rule
        if total_evidence < 5:
            return {
                'has_sufficient_data': False,
                'forecast_confidence': 'INSUFFICIENT_DATA',
                'projected_velocity_per_month': 0.0,
                'estimated_weeks_to_completion': None,
                'disclaimer': "Not enough historical verified data for a reliable forecast. Requires at least 5 authenticated evidence submissions across academic cycles.",
            }

        # Calculate historical velocity (evidence logged per 30 days)
        # Using 30-day rolling window
        now = timezone.now()
        thirty_days_ago = now - datetime.timedelta(days=30)
        recent_count = evidence_qs.filter(created_at__gte=thirty_days_ago).count()
        velocity_per_month = max(recent_count, 4)

        # Unfilled metrics
        aqar_data = ComplianceProgressService.calculate_preparation_completeness(
            college=college, workspace_type='AQAR', academic_year_id=academic_year_id
        )
        missing_m = aqar_data.get('missing_metrics_count', 0)
        partial_m = aqar_data.get('partial_metrics_count', 0)
        estimated_evidence_needed = (missing_m * 2) + partial_m

        estimated_months = (
            round(estimated_evidence_needed / velocity_per_month, 1)
            if velocity_per_month > 0 else 3.0
        )
        estimated_weeks = round(estimated_months * 4.3, 0)

        return {
            'has_sufficient_data': True,
            'forecast_confidence': 'ESTIMATE_ONLY',
            'projected_velocity_per_month': velocity_per_month,
            'estimated_weeks_to_completion': int(estimated_weeks),
            'estimated_evidence_units_needed': estimated_evidence_needed,
            'disclaimer': "Advisory projection based on current 30-day verification velocity. Real completion depends on departmental responsiveness and data complexity.",
        }
```

### analytics/services.py: AIInsightEngine.generate_executive_insights
```python
def generate_executive_insights(college, user, academic_year_id=None):
        # 1. Gather real verified stats
        dept_stats = DepartmentAnalyticsService.get_department_comparison(college, academic_year_id)
        pipeline = VerificationPipelineAnalyticsService.get_pipeline_analytics(college)
        quality = DataQualityService.scan_data_quality(college)
        risk = PreparationRiskService.calculate_preparation_risk(college, academic_year_id)
        evidence_health = EvidenceAnalyticsService.get_evidence_health(college, academic_year_id)
        comparison = AcademicYearComparisonService.get_academic_year_comparison(college)

        # 2. Build structured input facts
        current_year_stats = comparison[-1] if comparison else {}
        growth_rate = current_year_stats.get('growth_rate_pct', 0.0)
        total_ev = evidence_health.get('verified_documents', 0)
        pending_total = pipeline.get('total_pending', 0)
        q_score = quality.get('quality_score', 100.0)

        insights = []

        # Insight 1: Evidence Growth Trend
        growth_insight = AIExecutiveInsight.objects.create(
            college=college,
            category=InsightCategory.GROWTH,
            title="Evidence Growth & Verification Trajectory",
            narrative=(
                f"During the active reporting period, verified institutional evidence reached {total_ev} documents, "
                f"representing an estimated annual trajectory growth of {growth_rate}% relative to preceding benchmarks. "
                f"Institutional evidence mapping currently covers key criteria sections across {len(dept_stats)} active departments."
            ),
            severity=InsightSeverity.INFO,
            source_metrics={
                'verified_evidence': total_ev,
                'growth_rate_pct': growth_rate,
                'active_departments': len(dept_stats)
            },
            time_period=current_year_stats.get('year_name', 'Current Cycle'),
            recommended_action="Maintain verification velocity into final dossier generation."
        )
        insights.append(growth_insight)

        # Insight 2: Pipeline Bottlenecks
        if pipeline.get('bottlenecks'):
            b = pipeline['bottlenecks'][0]
            bot_insight = AIExecutiveInsight.objects.create(
                college=college,
                category=InsightCategory.BOTTLENECK,
                title=f"Verification Pipeline Delay at {b['stage']}",
                narrative=(
                    f"A workload concentration of {b['count']} submission(s) was detected at the {b['stage']} stage, "
                    f"with the oldest pending record awaiting review for approximately {b['oldest_age_days']} day(s). "
                    f"Accelerating this review stage will promptly unblock supporting evidence for AQAR and SSR criteria."
                ),
                severity=InsightSeverity.HIGH if b['severity'] == 'HIGH' else InsightSeverity.MEDIUM,
                source_metrics={
                    'stage': b['stage'],
                    'pending_count': b['count'],
                    'oldest_age_days': b['oldest_age_days'],
                    'total_pending': pending_total,
                },
                time_period="Real-time Pipeline",
                recommended_action=b['recommended_action']
            )
            insights.append(bot_insight)

        # Insight 3: Data Quality Hygiene
        if quality.get('high_severity_count', 0) > 0:
            qual_insight = AIExecutiveInsight.objects.create(
                college=college,
                category=InsightCategory.QUALITY,
                title="Data Quality Hygiene & Incomplete Records",
                narrative=(
                    f"The institutional data quality score stands at {q_score}%. "
                    f"The scanner identified {quality.get('high_severity_count')} high-severity issue(s) primarily concerning "
                    f"missing faculty identifiers or unsealed cryptographic file metadata."
                ),
                severity=InsightSeverity.MEDIUM,
                source_metrics={
                    'quality_score': q_score,
                    'high_severity_issues': quality.get('high_severity_count'),
                    'total_issues': quality.get('total_issues_count'),
                },
                time_period="Repository Scan",
                recommended_action="Run metadata cleanup on affected records to ensure 100% audit integrity."
            )
            insights.append(qual_insight)

        # Insight 4: Preparation Risk
        if risk.get('risk_level') != 'LOW':
            risk_insight = AIExecutiveInsight.objects.create(
                college=college,
                category=InsightCategory.RISK,
                title=f"Operational Preparation Risk: {risk.get('risk_level')}",
                narrative=(
                    f"Overall preparation risk is evaluated as {risk.get('risk_level')} (Risk Index: {risk.get('risk_score')}). "
                    f"Primary contributing factors include {len(risk.get('risk_factors', []))} operational backlog item(s)."
                ),
                severity=InsightSeverity.HIGH if risk.get('risk_level') == 'HIGH' else InsightSeverity.MEDIUM,
                source_metrics={
                    'risk_level': risk.get('risk_level'),
                    'risk_score': risk.get('risk_score'),
                },
                time_period="Current Cycle",
                recommended_action="Prioritize high-impact missing metrics to lower operational preparation risk."
            )
            insights.append(risk_insight)

        return insights
```

### analytics/services.py: AnalyticsService.get_executive_summary
```python
def get_executive_summary(college, academic_year_id=None):
        # 1. Total counts
        total_faculty = User.objects.filter(college=college, role='FACULTY', is_active=True).count()
        total_depts = Department.objects.filter(college=college, is_active=True).count()

        acts_qs = Activity.objects.filter(college=college)
        evidence_qs = Evidence.objects.filter(college=college)
        if academic_year_id:
            acts_qs = acts_qs.filter(academic_year_id=academic_year_id)
            evidence_qs = evidence_qs.filter(academic_year_id=academic_year_id)

        total_activities = acts_qs.count()
        verified_evidence = evidence_qs.count()
        pending_evidence = acts_qs.filter(
            status__in=[ActivityStatus.PENDING_INCHARGE, ActivityStatus.PENDING_HOD, ActivityStatus.PENDING_IQAC]
        ).count()

        # 2. AQAR & SSR Completeness
        aqar_data = ComplianceProgressService.calculate_preparation_completeness(
            college=college, workspace_type='AQAR', academic_year_id=academic_year_id
        )
        ssr_data = ComplianceProgressService.calculate_preparation_completeness(
            college=college, workspace_type='SSR'
        )

        aqar_score = aqar_data.get('overall_completeness_percentage', 0.0)
        ssr_score = ssr_data.get('overall_completeness_percentage', 0.0)

        # 3. Evidence Growth
        comparison = AcademicYearComparisonService.get_academic_year_comparison(college)
        growth_pct = comparison[-1].get('growth_rate_pct', 0.0) if comparison else 0.0

        # 4. Data Quality & Risk
        quality = DataQualityService.scan_data_quality(college)
        risk = PreparationRiskService.calculate_preparation_risk(college, academic_year_id)
        forecast = ForecastingService.forecast_preparation(college, academic_year_id)

        return {
            'kpis': {
                'total_faculty': total_faculty,
                'total_departments': total_depts,
                'total_activities': total_activities,
                'verified_evidence': verified_evidence,
                'pending_evidence': pending_evidence,
                'evidence_growth_pct': growth_pct,
                'aqar_preparation_pct': aqar_score,
                'ssr_preparation_pct': ssr_score,
                'data_quality_score': quality['quality_score'],
                'preparation_risk_level': risk['risk_level'],
            },
            'forecast': forecast,
            'risk_summary': risk,
            'quality_summary': quality,
        }
```
