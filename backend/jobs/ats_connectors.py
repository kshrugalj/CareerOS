import asyncio
import logging
from abc import ABC, abstractmethod

import httpx

from models.job import Job
from utils.validators import is_rejected_source
from services.jobhive_client import jobhive_client
from services.cache import get_cached_jobs, set_cached_jobs

logger = logging.getLogger(__name__)

CURATED_COMPANIES = [
    # ── Greenhouse ──────────────────────────────────────────
    ("1Password", "greenhouse", "1password"),
    ("Affirm", "greenhouse", "affirm"),
    ("Airtable", "greenhouse", "airtable"),
    ("Algolia", "greenhouse", "algolia"),
    ("Anthropic", "greenhouse", "anthropic"),
    ("Apollo", "greenhouse", "apollo"),
    ("Asana", "greenhouse", "asana"),
    ("Atlassian", "greenhouse", "atlassian"),
    ("Auth0", "greenhouse", "auth0"),
    ("Box", "greenhouse", "box"),
    ("Brex", "greenhouse", "brex"),
    ("Cal.com", "greenhouse", "calcom"),
    ("Calm", "greenhouse", "calm"),
    ("Canva", "greenhouse", "canva"),
    ("Cash App", "greenhouse", "square"),
    ("Chime", "greenhouse", "chime"),
    ("ClickUp", "greenhouse", "clickup"),
    ("Cloudflare", "greenhouse", "cloudflare"),
    ("Coinbase", "greenhouse", "coinbase"),
    ("Confluent", "greenhouse", "confluent"),
    ("Datadog", "greenhouse", "datadog"),
    ("Deel", "greenhouse", "deel"),
    ("Dialpad", "greenhouse", "dialpad"),
    ("Discord", "greenhouse", "discord"),
    ("Doordash", "greenhouse", "doordash"),
    ("Dropbox", "greenhouse", "dropbox"),
    ("Dub", "greenhouse", "dub"),
    ("Duolingo", "greenhouse", "duolingo"),
    ("Elastic", "greenhouse", "elastic"),
    ("Faire", "greenhouse", "faire"),
    ("Figma", "greenhouse", "figma"),
    ("Flexport", "greenhouse", "flexport"),
    ("Fly.io", "greenhouse", "flyio"),
    ("Forbes", "greenhouse", "forbes"),
    ("GitLab", "greenhouse", "gitlab"),
    ("Gusto", "greenhouse", "gusto"),
    ("HashiCorp", "greenhouse", "hashicorp"),
    ("Honeycomb", "greenhouse", "honeycomb"),
    ("HubSpot", "greenhouse", "hubspot"),
    ("Insightly", "greenhouse", "insightly"),
    ("Instacart", "greenhouse", "instacart"),
    ("Intercom", "greenhouse", "intercom"),
    ("LaunchDarkly", "greenhouse", "launchdarkly"),
    ("Linear", "greenhouse", "linear"),
    ("Loom", "greenhouse", "loom"),
    ("Lyft", "greenhouse", "lyft"),
    ("Marqeta", "greenhouse", "marqeta"),
    ("Medium", "greenhouse", "medium"),
    ("Mercury", "greenhouse", "mercury"),
    ("Mixpanel", "greenhouse", "mixpanel"),
    ("Monzo", "greenhouse", "monzo"),
    ("N26", "greenhouse", "n26"),
    ("Netflix", "greenhouse", "netflix"),
    ("Netlify", "greenhouse", "netlify"),
    ("Nextiva", "greenhouse", "nextiva"),
    ("Notion", "greenhouse", "makenotion"),
    ("Okta", "greenhouse", "okta"),
    ("OpenAI", "greenhouse", "openai"),
    ("PagerDuty", "greenhouse", "pagerduty"),
    ("Perplexity AI", "greenhouse", "perplexity"),
    ("Pinterest", "greenhouse", "pinterest"),
    ("PlanetScale", "greenhouse", "planetscale"),
    ("PostHog", "greenhouse", "posthog"),
    ("Postman", "greenhouse", "postman"),
    ("Qualtrics", "greenhouse", "qualtrics"),
    ("Railway", "greenhouse", "railway"),
    ("Reddit", "greenhouse", "reddit"),
    ("Remote", "greenhouse", "remote"),
    ("Render", "greenhouse", "render"),
    ("Robinhood", "greenhouse", "robinhood"),
    ("Salesloft", "greenhouse", "salesloft"),
    ("Segment", "greenhouse", "segment"),
    ("Shopify", "greenhouse", "shopify"),
    ("Slack", "greenhouse", "slack"),
    ("SmartBear", "greenhouse", "smartbear"),
    ("Snap Inc", "greenhouse", "snap"),
    ("Spotify", "greenhouse", "spotifyjr"),
    ("Square", "greenhouse", "square"),
    ("Stripe", "greenhouse", "stripe"),
    ("Supabase", "greenhouse", "supabase"),
    ("TripAdvisor", "greenhouse", "tripadvisor"),
    ("Twilio", "greenhouse", "twilio"),
    ("Uber", "greenhouse", "uber"),
    ("Upwork", "greenhouse", "upwork"),
    ("Vercel", "greenhouse", "vercel"),
    ("Vox Media", "greenhouse", "voxmedia"),
    ("Warp", "greenhouse", "warp"),
    ("Webflow", "greenhouse", "webflow"),
    ("WorkOS", "greenhouse", "workos"),
    ("Zapier", "greenhouse", "zapier"),
    ("Zendesk", "greenhouse", "zendesk"),
    ("ZoomInfo", "greenhouse", "zoominfo"),
    # ── Lever ───────────────────────────────────────────────
    ("Amplitude", "lever", "amplitude"),
    ("Clerk", "lever", "clerk"),
    ("Linear (Lever)", "lever", "linear"),
    ("Notion (Lever)", "lever", "notion"),
    ("Outreach", "lever", "outreach"),
    ("Palantir", "lever", "palantir"),
    ("Plaid", "lever", "plaid"),
    ("Ploomber", "lever", "ploomber"),
    ("Retool", "lever", "retool"),
    # ── Ashby ───────────────────────────────────────────────
    ("Airbnb", "ashby", "airbnb"),
    ("Arc", "ashby", "arc"),
    ("Linear (Ashby)", "ashby", "linear"),
    ("Notion (Ashby)", "ashby", "notion"),
    ("PostHog (Ashby)", "ashby", "posthog"),
    ("Ramp", "ashby", "ramp"),
    ("Raycast", "ashby", "raycast"),
    ("Screen.so", "ashby", "screen"),
    ("Supabase (Ashby)", "ashby", "supabase"),
    ("Vercel (Ashby)", "ashby", "vercel"),
]


