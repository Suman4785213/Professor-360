"""
Criteria app services — Phase 5: Progress Aggregation, Evidence Discovery, and Mapping Lifecycle
"""
import re
from django.db import models, transaction
from django.db.models import Count, Q, F
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied
from apps.audit.utils import log_action
from apps.activities.models import ActivityStatus
from apps.evidence.models import Evidence
from .models import Framework, Criterion, Metric, EvidenceRequirement, EvidenceMapping


class CriteriaProgressService:
    """
    Computes real-time database aggregations for accreditation criteria progress,
    evidence availability, and department/faculty contributions.
    """

    @staticmethod
    def get_framework_progress(college, framework_id=None, academic_year_id=None):
        """
        Calculates high-level progress across all criteria under a framework for an institution.
        """
        criteria_qs = Criterion.objects.filter(is_active=True)
        if college:
            criteria_qs = criteria_qs.filter(college=college)

        if framework_id:
            criteria_qs = criteria_qs.filter(framework_ref_id=framework_id)

        criteria = list(criteria_qs.prefetch_related('metrics').order_by('display_order', 'number'))

        total_criteria = len(criteria)
        total_metrics = 0
        metrics_with_evidence = 0
        total_evidence_mapped = 0

        criteria_progress_list = []

        for crit in criteria:
            metrics = list(crit.metrics.filter(is_active=True).order_by('display_order', 'number'))
            crit_metric_count = len(metrics)
            total_metrics += crit_metric_count

            # Query active mappings under this criterion
            mapping_filter = Q(metric__criterion=crit, status='ACTIVE')
            if college:
                mapping_filter &= Q(college=college)
            if academic_year_id:
                mapping_filter &= Q(academic_year_id=academic_year_id)

            crit_mappings = EvidenceMapping.objects.filter(mapping_filter)
            crit_evidence_count = crit_mappings.count()
            total_evidence_mapped += crit_evidence_count

            # Metrics with at least 1 verified evidence item
            metrics_with_ev_ids = set(crit_mappings.values_list('metric_id', flat=True).distinct())
            crit_metrics_with_ev = len(metrics_with_ev_ids)
            metrics_with_evidence += crit_metrics_with_ev

            # Completion percentage
            if crit_metric_count > 0:
                completion_pct = round((crit_metrics_with_ev / crit_metric_count) * 100, 1)
            else:
                completion_pct = 0.0

            # Status determination
            if crit_evidence_count == 0:
                availability_status = 'NO_EVIDENCE'
            elif crit_metrics_with_ev < crit_metric_count:
                availability_status = 'PARTIAL'
            elif completion_pct >= 100.0:
                availability_status = 'AVAILABLE'
            else:
                availability_status = 'PARTIAL'

            criteria_progress_list.append({
                'id': str(crit.id),
                'number': crit.number,
                'title': crit.title,
                'description': crit.description,
                'weightage': float(crit.weightage),
                'metrics_count': crit_metric_count,
                'metrics_with_evidence_count': crit_metrics_with_ev,
                'total_evidence_count': crit_evidence_count,
                'completion_percentage': completion_pct,
                'availability_status': availability_status,
            })

        overall_availability_pct = (
            round((metrics_with_evidence / total_metrics) * 100, 1)
            if total_metrics > 0 else 0.0
        )

        return {
            'total_criteria': total_criteria,
            'total_metrics': total_metrics,
            'metrics_with_evidence': metrics_with_evidence,
            'metrics_without_evidence': max(total_metrics - metrics_with_evidence, 0),
            'total_evidence_mapped': total_evidence_mapped,
            'overall_availability_percentage': overall_availability_pct,
            'criteria': criteria_progress_list,
        }

    @staticmethod
    def get_criterion_detail_progress(criterion, academic_year_id=None):
        """
        Returns metric-by-metric progress and evidence availability for a specific criterion.
        """
        metrics = list(
            criterion.metrics.filter(is_active=True)
            .prefetch_related('requirements')
            .order_by('display_order', 'number')
        )

        metrics_progress_list = []
        total_evidence_count = 0
        metrics_with_evidence = 0

        for m in metrics:
            mapping_filter = Q(metric=m, status='ACTIVE')
            if academic_year_id:
                mapping_filter &= Q(academic_year_id=academic_year_id)

            ev_count = EvidenceMapping.objects.filter(mapping_filter).count()
            total_evidence_count += ev_count
            if ev_count > 0:
                metrics_with_evidence += 1

            benchmark = m.benchmark_count or 5
            progress_pct = min(round((ev_count / benchmark) * 100, 1), 100.0) if benchmark > 0 else 0.0

            if ev_count == 0:
                status = 'NO_EVIDENCE'
            elif ev_count < benchmark:
                status = 'PARTIAL'
            elif ev_count >= benchmark:
                status = 'AVAILABLE'
            else:
                status = 'PARTIAL'

            reqs = [
                {
                    'id': str(r.id),
                    'name': r.name,
                    'required_count': r.required_count,
                    'is_mandatory': r.is_mandatory,
                    'description': r.description,
                }
                for r in m.requirements.all()
            ]

            metrics_progress_list.append({
                'id': str(m.id),
                'number': m.number,
                'title': m.title,
                'description': m.description,
                'weightage': float(m.weightage),
                'benchmark_count': benchmark,
                'evidence_count': ev_count,
                'progress_percentage': progress_pct,
                'availability_status': status,
                'status': status,
                'requirements': reqs,
            })

        total_metrics = len(metrics)
        completion_pct = (
            round((metrics_with_evidence / total_metrics) * 100, 1)
            if total_metrics > 0 else 0.0
        )

        return {
            'criterion_id': str(criterion.id),
            'criterion_number': criterion.number,
            'criterion_title': criterion.title,
            'criterion_description': criterion.description,
            'weightage': float(criterion.weightage),
            'total_metrics': total_metrics,
            'metrics_with_evidence': metrics_with_evidence,
            'total_evidence_count': total_evidence_count,
            'completion_percentage': completion_pct,
            'metrics': metrics_progress_list,
        }

    @staticmethod
    def get_metric_contributions(metric, academic_year_id=None):
        """
        Computes department and faculty contribution breakdowns for a specific metric.
        """
        mapping_filter = Q(metric=metric, status='ACTIVE')
        if academic_year_id:
            mapping_filter &= Q(academic_year_id=academic_year_id)

        mappings = EvidenceMapping.objects.filter(mapping_filter)

        # Department breakdown
        dept_counts = (
            mappings.values(
                'evidence__department__id',
                'evidence__department__name',
                'evidence__department__code'
            )
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        departments_data = [
            {
                'id': str(d['evidence__department__id']),
                'name': d['evidence__department__name'] or 'General',
                'code': d['evidence__department__code'] or 'GEN',
                'count': d['count'],
            }
            for d in dept_counts if d['evidence__department__id']
        ]

        # Faculty breakdown
        fac_counts = (
            mappings.values(
                'evidence__faculty__id',
                'evidence__faculty__first_name',
                'evidence__faculty__last_name',
                'evidence__faculty__email',
                'evidence__faculty__employee_id'
            )
            .annotate(count=Count('id'))
            .order_by('-count')[:15]
        )

        faculty_data = [
            {
                'id': str(f['evidence__faculty__id']),
                'name': f"{f['evidence__faculty__first_name']} {f['evidence__faculty__last_name']}".strip() or f['evidence__faculty__email'],
                'employee_id': f['evidence__faculty__employee_id'] or '',
                'count': f['count'],
            }
            for f in fac_counts if f['evidence__faculty__id']
        ]

        # Academic year breakdown
        year_counts = (
            mappings.values('academic_year__id', 'academic_year__name')
            .annotate(count=Count('id'))
            .order_by('academic_year__name')
        )

        years_data = [
            {
                'id': str(y['academic_year__id']),
                'year': y['academic_year__name'] or 'Unknown',
                'count': y['count'],
            }
            for y in year_counts if y['academic_year__id']
        ]

        return {
            'metric_id': str(metric.id),
            'metric_number': metric.number,
            'metric_title': metric.title,
            'total_evidence_count': mappings.count(),
            'department_contributions': departments_data,
            'faculty_contributions': faculty_data,
            'academic_year_contributions': years_data,
        }


class EvidenceDiscoveryService:
    """
    Automatic discovery of candidate verified evidence for a Metric (Section 16).
    Searches verified institutional repository records matching metric requirements
    or keywords and surfaces them for 1-click mapping by IQAC.
    """

    @staticmethod
    def suggest_evidence_for_metric(metric, college, limit=10):
        # 1. Base query: Verified active evidence in this college not yet mapped to this metric
        mapped_ev_ids = EvidenceMapping.objects.filter(
            metric=metric,
            status='ACTIVE'
        ).values_list('evidence_id', flat=True)

        candidates = Evidence.objects.filter(
            college=college,
            is_verified=True,
            status='ACTIVE'
        ).exclude(id__in=mapped_ev_ids).select_related(
            'faculty', 'department', 'academic_year', 'document', 'activity'
        )

        # 2. Extract matching keywords and required document categories
        raw_words = re.findall(r'[a-zA-Z0-9]{3,}', (metric.title + " " + (metric.description or "")).lower())
        title_keywords = list(dict.fromkeys(raw_words))
        req_cats = list(
            metric.requirements.filter(document_category__isnull=False)
            .values_list('document_category__code', flat=True)
        )

        # 3. Build ranking Q filter
        q_filter = Q()
        if req_cats:
            q_filter |= Q(activity__documents__category__code__in=req_cats)
        for word in title_keywords[:8]:
            q_filter |= Q(title__icontains=word) | Q(description__icontains=word) | Q(category__icontains=word)

        if q_filter:
            matched_qs = candidates.filter(q_filter).distinct()
        else:
            matched_qs = candidates

        suggestions = []
        for ev in matched_qs[:limit]:
            # Provide match reason
            reasons = []
            ev_title_lower = (ev.title or '').lower()
            ev_cat_lower = (ev.category or '').lower()
            if any(w in ev_title_lower or w in ev_cat_lower for w in title_keywords):
                reasons.append("Title / Category Keyword Match")
            if req_cats and ev.activity and ev.activity.documents.filter(category__code__in=req_cats).exists():
                reasons.append("Matching Required Document Category")
            if not reasons:
                reasons.append("Institutional Evidence in Cycle")

            suggestions.append({
                'id': str(ev.id),
                'title': ev.title,
                'category': ev.category,
                'faculty_name': ev.faculty.get_full_name(),
                'faculty_employee_id': getattr(ev.faculty, 'employee_id', '') or '',
                'department_name': ev.department.name if ev.department else '',
                'department_code': ev.department.code if ev.department else '',
                'academic_year_name': ev.academic_year.name if ev.academic_year else '',
                'verified_at': ev.verified_at.isoformat() if ev.verified_at else None,
                'document_name': ev.document.file_name if ev.document else None,
                'match_reasons': reasons,
            })

        return suggestions


class EvidenceMappingService:
    """
    Service enforcing security, tenant boundary, and verified-only rules for Criteria Evidence Mappings.
    """

    @staticmethod
    def map_evidence(user, metric_id, evidence_id, notes=''):
        """
        Maps a verified institutional evidence record to an accreditation Metric.
        Strictly enforces:
        1. Role permissions (IQAC or Super Admin)
        2. Tenant boundaries
        3. Verified evidence only (Rule 2 & Section 28)
        4. Duplicate prevention
        """
        # Role check
        if user.role not in ['SUPER_ADMIN', 'IQAC']:
            raise PermissionDenied("Only IQAC Coordinators and Super Admins can map institutional evidence.")

        # Fetch metric
        try:
            metric = Metric.objects.select_related('criterion', 'college').get(id=metric_id)
        except Metric.DoesNotExist:
            raise ValidationError({'metric': 'Metric not found.'})

        # Tenant boundary on metric
        if user.role != 'SUPER_ADMIN' and user.college and metric.college_id != user.college_id:
            raise PermissionDenied("Cannot map to a metric from another institution.")

        # Fetch evidence
        try:
            evidence = Evidence.objects.select_related('college', 'activity', 'academic_year').get(id=evidence_id)
        except Evidence.DoesNotExist:
            raise ValidationError({'evidence': 'Evidence record not found.'})

        # Tenant boundary on evidence
        if user.role != 'SUPER_ADMIN' and user.college and evidence.college_id != user.college_id:
            raise PermissionDenied("Cannot map evidence belonging to another institution.")

        # Unverified evidence rule (Rule 2 & Section 28)
        if not evidence.is_verified or evidence.status != 'ACTIVE':
            raise ValidationError({'evidence': 'Only verified institutional evidence can be mapped to criteria.'})

        if evidence.activity and evidence.activity.status not in [ActivityStatus.VERIFIED_EVIDENCE, ActivityStatus.IQAC_VERIFIED]:
            raise ValidationError({'evidence': 'The underlying academic activity is not in a verified state.'})

        # Duplicate check (active mapping)
        existing = EvidenceMapping.objects.filter(metric=metric, evidence=evidence, status='ACTIVE').first()
        if existing:
            raise ValidationError({'detail': f'This evidence is already actively mapped to Metric {metric.number}.'})

        mapping = EvidenceMapping.objects.create(
            college=evidence.college,
            criterion=metric.criterion,
            metric=metric,
            evidence=evidence,
            academic_year=evidence.academic_year,
            mapped_by=user,
            notes=notes,
            status='ACTIVE'
        )

        log_action(
            actor=user,
            action='EVIDENCE_MAPPED',
            instance=mapping,
            comment=f'Mapped evidence "{evidence.title}" to Metric {metric.number} ({metric.criterion.number}).'
        )

        return mapping

    @staticmethod
    def bulk_map_evidence(user, metric_id, evidence_ids, notes=''):
        """
        Safely bulk maps multiple verified evidence records to a metric in an atomic transaction.
        """
        if user.role not in ['SUPER_ADMIN', 'IQAC']:
            raise PermissionDenied("Only IQAC Coordinators and Super Admins can create bulk evidence mappings.")

        if not evidence_ids:
            raise ValidationError({'evidence_ids': 'No evidence records selected for mapping.'})

        try:
            metric = Metric.objects.select_related('criterion', 'college').get(id=metric_id)
        except Metric.DoesNotExist:
            raise ValidationError({'metric': 'Metric not found.'})

        if user.role != 'SUPER_ADMIN' and user.college and metric.college_id != user.college_id:
            raise PermissionDenied("Cannot map to a metric from another institution.")

        ev_records = list(
            Evidence.objects.filter(id__in=evidence_ids).select_related('college', 'activity', 'academic_year')
        )

        if len(ev_records) != len(evidence_ids):
            raise ValidationError({'evidence_ids': 'One or more specified evidence records could not be found.'})

        mapped_count = 0
        skipped_duplicates = 0

        with transaction.atomic():
            for ev in ev_records:
                # Tenant boundary check
                if user.role != 'SUPER_ADMIN' and user.college and ev.college_id != user.college_id:
                    raise PermissionDenied(f'Evidence "{ev.title}" belongs to another institution.')

                # Verified check
                if not ev.is_verified or ev.status != 'ACTIVE':
                    raise ValidationError({'detail': f'Evidence "{ev.title}" is not in a verified state and cannot be mapped.'})

                # Check if already actively mapped
                if EvidenceMapping.objects.filter(metric=metric, evidence=ev, status='ACTIVE').exists():
                    skipped_duplicates += 1
                    continue

                EvidenceMapping.objects.create(
                    college=ev.college,
                    criterion=metric.criterion,
                    metric=metric,
                    evidence=ev,
                    academic_year=ev.academic_year,
                    mapped_by=user,
                    notes=notes,
                    status='ACTIVE'
                )
                mapped_count += 1

        log_action(
            actor=user,
            action='EVIDENCE_BULK_MAPPED',
            instance=metric,
            comment=f'Bulk mapped {mapped_count} evidence records to Metric {metric.number} ({skipped_duplicates} duplicates skipped).'
        )

        return {
            'mapped_count': mapped_count,
            'skipped_duplicates': skipped_duplicates,
            'metric_number': metric.number,
            'criterion_number': metric.criterion.number,
        }

    @staticmethod
    def archive_mapping(user, mapping_id, reason=''):
        """
        Archives an evidence mapping without deleting its historical audit trail.
        """
        if user.role not in ['SUPER_ADMIN', 'IQAC']:
            raise PermissionDenied("Only IQAC Coordinators and Super Admins can archive evidence mappings.")

        try:
            mapping = EvidenceMapping.objects.select_related('metric', 'evidence', 'college').get(id=mapping_id)
        except EvidenceMapping.DoesNotExist:
            raise ValidationError({'detail': 'Evidence mapping not found.'})

        if user.role != 'SUPER_ADMIN' and user.college and mapping.college_id != user.college_id:
            raise PermissionDenied("Cannot archive mapping from another institution.")

        mapping.status = 'ARCHIVED'
        mapping.archived_at = timezone.now()
        mapping.archived_by = user
        mapping.archive_reason = reason
        mapping.save()

        log_action(
            actor=user,
            action='EVIDENCE_MAPPING_ARCHIVED',
            instance=mapping,
            comment=f'Archived mapping of "{mapping.evidence.title}" to Metric {mapping.metric.number}. Reason: {reason}'
        )

        return mapping

    @staticmethod
    def restore_mapping(user, mapping_id):
        """
        Restores an archived mapping back to active status.
        """
        if user.role not in ['SUPER_ADMIN', 'IQAC']:
            raise PermissionDenied("Only IQAC Coordinators and Super Admins can restore evidence mappings.")

        try:
            mapping = EvidenceMapping.objects.select_related('metric', 'evidence', 'college').get(id=mapping_id)
        except EvidenceMapping.DoesNotExist:
            raise ValidationError({'detail': 'Evidence mapping not found.'})

        if user.role != 'SUPER_ADMIN' and user.college and mapping.college_id != user.college_id:
            raise PermissionDenied("Cannot restore mapping from another institution.")

        mapping.status = 'ACTIVE'
        mapping.archived_at = None
        mapping.archived_by = None
        mapping.archive_reason = ''
        mapping.save()

        log_action(
            actor=user,
            action='EVIDENCE_MAPPING_RESTORED',
            instance=mapping,
            comment=f'Restored mapping of "{mapping.evidence.title}" to Metric {mapping.metric.number}.'
        )

        return mapping
