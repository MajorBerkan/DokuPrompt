# src/backend/app/example_mcp_tools.py

from app.db.session import SessionLocal
from app.mcp import mcp_tools_repos, mcp_tools_docs


def main():
    db = SessionLocal()
    try:
        print("=== Test: list_repositories ===")
        repos = mcp_tools_repos.list_repositories(db)
        print(f"Found {len(repos)} repos:")
        for r in repos:
            print(f"- {r['id']}: {r['name']} ({r['repo_url']})")

        print("\n=== Test: list_documents ===")
        docs = mcp_tools_docs.list_documents(db)
        print(f"Found {len(docs)} documents:")
        for d in docs:
            print(f"- {d['id']}: {d['title']} (repo: {d['repo_name']})")

    finally:
        db.close()


if __name__ == "__main__":
    main()
