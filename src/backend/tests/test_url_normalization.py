"""
Tests for URL normalization to ensure duplicate detection works correctly.
This tests the normalize_repo_url function in git_service.py
"""
import pytest
from app.services.git_service import normalize_repo_url


def test_normalize_https_url():
    """Test that HTTPS URLs are normalized correctly"""
    url = "https://github.com/user/repo.git"
    expected = "https://github.com/user/repo.git"
    assert normalize_repo_url(url) == expected


def test_normalize_http_to_https():
    """Test that HTTP URLs are converted to HTTPS"""
    url = "http://github.com/user/repo.git"
    expected = "https://github.com/user/repo.git"
    assert normalize_repo_url(url) == expected


def test_normalize_ssh_colon_format():
    """Test that SSH URLs with colon format are converted to HTTPS"""
    url = "git@github.com:user/repo.git"
    expected = "https://github.com/user/repo.git"
    assert normalize_repo_url(url) == expected


def test_normalize_ssh_slash_format():
    """Test that SSH URLs with ssh:// prefix are converted to HTTPS"""
    url = "ssh://git@github.com/user/repo.git"
    expected = "https://github.com/user/repo.git"
    assert normalize_repo_url(url) == expected


def test_normalize_url_without_git_suffix():
    """Test that URLs without .git suffix get .git added"""
    url = "https://github.com/user/repo"
    expected = "https://github.com/user/repo.git"
    assert normalize_repo_url(url) == expected


def test_normalize_case_insensitive():
    """Test that URLs are lowercased for case-insensitive comparison"""
    url = "https://GitHub.com/User/Repo.git"
    expected = "https://github.com/user/repo.git"
    assert normalize_repo_url(url) == expected


def test_normalize_different_formats_same_repo():
    """Test that different URL formats for the same repo normalize to the same value"""
    urls = [
        "https://github.com/user/repo.git",
        "http://github.com/user/repo.git",
        "git@github.com:user/repo.git",
        "ssh://git@github.com/user/repo.git",
        "https://github.com/user/repo",
        "HTTPS://GitHub.com/User/Repo.git",
    ]

    normalized = [normalize_repo_url(url) for url in urls]

    # All should normalize to the same value
    assert len(set(normalized)) == 1
    assert normalized[0] == "https://github.com/user/repo.git"


def test_normalize_gitlab_ssh():
    """Test that GitLab SSH URLs are also normalized correctly"""
    url = "git@gitlab.com:group/project.git"
    expected = "https://gitlab.com/group/project.git"
    assert normalize_repo_url(url) == expected


def test_normalize_with_whitespace():
    """Test that URLs with leading/trailing whitespace are trimmed"""
    url = "  https://github.com/user/repo.git  "
    expected = "https://github.com/user/repo.git"
    assert normalize_repo_url(url) == expected
