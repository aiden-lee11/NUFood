import { Navbar, NavbarDivider, NavbarItem, NavbarSection, NavbarSpacer } from './navbar'
import { Sidebar, SidebarBody, SidebarItem, SidebarSection, SidebarSpacer } from './sidebar'
import { StackedLayout } from './stacked-layout'
import { ReactNode } from 'react'

const navItemsLeft = [
  { label: 'Home', url: '/' },
  { label: 'Chose Favorites', url: '/favorites' },
  { label: 'Current Favorites', url: '/current' },
  { label: 'Daily Items', url: '/daily' },
]

const navItemsRight = [
  { label: 'Login', url: '/login' },
  { label: 'Sign Out', url: '/signout' },
]


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
            {navItemsRight.map(({ label, url }) => (
              <NavbarItem key={label} href={url}>
                {label}
              </NavbarItem>
            ))}
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
              {navItemsRight.map(({ label, url }) => (
                <SidebarItem key={label} href={url}>
                  {label}
                </SidebarItem>
              ))}
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
