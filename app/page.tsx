import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { WhatIBuild } from "@/components/WhatIBuild";
import { ProjectsExplorer } from "@/components/ProjectsExplorer";
import { About } from "@/components/About";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { AdventurePortalEntry } from "@/components/AdventurePortalEntry";
import { ArrivalFade } from "@/components/adventure/ui/ArrivalFade";

export default function Home() {
  return (
    <ArrivalFade>
      <Navbar />
      <main>
        <Hero />
        <About />
        <WhatIBuild />
        <ProjectsExplorer />
      </main>
      <Contact />
      <Footer />
      <AdventurePortalEntry adventureHref="/adventure" />
    </ArrivalFade>
  );
}
