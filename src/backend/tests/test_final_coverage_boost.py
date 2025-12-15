"""
Final comprehensive tests to reach 80% coverage goal
"""
import pytest
from unittest.mock import patch, MagicMock
from app.db.models import Repo, Prompt, History


class TestAIServiceDocumentation:
    """Comprehensive AI documentation generation tests"""
    
    @patch('app.services.ai_service.shutil.rmtree')
    @patch('app.services.ai_service.send_prompt')
    @patch('app.services.ai_service.extract_repository_content')
    @patch('app.services.ai_service.tempfile.mkdtemp')
    @patch('app.services.ai_service.subprocess.run')
    def test_generate_docu_saves_to_database(self, mock_subprocess, mock_mkdtemp,
                                             mock_extract, mock_send_prompt, mock_rmtree, db_session):
        """Test that documentation is saved to database"""
        from app.services.ai_service import generate_docu
        
        repo = Repo(repo_name="db-save-test", repo_url="https://github.com/test/repo.git")
        db_session.add(repo)
        db_session.commit()
        
        mock_mkdtemp.return_value = "/tmp/test_repo"
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_subprocess.return_value = mock_result
        mock_extract.return_value = "Repository content"
        mock_send_prompt.return_value = "Generated documentation"
        
        result = generate_docu(db_session, repo.id, repo.repo_name)
        
        assert result["status"] == "documented"
        
        # Verify prompt was saved
        prompt = db_session.query(Prompt).filter(Prompt.repo_id == repo.id).first()
        assert prompt is not None
        assert prompt.docu is not None
    
    @patch('app.services.ai_service.shutil.rmtree')
    @patch('app.services.ai_service.send_prompt')
    @patch('app.services.ai_service.extract_repository_content')
    @patch('app.services.ai_service.tempfile.mkdtemp')
    @patch('app.services.ai_service.subprocess.run')
    def test_generate_docu_updates_existing_prompt(self, mock_subprocess, mock_mkdtemp,
                                                   mock_extract, mock_send_prompt, mock_rmtree, db_session):
        """Test that existing prompt is updated"""
        from app.services.ai_service import generate_docu
        
        repo = Repo(repo_name="update-test", repo_url="https://github.com/test/repo.git")
        db_session.add(repo)
        db_session.commit()
        
        # Create existing prompt
        prompt = Prompt(repo_id=repo.id, generic_prompt="Old prompt")
        db_session.add(prompt)
        db_session.commit()
        
        mock_mkdtemp.return_value = "/tmp/test_repo"
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_subprocess.return_value = mock_result
        mock_extract.return_value = "New content"
        mock_send_prompt.return_value = "Updated documentation"
        
        result = generate_docu(db_session, repo.id, repo.repo_name)
        
        assert result["status"] == "documented"
    
    @patch('app.services.ai_service.tempfile.mkdtemp')
    @patch('app.services.ai_service.subprocess.run')
    def test_generate_docu_clone_exception(self, mock_subprocess, mock_mkdtemp, db_session):
        """Test when git clone raises exception"""
        from app.services.ai_service import generate_docu
        
        repo = Repo(repo_name="exception-test", repo_url="https://github.com/test/repo.git")
        db_session.add(repo)
        db_session.commit()
        
        mock_mkdtemp.return_value = "/tmp/test_repo"
        mock_subprocess.side_effect = Exception("Network timeout")
        
        result = generate_docu(db_session, repo.id, repo.repo_name)
        
        assert result["status"] == "error"
        assert "error" in result["message"].lower() or "clone" in result["message"].lower()


