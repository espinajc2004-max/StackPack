import type { IntegrationRecipe, PackageRequirement, PlannedFile } from "../types.js";
import type { ProjectContext } from "../../schemas/project-context.js";
import { detectByPackages } from "../detect.js";

/**
 * Every UI-library recipe ships a small test button component so the user
 * can render it immediately and confirm the installed dependency works.
 */
function testButtonFile(context: ProjectContext, fileName: string, contents: string): PlannedFile {
  const ext = context.language === "typescript" ? "tsx" : "jsx";
  return {
    path: `src/components/${fileName}.${ext}`,
    contents,
    description: "Test button to verify the UI library works.",
  };
}

const uiNote = (component: string, path: string) =>
  `Render <${component} /> (from ${path}) in any page to test that the library works.`;

export const radixRecipe: IntegrationRecipe = {
  id: "radix-ui",
  recipeVersion: 1,
  name: "Radix UI",
  category: "ui",
  status: "stable",
  installationSummary: "Official package installation + generated test button",
  officialSource: {
    documentationUrl: "https://www.radix-ui.com/primitives/docs/overview/getting-started",
    lastVerifiedAt: "2026-07-19",
  },
  requires: [],
  runsAfter: [],
  conflictsWith: [],
  supportedProjects: [{ frameworks: ["react", "next"] }],
  installation: {
    type: "official-package-install",
    dependencies: [
      {
        name: "radix-ui",
        version: "latest",
        dependencyType: "dependency",
        reason: "Unstyled accessible primitives (unified package).",
      },
    ],
    devDependencies: [],
  },
  detectInstalled(context) {
    return detectByPackages(context, ["radix-ui"]);
  },
  createPlan(context) {
    const packages: PackageRequirement[] = [
      {
        name: "radix-ui",
        version: "latest",
        dependencyType: "dependency",
        reason: "Unstyled accessible primitives (unified package).",
      },
    ];
    const clientDirective = context.framework === "next" ? `"use client";\n\n` : "";
    return {
      packages,
      filesToCreate: [
        testButtonFile(
          context,
          "radix-test-button",
          `${clientDirective}import { Toggle } from "radix-ui";

export function RadixTestButton() {
  return (
    <Toggle.Root
      onPressedChange={(pressed) => console.log("Radix Toggle pressed:", pressed)}
    >
      Radix UI test button
    </Toggle.Root>
  );
}
`,
        ),
      ],
      scripts: [],
      postInstallNotes: [
        uiNote("RadixTestButton", "src/components/radix-test-button"),
        "Radix primitives are unstyled; add your own CSS or a styling layer.",
      ],
    };
  },
};

export const baseUiRecipe: IntegrationRecipe = {
  id: "base-ui",
  recipeVersion: 1,
  name: "Base UI",
  category: "ui",
  status: "stable",
  installationSummary: "Official package installation + generated test button",
  officialSource: {
    documentationUrl: "https://base-ui.com/react/overview/quick-start",
    lastVerifiedAt: "2026-07-19",
  },
  requires: [],
  runsAfter: [],
  conflictsWith: [],
  supportedProjects: [{ frameworks: ["react", "next"] }],
  installation: {
    type: "official-package-install",
    dependencies: [
      {
        name: "@base-ui-components/react",
        version: "latest",
        dependencyType: "dependency",
        reason: "Unstyled accessible React components.",
      },
    ],
    devDependencies: [],
  },
  detectInstalled(context) {
    return detectByPackages(context, ["@base-ui-components/react"]);
  },
  createPlan(context) {
    const packages: PackageRequirement[] = [
      {
        name: "@base-ui-components/react",
        version: "latest",
        dependencyType: "dependency",
        reason: "Unstyled accessible React components.",
      },
    ];
    const clientDirective = context.framework === "next" ? `"use client";\n\n` : "";
    return {
      packages,
      filesToCreate: [
        testButtonFile(
          context,
          "base-ui-test-button",
          `${clientDirective}import { Toggle } from "@base-ui-components/react/toggle";

export function BaseUiTestButton() {
  return (
    <Toggle onPressedChange={(pressed) => console.log("Base UI Toggle pressed:", pressed)}>
      Base UI test button
    </Toggle>
  );
}
`,
        ),
      ],
      scripts: [],
      postInstallNotes: [
        uiNote("BaseUiTestButton", "src/components/base-ui-test-button"),
        "Base UI components are unstyled; style them with your own CSS.",
      ],
    };
  },
};

export const reactAriaRecipe: IntegrationRecipe = {
  id: "react-aria",
  recipeVersion: 1,
  name: "React Aria",
  category: "ui",
  status: "stable",
  installationSummary: "Official package installation + generated test button",
  officialSource: {
    documentationUrl: "https://react-spectrum.adobe.com/react-aria/getting-started.html",
    lastVerifiedAt: "2026-07-19",
  },
  requires: [],
  runsAfter: [],
  conflictsWith: [],
  supportedProjects: [{ frameworks: ["react", "next"] }],
  installation: {
    type: "official-package-install",
    dependencies: [
      {
        name: "react-aria-components",
        version: "latest",
        dependencyType: "dependency",
        reason: "Adobe's accessible component library.",
      },
    ],
    devDependencies: [],
  },
  detectInstalled(context) {
    return detectByPackages(context, ["react-aria-components"]);
  },
  createPlan(context) {
    const packages: PackageRequirement[] = [
      {
        name: "react-aria-components",
        version: "latest",
        dependencyType: "dependency",
        reason: "Adobe's accessible component library.",
      },
    ];
    const clientDirective = context.framework === "next" ? `"use client";\n\n` : "";
    return {
      packages,
      filesToCreate: [
        testButtonFile(
          context,
          "aria-test-button",
          `${clientDirective}import { Button } from "react-aria-components";

export function AriaTestButton() {
  return (
    <Button onPress={() => console.log("React Aria button pressed")}>
      React Aria test button
    </Button>
  );
}
`,
        ),
      ],
      scripts: [],
      postInstallNotes: [uiNote("AriaTestButton", "src/components/aria-test-button")],
    };
  },
};
