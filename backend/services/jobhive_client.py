import asyncio
import concurrent.futures
import logging
import os
import re
import time
from typing import Optional

from io import BytesIO

import httpx
import pandas as pd

from models.job import Job
from utils.validators import is_rejected_source

logger = logging.getLogger(__name__)

CACHE_DIR = "/tmp/jobhive_cache"
CACHE_TTL = 86400
PARQUET_BASE = "https://storage.stapply.ai/jobhive/v1/{ats}/jobs.parquet"
HTTP_TIMEOUT = 300.0
FRESH_DAYS = 90

# Only read columns we actually use
NEEDED_COLS = ["title", "company", "location", "apply_url", "url", "description", "ats_id", "posted_at"]

ATS_SLICES = [
    "wellfound", "builtin", "remoteok", "ycombinator", "programathor",
    "weworkremotely", "taleo", "getonbrd", "thehub", "recruitee",
    "pinpoint", "wanted", "recruiterbox", "tiktok", "cornerstone",
    "google", "gem", "apple", "breezy", "eightfold", "tesla",
    "personio", "teamtailor", "rippling", "workable",
    "amazon", "bamboohr",
    "oracle", "jazzhr", "join_com", "smartrecruiters",
    "successfactors",
    "workday",
    "icims", "avature", "phenom", "mercor",
    "meta", "uber",
]


def _cache_path(ats: str) -> str:
    return f"{CACHE_DIR}/{ats}.parquet"


def _load_to_disk(ats: str) -> pd.DataFrame:
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = _cache_path(ats)
    recent_path = f"{CACHE_DIR}/{ats}_recent.parquet"

    # Use pre-filtered file if available
    if os.path.exists(recent_path):
        age = time.time() - os.path.getmtime(recent_path)
        if age < CACHE_TTL:
            return pd.read_parquet(recent_path, columns=NEEDED_COLS)

    if os.path.exists(path):
        age = time.time() - os.path.getmtime(path)
        if age < CACHE_TTL:
            df = pd.read_parquet(path, columns=NEEDED_COLS)
        else:
            df = _download_full(ats, path)
    else:
        df = _download_full(ats, path)

    # Write filtered copy (recent only) for faster subsequent reads
    recent = _filter_recent(df)
    try:
        tmp = recent_path + ".tmp"
        recent.to_parquet(tmp)
        os.replace(tmp, recent_path)
    except Exception:
        pass

    return recent


def _download_full(ats: str, path: str) -> pd.DataFrame:
    url = PARQUET_BASE.format(ats=ats)
    logger.info("Jobhive download: %s from %s", ats, url)
    response = httpx.get(url, timeout=HTTP_TIMEOUT, follow_redirects=True)
    response.raise_for_status()
    buf = BytesIO(response.content)
    df = pd.read_parquet(buf, columns=NEEDED_COLS)
    tmp = path + ".tmp"
    with open(tmp, "wb") as f:
        f.write(response.content)
    os.replace(tmp, path)
    logger.info("Jobhive cached to disk: %s (%.0f MB)", ats, len(response.content) / (1024 * 1024))
    return df


def _filter_recent(df: pd.DataFrame) -> pd.DataFrame:
    if "posted_at" not in df.columns:
        return df
    try:
        cutoff = pd.Timestamp.now(tz="UTC") - pd.Timedelta(days=FRESH_DAYS)
        parsed = pd.to_datetime(df["posted_at"], utc=True, errors="coerce")
        recent = parsed.notna() & (parsed > cutoff)
        if recent.any():
            df = df[recent]
            df = df.assign(_sort=parsed[recent]).sort_values("_sort", ascending=False).drop(columns=["_sort"])
    except Exception:
        pass
    return df


def _normalize_company(ats: str, row) -> str:
    raw = str(getattr(row, "company", "") or getattr(row, "ats_id", ""))
    raw = raw.strip()

    if ats == "phenom":
        raw = raw.removeprefix("www.").removeprefix("careers.").removeprefix("jobs.")
        raw = raw.removesuffix(".com").removesuffix(".ca").removesuffix(".io")
        return raw.replace("-", " ").title().strip()

    if ats == "rippling":
        parts = raw.split("-")
        if len(parts) > 1:
            return " ".join(p.title() for p in parts)
        return raw

    if ats == "oracle":
        return raw.split(".")[0] if "." in raw else raw

    return raw


