import "@testing-library/jest-dom";
import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Nettoyage automatique après chaque test
afterEach(() => {
  cleanup();
});
