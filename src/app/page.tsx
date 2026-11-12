import { HeroIdentity } from "@/components/portfolio/HeroIdentity";
import { ProjectShowcase } from "@/components/projects/ProjectShowcase";
import { ConversionFooter } from "@/components/portfolio/ConversionFooter";
import { AboutSection } from "@/components/portfolio/AboutSection";

export default function Home() {
  return (
    <main id="main-content" className="main-content">
      <HeroIdentity />
      <ProjectShowcase />
      <AboutSection />
      <ConversionFooter />
    </main>
  );
}
