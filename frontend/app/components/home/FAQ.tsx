import { Container, FadeIn, cn } from '../ui/FadeIn';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    question: "What is UK Dropshipping Hub?",
    answer: "UK Dropshipping Hub is a B2B platform that connects UK-based suppliers (wholesalers and brands) with online sellers operating Shopify or WooCommerce stores. Suppliers list their catalogue, sellers import products and sell them — we handle the order routing, tracking, and split payouts automatically."
  },
  {
    question: "How does the Stripe Connect payment split work?",
    answer: "We use Stripe Destination Charges. When a customer buys on a seller's store, funds are collected by the platform's Stripe account, which then immediately routes the supplier's portion (minus platform fees) to the supplier's connected Stripe account. Both suppliers and sellers can see a full transaction ledger in their dashboard."
  },
  {
    question: "Do I need technical knowledge to connect my store?",
    answer: "Not at all. We offer 1-click integrations for Shopify and WooCommerce that take under 5 minutes to install. For custom platforms or ERPs, we provide a fully-documented REST API and webhooks. Our onboarding team is on hand to help with any setup."
  },
  {
    question: "How is inventory synchronised in real time?",
    answer: "Suppliers update their stock levels via our dashboard or API. We instantly push those updates to every connected seller storefront — preventing overselling before it happens. Most suppliers see full sync within seconds of an update."
  },
  {
    question: "Can I set custom commission rates per seller?",
    answer: "Yes. Our Pro and Business plans let you negotiate custom wholesale prices and set individual commission splits per seller relationship. You can also define minimum order quantities, reserve stock for specific sellers, and create tiered pricing rules."
  },
  {
    question: "Is UK Dropshipping Hub only for UK suppliers?",
    answer: "Our primary focus is connecting UK-based suppliers with UK sellers to enable fast domestic shipping (typically 1–3 days). That said, the platform supports international sellers listing in GBP, and we plan to expand supplier geographies based on demand."
  },
  {
    question: "How long does onboarding take?",
    answer: "Most suppliers are fully onboarded and listing products within 24–48 hours of signing up. Sellers can connect their Shopify or WooCommerce store and start importing products in under 30 minutes. Our team is available to assist at every step."
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-white">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          
          <div className="lg:col-span-1">
            <FadeIn delay={0.1}>
              <h2 className="text-4xl font-normal tracking-tight text-gray-900 mb-6">
                Frequently asked <span className="text-violet-500">questions</span>
              </h2>
              <p className="text-gray-500 mb-8">
                Everything you need to know about the product and billing. Can't find the answer you're looking for? Please chat to our friendly team.
              </p>
            </FadeIn>
          </div>
          
          <div className="lg:col-span-2">
            <FadeIn delay={0.2}>
              <div className="space-y-4">
                {faqs.map((faq, index) => {
                  const isOpen = openIndex === index;
                  return (
                    <div 
                      key={index} 
                      className={cn(
                        "border rounded-2xl transition-colors overflow-hidden",
                        isOpen ? "border-lime-500 bg-[#F8F9FB]" : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                    >
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : index)}
                        className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                      >
                        <span className="font-medium text-gray-900">{faq.question}</span>
                        <ChevronDown 
                          className={cn(
                            "w-5 h-5 text-gray-500 transition-transform duration-300",
                            isOpen ? "rotate-180 text-lime-500" : ""
                          )} 
                        />
                      </button>
                      
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="px-6 pb-6 pt-2 text-gray-500 leading-relaxed">
                              {faq.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </FadeIn>
          </div>

        </div>
      </Container>
    </section>
  );
}
