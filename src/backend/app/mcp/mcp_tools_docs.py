# src/backend/app/mcp/mcp_tools_docs.py

from __future__ import annotations
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.db.models import Repo, Prompt, History, GeneralSettings  # :contentReference[oaicite:9]{index=9}
from app.services.ai_service import generate_docu  # Doku-Generierung :contentReference[oaicite:10]{index=10}
from datetime import datetime


def list_documents(db: Session) -> List[Dict[str, Any]]:
    """
    Liste alle generierten Dokumentationen.

    Orientiert sich eng an /docs/list, liefert aber einfache Dicts.
    """
    prompts = (
        db.query(Prompt)
        .filter(Prompt.docu.isnot(None), Prompt.repo_id.isnot(None))
        .order_by(Prompt.created_at.desc())
        .all()
    )

    result: List[Dict[str, Any]] = []

    for prompt in prompts:
        repo = db.query(Repo).filter(Repo.id == prompt.repo_id).first()
        repo_name = repo.repo_name if repo else "Unknown"

        result.append(
            {
                "id": str(prompt.id),
                "title": repo_name,
                "repo_id": str(prompt.repo_id),
                "repo_name": repo_name,
                "status": "ready",
                "created_at": prompt.created_at.isoformat(),
                "updated_at": prompt.created_at.isoformat(),
            }
        )

    # Alphabetisch nach repo_name sortieren
    result.sort(key=lambda x: x["repo_name"].lower())

    return result


def get_document(db: Session, doc_id: int) -> Dict[str, Any] | None:
    """
    Hole eine einzelne Dokumentation inkl. Markdown-Content und TOC.

    Entspricht inhaltlich /docs/{doc_id} in deinen Routen. :contentReference[oaicite:11]{index=11}
    """
    prompt = db.query(Prompt).filter(Prompt.id == doc_id).first()
    if not prompt or not prompt.docu:
        return None

    repo = db.query(Repo).filter(Repo.id == prompt.repo_id).first()

    content = prompt.docu or "Documentation content not available."

    # Einfache TOC-Erzeugung aus Markdown-Überschriften
    import re

    headings = re.findall(r"^(#{1,6})\s+(.+)$", content, re.MULTILINE)
    toc_lines = []
    for level, title in headings:
        indent = "  " * (len(level) - 1)
        toc_lines.append(f"{indent}- {title.strip()}")
    toc = "\n".join(toc_lines) if toc_lines else "No headings found"

    return {
        "id": str(prompt.id),
        "title": repo.repo_name if repo else "Unknown",
        "repo_id": str(prompt.repo_id),
        "repo_name": repo.repo_name if repo else "Unknown",
        "repo_url": repo.repo_url if repo else "",
        "status": "ready",
        "created_at": prompt.created_at.isoformat(),
        "updated_at": prompt.created_at.isoformat(),
        "content": content,
        "table_of_contents": toc,
    }


def generate_documentation_for_repos(
    db: Session, repo_ids: List[int]
) -> Dict[str, Any]:
    """
    Generiere Dokumentation für eine Liste von Repositories.

    Diese Funktion ist stark an /ai/generate angelehnt: :contentReference[oaicite:12]{index=12}
    - Ruft generate_docu(db, repo_id, repo_name) auf.
    - Gibt Status + Einzelergebnisse + Fehlermeldungen zurück.
    """
    results: List[Dict[str, Any]] = []
    errors: List[str] = []
    successful_count = 0

    for repo_id in repo_ids:
        # passendes Repo suchen
        repo = db.query(Repo).filter(Repo.id == repo_id).first()
        if not repo:
            errors.append(f"Repository {repo_id} not found")
            continue

        result = generate_docu(db, repo_id, repo.repo_name)
        results.append(result)

        if result.get("status") == "documented":
            successful_count += 1
        else:
            errors.append(
                result.get(
                    "message",
                    f"Failed to generate documentation for repository {repo.repo_name}",
                )
            )

    # Gesamtstatus ähnlich wie in routes_ai.py :contentReference[oaicite:13]{index=13}
    if successful_count == 0:
        status = "error"
        message = (
            f"Failed to generate documentation for all {len(repo_ids)} repositories."
        )
    elif successful_count < len(repo_ids):
        status = "partial_success"
        message = f"Documentation generated for {successful_count}/{len(repo_ids)} repositories."
    else:
        status = "ok"
        message = f"Documentation generated successfully for {successful_count} repositories."

    return {
        "status": status,
        "message": message,
        "results": results,
        "errors": errors,
        "successful_count": successful_count,
    }
