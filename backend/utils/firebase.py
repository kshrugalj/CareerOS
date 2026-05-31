import json
import logging
import os

import firebase_admin
from firebase_admin import credentials, firestore
from utils.config import settings

logger = logging.getLogger(__name__)

_db = None
_init_failed = False


def get_firebase_db():
    global _db, _init_failed

    if _db is not None:
        return _db

    if _init_failed:
        raise ValueError("Firebase previously failed to initialize")

    try:
        if os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON"):
            cred = credentials.Certificate(
                json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT_JSON"])
            )
        elif settings.firebase_service_account_path:
            cred = credentials.Certificate(settings.firebase_service_account_path)
        else:
            raise ValueError(
                "No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_PATH "
                "or FIREBASE_SERVICE_ACCOUNT_JSON."
            )

        firebase_admin.initialize_app(cred, {
            "projectId": settings.firebase_project_id
        })
        _db = firestore.client()
        return _db
    except Exception as e:
        _init_failed = True
        logger.error(f"Firebase init failed: {e}")
        raise ValueError(f"Firebase initialization failed: {e}")
