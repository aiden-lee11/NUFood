import * as React from 'react';
import { Link } from 'react-router-dom';
import SEO from './SEO';

interface LegalPageProps {
  title: string;
  seoTitle: string;
  seoDescription: string;
  url: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

/**
 * Shared layout for the public legal / info pages (Privacy, Terms, Support).
 * Uses the site's semantic theme tokens so light/dark modes work automatically.
 */
export default function LegalPage({
  title,
  seoTitle,
  seoDescription,
  url,
  lastUpdated,
  children,
}: LegalPageProps) {
  return (
    <div className="p-6 min-h-screen bg-background text-foreground transition-colors duration-200">
      <SEO title={seoTitle} description={seoDescription} url={url} />

      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">{title}</h1>
        {lastUpdated && (
          <p className="text-sm text-muted-foreground mt-1">Last updated: {lastUpdated}</p>
        )}

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-foreground">
          {children}
        </div>

        <div className="mt-10 pt-6 border-t border-border text-sm text-muted-foreground">
          <nav className="flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms of Use
            </Link>
            <Link to="/support" className="hover:text-foreground transition-colors">
              Support
            </Link>
            <Link to="/" className="hover:text-foreground transition-colors">
              Back to NUFood
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}

/** Section heading used inside the legal pages. */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      {children}
    </section>
  );
}
