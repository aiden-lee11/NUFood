import LegalPage, { LegalSection } from '../components/LegalPage';

const CONTACT_EMAIL = 'nufoodfinder@gmail.com';

const Terms: React.FC = () => {
  return (
    <LegalPage
      title="Terms of Use"
      seoTitle="Terms of Use - NUFood"
      seoDescription="The terms for using NUFood, an independent app and website showing Northwestern University dining information."
      url="https://dining.nu/terms"
      lastUpdated="July 13, 2026"
    >
      <p>
        These terms apply to your use of NUFood, an independent app and website that shows
        Northwestern University dining-hall menus, hours, and nutrition information. By using
        NUFood, you agree to these terms.
      </p>

      <LegalSection heading="Service provided as-is">
        <p>
          NUFood is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any
          kind. We work to keep the service accurate and available, but we do not guarantee that
          it will be uninterrupted, error-free, or always up to date.
        </p>
      </LegalSection>

      <LegalSection heading="Menu and nutrition data">
        <p>
          Menu, hours, and nutrition information shown in NUFood is sourced from the
          university&rsquo;s publicly available dining information. It may be inaccurate,
          incomplete, or out of date. NUFood does not provide medical, health, or dietary advice,
          and the nutrition information should not be relied on for medical decisions. If you
          have allergies or specific dietary needs, confirm details directly with the dining
          hall.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>You agree to use NUFood lawfully and reasonably. In particular, you agree not to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Attempt to disrupt, overload, or interfere with the service or its servers</li>
          <li>Attempt to gain unauthorized access to accounts, systems, or data</li>
          <li>Use the service to violate any applicable law or the rights of others</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Accounts">
        <p>
          Signing in is optional. You are responsible for activity under your account. You may
          delete your account at any time using the in-app <strong>Delete Account</strong> option
          in the iOS app or by contacting us. We may suspend or terminate accounts that misuse
          the service or violate these terms.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          We may update these terms or change, suspend, or discontinue any part of the service at
          any time. When we update these terms, we will revise the &ldquo;Last updated&rdquo; date
          above.
        </p>
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        <p>
          To the extent permitted by law, NUFood and its creators are not liable for any damages
          arising from your use of, or inability to use, the service, including any reliance on
          the dining or nutrition information it displays.
        </p>
      </LegalSection>

      <LegalSection heading="Not affiliated with Northwestern University">
        <p>
          NUFood is an independent project. It is not affiliated with, sponsored by, or endorsed
          by Northwestern University.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about these terms? Email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
};

export default Terms;
