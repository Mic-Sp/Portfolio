import { TerminalPlaceholder } from "@/components/hud/TerminalPlaceholder";
import { HeroIdentity } from "@/components/portfolio/HeroIdentity";
import { ProjectShowcase } from "@/components/projects/ProjectShowcase";

export default function Home() {
  return (
    <main id="main-content" className="main-content">
      <TerminalPlaceholder />
      <HeroIdentity />
      <ProjectShowcase />
    </main>
  );
}
