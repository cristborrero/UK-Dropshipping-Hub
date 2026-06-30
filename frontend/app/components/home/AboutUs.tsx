import { Link } from 'react-router';
import { Container, FadeIn } from '../ui/FadeIn';
import { ChevronRight } from 'lucide-react';
// @ts-ignore
import teamImage from '/Users/cristianborrero/.gemini/antigravity-ide/brain/86648927-17f8-445d-9333-1feeeeb6b2ea/about_team_1782758195324.png';

export function AboutUs() {
  return (
    <section className="pb-24 pt-12 bg-white relative z-0 -mt-10 md:-mt-20">
      <Container>
        <FadeIn delay={0.1}>
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-12 lg:p-16 relative z-30 overflow-hidden">
            {/* Inner Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-500/20 blur-[100px] rounded-full pointer-events-none"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          
          {/* Image */}
          <FadeIn direction="right" delay={0.1}>
            <div className="relative rounded-[2rem] overflow-hidden bg-slate-100 aspect-square md:aspect-[4/3] lg:aspect-square">
              <img 
                src="/assets/asset 18.png" 
                alt="Our Team" 
                className="object-cover w-full h-full"
              />
              {/* Decorative accent */}
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-indigo-500 rounded-full blur-[80px] opacity-20"></div>
            </div>
          </FadeIn>

          {/* Content */}
          <FadeIn direction="left" delay={0.2} className="flex flex-col justify-center">
            <span className="text-indigo-600 font-bold tracking-widest text-sm uppercase mb-4">
              About Us
            </span>
            
            <h2 className="text-4xl md:text-5xl font-normal tracking-tight text-gray-900 mb-6">
              The team behind <br className="hidden md:block" />
              <span className="text-violet-500">smarter automation</span>
            </h2>
            
            <p className="text-lg text-gray-500 mb-8 leading-relaxed">
              We built Nexsas because we were tired of managing dropshipping operations with spreadsheets and disjointed tools. Our platform bridges the gap between suppliers and sellers, creating a unified ecosystem where inventory, orders, and payments flow seamlessly.
            </p>
            
            <Link
              to="/about"
              className="inline-flex items-center justify-center bg-[#1a1a1c] text-white hover:bg-white hover:text-[#1a1a1c] hover:shadow-[0_0_0_1px_#1a1a1c_inset] font-medium px-8 py-3.5 rounded-full transition-all duration-300 ease-in-out w-fit mb-12 shadow-sm group"
            >
              <div className="relative flex items-center">
                <span className="transition-transform duration-300 ease-in-out group-hover:-translate-x-2.5">Learn more</span>
                <ChevronRight className="absolute -right-4 opacity-0 -translate-x-2 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0 w-4 h-4" />
              </div>
            </Link>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-gray-100">
              <div>
                <p className="text-4xl font-medium text-gray-900 mb-1">99%</p>
                <p className="text-sm font-medium text-gray-500">Client Satisfaction</p>
              </div>
              <div>
                <p className="text-4xl font-medium text-gray-900 mb-1">50M+</p>
                <p className="text-sm font-medium text-gray-500">Automated Workflows</p>
              </div>
              <div>
                <p className="text-4xl font-medium text-gray-900 mb-1">4.9</p>
                <p className="text-sm font-medium text-gray-500">User Rating</p>
              </div>
            </div>

          </FadeIn>
            </div>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
