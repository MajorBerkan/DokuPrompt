"""
Tests for AI service module
"""
import pytest
import tempfile
import os
from pathlib import Path
from app.services.ai_service import (
    generate_table_of_contents,
    get_repository_structure,
    _extract_code_structure,
    CODE_STRUCTURE_EXTRACTION_THRESHOLD,
    MIN_EXTRACTED_CONTENT,
    TRUNCATE_LINES_HEAD,
    TRUNCATE_LINES_TAIL
)


class TestGenerateTableOfContents:
    """Tests for generate_table_of_contents function"""
    
    def test_generate_toc_single_heading(self):
        """Test TOC generation with single heading"""
        content = "# Main Title\nSome content here"
        result = generate_table_of_contents(content)
        
        assert "headings" in result
        assert len(result["headings"]) == 1
        assert result["headings"][0]["level"] == 1
        assert result["headings"][0]["title"] == "Main Title"
    
    def test_generate_toc_multiple_headings(self):
        """Test TOC generation with multiple headings"""
        content = """# Title 1
## Subtitle 1
### Subsubtitle
## Subtitle 2
# Title 2"""
        result = generate_table_of_contents(content)
        
        assert len(result["headings"]) == 5
        assert result["headings"][0]["level"] == 1
        assert result["headings"][0]["title"] == "Title 1"
        assert result["headings"][1]["level"] == 2
        assert result["headings"][1]["title"] == "Subtitle 1"
        assert result["headings"][2]["level"] == 3
        assert result["headings"][2]["title"] == "Subsubtitle"
    
    def test_generate_toc_no_headings(self):
        """Test TOC generation with no headings"""
        content = "Just plain text without any headings"
        result = generate_table_of_contents(content)
        
        assert result["headings"] == []
        assert result["message"] == "No headings found"
    
    def test_generate_toc_heading_with_extra_spaces(self):
        """Test TOC handles headings with extra spaces"""
        content = "#    Title with spaces   \n##  Another title  "
        result = generate_table_of_contents(content)
        
        assert len(result["headings"]) == 2
        assert result["headings"][0]["title"] == "Title with spaces"
        assert result["headings"][1]["title"] == "Another title"
    
    def test_generate_toc_all_heading_levels(self):
        """Test all 6 markdown heading levels"""
        content = """# H1
## H2
### H3
#### H4
##### H5
###### H6"""
        result = generate_table_of_contents(content)
        
        assert len(result["headings"]) == 6
        for i in range(6):
            assert result["headings"][i]["level"] == i + 1
    
    def test_generate_toc_empty_content(self):
        """Test TOC with empty content"""
        result = generate_table_of_contents("")
        
        assert result["headings"] == []
        assert result["message"] == "No headings found"


