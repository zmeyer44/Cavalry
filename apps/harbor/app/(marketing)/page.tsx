import { Hero } from '@/components/marketing/hero';
import {
  Comparison,
  CTA,
  Features,
  HowItWorks,
  Integrations,
  Personas,
  Problem,
  SelfHost,
  Stats,
  TrustBar,
} from '@/components/marketing/sections';

export default function LandingPage() {
  return (
    <>
      <Hero />
      {/* <TrustBar /> */}
      <Stats />
      <HowItWorks />
      <Problem />
      <Features />
      <Personas />
      <Comparison />
      <SelfHost />
      <Integrations />
      <CTA />
    </>
  );
}
