import { Container, FadeIn } from '../ui/FadeIn';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

export function CTA() {
  return (
    <section className="py-32 relative overflow-hidden bg-black text-white">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-5xl pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/30 via-black to-black blur-[100px]"></div>
      </div>
      
      <Container className="relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <FadeIn delay={0.1} direction="up">
            <h2 className="text-4xl md:text-6xl font-normal tracking-tight mb-8 leading-tight">
              Your supplier network is <br className="hidden md:block" />
              <span className="text-violet-500">one click away.</span>
            </h2>
          </FadeIn>
          
          <FadeIn delay={0.2} direction="up">
            <p className="text-xl text-gray-400 mb-10">
              Join thousands of UK suppliers and sellers already running their dropshipping operations on autopilot.
            </p>
          </FadeIn>
          
          <FadeIn delay={0.3} direction="up">
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto bg-[#1a1a1c] text-white hover:bg-white hover:text-[#1a1a1c] hover:shadow-[0_0_0_1px_#1a1a1c_inset] font-medium px-8 py-3.5 rounded-full transition-all duration-300 ease-in-out flex items-center justify-center group shadow-sm"
              >
                <div className="relative flex items-center">
                  <span className="transition-transform duration-300 ease-in-out group-hover:-translate-x-2.5">Register for free</span>
                  <ChevronRight className="absolute -right-4 opacity-0 -translate-x-2 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0 w-4 h-4" />
                </div>
              </Link>
              <Link
                to="/contact"
                className="w-full sm:w-auto bg-white text-[#1a1a1c] border border-gray-200 hover:bg-[#1a1a1c] hover:text-white hover:border-[#1a1a1c] font-medium px-8 py-3.5 rounded-full transition-all duration-300 ease-in-out flex items-center justify-center group shadow-[0_2px_10px_rgb(0,0,0,0.05)]"
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
    </section>
  );
}
