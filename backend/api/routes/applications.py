import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from google.cloud import firestore

from api.dependencies import verify_firebase_token
from models.application import Application, ApplicationUpdate, ApplicationStatusCount, TimelineEvent
from utils.firebase import get_firebase_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/applications", tags=["Applications"])


@router.get("/")
async def list_applications(
    user_id: str = Depends(verify_firebase_token),
    status: Optional[str] = Query(None),
    limit: int = Query(default=50, le=100),
    offset: Optional[str] = Query(None),
):
    db = get_firebase_db()
    query = db.collection("applications").where("user_id", "==", user_id)

    if status:
        query = query.where("status", "==", status)

    docs = query.stream()
    apps = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        apps.append(data)

    apps.sort(key=lambda a: a.get("last_updated") or "", reverse=True)

    if offset:
        apps = [a for a in apps if a["id"] != offset]

    apps = apps[:limit]

    return {"applications": apps, "total": len(apps)}


@router.get("/kanban")
async def get_kanban(
    user_id: str = Depends(verify_firebase_token),
):
    db = get_firebase_db()
    docs = (
        db.collection("applications")
        .where("user_id", "==", user_id)
        .stream()
    )

    columns = {
        "Saved": [],
        "Applying": [],
        "Applied": [],
        "OA Received": [],
        "OA Completed": [],
        "Interview Scheduled": [],
        "Interviewing": [],
        "Final Round": [],
        "Offer": [],
        "Rejected": [],
        "Withdrawn": [],
    }

    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        status = data.get("status", "Saved")
        if status in columns:
            columns[status].append(data)

    return {"columns": columns}


@router.get("/status-counts")
async def get_status_counts(
    user_id: str = Depends(verify_firebase_token),
):
    db = get_firebase_db()
    docs = (
        db.collection("applications")
        .where("user_id", "==", user_id)
        .stream()
    )

    counts = ApplicationStatusCount()
    for doc in docs:
        data = doc.to_dict()
        status = data.get("status", "Saved")
        status_key = status.lower().replace(" ", "_")
        if hasattr(counts, status_key):
            setattr(counts, status_key, getattr(counts, status_key) + 1)

    return counts


@router.get("/{application_id}")
async def get_application(
    application_id: str,
    user_id: str = Depends(verify_firebase_token),
):
    db = get_firebase_db()
    doc = db.collection("applications").document(application_id).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Application not found")

    data = doc.to_dict()
    if data.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    data["id"] = doc.id
    return data


@router.post("/")
async def create_application(
    application: Application,
    user_id: str = Depends(verify_firebase_token),
):
    db = get_firebase_db()
    application.user_id = user_id
    application.last_updated = datetime.utcnow()

    if application.status == "Applied":
        application.applied_at = datetime.utcnow()

    application.timeline = [
        TimelineEvent(
            old_status="",
            new_status=application.status,
            timestamp=datetime.utcnow(),
        )
    ]

    doc_ref = db.collection("applications").document()
    application.id = doc_ref.id
    doc_ref.set(application.model_dump(mode="json"))

    return {"id": doc_ref.id, **application.model_dump(mode="json")}


@router.patch("/{application_id}")
async def update_application(
    application_id: str,
    update: ApplicationUpdate,
    user_id: str = Depends(verify_firebase_token),
):
    db = get_firebase_db()
    doc_ref = db.collection("applications").document(application_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Application not found")

    data = doc.to_dict()
    if data.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = update.model_dump(exclude_none=True)
    update_data["last_updated"] = datetime.utcnow()

    if "status" in update_data and update_data["status"] != data.get("status"):
        timeline = data.get("timeline", [])
        timeline.append(
            TimelineEvent(
                old_status=data.get("status", ""),
                new_status=update_data["status"],
                timestamp=datetime.utcnow(),
            ).model_dump(mode="json")
        )
        update_data["timeline"] = timeline

    if update_data.get("status") == "Applied" and not data.get("applied_at"):
        update_data["applied_at"] = datetime.utcnow()

    doc_ref.update(update_data)
    updated = doc_ref.get().to_dict()
    updated["id"] = doc_ref.id
    return updated


@router.delete("/{application_id}")
async def delete_application(
    application_id: str,
    user_id: str = Depends(verify_firebase_token),
):
    db = get_firebase_db()
    doc_ref = db.collection("applications").document(application_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Application not found")

    data = doc.to_dict()
    if data.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    doc_ref.delete()
    return {"message": "Application deleted"}
