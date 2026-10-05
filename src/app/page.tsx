import { Hero } from "@/components/landing/Hero";
import { HallPreview } from "@/components/landing/HallPreview";
import {
  ArcadeBand,
  FeatureBento,
  FinalCta,
  LandingFooter,
  LandingNav,
  LeaguesShowcase,
  Section,
  StatsStrip,
  Steps,
} from "@/components/landing/sections";

export default function Home() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <StatsStrip />
        <Section eyebrow="O jogo" title="Tudo o que um treinador vive, semana após semana" lead="Da preleção ao apito final: escalação, mercado, finanças, base e uma diretoria que cobra resultado.">
          <FeatureBento />
        </Section>
        <Section id="ligas" eyebrow="Ligas" title="13 países, 35 divisões" lead="Cada liga tem acesso e rebaixamento, copa nacional, supercopa e vagas nos continentais; no Brasil, ainda tem os estaduais e a Copa do Nordeste." className="pt-0 sm:pt-0">
          <LeaguesShowcase />
        </Section>
        <Section eyebrow="Como funciona" title="Três passos até a primeira taça" className="pt-0 sm:pt-0">
          <Steps />
        </Section>
        <Section eyebrow="Hall da Fama" title="Os treinadores mais vitoriosos" lead="Carreiras salvas na nuvem entram no ranking global de títulos." className="pt-0 sm:pt-0">
          <HallPreview />
        </Section>
        <ArcadeBand />
        <FinalCta />
      </main>
      <LandingFooter />
    </>
  );
}
