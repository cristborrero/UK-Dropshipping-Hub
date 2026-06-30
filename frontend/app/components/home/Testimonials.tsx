import { Container, FadeIn } from '../ui/FadeIn';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import { useEffect } from 'react';
import { Star } from 'lucide-react';
// @ts-ignore
import avatarSarah from '/Users/cristianborrero/.gemini/antigravity-ide/brain/86648927-17f8-445d-9333-1feeeeb6b2ea/avatar_sarah_1782810150617.png';
// @ts-ignore
import avatarDavid from '/Users/cristianborrero/.gemini/antigravity-ide/brain/86648927-17f8-445d-9333-1feeeeb6b2ea/avatar_david_1782810161529.png';
// @ts-ignore
import avatarEmma from '/Users/cristianborrero/.gemini/antigravity-ide/brain/86648927-17f8-445d-9333-1feeeeb6b2ea/avatar_emma_1782810171048.png';
// @ts-ignore
import avatarJames from '/Users/cristianborrero/.gemini/antigravity-ide/brain/86648927-17f8-445d-9333-1feeeeb6b2ea/avatar_james_1782810200591.png';
// @ts-ignore
import avatarSophie from '/Users/cristianborrero/.gemini/antigravity-ide/brain/86648927-17f8-445d-9333-1feeeeb6b2ea/avatar_sophie_1782810210858.png';
// @ts-ignore
import avatarMarcus from '/Users/cristianborrero/.gemini/antigravity-ide/brain/86648927-17f8-445d-9333-1feeeeb6b2ea/avatar_marcus_1782810218972.png';

const testimonials = [
  {
    quote: "UK Dropshipping Hub completely transformed our fulfilment operations. We reduced order errors to near zero and expanded our seller network by 300% in six months.",
    name: "Sarah Jenkins",
    role: "Operations Director, PetSupplies Co.",
    avatar: avatarSarah
  },
  {
    quote: "The automated payout split is a game-changer. We no longer spend days reconciling spreadsheets at the end of the month. It all just works, and our suppliers love the transparency.",
    name: "David Chen",
    role: "Founder, FitGear Dropship",
    avatar: avatarDavid
  },
  {
    quote: "Setup took hours instead of weeks. The API integration is flawless and the dashboard gives me total visibility over my entire network.",
    name: "Emma Rodriguez",
    role: "CTO, HomeVibe Essentials",
    avatar: avatarEmma
  },
  {
    quote: "Our suppliers love the unified dashboard. We've seen a 40% decrease in support tickets since moving to UK Dropshipping Hub.",
    name: "James Wilson",
    role: "Head of Retail, Urban Goods",
    avatar: avatarJames
  },
  {
    quote: "The ability to sync directly with Shopify stores without custom plugins saved us thousands in development costs.",
    name: "Sophie Clark",
    role: "E-commerce Manager, TrendSet",
    avatar: avatarSophie
  },
  {
    quote: "Best investment we've made this year. The 7-day payout schedule keeps our cash flow incredibly healthy.",
    name: "Marcus Johnson",
    role: "Director, Global Traders UK",
    avatar: avatarMarcus
  }
];

export function Testimonials() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, dragFree: true }, [
    AutoScroll({ playOnInit: true, speed: 1, stopOnInteraction: false, stopOnMouseEnter: true })
  ]);

  useEffect(() => {
    if (!emblaApi) return;
  }, [emblaApi]);

  return (
    <section className="py-24 bg-[#F8F9FB]">
      <Container>
        <div className="text-center max-w-2xl mx-auto mb-16">
          <FadeIn delay={0.1}>
            <span className="text-violet-500 font-bold tracking-widest text-sm uppercase mb-4 block">
              Testimonials
            </span>
            <h2 className="text-4xl font-normal tracking-tight text-gray-900 mb-6">
              Trusted by operators <span className="text-violet-500">worldwide</span>
            </h2>
          </FadeIn>
        </div>

        <FadeIn delay={0.2} direction="up">
          <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]" ref={emblaRef}>
            <div className="flex gap-8 pb-4">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="flex-[0_0_100%] md:flex-[0_0_60%] lg:flex-[0_0_40%] min-w-0 px-4">
                  <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-gray-100 h-full flex flex-col">
                    <div className="flex gap-1 mb-8">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} className="w-5 h-5 fill-lime-500 text-lime-500" />
                      ))}
                    </div>
                    
                    <p className="text-xl text-gray-900 font-medium mb-8 leading-relaxed flex-grow">
                      "{testimonial.quote}"
                    </p>
                    
                    <div className="flex items-center gap-4 mt-auto">
                      <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover border-2 border-gray-100" />
                      <div>
                        <p className="font-medium text-gray-900">{testimonial.name}</p>
                        <p className="text-sm text-gray-500">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 
            Since auto-scroll is continuous, navigation dots don't map 1:1 perfectly, 
            but we can keep them for manual interaction if needed, or hide them. 
            Hiding them is usually preferred for a continuous marquee.
          */}
        </FadeIn>
      </Container>
    </section>
  );
}
