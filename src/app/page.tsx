import { TerminalPlaceholder } from "@/components/hud/TerminalPlaceholder";
import { HeroIdentity } from "@/components/portfolio/HeroIdentity";
import { ProjectGridPreview } from "@/components/projects/ProjectGridPreview";

export default function Home() {
  return (
    <main id="main-content" className="main-content">
      <TerminalPlaceholder />
      <HeroIdentity />
      <ProjectGridPreview />
    </main>
  );
}
