"""
Tests for git service module
"""
import pytest
from unittest.mock import patch, MagicMock
from app.services.git_service import (
    is_ssh_url,
    convert_ssh_to_https,
    normalize_repo_url
)


class TestIsSshUrl:
    """Tests for is_ssh_url function"""
    
    def test_is_ssh_url_git_at_format(self):
        """Test SSH URL detection for git@ format"""
        assert is_ssh_url("git@github.com:user/repo.git") is True
        assert is_ssh_url("git@gitlab.com:group/project.git") is True
    
    def test_is_ssh_url_ssh_protocol(self):
        """Test SSH URL detection for ssh:// protocol"""
        assert is_ssh_url("ssh://git@github.com/user/repo.git") is True
        assert is_ssh_url("ssh://git@gitlab.example.com/user/repo.git") is True
    
    def test_is_ssh_url_https_urls(self):
        """Test that HTTPS URLs are not detected as SSH"""
        assert is_ssh_url("https://github.com/user/repo.git") is False
        assert is_ssh_url("http://github.com/user/repo.git") is False
    
    def test_is_ssh_url_invalid_formats(self):
        """Test invalid URL formats"""
        assert is_ssh_url("github.com/user/repo.git") is False
        assert is_ssh_url("ftp://github.com/user/repo.git") is False
        assert is_ssh_url("") is False
    
    def test_is_ssh_url_with_subdomain(self):
        """Test SSH URLs with subdomains"""
        assert is_ssh_url("git@git.example.com:user/repo.git") is True
        assert is_ssh_url("ssh://git@git.company.co.uk/repo.git") is True


class TestConvertSshToHttps:
    """Tests for convert_ssh_to_https function"""
    
    def test_convert_git_at_format(self):
        """Test conversion from git@ format"""
        ssh_url = "git@github.com:user/repo.git"
        result = convert_ssh_to_https(ssh_url)
        assert result == "https://github.com/user/repo.git"
    
    def test_convert_ssh_protocol(self):
        """Test conversion from ssh:// protocol"""
        ssh_url = "ssh://git@github.com/user/repo.git"
        result = convert_ssh_to_https(ssh_url)
        assert result == "https://github.com/user/repo.git"
    
    def test_convert_gitlab_ssh(self):
        """Test conversion for GitLab SSH URL"""
        ssh_url = "git@gitlab.com:group/subgroup/project.git"
        result = convert_ssh_to_https(ssh_url)
        assert result == "https://gitlab.com/group/subgroup/project.git"
    
    def test_convert_custom_domain(self):
        """Test conversion for custom domain"""
        ssh_url = "git@git.example.com:company/repo.git"
        result = convert_ssh_to_https(ssh_url)
        assert result == "https://git.example.com/company/repo.git"
    
    def test_convert_non_ssh_url_returns_none(self):
        """Test that non-SSH URLs return None"""
        https_url = "https://github.com/user/repo.git"
        result = convert_ssh_to_https(https_url)
        assert result is None
    
    def test_convert_empty_string(self):
        """Test conversion with empty string"""
        result = convert_ssh_to_https("")
        assert result is None
    
    def test_convert_ssh_protocol_with_port(self):
        """Test SSH URL with custom port"""
        ssh_url = "ssh://git@github.com:2222/user/repo.git"
        result = convert_ssh_to_https(ssh_url)
        assert result == "https://github.com:2222/user/repo.git"


class TestNormalizeRepoUrl:
    """Tests for normalize_repo_url function"""
    
    def test_normalize_https_url(self):
        """Test normalizing HTTPS URL"""
        url = "https://github.com/user/repo.git"
        result = normalize_repo_url(url)
        assert result == "https://github.com/user/repo.git"
    
    def test_normalize_http_to_https(self):
        """Test converting HTTP to HTTPS"""
        url = "http://github.com/user/repo.git"
        result = normalize_repo_url(url)
        assert result == "https://github.com/user/repo.git"
    
    def test_normalize_ssh_colon_format(self):
        """Test normalizing git@host:path format"""
        url = "git@github.com:user/repo.git"
        result = normalize_repo_url(url)
        assert result == "https://github.com/user/repo.git"
    
    def test_normalize_ssh_protocol_format(self):
        """Test normalizing ssh:// format"""
        url = "ssh://git@github.com/user/repo.git"
        result = normalize_repo_url(url)
        assert result == "https://github.com/user/repo.git"
    
    def test_normalize_adds_git_suffix(self):
        """Test that .git suffix is added if missing"""
        url = "https://github.com/user/repo"
        result = normalize_repo_url(url)
        assert result == "https://github.com/user/repo.git"
    
    def test_normalize_removes_trailing_slash(self):
        """Test that trailing slash before .git is removed"""
        url = "https://github.com/user/repo/.git"
        result = normalize_repo_url(url)
        assert result == "https://github.com/user/repo.git"
    
    def test_normalize_case_insensitive(self):
        """Test that normalization converts to lowercase"""
        url = "https://GitHub.com/User/Repo.git"
        result = normalize_repo_url(url)
        assert result == "https://github.com/user/repo.git"
    
    def test_normalize_strips_whitespace(self):
        """Test that whitespace is stripped"""
        url = "  https://github.com/user/repo.git  "
        result = normalize_repo_url(url)
        assert result == "https://github.com/user/repo.git"
    
    def test_normalize_different_formats_same_repo(self):
        """Test that different URL formats for same repo normalize to same value"""
        urls = [
            "git@github.com:user/repo.git",
            "https://github.com/user/repo.git",
            "http://github.com/user/repo.git",
            "ssh://git@github.com/user/repo.git",
            "https://GitHub.com/User/Repo",
            "  https://github.com/user/repo.git  "
        ]
        
        normalized = [normalize_repo_url(url) for url in urls]
        # All should normalize to the same value
        assert len(set(normalized)) == 1
        assert normalized[0] == "https://github.com/user/repo.git"
    
    def test_normalize_gitlab_url(self):
        """Test normalizing GitLab URL"""
        url = "git@gitlab.com:group/subgroup/project.git"
        result = normalize_repo_url(url)
        assert result == "https://gitlab.com/group/subgroup/project.git"
    
    def test_normalize_custom_domain(self):
        """Test normalizing custom domain URL"""
        url = "git@git.company.com:org/repo.git"
        result = normalize_repo_url(url)
        assert result == "https://git.company.com/org/repo.git"
    
    def test_normalize_preserves_path_structure(self):
        """Test that complex path structures are preserved"""
        url = "https://github.com/org/team/subteam/repo.git"
        result = normalize_repo_url(url)
        assert result == "https://github.com/org/team/subteam/repo.git"
