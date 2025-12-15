from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.db.models import GeneralSettings
from app.db.session import SessionLocal
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["settings"])


# ---------------------------
# Database Dependency
# ---------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------
# Schemas
# ---------------------------

class GeneralSettingsRequest(BaseModel):
    prompt: str
    checkInterval: Optional[int] = None  # Interval in minutes (1-10080, i.e., 1 minute to 7 days)
    disabled: bool = False


class GeneralSettingsResponse(BaseModel):
    prompt: str
    checkInterval: Optional[int] = None  # Interval in minutes
    disabled: bool


# ---------------------------
# Endpoints
# ---------------------------

@router.get("/general", response_model=GeneralSettingsResponse)
def get_general_settings(db: Session = Depends(get_db)):
    """
    Gets the general settings including prompt and check interval.
    Returns the most recent settings record (by id).
    The check_interval is stored as PostgreSQL interval type (timedelta).
    """
    try:
        settings = db.query(GeneralSettings).order_by(GeneralSettings.id.desc()).first()

        if not settings:
            # Return default values if no settings exist
            return GeneralSettingsResponse(
                prompt="",
                checkInterval=60,  # Default: 60 minutes
                disabled=False
            )

        # Convert timedelta object to interval in minutes
        check_interval = None
        if settings.update_time:
            check_interval = int(settings.update_time.total_seconds() // 60)

        logger.info(
            f"GET /general - Returning: id={
                settings.id}, update_time={
                settings.update_time}, checkInterval={check_interval}, disabled={
                settings.updates_disabled}")

        return GeneralSettingsResponse(
            prompt=settings.general_prompt,
            checkInterval=check_interval,
            disabled=settings.updates_disabled
        )
    except Exception as e:
        logger.error(f"Error getting general settings: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get general settings: {str(e)}")


@router.put("/general", response_model=GeneralSettingsResponse)
def save_general_settings(req: GeneralSettingsRequest, db: Session = Depends(get_db)):
    """
    Saves or updates the general settings including prompt and check interval.
    If the general_prompt has changed, creates a new record with all settings.
    Otherwise, updates the existing record.
    The check_interval (minutes) is stored as PostgreSQL interval type (timedelta).
    """
    try:
        # Get the most recent settings
        settings = db.query(GeneralSettings).order_by(GeneralSettings.id.desc()).first()

        logger.info(
            f"PUT /general - Request: prompt='{req.prompt[:50]}...', checkInterval={req.checkInterval}, disabled={req.disabled}")

        # Convert interval (minutes) to timedelta object
        update_time_obj = None
        if req.checkInterval is not None:
            # Validate interval range (1 minute - 7 days)
            if req.checkInterval < 1 or req.checkInterval > 10080:
                raise HTTPException(status_code=400, detail="Check interval must be between 1 and 10080 minutes (7 days)")

            update_time_obj = timedelta(minutes=req.checkInterval)
            logger.info(f"Converted checkInterval={req.checkInterval} to timedelta={update_time_obj}")

        if settings:
            # Check if the general_prompt has changed
            prompt_changed = settings.general_prompt != req.prompt

            if prompt_changed:
                # Create new settings record, copying unchanged settings from previous
                # Note: If checkInterval is not provided in request (None), copy from previous settings
                new_settings = GeneralSettings(
                    general_prompt=req.prompt,
                    update_time=update_time_obj if req.checkInterval is not None else settings.update_time,
                    updates_disabled=req.disabled
                )
                db.add(new_settings)
                settings = new_settings
                logger.info("Created new general settings record due to prompt change")
            else:
                # Update existing settings (only check_interval or updates_disabled changed)
                if req.checkInterval is not None:
                    settings.update_time = update_time_obj
                settings.updates_disabled = req.disabled
                logger.info("Updated general settings (no prompt change)")
        else:
            # Create new settings record (first time)
            settings = GeneralSettings(
                general_prompt=req.prompt,
                update_time=update_time_obj or timedelta(minutes=60),  # Default: 60 minutes
                updates_disabled=req.disabled
            )
            db.add(settings)
            logger.info("Created first general settings record")

        db.commit()
        db.refresh(settings)

        # Convert timedelta back to interval in minutes for response
        check_interval = None
        if settings.update_time:
            check_interval = int(settings.update_time.total_seconds() // 60)

        logger.info(
            f"PUT /general - Saved: id={settings.id}, update_time={settings.update_time}, checkInterval={check_interval}")

        return GeneralSettingsResponse(
            prompt=settings.general_prompt,
            checkInterval=check_interval,
            disabled=settings.updates_disabled
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving general settings: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save general settings: {str(e)}")