class ATSConnector(ABC):
    @abstractmethod
    async def fetch_jobs(self) -> list[Job]:
        pass


class GreenhouseConnector(ATSConnector):
    def __init__(self, company_token: str, company_name: str = ""):
        self.base_url = f"https://boards-api.greenhouse.io/v1/boards/{company_token}/jobs"
        self.ats_provider = "Greenhouse"
        self.company_name = company_name or company_token

    async def fetch_jobs(self) -> list[Job]:
        jobs = []
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                response = await client.get(self.base_url, params={"content": "true"})
                response.raise_for_status()
                data = response.json()

                for j in data.get("jobs", []):
                    apply_url = j.get("absolute_url", "")
                    if is_rejected_source(apply_url):
                        continue

                    jobs.append(Job(
                        title=j.get("title", ""),
                        company=self.company_name,
                        location=j.get("location", {}).get("name", "") if isinstance(j.get("location"), dict) else str(j.get("location", "")),
                        apply_url=apply_url,
                        careers_url=self.base_url,
                        source="greenhouse",
                        ats_provider=self.ats_provider,
                        verified_company_link=True,
                        description=j.get("content", ""),
                    ))
            except Exception as e:
                logger.error(f"Greenhouse fetch error for {self.company_name}: {e}")

        return jobs


class LeverConnector(ATSConnector):
    def __init__(self, company_slug: str, company_name: str = ""):
        self.base_url = f"https://api.lever.co/v0/postings/{company_slug}"
        self.ats_provider = "Lever"
        self.company_name = company_name or company_slug

    async def fetch_jobs(self) -> list[Job]:
        jobs = []
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                response = await client.get(self.base_url)
                response.raise_for_status()
                data = response.json()

                for j in data if isinstance(data, list) else []:
                    apply_url = j.get("hostedUrl", "")
                    if is_rejected_source(apply_url):
                        continue

                    jobs.append(Job(
                        title=j.get("text", ""),
                        company=self.company_name,
                        location=j.get("categories", {}).get("location", ""),
                        apply_url=apply_url,
                        careers_url=self.base_url,
                        source="lever",
                        ats_provider=self.ats_provider,
                        verified_company_link=True,
                        description=j.get("description", ""),
                    ))
            except Exception as e:
                logger.error(f"Lever fetch error for {self.company_name}: {e}")

        return jobs


