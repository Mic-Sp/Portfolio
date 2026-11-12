"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const ProjectCaseStudyContext = createContext<{
  expandedCaseStudyId: string | null;
  toggleCaseStudy: (id: string) => void;
} | null>(null);

/** One open case study across both project presentations, independent of deck selection. */
export function ProjectCaseStudyProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [expandedCaseStudyId, setExpandedCaseStudyId] = useState<string | null>(
    null,
  );
  const toggleCaseStudy = useCallback((id: string) => {
    setExpandedCaseStudyId((current) => (current === id ? null : id));
  }, []);
  const value = useMemo(
    () => ({ expandedCaseStudyId, toggleCaseStudy }),
    [expandedCaseStudyId, toggleCaseStudy],
  );
  return (
    <ProjectCaseStudyContext.Provider value={value}>
      {children}
    </ProjectCaseStudyContext.Provider>
  );
}

export function useProjectCaseStudy() {
  const context = useContext(ProjectCaseStudyContext);
  if (!context)
    throw new Error(
      "useProjectCaseStudy must be used within ProjectCaseStudyProvider",
    );
  return context;
}
