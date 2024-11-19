import { Navbar, NavbarDivider, NavbarItem, NavbarSection, NavbarSpacer } from './navbar'
import { Sidebar, SidebarBody, SidebarItem, SidebarSection, SidebarSpacer } from './sidebar'
import { StackedLayout } from './stacked-layout'
import { ReactNode } from 'react'

const navItemsLeft = [
  { label: 'Home', url: '/' },
  { label: 'My Picks', url: '/available' },
  { label: 'All Items', url: '/all' },
]

const loggedIn = localStorage.getItem('t') != null;

function MyNavbar({ children }: { children: ReactNode }) {
  return (
    <StackedLayout
      navbar={
        <Navbar>
          <NavbarDivider className="max-lg:hidden" />
          <NavbarSection className="max-lg:hidden">
            {navItemsLeft.map(({ label, url }) => (
              <NavbarItem key={label} href={url}>
                {label}
              </NavbarItem>
            ))}
          </NavbarSection>
          <NavbarSpacer />
          <NavbarSection className="max-lg:hidden">
            <NavbarItem href="/preferences">Preferences</NavbarItem>
            <NavbarItem href={loggedIn ? "/signout" : "/login"}>
              {loggedIn ? "Sign Out" : "Login"}
            </NavbarItem>
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarBody>
            <SidebarSection>
              {navItemsLeft.map(({ label, url }) => (
                <SidebarItem key={label} href={url}>
                  {label}
                </SidebarItem>
              ))}
            </SidebarSection>
            <SidebarSpacer />
            <SidebarSection>
              <SidebarItem href="/preferences">Preferences</SidebarItem>
              <SidebarItem href={loggedIn ? "/signout" : "/login"}>
                {loggedIn ? "Sign Out" : "Login"}
              </SidebarItem>
            </SidebarSection>
          </SidebarBody>
        </ Sidebar>
      }
    >
      {children}
    </StackedLayout>
  )
}

export default MyNavbar; // Ensure you export as default
