import LegalPage, { LegalSection } from '../components/LegalPage';

const CONTACT_EMAIL = 'nufoodfinder@gmail.com';

const Support: React.FC = () => {
  return (
    <LegalPage
      title="Support"
      seoTitle="Support - NUFood"
      seoDescription="Get help with NUFood: how sign-in, favorites, nutrition goals, and account deletion work, plus how to contact us."
      url="https://nufood.me/support"
    >
      <p>
        NUFood is an independent, student-built app and website that shows Northwestern
        University dining-hall menus, hours, and nutrition information. If you need help or have
        a question, this page covers the basics and how to reach us.
      </p>

      <LegalSection heading="Do I need an account?">
        <p>
          No. You can browse dining-hall menus, hours, and nutrition information without signing
          in. Signing in is optional and simply lets you save and sync your favorites and
          nutrition goals across devices.
        </p>
      </LegalSection>

      <LegalSection heading="How do favorites and goals sync?">
        <p>
          When you sign in with Google or with Apple, your favorite menu items, nutrition goals,
          meal-planner data, and display preferences are saved to your account. Sign in on
          another device with the same account and your data will be there. If you use NUFood
          without signing in, this data is not synced.
        </p>
      </LegalSection>

      <LegalSection heading="How do I delete my account?">
        <p>
          In the NUFood iOS app, open your account settings and choose{' '}
          <strong>Delete Account</strong>. This removes your account and the data associated with
          it, including your favorites, nutrition goals and planner data, and display
          preferences. You can also email us and we will delete your account for you.
        </p>
      </LegalSection>

      <LegalSection heading="Is the menu and nutrition data accurate?">
        <p>
          NUFood displays dining information sourced from the university&rsquo;s public dining
          data. It may be incomplete or out of date, and it is not a substitute for medical or
          dietary advice. If you have allergies or specific dietary needs, please confirm
          directly with the dining hall.
        </p>
      </LegalSection>

      <LegalSection heading="Contact us">
        <p>
          Questions, bug reports, or feedback? Email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
          . You can also use the <strong>Send Feedback</strong> option built into the app and
          website. We read every message and appreciate the help improving NUFood.
        </p>
      </LegalSection>

      <p className="text-muted-foreground">
        NUFood is an independent project and is not affiliated with, sponsored by, or endorsed
        by Northwestern University.
      </p>
    </LegalPage>
  );
};

export default Support;