def _warm_pool():
    return True

def _process_slice(ats: str, df: pd.DataFrame, pattern: Optional[str], limit: int) -> list[Job]:
    if pattern:
        mask = df["title"].fillna("").str.lower().str.contains(pattern, na=False)
        df = df[mask]
    if df.empty:
        return []
    df = df.fillna("")
    results = []
    count = 0
    for row in df.itertuples(index=False):
        url = str(row.apply_url or row.url or "")
        if is_rejected_source(url):
            continue
        results.append(Job(
            title=str(row.title or ""),
            company=_normalize_company(ats, row),
            location=str(row.location or row.ats_id or ""),
            apply_url=url,
            source=f"jobhive_{ats}",
            verified_company_link=True,
            description=str(row.description or ""),
        ))
        count += 1
        if limit is not None and count >= limit:
            break
    return results


class JobhiveClient:
    def __init__(self):
        self._ready = False
        self._warmup_lock = asyncio.Lock()
        self._warmup_task: Optional[asyncio.Task] = None
        self._warmup_progress = {"done": 0, "total": len(ATS_SLICES)}
        self._http_client = httpx.Client(timeout=HTTP_TIMEOUT, follow_redirects=True)
        self._io_sem = asyncio.Semaphore(8)
        self._pool = concurrent.futures.ProcessPoolExecutor(max_workers=8)
        for _ in range(8):
            self._pool.submit(_warm_pool)
        self._dfs: dict[str, pd.DataFrame] = {}

    async def start_warmup(self):
        if self._warmup_task is not None:
            return
        async with self._warmup_lock:
            if self._warmup_task is not None:
                return
            self._warmup_task = asyncio.create_task(self._warmup())

    async def wait_for_warmup(self):
        """Block search until warmup finishes (or skip if already done)."""
        if self._ready:
            return
        task = self._warmup_task
        if task is not None:
            await task

    async def _warmup(self):
        total = len(ATS_SLICES)
        logger.info("Jobhive warmup: downloading %d ATS slices to disk", total)

        for i, ats in enumerate(ATS_SLICES):
            try:
                df = await asyncio.get_running_loop().run_in_executor(None, lambda a=ats: _load_to_disk(a))
                self._dfs[ats] = df
                self._warmup_progress["done"] = i + 1
                logger.info("Jobhive warmup: %s ready (%d/%d)", ats, i + 1, total)
            except Exception as e:
                logger.debug("Jobhive warmup: %s skipped (%s)", ats, e)
                self._warmup_progress["done"] = i + 1

        self._ready = True
        logger.info("Jobhive warmup: complete — %d ATS slices in memory", total)

    @property
    def is_ready(self) -> bool:
        return self._ready

    async def search(self, query: str, limit: int = 200) -> list[Job]:
        keywords = [w.strip() for w in query.replace(",", " ").split() if len(w.strip()) > 1] if query else []
        pattern = "|".join(re.escape(k) for k in keywords) if keywords else None
        t0 = time.time()

        def get_df(ats: str) -> pd.DataFrame:
            df = self._dfs.get(ats)
            if df is None:
                df = _load_to_disk(ats)
                self._dfs[ats] = df
            return df.head(20000) if len(df) > 20000 else df

        args_list = [(ats, get_df(ats), pattern, limit) for ats in ATS_SLICES]

        futures = [self._pool.submit(_process_slice, *args) for args in args_list]
        batch_results = []
        for f in futures:
            try:
                batch_results.append(f.result())
            except Exception as e:
                logger.debug("Jobhive process failed: %s", e)
                batch_results.append([])

        all_jobs = []
        for jobs in batch_results:
            all_jobs.extend(jobs)

        logger.info("Jobhive search: %d jobs from %d ATS types in %.1fs",
                     len(all_jobs), len(ATS_SLICES), time.time()-t0)
        return all_jobs


jobhive_client = JobhiveClient()
