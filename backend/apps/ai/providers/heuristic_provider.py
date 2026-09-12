"""
Heuristic & Rule-Based AI Provider
Performs pattern-matching, regex NLP extraction, confidence rating,
and structured translation without requiring external cloud API keys.
Guarantees 100% offline availability and fault tolerance.
"""
import re
from typing import Dict, Any, List, Optional
from .base import BaseAIProvider


class HeuristicAIProvider(BaseAIProvider):
    @property
    def name(self) -> str:
        return 'heuristic'

    @property
    def model_name(self) -> str:
        return 'iqac-heuristic-nlp-v1'

    def extract_certificate_fields(self, text: str, filename: str) -> Dict[str, Any]:
        """
        Heuristic field extraction using domain-trained regex patterns.
        """
        clean_text = " ".join(text.split()) if text else ""
        lines = [line.strip() for line in text.splitlines() if line.strip()] if text else []
        filename_lower = filename.lower()

        # 1. Detect Document Type
        doc_type = 'CERTIFICATE'
        if re.search(r'\b(participation|participated|attended)\b', clean_text, re.IGNORECASE):
            doc_type = 'PARTICIPATION'
        elif re.search(r'\b(completion|successfully completed|passed)\b', clean_text, re.IGNORECASE):
            doc_type = 'COMPLETION'
        elif re.search(r'\b(award|honour|first prize|winner|merit)\b', clean_text, re.IGNORECASE):
            doc_type = 'AWARD'
        elif re.search(r'\b(publication|journal|paper|conference proceedings)\b', clean_text, re.IGNORECASE):
            doc_type = 'PUBLICATION_PROOF'

        # 2. Extract Faculty / Participant Name
        faculty_name = None
        faculty_conf = 0.0
        name_patterns = [
            r'(?:certify that|presented to|awarded to|is given to)\s+(?:Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)?\s*([A-Z][a-zA-Z\s\.]{2,40})(?:\s+has|\s+of|\s+from|\s+for|\s+bearing|,)',
            r'This is to certify that\s+([A-Z][a-zA-Z\s\.]{2,40})',
            r'Name:\s*([A-Z][a-zA-Z\s\.]{2,40})',
        ]
        for pat in name_patterns:
            m = re.search(pat, clean_text, re.IGNORECASE)
            if m:
                extracted = m.group(1).strip()
                # Clean trailing noise words
                extracted = re.sub(r'\b(has|of|from|bearing|Department|Dept|College)\b.*$', '', extracted, flags=re.IGNORECASE).strip()
                if len(extracted) > 2:
                    faculty_name = extracted
                    faculty_conf = 0.88
                    break

        # 3. Extract Activity Title
        activity_title = None
        title_conf = 0.0
        title_patterns = [
            r'(?:completed|participated in|attended|programme on|course on|workshop on|fdp on)\s+["“\']?([^"”\'\.\n]{5,120})["”\'\.\n]?',
            r'titled\s+["“\']?([^"”\'\.\n]{5,120})["”\'\.\n]?',
            r'on\s+the\s+theme\s+["“\']?([^"”\'\.\n]{5,120})["”\'\.\n]?',
        ]
        for pat in title_patterns:
            m = re.search(pat, clean_text, re.IGNORECASE)
            if m:
                cand = m.group(1).strip()
                # strip noise
                cand = re.sub(r'\b(from|held|organized|conducted|during|dated)\b.*$', '', cand, flags=re.IGNORECASE).strip()
                if len(cand) >= 5:
                    activity_title = cand
                    title_conf = 0.89
                    break

        # Fallback title extraction from filename if text didn't yield one
        if not activity_title and filename:
            name_base = re.sub(r'\.[a-zA-Z0-9]+$', '', filename).replace('_', ' ').replace('-', ' ')
            if len(name_base) > 4:
                activity_title = name_base.title()
                title_conf = 0.65

        # 4. Extract Organizer
        organizer = None
        org_conf = 0.0
        org_patterns = [
            r'(?:organized by|conducted by|hosted by)\s+([^,\.\n]{4,100})',
            r'held at\s+([^,\.\n]{4,100})',
            r'by\s+Department of\s+([^,\.\n]{4,80})',
            r'(?:organized at|association with)\s+([^,\.\n]{4,100})',
        ]
        for pat in org_patterns:
            m = re.search(pat, clean_text, re.IGNORECASE)
            if m:
                cand = m.group(1).strip()
                cand = re.sub(r'\b(from|during|dated|on)\b.*$', '', cand, flags=re.IGNORECASE).strip()
                if len(cand) >= 4:
                    organizer = cand
                    org_conf = 0.85
                    break

        # Fallback organizer search for institutional terms
        if not organizer:
            org_match = re.search(r'([A-Z][a-zA-Z\s&]+(?:University|Institute|College|Academy|IIT|NIT|Council|Foundation|Organization))', clean_text)
            if org_match:
                organizer = org_match.group(1).strip()
                org_conf = 0.75

        # 5. Extract Dates
        start_date = None
        end_date = None
        date_conf = 0.0

        # Pattern: "from 12/05/2025 to 16/05/2025" or "12-05-2025 to 16-05-2025" or "12.05.2025"
        date_range_pat = r'(?:from\s+)?(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})\s+(?:to|-|through)\s+(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})'
        m_range = re.search(date_range_pat, clean_text, re.IGNORECASE)
        if m_range:
            start_date = self._normalize_date(m_range.group(1))
            end_date = self._normalize_date(m_range.group(2))
            date_conf = 0.92
        else:
            single_date_pat = r'\b(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{4})\b'
            dates_found = re.findall(single_date_pat, clean_text)
            if dates_found:
                start_date = self._normalize_date(dates_found[0])
                if len(dates_found) > 1:
                    end_date = self._normalize_date(dates_found[-1])
                date_conf = 0.82

        # 6. Extract Duration
        duration = None
        duration_conf = 0.0
        dur_patterns = [
            r'\b(\d+\s*(?:days?|hours?|weeks?|months?))\b',
            r'\b(one week|two weeks|three weeks|five days|six days|one month)\b',
            r'duration\s*:\s*([^,\.\n]{2,30})',
        ]
        for pat in dur_patterns:
            m = re.search(pat, clean_text, re.IGNORECASE)
            if m:
                duration = m.group(1).strip().capitalize()
                duration_conf = 0.90
                break

        # 7. Extract Certificate Number
        cert_no = None
        cert_conf = 0.0
        cert_patterns = [
            r'(?:certificate\s*(?:no|number|id)|cert\s*id|verification\s*code|ref\s*no|id\s*:)\s*[:\s#]?([A-Za-z0-9\-_/]{4,30})',
            r'\b(CERT[-_][A-Za-z0-9]{4,20})\b',
            r'\b(ID\s*:\s*[A-Za-z0-9]{6,20})\b',
        ]
        for pat in cert_patterns:
            m = re.search(pat, clean_text, re.IGNORECASE)
            if m:
                cert_no = m.group(1).strip()
                cert_conf = 0.94
                break

        # 8. Extract Venue / Mode
        venue = None
        venue_conf = 0.0
        if re.search(r'\b(online|virtual|webinar|zoom|google meet|teams|moodle)\b', clean_text, re.IGNORECASE):
            venue = "Online / Virtual Mode"
            venue_conf = 0.88
        elif organizer:
            venue = f"{organizer} Campus"
            venue_conf = 0.70

        # Build field map
        fields = {
            'activity_title': {
                'value': activity_title or '',
                'confidence': title_conf,
                'detected': bool(activity_title)
            },
            'faculty_name': {
                'value': faculty_name or '',
                'confidence': faculty_conf,
                'detected': bool(faculty_name)
            },
            'organizer': {
                'value': organizer or '',
                'confidence': org_conf,
                'detected': bool(organizer)
            },
            'start_date': {
                'value': start_date or '',
                'confidence': date_conf,
                'detected': bool(start_date)
            },
            'end_date': {
                'value': end_date or '',
                'confidence': date_conf if end_date else 0.0,
                'detected': bool(end_date)
            },
            'duration': {
                'value': duration or '',
                'confidence': duration_conf,
                'detected': bool(duration)
            },
            'certificate_number': {
                'value': cert_no or '',
                'confidence': cert_conf,
                'detected': bool(cert_no)
            },
            'venue': {
                'value': venue or '',
                'confidence': venue_conf,
                'detected': bool(venue)
            },
            'description': {
                'value': clean_text[:400] if clean_text else '',
                'confidence': 0.75 if clean_text else 0.0,
                'detected': bool(clean_text)
            }
        }

        # Calculate overall confidence across detected fields
        confidences = [f['confidence'] for f in fields.values() if f['detected']]
        overall_confidence = round(sum(confidences) / len(confidences), 2) if confidences else 0.0

        return {
            'document_type': doc_type,
            'fields': fields,
            'overall_confidence': overall_confidence
        }

    def classify_activity_category(
        self, text: str, available_categories: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Classifies activity category by matching text heuristics against available category codes & names.
        """
        combined = text.lower() if text else ""
        scores: Dict[str, float] = {}

        # Keyword dictionaries for standard categories
        keywords = {
            'FDP': ['fdp', 'faculty development', 'pedagogy', 'teaching learning', 'instructional', 'ai-assisted teaching'],
            'WORKSHOP': ['workshop', 'hands-on', 'hands on', 'bootcamp', 'practical session', 'hackathon'],
            'SEMINAR': ['seminar', 'symposium', 'colloquium', 'panel discussion'],
            'CONFERENCE': ['conference', 'proceedings', 'icest', 'ieee', 'springer', 'acm', 'paper presentation'],
            'CERTIFICATION': ['certification', 'certified', 'nptel', 'coursera', 'edx', 'udemy', 'aws certified', 'oracle'],
            'TRAINING': ['training', 'short term training', 'sttp', 'skill enhancement', 'refresher course'],
            'PUBLICATION': ['publication', 'journal', 'research paper', 'scopus', 'sci', 'ugc care', 'issn'],
            'RESEARCH': ['research grant', 'patent', 'fellowship', 'investigator', 'r&d', 'consultancy'],
            'AWARD': ['award', 'honour', 'best teacher', 'distinguished faculty', 'felicitation', 'gold medal'],
        }

        # Compute match score for each standard code
        for code, terms in keywords.items():
            match_count = sum(1 for term in terms if term in combined)
            if match_count > 0:
                scores[code] = min(0.60 + (match_count * 0.12), 0.96)

        # Match against available database categories
        ranked_categories = []
        best_match = None
        best_conf = 0.0

        for cat in available_categories:
            code = cat.get('code', '').upper()
            name = cat.get('name', '').lower()
            cat_id = str(cat.get('id', ''))

            # Check if name appears directly
            score = scores.get(code, 0.0)
            if name and name in combined:
                score = max(score, 0.88)

            if score > 0:
                entry = {
                    'id': cat_id,
                    'code': code,
                    'name': cat.get('name', ''),
                    'confidence': round(score, 2)
                }
                ranked_categories.append(entry)
                if score > best_conf:
                    best_conf = score
                    best_match = entry

        ranked_categories.sort(key=lambda x: x['confidence'], reverse=True)

        if not best_match and available_categories:
            # Fallback to first available category with low confidence
            first = available_categories[0]
            best_match = {
                'id': str(first.get('id', '')),
                'code': first.get('code', 'OTHER'),
                'name': first.get('name', 'General Activity'),
                'confidence': 0.35
            }

        return {
            'suggested_category_id': best_match.get('id') if best_match else None,
            'suggested_code': best_match.get('code', 'OTHER') if best_match else 'OTHER',
            'suggested_name': best_match.get('name', 'Other') if best_match else 'Other',
            'confidence': round(best_match.get('confidence', 0.0), 2) if best_match else 0.0,
            'alternative_categories': ranked_categories[1:5],
            'explanation': f"Classified based on keywords matched in document text."
        }

    def parse_search_query(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Translates natural language search queries into structured filter parameters.
        Example: "Show FDP certificates of CSE faculty from 2024-25"
        """
        q = query.lower() if query else ""

        extracted = {
            'keyword': None,
            'category_code': None,
            'department_code': None,
            'academic_year_name': None,
            'faculty_name': None,
            'metric_code': None,
            'confidence': 0.80,
            'explanation': "Structured filters parsed from natural language query."
        }

        # 1. Detect Category
        cat_map = {
            'fdp': 'FDP',
            'faculty development': 'FDP',
            'workshop': 'WORKSHOP',
            'seminar': 'SEMINAR',
            'conference': 'CONFERENCE',
            'certification': 'CERTIFICATION',
            'publication': 'PUBLICATION',
            'research': 'RESEARCH',
            'award': 'AWARD',
        }
        for term, code in cat_map.items():
            if re.search(r'\b' + term + r'\b', q):
                extracted['category_code'] = code
                break

        # 2. Detect Department
        dept_patterns = [
            (r'\b(cse|computer science)\b', 'CSE'),
            (r'\b(it|information technology)\b', 'IT'),
            (r'\b(ece|electronics)\b', 'ECE'),
            (r'\b(eee|electrical)\b', 'EEE'),
            (r'\b(mech|mechanical)\b', 'MECH'),
            (r'\b(civil)\b', 'CIVIL'),
            (r'\b(aids|ai|artificial intelligence)\b', 'AI&DS'),
        ]
        for pat, code in dept_patterns:
            if re.search(pat, q):
                extracted['department_code'] = code
                break

        # 3. Detect Academic Year / Year
        year_match = re.search(r'\b(20\d{2}[-_/]\d{2,4})\b', q)
        if year_match:
            extracted['academic_year_name'] = year_match.group(1).replace('_', '-')
        else:
            single_year = re.search(r'\b(202[0-9])\b', q)
            if single_year:
                extracted['academic_year_name'] = single_year.group(1)

        # 4. Detect Metric Code
        metric_match = re.search(r'\b(?:metric\s*)?([1-7]\.[0-9]+(?:\.[0-9]+)?)\b', q)
        if metric_match:
            extracted['metric_code'] = metric_match.group(1)

        # 5. Residual keyword: strip out matched category, department, years, and stopwords
        clean_q = q
        for term in cat_map.keys():
            clean_q = re.sub(r'\b' + term + r'\b', ' ', clean_q)
        for pat, _ in dept_patterns:
            clean_q = re.sub(pat, ' ', clean_q)
        if year_match:
            clean_q = clean_q.replace(year_match.group(0), ' ')
        if metric_match:
            clean_q = clean_q.replace(metric_match.group(0), ' ')

        clean_q = re.sub(r'\b(show|find|search|list|all|verified|certificates?|evidence|faculty|department|dept|from|in|of|for|the|by|at|on|with)\b', ' ', clean_q)
        clean_q = re.sub(r'\s+', ' ', clean_q).strip()
        if clean_q and len(clean_q) >= 2:
            extracted['keyword'] = clean_q

        return extracted

    def _normalize_date(self, raw_date: str) -> Optional[str]:
        """Convert DD/MM/YYYY or DD-MM-YYYY into standard YYYY-MM-DD."""
        if not raw_date:
            return None
        parts = re.split(r'[/\-\.]', raw_date)
        if len(parts) == 3:
            p1, p2, p3 = parts
            if len(p3) == 4:  # DD/MM/YYYY
                return f"{p3}-{p2.zfill(2)}-{p1.zfill(2)}"
            elif len(p1) == 4:  # YYYY/MM/DD
                return f"{p1}-{p2.zfill(2)}-{p3.zfill(2)}"
        return raw_date
