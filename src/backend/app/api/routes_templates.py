from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from app.db.models import Template
from app.db.session import SessionLocal
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/prompt-templates", tags=["templates"])


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

class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    content: str


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None


class TemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    content: str

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    status: str
    message: Optional[str] = None


# ---------------------------
# Endpoints
# ---------------------------

@router.post("", response_model=TemplateResponse, status_code=201)
def create_template(template: TemplateCreate, db: Session = Depends(get_db)):
    """
    Create a new prompt template.
    """
    try:
        # Check if template with same name already exists
        existing = db.query(Template).filter(Template.name == template.name).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Template with name '{template.name}' already exists"
            )

        new_template = Template(
            name=template.name,
            prompt_text=template.content,
            description=template.description
        )
        db.add(new_template)
        db.commit()
        db.refresh(new_template)

        logger.info(f"Created template: {template.name}")

        return TemplateResponse(
            id=new_template.id,
            name=new_template.name,
            description=new_template.description,
            content=new_template.prompt_text
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating template: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")


@router.get("", response_model=List[TemplateResponse])
def list_templates(db: Session = Depends(get_db)):
    """
    Get all prompt templates.
    """
    try:
        templates = db.query(Template).all()
        return [
            TemplateResponse(
                id=t.id,
                name=t.name,
                description=t.description,
                content=t.prompt_text
            )
            for t in templates
        ]
    except Exception as e:
        logger.error(f"Error listing templates: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list templates: {str(e)}")


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(template_id: int, db: Session = Depends(get_db)):
    """
    Get a specific prompt template by ID.
    """
    try:
        template = db.query(Template).filter(Template.id == template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        return TemplateResponse(
            id=template.id,
            name=template.name,
            description=template.description,
            content=template.prompt_text
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting template {template_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get template: {str(e)}")


@router.put("/{template_id}", response_model=TemplateResponse)
def update_template(template_id: int, template: TemplateUpdate, db: Session = Depends(get_db)):
    """
    Update an existing prompt template.
    """
    try:
        existing_template = db.query(Template).filter(Template.id == template_id).first()
        if not existing_template:
            raise HTTPException(status_code=404, detail="Template not found")

        # Check if name is being changed to an existing name
        if template.name and template.name != existing_template.name:
            name_exists = db.query(Template).filter(
                Template.name == template.name,
                Template.id != template_id
            ).first()
            if name_exists:
                raise HTTPException(
                    status_code=400,
                    detail=f"Template with name '{template.name}' already exists"
                )

        # Update fields
        if template.name is not None:
            existing_template.name = template.name
        if template.description is not None:
            existing_template.description = template.description
        if template.content is not None:
            existing_template.prompt_text = template.content

        db.commit()
        db.refresh(existing_template)

        logger.info(f"Updated template: {existing_template.name}")

        return TemplateResponse(
            id=existing_template.id,
            name=existing_template.name,
            description=existing_template.description,
            content=existing_template.prompt_text
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating template {template_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update template: {str(e)}")


@router.delete("/{template_id}", response_model=MessageResponse)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    """
    Delete a prompt template.
    """
    try:
        template = db.query(Template).filter(Template.id == template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        template_name = template.name
        db.delete(template)
        db.commit()

        logger.info(f"Deleted template: {template_name}")

        return MessageResponse(
            status="ok",
            message=f"Template '{template_name}' deleted successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting template {template_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}")
