// Client-side conversion state (Zustand).
// Tracks queued files, their per-file status, and completed results.

import { create } from "zustand";
import type { ConversionResult } from "./types";

export type FileStatus = "queued" | "processing" | "done" | "error";

export interface QueuedFile {
  id: string;
  file: File;
  status: FileStatus;
  error?: string;
  result?: ConversionResult;
}

interface ConverterState {
  files: QueuedFile[];
  isProcessing: boolean;
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  clearAll: () => void;
  setProcessing: (v: boolean) => void;
  markAll: (status: FileStatus) => void;
  applyResult: (filename: string, result: ConversionResult) => void;
  updateResult: (id: string, result: ConversionResult) => void;
  applyError: (filename: string, error: string) => void;
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `f${counter}-${counter.toString(36)}`;
}

export const useConverter = create<ConverterState>((set) => ({
  files: [],
  isProcessing: false,

  addFiles: (incoming) =>
    set((state) => {
      // De-duplicate by name + size so re-dropping the same file doesn't stack.
      const existing = new Set(state.files.map((f) => `${f.file.name}:${f.file.size}`));
      const additions = incoming
        .filter((f) => !existing.has(`${f.name}:${f.size}`))
        .map<QueuedFile>((file) => ({ id: nextId(), file, status: "queued" }));
      return { files: [...state.files, ...additions] };
    }),

  removeFile: (id) =>
    set((state) => ({ files: state.files.filter((f) => f.id !== id) })),

  clearAll: () => set({ files: [] }),

  setProcessing: (v) => set({ isProcessing: v }),

  markAll: (status) =>
    set((state) => ({ files: state.files.map((f) => ({ ...f, status })) })),

  applyResult: (filename, result) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.file.name === filename ? { ...f, status: "done", result, error: undefined } : f
      ),
    })),

  updateResult: (id, result) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, status: "done", result, error: undefined } : f
      ),
    })),

  applyError: (filename, error) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.file.name === filename ? { ...f, status: "error", error } : f
      ),
    })),
}));
