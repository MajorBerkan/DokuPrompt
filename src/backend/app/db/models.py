from datetime import datetime, time, timedelta
from sqlalchemy import (
    Column, Integer, String, Text, TIMESTAMP, ForeignKey, Boolean, Time, Interval
)
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

# --- Tables matching external database schema ---


class User(Base):
    """User table - stores user information"""
    __tablename__ = "users"
    id: Mapped[int] = mapped_column("user_id", Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column("user_name", Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)


class Repo(Base):
    """Repo table - stores repository information"""
    __tablename__ = "repo"
    id: Mapped[int] = mapped_column(
        "repo_id", Integer, primary_key=True, autoincrement=True
    )
    repo_name: Mapped[str] = mapped_column(Text, nullable=False)
    repo_url: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column("repo_description", Text)
    date_of_version: Mapped[datetime] = mapped_column(
        TIMESTAMP, nullable=False, default=datetime.now
    )
    # Authentication columns for accessing private repositories
    ssh_key_path: Mapped[str | None] = mapped_column(Text)
    ssh_passphrase_encrypted: Mapped[str | None] = mapped_column(Text)
    https_username: Mapped[str | None] = mapped_column(Text)
    https_token_encrypted: Mapped[str | None] = mapped_column(Text)
    auth_type: Mapped[str | None] = mapped_column(String(10))  # "ssh" or "https"


class Prompt(Base):
    """Prompt table - stores prompts and generated documentation"""
    __tablename__ = "prompt"
    id: Mapped[int] = mapped_column("prompt_id", Integer, primary_key=True, autoincrement=True)
    generic_prompt: Mapped[str] = mapped_column(Text, nullable=False)  # Generic/template prompt
    specific_prompt: Mapped[str | None] = mapped_column(Text)  # Repository-specific prompt
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, default=datetime.now)
    repo_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("repo.repo_id", ondelete="CASCADE"))
    docu: Mapped[str | None] = mapped_column(Text)
    project_goal: Mapped[str | None] = mapped_column(Text)  # Project goal description


class Template(Base):
    """Template table - stores prompt templates"""
    __tablename__ = "template"
    id: Mapped[int] = mapped_column("template_id", Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column("template_name", Text, nullable=False)
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column("template_description", Text)


class History(Base):
    """History table - stores historical prompt data"""
    __tablename__ = "history"
    id: Mapped[int] = mapped_column("history_id", Integer, primary_key=True, autoincrement=True)
    prompt_id: Mapped[int | None] = mapped_column(Integer)
    generic_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    specific_prompt: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, default=datetime.now)
    repo_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("repo.repo_id", ondelete="CASCADE"))
    docu: Mapped[str | None] = mapped_column(Text)
    project_goal: Mapped[str | None] = mapped_column(Text)  # Project goal description


class GeneralSettings(Base):
    """General settings table - stores general prompt and update timer configuration"""
    __tablename__ = "general_settings"
    id: Mapped[int] = mapped_column("settings_id", Integer, primary_key=True, autoincrement=True)
    general_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    update_time: Mapped[timedelta | None] = mapped_column(
        "update_timer", Interval)  # Maps to 'update_timer' column in DB as interval
    updates_disabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, default=datetime.now, onupdate=datetime.now)
