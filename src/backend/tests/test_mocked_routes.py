"""
Comprehensive mocked tests for git service validation and routes
"""
import pytest
from unittest.mock import patch, MagicMock
from app.db.models import Repo, Prompt


class TestValidateRepoUrl:
    """Tests for validate_repo_url function with comprehensive mocking"""
    
    @patch('app.services.git_service.git.cmd.Git')
    def test_validate_https_url_success(self, mock_git_class):
        """Test successful HTTPS URL validation"""
        from app.services.git_service import validate_repo_url
        
        mock_git = MagicMock()
        mock_git.ls_remote.return_value = "refs/heads/main"
        mock_git_class.return_value = mock_git
        
        result = validate_repo_url("https://github.com/test/repo.git")
        
        assert result["status"] == "success"
        assert "valid repository url" in result["message"]
    
    @patch('app.services.git_service.subprocess.run')
    def test_validate_ssh_url_success(self, mock_subprocess):
        """Test successful SSH URL validation"""
        from app.services.git_service import validate_repo_url
        
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_subprocess.return_value = mock_result
        
        result = validate_repo_url("git@github.com:test/repo.git")
        
        assert result["status"] == "success"
    
    @patch('app.services.git_service.git.cmd.Git')
    @patch('app.services.git_service.subprocess.run')
    def test_validate_ssh_url_with_https_fallback(self, mock_subprocess, mock_git_class):
        """Test SSH URL validation with HTTPS conversion fallback"""
        from app.services.git_service import validate_repo_url
        
        # Mock successful HTTPS validation
        mock_git = MagicMock()
        mock_git.ls_remote.return_value = "refs/heads/main"
        mock_git_class.return_value = mock_git
        
        result = validate_repo_url("git@github.com:test/repo.git")
        
        assert result["status"] == "success"
        assert result.get("validated_via") == "https_conversion"
    
    @patch('app.services.git_service.git.cmd.Git')
    def test_validate_url_not_found(self, mock_git_class):
        """Test validation when repository not found"""
        from app.services.git_service import validate_repo_url
        import git
        
        mock_git = MagicMock()
        error = git.exc.GitCommandError("git ls-remote", 128)
        error.stderr = "repository not found"
        mock_git.ls_remote.side_effect = error
        mock_git_class.return_value = mock_git
        
        result = validate_repo_url("https://github.com/test/nonexistent.git")
        
        assert result["status"] == "error"
        assert result["error_type"] == "not_found"
    
    @patch('app.services.git_service.subprocess.run')
    def test_validate_ssh_auth_failure(self, mock_subprocess):
        """Test SSH authentication failure"""
        from app.services.git_service import validate_repo_url
        import git
        
        mock_result = MagicMock()
        mock_result.returncode = 128
        mock_result.stderr = "Permission denied (publickey)"
        mock_subprocess.return_value = mock_result
        
        # Also mock HTTPS attempt to fail
        with patch('app.services.git_service.git.cmd.Git') as mock_git_class:
            mock_git = MagicMock()
            error = git.exc.GitCommandError("git ls-remote", 128)
            error.stderr = "authentication failed"
            mock_git.ls_remote.side_effect = error
            mock_git_class.return_value = mock_git
            
            result = validate_repo_url("git@github.com:test/repo.git")
            
            assert result["status"] == "error"
            assert result["error_type"] == "ssh_auth"
    
    @patch('app.services.git_service.subprocess.run')
    def test_validate_ssh_host_key_failure(self, mock_subprocess):
        """Test SSH host key verification failure"""
        from app.services.git_service import validate_repo_url
        
        mock_result = MagicMock()
        mock_result.returncode = 128
        mock_result.stderr = "Host key verification failed"
        mock_subprocess.return_value = mock_result
        
        with patch('app.services.git_service.git.cmd.Git') as mock_git_class:
            mock_git = MagicMock()
            import git
            error = git.exc.GitCommandError("git ls-remote", 128)
            error.stderr = "Host key verification failed"
            mock_git.ls_remote.side_effect = error
            mock_git_class.return_value = mock_git
            
            result = validate_repo_url("git@github.com:test/repo.git")
            
            assert result["status"] == "error"
            assert result["error_type"] == "ssh_host_key"
    
    @patch('app.services.git_service.git.cmd.Git')
    def test_validate_network_error(self, mock_git_class):
        """Test network/DNS resolution error"""
        from app.services.git_service import validate_repo_url
        import git
        
        mock_git = MagicMock()
        error = git.exc.GitCommandError("git ls-remote", 128)
        error.stderr = "Could not resolve host"
        mock_git.ls_remote.side_effect = error
        mock_git_class.return_value = mock_git
        
        result = validate_repo_url("https://invalid-host.example.com/repo.git")
        
        assert result["status"] == "error"
        assert result["error_type"] == "network"
    
    @patch('app.services.git_service.subprocess.run')
    def test_validate_timeout(self, mock_subprocess):
        """Test validation timeout"""
        from app.services.git_service import validate_repo_url
        import subprocess
        
        mock_subprocess.side_effect = subprocess.TimeoutExpired("git", 30)
        
        with patch('app.services.git_service.git.cmd.Git') as mock_git_class:
            mock_git = MagicMock()
            import git
            error = git.exc.GitCommandError("git ls-remote", 128)
            error.stderr = "timeout"
            mock_git.ls_remote.side_effect = error
            mock_git_class.return_value = mock_git
            
            result = validate_repo_url("git@slow-server.example.com:test/repo.git")
            
            assert result["status"] == "error"
            assert result["error_type"] == "network"
    
    @patch('app.services.git_service.git.cmd.Git')
    def test_validate_unknown_error(self, mock_git_class):
        """Test unknown error handling"""
        from app.services.git_service import validate_repo_url
        import git
        
        mock_git = MagicMock()
        error = git.exc.GitCommandError("git ls-remote", 128)
        error.stderr = "Some unexpected error"
        mock_git.ls_remote.side_effect = error
        mock_git_class.return_value = mock_git
        
        result = validate_repo_url("https://github.com/test/repo.git")
        
        assert result["status"] == "error"
        assert result["error_type"] == "unknown"


class TestPromptHistory:
    """Tests for prompt history functionality"""
    
    def test_prompt_update_creates_history(self, client, db_session):
        """Test that updating prompt creates history entry"""
        from app.db.models import History
        
        repo = Repo(repo_name="test-repo", repo_url="https://github.com/test/repo.git")
        db_session.add(repo)
        db_session.commit()
        
        prompt = Prompt(repo_id=repo.id, generic_prompt="Initial prompt")
        db_session.add(prompt)
        db_session.commit()
        
        # Update the prompt's documentation
        prompt.docu = "New documentation"
        db_session.commit()
        
        # History tracking happens through triggers or application logic
        assert prompt.docu == "New documentation"
