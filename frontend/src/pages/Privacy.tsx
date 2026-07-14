import LegalPage, { LegalSection } from '../components/LegalPage';

const CONTACT_EMAIL = 'nufoodfinder@gmail.com';

const Privacy: React.FC = () => {
  return (
    <LegalPage
      title="Privacy Policy"
      seoTitle="Privacy Policy - NUFood"
      seoDescription="How NUFood handles your data: account information, favorites, nutrition goals, and the third-party services we use."
      url="https://nufood.me/privacy"
      lastUpdated="July 13, 2026"
    >
      <p>
        NUFood is an independent, student-built app and website that shows Northwestern
        University dining-hall menus, hours, and nutrition information. This policy explains
        what information NUFood collects, how it is used, and the choices you have. We aim to
        collect as little as possible.
      </p>

      <LegalSection heading="Browsing without an account">
        <p>
          You can browse dining-hall menus, operation hours, and nutrition information without
          creating an account or signing in. No account is required to use the core features of
          NUFood.
        </p>
      </LegalSection>

      <LegalSection heading="Account information">
        <p>
          Signing in is optional. If you choose to sign in with Google or with Apple, our
          authentication provider (Firebase Authentication) gives us basic profile information
          so we can create and secure your account. This typically includes:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Your name (as provided by the sign-in provider)</li>
          <li>Your email address</li>
          <li>A unique account identifier (Firebase UID)</li>
        </ul>
        <p>
          When you sign in with Apple, you may choose to hide your email address, in which case
          Apple provides a private relay address instead of your real one.
        </p>
      </LegalSection>

      <LegalSection heading="Information you create">
        <p>
          When you are signed in, NUFood stores the content you create so it can sync across
          your devices, including:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Your favorite menu items</li>
          <li>Your nutrition goals and meal-planner data</li>
          <li>Your display preferences and settings</li>
          <li>Your mailing-list preference (if you opt in to that feature)</li>
        </ul>
        <p>
          This information is tied to your account and is used only to provide these features
          to you.
        </p>
      </LegalSection>

      <LegalSection heading="Server logs and hosting">
        <p>
          Like most websites and apps, our servers and hosting providers automatically record
          standard technical information as part of normal operation and security, such as IP
          addresses, request times, and error logs. This information is used to keep the
          service running reliably and to diagnose problems.
        </p>
      </LegalSection>

      <LegalSection heading="Analytics">
        <p>
          The NUFood website uses Google Analytics to understand aggregate usage, such as which
          pages are visited, so we can improve the site. This helps us see overall traffic
          patterns and is not used to identify you personally. The NUFood iOS app does not
          include analytics or advertising software.
        </p>
      </LegalSection>

      <LegalSection heading="Third-party services">
        <p>NUFood relies on the following third-party services:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Firebase Authentication (Google) &mdash; account sign-in and security</li>
          <li>Google Sign-In &mdash; optional sign-in method</li>
          <li>Sign in with Apple &mdash; optional sign-in method</li>
          <li>Google Analytics &mdash; website usage statistics</li>
        </ul>
        <p>
          These providers handle your information according to their own privacy policies.
        </p>
      </LegalSection>

      <LegalSection heading="How we use information">
        <p>
          We use the information described above only to provide and improve NUFood: to
          authenticate you, to sync your favorites and preferences, to operate and secure our
          servers, and to understand aggregate website usage.
        </p>
      </LegalSection>

      <LegalSection heading="No sale of data, no advertising">
        <p>
          We do not sell your personal information, and we do not use it for advertising. NUFood
          does not show ads.
        </p>
      </LegalSection>

      <LegalSection heading="Data retention">
        <p>
          We keep your account information and the content you create for as long as your
          account exists. When you delete your account, this information is deleted as described
          below.
        </p>
      </LegalSection>

      <LegalSection heading="Deleting your account">
        <p>
          You can delete your account at any time using the in-app <strong>Delete Account</strong>{' '}
          option in the NUFood iOS app. Deleting your account removes your account and the data
          associated with it, including your favorites, nutrition goals and planner data, and
          display preferences. You can also contact us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>{' '}
          and we will delete your account and associated data.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>
          NUFood is not directed at children under 13, and we do not knowingly collect personal
          information from children under 13.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        <p>
          We may update this policy from time to time. When we do, we will revise the &ldquo;Last
          updated&rdquo; date at the top of this page. Significant changes will be reflected here.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          If you have questions about this policy or your data, contact us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Not affiliated with Northwestern University">
        <p>
          NUFood is an independent project. It is not affiliated with, sponsored by, or endorsed
          by Northwestern University. Dining-hall names and related information are used only to
          describe publicly available menu data.
        </p>
      </LegalSection>
    </LegalPage>
  );
};

export default Privacy;
