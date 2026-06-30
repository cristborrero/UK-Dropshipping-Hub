import { Container, FadeIn } from '../ui/FadeIn';
import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, UserPlus, PackageSearch, CreditCard, TrendingUp } from 'lucide-react';
import { cn } from '../ui/FadeIn';

const steps = [
  {
    num: "01",
    title: "Onboard your business",
    description: "Connect your Stripe account and verify your identity to join the network as a supplier or seller.",
    icon: UserPlus,
  },
  {
    num: "02",
    title: "Sync your catalog",
    description: "Suppliers upload inventory via CSV or API. Sellers browse and import products to their storefronts with one click.",
    icon: PackageSearch,
  },
  {
    num: "03",
    title: "Automate fulfillment",
    description: "When a customer buys on the seller's store, the order is automatically routed to the supplier for fulfillment.",
    icon: TrendingUp,
  },
  {
    num: "04",
    title: "Split payouts instantly",
    description: "Funds are held securely and automatically split between the platform, supplier, and seller upon delivery.",
    icon: CreditCard,
  }
];

export function Process() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'center', containScroll: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi, setSelectedIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  return (
    <section className="py-24 bg-black text-white overflow-hidden">
      <Container>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <FadeIn delay={0.1}>
            <span className="text-lime-500 font-bold tracking-widest text-sm uppercase mb-4 block">
              How it works
            </span>
            <h2 className="text-4xl md:text-5xl font-normal tracking-tight mb-4 max-w-2xl">
              From connection to payout <br className="hidden md:block" />
              <span className="text-violet-500">in four simple steps.</span>
            </h2>
          </FadeIn>
          
          <FadeIn delay={0.2} direction="left">
            <div className="flex items-center gap-3">
              <button 
                onClick={scrollPrev}
                className="w-12 h-12 rounded-full border border-gray-800 flex items-center justify-center hover:bg-gray-900 hover:border-gray-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={scrollNext}
                className="w-12 h-12 rounded-full border border-gray-800 flex items-center justify-center hover:bg-gray-900 hover:border-gray-700 transition-colors"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </FadeIn>
        </div>

        {/* Carousel Viewport */}
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]" ref={emblaRef}>
          <div className="flex gap-6 pb-8">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className={cn(
                  "flex-[0_0_85%] md:flex-[0_0_45%] lg:flex-[0_0_30%] min-w-0 transition-opacity duration-300",
                  selectedIndex === index ? "opacity-100" : "opacity-50 hover:opacity-75"
                )}
                onClick={() => scrollTo(index)}
              >
                <div className="bg-gray-900/50 rounded-[2rem] p-8 border border-gray-800 h-full cursor-pointer hover:border-lime-500/50 transition-colors">
                  <div className="flex items-center justify-between mb-12">
                    <span className="text-5xl font-medium text-gray-800">{step.num}</span>
                    <div className="w-12 h-12 rounded-full bg-lime-500/10 flex items-center justify-center border border-lime-500/20">
                      <step.icon className="w-6 h-6 text-lime-500" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-medium mb-4">{step.title}</h3>
                  <p className="text-gray-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Navigation Dots (Numbers) */}
        <div className="flex items-center justify-center gap-4 mt-8">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "text-sm font-bold w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                selectedIndex === index 
                  ? "bg-lime-500 text-black" 
                  : "bg-gray-900 text-gray-500 hover:bg-gray-800 hover:text-white"
              )}
            >
              0{index + 1}
            </button>
          ))}
        </div>

      </Container>
    </section>
  );
}
