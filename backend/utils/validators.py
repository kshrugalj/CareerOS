import re
from urllib.parse import urlparse

REJECTED_DOMAINS = [
    "linkedin.com",
    "indeed.com",
    "glassdoor.com",
    "ziprecruiter.com",
    "monster.com",
    "careerbuilder.com",
    "dice.com",
    "simplyhired.com",
]

APPROVED_ATS_DOMAINS = [
    "greenhouse.io",
    "lever.co",
    "ashbyhq.com",
    "workday.com",
    "myworkdayjobs.com",
    "smartrecruiters.com",
    "bamboohr.com",
    "icims.com",
    "jobvite.com",
]


def is_rejected_source(url: str) -> bool:
    domain = urlparse(url).netloc.lower()
    domain = re.sub(r"^www\.", "", domain)
    for rejected in REJECTED_DOMAINS:
        if domain == rejected or domain.endswith(f".{rejected}"):
            return True
    return False


def is_verified_company_link(url: str, company_name: str = "") -> bool:
    domain = urlparse(url).netloc.lower()
    domain = re.sub(r"^www\.", "", domain)

    if is_rejected_source(url):
        return False

    ats_match = any(ats in domain for ats in APPROVED_ATS_DOMAINS)
    if ats_match:
        return True

    if company_name:
        company_slug = re.sub(r"[^a-zA-Z0-9]", "", company_name.lower())
        domain_slug = re.sub(r"[^a-zA-Z0-9]", "", domain.split(".")[0])
        if company_slug and company_slug == domain_slug:
            return True
        if company_slug and company_slug in domain:
            return True

    career_paths = ["/careers", "/jobs", "/career"]
    return any(path in urlparse(url).path.lower() for path in career_paths)
