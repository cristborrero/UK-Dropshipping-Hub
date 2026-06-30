import type { Route } from "./+types/home";
import { getSession } from "../lib/auth.server";
import { useLoaderData } from "react-router";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { Hero } from "../components/home/Hero";
import { AboutUs } from "../components/home/AboutUs";
import { Features } from "../components/home/Features";
import { Process } from "../components/home/Process";
import { CoreFeatures } from "../components/home/CoreFeatures";
import { Benefits } from "../components/home/Benefits";
import { Pricing } from "../components/home/Pricing";
import { Integrations } from "../components/home/Integrations";
import { Testimonials } from "../components/home/Testimonials";
import { FAQ } from "../components/home/FAQ";
import { CTA } from "../components/home/CTA";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "UK Dropshipping Hub – Connect UK Suppliers & Sellers" },
    { name: "description", content: "The UK's leading B2B dropshipping platform. Connect verified UK suppliers with Shopify & WooCommerce sellers. Automated order routing, real-time inventory sync, and instant split payouts via Stripe." },
    { name: "keywords", content: "UK dropshipping, B2B dropshipping platform, UK suppliers, dropshipping automation, Shopify dropshipping UK, WooCommerce dropshipping, supplier network UK" },
    { name: "robots", content: "index, follow" },
    { name: "author", content: "UK Dropshipping Hub" },
    // Open Graph
    { property: "og:type", content: "website" },
    { property: "og:title", content: "UK Dropshipping Hub – Connect UK Suppliers & Sellers" },
    { property: "og:description", content: "Automate your UK B2B dropshipping. Connect verified local suppliers with online sellers. Real-time sync, automated fulfillment, instant payouts." },
    { property: "og:site_name", content: "UK Dropshipping Hub" },
    { property: "og:locale", content: "en_GB" },
    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "UK Dropshipping Hub – Connect UK Suppliers & Sellers" },
    { name: "twitter:description", content: "The UK's leading B2B dropshipping platform. Automate orders, sync inventory, split payouts instantly." },
    // Schema.org JSON-LD
    {
      "script:ld+json": JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "UK Dropshipping Hub",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: "B2B dropshipping platform connecting UK suppliers and sellers with automated order routing, real-time inventory sync, and Stripe-powered split payouts.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "GBP"
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          reviewCount: "312"
        }
      })
    }
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  const accessToken = session.get('accessToken');
  return { isLoggedIn: !!accessToken };
}

export default function Home() {
  const { isLoggedIn } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-[#F8F9FB] antialiased text-gray-900 selection:bg-lime-500 selection:text-black overflow-x-hidden">
      <Header isLoggedIn={isLoggedIn} />
      <main>
        <Hero />
        <AboutUs />
        <Features />
        <Process />
        <CoreFeatures />
        <Benefits />
        <Pricing />
        <Integrations />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