class AshbyConnector(ATSConnector):
    def __init__(self, company_slug: str, company_name: str = ""):
        self.base_url = f"https://api.ashbyhq.com/posting-api/job-board/{company_slug}"
        self.ats_provider = "Ashby"
        self.company_name = company_name or company_slug

    async def fetch_jobs(self) -> list[Job]:
        jobs = []
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/job-postings",
                    json={"filter": {"visibility": "public"}},
                )
                response.raise_for_status()
                data = response.json()

                for j in data.get("jobPostings", []):
                    apply_url = j.get("jobUrl", "")
                    if is_rejected_source(apply_url):
                        continue

                    jobs.append(Job(
                        title=j.get("title", ""),
                        company=self.company_name,
                        location=j.get("location", ""),
                        apply_url=apply_url,
                        careers_url=self.base_url,
                        source="ashby",
                        ats_provider=self.ats_provider,
                        verified_company_link=True,
                        description=j.get("descriptionHtml", ""),
                    ))
            except Exception as e:
                logger.error(f"Ashby fetch error for {self.company_name}: {e}")

        return jobs


class JobDiscoveryService:
    def _build_connector(self, name: str, provider: str, token: str) -> ATSConnector:
        if provider == "greenhouse":
            return GreenhouseConnector(token, name)
        elif provider == "lever":
            return LeverConnector(token, name)
        elif provider == "ashby":
            return AshbyConnector(token, name)
        raise ValueError(f"Unknown provider: {provider}")

    async def discover_for_skills(self, skills: list[str], desired_title: str) -> list[Job]:
        # Global semaphore to cap concurrent ATS activity (cache checks + live fetches)
        MAX_CONCURRENT_ATS = 8

        async def fetch_company(sem, name, provider, token):
            async with sem:
                cached = await get_cached_jobs(name, provider)
                if cached is not None:
                    return [Job(**j) for j in cached]

                connector = self._build_connector(name, provider, token)
                try:
                    jobs = await connector.fetch_jobs()
                    logger.info("Fetched %d jobs from %s (%s)", len(jobs), name, provider)
                    await set_cached_jobs(name, provider, [j.model_dump(mode="json") for j in jobs])
                    return jobs
                except Exception as e:
                    logger.debug("Failed to fetch from %s: %s", name, e)
                    return []

        query = f"{desired_title} {' '.join(skills[:5])}"

        # Small semaphore to limit ATS tasks. These run in BACKGROUND while jobhive runs.
        ats_sem = asyncio.Semaphore(MAX_CONCURRENT_ATS)
        ats_task_list = [asyncio.create_task(fetch_company(ats_sem, name, provider, token))
                         for name, provider, token in CURATED_COMPANIES]
        logger.info("Created %d ATS tasks, starting jobhive search", len(ats_task_list))

        # Run jobhive search (reads parquet files — 4 concurrent I/O)
        jobhive_jobs = await jobhive_client.search(query, limit=200)
        logger.info("Fetched %d jobs from jobhive", len(jobhive_jobs))

        # Collect whatever ATS results are ready — skip wait if jobhive already has enough
        if len(jobhive_jobs) >= 200:
            done = []
            for t in ats_task_list:
                if t.done():
                    done.append(t)
                else:
                    t.cancel()
        else:
            ats_timeout = 5 if len(jobhive_jobs) >= 100 else 25
            done, _ = await asyncio.wait(ats_task_list, timeout=ats_timeout)
        all_jobs = list(jobhive_jobs)
        for t in done:
            try:
                r = t.result()
                all_jobs.extend(r)
            except Exception:
                pass

        all_jobs.sort(key=lambda j: j.title)
        return self.deduplicate(all_jobs)

    def deduplicate(self, jobs: list[Job]) -> list[Job]:
        seen = set()
        unique = []
        for job in jobs:
            key = f"{job.company.lower()}|{job.title.lower()}|{job.apply_url.lower()}"
            if key not in seen:
                seen.add(key)
                unique.append(job)
        return unique