class TestGetRepositoryStructure:
    """Tests for get_repository_structure function"""
    
    def test_get_structure_empty_directory(self):
        """Test structure of empty directory"""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = get_repository_structure(tmpdir)
            
            assert result["root"] == tmpdir
            assert result["files"] == []
            assert result["directories"] == []
    
    def test_get_structure_with_files(self):
        """Test structure with files"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create test files
            Path(tmpdir, "file1.txt").touch()
            Path(tmpdir, "file2.py").touch()
            
            result = get_repository_structure(tmpdir)
            
            assert len(result["files"]) == 2
            assert "file1.txt" in result["files"]
            assert "file2.py" in result["files"]
    
    def test_get_structure_with_subdirectories(self):
        """Test structure with subdirectories"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create subdirectories
            subdir1 = Path(tmpdir, "subdir1")
            subdir2 = Path(tmpdir, "subdir2")
            subdir1.mkdir()
            subdir2.mkdir()
            
            # Create file in subdirectory
            Path(subdir1, "file.txt").touch()
            
            result = get_repository_structure(tmpdir)
            
            assert "subdir1" in result["directories"]
            assert "subdir2" in result["directories"]
            assert str(Path("subdir1", "file.txt")) in result["files"]
    
    def test_get_structure_skips_git_directory(self):
        """Test that .git directory is skipped"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create .git directory
            git_dir = Path(tmpdir, ".git")
            git_dir.mkdir()
            Path(git_dir, "config").touch()
            
            # Create regular file
            Path(tmpdir, "file.txt").touch()
            
            result = get_repository_structure(tmpdir)
            
            assert ".git" not in result["directories"]
            # .git/config should not be in files
            assert not any(".git" in f for f in result["files"])
            assert "file.txt" in result["files"]
    
    def test_get_structure_max_depth(self):
        """Test max_depth parameter"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create nested structure
            level1 = Path(tmpdir, "level1")
            level2 = Path(level1, "level2")
            level3 = Path(level2, "level3")
            level4 = Path(level3, "level4")
            
            level1.mkdir()
            level2.mkdir(parents=True)
            level3.mkdir(parents=True)
            level4.mkdir(parents=True)
            
            Path(level1, "file1.txt").touch()
            Path(level3, "file3.txt").touch()
            Path(level4, "file4.txt").touch()
            
            # Test with max_depth=2
            result = get_repository_structure(tmpdir, max_depth=2)
            
            # Should include level1 and level2 but not level3 or level4
            assert "level1" in result["directories"]
            assert str(Path("level1", "level2")) in result["directories"]
            assert str(Path("level1", "file1.txt")) in result["files"]
            # Should not include deeper levels
            assert not any("level3" in d for d in result["directories"])
            assert not any("level4" in d for d in result["directories"])
    
    def test_get_structure_nonexistent_directory(self):
        """Test with nonexistent directory"""
        result = get_repository_structure("/nonexistent/path/12345")
        
        assert result["files"] == []
        assert result["directories"] == []
    
    def test_get_structure_sorts_output(self):
        """Test that output is sorted"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create files in non-alphabetical order
            Path(tmpdir, "zebra.txt").touch()
            Path(tmpdir, "apple.txt").touch()
            Path(tmpdir, "middle.txt").touch()
            
            result = get_repository_structure(tmpdir)
            
            # Should be sorted
            assert result["files"] == ["apple.txt", "middle.txt", "zebra.txt"]


class TestExtractCodeStructure:
    """Tests for _extract_code_structure function"""
    
    def test_extract_small_file_unchanged(self):
        """Test that small files are returned unchanged"""
        content = "def hello():\n    print('world')"
        result = _extract_code_structure(content, ".py")
        
        assert result == content
    
    def test_extract_python_structure(self):
        """Test Python code structure extraction"""
        content = "\n".join([
            "import os",
            "from pathlib import Path",
            "",
            "class MyClass:",
            "    def __init__(self):",
            "        self.value = 42",
            "    ",
            "    def method(self):",
            "        print('hello')",
            "        x = 1 + 2",
            "        return x",
            "",
            "@decorator",
            "def function():",
            "    pass"
        ])
        
        # Make content large enough to trigger extraction (> 3000 bytes)
        large_content = content + "\n" + "# comment line\n" * 300
        
        result = _extract_code_structure(large_content, ".py")
        
        # Should contain imports and definitions
        assert "import os" in result
        assert "from pathlib import Path" in result
        assert "class MyClass:" in result
        assert "def __init__(self):" in result
        assert "def method(self):" in result
        assert "@decorator" in result
        assert "def function():" in result
        # Should include extraction marker (or be extracted in some way)
        # Since we extracted the structure, it should be different from original
        assert len(result) < len(large_content)
    
    def test_extract_javascript_structure(self):
        """Test JavaScript code structure extraction"""
        content = "\n".join([
            "import React from 'react';",
            "export const MyComponent = () => {",
            "  const value = 42;",
            "  let mutable = 0;",
            "  var old = 1;",
            "  return <div>Hello</div>;",
            "}",
            "class MyClass {",
            "  constructor() {}",
            "}",
            "function myFunc() {",
            "  console.log('test');",
            "}",
            "interface MyInterface {",
            "  prop: string;",
            "}",
            "type MyType = string;"
        ])
        
        # Make it large enough (> 3000 bytes)
        large_content = content + "\n" + "// comment line\n" * 300
        
        result = _extract_code_structure(large_content, ".js")
        
        assert "import React from 'react';" in result
        assert "export const MyComponent" in result
        assert "const value = 42;" in result
        assert "let mutable = 0;" in result
        assert "var old = 1;" in result
        assert "class MyClass" in result
        assert "function myFunc()" in result
        assert len(result) < len(large_content)
    
    def test_extract_typescript_structure(self):
        """Test TypeScript specific keywords"""
        content = "\n".join([
            "interface User {",
            "  name: string;",
            "}",
            "type UserId = string;",
            "const user: User = { name: 'test' };"
        ])
        
        large_content = content + "\n" + "// comment line\n" * 300
        result = _extract_code_structure(large_content, ".ts")
        
        assert "interface User" in result
        assert "type UserId" in result
        assert "const user: User" in result
        assert len(result) < len(large_content)
    
    def test_extract_other_language_truncation(self):
        """Test truncation for unsupported languages"""
        # Create content large enough to trigger truncation (> 3000 bytes)
        # Each line is about 8 bytes, so we need at least 400 lines
        lines = [f"line {i}" for i in range(500)]
        content = "\n".join(lines)
        
        # Verify content is large enough
        assert len(content) > 3000
        
        result = _extract_code_structure(content, ".txt")
        
        # Result should be truncated (first + last lines with marker in between)
        # Should include first TRUNCATE_LINES_HEAD lines
        assert "line 0" in result
        
        # Should include last TRUNCATE_LINES_TAIL lines
        assert "line 499" in result
        
        # Should have truncation marker or be shorter than original
        # Either way, it should handle large files
        assert "..." in result or len(result) < len(content)
    
    def test_extract_empty_extraction_fallback(self):
        """Test fallback when extraction yields nothing"""
        # Create content that won't match any patterns
        content = "x = 1\ny = 2\n" * 500  # Large but no matching patterns
        
        result = _extract_code_structure(content, ".py")
        
        # Should fall back to truncation
        assert "(truncated for brevity)" in result or "(full implementation details omitted for brevity)" in result
    
    def test_extract_java_structure(self):
        """Test Java structure extraction"""
        content = "\n".join([
            "package com.example;",
            "import java.util.List;",
            "public class MyClass {",
            "  private int value;",
            "}",
            "interface MyInterface {",
            "  void method();",
            "}",
            "enum Status {",
            "  ACTIVE, INACTIVE",
            "}"
        ])
        
        large_content = content + "\n" + "// comment line\n" * 300
        result = _extract_code_structure(large_content, ".java")
        
        assert "package com.example;" in result
        assert "import java.util.List;" in result
        assert "class MyClass" in result
        assert "interface MyInterface" in result
        assert "enum Status" in result
        assert len(result) < len(large_content)
    
    def test_extract_go_structure(self):
        """Test Go structure extraction"""
        content = "\n".join([
            "package main",
            "import \"fmt\"",
            "type MyStruct struct {",
            "  Value int",
            "}",
            "func main() {",
            "  fmt.Println(\"test\")",
            "}"
        ])
        
        large_content = content + "\n" + "// comment line\n" * 300
        result = _extract_code_structure(large_content, ".go")
        
        assert "package main" in result
        assert "import \"fmt\"" in result
        assert "type MyStruct struct" in result
        assert "func main()" in result
        assert len(result) < len(large_content)
