# src/backend/app/mcp/mcp_server.py

from __future__ import annotations

"""
MCP-Server für dein CodeDoc-Projekt.

Dieser Server stellt Tools bereit, die:
- Repositories auflisten / anzeigen
- Dokumentationen auflisten / anzeigen
- Dokumentation für Repos generieren

Er nutzt:
- FastMCP als MCP-Framework
- deine bestehenden DB-Modelle & Services
"""
from typing import List, Dict, Any
from fastmcp import FastMCP  # High-Level MCP-Server :contentReference[oaicite:18]{index=18}
from app.db.session import SessionLocal
from app.mcp import mcp_tools_repos, mcp_tools_docs


# Instanz des MCP-Servers mit einem sprechenden Namen
mcp = FastMCP("DokuPropmpt MCP Server")


# ------------- Hilfsfunktion für DB-Session -------------


def with_db(fn):
    """
    Dekorator, der in MCP-Tools eine DB-Session erstellt und wieder schließt.

    Usage:
        @with_db
        def my_tool(db: Session, ...):
            ...
    """

    def wrapper(*args, **kwargs):
        db = SessionLocal()
        try:
            return fn(db, *args, **kwargs)
        finally:
            db.close()

    return wrapper


# ------------- MCP-Tools: Repositories -------------

@mcp.tool()
def list_repositories() -> List[Dict[str, Any]]:
    """
    Liste alle Repositories im CodeDoc-System.
    """
    db = SessionLocal()
    try:
        return mcp_tools_repos.list_repositories(db)
    finally:
        db.close()


@mcp.tool()
def get_repository(repo_id: int) -> Dict[str, Any]:
    """
    Hole Details zu einem einzelnen Repository.

    Args:
        repo_id: ID des Repositories

    Rückgabe:
        Repository-Infos oder {"error": "..."}.
    """
    db = SessionLocal()
    try:
        repo = mcp_tools_repos.get_repository_by_id(db, repo_id)
        if not repo:
            return {"error": f"Repository with id {repo_id} not found"}
        return repo
    finally:
        db.close()


# ------------- MCP-Tools: Dokumentationen -------------


@mcp.tool()
def list_documents() -> List[Dict[str, Any]]:
    """
    Liste alle existierenden Dokumentationen.
    """
    db = SessionLocal()
    try:
        return mcp_tools_docs.list_documents(db)
    finally:
        db.close()


@mcp.tool()
def get_document(doc_id: int) -> Dict[str, Any]:
    """
    Hole eine einzelne Dokumentation inklusive Markdown-Content.
    """
    db = SessionLocal()
    try:
        doc = mcp_tools_docs.get_document(db, doc_id)
        if not doc:
            return {"error": f"Document with id {doc_id} not found or has no content"}
        return doc
    finally:
        db.close()


@mcp.tool()
def generate_documentation_for_repos(repo_ids: List[int]) -> Dict[str, Any]:
    """
    Generiere Dokumentation für eine Liste von Repositories.

    Args:
        repo_ids: Liste von Repository-IDs

    Rückgabe:
        - status: "ok" | "partial_success" | "error"
        - message: Beschreibung
        - results: Einzelresultate
        - errors: Fehlermeldungen
        - successful_count: Anzahl erfolgreicher Repos
    """
    db = SessionLocal()
    try:
        return mcp_tools_docs.generate_documentation_for_repos(db, repo_ids)
    finally:
        db.close()


if __name__ == "__main__":
    mcp.run(transport="stdio")
