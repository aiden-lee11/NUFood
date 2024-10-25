import { useAuth } from "../context/AuthProvider";
import { Sheet, SheetTrigger, SheetContent } from "../components/ui/sheet";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";

const navItemsLeft = [
  { label: "Home", url: "/" },
  { label: "All Items", url: "/all" },
  { label: "Operation Hours", url: "/hours" },
];

export default function MyNavbar() {
  const { token } = useAuth();
  const loggedIn = !!token;

  return (
    <header className="flex h-20 w-full shrink-0 items-center px-4 md:px-6">
      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden">
            <MenuIcon className="h-6 w-6" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <div className="grid gap-2 py-6">
            {navItemsLeft.map(({ label, url }) => (
              <Link
                key={label}
                to={url}
                className="flex w-full items-center py-2 text-lg font-semibold"
              >
                {label}
              </Link>
            ))}
            <hr className="my-2 border-gray-700" />
            {loggedIn && (
              <Link
                to="/preferences"
                className="flex w-full items-center py-2 text-lg font-semibold"
              >
                Preferences
              </Link>
            )}
            <Link
              to={loggedIn ? "/signout" : "/login"}
              className="flex w-full items-center py-2 text-lg font-semibold"
            >
              {loggedIn ? "Sign Out" : "Login"}
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      {/* Logo (optional, replace with your app branding if necessary) */}
      <Link to="#" className="mr-6 hidden lg:flex">
        <MountainIcon className="h-6 w-6" />
        <span className="sr-only">Your Logo</span>
      </Link>

      {/* Desktop Navigation */}
      <nav className="ml-auto hidden lg:flex gap-6">
        {navItemsLeft.map(({ label, url }) => (
          <Link
            key={label}
            to={url}
            className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-950 dark:hover:bg-gray-800 dark:hover:text-gray-50"
          >
            {label}
          </Link>
        ))}
        {loggedIn && (
          <Link
            to="/preferences"
            className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-950 dark:hover:bg-gray-800 dark:hover:text-gray-50"
          >
            Preferences
          </Link>
        )}
        <Link
          to={loggedIn ? "/signout" : "/login"}
          className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-950 dark:hover:bg-gray-800 dark:hover:text-gray-50"
        >
          {loggedIn ? "Sign Out" : "Login"}
        </Link>
      </nav>
    </header>
  );
}

function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function MountainIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
    </svg>
  );
}