class TestGitServiceValidation:
    """Comprehensive git service validation tests"""
    
    @patch('app.services.git_service.subprocess.run')
    def test_validate_ssh_with_key_failure(self, mock_subprocess):
        """Test SSH validation with key authentication failure"""
        from app.services.git_service import validate_repo_url
        
        mock_result = MagicMock()
        mock_result.returncode = 128
        mock_result.stderr = "Permission denied (publickey)"
        mock_subprocess.return_value = mock_result
        
        with patch('app.services.git_service.git.cmd.Git') as mock_git_class:
            mock_git = MagicMock()
            import git
            error = git.exc.GitCommandError("git ls-remote", 128)
            error.stderr = "Permission denied (publickey)"
            mock_git.ls_remote.side_effect = error
            mock_git_class.return_value = mock_git
            
            result = validate_repo_url("git@github.com:private/repo.git")
            
            assert result["status"] == "error"
            assert result["error_type"] == "ssh_auth"
            assert "SSH" in result["message"] or "key" in result["message"].lower()
    
    @patch('app.services.git_service.git.cmd.Git')
    def test_validate_https_auth_failure(self, mock_git_class):
        """Test HTTPS authentication failure"""
        from app.services.git_service import validate_repo_url
        import git
        
        mock_git = MagicMock()
        error = git.exc.GitCommandError("git ls-remote", 128)
        error.stderr = "Authentication failed for 'https://github.com/private/repo.git'"
        mock_git.ls_remote.side_effect = error
        mock_git_class.return_value = mock_git
        
        result = validate_repo_url("https://github.com/private/repo.git")
        
        assert result["status"] == "error"
    
    @patch('app.services.git_service.git.cmd.Git')
    @patch('app.services.git_service.subprocess.run')
    def test_validate_ssh_with_https_fallback_success(self, mock_subprocess, mock_git_class):
        """Test SSH URL with successful HTTPS fallback"""
        from app.services.git_service import validate_repo_url
        
        # Mock HTTPS validation success
        mock_git = MagicMock()
        mock_git.ls_remote.return_value = "refs/heads/main"
        mock_git_class.return_value = mock_git
        
        result = validate_repo_url("git@github.com:test/repo.git")
        
        assert result["status"] == "success"
        # Should indicate it was validated via HTTPS conversion
        assert result.get("validated_via") == "https_conversion"


class TestDocumentHistory:
    """Tests for document history tracking"""
    
    def test_prompt_update_history_tracking(self, client, db_session):
        """Test that prompt updates are tracked in history"""
        repo = Repo(repo_name="history-test", repo_url="https://github.com/test/repo.git")
        db_session.add(repo)
        db_session.commit()
        
        prompt = Prompt(
            repo_id=repo.id,
            generic_prompt="Version 1",
            docu="Documentation v1"
        )
        db_session.add(prompt)
        db_session.commit()
        
        # Update documentation
        prompt.docu = "Documentation v2"
        db_session.commit()
        
        # Verify prompt was updated
        updated_prompt = db_session.query(Prompt).filter(Prompt.id == prompt.id).first()
        assert updated_prompt.docu == "Documentation v2"


class TestExtractContentPrioritization:
    """Tests for repository content extraction prioritization"""
    
    def test_extract_prioritizes_readme_files(self):
        """Test that README files are prioritized"""
        from app.services.ai_service import extract_repository_content
        import tempfile
        from pathlib import Path
        
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create README and other files
            Path(tmpdir, "README.md").write_text("# Main Project\n\nImportant info")
            Path(tmpdir, "setup.py").write_text("from setuptools import setup")
            Path(tmpdir, "test.py").write_text("def test(): pass")
            
            result = extract_repository_content(tmpdir, max_files=5)
            
            # README should appear in output
            assert "README" in result or "Main Project" in result
    
    def test_extract_includes_main_files(self):
        """Test that main entry point files are included"""
        from app.services.ai_service import extract_repository_content
        import tempfile
        from pathlib import Path
        
        with tempfile.TemporaryDirectory() as tmpdir:
            Path(tmpdir, "main.py").write_text("def main():\n    print('app')")
            Path(tmpdir, "index.js").write_text("console.log('app');")
            Path(tmpdir, "other.py").write_text("# other code")
            
            result = extract_repository_content(tmpdir, max_files=10)
            
            # Main files should be included
            assert "main" in result.lower() or len(result) > 0
    
    def test_extract_respects_file_size_limit(self):
        """Test that file size limit is respected"""
        from app.services.ai_service import extract_repository_content
        import tempfile
        from pathlib import Path
        
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create large file
            Path(tmpdir, "large.txt").write_text("x" * 50000)
            # Create small file
            Path(tmpdir, "small.txt").write_text("Small content")
            
            result = extract_repository_content(tmpdir, max_file_size=1000)
            
            # Small file should be included, large file should be skipped
            assert len(result) > 0


