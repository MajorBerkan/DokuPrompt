# src/backend/app/mcp/mcp_tools_repos.py

from __future__ import annotations

from typing import List, Dict, Any

from sqlalchemy.orm import Session

from app.db.models import Repo, Prompt  # Repo- und Prompt-Tabellen :contentReference[oaicite:6]{index=6}


def list_repositories(db: Session) -> List[Dict[str, Any]]:
    """
    Liste alle Repositories aus der Datenbank.

    Diese Funktion orientiert sich an der FastAPI-Route /repos/list,
    gibt aber ein „MCP-freundliches“ Dict-Format zurück.
    """
    repos = db.query(Repo).all()

    result: List[Dict[str, Any]] = []

    for repo in repos:
        # Spezifischen Prompt zu diesem Repo (falls vorhanden) ermitteln
        prompt = db.query(Prompt).filter(Prompt.repo_id == repo.id).first()
        specific_prompt = (
            prompt.specific_prompt if prompt and prompt.specific_prompt else None
        )

        repo_dict = {
            "id": repo.id,
            "name": repo.repo_name,
            "description": repo.description,
            "repo_url": repo.repo_url,
            "date_of_version": (
                repo.date_of_version.isoformat() if repo.date_of_version else None
            ),
            "specific_prompt": specific_prompt,
        }

        result.append(repo_dict)

    return result


def get_repository_by_id(db: Session, repo_id: int) -> Dict[str, Any] | None:
    """
    Hole ein einzelnes Repository inkl. spezifischem Prompt.

    Gibt ein Dictionary zurück oder None, wenn das Repo nicht existiert.
    """
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        return None

    prompt = db.query(Prompt).filter(Prompt.repo_id == repo.id).first()
    specific_prompt = (
        prompt.specific_prompt if prompt and prompt.specific_prompt else None
    )

    return {
        "id": repo.id,
        "name": repo.repo_name,
        "description": repo.description,
        "repo_url": repo.repo_url,
        "date_of_version": repo.date_of_version.isoformat()
        if repo.date_of_version
        else None,
        "specific_prompt": specific_prompt,
    }
