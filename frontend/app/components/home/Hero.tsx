import { Link } from 'react-router';
import { Container, FadeIn } from '../ui/FadeIn';
import { ChevronRight } from 'lucide-react';
// @ts-ignore
import avatar1 from '/Users/cristianborrero/.gemini/antigravity-ide/brain/86648927-17f8-445d-9333-1feeeeb6b2ea/testimonial_avatar_1_1782758251720.png';

export function Hero() {
  return (
    <section className="relative pt-40 lg:pt-56 pb-0 overflow-hidden bg-white flex flex-col justify-start">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid-cross z-0 opacity-80 mask-[radial-gradient(ellipse_at_center,black,transparent_70%)]"></div>
      
      {/* Decorative blobs */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-linear-to-r from-purple-400/20 to-indigo-400/20 blur-[100px] rounded-full pointer-events-none" />



      <Container className="relative z-30">
        <div className="flex flex-col items-center text-center">
          
          <FadeIn delay={0.2} direction="up">
            <h1 className="text-6xl md:text-[80px] font-medium tracking-[-0.04em] text-brand-dark mb-6 max-w-4xl leading-[1.1]">
              The UK supplier network <br className="hidden md:block"/>
              <span className="text-brand-accent">built for dropshippers.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.3} direction="up">
            <p className="text-[15px] md:text-[17px] text-gray-500 max-w-[800px] mb-12 leading-[1.6] mx-auto">
              Connect with verified UK-based wholesalers, sync your catalogue in real-time, and automate order fulfilment from supplier to customer door. No spreadsheets. No chasing invoices. Just growth.
            </p>
          </FadeIn>

          <FadeIn delay={0.4} direction="up">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
              <Link
                to="/register"
                className="bg-brand-dark text-white hover:bg-white hover:text-brand-dark hover:shadow-[0_0_0_1px_#1a1a1c_inset] font-medium text-[15px] px-8 py-3.5 rounded-full transition-all duration-300 ease-in-out shadow-sm flex items-center justify-center group"
              >
                <div className="relative flex items-center">
                  <span className="transition-transform duration-300 ease-in-out group-hover:-translate-x-2.5">Start for free</span>
                  <ChevronRight className="absolute -right-4 opacity-0 -translate-x-2 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0 w-4 h-4" />
                </div>
              </Link>
              <Link
                to="/contact"
                className="bg-white text-brand-dark border border-gray-200 hover:bg-brand-dark hover:text-white hover:border-brand-dark font-medium text-[15px] px-8 py-3.5 rounded-full transition-all duration-300 ease-in-out flex items-center justify-center group"
              >
                <div className="relative flex items-center">
                  <span className="transition-transform duration-300 ease-in-out group-hover:-translate-x-2.5">Contact us</span>
                  <ChevronRight className="absolute -right-4 opacity-0 -translate-x-2 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0 w-4 h-4" />
                </div>
              </Link>
            </div>
          </FadeIn>

        </div>
      </Container>

      {/* 3D Wave Flowing Below (Color-shifted to match buttons) */}
      <FadeIn delay={0.5} direction="up" className="w-full relative z-20 -mt-[150px] md:-mt-[350px]">
        <div className="w-[110vw] max-w-none -ml-[5vw] pointer-events-none mix-blend-multiply">
          <img 
            src="/img-bg-hero.svg" 
            alt="Abstract Flow" 
            className="w-full h-auto object-contain opacity-90 -hue-rotate-30 saturate-150"
          />
        </div>
      </FadeIn>
    </section>
  );
}