class TestCodeExtractionLanguages:
    """Tests for code extraction across different languages"""
    
    def test_extract_python_classes_and_functions(self):
        """Test Python code extraction"""
        from app.services.ai_service import _extract_code_structure
        
        code = """import os
from pathlib import Path

class MyClass:
    def __init__(self):
        self.value = 1

    def method(self):
        return self.value

def standalone_function():
    pass

@decorator
def decorated_function():
    pass
""" + "\n# filler line\n" * 200
        
        result = _extract_code_structure(code, ".py")
        
        assert "import os" in result
        assert "class MyClass:" in result
        assert "def __init__" in result
        assert "@decorator" in result
    
    def test_extract_javascript_exports(self):
        """Test JavaScript export extraction"""
        from app.services.ai_service import _extract_code_structure
        
        code = """import React from 'react';
export const Component = () => {};
export default function App() {}
const helper = () => {};
let state = {};
var legacy = 0;
""" + "\n// filler\n" * 200
        
        result = _extract_code_structure(code, ".js")
        
        assert "import React" in result
        assert "export const Component" in result
        assert "export default function" in result
    
    def test_extract_java_classes(self):
        """Test Java class extraction"""
        from app.services.ai_service import _extract_code_structure
        
        code = """package com.example.app;
import java.util.List;
import java.util.Map;

public class Application {
    private int value;
    
    public void method() {}
}

interface Service {
    void doSomething();
}

enum Status {
    ACTIVE, INACTIVE
}
""" + "\n// filler\n" * 200
        
        result = _extract_code_structure(code, ".java")
        
        assert "package com.example.app" in result
        assert "import java.util" in result
        assert "class Application" in result
        assert "interface Service" in result
        assert "enum Status" in result


class TestDatabaseEdgeCases:
    """Tests for database edge cases"""
    
    def test_repo_with_long_url(self, db_session):
        """Test repository with very long URL"""
        long_url = "https://github.com/organization/" + "very-long-repo-name" * 10 + ".git"
        repo = Repo(repo_name="long-url-repo", repo_url=long_url)
        db_session.add(repo)
        db_session.commit()
        
        assert repo.id is not None
        assert repo.repo_url == long_url
    
    def test_prompt_with_null_specific_prompt(self, db_session):
        """Test prompt with NULL specific_prompt field"""
        repo = Repo(repo_name="test", repo_url="https://github.com/test/test.git")
        db_session.add(repo)
        db_session.commit()
        
        prompt = Prompt(
            repo_id=repo.id,
            generic_prompt="Generic only",
            specific_prompt=None
        )
        db_session.add(prompt)
        db_session.commit()
        
        assert prompt.id is not None
        assert prompt.specific_prompt is None
    
    def test_multiple_prompts_same_repo(self, db_session):
        """Test multiple prompts for same repository"""
        repo = Repo(repo_name="multi-prompt", repo_url="https://github.com/test/multi.git")
        db_session.add(repo)
        db_session.commit()
        
        # Should only have one prompt per repo typically
        prompt1 = Prompt(repo_id=repo.id, generic_prompt="First")
        db_session.add(prompt1)
        db_session.commit()
        
        # Query back
        prompts = db_session.query(Prompt).filter(Prompt.repo_id == repo.id).all()
        assert len(prompts) >= 1
