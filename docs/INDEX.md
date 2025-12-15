# CaffeineCode - Dokumentations-Index

Willkommen zur CaffeineCode-Dokumentation! Diese Übersicht hilft dir, die richtige Dokumentation für deine Bedürfnisse zu finden.

## 📖 Dokumentations-Übersicht

### 🚀 Für Einsteiger

**Ich möchte schnell loslegen und das Projekt lokal ausführen:**
→ **[Quick Start Guide](./QUICK_START.md)**
- Schritt-für-Schritt Anleitung
- Projekt in 5 Minuten lokal starten
- Grundlegende Befehle

---

### 🏗️ Für Entwickler

**Ich möchte verstehen, wie das Projekt funktioniert:**
→ **[Projekt-Architektur](./PROJEKT_ARCHITEKTUR.md)**
- Detaillierte Komponenten-Erklärung
- **Wie wird die Datenbank gespeichert?**
- **Wie wird alles gestartet?**
- Datenfluss und Interaktionen
- Technologie-Stack

**Ich möchte eine visuelle Übersicht des Systems:**
→ **[System Overview](./SYSTEM_OVERVIEW.md)**
- Architektur-Diagramme
- Datenfluss-Visualisierungen
- Komponenten-Matrix
- Sicherheits-Layer
- Deployment-Optionen Vergleich

**Ich habe eine spezifische Frage:**
→ **[FAQ - Häufig gestellte Fragen](./FAQ.md)**
- Allgemeine Fragen
- Datenbank & Persistenz
- Entwicklung
- Troubleshooting

**Ich habe Probleme mit Jobs oder Hintergrundaufgaben:**
→ **[Job Troubleshooting Guide](./JOB_TROUBLESHOOTING.md)**
- Celery Background Tasks debuggen
- GitHub Actions Workflows verstehen
- Scheduled Tasks diagnostizieren
- Häufige Fehlermeldungen lösen

---

### 🚢 Für DevOps / Deployment

**Ich möchte das Projekt auf einem Server deployen:**
→ **[Deployment Guide](./DEPLOYMENT_GUIDE.md)**
- **Datenbank auf Server auslagern** (Managed & Self-Hosted)
- **Backend auf Server auslagern** (Docker, Systemd, Kubernetes)
- **Externe Zugriffe ermöglichen** (Nginx, SSL/TLS)
- **Tailscale-Integration** (Admin-Zugriff)
- Backup & Monitoring
- Produktions-Checkliste

---

## 🎯 Schnellzugriff nach Thema

### Datenbank

| Frage | Dokumentation | Abschnitt |
|-------|---------------|-----------|
| Wie wird die Datenbank gespeichert? | [Architektur](./PROJEKT_ARCHITEKTUR.md) | "Wie wird die Datenbank gespeichert?" |
| Wie mache ich ein Backup? | [FAQ](./FAQ.md) | "Datenbank & Persistenz" |
| Wie lagere ich die DB auf einen Server aus? | [Deployment](./DEPLOYMENT_GUIDE.md) | "Datenbank auf Server auslagern" |

### Backend

| Frage | Dokumentation | Abschnitt |
|-------|---------------|-----------|
| Wie funktioniert das Backend? | [Architektur](./PROJEKT_ARCHITEKTUR.md) | "Backend (FastAPI)" |
| Wie starte ich das Backend lokal? | [Quick Start](./QUICK_START.md) | "Anwendung starten" |
| Wie deploye ich das Backend? | [Deployment](./DEPLOYMENT_GUIDE.md) | "Backend auf Server auslagern" |
| Wie füge ich Repositories per SSH hinzu? | [SSH URL Support](./SSH_URL_SUPPORT.md) | Komplette Anleitung |

### Zugriff & Netzwerk

| Frage | Dokumentation | Abschnitt |
|-------|---------------|-----------|
| Wie greife ich von außen auf das Backend zu? | [Deployment](./DEPLOYMENT_GUIDE.md) | "Externe Zugriffe ermöglichen" |
| Müssen Kunden in mein Tailscale? | [Deployment](./DEPLOYMENT_GUIDE.md) | "Tailscale-Integration" |
| Wie schütze ich das Backend? | [FAQ](./FAQ.md) | "Wie schütze ich das Backend vor Missbrauch?" |

### Entwicklung

| Frage | Dokumentation | Abschnitt |
|-------|---------------|-----------|
| Wie entwickle ich am Frontend? | [FAQ](./FAQ.md) | "Entwicklung" |
| Wie füge ich eine API-Route hinzu? | [FAQ](./FAQ.md) | "Entwicklung" |
| Wie füge ich eine DB-Tabelle hinzu? | [FAQ](./FAQ.md) | "Entwicklung" |

---

## 📊 Dokumentations-Roadmap

### ✅ Verfügbar

- [x] Quick Start Guide
- [x] Projekt-Architektur
- [x] Deployment Guide
- [x] FAQ
- [x] System Overview
- [x] Dieser Index

### 🚧 Geplant

- [ ] API-Referenz (OpenAPI/Swagger)
- [ ] Frontend-Komponenten-Dokumentation
- [ ] Datenbank-Schema-Diagramm
- [ ] CI/CD Pipeline-Dokumentation
- [ ] Sicherheits-Richtlinien
- [ ] Beitragsrichtlinien (Contributing Guide)

---

## 🆘 Hilfe benötigt?

1. **Durchsuche die Dokumentation** - Nutze die Tabellen oben
2. **Prüfe die FAQ** - [FAQ.md](./FAQ.md)
3. **Schaue in die Logs** - `docker-compose logs -f`
4. **Erstelle ein Issue** - GitHub Issues für Bugs/Features
5. **Kontaktiere das Team** - [Kontaktinformationen im README](../README.md)

---

## 📝 Dokumentation beitragen

Fehlt etwas? Finde einen Fehler?

1. Fork das Repository
2. Erstelle einen Branch: `git checkout -b docs/improve-xyz`
3. Bearbeite die Markdown-Dateien in `docs/`
4. Commit: `git commit -m "Improve documentation for XYZ"`
5. Push: `git push origin docs/improve-xyz`
6. Erstelle einen Pull Request

Alle Dokumentationen sind in **Markdown** geschrieben und liegen im `docs/` Verzeichnis.

---

## 🔗 Externe Ressourcen

### Verwendete Technologien

- [FastAPI Dokumentation](https://fastapi.tiangolo.com/)
- [React Dokumentation](https://react.dev/)
- [PostgreSQL Dokumentation](https://www.postgresql.org/docs/)
- [Celery Dokumentation](https://docs.celeryq.dev/)
- [Docker Compose Dokumentation](https://docs.docker.com/compose/)
- [Nginx Dokumentation](https://nginx.org/en/docs/)

### Tutorials

- [Docker Compose für Einsteiger](https://docs.docker.com/compose/gettingstarted/)
- [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)
- [PostgreSQL Tuning Guide](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Nginx Reverse Proxy Setup](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

---

**Viel Erfolg mit CaffeineCode! ☕️**
