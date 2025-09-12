import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

const DEFAULT_DESCRIPTION = "Find dining options, hours, and nutrition information for Northwestern University. Plan your meals and track nutrition goals with our comprehensive dining guide.";
const DEFAULT_IMAGE = "https://nufood.me/fork_knife.png";

export default function SEO({
  title = "NUFood - Northwestern University Dining Guide & Nutrition Planner",
  description = DEFAULT_DESCRIPTION,
  keywords = "Northwestern University, dining, food, nutrition, campus dining, meal planning, NU food, university dining guide",
  image = DEFAULT_IMAGE,
  url = "https://nufood.me/",
  type = "website"
}: SEOProps) {
  const fullTitle = title.includes('NUFood') ? title : `${title} | NUFood`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Canonical URL */}
      <link rel="canonical" href={url} />
    </Helmet>
  );
}
