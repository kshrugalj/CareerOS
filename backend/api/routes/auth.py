import logging

from fastapi import APIRouter, HTTPException
from google.cloud import firestore
from pydantic import BaseModel

from utils.firebase import get_firebase_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Auth"])


class CreateUserRequest(BaseModel):
    uid: str
    email: str = ""
    name: str = ""


@router.post("/register")
async def register_user(request: CreateUserRequest):
    db = get_firebase_db()
    user_ref = db.collection("users").document(request.uid)

    if user_ref.get().exists:
        return {"message": "User already exists"}

    user_ref.set({
        "email": request.email,
        "name": request.name,
        "created_at": firestore.SERVER_TIMESTAMP,
    })

    return {"message": "User created"}


@router.get("/user/{uid}")
async def get_user(uid: str):
    db = get_firebase_db()
    doc = db.collection("users").document(uid).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="User not found")

    result = doc.to_dict()
    candidate_doc = db.collection("candidates").document(uid).get()
    if candidate_doc.exists:
        result["resume"] = candidate_doc.to_dict()
    return result
