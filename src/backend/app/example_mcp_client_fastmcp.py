# src/backend/app/example_mcp_client_fastmcp.py

import asyncio
from fastmcp import Client

# Dein MCP-Server-Objekt
from app.mcp.mcp_server import mcp


async def main():
    """
    Testet deinen MCP-Server in-memory mit dem FastMCP-Client.
    """

    # Client direkt auf dein mcp-Objekt
    client = Client(mcp)

    async with client:
        print("=== Verbindung zum MCP-Server steht ===")
        print(f"Servername laut Handshake: {client.initialize_result.serverInfo.name}")

        # 1) Tools auflisten
        print("\n=== Verfügbare Tools ===")
        tools = await client.list_tools()   # <- gibt direkt eine Liste zurück

        for tool in tools:
            print(f"- {tool.name}: {tool.description}")
            # optional: Parameter-Schema anzeigen
            if tool.inputSchema:
                print(f"  Parameter-Schema: {tool.inputSchema}")

        # Liste der Tool-Namen extrahieren
        tool_names = [t.name for t in tools]

        # 2) Tool list_repositories testen (falls vorhanden)
        if "list_repositories" in tool_names:
            print("\n=== Aufruf: list_repositories ===")
            try:
                # call_tool erwartet (name, arguments-dict)
                result = await client.call_tool("list_repositories", {})
                print("Ergebnis von list_repositories:")
                print(result)
            except Exception as e:
                print("Fehler beim Aufruf von list_repositories:", repr(e))
        else:
            print("\nTool 'list_repositories' ist nicht registriert.")

        print("------------------------------")
        print("------------------------------")
        print("------------------------------")
        print("------------------------------")
        print("------------------------------")
        # 3) Tool list_documents testen (falls vorhanden)
        if "list_documents" in tool_names:
            print("\n=== Aufruf: list_documents ===")
            try:
                result = await client.call_tool("list_documents", {})
                print("Ergebnis von list_documents:")
                print(result)
            except Exception as e:
                print("Fehler beim Aufruf von list_documents:", repr(e))
        else:
            print("\nTool 'list_documents' ist nicht registriert.")


if __name__ == "__main__":
    asyncio.run(main())
