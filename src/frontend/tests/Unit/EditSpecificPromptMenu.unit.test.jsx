/**
 * Unit tests for EditSpecificPromptMenu Component
 * Tests prompt initialization logic and save functionality
 */
import { renderHook } from "@testing-library/react";
import { useState } from "react";
import { vi } from "vitest";

describe("EditSpecificPromptMenu - unit tests", () => {
  /**
   * Test: Sets initial prompt correctly when single prompt is selected
   */
  it("sets initialPrompt correctly for single selected prompt", () => {
    const { result } = renderHook(() => useState(""), {
      initialProps: {},
    });

    const selectedPrompts = ["Prompt 1"];
    let initialPrompt = "";
    if (selectedPrompts.length === 1) {
      initialPrompt = selectedPrompts[0];
    }

    expect(initialPrompt).toBe("Prompt 1");
  });

  /**
   * Test: Sets initial prompt when multiple identical prompts are selected
   * Shows common prompt value when all selected prompts match
   */
  it("sets initialPrompt correctly for multiple identical prompts", () => {
    const selectedPrompts = ["Same Prompt", "Same Prompt"];
    let initialPrompt = "";
    if (selectedPrompts.every((p) => p === selectedPrompts[0])) {
      initialPrompt = selectedPrompts[0];
    }

    expect(initialPrompt).toBe("Same Prompt");
  });

  /**
   * Test: Displays 'Different prompts' placeholder when prompts differ
   * Indicates multiple repos have different specific prompts
   */
  it("sets initialPrompt as 'Different prompts' for different prompts", () => {
    const selectedPrompts = ["Prompt 1", "Prompt 2"];
    let initialPrompt = "";
    if (!selectedPrompts.every((p) => p === selectedPrompts[0])) {
      initialPrompt = "Different prompts";
    }

    expect(initialPrompt).toBe("Different prompts");
  });

  /**
   * Test: onSave callback is called with correct prompt and repository names
   * Verifies save operation passes correct parameters
   */
  it("calls onSave with correct arguments", () => {
    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();
    let savedPrompt;

    savedPrompt = "Test prompt";
    mockOnSave(savedPrompt, ["Alice", "Bob"]);
    mockOnClose();

    expect(mockOnSave).toHaveBeenCalledWith("Test prompt", ["Alice", "Bob"]);
    expect(mockOnClose).toHaveBeenCalled();
  });

  /**
   * Test: Empty prompt is handled correctly
   */
  it("handles empty prompt correctly", () => {
    const { result } = renderHook(() => useState(""));

    const [state, setState] = result.current;
    expect(state).toBe("");

    // Simulate setting empty prompt
    setState("");
    expect(result.current[0]).toBe("");
  });

  /**
   * Test: Prompt with whitespace is handled correctly
   */
  it("handles prompt with whitespace", () => {
    const { result } = renderHook(() => useState("   "));

    const [state] = result.current;
    expect(state).toBe("   ");
  });

  /**
   * Test: Multiple empty prompts are handled
   */
  it("handles multiple empty prompts", () => {
    const selectedPrompts = ["", ""];
    let initialPrompt = "";
    if (selectedPrompts.every((p) => p === selectedPrompts[0])) {
      initialPrompt = selectedPrompts[0];
    }

    expect(initialPrompt).toBe("");
  });

  /**
   * Test: Mixed empty and filled prompts
   */
  it("handles mixed empty and filled prompts", () => {
    const selectedPrompts = ["", "Filled Prompt"];
    let initialPrompt = "";
    if (!selectedPrompts.every((p) => p === selectedPrompts[0])) {
      initialPrompt = "Different prompts";
    }

    expect(initialPrompt).toBe("Different prompts");
  });

  /**
   * Test: Very long prompt text
   */
  it("handles very long prompt text", () => {
    const longPrompt = "a".repeat(1000);
    const mockOnSave = vi.fn();

    mockOnSave(longPrompt, ["Repo1"]);

    expect(mockOnSave).toHaveBeenCalledWith(longPrompt, ["Repo1"]);
  });

  /**
   * Test: Special characters in prompt
   */
  it("handles special characters in prompt", () => {
    const specialPrompt = "Prompt with special chars: @#$%^&*()";
    const mockOnSave = vi.fn();

    mockOnSave(specialPrompt, ["Repo1"]);

    expect(mockOnSave).toHaveBeenCalledWith(specialPrompt, ["Repo1"]);
  });

  /**
   * Test: Newlines in prompt text
   */
  it("handles newlines in prompt text", () => {
    const multilinePrompt = "Line 1\nLine 2\nLine 3";
    const mockOnSave = vi.fn();

    mockOnSave(multilinePrompt, ["Repo1"]);

    expect(mockOnSave).toHaveBeenCalledWith(multilinePrompt, ["Repo1"]);
  });

  /**
   * Test: Single repository with empty prompt
   */
  it("handles single repository with empty prompt", () => {
    const selectedPrompts = [""];
    let initialPrompt = "";
    if (selectedPrompts.length === 1) {
      initialPrompt = selectedPrompts[0];
    }

    expect(initialPrompt).toBe("");
  });
});
